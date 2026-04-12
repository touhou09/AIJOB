# LLM Wiki 운영 규칙

## 핵심 원칙
- LLM Wiki 패턴 (Karpathy): raw → wiki → schema 3-layer
- raw/ 파일은 불변 — 수정 금지
- 모든 위키 페이지는 YAML frontmatter + 최소 2개 [[wikilinks]] 필수
- 태그는 SCHEMA.md 택소노미에서만 사용

## 저장 위치
- Wiki: `~/llm-wiki` (WIKI_PATH)
- Memvid 인덱스: `~/.memvid_mcp/llm-wiki.mv2` (시맨틱 검색)
- MCP: `memvid-mcp-server` (Hermes 프로필별 `mcp_servers.memvid` 등록)
- MECE 디렉토리: specs/ tech/ projects/ people/ streams/ + comparisons/ concepts/ entities/ queries/ raw/

## ingest 절차
1. 소스 캡처 → raw/ 저장
2. 기존 페이지 검색 (중복 방지)
3. 엔티티/컨셉 페이지 생성/업데이트
4. index.md 갱신 + log.md append

## query 절차
1. index.md에서 관련 페이지 식별
2. 100+ 페이지 시 search_files로 추가 검색
3. 관련 페이지 읽고 종합 답변
4. 유의미한 답변은 queries/ 또는 comparisons/에 저장

## lint 기준
- 고아 페이지 (인바운드 링크 0건)
- 깨진 wikilinks
- index.md 누락
- frontmatter 불완전
- 90일 이상 미갱신 페이지
- 200줄 초과 페이지 (분할 대상)

## 금지
- raw/ 파일 수정
- SCHEMA.md 택소노미에 없는 태그 사용
- frontmatter 없는 페이지 생성
- 인바운드 링크 없는 고립 페이지 생성
