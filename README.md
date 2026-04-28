# AI Illustration Figma Plugin

A Figma plugin that generates on-brand illustrations from text prompts using a custom fine-tuned FLUX LoRA model. Type a description, get back illustrations that match your visual style, and place them directly onto the canvas.

---

## What's in this repo

```
/plugin       — Figma plugin (HTML, CSS, JS — no build tools)
/proxy        — Vercel serverless proxy (Node.js)
```

---

## Features

- Generate 1, 2, or 4 illustration variations from a text prompt
- Click any result to place it directly on the Figma canvas
- Remix any result with a strength slider to generate variations
- Persistent history panel that survives plugin reinstalls
- Prompt suggestions and a "Surprise me" button

---

## How it works

The plugin talks to a Vercel proxy, which calls the Replicate API to run inference on a custom fine-tuned FLUX LoRA model. Generated images are uploaded to Supabase Storage and their URLs saved to a Supabase database for permanent history.

```
Figma Plugin → Vercel Proxy → Replicate (FLUX LoRA) → Supabase Storage → Supabase DB (history)
```

---

## Stack

- **Figma Plugin**: plain HTML/CSS/JS, no framework or build step
- **Proxy**: Node.js on Vercel (serverless functions)
- **Model**: FLUX LoRA fine-tuned on Replicate
- **Database + Storage**: Supabase (free tier)

---

## Setup

### 1. Train your own model

You'll need your own fine-tuned FLUX LoRA model on Replicate trained on your illustration dataset. Update the `MODEL_VERSION` constant in `proxy/api/generate.js` with your model version string.

### 2. Set up Supabase

Create a Supabase project and run the following SQL to create the history table:

```sql
CREATE TABLE history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  prompt text NOT NULL,
  image_urls text[] NOT NULL,
  created_at timestamp DEFAULT now()
);
```

Also create a public storage bucket named `illustrations`.

### 3. Deploy the proxy

```bash
cd proxy
npx vercel
```

Add the following environment variables in your Vercel project settings:

| Variable | Description |
|---|---|
| `REPLICATE_API_TOKEN` | Your Replicate API token |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SECRET_KEY` | Your Supabase secret key |

### 4. Load the plugin in Figma

In Figma desktop, go to **Plugins → Development → Import plugin from manifest** and select `plugin/manifest.json`.

Update the `allowedDomains` in `manifest.json` to point to your deployed Vercel proxy URL.

---

## Training your own model

The model was trained using [ostris/flux-dev-lora-trainer](https://replicate.com/ostris/flux-dev-lora-trainer) on Replicate with the following settings that worked best after several attempts:

- **Steps:** 3000
- **LoRA rank:** 32
- **Learning rate:** 0.0003

Caption format that worked well:

```
TRIGGER_WORD [style description], [scene description]
```

Getting the style description precise in every caption matters more than any of the training parameters.

---

## Cost

- ~$4 per training run on Replicate
- A few cents per image generation
- Vercel and Supabase free tiers cover everything else

---

## Notes

- This repo contains no API keys. You must supply your own via Vercel environment variables.
- The style prompts and negative prompts are hardcoded in `proxy/api/generate.js` — update these to match your own illustration style.
- Replicate image URLs expire after a few hours, which is why images are immediately uploaded to Supabase Storage after generation.
