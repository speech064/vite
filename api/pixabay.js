// Vercel 서버리스 함수: GET /api/pixabay?q=...&page=1&per_page=12
import { handlePixabay } from '../server/pixabay.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const out = await handlePixabay(req.query, process.env.PIXABAY_API_KEY);
  res.setHeader('Cache-Control', out.cache || 'no-store');
  return res.status(out.status).json(out.body);
}
