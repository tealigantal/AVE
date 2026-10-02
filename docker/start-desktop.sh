#!/bin/bash
set -euo pipefail
mkdir -p /config/ave/sound /config/ave/logs
rm -f /config/ave/started
cp /opt/ave/sound/yamnet.tflite /opt/ave/sound/yamnet_class_map.csv /config/ave/sound/
/opt/ave-python/bin/python /opt/ave/yamnet_service.py --directory /config/ave/sound --port 18081 > /config/ave/logs/yamnet.log 2>&1 &
sound_pid=$!
trap 'rm -f /config/ave/started; kill "$sound_pid" 2>/dev/null || true' EXIT
# Wait for startup, never restart a failed service or change its model.
for port in 18080 18081; do
  ready=false
  for attempt in $(seq 1 1800); do
    if curl --fail --silent "http://127.0.0.1:$port/health" >/dev/null; then ready=true; break; fi
    if ! kill -0 "$sound_pid" 2>/dev/null; then echo 'YAMNet exited; see /config/ave/logs/yamnet.log' >&2; exit 1; fi
    sleep 1
  done
  if [ "$ready" != true ]; then echo "Model service on $port did not become ready" >&2; exit 1; fi
done
node /opt/ave/app/apps/web/src/server.js &
host_pid=$!
trap 'kill "$host_pid" "$sound_pid" 2>/dev/null || true; wait "$host_pid" || true' TERM INT
touch /config/ave/started
wait "$host_pid"
rm -f /config/ave/started
