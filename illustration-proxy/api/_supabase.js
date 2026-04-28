import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY not set');
  return createClient(url, key);
}

export async function uploadToStorage(supabase, replicateUrl, userId) {
  const imgRes = await fetch(replicateUrl);
  if (!imgRes.ok) throw new Error(`Failed to fetch image from Replicate: ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const path = `${userId}/${Date.now()}.png`;

  const { error } = await supabase.storage
    .from('illustrations')
    .upload(path, buffer, { contentType: 'image/png', upsert: false });

  if (error) throw new Error(`Storage upload error: ${error.message}`);

  const { data } = supabase.storage.from('illustrations').getPublicUrl(path);
  return data.publicUrl;
}
