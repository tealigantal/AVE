#!/bin/bash
set -euo pipefail
test -f /run/ave/model-services.json
dependencies=$(/opt/ave-python/bin/python /opt/ave/configure.py --dependencies)
ports=(8080)
if [[ " $dependencies " == *" transcription "* ]]; then ports+=(18080); fi
if [[ " $dependencies " == *" sound "* ]]; then ports+=(18081); fi
for port in "${ports[@]}"; do
  curl --fail --silent --max-time 3 "http://127.0.0.1:$port/health" >/dev/null
done
