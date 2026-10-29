-- ============================================================
-- 제주의 얼굴들 · Supabase 스키마
-- Supabase 대시보드 → SQL Editor → New query 에 이 파일 전체를 붙여 넣고 Run 하세요.
-- 여러 번 실행해도 안전해요(이미 있으면 건너뛰고, 정책은 다시 만들어요).
-- ============================================================

-- 1) 내 보관함: 마음에 드는 사진을 저장 (본인 것만 보고, 넣고, 지울 수 있어요)
create table if not exists public.favorites (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  photo_id    bigint not null,
  preview     text   not null,
  large       text   not null,
  tags        text,
  photographer text,
  source_url  text,
  created_at  timestamptz not null default now(),
  unique (user_id, photo_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = user_id);

-- 2) 한 줄 이야기: 제주 IP마다 남기는 짧은 글 (누구나 읽고, 로그인한 사람만 쓰고, 내 글만 지워요)
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  icon_id     text   not null check (char_length(icon_id) between 1 and 40),
  user_id     uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  nickname    text   not null check (char_length(nickname) between 1 and 20),
  body        text   not null check (char_length(body) between 1 and 200),
  created_at  timestamptz not null default now()
);

create index if not exists comments_icon_created_idx on public.comments (icon_id, created_at desc);

alter table public.comments enable row level security;

drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- 끝! 아래 쿼리로 확인해 보세요 (두 테이블이 보이면 성공)
-- select table_name from information_schema.tables where table_schema = 'public' and table_name in ('favorites','comments');
