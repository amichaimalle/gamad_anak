'use client';

import { useEffect, useRef, useState } from 'react';
import { DrawDreidel, DoneIcon, Icons } from './deco.js';
import { TYPES } from '../lib/draw.js';

const MAX = 35;

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

export function inviteMessage(name, code, link) {
  return `היי ${name}! חנוכה שמח
מתחילים את משחק הגמד ענק של משפחת מלא-מלאך-מלמד.
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

const srOnly = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' };

export default function AdminScreen({ adminCode, onExit }) {
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [addingConstraint, setAddingConstraint] = useState(false);
  const [dialog, setDialog] = useState(null); // 'reset' | 'redraw'

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

  const saveSetup = async (people, constraints) => {
    const prev = game;
    setGame({ ...game, people, constraints });
    setError('');
    try {
      setGame(await api('PUT', { people: people.map(({ id, name }) => ({ id, name })), constraints }));
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
          game={game}
          onChange={saveSetup}
          onAddConstraint={() => setAddingConstraint(true)}
          onDraw={() => action('draw')}
          busy={busy}
          error={error}
        />
      ) : (
        <Codes
          people={game.people}
          onRedraw={() => setDialog('redraw')}
          onReset={() => setDialog('reset')}
          error={error}
        />
      )}

      {addingConstraint && (
        <ConstraintSheet
          people={game.people}
          onClose={() => setAddingConstraint(false)}
          onSave={(c) => {
            saveSetup(game.people, [...game.constraints, c]);
            setAddingConstraint(false);
          }}
        />
      )}

      {dialog === 'reset' && (
        <ConfirmDialog
          tone="red"
          title="לאפס את כל המשחק?"
          text="כל השמות, האילוצים, הקודים, השידוכים וההודעות יימחקו. אי אפשר לבטל את זה, והקודים הישנים יפסיקו לעבוד."
          confirmLabel="כן, לאפס הכל"
          busyLabel="מאפסים..."
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={async () => { await action('reset'); setDialog(null); }}
        />
      )}
      {dialog === 'redraw' && (
        <ConfirmDialog
          tone="blue"
          title="הגרלה חוזרת?"
          text="השידוכים הנוכחיים יימחקו וחוזרים למסך העריכה. השמות, האילוצים, הקודים וההודעות נשמרים, אז לא צריך לשלוח קודים מחדש. אפשר לשנות אילוצים ואז ללחוץ שוב על 'מגרילים!'."
          confirmLabel="כן, להגריל מחדש"
          busyLabel="רגע..."
          busy={busy}
          onCancel={() => setDialog(null)}
          onConfirm={async () => { await action('redraw'); setDialog(null); }}
        />
      )}
    </main>
  );
}

function Name({ children }) {
  return <b className="cname">{children}</b>;
}

function ConstraintSentence({ c, nameOf }) {
  if (c.type === 'must') {
    return <><Name>{nameOf(c.a)}</Name> חייב/ת להיות הגמד של <Name>{nameOf(c.b)}</Name></>;
  }
  if (c.type === 'mutual') {
    return <><Name>{nameOf(c.a)}</Name> ו<Name>{nameOf(c.b)}</Name> לא יהיו גמדים אחד של השני</>;
  }
  return (
    <>
      ל<Name>{nameOf(c.a)}</Name> אסור להיות הגמד של{' '}
      {c.list.map((x, i) => <span key={x}>{i > 0 && ', '}<Name>{nameOf(x)}</Name></span>)}
    </>
  );
}

function Setup({ game, onChange, onAddConstraint, onDraw, busy, error }) {
  const { people, constraints, check } = game;
  const [name, setName] = useState('');
  const [localErr, setLocalErr] = useState('');
  const inputRef = useRef(null);
  const nameOf = (id) => people.find((p) => p.id === id)?.name || '?';
  const hasOldCodes = people.some((p) => p.code);

  const add = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (people.length >= MAX) { setLocalErr(`אפשר עד ${MAX} משתתפים`); return; }
    if (people.some((p) => p.name === clean)) { setLocalErr(`"${clean}" כבר ברשימה`); return; }
    setLocalErr('');
    onChange([...people, { id: newId(), name: clean }], constraints);
    setName('');
    inputRef.current?.focus();
  };

  const removePerson = (id) => {
    const cs = constraints
      .map((c) => (c.type === 'forbid' ? { ...c, list: c.list.filter((x) => x !== id) } : c))
      .filter((c) => c.a !== id && c.b !== id && (c.type !== 'forbid' || c.list.length));
    onChange(people.filter((p) => p.id !== id), cs);
  };

  const removeConstraint = (cid) => onChange(people, constraints.filter((c) => c.id !== cid));

  const shownError = localErr || error;
  const canDraw = check?.canDraw && !busy;

  return (
    <>
      {hasOldCodes && (
        <div className="col info-banner mt22">
          חזרתם לעריכה אחרי הגרלה. הקודים שכבר נשלחו נשמרים. משתתפים חדשים יקבלו קוד אחרי ההגרלה.
        </div>
      )}

      <section className="col card mt22" aria-labelledby="list-title" style={{ gap: 14 }}>
        <div className="row">
          <h2 id="list-title">רשימת המשתתפים</h2>
          <span className="tag" style={{ fontSize: 14 }}>{people.length} / {MAX}</span>
        </div>
        <form style={{ display: 'flex', gap: 8 }} onSubmit={add}>
          <label htmlFor="newName" style={srOnly}>שם משתתף חדש</label>
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
        {shownError && <p role="alert" className="alert-err" style={{ whiteSpace: 'pre-line' }}>{Icons.alert()}{shownError}</p>}
        {people.length === 0 ? (
          <div className="empty-list">
            <b>עוד אין משתתפים</b>
            <span>מוסיפים עד {MAX} שמות, ואז מגרילים.</span>
          </div>
        ) : (
          <ul className="plist">
            {people.map((p) => (
              <li key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: '4px 6px 4px 14px' }}>
                <span className="pname" style={{ flex: 1 }}>{p.name}</span>
                {p.code && <span className="small" style={{ direction: 'ltr' }}>{p.code}</span>}
                <button type="button" className="icon-btn" aria-label={`מחיקת ${p.name}`} onClick={() => removePerson(p.id)}>{Icons.trash()}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="col card mt22" aria-labelledby="cons-title" style={{ gap: 14 }}>
        <div className="row">
          <h2 id="cons-title">אילוצים</h2>
          <span className="tag" style={{ fontSize: 14 }}>{constraints.length}</span>
        </div>
        <p className="small" style={{ fontSize: 14, lineHeight: 1.5 }}>
          תמיד: אף אחד לא הגמד של עצמו, ואין שני אנשים שהם גמדים אחד של השני.
        </p>
        {constraints.length === 0 ? (
          <div className="empty-list" style={{ padding: '18px 16px' }}>
            <b>אין אילוצים</b>
            <span>ההגרלה תהיה אקראית לגמרי.</span>
          </div>
        ) : (
          <ul className="plist">
            {constraints.map((c) => (
              <li key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className={`ctag ctag-${c.type}`}>{TYPES[c.type]}</span>
                  <span className="csentence"><ConstraintSentence c={c} nameOf={nameOf} /></span>
                </div>
                <button type="button" className="icon-btn" aria-label="מחיקת אילוץ" onClick={() => removeConstraint(c.id)}>{Icons.trash()}</button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-navy" style={{ height: 52, fontSize: 18 }} onClick={onAddConstraint} disabled={people.length < 2}>
          {Icons.plus()}הוספת אילוץ
        </button>
      </section>

      <div className="col" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {check && !check.canDraw && (
          <div role="alert" className="problems">
            <b>{Icons.alert()}{people.length < 3 ? 'עוד לא אפשר להגריל' : 'יש התנגשות באילוצים'}</b>
            {check.problems.map((t, i) => <span key={i}>{t}</span>)}
          </div>
        )}
        {check?.canDraw && (
          <p role="status" className="status-ok">
            {Icons.check()}{check.warning || 'אין התנגשויות. אפשר להגריל!'}
          </p>
        )}
        <button type="button" className="btn draw-btn" onClick={onDraw} disabled={!canDraw}>
          <DrawDreidel />{busy ? 'מגרילים...' : 'מגרילים!'}
        </button>
        <p className="note-pale">אחרי ההגרלה אף אחד, גם לא המנהל, לא יכול לראות מי הגמד של מי.</p>
      </div>
    </>
  );
}

function Codes({ people, onRedraw, onReset, error }) {
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
        <button type="button" className="redraw-link" onClick={onRedraw}>{Icons.redraw()}הגרלה חוזרת</button>
        <p className="note-pale">שומר את השמות, האילוצים והקודים, ומגרילים זוגות חדשים.</p>
        <button type="button" className="reset-link" style={{ marginTop: 10 }} onClick={onReset}>{Icons.reset()}איפוס רשימה</button>
        <p className="note-pale">מוחק את כל השמות, הקודים וההודעות ומתחיל מחדש.</p>
      </div>
    </>
  );
}

const TYPE_HELP = {
  must: 'מישהו חייב להיות הגמד של מישהו מסוים',
  forbid: 'מישהו לא יכול להיות הגמד של אף אחד מרשימה',
  mutual: 'שני אנשים לא יהיו גמדים אחד של השני, לשני הכיוונים',
};

function ConstraintSheet({ people, onClose, onSave }) {
  const [type, setType] = useState('must');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [list, setList] = useState(() => new Set());
  const nameOf = (id) => people.find((p) => p.id === id)?.name || '?';
  const others = people.filter((p) => p.id !== a);

  const pickA = (id) => {
    setA(id);
    if (b === id) setB('');
    setList((s) => { const n = new Set(s); n.delete(id); return n; });
  };
  const toggle = (id) => setList((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const draft =
    type === 'forbid' ? (a && list.size ? { type, a, list: [...list] } : null)
      : (a && b ? { type, a, b } : null);

  return (
    <div className="overlay" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="sheet" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden="true" className="grabber" />
        <h2 id="sheet-title">אילוץ חדש</h2>

        <fieldset className="type-grid">
          <legend style={srOnly}>סוג האילוץ</legend>
          {Object.entries(TYPES).map(([key, label]) => (
            <label key={key} className={`type-opt${type === key ? ' on' : ''}`}>
              <input type="radio" name="ctype" value={key} checked={type === key} onChange={() => setType(key)} />
              <span className="type-label">{label}</span>
              <span className="type-help">{TYPE_HELP[key]}</span>
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="ca">{type === 'mutual' ? 'אדם ראשון' : 'מי הגמד'}</label>
          <select id="ca" className="select" value={a} onChange={(e) => pickA(e.target.value)}>
            <option value="">בחרו שם</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {type !== 'forbid' ? (
          <div className="field">
            <label htmlFor="cb">{type === 'must' ? 'חייב/ת להיות הגמד של' : 'אדם שני'}</label>
            <select id="cb" className="select" value={b} onChange={(e) => setB(e.target.value)} disabled={!a}>
              <option value="">בחרו שם</option>
              {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ) : (
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: 8 }} disabled={!a}>
            <legend className="field-legend">אסור להיות הגמד של (אפשר כמה)</legend>
            {!a && <p className="small">קודם בוחרים מי הגמד.</p>}
            {a && others.map((o) => (
              <label key={o.id} className={`check-row${list.has(o.id) ? ' on' : ''}`}>
                <input type="checkbox" checked={list.has(o.id)} onChange={() => toggle(o.id)} />
                <span style={{ flex: 1 }}>{o.name}</span>
              </label>
            ))}
          </fieldset>
        )}

        {draft && (
          <div className="preview-sentence">
            <ConstraintSentence c={draft} nameOf={nameOf} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={!draft} onClick={() => onSave({ id: newId(), ...draft })}>הוספה</button>
          <button type="button" className="btn btn-ghost" style={{ flex: '0 0 110px' }} onClick={onClose}>ביטול</button>
        </div>
      </section>
    </div>
  );
}

function ConfirmDialog({ tone, title, text, confirmLabel, busyLabel, busy, onCancel, onConfirm }) {
  const red = tone === 'red';
  return (
    <div className="overlay center">
      <section role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-desc" className="dialog">
        <div className="warn-icon" style={red ? undefined : { background: '#DCEBFF' }}>{red ? Icons.warn() : Icons.redrawBig()}</div>
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-desc">{text}</p>
        <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className={`btn ${red ? 'btn-red' : ''}`} onClick={onConfirm} disabled={busy}>{busy ? busyLabel : confirmLabel}</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>ביטול</button>
        </div>
      </section>
    </div>
  );
}
