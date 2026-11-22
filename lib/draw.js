// לוגיקת ההגרלה והאילוצים. קובץ "טהור" – רץ גם בשרת וגם בדפדפן.
//
// חוקים קבועים:
//  - אף אחד לא הגמד של עצמו.
//  - לכל אחד ענק אחד וגמד אחד.
//  - אין זוג הדדי: אם א' הגמד של ב', אז ב' לא הגמד של א' (בלי קשר לאילוצים).
//
// אילוצים (constraints):
//  { id, type: 'must',   a, b }        a חייב להיות הגמד של b
//  { id, type: 'forbid', a, list: [] } a אסור שיהיה הגמד של אף אחד מהרשימה
//  { id, type: 'mutual', a, b }        a לא הגמד של b, וגם b לא הגמד של a

export const TYPES = {
  must: 'חייב להיות',
  forbid: 'אסור להיות',
  mutual: 'איסור הדדי',
};

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** מנקה אילוצים: משאיר רק תקינים ורק עם משתתפים קיימים */
export function cleanConstraints(constraints, ids) {
  const has = (x) => ids.has(x);
  const out = [];
  for (const c of Array.isArray(constraints) ? constraints : []) {
    const id = String(c?.id || Math.random().toString(36).slice(2));
    if (c?.type === 'must' || c?.type === 'mutual') {
      const a = String(c.a || ''), b = String(c.b || '');
      if (has(a) && has(b) && a !== b) out.push({ id, type: c.type, a, b });
    } else if (c?.type === 'forbid') {
      const a = String(c.a || '');
      const list = [...new Set((c.list || []).map(String))].filter((x) => has(x) && x !== a);
      if (has(a) && list.length) out.push({ id, type: 'forbid', a, list });
    }
  }
  return out;
}

/** לכל גמד: את מי מותר לו לקבל */
function buildCandidates(ids, constraints) {
  const cand = new Map(ids.map((id) => [id, new Set(ids.filter((x) => x !== id))]));
  const must = new Map();
  for (const c of constraints) {
    if (c.type === 'forbid') for (const x of c.list) cand.get(c.a)?.delete(x);
    if (c.type === 'mutual') { cand.get(c.a)?.delete(c.b); cand.get(c.b)?.delete(c.a); }
    if (c.type === 'must') must.set(c.a, c.b);
  }
  for (const [a, b] of must) {
    const allowed = cand.get(a).has(b);
    cand.set(a, new Set(allowed ? [b] : []));
  }
  return cand;
}

/**
 * חיפוש שידוך. status: 'ok' | 'none' (הוכח שאין) | 'unknown' (נגמר זמן החיפוש)
 */
function solve(ids, cand, rand, limit = 300000) {
  const receiverOf = new Map(); // giver -> receiver
  const taken = new Set();
  let nodes = 0;
  let aborted = false;

  const options = (g) => {
    const out = [];
    for (const c of cand.get(g)) if (!taken.has(c) && receiverOf.get(c) !== g) out.push(c);
    return out;
  };

  const rec = () => {
    if (receiverOf.size === ids.length) return true;
    if (++nodes > limit) { aborted = true; return false; }

    // הגמד עם הכי מעט אפשרויות קודם
    let best = null, bestOpts = null;
    for (const g of ids) {
      if (receiverOf.has(g)) continue;
      const o = options(g);
      if (o.length === 0) return false;
      if (!bestOpts || o.length < bestOpts.length) { best = g; bestOpts = o; }
    }
    // כל ענק שעוד פנוי צריך שיהיה לו גמד אפשרי
    for (const r of ids) {
      if (taken.has(r)) continue;
      let ok = false;
      for (const g of ids) {
        if (!receiverOf.has(g) && cand.get(g).has(r) && receiverOf.get(r) !== g) { ok = true; break; }
      }
      if (!ok) return false;
    }

    for (const c of shuffle(bestOpts, rand)) {
      receiverOf.set(best, c);
      taken.add(c);
      if (rec()) return true;
      receiverOf.delete(best);
      taken.delete(c);
      if (aborted) return false;
    }
    return false;
  };

  if (rec()) return { status: 'ok', assignment: Object.fromEntries(receiverOf) };
  return { status: aborted ? 'unknown' : 'none' };
}

/**
 * בדיקת התנגשויות. מחזיר { canDraw, problems: [טקסט] }
 * people: [{ id, name }]
 */
export function checkConstraints(people, constraints) {
  const ids = people.map((p) => p.id);
  const idSet = new Set(ids);
  const nameOf = (id) => people.find((p) => p.id === id)?.name || '?';
  const cs = cleanConstraints(constraints, idSet);
  const problems = [];

  if (people.length < 3) return { canDraw: false, problems: ['צריך לפחות 3 משתתפים כדי להגריל.'] };

  // התנגשויות ברורות שאפשר להסביר
  const mustBy = new Map();
  const mustTo = new Map();
  const forbidden = new Map(ids.map((id) => [id, new Set()]));
  for (const c of cs) {
    if (c.type === 'forbid') c.list.forEach((x) => forbidden.get(c.a).add(x));
    if (c.type === 'mutual') { forbidden.get(c.a).add(c.b); forbidden.get(c.b).add(c.a); }
  }
  for (const c of cs.filter((c) => c.type === 'must')) {
    if (mustBy.has(c.a) && mustBy.get(c.a) !== c.b) {
      problems.push(`${nameOf(c.a)} חייב/ת להיות הגמד גם של ${nameOf(mustBy.get(c.a))} וגם של ${nameOf(c.b)}.`);
    }
    if (mustTo.has(c.b) && mustTo.get(c.b) !== c.a) {
      problems.push(`גם ${nameOf(mustTo.get(c.b))} וגם ${nameOf(c.a)} חייבים להיות הגמד של ${nameOf(c.b)}.`);
    }
    mustBy.set(c.a, c.b);
    mustTo.set(c.b, c.a);
    if (forbidden.get(c.a).has(c.b)) {
      problems.push(`${nameOf(c.a)} גם חייב/ת וגם אסור לו/ה להיות הגמד של ${nameOf(c.b)}.`);
    }
  }
  for (const [a, b] of mustBy) {
    if (mustBy.get(b) === a && a < b) {
      problems.push(`${nameOf(a)} ו${nameOf(b)} חייבים להיות גמדים אחד של השני, וזה אסור בגמד ענק.`);
    }
  }
  if (problems.length) return { canDraw: false, problems };

  const cand = buildCandidates(ids, cs);
  for (const id of ids) {
    if (cand.get(id).size === 0) problems.push(`אין אף אחד שמותר ל${nameOf(id)} להיות הגמד שלו.`);
  }
  for (const id of ids) {
    if (![...cand.values()].some((s) => s.has(id))) problems.push(`אין אף אחד שמותר לו להיות הגמד של ${nameOf(id)}.`);
  }
  if (problems.length) return { canDraw: false, problems };

  const result = solve(ids, cand, Math.random);
  if (result.status === 'ok') return { canDraw: true, problems: [] };
  if (result.status === 'unknown') {
    return { canDraw: true, problems: [], warning: 'האילוצים מסובכים, ייתכן שההגרלה לא תצליח.' };
  }

  // אין פתרון: מחפשים אילוצים שהסרה של אחד מהם פותרת את הבעיה
  const culprits = cs.filter((c) => solve(ids, buildCandidates(ids, cs.filter((x) => x !== c)), Math.random, 50000).status === 'ok');
  if (culprits.length) {
    return {
      canDraw: false,
      problems: ['אין הגרלה אפשרית עם כל האילוצים. מספיק להוריד אחד מאלה:', ...culprits.map((c) => '• ' + describe(c, nameOf))],
    };
  }
  return { canDraw: false, problems: ['אין הגרלה אפשרית עם האילוצים האלה. נסו להוריד חלק מהם.'] };
}

/**
 * ההגרלה עצמה. מחזיר { ok: true, assignment: { giverId: receiverId } } או { ok: false, error }
 */
export function draw(people, constraints = [], rand = Math.random) {
  const check = checkConstraints(people, constraints);
  if (!check.canDraw) return { ok: false, error: check.problems.join('\n') };
  const ids = people.map((p) => p.id);
  const cs = cleanConstraints(constraints, new Set(ids));
  const cand = buildCandidates(ids, cs);
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = solve(shuffle(ids, rand), cand, rand);
    if (r.status === 'ok') {
      const errors = validate(people, cs, r.assignment);
      if (errors.length === 0) return { ok: true, assignment: r.assignment };
      return { ok: false, error: 'ההגרלה נכשלה בבדיקה: ' + errors.join(', ') };
    }
    if (r.status === 'none') break;
  }
  return { ok: false, error: 'לא נמצאה הגרלה שעומדת בכל האילוצים.' };
}

/** בדיקת תקינות של הגרלה מוכנה. מחזיר רשימת שגיאות (ריקה = תקין). */
export function validate(people, constraints, assignment) {
  const errors = [];
  const ids = new Set(people.map((p) => p.id));
  const receivedBy = new Map();

  for (const id of ids) {
    const r = assignment[id];
    if (r === undefined) { errors.push(`ל-${id} אין ענק`); continue; }
    if (!ids.has(r)) errors.push(`ל-${id} יש ענק לא קיים ${r}`);
    if (r === id) errors.push(`${id} קיבל את עצמו`);
    if (assignment[r] === id) errors.push(`${id} ו-${r} גמד וענק אחד של השני`);
    if (receivedBy.has(r)) errors.push(`ל-${r} יש יותר מגמד אחד`);
    receivedBy.set(r, id);
  }
  for (const id of ids) if (!receivedBy.has(id)) errors.push(`ל-${id} אין גמד`);
  for (const k of Object.keys(assignment)) if (!ids.has(k)) errors.push(`גמד לא קיים ${k}`);

  for (const c of constraints) {
    if (c.type === 'must' && assignment[c.a] !== c.b) errors.push(`${c.a} חייב לקבל את ${c.b}`);
    if (c.type === 'forbid' && c.list.includes(assignment[c.a])) errors.push(`${c.a} קיבל מישהו אסור`);
    if (c.type === 'mutual' && (assignment[c.a] === c.b || assignment[c.b] === c.a)) errors.push(`איסור הדדי ${c.a}/${c.b} הופר`);
  }
  return errors;
}

/** משפט שמתאר אילוץ */
export function describe(c, nameOf) {
  if (c.type === 'must') return `${nameOf(c.a)} חייב/ת להיות הגמד של ${nameOf(c.b)}`;
  if (c.type === 'mutual') return `${nameOf(c.a)} ו${nameOf(c.b)} לא יהיו גמדים אחד של השני`;
  return `ל${nameOf(c.a)} אסור להיות הגמד של ${c.list.map(nameOf).join(', ')}`;
}

/** קודים אקראיים בני 5 ספרות, ייחודיים, שלא מתנגשים בקודים קיימים */
export function makeCodes(count, existing = [], rand = Math.random) {
  const used = new Set(existing);
  const codes = [];
  while (codes.length < count) {
    const c = String(10000 + Math.floor(rand() * 90000));
    if (!used.has(c)) { used.add(c); codes.push(c); }
  }
  return codes;
}
