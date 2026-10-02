import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = mkdtempSync(join(tmpdir(), 'ave-docker-fixture-'));
try {
  const fixture = join(directory, '.env');
  writeFileSync(fixture, 'AVE_VISION_API_KEY=fixture-only\nAVE_PLANNER_API_KEY=fixture-only\n');
  const env = { ...process.env, COMPOSE_FILE: 'compose.yaml', AVE_ENV_FILE: fixture, AVE_MATERIALS: directory, AVE_EXPORTS: directory, AVE_BROWSER_PORT: '6080', AVE_WHISPER_DEVICE: 'auto' };
  function compose(files) {
    const result = spawnSync('docker', ['compose', '--env-file', fixture, ...files.flatMap(file => ['-f', file]), 'config', '--format', 'json'], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  }
  const config = compose(['compose.yaml']);
  const gpu = compose(['compose.yaml', 'docker/compose.gpu.yaml']);
  assert.equal(config.services.whisper.network_mode, 'service:desktop');
  assert.deepEqual(Object.keys(config.services).sort(), ['desktop', 'whisper']);
  assert.equal(config.services.whisper.depends_on.desktop.condition, 'service_started', 'No readiness cycle');
  assert.ok(!config.services.whisper.deploy?.resources?.reservations?.devices, 'CPU hosts must not request GPU');
  assert.equal(config.services.whisper.environment.AVE_WHISPER_DEVICE, 'auto');
  assert.equal(gpu.services.whisper.environment.AVE_WHISPER_DEVICE, 'cuda');
  assert.deepEqual(gpu.services.whisper.deploy.resources.reservations.devices[0].capabilities, ['gpu']);
  assert.equal(config.services.desktop.ports[0].host_ip, '127.0.0.1');
  const mounts = config.services.desktop.volumes;
  assert.equal(mounts.find(item => item.target === '/workspace/materials').read_only, true);
  assert.equal(mounts.find(item => item.target === '/workspace/projects').type, 'volume');
  assert.equal(mounts.find(item => item.target === '/run/ave').type, 'volume');
  assert.ok(!mounts.find(item => item.target === '/run/ave').read_only, 'Owned startup updates config');
  const launch = readFileSync('docker/start-desktop.sh', 'utf8');
  assert.ok(!launch.includes('--no-sandbox'));
  assert.ok(!config.services.desktop.privileged && !config.services.desktop.cap_add);
  assert.ok(!mounts.some(item => item.target.includes('docker.sock')));
  assert.ok(!config.services.desktop.security_opt, 'Direct Host uses normal Docker isolation');
  assert.equal(config.services.desktop.ports[0].target, 8080);
  assert.ok(!readFileSync('docker/Dockerfile', 'utf8').includes('linuxserver/webtop'));
  assert.ok(!launch.includes('electron/dist/electron'));
  assert.ok(launch.includes('apps/web/src/server.js'));
  assert.ok(readFileSync('docker/configure.py', 'utf8').includes('os.setuid(1000)'));
  assert.ok(readFileSync('docker/Dockerfile', 'utf8').includes('"--launch"'));
  assert.ok(!readFileSync('docker/start-whisper.py', 'utf8').includes('--prepare-only'));
  assert.ok(!existsSync('docker/ave.desktop'));
  assert.ok(!existsSync('docker/seccomp/desktop-userns.json'));
  assert.ok(readFileSync('docker/health-desktop.sh', 'utf8').includes('8080'));
  const missing = spawnSync('powershell', ['-NoProfile', '-File', 'scripts/docker/Start-AVE.ps1', '-ModelConfig', join(directory, 'missing.json'), '-NoBrowser'], { encoding: 'utf8' });
  assert.notEqual(missing.status, 0);
  // Exercise device selection, including a broken CUDA installation that must fail.
  const python = `import ast\nfrom pathlib import Path\ntree=ast.parse(Path('/test/start-whisper.py').read_text())\nfn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='select_device')\nns={}\nexec(compile(ast.Module(body=[fn],type_ignores=[]),'device','exec'),ns)\nselect=ns['select_device']\nclass Backend:\n def __init__(self,count): self.count=count\n def get_cuda_device_count(self): return self.count\n def get_supported_compute_types(self,device): return {'float32','int8'}\nassert select('auto',Backend(0))==('cpu','int8')\nassert select('auto',Backend(1))==('cuda','float32')\nassert select('cpu',Backend(1))==('cpu','int8')\nfor mode in ['cuda','invalid']:\n try: select(mode,Backend(0))\n except RuntimeError: pass\n else: raise AssertionError('invalid selection accepted')\nclass Broken(Backend):\n def get_supported_compute_types(self,device): raise RuntimeError('driver failure')\ntry: select('auto',Broken(1))\nexcept RuntimeError as e: assert str(e)=='driver failure'\nelse: raise AssertionError('hidden CPU fallback')\nprint('device selection passed')`;
  const device = spawnSync('docker', ['run', '--rm', '--entrypoint', 'python', '-v', `${resolve('docker')}:/test:ro`, 'ave-whisper:local', '-c', python], { encoding: 'utf8' });
  assert.equal(device.status, 0, device.stderr);
  const cacheTest = `import ast,tempfile
from pathlib import Path
tree=ast.parse(Path('/test/start-whisper.py').read_text())
statements=[]
for node in tree.body:
 if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='reference' for t in node.targets): break
 if isinstance(node,(ast.Assign,ast.Try,ast.If)): statements.append(node)
code=compile(ast.Module(body=statements,type_ignores=[]),'cache','exec')
class Missing(Exception): pass
with tempfile.TemporaryDirectory() as directory:
 root=Path(directory)
 def run(mode):
  calls=[]
  for p in root.iterdir(): p.unlink()
  if mode=='warm':
   for name in ['config.json','model.bin','tokenizer.json','vocabulary.txt']: (root/name).write_text('fixture')
  def snapshot(**kwargs):
   calls.append(kwargs)
   assert kwargs['revision']=='536b0662742c02347bc0e980a01041f333bce120'
   if kwargs.get('local_files_only') and mode=='cold': raise Missing()
   if not kwargs.get('local_files_only'):
    if mode=='download-error': raise RuntimeError('download failed')
    if mode!='incomplete':
     for name in ['config.json','model.bin','tokenizer.json','vocabulary.txt']: (root/name).write_text('fixture')
   return str(root)
  ns={'Path':Path,'snapshot_download':snapshot,'LocalEntryNotFoundError':Missing}
  try: exec(code,ns)
  except RuntimeError as error:
   assert mode in ['incomplete','download-error']
   assert str(error)==('download failed' if mode=='download-error' else 'Pinned Whisper cache is incomplete after download')
  else: assert mode in ['warm','cold','partial']
  assert len(calls)==(1 if mode=='warm' else 2)
 for mode in ['warm','cold','partial','incomplete','download-error']: run(mode)
print('Pinned cache reuse/preparation and explicit failure checks passed')`;
  const cache = spawnSync('docker', ['run', '--rm', '--entrypoint', 'python', '-v', `${resolve('docker')}:/test:ro`, 'ave-whisper:local', '-c', cacheTest], { encoding: 'utf8' });
  assert.equal(cache.status, 0, cache.stderr);
  const privateConfig = spawnSync('docker', ['run', '--rm', '--tmpfs', '/run/ave', '--tmpfs', '/workspace/projects', '--tmpfs', '/workspace/uploads', '--user', 'root', '-e', 'AVE_VISION_API_KEY=fixture-vision', '-e', 'AVE_PLANNER_API_KEY=fixture-planner', '--entrypoint', '/opt/ave-python/bin/python', 'ave-desktop:local', '-c', "import sys,json,os; sys.path.insert(0,'/opt/ave'); import configure; configure.configure(); p='/run/ave/model-services.json'; c=json.load(open(p)); assert c['vision']['api_key']=='fixture-vision'; assert c['planner']['api_key']=='fixture-planner'; assert os.stat(p).st_mode & 0o777 == 0o600; assert os.stat(p).st_uid == 1000"], { encoding: 'utf8' });
  assert.equal(privateConfig.status, 0, privateConfig.stderr);
  assert.ok(!privateConfig.stdout.includes('fixture-vision'));
  const launchProbe = spawnSync('docker', ['run', '--rm', '--tmpfs', '/run/ave', '--tmpfs', '/workspace/projects', '--tmpfs', '/workspace/uploads', '--user', 'root', '-e', 'AVE_VISION_API_KEY=fixture-vision', '-e', 'AVE_PLANNER_API_KEY=fixture-planner', '-e', 'AVE_MODEL_SERVICES_JSON=' + readFileSync('docker/model-services.template.json', 'utf8'), '--entrypoint', '/opt/ave-python/bin/python', 'ave-desktop:local', '-c', "import os,runpy; import sys; sys.argv=['configure.py','--launch']; os.execv=lambda path,args: (print('uid='+str(os.getuid())+' gid='+str(os.getgid())), sys.exit(0) if os.getuid()==1000 and os.getgid()==1000 and not os.getgroups() and all(k not in os.environ for k in ['AVE_VISION_API_KEY','AVE_PLANNER_API_KEY','AVE_MODEL_SERVICES_JSON']) else sys.exit(1)); runpy.run_path('/opt/ave/configure.py',run_name='__main__')"], {encoding:'utf8'});
  assert.equal(launchProbe.status, 0, launchProbe.stderr);
  assert.ok(launchProbe.stdout.includes('uid=1000 gid=1000'));
  const absentKey = spawnSync('docker', ['run', '--rm', '--tmpfs', '/run/ave', '--tmpfs', '/workspace/projects', '--tmpfs', '/workspace/uploads', '--user', 'root', '--entrypoint', '/opt/ave-python/bin/python', 'ave-desktop:local', '/opt/ave/configure.py'], { encoding: 'utf8' });
  assert.notEqual(absentKey.status, 0);
  assert.ok(absentKey.stderr.includes('Set AVE_VISION_API_KEY in .env'));
  const secrets = spawnSync('git', ['check-ignore', '.env'], { encoding: 'utf8' });
  assert.equal(secrets.status, 0);
  assert.ok(readFileSync('.dockerignore', 'utf8').includes('\n.env\n'));
  console.log('Docker packaging passed: CPU/GPU selection, startup dependencies, durable mounts, sandbox, secrets and missing-input failure.');
} finally { rmSync(directory, { recursive: true }); }
