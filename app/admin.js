'use client';

import { useEffect, useRef, useState } from 'react';
import { DrawDreidel, DoneIcon, Icons } from './deco.js';

const MAX = 35;

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

export function inviteMessage(name, code, link) {
  return `היי ${name}! חנוכה שמח
מתחילים את משחק הגמד ענק של משפחת מלא-מלמד.
הקוד האישי שלך: ${code}
נכנסים כאן: ${link}
בפנים תגלו למי אתם הגמד, ותוכלו לכתוב מה בא לכם לקבל.`;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const ok = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise((r) => setTimeout(() => r(false), 1500)),
      ]);
      if (ok) return true;
    }
  } catch {}
  // גיבוי לדפדפנים בלי clipboard API (למשל http ברשת המקומית)
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return ok;
}

export default function AdminScreen({ adminCode, onExit }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheetFor, setSheetFor] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const api = async (method, body) => {
    const res = await fetch('/api/admin', {
      method,
      headers: { 'x-admin-code': adminCode },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'שגיאה');
    return json;
  };

  useEffect(() => {
    api('GET').then(setGame).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePeople = async (people) => {
    const prev = game;
    setGame({ ...game, people });
    setError('');
    try {
      setGame(await api('PUT', { people: people.map(({ id, name, forbidden }) => ({ id, name, forbidden })) }));
    } catch (e) {
      setGame(prev);
      setError(e.message);
    }
  };

  const action = async (name) => {
    setBusy(true); setError('');
    try {
      setGame(await api('POST', { action: name }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <header className="col top-bar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="admin-pill">מנהל</span>
        <span className="hello">ניהול המשחק</span>
      </div>
      <button type="button" className="exit" onClick={onExit}>יציאה{Icons.exit()}</button>
    </header>
  );

  if (!game) {
    return <main className="screen">{header}<p className="loading" style={{ marginTop: 80 }}>{error || 'רגע...'}</p></main>;
  }

  return (
    <main className="screen">
      {header}
      {game.status === 'setup' ? (
        <Setup
          people={game.people}
          onChange={savePeople}
          onBlocked={setSheetFor}
          onDraw={() => action('draw')}
          busy={busy}
          error={error}
        />
      ) : (
        <Codes people={game.people} onReset={() => setConfirmReset(true)} error={error} />
      )}

      {sheetFor && (
        <ForbiddenSheet
          person={game.people.find((p) => p.id === sheetFor)}
          others={game.people.filter((p) => p.id !== sheetFor)}
          onClose={() => setSheetFor(null)}
          onSave={(forbidden) => {
            savePeople(game.people.map((p) => (p.id === sheetFor ? { ...p, forbidden } : p)));
            setSheetFor(null);
          }}
        />
      )}

      {confirmReset && (
        <ResetDialog
          busy={busy}
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => { await action('reset'); setConfirmReset(false); }}
        />
      )}
    </main>
  );
}

function Setup({ people, onChange, onBlocked, onDraw, busy, error }) {
  const [name, setName] = useState('');
  const [localErr, setLocalErr] = useState('');
  const inputRef = useRef(null);
  const nameOf = (id) => people.find((p) => p.id === id)?.name;

  const add = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (people.length >= MAX) { setLocalErr(`אפשר עד ${MAX} משתתפים`); return; }
    if (people.some((p) => p.name === clean)) { setLocalErr(`"${clean}" כבר ברשימה`); return; }
    setLocalErr('');
    onChange([...people, { id: newId(), name: clean, forbidden: [] }]);
    setName('');
    inputRef.current?.focus();
  };

  const remove = (id) => {
    onChange(people.filter((p) => p.id !== id).map((p) => ({ ...p, forbidden: p.forbidden.filter((f) => f !== id) })));
  };

  const shownError = localErr || error;

  return (
    <>
      <section className="col card mt22" aria-labelledby="list-title" style={{ gap: 14 }}>
        <div className="row">
          <h2 id="list-title">רשימת המשתתפים</h2>
          <span className="tag" style={{ fontSize: 14 }}>{people.length} / {MAX}</span>
        </div>
        <form style={{ display: 'flex', gap: 8 }} onSubmit={add}>
          <label htmlFor="newName" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>שם משתתף חדש</label>
          <input
            ref={inputRef}
            id="newName"
            className="name-input"
            type="text"
            placeholder="שם משתתף חדש"
            value={name}
            maxLength={40}
            enterKeyHint="done"
            onChange={(e) => { setName(e.target.value); setLocalErr(''); }}
          />
          <button type="submit" className="btn btn-navy btn-add" disabled={people.length >= MAX}>{Icons.plus()}הוספה</button>
        </form>
        {shownError && <p role="alert" className="alert-err">{Icons.alert()}{shownError}</p>}
        {people.length === 0 ? (
          <div className="empty-list">
            <b>עוד אין משתתפים</b>
            <span>מוסיפים עד {MAX} שמות, ואז מגרילים.</span>
          </div>
        ) : (
          <ul className="plist">
            {people.map((p) => (
              <li key={p.id}>
                <div className="row">
                  <span className="pname">{p.name}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button type="button" className="icon-btn" aria-label={`עריכת אסורים של ${p.name}`} onClick={() => onBlocked(p.id)}>{Icons.ban()}</button>
                    <button type="button" className="icon-btn" aria-label={`מחיקת ${p.name}`} onClick={() => remove(p.id)}>{Icons.trash()}</button>
                  </div>
                </div>
                {p.forbidden.length > 0 ? (
                  <div className="chips">
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>אסור לקבל:</span>
                    {p.forbidden.map((f) => <span key={f} className="chip">{nameOf(f)}</span>)}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>אין הגבלות</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="col" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="btn draw-btn" onClick={onDraw} disabled={busy || people.length < 3}>
          <DrawDreidel />{busy ? 'מגרילים...' : 'מגרילים!'}
        </button>
        <p className="note-pale">
          {people.length < 3 ? 'צריך לפחות 3 משתתפים כדי להגריל. ' : ''}
          אחרי ההגרלה אף אחד, גם לא המנהל, לא יכול לראות מי הגמד של מי.
        </p>
      </div>
    </>
  );
}

function Codes({ people, onReset, error }) {
  const [copied, setCopied] = useState({});
  const [link, setLink] = useState('');
  useEffect(() => { setLink(window.location.origin); }, []);

  const copy = async (p) => {
    const ok = await copyText(inviteMessage(p.name, p.code, link));
    if (ok) setCopied((c) => ({ ...c, [p.id]: true }));
    else window.prompt('העתיקו את ההודעה:', inviteMessage(p.name, p.code, link));
  };

  const sample = people[0];

  return (
    <>
      <div role="status" className="col done-banner">
        <DoneIcon />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <b>ההגרלה בוצעה!</b>
          <span>לכל {people.length} המשתתפים יש גמד וענק. אף אחד, גם לא המנהל, לא יכול לראות מי הגמד של מי.</span>
        </div>
      </div>
      <section className="col card mt22" aria-labelledby="codes-title">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 id="codes-title">קודים לשליחה</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>מעתיקים הודעה מוכנה ושולחים לכל אחד בנפרד.</p>
        </div>
        {error && <p role="alert" className="alert-err">{Icons.alert()}{error}</p>}
        <ul className="plist">
          {people.map((p) => (
            <li key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 700, overflowWrap: 'anywhere' }}>{p.name}</span>
                <span className="code-num">{p.code}</span>
              </div>
              <button type="button" className={`btn btn-navy copy-btn${copied[p.id] ? ' copied' : ''}`} onClick={() => copy(p)}>
                {copied[p.id] ? <>{Icons.check()}הועתק</> : <>{Icons.copy()}העתקת הודעה</>}
              </button>
            </li>
          ))}
        </ul>
        {sample && (
          <div className="preview-msg">
            <b>כך נראית ההודעה שמועתקת:</b>
            <p>{inviteMessage(sample.name, sample.code, link)}</p>
          </div>
        )}
      </section>
      <div className="col" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="reset-link" onClick={onReset}>{Icons.reset()}איפוס רשימה</button>
        <p className="note-pale">מוחק את כל השמות, הקודים וההודעות ומתחיל מחדש.</p>
      </div>
    </>
  );
}

function ForbiddenSheet({ person, others, onClose, onSave }) {
  const [sel, setSel] = useState(() => new Set(person?.forbidden || []));
  if (!person) return null;
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="overlay" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="sheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden="true" className="grabber" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 id="sheet-title">אסור לקבל: {person.name}</h2>
          <p className="small" style={{ fontSize: 14, lineHeight: 1.5 }}>סמנו את מי אסור לשדך ל{person.name} בהגרלה. אפשר לסמן כמה אנשים.</p>
        </div>
        {others.length === 0 ? (
          <p className="small">אין עוד משתתפים ברשימה.</p>
        ) : (
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>משתתפים אסורים ל{person.name}</legend>
            {others.map((o) => (
              <label key={o.id} className={`check-row${sel.has(o.id) ? ' on' : ''}`}>
                <input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} />
                <span style={{ flex: 1 }}>{o.name}</span>
              </label>
            ))}
          </fieldset>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => onSave([...sel])}>שמירה</button>
          <button type="button" className="btn btn-ghost" style={{ flex: '0 0 110px' }} onClick={onClose}>ביטול</button>
        </div>
      </section>
    </div>
  );
}

function ResetDialog({ busy, onCancel, onConfirm }) {
  return (
    <div className="overlay center">
      <section role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-desc" className="dialog">
        <div className="warn-icon">{Icons.warn()}</div>
        <h2 id="reset-title">לאפס את כל המשחק?</h2>
        <p id="reset-desc">כל השמות, האסורים, הקודים, השידוכים וההודעות יימחקו. אי אפשר לבטל את זה, והקודים הישנים יפסיקו לעבוד.</p>
        <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="btn btn-red" onClick={onConfirm} disabled={busy}>{busy ? 'מאפסים...' : 'כן, לאפס הכל'}</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>ביטול</button>
        </div>
      </section>
    </div>
  );
}
