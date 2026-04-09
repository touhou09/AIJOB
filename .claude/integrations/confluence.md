# Confluence 연동 가이드

## 접속 정보
| 항목 | 값 |
|------|---|
| Base URL | `https://ingkle.atlassian.net/wiki` |
| 인증 | Jira와 동일 (Atlassian 통합 토큰) |
| 토큰 파일 | `~/.claude/.atlassian-token` |

## API 패턴

### 페이지 조회
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content/{PAGE_ID}?expand=body.storage"
```
응답의 `.body.storage.value`에 HTML 본문이 포함됨.

### 페이지 검색 (CQL)
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content/search?cql=space=KB+AND+type=page+AND+title~'검색어'&limit=10"
```

### Space 내 페이지 목록
```bash
curl -s -H "Authorization: Basic $AUTH" \
  "https://ingkle.atlassian.net/wiki/rest/api/content?spaceKey=KB&type=page&limit=25&expand=title"
```

## 자동화 스크립트
| 스크립트 | 역할 |
|---------|------|
| `hooks/confluence-lib.sh` | 공통 함수 (페이지 조회, 검색, HTML→텍스트 변환) |

### Claude에서 직접 사용
```bash
# 페이지 읽기
source .claude/hooks/confluence-lib.sh
confluence_fetch_page 901939485

# 검색
confluence_search "space=KB AND title~'AIJOB'"
```

## 주요 페이지
| 페이지 | ID | Space | 설명 |
|--------|-----|-------|------|
| Infra: AIJOB 세팅 | 901939485 | product | AIJOB Confluence 문서 |
| AI팀원 업무 플로우 — 에픽 6축 + KB 자동 문서화 | 913408002 | KB | 에픽 6축 + KB 문서화 정책 (AD-011, AD-012) |

> 새로운 주요 페이지 발견 시 이 테이블에 추가.

## HTML → 텍스트 변환
`confluence_fetch_page`는 자동으로 HTML 태그를 제거하고 텍스트를 반환한다.
Python3 사용 (`html` + `re` 모듈). Python 없으면 sed 폴백.

---

## KB Space 정책 (AD-012)

KB Space: `https://ingkle.atlassian.net/wiki/spaces/KB`

### KB 6개 섹션

| 섹션 | 내용 |
|------|------|
| Architecture | ADR, Design, Reference (제품별) |
| Components | 레포별 기술 문서 (API, 모듈) |
| Runbook | 장애 대응 + Postmortem |
| Study & Benchmark | 기술 검증, PoC |
| How-to | 온보딩, 반복 절차 |
| Project | 고객/과제 납품 문서 |

### 페이지 제목 규칙

- **Jira 티켓 번호를 제목에 넣지 않는다.** Jira 링크는 본문 참고 섹션에만.
- 제목 구조: `{주제} — {세부 설명}` (em dash로 구분)
  - 좋은 예: `Arroyo 파이프라인 테스트 시나리오 — MICO 기능 대체 검증`
  - 나쁜 예: `IW-334: Arroyo 기반 파이프라인 테스트 시나리오`
- 제목은 **KB 검색으로 찾을 수 있어야** 한다. 티켓 번호를 아는 사람만 찾을 수 있는 제목 금지.

### 페이지 트리 구조

섹션 바로 아래에 단건 페이지를 붙이지 않는다. **카테고리 폴더** 를 거쳐야 한다.

```
{섹션}
  └─ {카테고리}              ← 제품/레포/시스템 단위 폴더
      └─ {페이지 제목}
```

카테고리 폴더 기준:

| 섹션 | 카테고리 기준 | 예시 |
|------|-------------|------|
| Architecture | 제품명 | NAZARE, NAVIS |
| Components | 레포명 | devops, streamPlatform |
| Runbook | site 라벨 | ingkle-dev, ingkle-prod |
| Study & Benchmark | 시스템/기술명 | streamPlatform, NazareDB |
| How-to | 팀/영역 | DevOps, DataEng |
| Project | 축/프로젝트 | CUST/삼진정공-2026 |

카테고리 폴더가 없으면 **페이지 생성 시 함께 생성** 한다.

### doc:* 라벨 → KB 위치 라우팅

| 라벨 | KB 위치 | 경로 추출 근거 | 검토 |
|------|---------|---------------|------|
| `doc:adr` | Architecture/{제품}/ADR | 에픽 대상명 | 제품 리드 + CTO |
| `doc:design` | Architecture/{제품}/Design | 에픽 대상명 | 자동 게시 |
| `doc:reference` | Components/{레포} | component 필드 | 자동 게시 |
| `doc:runbook` | Runbook/site:{사이트} | site: 라벨 | 자동 게시 |
| `doc:postmortem` | Runbook/Postmortem | 고정 경로 | CTO 검토 |
| `doc:study` | Study-Benchmark/{카테고리} | 에픽 대상명 | 자동 게시 |
| `doc:howto` | How-to/{카테고리} | 에픽 대상명 | 자동 게시 |
| `doc:project` | Project/{축}/{프로젝트-연도} | 에픽명 전체 파싱 | CEO 검토 |
| `doc:skip` | 문서화 스킵 | — | — |

### 문서 작성 시 소스 참조

#### 작성 흐름

1. **소스 수집** — 아래 테이블에 따라 필수/조건부 소스를 확인
2. **기존 문서 검색** — 동일 space에서 제목/라벨 기반 검색 1회 (중복 방지)
3. **초안 작성** — 소스에서 추출한 내용을 양식 표준에 맞게 구성
4. **참고 섹션** — 참조한 소스 링크(Jira 티켓, AD 번호, 커밋, 기존 Confluence 페이지) 명시

#### 필수 소스 (항상)

| 소스 | 확인 내용 |
|------|----------|
| 대화 맥락 | 방금 논의/분석한 내용 |
| 코드/git log | 아키텍처 수준 참조 + 주요 커밋 (파일 나열 불필요) |
| 관련 Jira 티켓 | 선행/부모/하위 티켓 내용, 완료 조건, 범위 |
| 기존 Confluence 검색 | 제목/라벨 기준 중복·연관 문서 확인 |

#### 조건부 소스 (doc:* 라벨별)

| 라벨 | 추가 필수 소스 | 이유 |
|------|---------------|------|
| `doc:adr` | DECISIONS.md (AD 번호) | 기존 결정과의 정합성 |
| `doc:runbook` | work/troubleshooting.md + STATE.md | 과거 장애 맥락 + 현재 인프라 상태 |
| `doc:reference` | work/{category}.md (trap/debt 포함) + TypeScript 인터페이스/OpenAPI 스펙 | 과거 주의사항 + API 계약 |
| `doc:study` | work/{category}.md + STATE.md + DECISIONS.md | trap/debt + 전제조건 + 수치 데이터(재현용) |
| `doc:howto` | STATE.md + work/{category}.md | 현재 환경 기준 절차 |
| `doc:postmortem` | work/troubleshooting.md | 장애 타임라인, 근본 원인 |

#### work/ → KB 변환 규칙

work/은 AI 내부 메모, KB는 팀 공유용. 그대로 복사하지 않고 변환한다.

| work/ 필드 | KB 반영 위치 | 변환 방식 |
|-----------|-------------|----------|
| Trap | "주의사항" 또는 "Known Issues" | 증상→원인→해결 → "~할 때 ~하면 ~됨. 해결: ~" |
| DEBT | "제약사항" 또는 "향후 개선" | 기술 부채 내용 + 해결 조건 |
| What/Why | 배경, 결정/설계/결과 | 자연스러운 문장으로 재작성 |
| Impact | 영향/후속 | 그대로 |
| Test | 결정/설계/결과 내 검증 항목 | doc:study는 수치 필수 |

#### 크로스팀 참조

다른 팀에 영향을 주는 문서(API 변경, MQTT 스키마 변경 등)에는:
- 영향받는 **기능 단위** 명시 (예: "유사도 모니터링 대시보드", "알람 설정 페이지") — 파일 경로 아닌 기능명
- MQTT subscribe hook/service 경로는 참고용으로 포함 가능

#### 문서 대체 규칙

새 문서가 기존 문서를 대체하는 경우:
- 기존 문서 상단에 `[Superseded by: {새문서링크}]` 배너 추가
- 기존 문서 삭제 금지 — 검색으로 옛 문서에 도달하는 사람이 있음

#### 독자 기준

**현재 팀원의 빠른 참조** 우선. 신규 입사자용 온보딩은 별도 문서에서 KB를 링크하는 구조.

### 양식 표준 (5섹션 필수)

모든 KB 문서는 아래 5개 섹션을 반드시 포함:

1. **TL;DR** — 3줄 요약
2. **배경** — 왜 이 작업/결정이 필요했는지
3. **결정/설계/결과** — 무엇을 했는지
4. **영향/후속** — 이 결정/작업의 영향과 후속 작업
5. **참고** — Jira 링크, AD 번호, PR, 커밋, 기존 Confluence 페이지

### 검토 게이트

| 문서 유형 | 검토 방식 |
|----------|----------|
| Design / Reference / Runbook / Study / How-to | 자동 게시 |
| ADR | 제품 리드 + CTO 검토 |
| Postmortem | CTO 검토 |
| Project (외부 납품) | CEO 검토 |
