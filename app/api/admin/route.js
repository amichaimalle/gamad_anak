import { ADMIN_CODE, GameError, adminView, getGame, savePeople, runDraw, resetGame } from '../../../lib/game.js';

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

// שמירת רשימת המשתתפים (לפני ההגרלה)
export async function PUT(req) {
  const { people } = await req.json().catch(() => ({}));
  return handle(req, () => savePeople(people));
}

// action: 'draw' | 'reset'
export async function POST(req) {
  const { action } = await req.json().catch(() => ({}));
  return handle(req, () => {
    if (action === 'draw') return runDraw();
    if (action === 'reset') return resetGame();
    throw new GameError('פעולה לא מוכרת');
  });
}
