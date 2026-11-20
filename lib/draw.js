// לוגיקת ההגרלה: כל אחד מקבל ענק אחד, כל אחד הוא ענק של גמד אחד.
// חוקים:
//  1. אף אחד לא מקבל את עצמו.
//  2. אף אחד לא מקבל מישהו מרשימת "אסור לו לקבל" שלו.
//  3. אין זוג הדדי: אם א' הגמד של ב', אז ב' לא הגמד של א'.

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * people: [{ id, forbidden: [id, ...] }]
 * returns { ok: true, assignment: { giverId: receiverId } } or { ok: false, error }
 */
export function draw(people, rand = Math.random) {
  const n = people.length;
  if (n < 3) return { ok: false, error: 'צריך לפחות 3 משתתפים כדי להגריל.' };

  const ids = people.map((p) => p.id);
  const candidates = new Map();
  for (const p of people) {
    const banned = new Set(p.forbidden || []);
    candidates.set(p.id, ids.filter((id) => id !== p.id && !banned.has(id)));
  }
  for (const p of people) {
    if (candidates.get(p.id).length === 0) {
      return { ok: false, error: `ל${p.name || 'אחד המשתתפים'} אין אף אחד שמותר לו לקבל.` };
    }
  }

  const NODE_LIMIT = 200000;
  for (let attempt = 0; attempt < 30; attempt++) {
    // הכי מוגבלים קודם, עם ערבוב בין שווים
    const order = shuffle(ids, rand).sort((a, b) => candidates.get(a).length - candidates.get(b).length);
    const giverOf = new Map(); // receiver -> giver
    const receiverOf = new Map(); // giver -> receiver
    let nodes = 0;

    const solve = (k) => {
      if (k === order.length) return true;
      if (++nodes > NODE_LIMIT) return false;
      const g = order[k];
      for (const c of shuffle(candidates.get(g), rand)) {
        if (giverOf.has(c)) continue; // כבר יש לו גמד
        if (receiverOf.get(c) === g) continue; // זוג הדדי
        giverOf.set(c, g);
        receiverOf.set(g, c);
        if (solve(k + 1)) return true;
        giverOf.delete(c);
        receiverOf.delete(g);
      }
      return false;
    };

    if (solve(0)) {
      const assignment = Object.fromEntries(receiverOf);
      const errors = validate(people, assignment);
      if (errors.length === 0) return { ok: true, assignment };
    }
    if (nodes <= NODE_LIMIT) break; // חיפוש מלא נכשל: אין פתרון
  }
  return { ok: false, error: 'לא נמצאה הגרלה שעומדת בכל ההגבלות. נסו להוריד חלק מהאסורים.' };
}

/** בדיקת תקינות של הגרלה. מחזיר רשימת שגיאות (ריקה = תקין). */
export function validate(people, assignment) {
  const errors = [];
  const ids = new Set(people.map((p) => p.id));
  const byId = new Map(people.map((p) => [p.id, p]));
  const receivedBy = new Map();

  for (const p of people) {
    const r = assignment[p.id];
    if (r === undefined) { errors.push(`ל-${p.id} אין ענק`); continue; }
    if (!ids.has(r)) errors.push(`ל-${p.id} יש ענק לא קיים ${r}`);
    if (r === p.id) errors.push(`${p.id} קיבל את עצמו`);
    if ((p.forbidden || []).includes(r)) errors.push(`${p.id} קיבל את ${r} שאסור לו`);
    if (assignment[r] === p.id) errors.push(`${p.id} ו-${r} גמד וענק אחד של השני`);
    if (receivedBy.has(r)) errors.push(`ל-${r} יש יותר מגמד אחד`);
    receivedBy.set(r, p.id);
  }
  for (const id of ids) if (!receivedBy.has(id)) errors.push(`ל-${id} אין גמד`);
  for (const k of Object.keys(assignment)) if (!byId.has(k)) errors.push(`גמד לא קיים ${k}`);
  return errors;
}

/** קודים אקראיים בני 5 ספרות, ייחודיים */
export function makeCodes(count, rand = Math.random) {
  const codes = new Set();
  while (codes.size < count) codes.add(String(10000 + Math.floor(rand() * 90000)));
  return shuffle([...codes], rand);
}
