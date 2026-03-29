#!/bin/bash
# Stop Hook — 파일 변경 시 incremental 로그 (매 턴 실행)
# 성능: 변경 없으면 <5ms, 있으면 <30ms
# 절대 exit 2 사용 금지 (무한 루프 위험)

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

# 턴 카운터
TURN_FILE="/tmp/claude-turn-count-$$"
if [ -f "$TURN_FILE" ]; then
  COUNT=$(cat "$TURN_FILE")
  COUNT=$((COUNT + 1))
else
  COUNT=1
fi
echo "$COUNT" > "$TURN_FILE"

# 3턴 미만이면 스킵 (짧은 세션 필터링)
if [ "$COUNT" -lt 3 ]; then
  exit 0
fi

# git diff 확인 — 변경 없으면 즉시 종료
CHANGED=$(git -C "$CWD" diff --name-only HEAD 2>/dev/null)
STAGED=$(git -C "$CWD" diff --name-only --cached 2>/dev/null)
RECENT_COMMITS=$(git -C "$CWD" log --oneline --since="5 minutes ago" 2>/dev/null)

if [ -z "$CHANGED" ] && [ -z "$STAGED" ] && [ -z "$RECENT_COMMITS" ]; then
  exit 0
fi

# 변경 있을 때만 로그 기록
CLAUDE_DIR="$CWD/.claude"
mkdir -p "$CLAUDE_DIR"
LOG_FILE="$CLAUDE_DIR/session-log.jsonl"

ALL_FILES=$(echo -e "$CHANGED\n$STAGED" | sort -u | grep -v '^$' | head -20)
FILE_COUNT=$(echo "$ALL_FILES" | grep -c -v '^$')
PREVIEW=$(echo "$ALL_FILES" | head -3 | tr '\n' ', ' | sed 's/,$//')

if [ "$FILE_COUNT" -gt 3 ]; then
  SUMMARY="${FILE_COUNT} files changed: ${PREVIEW}..."
else
  SUMMARY="${FILE_COUNT} files changed: ${PREVIEW}"
fi

ENTRY=$(jq -n \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg summary "$SUMMARY" \
  --arg turn "$COUNT" \
  '{timestamp: $ts, summary: $summary, turn: ($turn | tonumber)}')

echo "$ENTRY" >> "$LOG_FILE"

# 최근 50건만 유지
LINES=$(wc -l < "$LOG_FILE")
if [ "$LINES" -gt 50 ]; then
  tail -50 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

exit 0
