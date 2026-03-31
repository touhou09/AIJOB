#!/bin/bash
# Jira REST API 공통 함수
# 사용: source .claude/hooks/jira-lib.sh

JIRA_BASE_URL="${JIRA_BASE_URL:-https://ingkle.atlassian.net}"
JIRA_USER="${JIRA_USER:-seungju.yu@ingkle.com}"
JIRA_TOKEN_VAULT_PATH="secret/data/jira/api-token"

jira_get_token() {
  if command -v vault &>/dev/null; then
    vault kv get -field=token "$JIRA_TOKEN_VAULT_PATH" 2>/dev/null && return
  fi
  echo "${JIRA_API_TOKEN:-}"
}

jira_api() {
  local method="$1" endpoint="$2" data="${3:-}"
  local token
  token=$(jira_get_token)
  if [ -z "$token" ]; then
    echo "ERROR: Jira token not found (Vault: $JIRA_TOKEN_VAULT_PATH, env: JIRA_API_TOKEN)" >&2
    return 1
  fi
  local auth
  auth=$(printf '%s:%s' "$JIRA_USER" "$token" | base64)
  curl -s -X "$method" \
    -H "Authorization: Basic $auth" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"} \
    "${JIRA_BASE_URL}/rest/api/3${endpoint}"
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

jira_get_my_issues() {
  local status_filter="${1:-status != Done}"
  jira_api GET "/search?jql=assignee=currentUser() AND ($status_filter) ORDER BY priority DESC&fields=key,summary,priority,status"
}

jira_change_assignee() {
  local issue_key="$1" account_id="$2"
  jira_api PUT "/issue/$issue_key/assignee" "{\"accountId\":\"$account_id\"}"
}
