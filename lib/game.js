import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import { draw, validate, makeCodes } from './draw.js';

export const ADMIN_CODE = '308476977';
export const MAX_PEOPLE = 35;

// game     = { id, status: 'setup' | 'drawn', people: [{ id, name, forbidden: [id] }], codes: { personId: code } }
// pairs:ID = { giverId: receiverId }   ← לא נשלח אף פעם למסך המנהל
// wish:ID:personId = הטקסט שהענק כתב לגמד שלו

function emptyGame() {
  return { id: randomUUID(), status: 'setup', people: [], codes: {} };
}

export async function getGame() {
  return (await store.get('game')) || emptyGame();
}

export function adminView(game) {
  return {
    status: game.status,
    people: game.people.map((p) => ({
      id: p.id,
      name: p.name,
      forbidden: p.forbidden,
      code: game.codes?.[p.id] || null,
    })),
  };
}

export class GameError extends Error {}

export async function savePeople(input) {
  const game = await getGame();
  if (game.status !== 'setup') throw new GameError('ההגרלה כבר בוצעה. כדי לשנות צריך לאפס.');
  if (!Array.isArray(input)) throw new GameError('רשימה לא תקינה');
  if (input.length > MAX_PEOPLE) throw new GameError(`אפשר עד ${MAX_PEOPLE} משתתפים`);

  const names = new Set();
  const people = input.map((p) => {
    const name = String(p.name || '').trim().slice(0, 40);
    if (!name) throw new GameError('יש שם ריק');
    if (names.has(name)) throw new GameError(`השם "${name}" מופיע פעמיים`);
    names.add(name);
    return { id: String(p.id || randomUUID()), name, forbidden: Array.isArray(p.forbidden) ? p.forbidden.map(String) : [] };
  });
  const ids = new Set(people.map((p) => p.id));
  for (const p of people) p.forbidden = [...new Set(p.forbidden)].filter((f) => f !== p.id && ids.has(f));

  game.people = people;
  await store.set('game', game);
  return game;
}

export async function runDraw() {
  const game = await getGame();
  if (game.status !== 'setup') throw new GameError('ההגרלה כבר בוצעה.');
  const result = draw(game.people);
  if (!result.ok) throw new GameError(result.error);

  // בדיקה כפולה לפני שמירה
  const errors = validate(game.people, result.assignment);
  if (errors.length) throw new GameError('ההגרלה נכשלה בבדיקה: ' + errors.join(', '));

  const codes = makeCodes(game.people.length);
  game.codes = Object.fromEntries(game.people.map((p, i) => [p.id, codes[i]]));
  game.status = 'drawn';
  await store.set(`pairs:${game.id}`, result.assignment);
  await store.set('game', game);
  return game;
}

export async function resetGame() {
  const game = await store.get('game');
  if (game) {
    await store.del([`pairs:${game.id}`, ...game.people.map((p) => `wish:${game.id}:${p.id}`)]);
  }
  const fresh = emptyGame();
  await store.set('game', fresh);
  return fresh;
}

async function findPlayer(code) {
  const game = await getGame();
  if (game.status !== 'drawn') return null;
  const clean = String(code || '').trim();
  const me = game.people.find((p) => game.codes[p.id] === clean);
  return me ? { game, me } : null;
}

export async function isPlayerCode(code) {
  return !!(await findPlayer(code));
}

export async function playerView(code) {
  const found = await findPlayer(code);
  if (!found) return null;
  const { game, me } = found;
  const pairs = (await store.get(`pairs:${game.id}`)) || {};
  const giant = game.people.find((p) => p.id === pairs[me.id]);
  const [giantWish, myWish] = await Promise.all([
    giant ? store.get(`wish:${game.id}:${giant.id}`) : null,
    store.get(`wish:${game.id}:${me.id}`),
  ]);
  return { name: me.name, giantName: giant?.name || '', giantWish: giantWish || '', myWish: myWish || '' };
}

export async function saveWish(code, text) {
  const found = await findPlayer(code);
  if (!found) return false;
  await store.set(`wish:${found.game.id}:${found.me.id}`, String(text ?? '').slice(0, 100000));
  return true;
}
