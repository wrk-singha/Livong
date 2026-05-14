# Tunnel — share your local Mac with testers

For the first 5 testers (or any time you need to share a working URL without a real deploy), use Cloudflare Quick Tunnels. Free, no account, ~10 min setup.

## One-time setup

```sh
brew install cloudflared
```

That's it. No login, no account.

## Run

```sh
./livong tunnel
```

What it does:

1. Verifies cloudflared is installed
2. Starts backend + frontend if they aren't already up
3. Opens a public tunnel for the **backend** (`localhost:6980` → `https://something.trycloudflare.com`)
4. Writes that backend URL into `apps/web/.env.local` as `NEXT_PUBLIC_API_URL`
5. Restarts the frontend so it picks up the env
6. Opens a public tunnel for the **frontend** (`localhost:6900` → `https://something-else.trycloudflare.com`)
7. Prints both URLs and blocks until you Ctrl+C

The frontend URL is what you send to testers. The backend URL is just for the frontend's API calls.

## Send to testers

Copy `docs/tester-kit.md`, paste it into WhatsApp/email, and replace the `[Insert your URL here ...]` line in **Step 1** with the frontend URL `./livong tunnel` printed.

## Caveats

- **URLs are random and change on every restart** — quick tunnels don't give you a stable subdomain. Each `./livong tunnel` run = new URL. If you want a stable URL (e.g. `tester.livong.app`), you need a Cloudflare account + named tunnel, which is a 30-min setup; not worth it for 5 friends.
- **URL dies when your Mac sleeps** or you Ctrl+C. Disable sleep (`caffeinate -d` in another terminal) for overnight tester sessions.
- **OTP doesn't actually deliver SMS** in dev. Either:
  - Watch backend logs and DM testers their OTP, or
  - Tell them to use the dev-login console snippet from `docs/tester-kit.md` Step 2 (paste it in their browser console, replace the BACKEND_URL placeholder with what `./livong tunnel` printed).
- **Ctrl+C cleanly removes the `NEXT_PUBLIC_API_URL` from `.env.local`** so your next `./livong web:dev` goes back to localhost. If the process crashes, manually clear that line.

## When to graduate

Once you have:
- Repeatable feedback you've acted on
- A custom domain ready (`livong.in` etc)
- 50+ users would be too many for "leave Mac plugged in"

…then deploy properly via `docs/deploy.md` (Vercel + Fly.io + Neon, ~3 hr).
