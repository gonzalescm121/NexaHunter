import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth=fs.readFileSync('src/auth.js','utf8');
const entry=fs.readFileSync('worker-entry.js','utf8');
const wrangler=fs.readFileSync('wrangler.toml','utf8');

 test('OAuth uses authorization code + PKCE S256',()=>{
  assert.match(auth,/authorization|code_challenge/);
  assert.match(auth,/code_challenge_method:'S256'/);
  assert.match(auth,/code_verifier/);
  assert.match(auth,/dash\.cloudflare\.com\/oauth2\/auth/);
  assert.match(auth,/dash\.cloudflare\.com\/oauth2\/token/);
  assert.match(auth,/dash\.cloudflare\.com\/oauth2\/userinfo/);
 });

test('OAuth state and session cookies are hardened',()=>{
  assert.match(auth,/HttpOnly/);
  assert.match(auth,/Secure/);
  assert.match(auth,/SameSite=Lax/);
  assert.match(auth,/Invalid OAuth state/);
  assert.match(auth,/SESSION_SECRET/);
});

test('API boundary requires an authenticated session',()=>{
  assert.match(entry,/const user=await session\(request,env\)/);
  assert.match(entry,/Authentication required/);
  assert.match(entry,/\/api\/auth\/me/);
});

test('paper accounts are isolated by authenticated subject',()=>{
  assert.match(entry,/idFromName\(`paper:\$\{userId\}`\)/);
  assert.match(entry,/idFromName\(`paper:\$\{user\.sub\}`\)/);
});

test('rate limiting is configured',()=>{
  assert.match(entry,/RATE_LIMITER/);
  assert.match(wrangler,/name = "RATE_LIMITER"/);
  assert.match(wrangler,/limit = 120/);
  assert.match(wrangler,/period = 60/);
});

test('public launch pages exist',()=>{
  for(const file of ['public/login.html','public/privacy.html','public/terms.html','public/disclaimer.html','public/support.html'])assert.equal(fs.existsSync(file),true,file);
});
