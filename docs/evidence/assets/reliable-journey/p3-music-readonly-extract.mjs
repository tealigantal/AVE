import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root='/workspace/projects/P3收尾-原画幅与新素材-0f62e438';
const db=new DatabaseSync(resolve(root,'project.sqlite'),{readOnly:true});
try {
  const records=type=>db.prepare('SELECT r.*,s.object_path FROM object_refs r JOIN object_store s ON s.object_hash=r.object_hash WHERE r.object_type=? ORDER BY r.created_at').all(type).map(r=>({hash:r.object_hash,created_at:r.created_at,value:JSON.parse(readFileSync(resolve(root,r.object_path),'utf8'))}));
  const timelines=records('timeline_snapshot').map(r=>({hash:r.hash,version:r.value.version,tracks:r.value.tracks.filter(t=>t.enabled!==false).map(t=>({track_id:t.track_id,kind:t.kind,clips:t.clips.map(c=>({clip_id:c.clip_id,asset_id:c.asset_id,source:c.source,timeline_start:c.timeline_start,timeline_duration:c.timeline_duration,gain_db:c.gain_db}))}))}));
  const requests=records('creation_session').filter(r=>r.value.authorization.original_text.startsWith('P3音乐署名验收')).slice(-1).map(r=>({hash:r.hash,request_id:r.value.authorization.request_id,revisions:r.value.revisions,drafts:r.value.drafts}));
  const exports=records('creation_export');
  console.log(JSON.stringify({project_id:'6f5cc560-9cf8-4d18-ba81-6804f9bd19c9',model_runs:db.prepare('SELECT count(*) AS n FROM model_runs').get().n,timelines,requests,exports},null,2));
} finally {db.close();}
