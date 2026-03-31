# Result 2

## 이번 반영 범위

### 1. 그룹 / 초대 흐름
- 그룹 이름은 전역 중복 금지가 아니라 `사용자별 최대 5개` 기준으로 동작하도록 변경
  - 다른 사용자가 같은 이름의 그룹을 만들어도 별도 그룹으로 생성됨
  - 같은 사용자가 같은 이름을 다시 만들면 중복으로 막힘
- 초대 코드 생성은 기존처럼 중복 검사 후 발급 유지
- 초대 코드로 가입 요청할 때 `같은 사용자 + 같은 초대 코드` 조합은 한 번만 신청 가능하도록 제한
- 그룹 관련 오류 메시지를 한국어로 응답하도록 정리

### 2. 카카오톡 초대 공유
- 그룹 화면에 `카카오톡으로 초대하기` 버튼 추가
- 문구:
  - `정리합니다 웹 서비스로 초대합니다!`
  - `OOO님과 함께 정리해봐요!`
- Kakao JS SDK를 앱 레이아웃에서 로드하도록 추가
- `NEXT_PUBLIC_KAKAO_JS_KEY`가 없거나 SDK를 못 쓰는 환경에서는
  - `navigator.share`
  - 또는 초대 링크 복사
  순서로 자연스럽게 fallback 처리

### 3. 한글 오류 메시지
- Node API의 주요 에러 응답을 한국어로 전환
- Firebase 로그인 관련 대표 오류도 프런트에서 한국어로 매핑
  - 허용되지 않은 도메인
  - 팝업 차단 / 팝업 닫힘
  - 잘못된 자격 증명
  - 중복 이메일
  - 약한 비밀번호
  - 네트워크 오류

### 4. 이력 / 품목 생성
- 품목 생성 시 이력은 계속 남기되, 프런트에서 생성 직후 `ledger-feed`도 무효화하도록 수정
- 그래서 품목 생성 직후 이력 화면과 최근 변경 알림에 더 빨리 반영됨

### 5. 보관 위치 / 거래처 CRUD
- 활성 API에 아래 엔드포인트 추가
  - `POST /locations/update`
  - `POST /locations/delete`
  - `POST /counterparties/update`
  - `POST /counterparties/delete`
- 위치 목록은 `isActive === true`만 노출되도록 정리
- 거래처도 soft delete 방식으로 비활성화
- 위치/거래처 화면을 생성 전용에서 CRUD 화면으로 변경
  - 수정
  - 삭제
  - 수정 취소

### 6. 발주 메모 / 날짜별 확인
- 우측 발주 메모 카드의 날짜 배지를 클릭하면 달력 패널이 열리도록 변경
- 선택 날짜에 따라 메모 내용이 바뀌고 바로 확인 가능
- 메모 하단에 작성/수정한 사용자와 시간 표기
  - `이름 · 수정시각`
- 캘린더 보드는 기존 화면에서도 메모 작성자/수정시각을 함께 표시

### 7. 모바일 하단 메뉴
- 모바일 quickdock을 5개만 노출하도록 정리
  - 재고
  - 품목추가
  - 스캔
  - 이력
  - 그룹
- 우하단에 `메뉴 열기 / 메뉴 숨김` 토글 버튼 추가
- 데스크톱 레일 7개는 그대로 유지

### 8. 알림 기능
- 상단 벨 알림을 정적 목업이 아니라 실제 데이터 기반으로 연결
- 현재 반영된 알림 소스
  - 저재고 알림
  - 가입 요청 대기
  - 최근 재고 변경 이력

## 수정 파일

- `services/api/src/index.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/app-shell.tsx`
- `apps/web/src/components/auth-session-provider.tsx`
- `apps/web/src/components/screens/workspace-groups-view.tsx`
- `apps/web/src/components/screens/storage-map-view.tsx`
- `apps/web/src/components/screens/item-create-view.tsx`
- `apps/web/src/components/stock-insight-rail.tsx`
- `apps/web/src/components/schedule-board.tsx`
- `apps/web/src/hooks/queries/use-low-stock-alerts.ts`
- `apps/web/src/hooks/queries/use-ledger-feed.ts`

## 검증 결과

### API
```bash
npm run typecheck
npm run build
```

실행 위치:
```bash
services/api
```

결과:
- 성공

### Web
```bash
npm run build
```

실행 위치:
```bash
apps/web
```

결과:
- 성공

## 운영 시 확인할 것

### 카카오 공유
- 실제 카카오톡 공유를 쓰려면 웹 환경 변수 필요
  - `NEXT_PUBLIC_KAKAO_JS_KEY`
- Kakao Developers 쪽에 현재 웹 도메인이 등록되어 있어야 함

### 위치 / 거래처 삭제
- 현재는 soft delete 기반
- 과거 이력 데이터는 유지되고, 신규 UI 목록에서만 숨김 처리됨

### 알림
- 지금은 실시간 푸시가 아니라 `조회 기반 인앱 알림`
- 벨 메뉴를 열 때 보이는 형태이며, 브라우저 푸시/FCM은 이번 범위에 포함되지 않음
