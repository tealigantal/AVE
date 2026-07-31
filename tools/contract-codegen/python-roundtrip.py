import json
import sys

value = json.loads(sys.stdin.read())
if not isinstance(value, dict):
    raise SystemExit("contract root must be an object")
print(json.dumps(value, ensure_ascii=False, separators=(",", ":")))
