# LLM Wiki 연동

> 최종 업데이트: 2026-04-09

---

## 개요
Karpathy의 LLM Wiki 패턴 기반 지식 관리. Obsidian Vault + Memvid MCP 병행.

## 경로
- Wiki: `~/wiki` (`WIKI_PATH` 환경변수)
- Obsidian Vault: 동일 경로 (`OBSIDIAN_VAULT_PATH`)

## 구조 (3-Layer)

```
~/wiki/
├── SCHEMA.md           # 도메인/컨벤션/태그 정의
├── index.md            # 콘텐츠 카탈로그
├── log.md              # 액션 로그 (append-only)
├── raw/                # Layer 1: 소스 (불변)
│   ├── articles/
│   ├── papers/
│   └── assets/
├── entities/           # Layer 2: 엔티티 페이지
├── concepts/           # Layer 2: 컨셉 페이지
├── comparisons/        # Layer 2: 비교 분석
└── queries/            # Layer 2: 질의 결과
```

## Hermes 스킬
- `llm-wiki`: 빌트인, ingest/query/lint 지원
- `obsidian`: 빌트인, Vault 읽기/쓰기/검색
- 두 스킬의 경로를 동일하게 설정

## Memvid 연동
- MCP 서버로 연결 (Hermes config.yaml의 mcp_servers.memvid)
- 시맨틱 검색: `mcp_memvid_search_memory`
- 구조화 브라우징: Obsidian + `[[wikilinks]]`

## 운영 규칙
- raw/ 파일은 불변 — 수정 금지
- 모든 위키 페이지는 YAML frontmatter 필수
- 태그는 SCHEMA.md 택소노미에서만 사용
- 페이지 200줄 초과 시 분할
- log.md 500줄 초과 시 로테이션
