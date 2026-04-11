# DOR-23 Plugin worker filesystem preflight

## 결론
- 판정: direct Node.js filesystem read 가능
- capability 필요 여부: 별도 filesystem capability 없음
- 허용 범위: 현재 런타임 기준으로 plugin worker 프로세스가 실행되는 OS 사용자(`yuseungju`)의 권한 범위 안에서 홈 디렉터리 경로까지 직접 읽을 수 있음
- MVP-2 영향: `~/.hermes/skins/` 직접 스캔 방식은 기술적으로 가능. 다만 capability gate가 아니라 호스트 파일시스템 신뢰 모델에 의존하므로, 사용자 동의/경로 검증/읽기 전용 설계를 명시해야 함

## 확인 근거

### 1) SDK capability 모델에 filesystem 항목이 없음
`@paperclipai/plugin-sdk` README의 capability 표에는 다음만 정의되어 있음.
- Company: `companies.read`, `projects.read`, `issues.read`, `agents.read` 등
- Instance: `instance.settings.register`, `plugin.state.read`, `plugin.state.write`
- Runtime: `events.subscribe`, `events.emit`, `jobs.schedule`, `webhooks.receive`, `http.outbound`, `secrets.read-ref`
- Agent/UI capability들

관찰 포인트:
- capability 표(`README.md:293-333`) 어디에도 `filesystem.read`, `fs.read`, `assets.read` 같은 항목이 없음
- 같은 README의 caveat 섹션(`README.md:44-49`)은 plugin worker/UI를 현재 trusted code로 취급하고, host runtime이 writable filesystem을 기대한다고 명시함

해석:
- worker-side host APIs는 capability gate가 걸려 있지만, Node 런타임 자체의 `fs` 모듈 사용은 별도 capability 체계로 제한되지 않음
- 따라서 manifest capability는 Paperclip host API 접근 통제용이지, OS 레벨 sandbox가 아님

### 2) 실험: worker에서 `fs.readFile`로 `~/.hermes/skins/...` 직접 읽기
실험 절차:
1. 임시 probe 파일 `~/.hermes/skins/doro-probe/skin.json` 생성
2. `plugins/doro-office/src/worker/index.ts`에 일시적으로 `node:fs/promises` 기반 probe 코드 삽입
3. `npm run build`
4. `POST /api/plugins/install`로 로컬 plugin 재설치
5. Paperclip server log에서 worker 로그 확인
6. 실험 후 probe 코드 제거, plugin 재빌드/재설치, probe 파일 삭제

실험 결과:
- server log에 아래 성공 로그가 남음
- `attemptedPath=/Users/yuseungju/.hermes/skins/doro-probe/skin.json`
- `succeeded=true`
- `bytesRead=127`
- preview에 JSON 본문 일부가 기록됨

증거:
- `~/.paperclip/instances/default/logs/server.log:8922-8923`
  - `[01:34:32] INFO: [plugin] doro-office worker started ...`
  - `[01:34:32] INFO: [plugin] doro-office fs probe {"attemptedPath":"/Users/yuseungju/.hermes/skins/doro-probe/skin.json","succeeded":true,"bytesRead":127,...}`

해석:
- plugin worker가 sandbox에 막히지 않고 홈 디렉터리 아래 임의 경로를 직접 읽을 수 있었음
- 최소한 현재 single-node local Paperclip runtime에서는 `~/.hermes/skins/` 접근이 MVP-2 blocker가 아님

### 3) 실험 후 원복 확인
- worker probe 코드는 제거 후 재빌드/재설치 완료
- probe 파일 `~/.hermes/skins/doro-probe/skin.json` 삭제 완료
- 재설치 후 최신 worker 시작 로그는 남지만 `doro-office fs probe` 로그는 추가로 발생하지 않음 (`server.log:8949-8959` 구간)

## 리스크 평가

### 보안 리스크
- 현재 plugin worker는 trusted code 모델이라, 잘못 작성된 plugin이 홈 디렉터리 파일을 과도하게 읽을 수 있음
- capability 기반 최소 권한이 아니라 OS 사용자 권한을 그대로 상속하므로, “가능하다”와 “항상 해야 한다”는 다름

필수 가드레일:
- 읽기 대상 경로를 `~/.hermes/skins/` 하위로 고정
- `path.resolve` 후 prefix 검증으로 path traversal 차단
- 파일 확장자/크기 제한 (`skin.json`, 이미지 파일만)
- 쓰기/삭제 기능은 MVP-2에서 제외
- UI에 “로컬 스킨 디렉터리 읽기” 명시 및 실패 시 graceful fallback 제공

### 운영 리스크
- 로컬 path install + writable filesystem 전제는 single-node persistent deployment에 적합하고, multi-instance/cloud에서는 노드 간 파일 일관성이 없음
- 따라서 추후 cloud/다중 인스턴스 배포를 고려하면 filesystem loader는 portability가 낮음

## MVP-2 권장안
- 1안: 로컬/단일 노드 전제에서는 `~/.hermes/skins/` read-only loader 허용
- 2안: 장기적으로는 plugin state 또는 업로드 기반 asset registry로 이관 고려

현재 결정:
- MVP-2는 `~/.hermes/skins/` 직접 읽기 방식으로 진행 가능
- 단, 구현 시 보안 가드레일을 함께 넣고 “로컬 설치/단일 노드 전용” 제약을 문서화해야 함

## 블로커 여부
- 블로커 아님

## 후속 구현 체크리스트
- `skin-loader.ts`에서 `path.resolve` + 루트 prefix 검증 추가
- 허용 파일 형식/크기 제한
- directory missing / parse error / image missing 시 fallback skin 제공
- cloud 배포 전환 시 base64 업로드 또는 plugin-managed storage로 대체 여부 재검토
