#!/bin/bash
# Jira → TODO.md 자동 동기화
# 사용: bash .claude/hooks/jira-sync.sh [cwd]
# session-start.sh에서 호출되거나 단독 실행 가능

CWD="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/jira-lib.sh"

TODO_FILE="$CWD/.claude/TODO.md"
TODAY=$(date +%Y-%m-%d)
# macOS: md5, Linux: md5sum
_hash_cmd() {
  if command -v md5sum &>/dev/null; then
    echo "$1" | md5sum | cut -d' ' -f1
  elif command -v md5 &>/dev/null; then
    echo "$1" | md5
  else
    echo "default"
  fi
}
CARRY_FILE="/tmp/claude-jira-carry-$(_hash_cmd "$CWD")"

# 토큰 확인
TOKEN=$(jira_get_token 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "WARN: Atlassian token not found — Jira sync skipped" >&2
  exit 0
fi

# Jira에서 내 미완료 티켓 조회
RESULT=$(jira_get_my_issues "assignee=currentUser() AND status != Done ORDER BY priority DESC" 50)
if echo "$RESULT" | jq -e '.errorMessages' &>/dev/null 2>&1; then
  echo "ERROR: Jira API 오류 — $(echo "$RESULT" | jq -r '.errorMessages[0]')" >&2
  exit 1
fi

# 기존 캐리오버 카운트 로드 (키=카운트 형식, 줄 단위)
if [ ! -f "$CARRY_FILE" ]; then
  # 기존 TODO.md에서 캐리오버 파싱
  if [ -f "$TODO_FILE" ]; then
    grep -E '^\|.*[A-Z]+-[0-9]+' "$TODO_FILE" | while IFS='|' read -r _ _ key _ _ _ carry _; do
      key=$(echo "$key" | xargs 2>/dev/null)
      carry=$(echo "$carry" | xargs 2>/dev/null)
      if [ -n "$key" ] && [ -n "$carry" ] && echo "$carry" | grep -qE '^[0-9]+$'; then
        echo "$key=$carry"
      fi
    done > "$CARRY_FILE"
  fi
fi

get_carry() {
  local key="$1"
  if [ -f "$CARRY_FILE" ]; then
    local val
    val=$(grep "^${key}=" "$CARRY_FILE" 2>/dev/null | head -1 | cut -d= -f2)
    if [ -n "$val" ]; then
      echo $((val + 1))
      return
    fi
  fi
  echo 0
}

# 이슈 파싱 + TODO.md 생성
ISSUE_COUNT=$(echo "$RESULT" | jq '.issues | length')
NEW_CARRY_FILE="${CARRY_FILE}.new"

{
  echo "# 오늘의 작업"
  echo ""
  echo "> 최종 업데이트: $TODAY"
  echo "> 소스: Jira (자동 동기화)"
  echo ""
  echo "---"
  echo ""
  echo "| # | Jira Key | 제목 | 우선순위 | 상태 | 캐리오버 |"
  echo "|---|----------|------|---------|------|---------|"

  > "$NEW_CARRY_FILE"
  WARN_LIST=""

  for i in $(seq 0 $((ISSUE_COUNT - 1))); do
    KEY=$(echo "$RESULT" | jq -r ".issues[$i].key")
    SUMMARY=$(echo "$RESULT" | jq -r ".issues[$i].fields.summary")
    PRIORITY=$(echo "$RESULT" | jq -r ".issues[$i].fields.priority.name")
    STATUS=$(echo "$RESULT" | jq -r ".issues[$i].fields.status.name")
    CARRY=$(get_carry "$KEY")

    # 우선순위 축약
    case "$PRIORITY" in
      Highest) PRI="P0" ;;
      High)    PRI="P1" ;;
      Medium)  PRI="P2" ;;
      Low)     PRI="P3" ;;
      Lowest)  PRI="P4" ;;
      *)       PRI="$PRIORITY" ;;
    esac

    echo "| $((i+1)) | $KEY | $SUMMARY | $PRI | $STATUS | $CARRY |"
    echo "$KEY=$CARRY" >> "$NEW_CARRY_FILE"

    if [ "$CARRY" -ge 3 ]; then
      WARN_LIST="$WARN_LIST $KEY(${CARRY}회)"
    fi
  done

  echo ""
  echo "## 완료"
  echo "- (완료 시 여기로 이동, 세션 종료 시 삭제)"
  echo ""
  echo "## 캐리오버 추적"
  if [ -n "$WARN_LIST" ]; then
    echo "- **3회 이상 이월**:$WARN_LIST → 재검토 필요 (분해/위임/취소)"
  else
    echo "- 3회 연속 이월 시 → 리뷰 트리거 (rules/jira-policy.md 참조)"
  fi
} > "$TODO_FILE"

mv "$NEW_CARRY_FILE" "$CARRY_FILE" 2>/dev/null
echo "✓ TODO.md 갱신 (${ISSUE_COUNT}건, $TODAY)" >&2
