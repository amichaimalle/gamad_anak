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

test('full game: setup → draw → wishes → reset', async () => {
  await game.resetGame();
  const names = ['דנה', 'יוסי', 'נועה', 'סבתא רותי', 'סבא משה', 'אורי', 'תמר'];
  let g = await game.savePeople(names.map((name) => ({ name, forbidden: [] })));
  const id = Object.fromEntries(g.people.map((p) => [p.name, p.id]));
  g = await game.savePeople(g.people.map((p) =>
    p.name === 'סבתא רותי' ? { ...p, forbidden: [id['סבא משה']] } :
    p.name === 'סבא משה' ? { ...p, forbidden: [id['סבתא רותי']] } : p));

  g = await game.runDraw();
  const admin = game.adminView(g);
  assert.equal(admin.status, 'drawn');
  // המנהל לא מקבל את השידוכים
  assert.ok(!JSON.stringify(admin).includes('pairs'));
  for (const p of admin.people) assert.match(p.code, /^\d{5}$/);

  // כל אחד רואה ענק, הענקים שונים, אין זוג הדדי
  const views = {};
  for (const p of admin.people) views[p.name] = await game.playerView(p.code);
  const giants = Object.values(views).map((v) => v.giantName);
  assert.deepEqual([...giants].sort(), [...names].sort(), 'each person is someone’s giant exactly once');
  for (const [name, v] of Object.entries(views)) {
    assert.notEqual(v.giantName, name);
    assert.notEqual(views[v.giantName].giantName, name, `mutual: ${name}`);
  }
  assert.notEqual(views['סבתא רותי'].giantName, 'סבא משה');

  // הענק כותב, הגמד רואה
  const codeOf = Object.fromEntries(admin.people.map((p) => [p.name, p.code]));
  const giantOfDana = views['דנה'].giantName;
  await game.saveWish(codeOf[giantOfDana], 'אני אוהב שוקולד');
  assert.equal((await game.playerView(codeOf['דנה'])).giantWish, 'אני אוהב שוקולד');
  assert.equal((await game.playerView(codeOf[giantOfDana])).myWish, 'אני אוהב שוקולד');

  // אחרי הגרלה אי אפשר לשנות רשימה או להגריל שוב
  await assert.rejects(game.savePeople([]));
  await assert.rejects(game.runDraw());

  // איפוס
  g = await game.resetGame();
  assert.equal(g.status, 'setup');
  assert.equal(g.people.length, 0);
  assert.equal(await game.playerView(codeOf['דנה']), null);
  const db = JSON.parse(fs.readFileSync(process.env.GAMAD_DB_FILE, 'utf8'));
  assert.deepEqual(Object.keys(db), ['game'], 'old pairs and wishes deleted');
});

test('rejects more than 35 people and duplicate names', async () => {
  await game.resetGame();
  await assert.rejects(game.savePeople(Array.from({ length: 36 }, (_, i) => ({ name: 'x' + i }))));
  await assert.rejects(game.savePeople([{ name: 'a' }, { name: 'a' }]));
  await game.savePeople(Array.from({ length: 35 }, (_, i) => ({ name: 'x' + i })));
  const g = await game.runDraw();
  assert.equal(Object.keys(g.codes).length, 35);
  assert.ok(await store.get(`pairs:${g.id}`));
});
