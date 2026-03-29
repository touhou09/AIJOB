#!/bin/bash
# SessionStart Hook — STATE.md + git 상태 자동 주입

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

PARTS=""

# 1. STATE.md 읽기
STATE_FILE="$CWD/.claude/STATE.md"
if [ -f "$STATE_FILE" ]; then
  PARTS="$(cat "$STATE_FILE")"
fi

# 2. git 상태 요약
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

# 3. 최근 세션 로그
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
