#!/bin/bash
# Confluence REST API 공통 함수
# 사용: source .claude/hooks/confluence-lib.sh
#   또는: bash -c 'source .claude/hooks/confluence-lib.sh && confluence_fetch_page PAGE_ID'

CONFLUENCE_BASE_URL="${CONFLUENCE_BASE_URL:-https://ingkle.atlassian.net/wiki}"

# jira-lib.sh 로드 (bash/zsh 호환)
_confluence_find_lib_dir() {
  if [ -n "${BASH_SOURCE[0]:-}" ]; then
    cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
  elif [ -n "${0:-}" ] && [ -f "$0" ]; then
    cd "$(dirname "$0")" && pwd
  else
    # source로 호출 시 fallback: CWD 기준
    local d
    for d in ".claude/hooks" "$HOME/.claude/hooks"; do
      [ -f "$d/jira-lib.sh" ] && echo "$d" && return
    done
  fi
}

if ! type jira_auth_header &>/dev/null 2>&1; then
  _CONF_LIB_DIR=$(_confluence_find_lib_dir)
  if [ -n "$_CONF_LIB_DIR" ] && [ -f "$_CONF_LIB_DIR/jira-lib.sh" ]; then
    source "$_CONF_LIB_DIR/jira-lib.sh"
  else
    echo "ERROR: jira-lib.sh not found" >&2
    return 1 2>/dev/null || exit 1
  fi
fi

confluence_api() {
  local method="$1" endpoint="$2" data="${3:-}"
  local auth
  auth=$(jira_auth_header) || { echo "ERROR: Atlassian token not found" >&2; return 1; }
  curl -s -X "$method" \
    -H "Authorization: Basic $auth" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"} \
    "${CONFLUENCE_BASE_URL}/rest/api${endpoint}"
}

# 페이지 조회 (HTML body → 텍스트 변환)
confluence_fetch_page() {
  local page_id="$1"
  local raw
  raw=$(confluence_api GET "/content/$page_id?expand=body.storage")

  local title
  title=$(echo "$raw" | jq -r '.title // "Unknown"')

  local body
  body=$(echo "$raw" | jq -r '.body.storage.value // ""')

  echo "# $title"
  echo ""
  echo "$body" | python3 -c "
import sys, html, re
text = sys.stdin.read()
text = re.sub(r'<br\s*/?>', '\n', text)
text = re.sub(r'</(p|div|tr|li|h[1-6])>', '\n', text)
text = re.sub(r'<(th|td)[^>]*>', ' | ', text)
text = re.sub(r'<[^>]+>', '', text)
text = html.unescape(text)
text = re.sub(r'\n{3,}', '\n\n', text)
text = re.sub(r'[ \t]+', ' ', text)
print(text.strip())
" 2>/dev/null || echo "$body" | sed 's/<[^>]*>//g'
}

# CQL 검색
confluence_search() {
  local query="$1"
  local max="${2:-10}"
  local encoded
  encoded=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$query'''))" 2>/dev/null || echo "$query")
  confluence_api GET "/content/search?cql=$encoded&limit=$max"
}

# Space 내 페이지 목록
confluence_list_pages() {
  local space_key="$1"
  local max="${2:-25}"
  confluence_api GET "/content?spaceKey=$space_key&type=page&limit=$max&expand=title"
}
