# AIJOB 가이드

## 컨텍스트 로딩 (Tier 구조)

### Tier 1 — Hot (매 세션 자동 로드)
- 이 파일 (`CLAUDE.md`)
- `.claude/STATE.md` — 현재 진행 상태

### Tier 2 — Warm (작업 시작 시 해당 분야 로드)
- `.claude/CONTEXT.md` — 프로젝트 아키텍처
- `.claude/DECISIONS.md` — 아키텍처 결정 이력

### Tier 3 — Cold (해당 카테고리 작업 시에만 로드)
- `.claude/work/{category}.md` — 카테고리별 작업 이력

## 세션 정책

### 세션 시작
1. `.claude/STATE.md`를 읽고 현재 상태 파악
2. 사용자가 요청한 작업의 해당 카테고리 파일(`.claude/work/`)을 읽기
3. 필요 시 `.claude/CONTEXT.md`, `.claude/DECISIONS.md` 참조

### 세션 종료 (작업 완료 시 판단)
```
작업 완료
  │
  ├─ 코드에서 유추 가능한 내용인가? → 기록 안 함
  │
  └─ 기록 대상
       │
       ├─ 이전과 동일 작업 + 새 이슈 없음 → STATE.md만 갱신
       │
       ├─ 이전과 동일 작업 + 새 트러블슈팅 → work/troubleshooting.md + docs/ 문서
       │
       └─ 새 작업 계열 → 해당 work/{category}.md append + STATE.md 갱신
            │
            ├─ 해당 카테고리 파일 존재 → append
            └─ 미존재 → 새 카테고리 파일 생성 + 이 인덱스 갱신
```

### work/ 생명주기 관리
- 파일당 최대 200줄
- 150줄 초과 시 정리 트리거:
  - 완료 + 코드/git에서 유추 가능 → 삭제
  - 결정 사항 → DECISIONS.md로 이동 후 삭제
  - 미완료/진행 중 → 유지
- 200줄 초과 시 오래된 완료 항목부터 강제 삭제

### 지식 문서화
- 작업 재현이 아닌 지식 공유 목적 → `docs/`에 md 작성

## 작업 카테고리 인덱스

| 카테고리 | 파일 | 범위 |
|----------|------|------|
| 트러블슈팅 | `.claude/work/troubleshooting.md` | 장애, 버그, 예기치 않은 이슈 |

> 새 작업 계열 발생 시 카테고리 자동 추가

## 핵심 명령어
- `init-linux.sh <target> [branch]` — 타겟 프로젝트에 Claude Code 환경 복제 (Linux/WSL)
- `init-mac.sh <target> [branch]` — 타겟 프로젝트에 Claude Code 환경 복제 (macOS)
- `git checkout <branch>` — 환경 프로필 전환 (master/work/personal 등)

## 보안 규칙
- .env, credentials, API key 등 시크릿 파일 커밋 금지
- 민감 정보는 환경변수 또는 시크릿 매니저 사용

## 응답 스타일
- 한국어로 응답
- 요약 없이 바로 본론
