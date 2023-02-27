#ifndef SOCKET_OPTIONS_HPP
#define SOCKET_OPTIONS_HPP
#pragma once

// Local public includes
#include "ProtocolTypes.hpp"

// Standard includes
#include <string>
#include <optional>

namespace SDMS {

  enum class SocketCommunicationType {
    ASYNCHRONOUS,
    SYNCHRONOUS
  };

  enum class SocketClassType {
    CLIENT,
    SERVER
  };

  enum class SocketDirectionalityType {
    UNIDIRECTIONAL,
    BIDIRECTIONAL
  };

  enum class URIScheme {
    HTTPS,
    INPROC,
    TCP
  };

  /**
   * host and port represent the host and port the socket is connecting to
   * local_id is an optional identity which defines the machine/process/thread the 
   * connections are being made from.
   **/
  struct SocketOptions {
    URIScheme scheme;
    SocketClassType class_type;
    SocketDirectionalityType direction_type;
    SocketCommunicationType communication_type;
    ProtocolType protocol_type;
    std::string host;
    uint16_t port;
    std::optional<std::string> local_id;
  };

} // SDMS

#endif // SOCKET_OPTIONS_HPP
