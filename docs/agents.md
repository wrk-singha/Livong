# The Team — Custom Subagents

Five specialized Claude Code subagents live in `.claude/agents/`. They run with their own context windows (don't pollute the main session), restricted tool permissions per role, and project-aware prompts that get sharper over time.

## Roster

| Agent | Role | Best triggers |
|---|---|---|
| `tester` | QA — runs the suite, walks pages, finds bugs. **Never edits.** | "test the app", "is it working", after non-trivial changes |
| `reviewer` | Code review — reads diffs, runs tests, checks CI. **Never edits.** | "review this", before commits/pushes |
| `devops` | Deploy, CI/CD, infra, secrets | "deploy", "set up CI", env work |
| `dba` | Schema, migrations, queries, indexes | DB work |
| `designer` | UX critique — runs Lighthouse, screenshots, gives honest feedback. **Never edits.** | "is this nice", "how does it look" |

## Where they work

| Client | Custom agents load? |
|---|---|
| Claude.app desktop | ❌ Known bug ([anthropics/claude-code#20931](https://github.com/anthropics/claude-code/issues/20931)) |
| Claude Code CLI (terminal `claude`) | ✅ |
| claude.ai/code (web, phone) | ✅ |
| VS Code extension | ❌ Same bug |

In environments where they don't load, fall back to the built-in `general-purpose` agent with a focused prompt that mimics the role — this preserves the "isolated context window" benefit even without the named-agent dispatch.

## Calling them

In an environment that loads them:

```text
> use the tester agent to walk through Livong
> have the reviewer check my changes before I push
> dba — design a reports table for user reports
```

Or programmatically via the Task tool with `subagent_type: "tester"` (etc).

## Hard rules that apply to all of them

- **Tester / Reviewer / Designer:** must NOT edit code. Tools restricted at the agent-definition level.
- **DevOps / DBA:** can edit but must defer destructive actions (`drop`, `force push`, `terraform destroy`) until user confirms inline.
- **Everyone:** reads `CLAUDE.md` and `.cursorrules` at the start of every invocation. Don't have to be re-briefed each session.
- **Everyone:** uses the project's existing CLI (`./livong`) over reinventing. Project conventions over personal preference.

## Project-specific shortcuts the agents already know

These were taught to the agents based on real friction in past sessions:

- **Dev-login bypass** for testing authed flows: `POST :8080/auth/_dev-login` (web) and `:8081/auth/_dev-login` (admin). Requires `LIVONG_DEV_LOGIN=1` on backend.
- **Test runner:** `./livong test` covers Go + Playwright across all 4 surfaces.
- **Migrations:** appended to `apps/backend/internal/database/migrations.go` — never edit shipped entries.
- **Deploy:** see `docs/deploy.md` (Vercel + Fly.io Mumbai + Neon + Sentry + PostHog, all free tier).
- **India context:** prices in INR, MSG91 for OTP delivery, Cloudflare Registrar at-cost.

## Improving the team

Each agent's `.md` file IS its performance review. Sharpen the prompt when you notice friction:

- Did the tester miss the authed-flow bypass? Add a line.
- Did the reviewer skip running the tests? Add "Actually run them — capture output".
- Did the designer hand-wave with "looks good"? Add "Show numbers from Lighthouse first".

Commit the change. Next session, the team is smarter.
