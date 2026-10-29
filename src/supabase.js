import { createClient } from '@supabase/supabase-js';

// VITE_ 로 시작하는 값은 브라우저에 공개돼요. Supabase 의 공개(anon / publishable) 키는 공개해도 되도록 만들어진 키이고,
// 실제 보호는 supabase/schema.sql 의 RLS(행 단위 보안) 정책이 해 줘요.
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 대시보드에서 "https://xxxx.supabase.co/rest/v1/" 처럼 뒤에 경로가 붙은 주소를 복사해도 동작하도록 주소만 남겨요.
let url = '';
try { url = rawUrl ? new URL(rawUrl).origin : ''; } catch { url = ''; }

export const hasSupabase = Boolean(url && key);
export const supabase = hasSupabase ? createClient(url, key) : null;
