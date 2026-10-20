const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(path, imports = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(output, { exports: module.exports, module, require: name => imports[name] ?? require(name), URL, Response, Request, Headers, console });
  return module.exports;
}
const config = load('lib/auth-config.ts');
const auth = load('lib/auth-context.ts');
const handlers = load('app/api/auth/route.ts', { '../../../lib/auth-context': auth });
const google = load('app/auth/google/route.ts', { '../../../lib/auth-context': auth });
const callback = load('app/auth/callback/route.ts', { '../../../lib/auth-context': auth });
const confirm = load('app/auth/confirm/route.ts', { '../../../lib/auth-context': auth });
const settings = { url: 'https://example.supabase.co', key: 'publishable-test', origin: 'https://todly.example' };
const verified = id => ({ data: { user: { id, email: `${id}@example.com`, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {} } }, error: null });
const request = body => new Request('https://todly.example/api/auth', { method: 'POST', headers: { Origin: settings.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
(async () => {
  assert.equal(config.readAuthConfig({}), null);
  assert.equal(config.readAuthConfig({ SUPABASE_URL: settings.url, SUPABASE_PUBLISHABLE_KEY: settings.key, APP_URL: 'http://public.example' }), null);
  assert.equal(config.readAuthConfig({ SUPABASE_URL: settings.url, SUPABASE_PUBLISHABLE_KEY: settings.key, APP_URL: settings.origin }).origin, settings.origin);
  const live = { SUPABASE_URL: settings.url, SUPABASE_PUBLISHABLE_KEY: settings.key, APP_URL: 'https://todly.me.workers.dev' };
  assert.equal(config.readAuthConfig(live, 'https://todly.me.workers.dev/auth/google').origin, 'https://todly.me.workers.dev');
  for (const preview of ['https://abc123-todly.me.workers.dev', 'https://claude-fix-colors-todly.me.workers.dev']) assert.equal(config.readAuthConfig(live, `${preview}/auth/google`).origin, preview);
  for (const other of ['https://evil.example/x', 'https://a.b-todly.me.workers.dev/', 'https://-todly.me.workers.dev/', 'http://abc-todly.me.workers.dev/', 'https://abc-todly.me.workers.dev:8443/', 'https://abc-todly.me.workers.dev.evil/']) assert.equal(config.readAuthConfig(live, other).origin, 'https://todly.me.workers.dev');
  assert.equal(config.readAuthConfig({ ...live, APP_URL: settings.origin }, 'https://abc-todly.example/').origin, settings.origin);
  for (const origin of ['https://evil.example', 'https://todly.example.evil', null]) {
    const headers = origin ? { Origin: origin } : {};
    assert.equal(config.isSameOriginWrite(new Request(settings.origin, { method: 'POST', headers }), settings.origin), false);
  }
  assert.equal(config.isSameOriginWrite(new Request(settings.origin, { method: 'PATCH', headers: { Origin: settings.origin } }), settings.origin), true);
  assert.equal(await auth.runWithAuth({ client: null, config: null }, auth.getAppUser), null);
  const identities = await Promise.all(['alice', 'bob'].map(id => auth.runWithAuth({ client: { auth: { getUser: async () => verified(id) } }, config: settings }, async () => {
    await new Promise(resolve => setImmediate(resolve)); return (await auth.getAppUser()).userId;
  })));
  assert.deepEqual(identities, ['alice', 'bob']);
  let calls = 0;
  await auth.runWithAuth({ client: { auth: { getUser: async () => { calls++; return verified('alice'); } } }, config: settings }, async () => { await auth.getAppUser(); await auth.getAppUser(); });
  assert.equal(calls, 1);
  const unconfirmed = verified('alice'); unconfirmed.data.user.email_confirmed_at = null;
  assert.equal(await auth.runWithAuth({ client: { auth: { getUser: async () => unconfirmed } }, config: settings }, auth.getAppUser), null);
  const failure = { error: { message: 'internal-provider-details' }, data: { user: null } };
  const captured = {};
  const client = { auth: {
    getUser: async () => verified('alice'),
    signInWithPassword: async value => { captured.signin = value; return verified('alice'); },
    signUp: async value => { captured.signup = value; return { data: { session: null }, error: null }; },
    resetPasswordForEmail: async (...value) => { captured.reset = value; return { error: null }; },
    updateUser: async value => { captured.update = value; return { error: null }; },
    signOut: async value => { captured.signout = value; return { error: null }; },
    signInWithOAuth: async value => { captured.oauth = value; return { data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' }, error: null }; },
    exchangeCodeForSession: async code => { captured.code = code; return { error: code === 'valid-code' ? null : new Error('invalid') }; },
    verifyOtp: async value => { captured.otp = value; return { error: null }; },
  } };
  await auth.runWithAuth({ client, config: settings }, async () => {
    assert.equal((await handlers.POST(request({ action: 'signin', email: 'alice@example.com', password: 'short' }))).status, 400);
    assert.equal((await handlers.POST(request({ action: 'signin', email: 'Alice@example.com', password: 'valid-password-123' }))).status, 200);
    assert.equal(captured.signin.email, 'alice@example.com');
    assert.equal((await handlers.POST(request({ action: 'signup', email: 'alice@example.com', password: 'valid-password-123' }))).status, 200);
    assert.equal(captured.signup.options.emailRedirectTo, `${settings.origin}/auth/confirm`);
    assert.equal((await handlers.POST(request({ action: 'reset', email: 'unknown@example.com' }))).status, 200);
    assert.equal((await handlers.POST(request({ action: 'updatePassword', password: 'updated-password-123' }))).status, 200);
    assert.equal((await handlers.POST(request({ action: 'signout' }))).status, 200);
    const g = await google.GET(); assert.equal(g.status, 303); assert.equal(captured.oauth.provider, 'google');
    assert.equal(captured.oauth.options.redirectTo, `${settings.origin}/auth/callback`);
    const cb = await callback.GET(new Request(`${settings.origin}/auth/callback?code=valid-code&next=https://evil.example`));
    assert.equal(cb.headers.get('location'), `${settings.origin}/`);
    const expired = await callback.GET(new Request(`${settings.origin}/auth/callback?code=bad`));
    assert.equal(expired.headers.get('location'), '/?auth_error=callback');
    const recovery = await confirm.GET(new Request(`${settings.origin}/auth/confirm?token_hash=private-token&type=recovery`));
    assert.equal(recovery.headers.get('location'), `${settings.origin}/auth/update-password`);
    assert.equal(captured.otp.type, 'recovery');
    assert.equal((await confirm.GET(new Request(`${settings.origin}/auth/confirm?token_hash=x&type=unknown`))).headers.get('location'), '/?auth_error=expired');
  });
  client.auth.signInWithPassword = async () => failure;
  const rejected = await auth.runWithAuth({ client, config: settings }, () => handlers.POST(request({ action: 'signin', email: 'alice@example.com', password: 'valid-password-123' })));
  assert.equal(rejected.status, 401); assert(!JSON.stringify(await rejected.json()).includes('internal-provider-details'));
  const missing = await auth.runWithAuth({ client: null, config: null }, () => handlers.POST(request({ action: 'signin' })));
  assert.equal(missing.status, 503);
  let runtimeCalls = 0;
  const ssr = require('@supabase/ssr');
  const runtime = load('worker.ts', {
    './lib/auth-config': config, './lib/auth-context': auth,
    '@supabase/ssr': { ...ssr, createServerClient: (_url, _key, options) => {
      options.cookies.setAll([{ name: 'session-part', value: 'test-session', options: { maxAge: 3600 } }]);
      return { auth: { getUser: async () => verified('real-user') } };
    } },
    'vinext/server/fetch-handler': { fetch: async () => {
      runtimeCalls++; const user = await auth.getAppUser(); return Response.json({ user: user?.userId ?? null });
    } },
  }).default;
  const bindings = { SUPABASE_URL: settings.url, SUPABASE_PUBLISHABLE_KEY: settings.key, APP_URL: settings.origin };
  const runtimeResponse = await runtime.fetch(new Request(settings.origin, { headers: { 'oai-authenticated-user-id': 'forged-user' } }), bindings, {});
  assert.equal((await runtimeResponse.json()).user, 'real-user');
  assert.match(runtimeResponse.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(runtimeResponse.headers.get('set-cookie'), /Secure/i);
  assert.match(runtimeResponse.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.match(runtimeResponse.headers.get('cache-control'), /no-store/);
  assert.equal(runtimeResponse.headers.get('referrer-policy'), 'no-referrer');
  const denied = await runtime.fetch(new Request(`${settings.origin}/api/tasks`, { method: 'DELETE', headers: { Origin: 'https://evil.example' } }), bindings, {});
  assert.equal(denied.status, 403); assert.equal(runtimeCalls, 1);
  const notConfigured = await runtime.fetch(new Request(settings.origin, { headers: { 'oai-authenticated-user-id': 'forged-user' } }), {}, {});
  assert.equal((await notConfigured.json()).user, null);
  console.log('PASS: verified identities, account context isolation, CSRF origin checks, email/password, signup, reset, Google callback and error handling.');
})().catch(error => { console.error(error); process.exitCode = 1; });
