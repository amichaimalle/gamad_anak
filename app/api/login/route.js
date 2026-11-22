import { ADMIN_CODE, playerStatus } from '../../../lib/game.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { code } = await req.json().catch(() => ({}));
  const clean = String(code || '').trim();
  if (clean === ADMIN_CODE) return Response.json({ role: 'admin' });
  const status = await playerStatus(clean);
  if (status === 'player') return Response.json({ role: 'player' });
  if (status === 'waiting') {
    return Response.json({ error: 'הקוד נכון, אבל ההגרלה עדיין בהכנה. נסו שוב עוד מעט.' }, { status: 409 });
  }
  return Response.json({ error: 'אופס! הקוד לא מוכר. בדקו שוב את ההודעה.' }, { status: 404 });
}
