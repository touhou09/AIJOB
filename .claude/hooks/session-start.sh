#!/bin/bash
# SessionStart Hook — Hot Tier 자동 주입
# STATE.md + CONTEXT.md + DECISIONS.md + TODO.md + git 상태

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

PARTS=""

# 1. STATE.md
STATE_FILE="$CWD/.claude/STATE.md"
if [ -f "$STATE_FILE" ]; then
  PARTS="$(cat "$STATE_FILE")"
fi

# 2. CONTEXT.md
CONTEXT_FILE="$CWD/.claude/CONTEXT.md"
if [ -f "$CONTEXT_FILE" ]; then
  PARTS="$PARTS
$(cat "$CONTEXT_FILE")"
fi

# 3. DECISIONS.md
DECISIONS_FILE="$CWD/.claude/DECISIONS.md"
if [ -f "$DECISIONS_FILE" ]; then
  PARTS="$PARTS
$(cat "$DECISIONS_FILE")"
fi

# 4. Jira → TODO.md 자동 동기화 (하루 1회)
SYNC_MARKER="/tmp/claude-jira-sync-$(date +%Y%m%d)"
SYNC_SCRIPT="$HOME/.claude/hooks/jira-sync.sh"
if [ ! -f "$SYNC_MARKER" ] && [ -f "$SYNC_SCRIPT" ]; then
  bash "$SYNC_SCRIPT" "$CWD" 2>/dev/null && touch "$SYNC_MARKER"
fi

# 5. TODO.md
TODO_FILE="$CWD/.claude/TODO.md"
if [ -f "$TODO_FILE" ]; then
  PARTS="$PARTS
$(cat "$TODO_FILE")"
fi

# 6. git 상태 요약
BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null)
if [ -n "$BRANCH" ]; then
  PARTS="$PARTS
## Git Context
- Branch: $BRANCH"

  DIFF_STAT=$(git -C "$CWD" diff --stat HEAD 2>/dev/null)
  if [ -n "$DIFF_STAT" ]; then
    PARTS="$PARTS
- Uncommitted:
\`\`\`
$DIFF_STAT
\`\`\`"
  fi
fi

# 7. 최근 세션 로그
LOG_FILE="$CWD/.claude/session-log.jsonl"
if [ -f "$LOG_FILE" ]; then
  LAST=$(tail -1 "$LOG_FILE" 2>/dev/null)
  if [ -n "$LAST" ]; then
    TS=$(echo "$LAST" | jq -r '.timestamp // ""')
    SUMMARY=$(echo "$LAST" | jq -r '.summary // "no summary"')
    PARTS="$PARTS
## Last Session
- $TS: $SUMMARY"
  fi
fi

if [ -n "$PARTS" ]; then
  echo "$PARTS"
fi
