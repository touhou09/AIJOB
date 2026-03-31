#!/bin/bash
# TODO.md 완료 항목 → Jira Done 전환
# 사용: bash .claude/hooks/jira-done-sync.sh [cwd]
# /done hook 또는 단독 실행

CWD="${1:-$HOME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/jira-lib.sh"

TODO_FILE="$CWD/.claude/TODO.md"

if [ ! -f "$TODO_FILE" ]; then
  echo "WARN: TODO.md not found at $TODO_FILE" >&2
  exit 0
fi

TOKEN=$(jira_get_token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "WARN: Atlassian token not found — Jira sync skipped" >&2
  exit 0
fi

# 완료 섹션에서 Jira 키 추출 (IW-xx, MICO-xx 등)
DONE_KEYS=$(sed -n '/^## 완료/,/^## /p' "$TODO_FILE" | grep -oE '[A-Z]+-[0-9]+')

if [ -z "$DONE_KEYS" ]; then
  echo "INFO: 완료 항목 없음" >&2
  exit 0
fi

SUCCESS=0
FAIL=0

for KEY in $DONE_KEYS; do
  # 현재 Jira 상태 확인
  CURRENT=$(jira_api GET "/issue/$KEY?fields=status" 2>/dev/null)
  STATUS=$(echo "$CURRENT" | jq -r '.fields.status.name' 2>/dev/null)

  if [ "$STATUS" = "Done" ]; then
    echo "SKIP: $KEY (이미 Done)" >&2
    continue
  fi

  if [ "$STATUS" = "null" ] || [ -z "$STATUS" ]; then
    echo "WARN: $KEY 상태 조회 실패" >&2
    FAIL=$((FAIL + 1))
    continue
  fi

  # Done 전환
  RESULT=$(jira_transition "$KEY" "Done" 2>&1)
  if [ $? -eq 0 ]; then
    echo "✓ $KEY: $STATUS → Done" >&2
    SUCCESS=$((SUCCESS + 1))
  else
    echo "✗ $KEY: 전환 실패 ($RESULT)" >&2
    FAIL=$((FAIL + 1))
  fi
done

echo "완료: ${SUCCESS}건 전환, ${FAIL}건 실패" >&2
