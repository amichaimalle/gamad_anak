'use client';

import { useCallback, useEffect, useState } from 'react';
import { Hero, Sparkles, Dreidel, Icons } from './deco.js';
import AdminScreen from './admin.js';

const SAVED_CODE = 'gamad-code';

function readSaved() {
  try { return localStorage.getItem(SAVED_CODE) || ''; } catch { return ''; }
}
function writeSaved(code) {
  try { code ? localStorage.setItem(SAVED_CODE, code) : localStorage.removeItem(SAVED_CODE); } catch {}
}

async function login(code) {
  const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ code }) });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { role: json.role } : { error: json.error || 'אופס! הקוד לא מוכר. בדקו שוב את ההודעה.' };
}

export default function Home() {
  const [session, setSession] = useState(null); // { role, code }
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const saved = readSaved();
    if (!saved) { setBooting(false); return; }
    login(saved).then(({ role }) => {
      if (role) setSession({ role, code: saved });
      else writeSaved('');
      setBooting(false);
    }).catch(() => setBooting(false));
  }, []);

  const onLogin = (role, code) => { writeSaved(code); setSession({ role, code }); };
  const onExit = () => { writeSaved(''); setSession(null); };

  if (booting) return <main className="screen"><p className="loading">רגע...</p></main>;
  if (!session) return <LoginScreen onLogin={onLogin} />;
  if (session.role === 'admin') return <AdminScreen adminCode={session.code} onExit={onExit} />;
  return <PlayerScreen code={session.code} onExit={onExit} />;
}

function LoginScreen({ onLogin }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const UNKNOWN = 'אופס! הקוד לא מוכר. בדקו שוב את ההודעה.';

  const submit = async (e) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (!clean) { setError(UNKNOWN); return; }
    setBusy(true);
    try {
      const r = await login(clean);
      if (r.role) onLogin(r.role, clean);
      else setError(r.error);
    } catch {
      setError('אין חיבור לשרת. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <Sparkles items={[[10, 80], [86, 110, 1.3, 0.8], [6, 400, 0.9, 1.6], [90, 470, 1, 0.4], [14, 760, 1.2, 1.2]]} />
      <span className="pill-gold" style={{ position: 'relative', marginTop: 44 }}>חנוכה שמח!</span>
      <Hero />
      <div className="login-title">
        <h1>משחק הגמד ענק</h1>
        <p>של משפחת מלא-מלאך-מלמד</p>
      </div>
      <form className="col card login-card" onSubmit={submit}>
        <label htmlFor="code">הקוד האישי שלך</label>
        <input
          id="code"
          className={`code-input${error ? ' err' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="• • • • •"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
        />
        {error && (
          <p role="alert" className="alert-err">{Icons.alert()}{error}</p>
        )}
        <button className="btn" type="submit" disabled={busy} style={{ height: 58, fontSize: 21 }}>
          יאללה, נכנסים{Icons.enter()}
        </button>
      </form>
      <p className="hint">את הקוד קיבלתם בהודעה אישית מהמארגן. שומרים עליו בסוד!</p>
    </main>
  );
}

function PlayerScreen({ code, onExit }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (initial) => {
    const res = await fetch('/api/me', { method: 'POST', body: JSON.stringify({ code }) });
    if (res.status === 404) { onExit(); return; }
    const json = await res.json();
    setData(json);
    if (initial) setDraft(json.myWish);
  }, [code, onExit]);

  useEffect(() => { load(true).catch(() => setError('בעיה בטעינה, נסו לרענן.')); }, [load]);

  // רענון ההודעה מהענק כשחוזרים לאפליקציה
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load(false).catch(() => {}); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/me', { method: 'PUT', body: JSON.stringify({ code, wish: draft }) });
      if (!res.ok) throw new Error();
      setSaved(true); setDirty(false);
    } catch {
      setError('לא הצלחנו לשמור. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <main className="screen"><p className="loading">{error || 'רגע...'}</p></main>;
  const giant = data.giantName;

  return (
    <main className="screen">
      <Sparkles items={[[8, 140], [92, 420, 1, 1], [5, 760, 1, 0.5], [90, 1040, 1.2, 1.5]]} />
      <header className="col top-bar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span className="sub">גמד ענק · מלא-מלאך-מלמד</span>
          <span className="hello">שלום, {data.name}!</span>
        </div>
        <button type="button" className="exit" onClick={onExit}>יציאה{Icons.exit()}</button>
      </header>

      <section className="col giant-card">
        <div className="giant-icon"><Dreidel /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>את/ה הגמד של</span>
          <span className="giant-name">{giant}</span>
          <span style={{ fontSize: 13, color: '#3B3000' }}>קונים מתנה בסוד. ששש...</span>
        </div>
      </section>

      <section className="col card mt22" aria-labelledby="wish-in">
        <div className="row">
          <h2 id="wish-in">{Icons.gift()}הודעה מ{giant}</h2>
          <span className="tag">לקריאה בלבד</span>
        </div>
        {data.giantWish.trim() ? (
          <div className="wish-box">{data.giantWish}</div>
        ) : (
          <div className="wish-box wish-empty">
            <b>{giant} עוד לא כתב/ה כלום</b>
            <span>שווה לחזור לבדוק בקרוב.</span>
          </div>
        )}
        <div className="row">
          <p className="small">{giant} לא יודע/ת שאת/ה הגמד.</p>
          <button type="button" className="icon-btn" aria-label="רענון" onClick={() => load(false)}>{Icons.refresh()}</button>
        </div>
      </section>

      <section className="col card mt22" aria-labelledby="wish-out">
        <h2 id="wish-out">{Icons.star()}ההודעה שלך לגמד שלך</h2>
        <label htmlFor="msg" style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>
          שלחו הודעה לגמד שלכם, ספרו לו משהו מעניין: מה אתם אוהבים, מה מעניין אתכם בזמן האחרון. מותר גם להגזים.
        </label>
        <textarea
          id="msg"
          className="wish-input"
          rows={5}
          value={draft}
          placeholder="שלח הודעה לגמד שלך, ספר לו משהו מעניין..."
          onChange={(e) => { setDraft(e.target.value); setDirty(true); setSaved(false); }}
        />
        {saved && !dirty && <p role="status" className="status-ok">{Icons.check()}עודכן! הגמד שלך כבר יכול לראות.</p>}
        {error && <p role="alert" className="alert-err">{Icons.alert()}{error}</p>}
        <button type="button" className="btn" onClick={save} disabled={busy}>עדכון</button>
        <p className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icons.lock()}הגמד שלך יקרא את זה, אבל לא תדעו מי הוא.
        </p>
      </section>
    </main>
  );
}

