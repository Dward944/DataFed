#ifndef FACILITYSERVER_HPP
#define FACILITYSERVER_HPP

#include <string>
#include <map>
#include <set>
#include <deque>
#include <list>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <stdint.h>
#include <unistd.h>
#include <sys/types.h>
#include <asio.hpp>
#include <asio/ssl.hpp>

#include "Session.hpp"
#include "CentralDatabaseClient.hpp"
#include "SDMS.pb.h"

namespace SDMS {
namespace Facility {

class Server : public ISessionMgr
{
public:
    Server( uint32_t a_server_port, const std::string & a_cert_dir, uint32_t a_timeout, uint32_t a_num_threads, const std::string & a_db_url, const std::string & a_db_user, const std::string & a_db_pass );
    virtual ~Server();

    Server& operator=( const Server & ) = delete;

    void    run( bool a_async );
    void    stop( bool a_wait );
    void    wait();

private:
    struct XfrDataInfo
    {
        XfrDataInfo( const XfrData & a_xfr, const std::string & a_uid, int a_poll ) :
            id(a_xfr.id()),mode(a_xfr.mode()),status(a_xfr.status()),repo_path(a_xfr.repo_path()),
            local_path(a_xfr.local_path()),globus_id(a_xfr.globus_id()),uid(a_uid),poll(a_poll),backoff(0)
        {
            if ( a_xfr.has_task_id() )
                task_id = a_xfr.task_id();
        }

        std::string     id;
        XfrMode         mode;
        XfrStatus       status;
        //string        data_id;
        std::string     repo_path;
        std::string     local_path;
        std::string     globus_id;
        std::string     task_id;
        std::string     uid;
        int             poll;
        int             backoff;
    };

    // ISessionMgr methods
    void                sessionClosed( spSession );
    const std::string & getCertFile() { return m_cert_file; }
    const std::string & getKeyFile() { return m_key_file; }
    void                generateKeys( const std::string & a_uid, std::string & a_key_data );
    void                getPublicKey( const std::string & a_uid, std::string & a_key_data );
    const std::string & getCountry() { return m_country; }
    const std::string & getOrg() { return m_org; }
    const std::string & getUnit() { return m_unit; }
    void                handleNewXfr( const XfrData & a_xfr, const std::string & a_uid );

    void ioRun();
    void accept();
    void backgroundMaintenance();
    void xfrManagement();

    std::string                     m_host;
    uint32_t                        m_port;
    uint32_t                        m_timeout;
    std::thread *                   m_io_thread;
    std::thread *                   m_maint_thread;
    uint32_t                        m_num_threads;
    std::mutex                      m_api_mutex;
    std::mutex                      m_data_mutex;
    bool                            m_io_running;
    std::condition_variable         m_router_cvar;
    asio::io_service                m_io_service;
    asio::ip::tcp::endpoint         m_endpoint;
    asio::ip::tcp::acceptor         m_acceptor;
    asio::ssl::context              m_context;
    std::set<spSession>             m_sessions;
    std::string                     m_country;
    std::string                     m_org;
    std::string                     m_unit;
    std::string                     m_cert_file;
    std::string                     m_key_file;
    std::string                     m_key_path;
    std::mutex                      m_key_mutex;
    std::mutex                      m_xfr_mutex;
    std::deque<std::string>         m_xfr_pending;
    std::list<XfrDataInfo*>         m_xfr_active;
    std::map<std::string,XfrDataInfo*>   m_xfr_all;
    std::thread *                   m_xfr_thread;
    // Should be in Central Server
    std::string                     m_db_url;
    std::string                     m_db_user;
    std::string                     m_db_pass;
    CentralDatabaseClient           m_db_client;

    friend class Session;
};


}}

#endif
