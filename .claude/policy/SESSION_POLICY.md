# 세션 정책

> 모든 ingkle 저장소에 적용되는 Claude Code 세션 운영 정책

## Tier 구조 (컨텍스트 로딩)

| Tier | 로딩 시점 | 대상 |
|------|----------|------|
| **1 — Hot** | 매 세션 자동 | `CLAUDE.md`, `.claude/STATE.md` |
| **2 — Warm** | 작업 시작 시 | `.claude/CONTEXT.md`, `.claude/DECISIONS.md` |
| **3 — Cold** | 해당 카테고리 작업 시 | `.claude/work/{category}.md`, `docs/` |

## 세션 시작 절차

1. `CLAUDE.md` 자동 로드 (Claude Code 기본 동작)
2. `.claude/STATE.md` 읽고 현재 상태 파악
3. 사용자 요청에 해당하는 카테고리의 `.claude/work/{category}.md` 로드
4. 필요 시 Warm 계층 참조

## 세션 종료 판단 흐름

```
작업 완료
  │
  ├─ 코드에서 유추 가능한 내용인가?
  │    └─ Yes → 기록 안 함
  │
  └─ No (기록 대상)
       │
       ├─ 이전과 동일 작업?
       │    ├─ 새 이슈 없음 → STATE.md만 갱신
       │    └─ 새 트러블슈팅 → work/troubleshooting.md append + docs/ 문서 작성
       │
       └─ 새 작업 계열
            ├─ 해당 카테고리 파일 존재 → append
            └─ 미존재 → 새 카테고리 파일 생성 + CLAUDE.md 인덱스 갱신
            + STATE.md 갱신
```

## 기록 기준

### 기록하는 것
- 변경한 파일과 변경 내용 (재현 가능한 수준)
- 사용한 명령어/패턴
- 미완료 사항과 이유
- 발견한 이슈/주의사항

### 기록하지 않는 것
- 코드를 읽으면 알 수 있는 내용
- git log/blame으로 확인 가능한 내용
- 이전 기록과 중복되는 내용

## 지식 문서화 (docs/)

작업 재현이 아닌 **지식 공유** 목적의 내용은 `docs/`에 md로 작성:
- 트러블슈팅 가이드
- 운영 노하우
- 설정 방법/패턴
- 이 문서들은 Confluence 등 외부 문서화의 소스로 사용됨
