import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import { draw, validate, makeCodes, cleanConstraints, checkConstraints } from './draw.js';

export const ADMIN_CODE = '308476977';
export const MAX_PEOPLE = 35;

// game     = { id, status: 'setup' | 'drawn', people: [{ id, name }], constraints: [...], codes: { personId: code } }
// pairs:ID = { giverId: receiverId }   ← לא נשלח אף פעם למסך המנהל
// wish:ID:personId = הטקסט שהענק כתב לגמד שלו

function emptyGame() {
  return { id: randomUUID(), status: 'setup', people: [], constraints: [], codes: {} };
}

export async function getGame() {
  const game = (await store.get('game')) || emptyGame();
  // תאימות לגרסה הקודמת (רשימת אסורים לכל משתתף)
  if (!game.constraints) {
    game.constraints = game.people
      .filter((p) => p.forbidden?.length)
      .map((p) => ({ id: randomUUID(), type: 'forbid', a: p.id, list: p.forbidden }));
    game.people = game.people.map(({ id, name }) => ({ id, name }));
  }
  game.codes ||= {};
  return game;
}

export function adminView(game) {
  return {
    status: game.status,
    people: game.people.map((p) => ({ id: p.id, name: p.name, code: game.codes?.[p.id] || null })),
    constraints: game.constraints,
    check: game.status === 'setup' ? checkConstraints(game.people, game.constraints) : null,
  };
}

export class GameError extends Error {}

export async function saveSetup(inputPeople, inputConstraints) {
  const game = await getGame();
  if (game.status !== 'setup') throw new GameError('ההגרלה כבר בוצעה. כדי לשנות צריך הגרלה חוזרת או איפוס.');
  if (!Array.isArray(inputPeople)) throw new GameError('רשימה לא תקינה');
  if (inputPeople.length > MAX_PEOPLE) throw new GameError(`אפשר עד ${MAX_PEOPLE} משתתפים`);

  const names = new Set();
  const people = inputPeople.map((p) => {
    const name = String(p.name || '').trim().slice(0, 40);
    if (!name) throw new GameError('יש שם ריק');
    if (names.has(name)) throw new GameError(`השם "${name}" מופיע פעמיים`);
    names.add(name);
    return { id: String(p.id || randomUUID()), name };
  });
  const ids = new Set(people.map((p) => p.id));

  // מי שנמחק מהרשימה: מוחקים גם את הקוד וההודעה שלו
  const removed = game.people.filter((p) => !ids.has(p.id)).map((p) => p.id);
  if (removed.length) {
    await store.del(removed.map((id) => `wish:${game.id}:${id}`));
    for (const id of removed) delete game.codes[id];
  }

  game.people = people;
  game.constraints = cleanConstraints(inputConstraints ?? game.constraints, ids);
  await store.set('game', game);
  return game;
}

export async function runDraw() {
  const game = await getGame();
  if (game.status !== 'setup') throw new GameError('ההגרלה כבר בוצעה.');
  const result = draw(game.people, game.constraints);
  if (!result.ok) throw new GameError(result.error);

  // בדיקה כפולה לפני שמירה
  const errors = validate(game.people, game.constraints, result.assignment);
  if (errors.length) throw new GameError('ההגרלה נכשלה בבדיקה: ' + errors.join(', '));

  // מי שכבר יש לו קוד (מהגרלה קודמת) שומר עליו
  const missing = game.people.filter((p) => !game.codes[p.id]);
  const fresh = makeCodes(missing.length, Object.values(game.codes));
  missing.forEach((p, i) => { game.codes[p.id] = fresh[i]; });

  game.status = 'drawn';
  await store.set(`pairs:${game.id}`, result.assignment);
  await store.set('game', game);
  return game;
}

// הגרלה חוזרת: מוחק את השידוכים וחוזר לעריכה. שמות, אילוצים, קודים והודעות נשמרים.
export async function backToSetup() {
  const game = await getGame();
  await store.del([`pairs:${game.id}`]);
  game.status = 'setup';
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
  const clean = String(code || '').trim();
  const me = game.people.find((p) => game.codes[p.id] === clean);
  if (!me) return null;
  return { game, me, ready: game.status === 'drawn' };
}

/** 'player' | 'waiting' (קוד קיים אבל ההגרלה בהכנה) | null */
export async function playerStatus(code) {
  const found = await findPlayer(code);
  if (!found) return null;
  return found.ready ? 'player' : 'waiting';
}

export async function playerView(code) {
  const found = await findPlayer(code);
  if (!found || !found.ready) return null;
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
  if (!found || !found.ready) return false;
  await store.set(`wish:${found.game.id}:${found.me.id}`, String(text ?? '').slice(0, 100000));
  return true;
}
