# 🔥 Roast My Life — Deploy Guide

## Your file structure
```
roastmylife/
├── api/
│   ├── roast.js              ← Anthropic API proxy (keeps your key secret)
│   ├── create-checkout.js    ← Creates Stripe payment link
│   └── verify-session.js     ← Confirms payment after redirect
├── src/
│   └── App.jsx               ← Full frontend app
├── package.json
└── index.html                ← (create this — see below)
```

---

## Step 1: Create index.html

Create a file called `index.html` in the root folder:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Roast My Life 🔥</title>
    <meta name="description" content="AI roasts your life choices. Then saves you from yourself." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Then create `src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

---

## Step 2: Set up Stripe (10 minutes)

1. Go to https://stripe.com and create a free account
2. In your Stripe dashboard → **Products** → **Add product**
   - Name: "Roast My Life — Unlimited"
   - Price: $4.99/month recurring
3. Copy the **Price ID** (looks like `price_1ABC...`)
4. Go to **Developers → API keys** and copy your **Secret key** (starts with `sk_live_...`)

---

## Step 3: Push to GitHub

```bash
# In your roastmylife folder:
git init
git add .
git commit -m "Initial commit"
```

Then go to https://github.com/new, create a repo, and follow the instructions to push.

---

## Step 4: Deploy on Vercel (5 minutes)

1. Go to https://vercel.com and sign up with GitHub
2. Click **"Add New Project"** → import your repo
3. Click **"Environment Variables"** and add these 4 variables:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (from console.anthropic.com) |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (from Stripe dashboard) |
| `STRIPE_PRICE_ID` | Your Stripe Price ID (e.g. `price_1ABC...`) |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL (e.g. `https://roastmylife.vercel.app`) |

4. Click **Deploy** — you're live in ~2 minutes 🎉

---

## Step 5: Test it end-to-end

1. Visit your live URL
2. Submit a roast — should work (free)
3. Try again — paywall should appear
4. Use Stripe's test card: `4242 4242 4242 4242`, any future date, any CVC
5. After payment you should be redirected back and unlocked

---

## How the money works

- User gets **1 free roast** (tracked in their browser)
- Second attempt → **Stripe paywall** → $4.99/month
- After payment, Stripe redirects back → app verifies → unlocks forever on that device
- You collect money in your Stripe dashboard, withdraw to bank anytime

## Your costs per roast
- Anthropic API: ~$0.02 per roast
- Vercel hosting: Free (up to 100GB bandwidth/month)
- Stripe fees: 2.9% + $0.30 per transaction

## At 100 subscribers: ~$499/month revenue, ~$18 in API costs = ~$466 profit
