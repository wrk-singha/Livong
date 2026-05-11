# Livong — Production Deploy Runbook

Solo-founder, India-based, Pro/Max budget. One sitting, copy-pasteable, cheapest path that scales reasonably.

---

## TL;DR — what the stack looks like in production

```
                  ┌──────────────────┐
   app.livong  ─► │ Vercel (apps/web)│ ─► api.livong.app  ─► Fly.io machine (apps/backend)         ─┐
                  └──────────────────┘                                                              │
                                                                                                    ├─► Neon Postgres (single DB, two schemas / two roles)
 admin.livong  ─► ┌────────────────────┐                                                            │
                  │ Vercel (apps/admin)│ ─► admin-api.livong.app ─► Fly.io machine (apps/admin-backend) ─┘
                  └────────────────────┘
```

**If you only do steps 1–7, you're live** at a temporary `*.vercel.app` + `*.fly.dev` URL with HTTPS, a managed DB, and code shipping on every push to `main`. Steps 8–10 add your custom domain and SSL. Steps 11–13 (Sentry, analytics, object storage) are nice-to-have polish and can wait a week. Step 14 (rollback) and step 15 (ongoing workflow) are reference material — read once, use forever.

**Total free-tier cost: $0/month** until ~100k page views or ~1 GB DB. Realistic first paid bill once you have traction: **~$5–15/month** (Fly hobby plan covers two backends; everything else stays free).

**Time to first deploy:** ~90 minutes if you have no accounts yet, ~30 minutes if you do.

---

## Stack rationale (read once, then skip)

| Concern | Pick | Why (and what I rejected) |
|---|---|---|
| Web (`apps/web`, `apps/admin`) | **Vercel** free tier | Native Next.js 16 support, edge CDN, push-to-deploy, generous free tier (100 GB bandwidth/mo). Zero config since `apps/web/next.config.ts` already sets `output: "standalone"`. |
| Backend (`apps/backend`, `apps/admin-backend`) | **Fly.io** | Two reasons over Railway: (1) Fly's free allowance + $5 hobby plan covers two tiny `shared-cpu-1x` machines comfortably; Railway's free tier evaporated and now starts at $5/mo per service. (2) Fly lets you pick a Mumbai/Singapore region (`bom`/`sin`) so India users get sub-100ms latency — Railway's regions are US/EU only, which is brutal for an India-first app. Fly's CLI is uglier but you'll touch it twice a month. |
| Database | **Neon** Postgres | Free tier: 0.5 GB storage, branching (great for migration testing), auto-suspend (saves money). Built-in `pgcrypto` so `gen_random_uuid()` in `migrations.go` works out of the box. Supabase is also fine but bundles auth/storage you don't need; Neon stays out of your way. |
| Domain | **Cloudflare Registrar** | At-cost pricing, no markup, free WHOIS privacy, free DNS. Don't use GoDaddy. (Porkbun is a fine alt if Cloudflare doesn't have your TLD.) |
| Error tracking | **Sentry** free tier | 5k errors/mo, 10k performance events. SDKs for Go (Gin) and Next.js. |
| Analytics | **PostHog Cloud** free tier | 1M events/mo, includes session replay, feature flags, funnels. Plausible is simpler but $9/mo minimum and no funnels — for a marketplace product you'll want funnels. PostHog also self-hosts later if you outgrow free. |
| Image storage | Keep `apps/backend/uploads/` for now; **Cloudflare R2** when you outgrow the Fly volume | Fly persistent volumes work fine for <10 GB. R2 is free egress + 10 GB free, S3-compatible. Migration is a 1-day task — flagged at step 13 below. |
| Backups | Included with Neon (point-in-time restore on free tier, 7 days history). |

---

## Step 0 — Pre-flight checklist (5 min)

**Why:** make sure your local repo can produce a clean prod build before you point anything at it.

```bash
cd ~/Code/Livong

# 1. Clean working tree
git status
git pull origin main

# 2. Make sure both backends build
cd apps/backend && go build ./... && cd -
cd apps/admin-backend && go build ./... && cd -

# 3. Make sure both Next.js apps build
cd apps/web && pnpm install && pnpm build && cd -
cd apps/admin && pnpm install && pnpm build && cd -

# 4. Run tests
./livong test
```

If any of those fail, **stop**. Fix locally before going further. Production is not the place to debug a missing dep.

**Verify:** all four builds finish with no errors. `apps/web/.next/standalone/server.js` exists.

---

## Step 1 — Create accounts (15 min, $0)

**Why:** you need these before anything else can happen. Create them in order; some link to the next.

1. **GitHub** (you already have one — confirm `~/Code/Livong` is pushed to a repo on `github.com/<you>/livong`).
2. **Vercel** — sign in with GitHub. https://vercel.com/signup
3. **Fly.io** — https://fly.io/app/sign-up. Add a card (required even on free tier — it's a fraud-prevention thing, not a charge).
4. **Neon** — sign in with GitHub. https://console.neon.tech/signup
5. **Cloudflare** — https://dash.cloudflare.com/sign-up
6. **Sentry** (later, step 11) — https://sentry.io/signup/
7. **PostHog** (later, step 12) — https://app.posthog.com/signup

**Verify:** you can log into all four (Vercel, Fly, Neon, Cloudflare) on the web. Don't connect billing yet on Fly beyond the card on file.

---

## Step 2 — Push the repo to GitHub (5 min, $0)

**Why:** Vercel and Fly both deploy by reading from a GitHub repo. The repo must be on GitHub (not just local).

```bash
cd ~/Code/Livong

# Skip if you already have a remote
git remote -v
# If empty:
git remote add origin git@github.com:<you>/livong.git
git push -u origin main
```

**Verify:** open `https://github.com/<you>/livong` in a browser. You see all four `apps/`.

---

## Step 3 — Provision the database on Neon (10 min, $0)

**Why:** the backend runs migrations on boot. The DB must exist and be reachable before the backend starts.

1. Go to https://console.neon.tech.
2. Click **New Project**.
   - Name: `livong-prod`
   - Postgres version: **16** (latest)
   - Region: **AWS Singapore (ap-southeast-1)** — closest to India that Neon offers
3. Once created, you land on the project dashboard. Click **Connection Details** (top-right).
4. Copy the **Pooled connection** string. It looks like:
   ```
   postgres://livong-prod_owner:xxx@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/livong-prod?sslmode=require
   ```
5. **Save this somewhere** (1Password / Bitwarden). You'll paste it into Fly twice.
6. (Optional) Enable **Auto-suspend** under Settings → it's on by default; leaves the DB cold when no connections, saves compute hours.

**Verify:** from your laptop, test the connection works:
```bash
psql "postgres://livong-prod_owner:xxx@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/livong-prod?sslmode=require" -c "SELECT version();"
```
You should see `PostgreSQL 16.x ... on x86_64-pc-linux-gnu`.

**Cost:** Free tier. 0.5 GB storage, 190 compute-hours/mo (auto-suspend means a low-traffic app uses ~30 hrs/mo).

**Important:** the existing `apps/backend/internal/database/migrations.go` uses `gen_random_uuid()` — Neon ships `pgcrypto` enabled so this just works. If you ever see `function gen_random_uuid does not exist`, run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` once.

---

## Step 4 — Deploy the main backend to Fly.io (20 min, $0 → $0–5/mo)

**Why:** the backend has to be live before either Next.js app can talk to it.

### 4.1 — Install the Fly CLI

```bash
brew install flyctl
fly auth login   # opens browser
```

### 4.2 — Initialise Fly app from `apps/backend`

```bash
cd ~/Code/Livong/apps/backend
fly launch --no-deploy
```

When prompted:
- **App name:** `livong-api` (or whatever — must be globally unique, becomes `livong-api.fly.dev`)
- **Region:** `bom` (Mumbai). If `bom` is unavailable that day, fall back to `sin` (Singapore).
- **Postgres?** **No** (you're using Neon).
- **Redis?** No.
- **Deploy now?** **No** — we need to set secrets first.

This creates `apps/backend/fly.toml`. Open it and confirm:
```toml
app = "livong-api"
primary_region = "bom"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0   # bump to 1 once you have traffic and don't want cold starts
```

### 4.3 — Set production secrets

```bash
# Generate a strong JWT secret
openssl rand -hex 64
# Copy the output, then:

cd ~/Code/Livong/apps/backend
fly secrets set \
  DATABASE_URL="postgres://livong-prod_owner:xxx@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/livong-prod?sslmode=require" \
  JWT_SECRET="<paste the openssl output>" \
  OTP_EXPIRY_MINUTES="5" \
  APP_ENV="production"
```

**Required env vars on Fly (`livong-api` app):**

| Var | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled URL from step 3 | Must include `?sslmode=require` |
| `JWT_SECRET` | 64-char hex from `openssl rand -hex 64` | Never commit this; rotating it logs everyone out |
| `OTP_EXPIRY_MINUTES` | `5` | Matches `.env.example` |
| `APP_ENV` | `production` | This is the kill-switch that prevents `LIVONG_DEV_LOGIN` from ever activating in prod (see `apps/backend/main.go` line 51) |
| `PORT` | (do not set) | Fly injects this automatically; the code defaults to 8080 |

**Do NOT set:** `LIVONG_DEV_LOGIN`, `NODE_ENV`. Either of those plus `LIVONG_DEV_LOGIN=1` would crash the app at startup, but it's clearer to just leave them unset.

### 4.4 — Deploy

```bash
cd ~/Code/Livong/apps/backend
fly deploy
```

Fly builds the existing `Dockerfile` (Go 1.26, alpine, ~15 MB image) and ships it. Takes ~3 min the first time.

**Verify:**
```bash
curl https://livong-api.fly.dev/auth/login -X POST -H "content-type: application/json" -d '{"phone":"+919999999999"}'
# Expect a 200 with {"message":"OTP sent"} or similar — NOT a connection error or 500.

fly logs -a livong-api
# You should see "Server starting on :8080" and migration log lines.
```

If migrations error, go check the Neon connection string. If you see `LIVONG_DEV_LOGIN must NOT be set in production`, you accidentally set both — `fly secrets unset LIVONG_DEV_LOGIN`.

**Cost:** Fly's free allowance covers one always-off `shared-cpu-1x` 256 MB machine. With `auto_stop_machines = "stop"` and `min_machines_running = 0`, the machine sleeps when idle — you pay nothing until traffic. First paid bill once you have steady traffic: **~$2/mo** for this machine.

---

## Step 5 — Deploy the admin backend to Fly.io (15 min, $0–3/mo)

**Why:** same drill as step 4. Separate Fly app so you can scale, log, and roll back independently.

### 5.1 — Add a Dockerfile to `apps/admin-backend/`

The main backend has one but the admin backend doesn't. Create `apps/admin-backend/Dockerfile` identical to `apps/backend/Dockerfile`:

```dockerfile
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8081
CMD ["./server"]
```

Commit and push:
```bash
cd ~/Code/Livong
git add apps/admin-backend/Dockerfile
git commit -m "deploy: add Dockerfile for admin-backend"
git push
```

### 5.2 — Launch the Fly app

```bash
cd ~/Code/Livong/apps/admin-backend
fly launch --no-deploy
```

- **App name:** `livong-admin-api`
- **Region:** `bom`
- **Postgres / Redis:** No

In the generated `fly.toml`, change `internal_port` to **8081**:

```toml
app = "livong-admin-api"
primary_region = "bom"

[http_service]
  internal_port = 8081
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
```

### 5.3 — Set secrets (SAME DB, SAME JWT SECRET)

The admin backend reads from the same DB as the main backend (admin operations modify the same `users`/`listings` tables). It also needs the same `JWT_SECRET` so admin tokens issued by the admin login are recognised consistently.

```bash
cd ~/Code/Livong/apps/admin-backend
fly secrets set \
  DATABASE_URL="<same Neon URL as step 4.3>" \
  JWT_SECRET="<same JWT secret as step 4.3>" \
  OTP_EXPIRY_MINUTES="5" \
  APP_ENV="production"
```

### 5.4 — Deploy

```bash
fly deploy
```

**Verify:**
```bash
curl -i https://livong-admin-api.fly.dev/auth/login -X POST -H "content-type: application/json" -d '{"phone":"+919999999999"}'
# Expect 200.

fly logs -a livong-admin-api
# "Admin server starting on :8081"
```

**Heads-up:** both backends call `database.RunMigrations(db)` at startup. They each carry their own copy under `internal/database/migrations.go`. If both deploy simultaneously and try to `CREATE TABLE IF NOT EXISTS` the same tables, Postgres handles it fine (the `IF NOT EXISTS` is the safety net), but if you ever change a schema you should deploy the main backend first, wait for it to finish, then the admin backend.

---

## Step 6 — Deploy the main web app to Vercel (10 min, $0)

**Why:** Vercel is the path of least resistance for Next.js. Push-to-deploy works out of the box.

### 6.1 — Import the project

1. https://vercel.com/new
2. Pick your `livong` GitHub repo. Click **Import**.
3. **Configure project**:
   - **Project name:** `livong-web`
   - **Framework preset:** Next.js (auto-detected)
   - **Root directory:** click **Edit** → set to `apps/web`
   - **Build command:** leave default (`next build`)
   - **Output directory:** leave default (`.next`)
   - **Install command:** `pnpm install` (Vercel auto-detects pnpm from `pnpm-lock.yaml`)

### 6.2 — Set env vars (before first deploy)

Click **Environment Variables** in the import wizard and add:

| Var | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://livong-api.fly.dev` | Production, Preview, Development |

Heads-up: this is a **build-time** variable in Next.js — it's baked into the client JS bundle. If you change it later, you must trigger a rebuild (push a commit or click **Redeploy**).

### 6.3 — Deploy

Click **Deploy**. Takes ~2 min.

**Verify:** open the `livong-web-xxx.vercel.app` URL Vercel gives you. The login page loads. Open dev tools → Network tab → submit the phone form → request goes to `https://livong-api.fly.dev/auth/login` and returns 200.

**Cost:** Free Hobby tier — 100 GB bandwidth/mo, unlimited deploys. You'll be on free tier until ~100k MAU.

---

## Step 7 — Deploy the admin web app to Vercel (10 min, $0)

**Why:** separate Vercel project = separate domain, separate analytics, separate access control.

### 7.1 — Update the admin's CSP first

The admin's `next.config.ts` currently hardcodes `http://localhost:8081` in the CSP. That will block the production admin API. Fix it:

Edit `apps/admin/next.config.ts` to read the API origin from an env var (mirroring `apps/web/next.config.ts`):

```ts
import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.16"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${apiOrigin}`,
              `connect-src 'self' ${apiOrigin}`,
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Commit and push:
```bash
cd ~/Code/Livong
git add apps/admin/next.config.ts
git commit -m "deploy: parameterise admin CSP via NEXT_PUBLIC_API_URL"
git push
```

### 7.2 — Import as a second Vercel project

1. https://vercel.com/new → pick the same `livong` repo again.
2. **Configure project**:
   - **Project name:** `livong-admin`
   - **Root directory:** `apps/admin`
   - Everything else default.
3. **Environment Variables**:

| Var | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://livong-admin-api.fly.dev` | Production, Preview, Development |

4. Click **Deploy**.

**Verify:** open `livong-admin-xxx.vercel.app`. The admin login page renders. Network panel shows requests going to `https://livong-admin-api.fly.dev`.

---

## Step 8 — Buy a domain (10 min, ~$10/year)

**Why:** `*.fly.dev` and `*.vercel.app` URLs are ugly and look like a side project. Custom domain takes 10 minutes.

1. Cloudflare → **Domain Registration** → **Register Domains**.
2. Search `livong.app` (or `.com`, `.in`, whatever). Buy it. ~$10/year for `.app`, ~$8 for `.com`.
3. Cloudflare auto-creates a DNS zone for the domain on registration. You don't need to do nameserver changes.

**Verify:** in Cloudflare → **Websites** → you see the new domain listed as "Active".

---

## Step 9 — Wire up DNS (15 min, $0)

**Why:** point your subdomains at Vercel and Fly.

You'll set up four subdomains:

| Subdomain | Points to | Used by |
|---|---|---|
| `app.livong.app` | Vercel `livong-web` | Main web app |
| `admin.livong.app` | Vercel `livong-admin` | Admin panel |
| `api.livong.app` | Fly `livong-api` | Main backend |
| `admin-api.livong.app` | Fly `livong-admin-api` | Admin backend |

(You can also point the apex `livong.app` to `livong-web` and skip `app.` if you prefer; instructions below assume the four-subdomain layout.)

### 9.1 — Add domains in Vercel

For **each** Vercel project (`livong-web`, `livong-admin`):
1. Project → **Settings** → **Domains**.
2. Add `app.livong.app` (and `admin.livong.app` for the other project).
3. Vercel shows you a CNAME target like `cname.vercel-dns.com`. Copy it.

### 9.2 — Add domains in Fly

For **each** Fly app:
```bash
cd ~/Code/Livong/apps/backend
fly certs add api.livong.app

cd ~/Code/Livong/apps/admin-backend
fly certs add admin-api.livong.app
```

Each command prints the DNS records you need to add (an A record for IPv4, AAAA for IPv6). Copy them.

### 9.3 — Add the records in Cloudflare

Cloudflare → your domain → **DNS** → **Records** → **Add record** four times:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |
| CNAME | `admin` | `cname.vercel-dns.com` | **DNS only** |
| A | `api` | `<IPv4 from fly certs add>` | **DNS only** |
| AAAA | `api` | `<IPv6 from fly certs add>` | **DNS only** |
| A | `admin-api` | `<IPv4 from fly certs add>` | **DNS only** |
| AAAA | `admin-api` | `<IPv6 from fly certs add>` | **DNS only** |

**Important: keep proxy status as DNS-only (grey cloud), not orange-cloud.** Both Vercel and Fly do their own SSL termination; Cloudflare's proxy in front of them sometimes causes cert issuance loops on first setup. You can flip Cloudflare proxy on later if you want WAF/DDoS, but get it working un-proxied first.

### 9.4 — Wait for propagation, then verify

DNS usually propagates in 1–5 minutes on Cloudflare. Check:
```bash
dig app.livong.app +short
dig api.livong.app +short
```

Should return the values you set.

In Vercel, the domain status flips to **Valid Configuration** once DNS resolves. In Fly, `fly certs show api.livong.app` shows `Status: Ready`.

---

## Step 10 — SSL + finalise URLs (10 min, $0)

**Why:** force HTTPS everywhere, then update the Vercel env vars to point at the new custom domains so the apps stop calling `*.fly.dev`.

### 10.1 — SSL is automatic — just verify

- **Vercel:** SSL is auto-provisioned by Let's Encrypt the moment DNS resolves. No action.
- **Fly:** SSL is auto-provisioned the moment `fly certs add` sees the DNS records resolve. `fly certs show api.livong.app` should show `Status: Ready`.

**Verify:** all four URLs respond on HTTPS:
```bash
curl -I https://app.livong.app
curl -I https://admin.livong.app
curl -I https://api.livong.app
curl -I https://admin-api.livong.app
```
All should return 200/301/308 with `strict-transport-security` headers.

### 10.2 — Update Vercel env vars to the custom backend domains

In **Vercel → livong-web → Settings → Environment Variables**:
- Edit `NEXT_PUBLIC_API_URL` → `https://api.livong.app`

In **Vercel → livong-admin → Settings → Environment Variables**:
- Edit `NEXT_PUBLIC_API_URL` → `https://admin-api.livong.app`

Then **Deployments → latest → ⋯ → Redeploy** for both projects. Vercel re-bakes the new value into the client JS.

### 10.3 — Add CORS for the production domains

The backend's CORS middleware is at `apps/backend/internal/middleware/`. Open it (`cors.go`) and add the production origins to the allow list. Without this, the browser will block the calls. If the current code uses a wildcard `*`, that works for now but tighten before launch:

```go
allowedOrigins := []string{
    "https://app.livong.app",
    "https://admin.livong.app",
    "http://localhost:3000",
    "http://localhost:3100",
}
```

Commit, push, redeploy:
```bash
cd ~/Code/Livong
git add apps/backend/internal/middleware/cors.go apps/admin-backend/internal/middleware/cors.go
git commit -m "deploy: allow production origins in CORS"
git push
cd apps/backend && fly deploy
cd ../admin-backend && fly deploy
```

**Verify:** open `https://app.livong.app` in a fresh browser session. Open dev tools → Network. Submit phone login. Request goes to `https://api.livong.app/auth/login`, returns 200, no CORS errors in console.

---

## Step 11 — Sentry error tracking (15 min, $0)

**Why:** the moment something breaks in prod you want to know about it without tailing `fly logs` 24/7.

### 11.1 — Backend (Go/Gin)

1. Sentry → **Create Project** → Platform: **Go** → name: `livong-backend`. Copy the DSN.
2. Add the SDK to `apps/backend/go.mod`:
   ```bash
   cd ~/Code/Livong/apps/backend
   go get github.com/getsentry/sentry-go/gin
   ```
3. Add to `apps/backend/main.go` (near the top of `main()`, before `gin.Default()`):
   ```go
   if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
       if err := sentry.Init(sentry.ClientOptions{
           Dsn:              dsn,
           Environment:      os.Getenv("APP_ENV"),
           TracesSampleRate: 0.1,
       }); err != nil {
           log.Printf("sentry init failed: %v", err)
       }
       defer sentry.Flush(2 * time.Second)
   }
   ```
   Then after `router := gin.Default()`:
   ```go
   router.Use(sentrygin.New(sentrygin.Options{Repanic: true}))
   ```
4. Repeat steps 2–3 for `apps/admin-backend/main.go`.
5. Set the secret on both Fly apps:
   ```bash
   fly secrets set SENTRY_DSN="<dsn>" -a livong-api
   fly secrets set SENTRY_DSN="<dsn>" -a livong-admin-api  # use a separate Sentry project if you want them split
   ```
6. Commit, push, `fly deploy` both.

### 11.2 — Web (Next.js)

For each web project:
```bash
cd ~/Code/Livong/apps/web
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard creates `sentry.client.config.ts`, `sentry.server.config.ts`, etc. and prompts you to log in. Then in **Vercel → Settings → Env Vars** add:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | from Sentry |
| `SENTRY_AUTH_TOKEN` | from wizard (for source map uploads) |
| `SENTRY_ORG` | from wizard |
| `SENTRY_PROJECT` | `livong-web` (or `livong-admin`) |

Repeat for `apps/admin/`.

**Verify:** trigger a fake error from each app (e.g. throw in a button handler), redeploy, click the button → Sentry → Issues shows it within ~30s.

**Cost:** Free tier: 5k errors + 10k performance traces/month. Upgrade is $26/mo if you exceed (you won't for a while).

---

## Step 12 — PostHog analytics (10 min, $0)

**Why:** funnels, retention, session replay, feature flags — all on free tier.

1. PostHog → **Create project** → name `livong`. Copy the project API key (`phc_xxx`) and host (`https://us.i.posthog.com` or `https://eu.i.posthog.com`; pick **EU** if your users are in India for data-residency reasons — closer + GDPR-friendly).
2. For each web project:
   ```bash
   cd ~/Code/Livong/apps/web
   pnpm add posthog-js
   ```
3. Add a `PostHogProvider` in `apps/web/src/app/layout.tsx` (PostHog has a copy-pasteable Next.js 15+ snippet in their docs; works for 16). Wrap the body.
4. **Vercel → Settings → Env Vars** for both web projects:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_xxx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` |

5. Push, redeploy.

**Verify:** open `https://app.livong.app`. PostHog → Activity → Live events shows your pageview within ~10s.

**Cost:** Free up to 1M events/mo. Realistic burn for an India-targeted marketplace at 10k MAU: well under that.

---

## Step 13 — Image storage upgrade path (note for later, $0 today)

**Why:** today the backend stores uploaded images in `apps/backend/uploads/avatars/` and serves them via `router.Static("/uploads", "./uploads")`. On Fly, the container's filesystem is **ephemeral** — every deploy wipes it. So out of the box, every uploaded image disappears on the next deploy.

### Today (free, hacky):

Attach a Fly persistent volume to `livong-api`:
```bash
fly volumes create livong_uploads --region bom --size 1 -a livong-api
```

Then in `apps/backend/fly.toml` add:
```toml
[mounts]
  source = "livong_uploads"
  destination = "/app/uploads"
```

Redeploy. Volume is now mounted; uploads persist across deploys. Free tier includes 3 GB volumes total.

**Limit:** Fly volumes are pinned to one machine in one region. If you ever scale to multiple machines, multi-region, or you fill the 3 GB free quota, you have to migrate.

### Tomorrow (when you have >100 active uploaders):

Migrate to **Cloudflare R2**:
- 10 GB storage free, $0 egress (huge win over S3 for a media-heavy app)
- S3-compatible API → Go has good libraries (`aws-sdk-go-v2`)
- Cost beyond free: $0.015/GB/mo storage, still no egress

Migration is roughly: add `R2_ACCESS_KEY` / `R2_SECRET` / `R2_BUCKET` secrets, swap the upload handler in `apps/backend/internal/user/handler.go` (and `listing/handler.go`) from `os.WriteFile` to `s3.PutObject`, return the public R2 URL instead of `/uploads/...`. ~1 day of work.

---

## Step 14 — First deploy verification checklist

**Why:** sign-off ritual. Run every check below before you tweet about launch.

| # | What | How | Expected |
|---|---|---|---|
| 1 | Web app loads | `curl -I https://app.livong.app` | `200 OK`, HTTPS |
| 2 | Admin loads | `curl -I https://admin.livong.app` | `200 OK` |
| 3 | API responds | `curl -I https://api.livong.app/auth/login -X POST -d '{}' -H 'content-type: application/json'` | `400` (missing field) — confirms reachable + handler ran |
| 4 | Admin API responds | Same against `https://admin-api.livong.app` | `400` |
| 5 | DB connected | `fly logs -a livong-api` | "Server starting on :8080", no migration errors |
| 6 | Login flow | Open `app.livong.app` in browser, complete phone+OTP | Lands on profile page |
| 7 | Dev-login is OFF | `curl -X POST https://api.livong.app/auth/_dev-login` | `404` — proves prod gating works |
| 8 | CSP headers present | `curl -I https://app.livong.app \| grep -i content-security` | Header present, no `unsafe-eval` for prod |
| 9 | Sentry catches errors | Trigger a deliberate error from web | Appears in Sentry within 60s |
| 10 | PostHog tracks pageviews | Visit `app.livong.app` | Live event visible in PostHog |
| 11 | DB backups exist | Neon → Branches | Restore points listed for last 7 days |
| 12 | All env secrets set | `fly secrets list -a livong-api` and `-a livong-admin-api` | `DATABASE_URL`, `JWT_SECRET`, `OTP_EXPIRY_MINUTES`, `APP_ENV`, `SENTRY_DSN` all listed |

If all twelve pass, you're live. Tweet.

---

## Step 15 — Rollback procedure

**Why:** something will break. You need a one-minute rollback, not a 30-minute panic.

### Vercel rollback (web / admin)

1. Vercel → project → **Deployments** tab.
2. Find the last known-good deploy (green check, before the bad one).
3. Click **⋯** → **Promote to Production**.

Done. Takes ~10s — Vercel keeps every old build hot.

### Fly rollback (backend / admin-backend)

```bash
# List recent releases
fly releases -a livong-api

# Roll back to the previous release (e.g. v23 was good, v24 is bad)
fly releases rollback v23 -a livong-api
```

Takes ~30s. Works for the admin backend too with `-a livong-admin-api`.

### Database rollback

If a bad migration ran:
1. Neon → your project → **Branches** → **Restore**.
2. Pick a point-in-time before the bad deploy. Free tier has 7 days of history.
3. Either restore in place (destroys data added after that point — only if you're sure) or **create a new branch** from that point, point Fly at the new branch's connection string, and verify before swapping.

**Critical:** the migrations in `internal/database/migrations.go` are forward-only and use `IF NOT EXISTS`. There's no "migration down". If you ever drop a column or change a type, you must write the rollback SQL by hand and have it ready before deploying. This is a known limitation — accept it now and don't write destructive migrations without a plan.

---

## Step 16 — Ongoing-deploy workflow (push to main = deploy)

**Why:** this is the steady state. Set it up once, then every commit ships.

### Vercel: already done

Both Vercel projects are configured to auto-deploy on push to `main`. Pull requests get preview URLs. No further config needed.

### Fly: add a GitHub Actions workflow

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Fly Deploy

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'apps/admin-backend/**'
      - '.github/workflows/fly-deploy.yml'

jobs:
  deploy-api:
    if: contains(toJson(github.event.commits.*.modified), 'apps/backend/')
    runs-on: ubuntu-latest
    concurrency: deploy-api
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config apps/backend/fly.toml
        working-directory: apps/backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-admin-api:
    if: contains(toJson(github.event.commits.*.modified), 'apps/admin-backend/')
    runs-on: ubuntu-latest
    concurrency: deploy-admin-api
    needs: deploy-api  # admin-backend deploys after main, since they share the DB
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config apps/admin-backend/fly.toml
        working-directory: apps/admin-backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Generate a Fly deploy token and add it to GitHub:
```bash
fly tokens create deploy -x 8760h   # 1 year
# Copy the output (starts with FlyV1)
```

GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
- Name: `FLY_API_TOKEN`
- Value: paste the token

Commit, push:
```bash
cd ~/Code/Livong
git add .github/workflows/fly-deploy.yml
git commit -m "ci: deploy backends to Fly on push to main"
git push
```

**Verify:** make a tiny change in `apps/backend/main.go` (e.g. add a comment), push. GitHub → Actions tab shows the workflow running. ~2 min later, `fly releases -a livong-api` shows a new version.

### Daily flow from here

```
1. Edit code locally in ~/Code/Livong
2. ./livong test
3. git commit -am "feat: thing"
4. git push origin main
5. Watch GitHub Actions + Vercel dashboard. Live in ~3 min.
6. Smoke-test the verification curls from step 14.
```

For risky changes, push to a feature branch first → open a PR → Vercel auto-deploys a preview at `livong-web-git-<branch>.vercel.app`. Validate there before merging to `main`.

---

## Appendix A — Cost summary

| Service | Free tier | First paid bill | Realistic monthly cost at 5k MAU |
|---|---|---|---|
| Vercel | 100 GB bandwidth, unlimited builds | $20/mo (Pro) | $0 |
| Fly.io | ~Free for one tiny machine; pay-as-you-go beyond | ~$2/mo per machine | $5–10 (two machines + a 1 GB volume) |
| Neon | 0.5 GB DB, 190 compute-hrs | $19/mo (Launch plan) | $0 |
| Cloudflare Registrar | At-cost domain | ~$10/year | ~$0.83/mo |
| Sentry | 5k errors/mo | $26/mo (Team) | $0 |
| PostHog | 1M events/mo | $0 (still free at this scale) | $0 |
| **Total** | | | **~$6–11/mo** |

At 50k MAU you'll likely jump to ~$30/mo (Vercel Pro becomes worth it for log retention, Fly machines stay always-on). At 500k MAU, ~$150/mo. None of this requires architecture changes.

---

## Appendix B — Things this runbook intentionally skips

- **Email/SMS for OTP delivery:** the current OTP flow writes to logs / returns in dev. For production OTP delivery you'll want Twilio/MSG91 (India). Not blocking launch if you're inviting a small alpha; flag for week 2.
- **Custom log aggregation:** `fly logs` and Vercel's built-in log viewer are enough for the first 3 months. Don't pay for Datadog/Logtail until you have a real reason.
- **CI tests on PR:** worth adding a `.github/workflows/test.yml` that runs `./livong test` on PRs. 30 min of work, not blocking launch.
- **Staging environment:** use Vercel preview deploys + a Neon branch as your staging. A separate Fly app for staging is overkill at this stage.
- **Rate limiting / WAF:** turn on Cloudflare proxy (orange cloud) once everything works. Free tier includes basic DDoS + bot mitigation. Do this in week 2.
- **Database connection pooling tuning:** Neon's pooled URL is pgBouncer in transaction mode. If you ever see "prepared statements not supported", switch the Go code to `sql.Open("pgx", ...)` with prepared-statement disable, or use the unpooled URL for the migration step. Not a launch-day issue.
