#!/usr/bin/env bash
# hermes-profile-sync.sh
# AIJOB/.claude → ~/.hermes/profiles/{p}/ 로 프로필 배포
#
# 동작:
#   - SOUL.md, AGENTS.md: 항상 덮어쓰기 (AIJOB = source of truth)
#   - rules/*.md: 항상 전체 복사 (프로필마다 복제)
#   - STATE.md, CONTEXT.md, DECISIONS.md: 없을 때만 template에서 복사 (런타임 편집 보존)
#   - workspace/: 빈 디렉토리 보장
#
# 사용:
#   bash ~/AIJOB/.claude/hooks/hermes-profile-sync.sh              # 모든 프로필 sync
#   bash ~/AIJOB/.claude/hooks/hermes-profile-sync.sh orchestrator # 특정 프로필만
#
# 종료 코드:
#   0 = 성공, 1 = 실패

set -euo pipefail

SRC_ROOT="${HOME}/AIJOB/.claude"
DST_ROOT="${HOME}/.hermes/profiles"

if [ ! -d "$SRC_ROOT" ]; then
  echo "[sync] ERROR: source not found: $SRC_ROOT" >&2
  exit 1
fi
if [ ! -d "$DST_ROOT" ]; then
  echo "[sync] ERROR: Hermes profiles root not found: $DST_ROOT" >&2
  exit 1
fi

# 대상 프로필 결정
if [ $# -gt 0 ]; then
  PROFILES=("$@")
else
  PROFILES=()
  for dir in "$SRC_ROOT/profiles"/*/; do
    name=$(basename "$dir")
    [ "$name" = "_common" ] && continue
    [ "$name" = "_template" ] && continue
    PROFILES+=("$name")
  done
fi

COMMON_PART="$SRC_ROOT/profiles/_common/AGENTS.md.part"
if [ ! -f "$COMMON_PART" ]; then
  echo "[sync] ERROR: common AGENTS.md.part not found: $COMMON_PART" >&2
  exit 1
fi

sync_profile() {
  local profile=$1
  local src="$SRC_ROOT/profiles/$profile"
  local dst="$DST_ROOT/$profile"

  if [ ! -d "$src" ]; then
    echo "[sync] skip: $profile (source not found)"
    return 0
  fi
  if [ ! -d "$dst" ]; then
    echo "[sync] ERROR: Hermes profile directory not found: $dst" >&2
    echo "[sync]        run 'hermes profile create $profile' first" >&2
    return 1
  fi

  echo "[sync] === $profile ==="

  # 1. SOUL.md — 항상 덮어쓰기
  if [ -f "$src/SOUL.md" ]; then
    cp "$src/SOUL.md" "$dst/SOUL.md"
    echo "[sync]   SOUL.md copied"
  fi

  # 2. AGENTS.md — _common + profile merge + {profile} 치환
  if [ -f "$src/AGENTS.md.part" ]; then
    {
      cat "$COMMON_PART"
      printf '\n\n'
      cat "$src/AGENTS.md.part"
    } | sed "s/{profile}/$profile/g" > "$dst/AGENTS.md"
    echo "[sync]   AGENTS.md merged (_common + $profile) + profile=$profile substituted"
  else
    echo "[sync]   WARN: $src/AGENTS.md.part not found — skipping merge" >&2
  fi

  # 3. rules/ — 전체 복사
  mkdir -p "$dst/rules"
  if [ -d "$SRC_ROOT/rules" ]; then
    # 기존 rules 비우고 다시 복사 (삭제된 파일 정리)
    rm -f "$dst/rules"/*.md
    cp "$SRC_ROOT/rules"/*.md "$dst/rules/" 2>/dev/null || true
    local rule_count
    rule_count=$(find "$dst/rules" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
    echo "[sync]   rules/ copied ($rule_count files)"
  fi

  # 4. STATE.md / CONTEXT.md / DECISIONS.md — 없을 때만 template에서 복사
  for name in STATE CONTEXT DECISIONS; do
    local template="$src/${name}.md.template"
    local target="$dst/${name}.md"
    if [ -f "$template" ]; then
      if [ ! -f "$target" ]; then
        cp "$template" "$target"
        echo "[sync]   $name.md created from template"
      else
        echo "[sync]   $name.md exists — preserved"
      fi
    fi
  done

  # 5. workspace 디렉토리 보장
  mkdir -p "$dst/workspace"
  echo "[sync]   workspace/ ensured"
}

FAIL_COUNT=0
for profile in "${PROFILES[@]}"; do
  if ! sync_profile "$profile"; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo
if [ $FAIL_COUNT -eq 0 ]; then
  echo "[sync] ✓ all profiles synced"
  exit 0
else
  echo "[sync] ✗ $FAIL_COUNT profile(s) failed"
  exit 1
fi
