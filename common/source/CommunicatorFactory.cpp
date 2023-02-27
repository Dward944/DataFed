
// Local private includes
#include "communicators/ZeroMQCommunicator.hpp"
#include "sockets/ZeroMQSocket.hpp"

// Local public includes
#include "CommunicatorFactory.hpp"

// Standard includes
#include <memory>

namespace SDMS {

  std::unique_ptr<ICommunicator> CommunicatorFactory::create(
      const SocketOptions & socket_options,
      const ICredentials & credentials,
      uint32_t timeout_on_receive,
      long timeout_on_poll) const {

    if(socket_options.protocol_type == ProtocolType::ZQTP ) {
      return std::unique_ptr<ICommunicator>(new ZeroMQCommunicator(
            socket_options,
            credentials,
            timeout_on_receive,
            timeout_on_poll));
    }
    return std::unique_ptr<ICommunicator>();
  }

} // namespace SDMS
