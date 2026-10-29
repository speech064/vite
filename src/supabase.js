import { createClient } from '@supabase/supabase-js';

// VITE_ 로 시작하는 값은 브라우저에 공개돼요. Supabase 의 anon(공개) 키는 공개해도 되도록 만들어진 키이고,
// 실제 보호는 supabase/schema.sql 의 RLS(행 단위 보안) 정책이 해 줘요.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && key);
export const supabase = hasSupabase ? createClient(url, key) : null;
