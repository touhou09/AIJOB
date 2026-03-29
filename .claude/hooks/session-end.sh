#!/bin/bash
# SessionEnd Hook — /clear 시 최종 정리 (보험 레이어)
# 터미널 종료 시 미발화 가능 — Stop Hook이 주력

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

CLAUDE_DIR="$CWD/.claude"
LOG_FILE="$CLAUDE_DIR/session-log.jsonl"

# 1. 종료 마커 추가
if [ -d "$CLAUDE_DIR" ]; then
  ENTRY=$(jq -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{timestamp: $ts, type: "session_end", summary: "Session ended"}')
  echo "$ENTRY" >> "$LOG_FILE"
fi

# 2. STATE.md 최종 업데이트 시각 갱신
STATE_FILE="$CLAUDE_DIR/STATE.md"
if [ -f "$STATE_FILE" ]; then
  DATE_STR=$(date +%Y-%m-%d)
  sed -i '' "s/> 최종 업데이트: .*/> 최종 업데이트: $DATE_STR/" "$STATE_FILE" 2>/dev/null
fi

# 3. 턴 카운터 정리
rm -f /tmp/claude-turn-count-*

exit 0
