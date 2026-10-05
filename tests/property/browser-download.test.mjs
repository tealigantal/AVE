import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule,createContext,SyntheticModule} from 'node:vm';

// Run the actual browser entry with inert transport and DOM boundaries. Each
// download must remain available for a distinct user gesture, even if the
// browser rejects unsolicited multiple downloads. Actual saving is UI-tested.
const clicks=[];
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.handlers=new Map();}
  append(child){child.parent=this;this.children.push(child);}
  setAttribute(name,value){this[name]=value;}
  addEventListener(name,fn){this.handlers.set(name,fn);}
  showModal(){this.open=true;}
  close(){this.open=false;}
  remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
  click(){clicks.push(this);this.onclick?.();}
}
const body=new Element('body'),head=new Element('head');
const files=[{name:'AVE-v6.mp4',url:'/api/download/master'},{name:'AVE-v6.mp4.audio.json',url:'/api/download/audio'},{name:'AVE-v6.mp4.credits.txt',url:'/api/download/credits'}];
let downloads=files;
const context=createContext({console,window:{},document:{body,head,createElement:tag=>new Element(tag)},fetch:async path=>({ok:true,json:async()=>path==='/api/session'?{csrf:'test'}:{result:{ok:true,data:{version:6}},downloads}}),EventSource:class {set onopen(fn){queueMicrotask(fn);}},queueMicrotask});
const entry=new SourceTextModule(await readFile(new URL('../../apps/desktop/src/renderer/browser/entry.js',import.meta.url),'utf8'),{context,importModuleDynamically:async name=>{assert.equal(name,'/app/main.js');const module=new SyntheticModule([],()=>{},{context});await module.link(()=>{});await module.evaluate();return module;}});
await entry.link(async name=>new SyntheticModule(name.endsWith('wire.js')?['encode','decode']:name.endsWith('media-formats.js')?['MEDIA_ACCEPT']:name.endsWith('error-dialog.js')?['reportError']:[],function(){if(name.endsWith('wire.js')){this.setExport('encode',x=>x);this.setExport('decode',x=>x);}else if(name.endsWith('media-formats.js'))this.setExport('MEDIA_ACCEPT','');else if(name.endsWith('error-dialog.js'))this.setExport('reportError',()=>{});},{context}));
await entry.evaluate();
const result=await context.window.projectApi.command({command_type:'project.creation.export'});
assert.equal(result.ok,true);
assert.equal(clicks.length,0,'preparing files must not initiate unsolicited downloads');
const modal=body.children.find(x=>x.tagName==='dialog');
assert.equal(modal.open,true);
const anchors=modal.children.flatMap(x=>x.children).filter(x=>x.tagName==='a');
assert.deepEqual(anchors.map(x=>[x.textContent,x.href,x.download]),files.map((x,i)=>[['下载成片','下载音频清单','下载音频署名'][i],x.url,x.name]));
for(const anchor of anchors)anchor.click();
assert.equal(clicks.length,3);
assert.equal(anchors.every(x=>x.parent.parent===modal),true,'all links survive earlier downloads for retry');
modal.children.find(x=>x.tagName==='button').click();
assert.equal(body.children.includes(modal),false);
downloads=[];
await context.window.projectApi.query({query_type:'app.status'});
assert.equal(body.children.some(x=>x.tagName==='dialog'),false);
console.log('AVE_BROWSER_INDIVIDUAL_DOWNLOADS passed');
