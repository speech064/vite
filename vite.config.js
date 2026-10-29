import { defineConfig, loadEnv } from 'vite';
import { handlePixabay } from './server/pixabay.js';
import { handleOdcloud } from './server/odcloud.js';
import { handleWeather } from './server/weather.js';
import { handleSeogwipo } from './server/seogwipo.js';

// 로컬 개발(npm run dev)에서도 /api/pixabay 가 동작하도록 Vite 개발 서버에 같은 로직을 붙여요.
// (배포 환경에서는 api/pixabay.js 가 Vercel 함수로 실행됩니다.)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');   // '' = VITE_ 접두사가 없는 변수도 읽기
  return {
    plugins: [{
      name: 'dev-pixabay-api',
      configureServer(server) {
        server.middlewares.use('/api/pixabay', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const out = await handlePixabay(Object.fromEntries(url.searchParams), env.PIXABAY_API_KEY || process.env.PIXABAY_API_KEY);
          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(out.body));
        });
        server.middlewares.use('/api/weather', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const out = await handleWeather(Object.fromEntries(url.searchParams), env.DATA_GO_KR_KEY || process.env.DATA_GO_KR_KEY);
          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(out.body));
        });
        server.middlewares.use('/api/seogwipo-tour', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const out = await handleSeogwipo(Object.fromEntries(url.searchParams), env.ODCLOUD_API_KEY || process.env.ODCLOUD_API_KEY, env.SEOGWIPO_API_URL || process.env.SEOGWIPO_API_URL);
          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(out.body));
        });
        server.middlewares.use('/api/odcloud', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const out = await handleOdcloud(Object.fromEntries(url.searchParams), env.ODCLOUD_API_KEY || process.env.ODCLOUD_API_KEY);
          res.statusCode = out.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(out.body));
        });
      }
    }]
  };
});
