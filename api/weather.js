// Vercel 서버리스 함수: GET /api/weather?nx=52&ny=38
import { handleWeather } from '../server/weather.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const out = await handleWeather(req.query, process.env.DATA_GO_KR_KEY);
  res.setHeader('Cache-Control', out.cache || 'no-store');
  return res.status(out.status).json(out.body);
}
