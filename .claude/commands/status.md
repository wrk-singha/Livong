---
description: Show what's running, git status, and any obvious issues
---

Run in parallel:
- `./livong status`
- `git status`
- `git log --oneline -5`
- `lsof -i :8080 -i :8081 -i :3000 -i :3100` (detect stale port holders)

Then summarize in 4-6 lines: services up/down, branch + uncommitted changes, recent commits, port conflicts (if any).
