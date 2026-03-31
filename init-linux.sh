#!/bin/bash
set -euo pipefail

REPO_URL="https://github.com/touhou09/AIJOB.git"

usage() {
  echo "Usage: $0 [target-directory] [branch]"
  echo ""
  echo "  target-directory  .claude/ 구조를 세팅할 프로젝트 경로 (생략 시 전역 ~/.claude/)"
  echo "  branch            AIJOB 브랜치 (기본: master)"
  echo ""
  echo "Examples:"
  echo "  $0                          # 전역 설정"
  echo "  $0 ~/projects/my-app        # 프로젝트 설정 (master)"
  echo "  $0 ~/projects/my-app work   # 프로젝트 설정 (work 브랜치)"
  echo "  $0 . personal               # 현재 디렉토리에 personal 브랜치 설정"
  exit 1
}

# -h, --help 처리
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

BRANCH="${2:-master}"
GLOBAL_MODE=false

if [[ $# -lt 1 ]]; then
  GLOBAL_MODE=true
  TARGET="$HOME"
  CLAUDE_DIR="$HOME/.claude"
else
  TARGET="$(realpath "$1")"
  CLAUDE_DIR="$TARGET/.claude"
  if [[ ! -d "$TARGET" ]]; then
    echo "Error: $TARGET 디렉토리가 존재하지 않습니다."
    exit 1
  fi
fi

# 임시 디렉토리에 해당 브랜치 클론
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "[$BRANCH] 브랜치에서 템플릿 가져오는 중..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMPDIR" 2>/dev/null

# .claude/ 디렉토리 생성 (없으면)
mkdir -p "$CLAUDE_DIR"

# --- 덮어쓰기 대상 (레포 우선) ---

# CLAUDE.md
if [[ "$GLOBAL_MODE" == true ]]; then
  if [[ -f "$HOME/.claude/CLAUDE.md" ]]; then
    # 전역 모드: 기존 내용 유지 + 템플릿 병합 (구분선으로 append)
    MARKER="# --- AIJOB Template ---"
    # 기존 AIJOB 섹션이 있으면 제거 후 다시 추가
    if grep -qF "$MARKER" "$HOME/.claude/CLAUDE.md" 2>/dev/null; then
      sed -i "/$MARKER/,\$d" "$HOME/.claude/CLAUDE.md"
    fi
    echo "" >> "$HOME/.claude/CLAUDE.md"
    echo "$MARKER" >> "$HOME/.claude/CLAUDE.md"
    cat "$TMPDIR/CLAUDE.md" >> "$HOME/.claude/CLAUDE.md"
    echo "✓ ~/.claude/CLAUDE.md 병합 (기존 유지 + AIJOB 템플릿 추가)"
  else
    cp "$TMPDIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
    echo "✓ ~/.claude/CLAUDE.md 생성"
  fi
else
  cp "$TMPDIR/CLAUDE.md" "$TARGET/CLAUDE.md"
  PROJECT_NAME="$(basename "$TARGET")"
  sed -i "s/{프로젝트명}/$PROJECT_NAME/g" "$TARGET/CLAUDE.md"
  echo "✓ CLAUDE.md 덮어쓰기"
fi

# CONTEXT.md, DECISIONS.md, STATE.md (레포 우선 덮어쓰기)
for f in CONTEXT.md DECISIONS.md STATE.md TODO.md weekly.md roadmap.md; do
  if [[ -f "$TMPDIR/.claude/$f" ]]; then
    cp "$TMPDIR/.claude/$f" "$CLAUDE_DIR/$f"
    echo "✓ .claude/$f 덮어쓰기"
  fi
done

# settings.json
if [[ -f "$TMPDIR/.claude/settings.json" ]]; then
  if [[ "$GLOBAL_MODE" == true ]] && [[ -f "$CLAUDE_DIR/settings.json" ]]; then
    # 전역 모드: 병합 (레포 = permissions/hooks/env, 기존 = statusLine/plugins/기타)
    if command -v jq &>/dev/null; then
      jq -s '
        .[0] as $existing | .[1] as $repo |
        $existing * {
          permissions: $repo.permissions,
          hooks: $repo.hooks,
          env: ($existing.env // {} ) * ($repo.env // {}),
          channelsEnabled: ($repo.channelsEnabled // $existing.channelsEnabled)
        }
      ' "$CLAUDE_DIR/settings.json" "$TMPDIR/.claude/settings.json" > "$CLAUDE_DIR/settings.json.tmp" \
        && mv "$CLAUDE_DIR/settings.json.tmp" "$CLAUDE_DIR/settings.json"
      echo "✓ .claude/settings.json 병합 (permissions/hooks/env: 레포, statusLine/plugins: 기존 유지)"
    else
      echo "⚠ jq 미설치 — settings.json 병합 불가, 기존 유지"
    fi
  else
    # 프로젝트 모드: 덮어쓰기
    cp "$TMPDIR/.claude/settings.json" "$CLAUDE_DIR/settings.json"
    echo "✓ .claude/settings.json 덮어쓰기"
  fi
fi

# --- 병합 대상 (기존 유지 + 없는 파일만 추가) ---

# work/ 병합
if [[ -d "$TMPDIR/.claude/work" ]]; then
  mkdir -p "$CLAUDE_DIR/work"
  for f in "$TMPDIR/.claude/work/"*; do
    fname="$(basename "$f")"
    if [[ ! -f "$CLAUDE_DIR/work/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/work/$fname"
      echo "✓ .claude/work/$fname 추가"
    else
      echo "  .claude/work/$fname 이미 존재 — 건너뜀"
    fi
  done
fi

# rules/ 병합
if [[ -d "$TMPDIR/.claude/rules" ]]; then
  mkdir -p "$CLAUDE_DIR/rules"
  for f in "$TMPDIR/.claude/rules/"*; do
    fname="$(basename "$f")"
    if [[ ! -f "$CLAUDE_DIR/rules/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/rules/$fname"
      echo "✓ .claude/rules/$fname 추가"
    else
      echo "  .claude/rules/$fname 이미 존재 — 건너뜀"
    fi
  done
fi

# commands/ 병합
if [[ -d "$TMPDIR/.claude/commands" ]]; then
  mkdir -p "$CLAUDE_DIR/commands"
  for f in "$TMPDIR/.claude/commands/"*; do
    fname="$(basename "$f")"
    if [[ ! -f "$CLAUDE_DIR/commands/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/commands/$fname"
      echo "✓ .claude/commands/$fname 추가"
    else
      echo "  .claude/commands/$fname 이미 존재 — 건너뜀"
    fi
  done
fi

# endpoints/ 병합
if [[ -d "$TMPDIR/.claude/endpoints" ]]; then
  mkdir -p "$CLAUDE_DIR/endpoints"
  for f in "$TMPDIR/.claude/endpoints/"*; do
    fname="$(basename "$f")"
    [[ "$fname" == ".gitkeep" ]] && continue
    if [[ ! -f "$CLAUDE_DIR/endpoints/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/endpoints/$fname"
      echo "✓ .claude/endpoints/$fname 추가"
    else
      echo "  .claude/endpoints/$fname 이미 존재 — 건너뜀"
    fi
  done
fi

# runbooks/ 병합
if [[ -d "$TMPDIR/.claude/runbooks" ]]; then
  mkdir -p "$CLAUDE_DIR/runbooks"
  for f in "$TMPDIR/.claude/runbooks/"* "$TMPDIR/.claude/runbooks/".*; do
    [[ ! -f "$f" ]] && continue
    fname="$(basename "$f")"
    [[ "$fname" == "." || "$fname" == ".." || "$fname" == ".gitkeep" ]] && continue
    if [[ ! -f "$CLAUDE_DIR/runbooks/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/runbooks/$fname"
      echo "✓ .claude/runbooks/$fname 추가"
    else
      echo "  .claude/runbooks/$fname 이미 존재 — 건너뜀"
    fi
  done
  echo "✓ .claude/runbooks/ 디렉토리 생성"
fi

# integrations/ 병합
if [[ -d "$TMPDIR/.claude/integrations" ]]; then
  mkdir -p "$CLAUDE_DIR/integrations"
  for f in "$TMPDIR/.claude/integrations/"* "$TMPDIR/.claude/integrations/".*; do
    [[ ! -f "$f" ]] && continue
    fname="$(basename "$f")"
    [[ "$fname" == "." || "$fname" == ".." || "$fname" == ".gitkeep" ]] && continue
    if [[ ! -f "$CLAUDE_DIR/integrations/$fname" ]]; then
      cp "$f" "$CLAUDE_DIR/integrations/$fname"
      echo "✓ .claude/integrations/$fname 추가"
    else
      echo "  .claude/integrations/$fname 이미 존재 — 건너뜀"
    fi
  done
  echo "✓ .claude/integrations/ 디렉토리 생성"
fi

# hooks/ 덮어쓰기 (settings.json이 참조하므로 항상 최신 유지)
if [[ -d "$TMPDIR/.claude/hooks" ]]; then
  mkdir -p "$CLAUDE_DIR/hooks"
  for f in "$TMPDIR/.claude/hooks/"*; do
    fname="$(basename "$f")"
    cp "$f" "$CLAUDE_DIR/hooks/$fname"
    chmod +x "$CLAUDE_DIR/hooks/$fname"
  done
  echo "✓ .claude/hooks/ 덮어쓰기"
fi

# .gitignore 병합 (프로젝트 모드에서만)
if [[ "$GLOBAL_MODE" == false ]]; then
  if [[ ! -f "$TARGET/.gitignore" ]]; then
    cp "$TMPDIR/.gitignore" "$TARGET/.gitignore"
    echo "✓ .gitignore 복사"
  else
    added=0
    while IFS= read -r line; do
      [[ -z "$line" || "$line" == \#* ]] && continue
      if ! grep -qxF "$line" "$TARGET/.gitignore" 2>/dev/null; then
        echo "$line" >> "$TARGET/.gitignore"
        ((added++))
      fi
    done < "$TMPDIR/.gitignore"
    echo "✓ .gitignore 병합 (${added}개 항목 추가)"
  fi
fi

echo ""
if [[ "$GLOBAL_MODE" == true ]]; then
  echo "완료! 전역 Claude Code 환경이 세팅되었습니다."
  echo ""
  echo "  ~/.claude/CLAUDE.md      — 글로벌 가이드"
  echo "  ~/.claude/STATE.md       — 현재 상태"
  echo "  ~/.claude/TODO.md        — 오늘의 작업 (Jira 동기화)"
  echo "  ~/.claude/CONTEXT.md     — 컨텍스트"
  echo "  ~/.claude/settings.json  — 설정"
else
  echo "완료! $TARGET 에 Claude Code 환경이 세팅되었습니다."
  echo ""
  echo "  CLAUDE.md              — 세션 가이드"
  echo "  .claude/STATE.md       — 현재 상태 (수정 필요)"
  echo "  .claude/TODO.md        — 오늘의 작업 (Jira 동기화)"
  echo "  .claude/CONTEXT.md     — 프로젝트 컨텍스트 (수정 필요)"
  echo "  .claude/endpoints/     — 엔드포인트 관리"
fi
