const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,'/');
for(const icon of [...manifest.icons,{src:'/apple-touch-icon.png',sizes:'180x180'}]){
 const bytes=fs.readFileSync('public'+icon.src);
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,icon.sizes);
}
const handlers={}; const cached=[];let fail=false;let network=0;
const fallback=new Response('offline');
const cache={add:async path=>cached.push(path),match:async path=>path==='/offline.html'?fallback:undefined};
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{
 self:{location:{origin:'https://todly.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
 caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},URL,Response,
 fetch:async()=>{network++;if(fail)throw Error('offline');return new Response('private account page');}
});
(async()=>{
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(cached,['/offline.html']);
 for(const [path,method,mode] of [['/api/tasks','GET','cors'],['/api/tasks','POST','cors'],['/auth/google','GET','navigate'],['/auth/callback?code=abc','GET','navigate'],['/?_rsc=1','GET','cors']]){
  handlers.fetch({request:{url:'https://todly.test'+path,method,mode},respondWith:()=>assert.fail('intercepted '+path)});
 }
 const navigate=()=>{let result;handlers.fetch({request:{url:'https://todly.test/',method:'GET',mode:'navigate'},respondWith:p=>result=p});return result;};
 assert.equal(await (await navigate()).text(),'private account page');assert.deepEqual(cached,['/offline.html']);
 fail=true;assert.equal(await navigate(),fallback);assert.equal(network,2);
 console.log('PASS: PWA manifest, Apple/PNG dimensions, offline fallback, network-only account page, API/OAuth/write bypass.');
})().catch(error=>{console.error(error);process.exitCode=1});
