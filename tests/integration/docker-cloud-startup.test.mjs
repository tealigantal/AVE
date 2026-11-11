import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// These tests use synthetic credentials and mocked local processes only. They
// do not launch containers, contact cloud endpoints, or load user projects.
const py = String.raw`
import copy, importlib.util, json
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('config', 'docker/configure.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
base = json.load(open('docker/model-services.template.json', encoding='utf8'))
env = {'AVE_MODEL_SERVICES_JSON': json.dumps(base), 'AVE_VISION_API_KEY': 'secret-vision-fixture', 'AVE_PLANNER_API_KEY': 'secret-planner-fixture'}
assert module.dependencies(base) == {'transcription': True, 'sound': True}
assert module.model_configuration(env)['vision']['api_key'] == 'secret-vision-fixture'
def cloud(role):
 c = json.loads(json.dumps(base)); c[role]['provider'] = 'qwen-audio'; c[role]['base_url'] = 'https://example.invalid/v1'; return c
for role in ('transcription', 'sound'):
 c = cloud(role); e = dict(env, AVE_MODEL_SERVICES_JSON=json.dumps(c))
 try: module.model_configuration(e)
 except SystemExit as error: assert 'Missing' in str(error) and 'secret-' not in str(error)
 else: raise AssertionError('missing cloud credential accepted')
 e['AVE_'+role.upper()+'_API_KEY_SOURCE'] = 'AVE_VISION_API_KEY'
 configured = module.model_configuration(e)
 assert configured[role]['api_key'] == env['AVE_VISION_API_KEY']
 assert module.dependencies(configured)[role] is False
 assert module.dependencies(configured)['sound' if role == 'transcription' else 'transcription'] is True
 e['AVE_'+role.upper()+'_API_KEY_SOURCE'] = 'OTHER'
 try: module.model_configuration(e)
 except SystemExit as error: assert 'secret-' not in str(error)
 else: raise AssertionError('unapproved source accepted')
c = cloud('transcription'); c['sound'] = cloud('sound')['sound']
e = dict(env, AVE_MODEL_SERVICES_JSON=json.dumps(c), AVE_TRANSCRIPTION_API_KEY_SOURCE='AVE_VISION_API_KEY', AVE_SOUND_API_KEY_SOURCE='AVE_VISION_API_KEY')
assert module.dependencies(module.model_configuration(e)) == {'transcription': False, 'sound': False}
for role in ('transcription', 'sound'):
 c = json.loads(json.dumps(base)); c[role]['base_url'] = 'http://example.invalid:18081/v1'
 try: module.dependencies(c)
 except ValueError as error: assert 'secret-' not in str(error)
 else: raise AssertionError('misdirected local provider accepted')
 c = json.loads(json.dumps(base)); c[role]['provider'] = 'other'
 try: module.dependencies(c)
 except ValueError: pass
 else: raise AssertionError('misidentified local endpoint accepted')
profiles = json.load(open('docker/model-services.cloud.template.json', encoding='utf8'))
assert module.dependencies(profiles) == {'transcription': False, 'sound': False}
raw = json.dumps(profiles)
pe = dict(env, AVE_MODEL_SERVICES_JSON=json.dumps(base), AVE_CLOUD_MODEL_SERVICES_JSON=raw,
 AVE_CLOUD_PROFILES='1', AVE_TRANSCRIPTION_API_KEY_SOURCE='AVE_VISION_API_KEY', AVE_SOUND_API_KEY_SOURCE='AVE_VISION_API_KEY')
configured = module.model_configuration(pe)
for profile in configured['profiles']:
 for role in ('vision', 'transcription', 'sound'): assert profile[role]['api_key'] == env['AVE_VISION_API_KEY']
 assert profile['planner']['api_key'] == env['AVE_PLANNER_API_KEY']
assert 'secret-' not in raw and module.dependencies(configured) == {'transcription': False, 'sound': False}
default_env = dict(pe); default_env.pop('AVE_CLOUD_MODEL_SERVICES_JSON')
with patch.object(module, 'Path', side_effect=lambda path: Path('docker') / Path(path).name):
 assert module.model_configuration(default_env)['default_profile'] == 'economy'
 assert module.model_configuration(default_env)['profiles'][0]['transcription']['provider'] == 'qwen-audio', 'cloud mode must ignore inherited legacy local JSON'
for bad_env in (dict(pe, AVE_CLOUD_PROFILES='0', AVE_MODEL_SERVICES_JSON=raw), dict(pe, AVE_CLOUD_MODEL_SERVICES_JSON=json.dumps(base)), dict(pe, AVE_SOUND_API_KEY_SOURCE='OTHER')):
 try: module.model_configuration(bad_env)
 except SystemExit as error: assert 'secret-' not in str(error)
 else: raise AssertionError('invalid cloud profile selection or credentials accepted')
for mutate in (
 lambda c: c.update(extra=True),
 lambda c: c.update(default_profile='absent'),
 lambda c: c['profiles'].append(copy.deepcopy(c['profiles'][0])),
 lambda c: c['profiles'][1].update(label=' '+c['profiles'][0]['label']+' '),
 lambda c: c['profiles'][0].update(extra=True),
 lambda c: c['profiles'][0]['sound'].update(provider='local-yamnet'),
 lambda c: c['profiles'][0]['vision'].update(base_url='http://example.invalid/v1'),
 lambda c: c['profiles'][0]['planner'].update(base_url='https://localhost/v1'),
 lambda c: c['profiles'][0]['sound'].update(base_url='https://127.1/v1'),
 lambda c: c['profiles'][0]['transcription'].update(base_url='https://host.docker.internal/v1'),
 lambda c: c['profiles'][0]['vision'].update(base_url='https://example.invalid:8443/v1'),
 lambda c: c['profiles'][0]['vision'].update(base_url='https://example.invalid/compatible-mode/v1'),
 lambda c: c['profiles'][0]['vision'].update(provider='other'),
 lambda c: c['profiles'][0]['planner'].update(model='other-model'),
 lambda c: c['profiles'][0]['sound'].update(base_url='https://dashscope.aliyuncs.com/other'),
 lambda c: c['profiles'][0]['transcription'].update(protocol='whisper'),
 lambda c: c['profiles'][0]['transcription'].update(model='qwen3-asr-flash'),
):
 c=copy.deepcopy(profiles); mutate(c)
 try: module.dependencies(c)
 except ValueError as error: assert 'secret-' not in str(error)
 else: raise AssertionError('invalid/mixed cloud profile accepted')
legacy = copy.deepcopy(base)
legacy['planner']['structured_output'] = 'json_object'
legacy['sound']['audio_input'] = 'base64'  # Existing 6084 YAMNet wire format.
mixed_env = dict(env, AVE_MODEL_PROFILES='1', AVE_MODEL_SERVICES_JSON=json.dumps(legacy), AVE_TRANSCRIPTION_API_KEY_SOURCE='AVE_VISION_API_KEY', AVE_SOUND_API_KEY_SOURCE='AVE_VISION_API_KEY')
with patch.object(module, 'Path', side_effect=lambda path: Path('docker') / Path(path).name):
 mixed_config = module.model_configuration(mixed_env)
 no_planner = copy.deepcopy(legacy); no_planner.pop('planner')
 fallback = module.model_configuration(dict(mixed_env, AVE_MODEL_SERVICES_JSON=json.dumps(no_planner)))
 assert fallback['profiles'][0]['planner'] == fallback['profiles'][0]['vision'], 'absent planner preserves the original vision fallback and credential'
assert mixed_config['default_profile'] == 'local_audio' and len(mixed_config['profiles']) == 3
assert module.dependencies(mixed_config, allow_local_profiles=True) == {'transcription': True, 'sound': True}
local_profile = mixed_config['profiles'][0]
assert local_profile['planner']['structured_output'] == 'json_object', 'do not replace the current planner parameters'
assert local_profile['sound']['audio_input'] == 'base64', 'preserve the existing local sound wire format'
for role in ('transcription','sound'):
 assert local_profile[role] == legacy[role] and 'api_key' not in local_profile[role], 'never inject remote credentials into local roles'
 assert all(p[role]['api_key'] == env['AVE_VISION_API_KEY'] for p in mixed_config['profiles'][1:])
selected_cloud = copy.deepcopy(mixed_config); selected_cloud['default_profile'] = 'economy'
assert module.dependencies(selected_cloud, allow_local_profiles=True) == {'transcription': True, 'sound': True}, 'non-default local services remain dependencies'
alternate = copy.deepcopy(mixed_config); alternate['profiles'][0]['sound']['audio_input'] = 'data-url'
assert module.dependencies(alternate, allow_local_profiles=True) == {'transcription': True, 'sound': True}
try: module.dependencies(mixed_config)
except ValueError: pass
else: raise AssertionError('6085 cloud-only mode accepted a local profile')
for mutate in (
 lambda c: c['profiles'][0]['sound'].update(base_url='http://127.0.0.2:18081/v1'),
 lambda c: c['profiles'][0]['transcription'].update(model='other'),
 lambda c: c['profiles'][0]['sound'].update(api_key='not-allowed'),
 lambda c: c['profiles'][0]['sound'].update(audio_input='other'),
 lambda c: c['profiles'][0].update(sound=copy.deepcopy(c['profiles'][1]['sound'])),
):
 c=copy.deepcopy(mixed_config); mutate(c)
 try: module.dependencies(c, allow_local_profiles=True)
 except ValueError: pass
 else: raise AssertionError('invalid local identity or incomplete local pair accepted')
try: module.model_configuration(dict(mixed_env, AVE_CLOUD_PROFILES='1'))
except SystemExit: pass
else: raise AssertionError('mutually exclusive modes accepted')
`;
const python = spawnSync('python', ['-c', py], { encoding: 'utf8' });
assert.equal(python.status, 0, python.stderr);
// Verify the real Node loader accepts precisely what Python initialization
// writes, using synthetic credentials kept in a pipe rather than a file.
const inject = spawnSync('python', ['-c', String.raw`
import importlib.util, json
spec=importlib.util.spec_from_file_location('config','docker/configure.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
source=open('docker/model-services.cloud.template.json',encoding='utf8').read()
e={'AVE_CLOUD_MODEL_SERVICES_JSON':source,'AVE_CLOUD_PROFILES':'1','AVE_VISION_API_KEY':'synthetic-vision-key','AVE_PLANNER_API_KEY':'synthetic-planner-key','AVE_TRANSCRIPTION_API_KEY_SOURCE':'AVE_VISION_API_KEY','AVE_SOUND_API_KEY_SOURCE':'AVE_VISION_API_KEY'}
print(json.dumps(m.model_configuration(e)))
`], { encoding: 'utf8' });
assert.equal(inject.status, 0, 'synthetic cloud initialization failed');
const loader = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', String.raw`
import { readFileSync } from 'node:fs';
import { configuredCloudProfiles } from './apps/desktop/src/main/model-configuration.ts';
const value=JSON.parse(readFileSync(0,'utf8')), result=configuredCloudProfiles(value);
if(result.id!=='economy'||result.profiles.length!==2||result.creationModelProviders.length!==1) throw Error('profile selection failed');
if(result.profiles.some(x=>x.routes.length!==4||x.routes.some(r=>!r.endpoint.startsWith('https://dashscope.aliyuncs.com/')))) throw Error('cloud routes incomplete');
if(JSON.stringify(result.profiles).includes('synthetic-')) throw Error('credential exposed');
console.log('Python-injected cloud profiles loaded with four redacted routes');
`], { input: inject.stdout, encoding: 'utf8' });
assert.equal(loader.status, 0, loader.stderr);
assert.ok(loader.stdout.includes('four redacted routes'));
const injectMixed = spawnSync('python', ['-c', String.raw`
import importlib.util,json
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('config','docker/configure.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
legacy=json.load(open('docker/model-services.template.json',encoding='utf8'));legacy['planner']['structured_output']='json_object';legacy['sound']['audio_input']='base64'
e={'AVE_MODEL_SERVICES_JSON':json.dumps(legacy),'AVE_MODEL_PROFILES':'1','AVE_VISION_API_KEY':'synthetic-vision-key','AVE_PLANNER_API_KEY':'synthetic-planner-key','AVE_TRANSCRIPTION_API_KEY_SOURCE':'AVE_VISION_API_KEY','AVE_SOUND_API_KEY_SOURCE':'AVE_VISION_API_KEY'}
with patch.object(m,'Path',side_effect=lambda path:Path('docker') / Path(path).name):
 mixed=m.model_configuration(e)
 no_planner=dict(legacy);no_planner.pop('planner');fallback=m.model_configuration(dict(e,AVE_MODEL_SERVICES_JSON=json.dumps(no_planner)))
legacy['vision']['api_key']=e['AVE_VISION_API_KEY'];legacy['planner']['api_key']=e['AVE_PLANNER_API_KEY']
no_planner['vision']['api_key']=e['AVE_VISION_API_KEY']
print(json.dumps({'mixed':mixed,'legacy':legacy,'fallback':fallback,'no_planner':no_planner}))
`], { encoding: 'utf8' });
assert.equal(injectMixed.status, 0, 'synthetic mixed initialization failed');
const mixedLoader = spawnSync('node', ['--import', 'tsx', '--input-type=module', '-e', String.raw`
import { readFileSync } from 'node:fs';
import { configuredMixedProfiles,configuredCloudProfiles,configuredSplitModelProvider } from './apps/desktop/src/main/model-configuration.ts';
const value=JSON.parse(readFileSync(0,'utf8')), actual=configuredMixedProfiles(value.mixed), expected=configuredSplitModelProvider(value.legacy);
if(actual.id!=='local_audio'||actual.profiles.length!==3||actual.provider.deployment.digest!==expected.provider.deployment.digest) throw Error('legacy deployment identity changed');
if(configuredMixedProfiles(value.fallback).provider.deployment.digest!==configuredSplitModelProvider(value.no_planner).provider.deployment.digest) throw Error('legacy planner fallback identity changed');
if(actual.profiles[0].audio_mode!=='local'||actual.profiles.slice(1).some(x=>x.audio_mode!=='cloud')) throw Error('mixed audio mode changed');
try { configuredCloudProfiles(value.mixed); throw Error('cloud-only admitted local profiles'); } catch(error) { if(error.message==='cloud-only admitted local profiles') throw error; }
if(JSON.stringify(actual.profiles).includes('synthetic-')) throw Error('credential exposed');
console.log('Mixed startup preserves legacy deployment and isolates cloud profiles');
`], { input: injectMixed.stdout, encoding: 'utf8' });
assert.equal(mixedLoader.status, 0, mixedLoader.stderr);

const root = mkdtempSync(join(tmpdir(), 'ave-cloud-startup-'));
try {
  const envFile = join(root, 'fixture.env');
  writeFileSync(envFile, 'AVE_VISION_API_KEY=synthetic-only\nAVE_PLANNER_API_KEY=synthetic-only\n');
  function compose(profile = [], presets = false, hybrid = false) {
    const result = spawnSync('docker', ['compose', '--env-file', envFile, '-f', 'compose.yaml', '-f', hybrid ? 'docker/compose.mixed.profiles.yaml' : 'docker/compose.cloud.yaml', ...(presets ? ['-f', 'docker/compose.cloud.profiles.yaml'] : []), ...profile, 'config', '--format', 'json'], { env: { ...process.env, AVE_ENV_FILE: envFile, AVE_MATERIALS: root, AVE_EXPORTS: root, AVE_TRANSCRIPTION_API_KEY_SOURCE: '', AVE_SOUND_API_KEY_SOURCE: '' }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  }
  const cloud = compose(), mixed = compose(['--profile', 'local-transcription']);
  assert.deepEqual(Object.keys(cloud.services), ['desktop']);
  assert.ok(mixed.services.whisper);
  const profileCloud = compose([], true);
  assert.deepEqual(Object.keys(profileCloud.services), ['desktop']);
  assert.equal(profileCloud.services.desktop.environment.AVE_CLOUD_PROFILES, '1');
  assert.equal(profileCloud.services.desktop.environment.AVE_MODEL_SERVICES_JSON, '');
  assert.equal(profileCloud.services.desktop.environment.AVE_TRANSCRIPTION_API_KEY_SOURCE, 'AVE_VISION_API_KEY');
  assert.equal(profileCloud.services.desktop.environment.AVE_SOUND_API_KEY_SOURCE, 'AVE_VISION_API_KEY');
  const profileMixed = compose([], false, true);
  assert.deepEqual(Object.keys(profileMixed.services).sort(), ['desktop', 'whisper']);
  assert.equal(profileMixed.services.desktop.environment.AVE_MODEL_PROFILES, '1');
  assert.equal(profileMixed.services.desktop.environment.AVE_CLOUD_PROFILES, '0');
  assert.equal(profileMixed.services.desktop.environment.AVE_TRANSCRIPTION_API_KEY_SOURCE, 'AVE_VISION_API_KEY');
  assert.equal(profileMixed.services.desktop.environment.AVE_SOUND_API_KEY_SOURCE, 'AVE_VISION_API_KEY');
  for (const target of ['/run/ave', '/workspace/projects', '/workspace/uploads']) assert.equal(cloud.services.desktop.volumes.find(item => item.target === target)?.type, 'volume');
  assert.equal(cloud.services.desktop.ports[0].host_ip, '127.0.0.1');
  for (const dir of ['config/ave', 'run/ave', 'sound']) mkdirSync(join(root, dir), { recursive: true });
  for (const path of ['run/ave/model-services.json', 'sound/yamnet.tflite', 'sound/yamnet_class_map.csv']) writeFileSync(join(root, path), 'fixture');
  writeFileSync(join(root, 'python'), '#!/bin/bash\nif [[ "$1" == *configure.py ]]; then echo "$DEPS"; exit "${CONFIG_EXIT:-0}"; fi\necho yamnet >> calls\ntrap \'echo yamnet-term >> calls; exit 0\' TERM\nwhile :; do sleep 0.1; done\n', { mode: 0o755 });
  writeFileSync(join(root, 'curl'), '#!/bin/bash\necho "$*" >> calls\n[[ "$*" != *"${FAIL_PORT:-never-match}"* ]]\n', { mode: 0o755 });
  writeFileSync(join(root, 'node'), '#!/bin/bash\necho host >> calls\nif [[ "${SLOW_SHUTDOWN:-0}" == 1 ]]; then trap \'echo host-term >> calls; sleep 0.4; echo host-drained >> calls; exit 0\' TERM; echo host-ready >> calls; while :; do sleep 0.1; done; fi\nsleep 0.2\n', { mode: 0o755 });
  const localize = (source) => source.replaceAll('/opt/ave-python/bin/python', './python').replaceAll('/opt/ave/configure.py', './configure.py').replaceAll('/opt/ave/yamnet_service.py', './yamnet_service.py').replaceAll('/opt/ave/sound', './sound').replaceAll('/config/ave', './config/ave').replaceAll('/run/ave/', './run/ave/').replaceAll('curl --', './curl --').replace('node /opt/ave/app/apps/web/src/server.js', './node server.js');
  for (const script of ['start-desktop', 'health-desktop']) writeFileSync(join(root, script + '.sh'), localize(readFileSync(`docker/${script}.sh`, 'utf8')));
  const bash = process.platform === 'win32' ? join(process.env.ProgramFiles || 'C:/Program Files', 'Git/bin/bash.exe') : 'bash';
  function run(script, deps, extra = {}) {
    writeFileSync(join(root, 'calls'), '');
    const result = spawnSync(bash, [`./${script}.sh`], { cwd: root, env: { ...process.env, DEPS: deps, ...extra }, encoding: 'utf8', timeout: 10000 });
    return { ...result, calls: readFileSync(join(root, 'calls'), 'utf8') };
  }
  for (const [deps, expected] of [['', [8080]], ['transcription', [8080, 18080]], ['sound', [8080, 18081]], ['transcription sound', [8080, 18080, 18081]]]) {
    const health = run('health-desktop', deps); assert.equal(health.status, 0, health.stderr);
    for (const port of [8080, 18080, 18081]) assert.equal(health.calls.includes(`:${port}/health`), expected.includes(port));
    const startup = run('start-desktop', deps); assert.equal(startup.status, 0, startup.stderr);
    assert.ok(startup.calls.includes('host'));
    assert.equal(startup.calls.includes('yamnet'), deps.includes('sound'));
    for (const port of [18080, 18081]) assert.equal(startup.calls.includes(`:${port}/health`), expected.includes(port));
  }
  assert.notEqual(run('health-desktop', '', { CONFIG_EXIT: '1' }).status, 0);
  assert.notEqual(run('start-desktop', '', { CONFIG_EXIT: '1' }).status, 0);
  assert.notEqual(run('health-desktop', 'sound', { FAIL_PORT: '18081' }).status, 0);
  writeFileSync(join(root, 'calls'), '');
  const signal = spawnSync(bash, ['-c', './start-desktop.sh & p=$!; for i in {1..100}; do [[ $(<calls) == *host-ready* ]] && break; sleep 0.05; done; [[ $(<calls) == *host-ready* ]] || exit 9; kill -TERM "$p"; wait "$p"'], { cwd: root, env: { ...process.env, DEPS: 'sound', SLOW_SHUTDOWN: '1' }, encoding: 'utf8', timeout: 10000 });
  assert.equal(signal.status, 0, signal.stderr);
  const order = readFileSync(join(root, 'calls'), 'utf8');
  assert.ok(order.indexOf('host-term') >= 0 && order.indexOf('host-drained') > order.indexOf('host-term') && order.indexOf('yamnet-term') > order.indexOf('host-drained'), 'Host must drain before YAMNet is stopped');
  console.log('Cloud/local startup and health tests passed with synthetic credentials.');
} finally { rmSync(root, { recursive: true, force: true }); }
