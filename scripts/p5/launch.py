"""Use existing credentials in the isolated P5 Host only; preserve model configuration."""
import json
import os
from pathlib import Path

policy = json.loads(Path('/p5-run/guard-policy.json').read_text())
if policy.get('project') != os.environ.get('AVE_P5_ISOLATED_PROJECT'):
    raise SystemExit('P5 task identity mismatch; configuration withheld')
config = json.loads(Path('/original-config/model-services.json').read_text())
for role, name in [('vision', 'qwen3-vl-plus'), ('planner', 'qwen3.7-max-2026-05-20')]:
    service = config[role]
    bound = policy['models'][name]
    if service.get('provider') != 'qwen' or service.get('model') != name or service.get('base_url') != 'https://dashscope.aliyuncs.com/compatible-mode/v1':
        raise SystemExit('P5 provider differs from authorized pricing; configuration withheld')
    if not isinstance(service.get('api_key'), str) or not service['api_key'].strip():
        raise SystemExit('P5 existing authentication unavailable; configuration withheld')
    for wire, key, default_flag in [('max_tokens', 'maxTokens', 'allowDefaultMaxTokens'), ('enable_thinking', 'enableThinking', 'allowDefaultThinking'), ('thinking_budget', 'thinkingBudget', None)]:
        actual = service.get(wire)
        if actual != bound.get(key) and not (wire not in service and default_flag and bound.get(default_flag) is True):
            raise SystemExit('P5 inference configuration changed; configuration withheld')
for role, endpoint in [('transcription', 'http://127.0.0.1:18080/v1'), ('sound', 'http://127.0.0.1:18081/v1')]:
    if config[role].get('base_url') != endpoint:
        raise SystemExit('P5 local model configuration changed; configuration withheld')
directory = Path('/run/ave')
directory.mkdir(exist_ok=True)
temporary = directory / 'model-services.json.new'
descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, 'w') as stream:
    json.dump(config, stream)
    stream.flush()
    os.fsync(stream.fileno())
os.chown(temporary, 1000, 1000)
os.replace(temporary, directory / 'model-services.json')
for target in ['/workspace/projects', '/workspace/uploads', '/config', '/p5-budget', '/p5-budget/ledger']:
    os.chown(target, 1000, 1000)
for name in ['ledger.jsonl', 'head.json']:
    os.chown(Path('/p5-budget/ledger') / name, 1000, 1000)
os.environ['AVE_MODEL_CONFIG'] = str(directory / 'model-services.json')
os.environ['NODE_OPTIONS'] = '--import=/p5-harness/install.mjs'
for name in list(os.environ):
    if name.endswith('_API_KEY') or name == 'AVE_MODEL_SERVICES_JSON':
        del os.environ[name]
os.setgroups([])
os.setgid(1000)
os.setuid(1000)
os.environ.update(HOME='/home/node', USER='node', LOGNAME='node')
os.execv('/usr/local/bin/ave-desktop', ['/usr/local/bin/ave-desktop'])
