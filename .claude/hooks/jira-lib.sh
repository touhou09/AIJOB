#!/bin/bash
# Jira REST API 공통 함수
# 사용: source .claude/hooks/jira-lib.sh

JIRA_BASE_URL="${JIRA_BASE_URL:-https://ingkle.atlassian.net}"
JIRA_USER="${JIRA_USER:?JIRA_USER 환경변수를 설정하세요 (예: user@ingkle.com)}"

# 토큰 읽기 우선순위: 파일 → 환경변수 → Vault
_atlassian_token_file() {
  local f
  for f in "$HOME/.claude/.atlassian-token" ".claude/.atlassian-token"; do
    if [ -f "$f" ]; then
      cat "$f" 2>/dev/null | tr -d '\n'
      return 0
    fi
  done
  return 1
}

jira_get_token() {
  local token
  token=$(_atlassian_token_file) && [ -n "$token" ] && echo "$token" && return
  [ -n "${JIRA_API_TOKEN:-}" ] && echo "$JIRA_API_TOKEN" && return
  if command -v vault &>/dev/null; then
    vault kv get -field=token "secret/data/jira/api-token" 2>/dev/null && return
  fi
  return 1
}

jira_auth_header() {
  local token
  token=$(jira_get_token) || return 1
  # macOS base64 vs Linux base64 -w0
  if base64 --help 2>&1 | grep -q '\-w'; then
    printf '%s:%s' "$JIRA_USER" "$token" | base64 -w0
  else
    printf '%s:%s' "$JIRA_USER" "$token" | base64
  fi
}

jira_api() {
  local method="$1" endpoint="$2" data="${3:-}"
  local auth
  auth=$(jira_auth_header) || { echo "ERROR: Atlassian token not found" >&2; return 1; }
  curl -s -X "$method" \
    -H "Authorization: Basic $auth" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"} \
    "${JIRA_BASE_URL}/rest/api/3${endpoint}"
}

# Jira v3 search/jql (POST) — GET /search는 deprecated
jira_get_my_issues() {
  local jql="${1:-assignee=currentUser() AND status != Done ORDER BY priority DESC}"
  local max="${2:-20}"
  jira_api POST "/search/jql" \
    "{\"jql\":\"$jql\",\"fields\":[\"key\",\"summary\",\"priority\",\"status\"],\"maxResults\":$max}"
}

jira_transition() {
  local issue_key="$1" transition_name="$2"
  local transitions tid
  transitions=$(jira_api GET "/issue/$issue_key/transitions")
  tid=$(echo "$transitions" | jq -r ".transitions[] | select(.name==\"$transition_name\") | .id" 2>/dev/null)
  if [ -n "$tid" ] && [ "$tid" != "null" ]; then
    jira_api POST "/issue/$issue_key/transitions" "{\"transition\":{\"id\":\"$tid\"}}"
    return 0
  else
    echo "ERROR: Transition '$transition_name' not found for $issue_key" >&2
    return 1
  fi
}

jira_change_assignee() {
  local issue_key="$1" account_id="$2"
  jira_api PUT "/issue/$issue_key/assignee" "{\"accountId\":\"$account_id\"}"
}

# IW 프로젝트 이슈 타입 ID
_IW_PROJECT_KEY="IW"
_IW_ISSUETYPE_TASK="10007"
_IW_ISSUETYPE_STORY="10006"
_IW_ISSUETYPE_BUG="10009"
_IW_ISSUETYPE_SUBTASK="10008"
_IW_ISSUETYPE_EPIC="10000"

# ADF(Atlassian Document Format) 빌더 — 배경/범위/완료조건 템플릿
_adf_ticket_body() {
  local background="$1" scope_include="$2" scope_exclude="$3" done_criteria="$4" reference="${5:-}"

  local ref_block=""
  if [ -n "$reference" ]; then
    ref_block=",{\"type\":\"heading\",\"attrs\":{\"level\":3},\"content\":[{\"type\":\"text\",\"text\":\"참고\"}]},{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"$reference\"}]}]}]}"
  fi

  cat <<ENDADF
{"type":"doc","version":1,"content":[{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"배경"}]},{"type":"paragraph","content":[{"type":"text","text":"$background"}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"범위"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"포함: $scope_include"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"제외: $scope_exclude"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"완료 조건"}]},{"type":"bulletList","content":[$(echo "$done_criteria" | tr '|' '\n' | while read -r item; do [ -n "$item" ] && printf '{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"%s"}]}]},' "$item"; done | sed 's/,$//')]}${ref_block}]}
ENDADF
}

# 티켓 생성 — Task/Story/Bug
jira_create_issue() {
  local issue_type="$1" summary="$2" background="$3" scope_include="$4" scope_exclude="$5" done_criteria="$6" reference="${7:-}"

  local type_id
  case "$issue_type" in
    task|Task)     type_id="$_IW_ISSUETYPE_TASK" ;;
    story|Story)   type_id="$_IW_ISSUETYPE_STORY" ;;
    bug|Bug)       type_id="$_IW_ISSUETYPE_BUG" ;;
    epic|Epic)     type_id="$_IW_ISSUETYPE_EPIC" ;;
    *)             echo "ERROR: 지원하지 않는 이슈 타입: $issue_type (task/story/bug/epic)" >&2; return 1 ;;
  esac

  local body
  body=$(_adf_ticket_body "$background" "$scope_include" "$scope_exclude" "$done_criteria" "$reference")

  local today
  today=$(date +%Y-%m-%d)

  local priority="${8:-Medium}"
  local priority_id
  case "$priority" in
    Highest) priority_id="1" ;; High) priority_id="2" ;; Medium) priority_id="3" ;; Low) priority_id="4" ;; Lowest) priority_id="5" ;; *) priority_id="3" ;;
  esac

  local payload="{\"fields\":{\"project\":{\"key\":\"$_IW_PROJECT_KEY\"},\"issuetype\":{\"id\":\"$type_id\"},\"summary\":\"$summary\",\"description\":$body,\"priority\":{\"id\":\"$priority_id\"},\"customfield_10008\":\"$today\",\"customfield_10009\":\"$today\"}}"

  jira_api POST "/issue" "$payload"
}

# 사용자 검색 (displayName → accountId)
jira_find_user() {
  local query="$1"
  jira_api GET "/user/search?query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&maxResults=5"
}

# Sub-task 생성
jira_create_subtask() {
  local parent_key="$1" summary="$2"
  local today
  today=$(date +%Y-%m-%d)

  local payload="{\"fields\":{\"project\":{\"key\":\"$_IW_PROJECT_KEY\"},\"issuetype\":{\"id\":\"$_IW_ISSUETYPE_SUBTASK\"},\"parent\":{\"key\":\"$parent_key\"},\"summary\":\"$summary\",\"customfield_10008\":\"$today\",\"customfield_10009\":\"$today\"}}"

  jira_api POST "/issue" "$payload"
}

# 코멘트 생성 — 구조화된 ADF (단계별 완료 내역)
jira_add_comment() {
  local issue_key="$1" text="$2"

  local payload="{\"body\":{\"type\":\"doc\",\"version\":1,\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"$text\"}]}]}}"

  jira_api POST "/issue/$issue_key/comment" "$payload"
}
