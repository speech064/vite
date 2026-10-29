// Supabase 와 주고받는 함수들 (로그인, 내 보관함, 한 줄 이야기)
import { supabase } from './supabase.js';

const must = ({ data, error }) => { if (error) throw new Error(error.message || '요청에 실패했어요.'); return data; };

// ---- 로그인 (이메일 링크) ----
export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(error.message);
}
export const signOut = () => supabase.auth.signOut();

// ---- 내 보관함 ----
export async function listFavorites() {
  const rows = must(await supabase.from('favorites').select('*').order('created_at', { ascending: false }));
  return rows.map(r => ({ id: Number(r.photo_id), preview: r.preview, large: r.large, tags: r.tags, user: r.photographer, page: r.source_url }));
}
export async function addFavorite(p) {
  must(await supabase.from('favorites').insert({ photo_id: p.id, preview: p.preview, large: p.large, tags: p.tags, photographer: p.user, source_url: p.page }));
}
export async function removeFavorite(photoId) {
  must(await supabase.from('favorites').delete().eq('photo_id', photoId));
}

// ---- 한 줄 이야기 ----
export async function listComments(iconId) {
  return must(await supabase.from('comments').select('id,user_id,nickname,body,created_at').eq('icon_id', iconId).order('created_at', { ascending: false }).limit(50));
}
export async function addComment(iconId, nickname, body) {
  must(await supabase.from('comments').insert({ icon_id: iconId, nickname, body }));
}
export async function deleteComment(id) {
  must(await supabase.from('comments').delete().eq('id', id));
}

// ---- 장바구니 (굿즈 데모) ----
export async function listProducts() {
  return must(await supabase.from('products').select('id,icon_id,name,description,price,emoji').eq('active', true).order('sort', { ascending: true }));
}
export async function listCart() {
  return must(await supabase.from('cart_items').select('id,quantity,product:products(id,name,price,emoji)').order('created_at', { ascending: true }));
}
export async function setCartQty(userId, productId, quantity) {
  must(await supabase.from('cart_items').upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: 'user_id,product_id' }));
}
export async function removeCartItem(id) {
  must(await supabase.from('cart_items').delete().eq('id', id));
}
