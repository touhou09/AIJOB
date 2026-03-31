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
