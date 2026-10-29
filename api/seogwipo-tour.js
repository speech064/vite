// Vercel 서버리스 함수: GET /api/seogwipo-tour
import { handleSeogwipo } from '../server/seogwipo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const out = await handleSeogwipo(req.query, process.env.ODCLOUD_API_KEY, process.env.SEOGWIPO_API_URL);
  res.setHeader('Cache-Control', out.cache || 'no-store');
  return res.status(out.status).json(out.body);
}
