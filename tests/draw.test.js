import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw, validate, makeCodes, checkConstraints } from '../lib/draw.js';

const mkPeople = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `אדם ${i}` }));

// בדיקה עצמאית של כל דרישות ההגרלה
function checkAssignment(people, constraints, a) {
  const ids = people.map((p) => p.id);
  for (const id of ids) assert.ok(a[id] !== undefined, `${id} has no giant`);
  assert.deepEqual(ids.map((id) => a[id]).sort(), [...ids].sort(), 'every person has exactly one gamad');
  for (const id of ids) {
    assert.notEqual(a[id], id, 'no self');
    assert.notEqual(a[a[id]], id, `mutual pair ${id} <-> ${a[id]}`);
  }
  for (const c of constraints) {
    if (c.type === 'must') assert.equal(a[c.a], c.b, 'must respected');
    if (c.type === 'forbid') assert.ok(!c.list.includes(a[c.a]), 'forbid respected');
    if (c.type === 'mutual') { assert.notEqual(a[c.a], c.b); assert.notEqual(a[c.b], c.a); }
  }
}

test('no constraints: everyone has a giant and a gamad, never a mutual pair (3..35 people)', () => {
  for (let n = 3; n <= 35; n++) {
    for (let run = 0; run < 30; run++) {
      const people = mkPeople(n);
      const r = draw(people, []);
      assert.ok(r.ok, `n=${n}: ${r.error}`);
      checkAssignment(people, [], r.assignment);
    }
  }
});

test('random mix of must / forbid / mutual constraints is respected', () => {
  let solved = 0;
  for (let run = 0; run < 300; run++) {
    const n = 5 + (run % 31);
    const people = mkPeople(n);
    const pick = () => people[Math.floor(Math.random() * n)].id;
    const cs = [];
    for (let k = 0; k < n / 2; k++) {
      const a = pick(), b = pick();
      if (a === b) continue;
      const t = Math.random();
      if (t < 0.15) cs.push({ id: 'c' + k, type: 'must', a, b });
      else if (t < 0.6) cs.push({ id: 'c' + k, type: 'forbid', a, list: [b, pick()].filter((x) => x !== a) });
      else cs.push({ id: 'c' + k, type: 'mutual', a, b });
    }
    const check = checkConstraints(people, cs);
    const r = draw(people, cs);
    assert.equal(r.ok, check.canDraw, 'check and draw agree');
    if (r.ok) { solved++; checkAssignment(people, cs, r.assignment); }
    else assert.ok(check.problems.length > 0, 'conflict explained');
  }
  assert.ok(solved > 150, `solved only ${solved}`);
});

test('must constraint is always kept', () => {
  const people = mkPeople(10);
  const cs = [{ id: '1', type: 'must', a: 'p0', b: 'p5' }, { id: '2', type: 'must', a: 'p3', b: 'p9' }];
  for (let i = 0; i < 200; i++) {
    const r = draw(people, cs);
    assert.ok(r.ok);
    checkAssignment(people, cs, r.assignment);
  }
});

test('forbid is one-directional', () => {
  // ל-p0 אסור לקבל את כולם חוץ מ-p1 → p0 חייב לקבל את p1; ל-p1 מותר לקבל את p0? לא – זוג הדדי. אבל מותר לו לקבל אחרים.
  const people = mkPeople(4);
  const cs = [{ id: '1', type: 'forbid', a: 'p1', list: ['p0'] }];
  let p0GotP1 = false;
  for (let i = 0; i < 200; i++) {
    const r = draw(people, cs);
    assert.ok(r.ok);
    checkAssignment(people, cs, r.assignment);
    if (r.assignment.p0 === 'p1') p0GotP1 = true;
  }
  assert.ok(p0GotP1, 'p0 is still allowed to be the gamad of p1');
});

test('conflicts are detected and block the draw', () => {
  const people = mkPeople(5);
  const cases = [
    [{ id: '1', type: 'must', a: 'p0', b: 'p1' }, { id: '2', type: 'must', a: 'p0', b: 'p2' }],
    [{ id: '1', type: 'must', a: 'p0', b: 'p1' }, { id: '2', type: 'must', a: 'p2', b: 'p1' }],
    [{ id: '1', type: 'must', a: 'p0', b: 'p1' }, { id: '2', type: 'must', a: 'p1', b: 'p0' }],
    [{ id: '1', type: 'must', a: 'p0', b: 'p1' }, { id: '2', type: 'mutual', a: 'p1', b: 'p0' }],
    [{ id: '1', type: 'must', a: 'p0', b: 'p1' }, { id: '2', type: 'forbid', a: 'p0', list: ['p1'] }],
    [{ id: '1', type: 'forbid', a: 'p0', list: ['p1', 'p2', 'p3', 'p4'] }],
    // אף אחד לא יכול להיות הגמד של p4
    [{ id: '1', type: 'forbid', a: 'p0', list: ['p4'] }, { id: '2', type: 'forbid', a: 'p1', list: ['p4'] },
     { id: '3', type: 'forbid', a: 'p2', list: ['p4'] }, { id: '4', type: 'forbid', a: 'p3', list: ['p4'] }],
  ];
  for (const cs of cases) {
    const check = checkConstraints(people, cs);
    assert.equal(check.canDraw, false, JSON.stringify(cs));
    assert.ok(check.problems.length > 0);
    assert.equal(draw(people, cs).ok, false);
  }
  // התנגשות "עמוקה" שרק חיפוש מלא מגלה: p0→p1 ו-p2→p3 חובה, ול-p1 אסור p2.
  // ל-p1 נשארו p0 (זוג הדדי) או p3 (כבר תפוס) → אין פתרון.
  const four = mkPeople(4);
  const deep = [
    { id: 'm1', type: 'must', a: 'p0', b: 'p1' },
    { id: 'm2', type: 'must', a: 'p2', b: 'p3' },
    { id: 'f', type: 'forbid', a: 'p1', list: ['p2'] },
  ];
  const check = checkConstraints(four, deep);
  assert.equal(check.canDraw, false);
  assert.ok(check.problems.join(' ').includes('מספיק להוריד'), check.problems.join(' '));
  assert.equal(draw(four, deep).ok, false);
  assert.equal(checkConstraints(mkPeople(2), []).canDraw, false);
});

test('validate catches mutual pairs and broken constraints', () => {
  const people = mkPeople(4);
  assert.ok(validate(people, [], { p0: 'p1', p1: 'p0', p2: 'p3', p3: 'p2' }).some((e) => e.includes('אחד של השני')));
  assert.ok(validate(people, [], { p0: 'p1', p1: 'p2', p2: 'p0' }).length > 0);
  assert.ok(validate(people, [{ type: 'must', a: 'p0', b: 'p2' }], { p0: 'p1', p1: 'p2', p2: 'p3', p3: 'p0' }).length > 0);
});

test('codes are unique 5-digit numbers and avoid existing ones', () => {
  for (let i = 0; i < 50; i++) {
    const existing = makeCodes(20);
    const codes = makeCodes(15, existing);
    assert.equal(new Set([...codes, ...existing]).size, 35);
    for (const c of codes) assert.match(c, /^[1-9]\d{4}$/);
  }
});
