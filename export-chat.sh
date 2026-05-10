#!/usr/bin/env bash
# Export a Claude Code session transcript to markdown.
# Usage:
#   ./export-chat.sh                    # list available sessions
#   ./export-chat.sh <session-id>       # export to ./chat-<id>.md
#   ./export-chat.sh <session-id> -     # print to stdout
#
# Sessions live in ~/.claude/projects/<encoded-cwd>/*.jsonl
# Each line is a JSON event; we extract user + assistant turns.

set -euo pipefail

SESSIONS_GLOB="$HOME/.claude/projects/*/*.jsonl"

if [[ $# -eq 0 ]]; then
  echo "Available Claude Code sessions on this Mac:"
  echo ""
  for f in $SESSIONS_GLOB; do
    [[ -f "$f" ]] || continue
    id=$(basename "$f" .jsonl)
    project=$(basename "$(dirname "$f")" | sed 's/-Users-/\/Users\//' | tr '-' '/')
    size=$(du -h "$f" | cut -f1)
    mtime=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$f")
    echo "  $id  $size  $mtime  $project"
  done
  echo ""
  echo "Usage: ./export-chat.sh <session-id> [- for stdout]"
  exit 0
fi

SESSION_ID="$1"
OUT="${2:-./chat-${SESSION_ID}.md}"

# Find the jsonl file for this session id
JSONL=""
for f in $SESSIONS_GLOB; do
  [[ -f "$f" ]] || continue
  if [[ "$(basename "$f" .jsonl)" == "$SESSION_ID" ]]; then
    JSONL="$f"
    break
  fi
done

if [[ -z "$JSONL" ]]; then
  echo "Session not found: $SESSION_ID" >&2
  exit 1
fi

python3 - "$JSONL" <<'PY' > /tmp/chat-export.$$
import json, sys, datetime

path = sys.argv[1]
print(f"# Claude Code session\n\n_Source: `{path}`_\n")

with open(path) as f:
    for line in f:
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get("type") not in ("user", "assistant"):
            continue
        msg = d.get("message", {})
        role = msg.get("role", d.get("type"))
        content = msg.get("content", "")
        ts = d.get("timestamp", "")
        if isinstance(ts, str) and "T" in ts:
            ts = ts.split(".")[0].replace("T", " ")

        # Flatten content blocks
        parts = []
        if isinstance(content, list):
            for c in content:
                t = c.get("type")
                if t == "text":
                    parts.append(c.get("text", ""))
                elif t == "tool_use":
                    name = c.get("name", "?")
                    parts.append(f"_[tool: {name}]_")
                elif t == "tool_result":
                    parts.append("_[tool result]_")
        else:
            parts.append(str(content))

        body = "\n".join(p for p in parts if p).strip()
        if not body:
            continue

        header = "🧑 **You**" if role == "user" else "🤖 **Claude**"
        print(f"\n---\n\n## {header}  _{ts}_\n\n{body}\n")
PY

if [[ "$OUT" == "-" ]]; then
  cat /tmp/chat-export.$$
else
  mv /tmp/chat-export.$$ "$OUT"
  echo "Wrote $OUT ($(wc -l < "$OUT") lines)"
fi
