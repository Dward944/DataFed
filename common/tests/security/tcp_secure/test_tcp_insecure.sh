#!/bin/bash

# If no arguments are provided assume command paths have not been passed in
if [ $# -eq 0 ]
then
  TIMEOUT_CMD="timeout"
  TCPDUMP_CMD="tcpdump"
  MAX_TEST_TIME_SEC=2
else
  TCPDUMP_CMD=$1
  TIMEOUT_CMD=$2
  MAX_TEST_TIME_SEC=$3
fi

echo 
echo "Running with:"
echo "TCPDUMP:       ${TCPDUMP_CMD}"
echo "TIMEOUT:       ${TIMEOUT_CMD}"
echo "MAX_TEST_TIME: ${MAX_TEST_TIME_SEC}"

# Grab the first 18 packets sent on the loop back interface (127.0.0.1)
match=$( ${TIMEOUT_CMD} ${MAX_TEST_TIME_SEC} ${TCPDUMP_CMD} -c 18 -vvv -A -i lo | grep token)

echo "Content of grep ${match}"
# If '.magic_token' is returned from the network sniffer then we know that 
# the encryption is not working
if [[ "${match}" == ".magic_token" ]]
then
  echo "SUCCESS - the connection is expected to be insecure"
  exit 0
else
  echo "FAILED - the connection is secure, but we were expecting an insecure connection"
  exit 1
fi
