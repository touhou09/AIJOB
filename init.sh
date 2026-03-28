#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="https://github.com/touhou09/AIJOB.git"

usage() {
  echo "Usage: $0 <target-directory> [branch]"
  echo ""
  echo "  target-directory  .claude/ 구조를 세팅할 프로젝트 경로"
  echo "  branch            AIJOB 브랜치 (기본: master)"
  echo ""
  echo "Examples:"
  echo "  $0 ~/projects/my-app"
  echo "  $0 ~/projects/my-app work"
  echo "  $0 ~/projects/my-app personal"
  exit 1
}

[[ $# -lt 1 ]] && usage

TARGET="$(realpath "$1")"
BRANCH="${2:-master}"

if [[ ! -d "$TARGET" ]]; then
  echo "Error: $TARGET 디렉토리가 존재하지 않습니다."
  exit 1
fi

if [[ -d "$TARGET/.claude" ]]; then
  echo "Warning: $TARGET/.claude 이미 존재합니다."
  read -rp "덮어쓸까요? (y/N): " confirm
  [[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 0
  rm -rf "$TARGET/.claude"
fi

# 임시 디렉토리에 해당 브랜치 클론
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "[$BRANCH] 브랜치에서 템플릿 가져오는 중..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMPDIR" 2>/dev/null

# .claude/ 구조 복사
cp -r "$TMPDIR/.claude" "$TARGET/.claude"

# CLAUDE.md 복사 (없을 때만)
if [[ ! -f "$TARGET/CLAUDE.md" ]]; then
  cp "$TMPDIR/CLAUDE.md" "$TARGET/CLAUDE.md"
else
  echo "CLAUDE.md 이미 존재 — 건너뜀"
fi

# .gitignore 병합 (없으면 복사, 있으면 누락 항목만 추가)
if [[ ! -f "$TARGET/.gitignore" ]]; then
  cp "$TMPDIR/.gitignore" "$TARGET/.gitignore"
else
  while IFS= read -r line; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    grep -qxF "$line" "$TARGET/.gitignore" 2>/dev/null || echo "$line" >> "$TARGET/.gitignore"
  done < "$TMPDIR/.gitignore"
  echo ".gitignore 병합 완료"
fi

# policy/ 디렉토리는 복사하지 않음 (원본 레포에만 유지)
rm -rf "$TARGET/.claude/policy"

# 프로젝트 이름으로 플레이스홀더 치환
PROJECT_NAME="$(basename "$TARGET")"
if [[ -f "$TARGET/CLAUDE.md" ]]; then
  sed -i "s/{프로젝트명}/$PROJECT_NAME/g" "$TARGET/CLAUDE.md"
fi

echo ""
echo "완료! $TARGET 에 Claude Code 환경이 세팅되었습니다."
echo ""
echo "  CLAUDE.md          — 세션 가이드"
echo "  .claude/STATE.md   — 현재 상태 (수정 필요)"
echo "  .claude/CONTEXT.md — 프로젝트 컨텍스트 (수정 필요)"
echo ""
echo "다음 단계: CONTEXT.md에 프로젝트 목적과 기술 스택을 정의하세요."
