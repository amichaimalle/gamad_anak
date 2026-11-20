import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw, validate, makeCodes } from '../lib/draw.js';

const mkPeople = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `אדם ${i}`, forbidden: [] }));

// בדיקה עצמאית (לא דרך validate) של כל דרישות ההגרלה
function checkAssignment(people, a) {
  const ids = people.map((p) => p.id);
  // לכל אחד יש ענק
  for (const id of ids) assert.ok(a[id] !== undefined, `${id} has no giant`);
  // לכל אחד יש גמד (בדיוק אחד)
  const receivers = ids.map((id) => a[id]);
  assert.deepEqual([...receivers].sort(), [...ids].sort(), 'every person has exactly one gamad');
  for (const p of people) {
    assert.notEqual(a[p.id], p.id, 'no self');
    assert.ok(!p.forbidden.includes(a[p.id]), 'forbidden respected');
    // אין זוג שהם גמד וענק אחד של השני
    assert.notEqual(a[a[p.id]], p.id, `mutual pair ${p.id} <-> ${a[p.id]}`);
  }
}

test('everyone gets a giant and a gamad, no mutual pairs (3..35 people, many runs)', () => {
  for (let n = 3; n <= 35; n++) {
    for (let run = 0; run < 40; run++) {
      const people = mkPeople(n);
      const r = draw(people);
      assert.ok(r.ok, `n=${n}: ${r.error}`);
      checkAssignment(people, r.assignment);
      assert.deepEqual(validate(people, r.assignment), []);
    }
  }
});

test('respects random forbidden lists', () => {
  let solved = 0;
  for (let run = 0; run < 300; run++) {
    const n = 4 + (run % 32);
    const people = mkPeople(n);
    for (const p of people) {
      for (const q of people) if (q.id !== p.id && Math.random() < 0.25) p.forbidden.push(q.id);
    }
    const r = draw(people);
    if (r.ok) { solved++; checkAssignment(people, r.assignment); }
  }
  assert.ok(solved > 250, `solved only ${solved}`);
});

test('couples who cannot get each other (family-like setup, 35 people)', () => {
  const people = mkPeople(34);
  for (let i = 0; i < 34; i += 2) {
    people[i].forbidden.push(people[i + 1].id);
    people[i + 1].forbidden.push(people[i].id);
  }
  people.push({ id: 'p34', name: 'סבא', forbidden: [] });
  for (let i = 0; i < 100; i++) {
    const r = draw(people);
    assert.ok(r.ok, r.error);
    checkAssignment(people, r.assignment);
  }
});

test('reports impossible draws instead of breaking rules', () => {
  assert.equal(draw(mkPeople(2)).ok, false); // 2 people = must be mutual
  const p = mkPeople(4);
  p[0].forbidden = ['p1', 'p2', 'p3'];
  assert.equal(draw(p).ok, false);
  // 3 people where p0 cannot get p1 and p1 cannot get p2 → only cycle p0->p2->p1->p0 ... p2 forbidden p1
  const q = mkPeople(3);
  q[0].forbidden = ['p1'];
  q[1].forbidden = ['p0'];
  assert.equal(draw(q).ok, false);
});

test('validate catches mutual pairs and missing people', () => {
  const people = mkPeople(4);
  assert.ok(validate(people, { p0: 'p1', p1: 'p0', p2: 'p3', p3: 'p2' }).some((e) => e.includes('אחד של השני')));
  assert.ok(validate(people, { p0: 'p1', p1: 'p2', p2: 'p0' }).length > 0);
});

test('codes are unique 5-digit numbers', () => {
  for (let i = 0; i < 50; i++) {
    const codes = makeCodes(35);
    assert.equal(new Set(codes).size, 35);
    for (const c of codes) assert.match(c, /^[1-9]\d{4}$/);
  }
});
