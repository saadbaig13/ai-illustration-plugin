import { getSupabase } from './_supabase.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS).end();
    return;
  }

  // GET /api/history?user_id=xxx
  if (req.method === 'GET') {
    const { user_id } = req.query;
    if (!user_id) {
      res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: 'user_id is required' }));
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('history')
        .select('id, prompt, image_urls, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/history
  if (req.method === 'POST') {
    const { user_id, prompt, image_urls } = req.body;

    if (!user_id || !prompt || !image_urls) {
      res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: 'user_id, prompt, and image_urls are required' }));
      return;
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('history')
        .insert({ user_id, prompt, image_urls })
        .select('id, prompt, image_urls, created_at')
        .single();

      if (error) throw new Error(error.message);

      res.writeHead(201, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // DELETE /api/history
  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id) {
      res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: 'id is required' }));
      return;
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);

      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' })
         .end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(405, { ...CORS, 'Content-Type': 'application/json' })
     .end(JSON.stringify({ error: 'Method not allowed' }));
}
