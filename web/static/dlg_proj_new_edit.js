function dlgNewEditProj(a_data,a_cb) {
    console.log( "dlgNewEditProj", a_data );
    var frame = $(document.createElement('div'));
    var html = "<div class='col-flex' style='height:100%'>\
        <div style='flex:none'>\
            <table style='width:100%'>\
                <tr><td>ID:</td><td><input type='text' id='id' style='width:100%'></input></td></tr>\
                <tr><td>Title:</td><td><input type='text' id='title' style='width:100%'></input></td></tr>\
                <tr><td>Description:</td><td><textarea id='desc' rows=3 style='width:100%'></textarea></td></tr>\
                <tr><td>Domain:</td><td><input type='text' id='domain' style='width:100%'></input></td></tr>\
                <tr><td>Owner:</td><td><input type='text' id='owner_id' style='width:100%' disabled></input></td></tr>\
            </table>\
        </div>\
        <div style='flex:none'>&nbsp</div>\
        <div class='row-flex' style='flex: 1 1 100%'>\
            <div class='col-flex' style='flex: 1 1 50%;height:100%'>\
                <div style='flex:none'>Members:</div>\
                <div class='ui-widget-content text' style='flex:1 1 100%;min-height:5em;overflow:auto'>\
                    <div id='proj_mem_tree' class='no-border'></div>\
                </div>\
                <div style='flex:none;padding-top:.25em'><button id='add_mem_btn' class='btn'>Add</button>&nbsp<button id='rem_mem_btn' class='btn' disabled>Remove</button></div>\
            </div>\
            <div style='flex:none'>&nbsp</div>\
            <div class='col-flex' style='flex: 1 1 50%;height:100%'>\
                <div style='flex:none'>Admins:</div>\
                <div class='ui-widget-content text' style='flex:1 1 100%;min-height:5em;overflow:auto'>\
                    <div id='proj_adm_tree' class='no-border'></div>\
                </div>\
                <div style='flex:none;padding-top:.25em'><button id='add_adm_btn' class='btn'>Add</button>&nbsp<button id='rem_adm_btn' class='btn' disabled>Remove</button></div>\
            </div>\
        </div>";

    frame.html( html );

    var dlg_title;
    if ( a_data ) {
        dlg_title = "Edit Project " + a_data.id;
    } else {
        dlg_title = "New Project";
    }
    var proj;
    if ( a_data )
        proj = Object.assign({}, a_data);
    else
        proj = { owner: g_user.uid };

    var options = {
        title: dlg_title,
        modal: true,
        width: 400,
        height: 'auto',
        resizable: true,
        closeOnEscape: false,
        buttons: [{
            text: a_data?"Update":"Create",
            click: function() {
                proj.id = $("#id",frame).val();
                proj.domain = $("#domain",frame).val();
                proj.title = $("#title",frame).val();
                proj.desc = $("#desc",frame).val();

                console.log( "project update, old:", a_data, "new:",proj);
                if ( !proj.id || !proj.domain || !proj.title ){
                    alert("Missing one or more required fields: ID, title, and domain.");
                    return;
                }

                var url = "/api/prj/";

                if ( a_data )
                    url += "update?id=";
                else
                    url += "create?id=";

                url += encodeURIComponent( proj.id );;

                if ( !a_data || proj.domain != a_data.domain )
                    url += "&domain="+ encodeURIComponent(proj.domain);

                if ( !a_data || proj.title != a_data.title )
                    url += "&title="+ encodeURIComponent(proj.title);

                if (( !a_data && proj.desc ) || (a_data && (proj.desc != a_data.desc )))
                    url += "&desc="+ encodeURIComponent(proj.desc);

                var mem_tree =  $("#proj_mem_tree",frame).fancytree("getTree");
                var adm_tree =  $("#proj_adm_tree",frame).fancytree("getTree");
        
                var admins = [];
                adm_tree.visit( function(node){
                    admins.push( node.key );
                });
                url += "&admins=" + JSON.stringify( admins );

                var members = [];
                mem_tree.visit( function(node){
                    members.push( node.key );
                });
                url += "&members=" + JSON.stringify( members );
                console.log( "URL", url );

                var inst = $(this);
                _asyncGet( url, null, function( ok, data ){
                    if ( ok ) {
                        inst.dialog('destroy').remove();
                        console.log( "data:",data);
                        if ( a_cb )
                            a_cb(data[0]);
                    } else {
                        alert( "Error: " + data );
                    }
                });
            }
        },{
            text: "Cancel",
            click: function() {
                $(this).dialog('destroy').remove();
            }
        }],
        open: function(event,ui){
            var mem_src = [];
            var adm_src = [];

            if ( a_data ){
                $("#id",frame).val(a_data.id);
                $("#id",frame).prop("disabled",true);
                $("#title",frame).val(a_data.title);
                $("#desc",frame).val(a_data.desc);
                $("#domain",frame).val(a_data.domain);
                $("#owner_id",frame).val(a_data.owner);

                for ( var i in a_data.member )
                    mem_src.push({title: a_data.member[i].substr(2),icon:false,key: a_data.member[i] });

                for ( i in a_data.admin )
                    adm_src.push({title: a_data.admin[i].substr(2),icon:false,key: a_data.admin[i] });

            }else{
                $("#owner_id",frame).val(g_user.uid);
            }

            $("#proj_mem_tree",frame).fancytree({
                extensions: ["themeroller"],
                themeroller: {
                    activeClass: "ui-state-hover",
                    addClass: "",
                    focusClass: "",
                    hoverClass: "ui-state-active",
                    selectedClass: ""
                },
                source: mem_src,
                selectMode: 1,
                checkbox: false,
                activate: function( event, data ) {
                    $("#rem_mem_btn",frame).button("option", "disabled", false);
                }
            });

            $("#proj_adm_tree",frame).fancytree({
                extensions: ["themeroller"],
                themeroller: {
                    activeClass: "ui-state-hover",
                    addClass: "",
                    focusClass: "",
                    hoverClass: "ui-state-active",
                    selectedClass: ""
                },
                source: adm_src,
                selectMode: 1,
                checkbox: false,
                activate: function( event, data ) {
                    $("#rem_adm_btn",frame).button("option", "disabled", false);
                }
            });

            var mem_tree =  $("#proj_mem_tree",frame).fancytree("getTree");
            var adm_tree =  $("#proj_adm_tree",frame).fancytree("getTree");
            var uid;

            $("#add_mem_btn",frame).click( function(){
                var excl = [proj.owner];
                adm_tree.visit(function(node){
                    excl.push(node.key);
                });
                mem_tree.visit(function(node){
                    excl.push(node.key);
                });

                dlgPickUser.show( g_user.uid, excl, function( uids ){
                    for ( i in uids ){
                        uid = uids[i];
                        mem_tree.rootNode.addNode({title: uid.substr(2),icon:false,key: uid });
                    }
                });
            });

            $("#rem_mem_btn",frame).click( function(){
                var node = mem_tree.getActiveNode();
                if ( node ){
                    node.remove();
                    $("#rem_mem_btn",frame).button("option", "disabled", true);
                }
            });

            $("#add_adm_btn",frame).click( function(){
                var excl = [proj.owner];
                adm_tree.visit(function(node){
                    console.log("excl adm:",node.key);
                    excl.push(node.key);
                });
                mem_tree.visit(function(node){
                    console.log("excl mem:",node.key);
                    excl.push(node.key);
                });
                console.log("excl:",excl);
                dlgPickUser.show( g_user.uid, excl, function( uids ){
                    console.log("sel:",uids);
                    for ( i in uids ){
                        uid = uids[i];

                        adm_tree.rootNode.addNode({title: uid.substr(2),icon:false,key: uid });
                    }
                });
            });

            $("#rem_adm_btn",frame).click( function(){
                var node = adm_tree.getActiveNode();
                if ( node ){
                    node.remove();
                    $("#rem_adm_btn",frame).button("option", "disabled", true);
                }
            });

            $(".btn",frame).button();
        }
    };


    frame.dialog( options );
}
