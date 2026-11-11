#!/bin/bash
set -euo pipefail
mkdir -p /config/ave/sound /config/ave/logs
rm -f /config/ave/started
dependencies=$(/opt/ave-python/bin/python /opt/ave/configure.py --dependencies)
sound_pid=''
cleanup() {
  rm -f /config/ave/started
  if [ -n "$sound_pid" ]; then
    kill "$sound_pid" 2>/dev/null || true
    if ! wait "$sound_pid"; then echo 'YAMNet did not exit cleanly; inference drain is unconfirmed' >&2; return 1; fi
    sound_pid=''
  fi
}
trap cleanup EXIT
if [[ " $dependencies " == *" sound "* ]]; then
  cp /opt/ave/sound/yamnet.tflite /opt/ave/sound/yamnet_class_map.csv /config/ave/sound/
  /opt/ave-python/bin/python /opt/ave/yamnet_service.py --directory /config/ave/sound --port 18081 > /config/ave/logs/yamnet.log 2>&1 &
  sound_pid=$!
fi
# Wait for startup, never restart a failed service or change its model.
ports=()
if [[ " $dependencies " == *" transcription "* ]]; then ports+=(18080); fi
if [[ " $dependencies " == *" sound "* ]]; then ports+=(18081); fi
for port in "${ports[@]}"; do
  ready=false
  for attempt in $(seq 1 1800); do
    if curl --fail --silent "http://127.0.0.1:$port/health" >/dev/null; then ready=true; break; fi
    if [ -n "$sound_pid" ] && ! kill -0 "$sound_pid" 2>/dev/null; then echo 'YAMNet exited; see /config/ave/logs/yamnet.log' >&2; exit 1; fi
    sleep 1
  done
  if [ "$ready" != true ]; then echo "Model service on $port did not become ready" >&2; exit 1; fi
done
node /opt/ave/app/apps/web/src/server.js &
host_pid=$!
shutdown() {
  trap - TERM INT
  kill "$host_pid" 2>/dev/null || true
  # Host cancellation/settlement and Worker ownership drain must complete
  # before the local sound service receives TERM.
  if wait "$host_pid"; then :; else code=$?; echo "Host shutdown failed: $code" >&2; exit "$code"; fi
  cleanup
  trap - EXIT
  exit 0
}
trap shutdown TERM INT
touch /config/ave/started
wait "$host_pid"
rm -f /config/ave/started
