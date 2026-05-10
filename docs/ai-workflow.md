# AI Workflow

How AI tools are wired up for this repo, why each piece exists, and how to use them. Read this first when starting a new Claude Code session, or when picking up Livong from a different machine / phone.

## The stack

| Tool | Role | When to use |
|---|---|---|
| **Claude Code** (CLI) | Primary coding driver — multi-file edits, runs commands, follows project rules | Anything bigger than a single line |
| **Claude Code on web** (claude.ai/code) | Same brain, runs in cloud, opens GitHub PRs | From phone, tablet, or anywhere without your Mac |
| **GitHub Copilot Pro** | Inline autocomplete in VS Code | While typing — finishes the current line |
| **ChatGPT** | Brainstorming, PRD writing, debugging chat | Off-codebase thinking |
| ~~Ollama (local LLM)~~ | Tested 2026-05-10, removed. 24 GB Mac couldn't run useful sizes fast enough for agentic flow. Don't reinstall unless on a beefier machine. |

## Files in this repo that AI tools read

| File | Read by | Purpose |
|---|---|---|
| `CLAUDE.md` | Claude Code (CLI + web) | Entry point — points at `.cursorrules` + summarizes layout |
| `.cursorrules` | Cursor, others | Hard constraints + code skeletons + decision tree |
| `.clinerules` | Cline (VS Code agentic) | Same content, kept in sync |
| `.windsurfrules` | Windsurf | Same content, kept in sync |
| `apps/web/CLAUDE.md` → `AGENTS.md` | Claude Code in `apps/web` | Next.js version-specific note |
| `.claude/settings.json` | Claude Code | Permissions allowlist (no prompts for `pnpm`, `go`, `./livong`, `git` reads) and denylist (blocks `git push`, `rm -rf`, `git reset --hard`) |
| `.claude/commands/*.md` | Claude Code | Slash commands |

**When you change `.cursorrules`, sync the other two:**
```bash
cp .cursorrules .clinerules
cp .cursorrules .windsurfrules
```

## Slash commands

Run these inside a Claude Code session in this repo:

| Command | What it does |
|---|---|
| `/start` | Boots backend + web via `./livong start`, handles port conflicts |
| `/status` | Shows what's running, git state, port issues, recent commits |
| `/theme-check [path]` | Audits theme-token violations (defaults to `apps/web/src`) |
| `/new-handler <name>` | Scaffolds a new Go feature following the handler skeleton |

## Phone workflow (claude.ai/code)

1. Open **claude.ai/code** on phone
2. Sign in with your Anthropic account
3. Pick the **Livong** GitHub repo
4. Describe a small change, e.g. "fix the typo on the login page"
5. It creates a branch + PR
6. Open **GitHub mobile app** → review → tap Merge
7. When back at your Mac: `git pull && ./livong start`

**Works because** the repo's `CLAUDE.md` and `.cursorrules` are read by claude.ai/code automatically — same rules, same patterns.

**Limits:**
- Can't run the app from phone (no deploy yet)
- Best for small edits — typing long prompts on phone is painful
- First-time GitHub OAuth setup is annoying

## Permissions model

`.claude/settings.json` controls what Claude Code can run without asking:

**Auto-allowed** (no prompt): `pnpm`, `go`, `./livong`, `git status/diff/log/branch/show/add/commit/checkout/stash/pull/fetch`, `gh pr/issue`, `psql`, `docker compose`, file reads/writes/edits in this repo.

**Always denied** (Claude can't run even with prompt): `git push`, `git reset --hard`, `rm -rf`. If you want to do these, run them yourself in your terminal.

This is intentional safety — push is a deploy-ish action you should always do consciously.

## Hard constraints (also in `.cursorrules`)

- No new dependencies without approval
- No ORMs, no UI libs, no state libs, no icon libs
- pnpm only
- No new top-level directories (everything under `apps/`, `docs/`, `.github/`)
- Theme tokens only in frontend (no `dark:` prefix, no hex, no `text-neutral-*` for theming)
- Backend handlers follow the skeleton in `.cursorrules`
- Update `docs/api.md` when API surface changes
- Update `docs/db-schema.md` when schema changes

## Memory (Claude Code on this Mac)

`~/.claude/projects/-Users-rohit/memory/` holds context that auto-loads in **every** Claude Code session on this Mac:

- `livong_project.md` — project overview, constraints, paths
- `user_setup.md` — hardware (M4 Pro 24 GB), tool stack
- `feedback_local_models.md` — RAM math lesson from the Ollama experiment

These persist across sessions on this Mac but **don't sync to phone or other machines**. Repo-level context (this file + `CLAUDE.md` + `.cursorrules`) is what travels.

## Exporting a chat transcript

To save or share a past Claude Code session as markdown:

```bash
./export-chat.sh                          # list all sessions on this Mac
./export-chat.sh <session-id>             # write to ./chat-<id>.md
./export-chat.sh <session-id> -           # print to stdout (for piping)
```

Useful when:
- You want to paste context from a Mac session into claude.ai/code on phone
- You want to keep a record of an important decision/discussion
- You want to share a debugging session with a teammate

## What was set up on 2026-05-10

For history — if a future session asks "what's already done":

- Created `CLAUDE.md`, `.claude/settings.json`, 4 slash commands
- Rewrote `.cursorrules` / `.clinerules` / `.windsurfrules` with concrete code skeletons + decision tree
- Fixed prod CSP hardcoded `localhost:8080` → uses `NEXT_PUBLIC_API_URL`
- Added LAN access for phone testing (CORS RFC1918 regex, hostname fallback in `lib/api.ts`)
- Added iOS safe-area insets in `AppShell.tsx`
- Annotated two safe-but-fragile SQL string-concat sites with `SAFE:` comments
- Split `apps/backend/internal/rent/handler.go` (861 lines) into 5 domain files
- Removed Ollama (didn't work well on 24 GB)
- Untracked `.DS_Store`

## Known issues / pending

- `apps/admin-backend/internal/admin/handler.go` is still 837 lines — split when next touched
- Prod CSP allows `unsafe-eval` + `unsafe-inline` — required by Next.js dev tools, tighten before real prod deploy
- CORS regex matches `http://` only — won't work with HTTPS dev tunnels (ngrok)
- Three rules files are duplicates — copy any update to all three
