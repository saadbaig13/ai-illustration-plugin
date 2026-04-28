import { getSupabase, uploadToStorage } from './_supabase.js';

const MODEL_VERSION = '2b444d0cb495a8ae5bcf222f674a3648f128580250abaad60b75304c2607d0c5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS).end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...CORS, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ error: 'REPLICATE_API_TOKEN not set on server' }));
    return;
  }

  const { prompt, user_id } = req.body;
  console.log('[generate] user_id received:', user_id);
  if (!prompt) {
    res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ error: 'prompt is required' }));
    return;
  }

  try {
    // 1. Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          prompt: 'ILLUS white background only, no background shapes or blobs, white figures with clean black outlines, black hair, red used only for small accent details, minimal line art, high contrast, ' + prompt,
          negative_prompt: 'skin tone, peach, beige, grey fill, colored clothing, speech bubbles, text, letters, symbols, colorful, photorealistic, 3d, red hair, colored hair, red figures, solid red person, pink background, blob shapes, background shapes, dark figures, black filled figures, silhouette, dark skin fill, solid black person',
          output_format: 'png',
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.detail || `Replicate error ${createRes.status}`);
    }

    let prediction = await createRes.json();

    // 2. Poll until succeeded or failed (max ~90s = 45 × 2s)
    let attempts = 0;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      if (++attempts > 45) throw new Error('Timed out waiting for prediction');
      await sleep(2000);
      const pollRes = await fetch(prediction.urls.get, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!pollRes.ok) throw new Error(`Poll error ${pollRes.status}`);
      prediction = await pollRes.json();
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Prediction failed');
    }

    let imageUrl = prediction.output[0];

    // 3. Upload to Supabase Storage
    if (user_id) {
      console.log('[generate] starting Supabase upload for user:', user_id);
      const supabase = getSupabase();
      imageUrl = await uploadToStorage(supabase, imageUrl, user_id);
      console.log('[generate] upload complete');
    }

    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ imageUrl }));

  } catch (e) {
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' })
       .end(JSON.stringify({ error: e.message }));
  }
}
