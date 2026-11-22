// בדיקה מקצה לקצה של לוגיקת המשחק מול קובץ DB זמני
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gamad-'));
process.env.GAMAD_DB_FILE = path.join(tmp, 'db.json');
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
const game = await import('../lib/game.js');
const store = await import('../lib/store.js');

test('full game: setup → draw → wishes → redraw → draw → reset', async () => {
  await game.resetGame();
  const names = ['דנה', 'יוסי', 'נועה', 'סבתא רותי', 'סבא משה', 'אורי', 'תמר'];
  let g = await game.saveSetup(names.map((name) => ({ name })), []);
  const id = Object.fromEntries(g.people.map((p) => [p.name, p.id]));
  g = await game.saveSetup(g.people, [
    { id: 'c1', type: 'mutual', a: id['סבתא רותי'], b: id['סבא משה'] },
    { id: 'c2', type: 'must', a: id['אורי'], b: id['תמר'] },
    { id: 'c3', type: 'forbid', a: id['דנה'], list: [id['יוסי'], id['נועה']] },
  ]);
  assert.equal(g.constraints.length, 3);
  assert.equal(game.adminView(g).check.canDraw, true);

  g = await game.runDraw();
  const admin = game.adminView(g);
  assert.equal(admin.status, 'drawn');
  assert.ok(!JSON.stringify(admin).includes('giant'), 'admin never sees pairs');
  for (const p of admin.people) assert.match(p.code, /^\d{5}$/);
  const codeOf = Object.fromEntries(admin.people.map((p) => [p.name, p.code]));

  const views = async () => {
    const v = {};
    for (const n of names) v[n] = await game.playerView(codeOf[n]);
    return v;
  };
  let v = await views();
  assert.deepEqual(Object.values(v).map((x) => x.giantName).sort(), [...names].sort());
  for (const [name, x] of Object.entries(v)) assert.notEqual(v[x.giantName].giantName, name, 'no mutual pair');
  assert.equal(v['אורי'].giantName, 'תמר');
  assert.ok(!['יוסי', 'נועה'].includes(v['דנה'].giantName));
  assert.notEqual(v['סבתא רותי'].giantName, 'סבא משה');
  assert.notEqual(v['סבא משה'].giantName, 'סבתא רותי');

  await game.saveWish(codeOf['תמר'], 'אני אוהבת שוקולד');
  assert.equal((await game.playerView(codeOf['אורי'])).giantWish, 'אני אוהבת שוקולד');

  // הגרלה חוזרת: הקודים נשמרים, ההודעות נשמרות, בזמן העריכה הקוד מחזיר "בהכנה"
  g = await game.backToSetup();
  assert.equal(g.status, 'setup');
  assert.equal(await game.playerStatus(codeOf['דנה']), 'waiting');
  assert.equal(await game.playerView(codeOf['דנה']), null);
  g = await game.saveSetup([...g.people, { name: 'חדש' }], g.constraints);
  g = await game.runDraw();
  const admin2 = game.adminView(g);
  for (const n of names) assert.equal(admin2.people.find((p) => p.name === n).code, codeOf[n], 'codes kept');
  assert.match(admin2.people.find((p) => p.name === 'חדש').code, /^\d{5}$/);
  assert.equal(new Set(admin2.people.map((p) => p.code)).size, 8);
  assert.equal((await game.playerView(codeOf['תמר'])).myWish, 'אני אוהבת שוקולד');

  await assert.rejects(game.saveSetup([], []));
  await assert.rejects(game.runDraw());

  g = await game.resetGame();
  assert.equal(g.status, 'setup');
  assert.equal(g.people.length, 0);
  assert.equal(await game.playerStatus(codeOf['דנה']), null);
  const db = JSON.parse(fs.readFileSync(process.env.GAMAD_DB_FILE, 'utf8'));
  assert.deepEqual(Object.keys(db), ['game'], 'old pairs and wishes deleted');
});

test('conflicting constraints block the draw', async () => {
  await game.resetGame();
  let g = await game.saveSetup([{ name: 'א' }, { name: 'ב' }, { name: 'ג' }], []);
  const [a, b] = g.people.map((p) => p.id);
  g = await game.saveSetup(g.people, [{ id: '1', type: 'must', a, b }, { id: '2', type: 'must', a: b, b: a }]);
  assert.equal(game.adminView(g).check.canDraw, false);
  await assert.rejects(game.runDraw());
});

test('limits: 35 people, unique names', async () => {
  await game.resetGame();
  await assert.rejects(game.saveSetup(Array.from({ length: 36 }, (_, i) => ({ name: 'x' + i })), []));
  await assert.rejects(game.saveSetup([{ name: 'a' }, { name: 'a' }], []));
  await game.saveSetup(Array.from({ length: 35 }, (_, i) => ({ name: 'x' + i })), []);
  const g = await game.runDraw();
  assert.equal(Object.keys(g.codes).length, 35);
  assert.ok(await store.get(`pairs:${g.id}`));
});
