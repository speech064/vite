// Vercel 서버리스 함수: GET /api/odcloud?page=1&perPage=100
import { handleOdcloud } from '../server/odcloud.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const out = await handleOdcloud(req.query, process.env.ODCLOUD_API_KEY);
  res.setHeader('Cache-Control', out.cache || 'no-store');
  return res.status(out.status).json(out.body);
}
