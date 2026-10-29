-- ============================================================
-- 제주의 얼굴들 · 장바구니 (굿즈 데모)
-- 먼저 schema.sql 을 실행했다면, 이 파일 "전체 내용"을 SQL Editor 에 붙여 넣고 Run 하세요.
-- (파일 이름이 아니라 내용을 복사해야 해요!) 여러 번 실행해도 안전해요.
-- ============================================================

-- 1) 상품 목록: 누구나 읽기만 가능 (수정은 대시보드에서만)
create table if not exists public.products (
  id          text primary key,
  icon_id     text not null,
  name        text not null,
  description text,
  price       integer not null check (price >= 0),
  emoji       text,
  active      boolean not null default true,
  sort        integer not null default 0
);

alter table public.products enable row level security;
drop policy if exists "products_select_active" on public.products;
create policy "products_select_active" on public.products for select using (active);

-- 데모 상품 (실제 판매 상품이 아니에요. 가격은 예시예요)
insert into public.products (id, icon_id, name, description, price, emoji, sort) values
  ('dol-figure',        'dolhareubang', '돌하르방 미니 피규어',  '책상 위를 지켜 주는 작은 돌하르방',        12000, '🗿', 1),
  ('tangerine-keyring', 'tangerine',    '감귤 키링',            '가방에 달면 겨울 제주가 따라와요',          5000, '🍊', 2),
  ('hallasan-poster',   'hallasan',     '한라산 일러스트 포스터', 'A3 크기, 백록담이 그려진 포스터',          9000, '⛰️', 3),
  ('haenyeo-magnet',    'haenyeo',      '해녀 테왁 마그넷',      '냉장고에 붙이는 주황 테왁',                 6000, '🤿', 4),
  ('pony-plush',        'pony',         '제주 조랑말 인형',      '작고 튼튼한 섬의 말 인형',                 15000, '🐴', 5),
  ('stone-coaster',     'stonewall',    '현무암 돌담 코스터',    '구멍 숭숭 돌담 무늬 컵받침 2개 세트',       8000, '🧱', 6),
  ('camellia-pin',      'camellia',     '동백꽃 브로치',         '겨울에 피는 붉은 동백 브로치',              7000, '🌺', 7),
  ('canola-postcard',   'canola',       '유채꽃 엽서 세트',      '노란 봄 풍경 엽서 5장',                     4000, '🌼', 8)
on conflict (id) do update set
  icon_id = excluded.icon_id, name = excluded.name, description = excluded.description,
  price = excluded.price, emoji = excluded.emoji, sort = excluded.sort, active = true;

-- 2) 장바구니: 본인 것만 보고, 담고, 고치고, 지울 수 있어요
create table if not exists public.cart_items (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity between 1 and 20),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;
drop policy if exists "cart_select_own" on public.cart_items;
drop policy if exists "cart_insert_own" on public.cart_items;
drop policy if exists "cart_update_own" on public.cart_items;
drop policy if exists "cart_delete_own" on public.cart_items;
create policy "cart_select_own" on public.cart_items for select using (auth.uid() = user_id);
create policy "cart_insert_own" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "cart_update_own" on public.cart_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cart_delete_own" on public.cart_items for delete using (auth.uid() = user_id);

-- 끝! 확인용 쿼리 (상품 8개가 나오면 성공)
-- select id, name, price from public.products order by sort;
