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

# 4. TODO.md
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

# 8. Hermes 상태 확인
if command -v hermes &>/dev/null; then
  HERMES_VER=$(hermes --version 2>/dev/null | head -1)
  GW_STATUS=$(launchctl list 2>/dev/null | grep hermes | awk '{print $3 " (PID:" $1 ")"}' | head -1)
  CRON_COUNT=$(hermes cron list 2>/dev/null | grep -c "\[active\]" || echo "0")

  PARTS="$PARTS
## Hermes Status
- Version: $HERMES_VER
- Gateway: ${GW_STATUS:-not running}
- Cron jobs: ${CRON_COUNT} active"

  # Paperclip 상태 (타임아웃 2초)
  PCLIP=$(curl -s --max-time 2 https://paperclip.dororong.dev/api/health 2>/dev/null)
  if [ -n "$PCLIP" ]; then
    PARTS="$PARTS
- Paperclip: online"
  fi

  # Wiki 상태
  WIKI_PATH="${WIKI_PATH:-$HOME/wiki}"
  if [ -d "$WIKI_PATH" ]; then
    WIKI_PAGES=$(find "$WIKI_PATH" -name "*.md" -not -path "*/raw/*" 2>/dev/null | wc -l | tr -d ' ')
    PARTS="$PARTS
- Wiki: ${WIKI_PAGES} pages"
  fi
fi

if [ -n "$PARTS" ]; then
  echo "$PARTS"
fi
