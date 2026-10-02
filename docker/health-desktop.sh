#!/bin/bash
set -euo pipefail
test -f /run/ave/model-services.json
for port in 8080 18080 18081; do
  curl --fail --silent --max-time 3 "http://127.0.0.1:$port/health" >/dev/null
done
