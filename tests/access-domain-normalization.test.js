import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAccessDomain } from '../src/auth.js';

test('Cloudflare Access team domain accepts the dashboard display format',()=>{
  assert.equal(
    normalizeAccessDomain('misty-limit-08e2.cloudflareaccess.com'),
    'https://misty-limit-08e2.cloudflareaccess.com'
  );
});

test('Cloudflare Access team domain preserves canonical HTTPS input',()=>{
  assert.equal(
    normalizeAccessDomain('https://misty-limit-08e2.cloudflareaccess.com'),
    'https://misty-limit-08e2.cloudflareaccess.com'
  );
});

test('Cloudflare Access team domain rejects insecure or malformed input',()=>{
  assert.equal(normalizeAccessDomain('http://misty-limit-08e2.cloudflareaccess.com'),null);
  assert.equal(normalizeAccessDomain('misty-limit-08e2.example.com'),null);
  assert.equal(normalizeAccessDomain(''),null);
});
