/*jshint strict: global */
/*jshint esversion: 6 */
/*jshint multistr: true */
/* globals require */
/* globals module */
/* globals console */

'use strict';

const   createRouter = require('@arangodb/foxx/router');
const   router = createRouter();
const   joi = require('joi');

const   g_db = require('@arangodb').db;
const   g_graph = require('@arangodb/general-graph')._graph('sdmsg');
const   g_lib = require('./support');

module.exports = router;

//==================== PROJECT API FUNCTIONS


router.get('/create', function (req, res) {
    try {
        var result;

        g_db._executeTransaction({
            collections: {
                read: ["u"],
                write: ["u","c","a","g","acl","owner","ident","alias","admin"]
            },
            action: function() {
                var user_data = { _key: req.queryParams.id, name: req.queryParams.name, is_project: true };

                var user = g_db.u.save( user_data, { returnNew: true });

                var root = g_db.c.save({ _key: req.queryParams.id + "_root", is_root: true, title: "root", desc: "Root collection for project " + req.queryParams.name + " (" + req.queryParams.id +")" }, { returnNew: true });

                var alias = g_db.a.save({ _key: req.queryParams.id + ":root" }, { returnNew: true });
                g_db.owner.save({ _from: alias._id, _to: user._id });

                g_db.alias.save({ _from: root._id, _to: alias._id });
                g_db.owner.save({ _from: root._id, _to: user._id });

                var i;
                var mem_grp;

                // Projects have a special "members" group associated with root
                mem_grp = g_db.g.save({ uid:req.queryParams.id, gid: "members", title: "Project Members", desc: "Use to set baseline project member permissions." }, { returnNew: true });
                g_db.owner.save({ _from: mem_grp._id, _to: user._id });
                g_db.acl.save({ _from: root._id, _to: mem_grp._id, grant: g_lib.PERM_MEMBER, inhgrant: g_lib.PERM_MEMBER });

                for ( i in req.queryParams.admins ) {
                    if ( !g_db._exists( "u/" + req.queryParams.admins[i] ))
                        throw g_lib.ERR_USER_NOT_FOUND;
                    g_db.admin.save({ _from: user._id, _to: "u/" + req.queryParams.admins[i] });
                }

                user.new.uid = user.new._key;
                if ( req.queryParams.admins )
                    user.new.admins = req.queryParams.admins;

                delete user.new._id;
                delete user.new._key;
                delete user.new._rev;

                result = [user.new];
            }
        });

        res.send( result );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('id', joi.string().required(), "ID for new project")
.queryParam('name', joi.string().required(), "Name")
.queryParam('admins', joi.array().items(joi.string()).required(), "Account administrators (uids)")
.summary('Create new project')
.description('Create new project.');


router.get('/update', function (req, res) {
    try {
        var result;

        g_db._executeTransaction({
            collections: {
                read: ["u","uuid","accn"],
                write: ["u","admin"]
            },
            action: function() {
                const client = g_lib.getUserFromClientID( req.queryParams.client );
                var user_id;

                user_id = "u/" + req.queryParams.id;
                g_lib.ensureAdminPermUser( client, user_id );

                var obj = {};

                if ( req.queryParams.name )
                    obj.name = req.queryParams.name;

                var user = g_db._update( user_id, obj, { keepNull: false, returnNew: true });

                var admins = g_db._query( "for i in admin filter i._from == @user return i._to", { user: user_id }).toArray();
                console.log("admins:",admins);
                for ( var i in admins ) {
                    admins[i] = admins[i].substr( 2 );
                }

                var admin;

                if ( req.queryParams.admin_remove ) {
                    var idx;

                    for ( i in req.queryParams.admin_remove ) {
                        admin = req.queryParams.admin_remove[i];
                        idx = admins.indexOf( admin );
                        if ( idx != -1 ) {
                            g_db.admin.removeByExample({ _from: user_id, _to: "u/" + admin });
                            admins.splice( idx, 1 );
                        }
                    }
                }

                if ( req.queryParams.admin_add ) {

                    for ( i in req.queryParams.admin_add ) {
                        admin = req.queryParams.admin_add[i];
                        if ( admins.indexOf( admin ) == -1 ) {
                            if ( !g_db._exists( "u/" + admin ))
                                throw g_lib.ERR_USER_NOT_FOUND;

                            g_db.admin.save({ _from: user_id, _to: "u/" + admin });
                            admins.push( admin );
                        }
                    }
                }

                if ( !g_db.admin.firstExample({ _from: user_id }))
                    throw g_lib.ERR_PROJ_REQUIRES_ADMIN;

                user.new.uid = user.new._key;

                if ( admins.length )
                    user.new.admins = admins;

                delete user.new._id;
                delete user.new._key;
                delete user.new._rev;

                result = [user.new];
            }
        });

        res.send( result );
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client uid")
.queryParam('id', joi.string().required(), "Project ID")
.queryParam('name', joi.string().optional(), "New name")
.queryParam('admin_add', joi.array().items(joi.string()).optional(), "Account administrators (uids) to add")
.queryParam('admin_remove', joi.array().items(joi.string()).optional(), "Account administrators (uids) to remove")
.summary('Update project information')
.description('Update project information');


router.get('/view', function (req, res) {
    try {
        var client = g_lib.getUserFromClientID( req.queryParams.client );
        var proj = g_db.u.document({ _id: req.queryParams.id });

        var admins = g_db._query("for v in 1..1 outbound @user admin return v._key", { user: proj._id } ).toArray();
        if ( admins.length ) {
            proj.admins = admins;
        }

        if ( g_lib.getProjectRole( client, proj ) != g_lib.PROJ_NO_ROLE ){
            var members = g_db._query( "for v,e,p in 2..2 inbound @proj owner, outbound member filter p.vertices[1].gid == 'members' return v._key", { proj: proj._id }).toArray();

            if ( members.length ) {
                proj.members = members;
            }
        }

        proj.id = proj._key;

        delete proj._id;
        delete proj._key;
        delete proj._rev;

        res.send([proj]);
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('id', joi.string().required(), "Project ID")
.summary('View project information')
.description('View project information');

router.get('/list/all', function (req, res) {
    res.send( g_db._query( "for i in u filter i.is_project == true return { uid: i._key, name: i.name }" ));
})
.summary('List projects')
.description('List projects');

router.get('/list/by_admin', function (req, res) {
    const client = g_lib.getUserFromClientID( req.queryParams.client );
    res.send( g_db._query( "for v in 1..1 inbound @user admin filter v.is_project == true return { uid: v._key, name: v.name }", { user: client._id }));
})
.queryParam('client', joi.string().required(), "Client ID")
.summary('List projects')
.description('List projects');

router.get('/list/by_member', function (req, res) {
    const client = g_lib.getUserFromClientID( req.queryParams.client );
    res.send( g_db._query( "for v,e,p in 2..2 inbound @user member, outbound owner filter p.vertices[1].gid == 'members' return { uid: v._key, name: v.name }", { user: client._id }));
    //res.send( g_db._query( "for v,e,p in 3..3 inbound @user member, acl, outbound owner filter p.vertices[1].gid == 'members' return { uid: v._key, name: v.name }", { user: client._id }));
})
.queryParam('client', joi.string().required(), "Client ID")
.summary('List projects')
.description('List projects');

router.get('/delete', function (req, res) {
    try {
        g_db._executeTransaction({
            collections: {
                read: ["u","admin"],
                write: ["u","g","uuid","accn","c","d","n","a","acl","owner","ident","alias","admin","member","item","tag","note","alloc","loc"]
            },
            action: function() {
                const client = g_lib.getUserFromClientID( req.queryParams.client );
                var user_id = "u/" + req.queryParams.id;
                g_lib.ensureAdminPermUser( client, user_id );

                var objects;
                var obj;
                var i;

                // Delete collections, data, groups, notes
                objects = g_db._query( "for v in 1..1 inbound @user owner return v._id", { user: user_id }).toArray();
                for ( i in objects ) {
                    obj = objects[i];
                    g_graph[obj.substr(0,obj.indexOf("/"))].remove( obj );
                }

                g_graph.u.remove( user_id );
            }
        });
    } catch( e ) {
        g_lib.handleException( e, res );
    }
})
.queryParam('client', joi.string().required(), "Client ID")
.queryParam('id', joi.string().required(), "Project ID")
.summary('Remove existing user entry')
.description('Remove existing user entry. Requires admin permissions.');

