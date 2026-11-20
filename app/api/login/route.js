import { ADMIN_CODE, isPlayerCode } from '../../../lib/game.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { code } = await req.json().catch(() => ({}));
  const clean = String(code || '').trim();
  if (clean === ADMIN_CODE) return Response.json({ role: 'admin' });
  if (await isPlayerCode(clean)) return Response.json({ role: 'player' });
  return Response.json({ error: 'קוד לא מוכר' }, { status: 404 });
}
