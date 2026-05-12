---
description: Show what's running, git status, and any obvious issues
---

Run in parallel:
- `./livong status`
- `git status`
- `git log --oneline -5`
- `lsof -i :6980 -i :6981 -i :6900 -i :6910` (detect stale port holders)

Then summarize in 4-6 lines: services up/down, branch + uncommitted changes, recent commits, port conflicts (if any).
