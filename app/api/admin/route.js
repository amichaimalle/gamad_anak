import { ADMIN_CODE, GameError, adminView, getGame, saveSetup, runDraw, resetGame, backToSetup } from '../../../lib/game.js';

export const dynamic = 'force-dynamic';

function authorized(req) {
  return req.headers.get('x-admin-code') === ADMIN_CODE;
}

async function handle(req, fn) {
  if (!authorized(req)) return Response.json({ error: 'אין הרשאה' }, { status: 401 });
  try {
    return Response.json(adminView(await fn()));
  } catch (e) {
    if (e instanceof GameError) return Response.json({ error: e.message }, { status: 400 });
    console.error(e);
    return Response.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}

export async function GET(req) {
  return handle(req, getGame);
}

// שמירת המשתתפים והאילוצים (לפני ההגרלה)
export async function PUT(req) {
  const { people, constraints } = await req.json().catch(() => ({}));
  return handle(req, () => saveSetup(people, constraints));
}

// action: 'draw' | 'redraw' | 'reset'
export async function POST(req) {
  const { action } = await req.json().catch(() => ({}));
  return handle(req, () => {
    if (action === 'draw') return runDraw();
    if (action === 'redraw') return backToSetup();
    if (action === 'reset') return resetGame();
    throw new GameError('פעולה לא מוכרת');
  });
}
