---
description: Encode lessons from this session into the agents so they get smarter forever
argument-hint: "[optional: what specifically went wrong]"
---

You're running a post-mortem to make the team smarter. Goal: turn one observed friction into a permanent improvement to an agent's prompt.

## Process

1. **Find the friction.**
   - If `$ARGUMENTS` is non-empty, that's the lesson. Skip to step 2.
   - Otherwise, ask the user one short question: *"Anything an agent did badly this session — missed a check, gave up too easily, suggested something silly, output format off?"*
   - If they say "nothing" or "all good", say so and exit. Don't fabricate friction to justify writing prose.

2. **Identify which agent** (`tester` / `reviewer` / `devops` / `dba` / `designer` / `ceo`) the lesson belongs to. If unsure, ask the user one line. If truly cross-cutting, propose updating `docs/agents.md` instead of a single agent file.

3. **Read that agent's file** at `.claude/agents/<name>.md`.

4. **Propose a SHORT, SPECIFIC edit** to the prompt. Rules:
   - One concrete sentence or bullet, not a paragraph rewrite.
   - Cite the friction in a comment so future sessions understand the why ("// Added 2026-MM-DD because tester said 'skipped — couldn't auth' when dev-login was one curl away.") — actually, since these are .md files, no comment syntax. Skip the comment, but make the new text obviously addresses the friction.
   - Add to the existing structure (Process step, Hard rule, etc.) — don't create a new top-level section unless absolutely necessary.

5. **Show the user the diff before applying.** One-line "OK to apply?" After confirmation, edit the file.

6. **Commit + push** with a message like:
   ```
   chore(agents): tester now uses dev-login bypass instead of skipping authed tests

   Friction observed in <date> session: tester gave up on /matches with
   "couldn't auth" when LIVONG_DEV_LOGIN bypass was one HTTP call away.
   ```

7. **Done.** One lesson per post-mortem. Don't compound — if there's another lesson, the user will run `/post-mortem` again.

## Hard rules

- **One agent, one lesson per run.** Bigger rewrites should be a separate task.
- **Don't write speculative improvements.** Only encode lessons that came from real friction.
- **Don't ship without user confirmation.** This edits a file the team relies on; the user owns final say.
- **Skip if there's nothing to say.** A short "no friction observed, nothing to encode" message is the right output sometimes.
