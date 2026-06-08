import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { lookup, search } from '../src/server.js';

test('looks up MIT', () => {
  const r = lookup('MIT')!;
  assert.equal(r.id, 'MIT');
  assert.match(r.name, /MIT/);
  assert.equal(r.osi_approved, true);
});

test('looks up Apache-2.0', () => {
  const r = lookup('Apache-2.0')!;
  assert.match(r.name, /Apache/);
});

test('case-insensitive match', () => {
  const r = lookup('mit');
  assert.ok(r);
});

test('unknown returns null', () => {
  assert.equal(lookup('NoSuchLicenseXYZ'), null);
});

test('search returns matches', () => {
  const out = search('MIT', 5);
  assert.ok(out.length > 0);
  assert.ok(out.some((r) => r.id === 'MIT'));
});

test('search by name token', () => {
  const out = search('apache', 10);
  assert.ok(out.some((r) => /Apache/i.test(r.name)));
});

test('search respects limit', () => {
  const out = search('license', 3);
  assert.ok(out.length <= 3);
});

test('search ranks exact id match first', () => {
  const out = search('MIT', 5);
  assert.equal(out[0].id, 'MIT');
});

test('search with empty query returns no matches', () => {
  assert.deepEqual(search(''), []);
});

test('search with invalid limit falls back to default', () => {
  const out = search('a', Number.NaN);
  assert.ok(out.length <= 25);
});

test('lookup with non-string id returns null instead of throwing', () => {
  assert.equal(lookup(undefined as unknown as string), null);
  assert.equal(lookup('' as string), null);
});

test('search with non-string query returns empty instead of throwing', () => {
  assert.deepEqual(search(undefined as unknown as string), []);
});
