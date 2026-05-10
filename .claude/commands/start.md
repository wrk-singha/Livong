---
description: Start Livong (backend + web) and report status
---

Run `./livong status` first. If anything is already running, stop it with `./livong stop`. Then run `./livong start` and report which services came up on which ports. If a port is in use, identify the process with `lsof -i :<port>` and ask before killing it.
