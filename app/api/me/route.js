import { playerView, saveWish } from '../../../lib/game.js';

export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ error: 'קוד לא מוכר' }, { status: 404 });

export async function POST(req) {
  const { code } = await req.json().catch(() => ({}));
  const view = await playerView(code);
  return view ? Response.json(view) : notFound();
}

export async function PUT(req) {
  const { code, wish } = await req.json().catch(() => ({}));
  return (await saveWish(code, wish)) ? Response.json({ ok: true }) : notFound();
}
