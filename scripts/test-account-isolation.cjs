// Runs the real handlers against SQLite, replacing only platform identity/binding.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const seed = [{ id: 'sample-task', title: 'Sample task', description: '', project: 'Sample area', category: '', status: 'Da iniziare', priority: 'Media', dueDate: null }];
const source = fs.readFileSync('app/api/tasks/route.ts', 'utf8');
const owner = 'test-owner';
let userId = owner;
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE task_records (key TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL)');
const binding = {
  prepare(sql) { return { bind(...args) { return {
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  }; } }; },
  async batch(statements) { db.exec('BEGIN'); try { const r = []; for (const s of statements) r.push(await s.run()); db.exec('COMMIT'); return r; } catch(e) { db.exec('ROLLBACK'); throw e; } },
};
function load(code) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports: module.exports, module,
    require(name) {
      if(name === 'cloudflare:workers') return { env: { DB: binding } };
      if(name.includes('auth-context')) return { getAppUser: async () => userId ? { userId, email: 'test@example.com' } : null };
      if(name.includes('task-store')) return load(fs.readFileSync('lib/task-store.ts', 'utf8'));
      if(name.includes('data-seed')) return seed;
      throw Error(name);
    }, Response, Request, Headers, crypto: require('node:crypto').webcrypto, console, Intl, Date,
  });
  return module.exports;
}
const api = load(source);
const req = (method, body) => new Request('https://todly.test/api/tasks', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const state = async () => { const r = await api.GET(); assert.equal(r.status, 200); assert.match(r.headers.get('cache-control'), /private, no-store/); return r.json(); };
(async () => {
  for (const task of seed) db.prepare('INSERT INTO task_records VALUES (?, ?, ?, ?)').run(`${owner}:${task.id}`, owner, JSON.stringify(task), '2026-10-16T08:00:00Z');
  const original = await state();
  assert.equal(original.tasks.length, seed.length);
  const target = original.tasks[0];
  userId = 'separate-account-b';
  assert.deepEqual(await state(), { tasks: [], areaSettings: {}, projects: [] });
  assert.equal((await api.PATCH(req('PATCH', target))).status,404);
  assert.equal((await api.DELETE(req('DELETE', {id:target.id}))).status,404);
  for(const action of ['renameProject','pinProject','archiveProject','deleteProject']) assert.equal((await api.POST(req('POST',{action,from:target.project,to:'Hacked',value:true}))).status,404);
  const created = await api.POST(req('POST',{title:'Private B',project:'B area',user_id:owner,priority:'Di routine'}));
  assert.equal(created.status,201);
  let b = (await created.json()).task;
  assert.equal((await state()).tasks.length,1);
  const updated = await api.PATCH(req('PATCH',{...b,description:'B notes',archived:true,pinned:true,createdAt:'1900-01-01',status:'Completato'}));
  assert.equal(updated.status,200);
  b = (await updated.json()).task;
  assert.notEqual(b.createdAt,'1900-01-01');
  assert(b.archived && b.pinned && b.completedOn);
  assert.equal((await api.PATCH(req('PATCH',{...b,id:'area-settings:B area'}))).status,404);
  userId=owner;
  assert.deepEqual(await state(),original);
  assert.equal((await api.PATCH(req('PATCH',b))).status,404);
  assert.equal((await api.DELETE(req('DELETE',{id:b.id}))).status,404);
  userId='separate-account-b';
  assert.equal((await api.DELETE(req('DELETE',{id:b.id}))).status,200);
  assert.equal((await state()).tasks.length,0);
  userId='separate-account-c';
  assert.deepEqual(await state(),{tasks:[],areaSettings:{},projects:[]});
  // Empty areas persist independently of tasks and remain scoped to the verified account.
  const createArea = body => api.POST(req('POST', {action:'createProject', ...body}));
  assert.equal((await createArea({name:' ',color:'#abcdef'})).status,400);
  assert.equal((await createArea({name:'Tutte le aree',color:'#abcdef'})).status,400);
  assert.equal((await createArea({name:'New',color:'red'})).status,400);
  assert.equal((await createArea({name:'x'.repeat(81),color:'#abcdef'})).status,400);
  const area = await createArea({name:'  Design  ',color:'#AB12EF',user_id:owner});
  assert.equal(area.status,201);
  assert.equal((await state()).tasks.length,0);
  assert.equal((await state()).areaSettings.Design.color,'#ab12ef');
  assert.equal((await createArea({name:'design',color:'#123456'})).status,409);
  userId=owner;
  assert.deepEqual(await state(),original);
  assert.equal((await api.POST(req('POST',{action:'deleteProject',from:'Design'}))).status,404);
  userId='separate-account-c';
  for(const action of ['pinProject','archiveProject']) assert.equal((await api.POST(req('POST',{action,from:'Design',value:true}))).status,200);
  assert.equal((await state()).areaSettings.Design.color,'#ab12ef');
  assert.equal((await api.POST(req('POST',{action:'renameProject',from:'Design',to:'Studio'}))).status,200);
  assert.equal((await state()).areaSettings.Studio.color,'#ab12ef');
  assert.equal((await createArea({name:'Design',color:'#123456'})).status,409);
  assert.equal((await api.POST(req('POST',{action:'archiveProject',from:'Studio',value:false}))).status,200);
  const taskInArea=await api.POST(req('POST',{title:'In new area',project:'Studio'}));
  const taskInAreaBody=(await taskInArea.json()).task;
  assert.equal((await api.DELETE(req('DELETE',{id:taskInAreaBody.id}))).status,200);
  assert.equal((await state()).areaSettings.Studio.color,'#ab12ef');
  assert.equal((await api.POST(req('POST',{action:'deleteProject',from:'Studio'}))).status,200);
  assert.equal((await state()).areaSettings.Studio.deleted,true);
  assert.equal((await createArea({name:'Studio',color:'#123456'})).status,409);
  // Ids generated by the browser: honored when valid, replaced when not; updates and deletes use the single-record lookup.
  userId='separate-account-d';
  const clientId=crypto.randomUUID();
  assert.equal((await (await api.POST(req('POST',{title:'Instant',id:clientId}))).json()).task.id,clientId);
  assert.notEqual((await (await api.POST(req('POST',{title:'Bad id',id:'area-settings:x'}))).json()).task.id,'area-settings:x');
  const quick=await api.PATCH(req('PATCH',{id:clientId,title:'Instant 2',status:'Completato',priority:'Di routine'}));
  assert.equal(quick.status,200);
  assert.equal((await quick.json()).task.title,'Instant 2');
  assert.equal((await api.DELETE(req('DELETE',{id:clientId}))).status,200);
  assert.equal((await api.PATCH(req('PATCH',{id:clientId,title:'Gone'}))).status,404);
  console.log('PASS: empty area creation, validation, duplicates, persistence, color preservation, rename/archive/delete and account isolation.');
  userId=null;
  for(const method of ['GET','POST','PATCH','DELETE']) assert.equal((await api[method](method==='GET'?undefined:req(method,{title:'No',id:target.id}))).status,401);
  console.log('PASS: owner preservation, empty accounts, cross-account reads/writes, area isolation, metadata protection, routine/archive/delete and anonymous access.');
})().catch(e=>{console.error(e);process.exitCode=1});
