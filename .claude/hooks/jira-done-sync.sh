#!/bin/bash
# TODO.md 완료 항목 → Jira 상태 전환
# - 본인 생성 티켓: Done
# - 외부 할당 티켓: Review + 담당자를 reporter(요청자)로 변경
# 사용: bash .claude/hooks/jira-done-sync.sh [cwd]

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
  # 현재 상태 + reporter/assignee 조회
  CURRENT=$(jira_api GET "/issue/$KEY?fields=status,reporter,assignee" 2>/dev/null)
  STATUS=$(echo "$CURRENT" | jq -r '.fields.status.name' 2>/dev/null)

  if [ "$STATUS" = "Done" ] || [ "$STATUS" = "Review" ]; then
    echo "SKIP: $KEY (이미 $STATUS)" >&2
    continue
  fi

  if [ "$STATUS" = "null" ] || [ -z "$STATUS" ]; then
    echo "WARN: $KEY 상태 조회 실패" >&2
    FAIL=$((FAIL + 1))
    continue
  fi

  # reporter vs assignee accountId 비교
  REPORTER_ID=$(echo "$CURRENT" | jq -r '.fields.reporter.accountId // ""' 2>/dev/null)
  REPORTER_NAME=$(echo "$CURRENT" | jq -r '.fields.reporter.displayName // "?"' 2>/dev/null)
  ASSIGNEE_ID=$(echo "$CURRENT" | jq -r '.fields.assignee.accountId // ""' 2>/dev/null)

  if [ -n "$REPORTER_ID" ] && [ -n "$ASSIGNEE_ID" ] && [ "$REPORTER_ID" != "$ASSIGNEE_ID" ]; then
    # 외부 할당 → Review + 담당자를 reporter로 변경
    TARGET="Review"
    RESULT=$(jira_transition "$KEY" "$TARGET" 2>&1)
    if [ $? -eq 0 ]; then
      # 담당자를 요청자(reporter)로 변경
      jira_change_assignee "$KEY" "$REPORTER_ID" >/dev/null 2>&1
      echo "✓ $KEY: $STATUS → $TARGET (담당자 → $REPORTER_NAME)" >&2
      SUCCESS=$((SUCCESS + 1))
    else
      echo "✗ $KEY: $TARGET 전환 실패 ($RESULT)" >&2
      FAIL=$((FAIL + 1))
    fi
  else
    # 본인 생성 → Done
    TARGET="Done"
    RESULT=$(jira_transition "$KEY" "$TARGET" 2>&1)
    if [ $? -eq 0 ]; then
      echo "✓ $KEY: $STATUS → $TARGET" >&2
      SUCCESS=$((SUCCESS + 1))
    else
      echo "✗ $KEY: $TARGET 전환 실패 ($RESULT)" >&2
      FAIL=$((FAIL + 1))
    fi
  fi
done

echo "완료: ${SUCCESS}건 전환, ${FAIL}건 실패" >&2
