# API Specification

## 1. 개요
- 본 문서는 Next.js Route Handlers 기준 API 초안을 정의한다.
- 모든 API는 서버에서 Firebase Auth 토큰을 검증한 뒤 처리한다.
- Firestore 직접 접근은 서버 API를 통해 통제한다.

## 2. 공통 원칙
- Base Path: `/api`
- 인증 필요 API는 Bearer 토큰 또는 서버 세션 검증이 필요하다.
- 응답 형식은 일관된 JSON 구조를 유지한다.

기본 응답 예시:

```json
{
  "success": true,
  "message": "ok",
  "data": {}
}
```

오류 응답 예시:

```json
{
  "success": false,
  "message": "validation failed",
  "errors": {
    "name": "required"
  }
}
```

## 3. 품목 API

### 3.1 GET /api/items
- 목적: 품목 목록 조회
- Query:
  - `search`
  - `barcode`
  - `limit`
  - `cursor`
- 반환:
  - 품목 배열
  - 다음 페이지 cursor

### 3.2 POST /api/items
- 목적: 신규 품목 등록
- Body:
  - `name`
  - `barcode`
  - `defaultUnit`
  - `memo`
- 처리:
  - 품목 문서 생성
  - 필요 시 초기 inventory 생성

### 3.3 GET /api/items/{itemId}
- 목적: 품목 상세 조회

### 3.4 PATCH /api/items/{itemId}
- 목적: 품목 수정
- 주의:
  - `name`, `barcode` 변경 시 inventories 반영 여부 검토 필요

### 3.5 DELETE /api/items/{itemId}
- 목적: 품목 비활성화 또는 삭제
- 권장:
  - 실제 삭제보다 `isActive = false` 처리 우선

## 4. 위치 API

### 4.1 GET /api/locations
- 목적: 위치 목록 조회

### 4.2 POST /api/locations
- 목적: 위치 등록

### 4.3 PATCH /api/locations/{locationId}
- 목적: 위치 수정

### 4.4 DELETE /api/locations/{locationId}
- 목적: 위치 삭제 또는 비활성화
- 주의:
  - 연결된 inventory 존재 여부 검증 필요

## 5. 재고 API

### 5.1 GET /api/inventories
- 목적: 재고 목록 조회
- Query:
  - `search`
  - `locationId`
  - `barcode`
  - `limit`
  - `cursor`

### 5.2 GET /api/inventories/{inventoryId}
- 목적: 특정 재고 상세 조회

### 5.3 POST /api/inventory-adjustments
- 목적: 재고 수량 조정
- Body:
  - `itemId`
  - `locationId`
  - `changeType`
  - `quantity`
  - `reason`
- 처리:
  - inventory 수량 갱신
  - adjustment 이력 저장

## 6. 바코드 API

### 6.1 POST /api/barcodes/resolve
- 목적: 바코드로 기존 품목 존재 여부 확인
- Body:
  - `barcode`
- 반환:
  - 기존 품목 존재 여부
  - 존재 시 연결된 item 또는 inventory 정보

### 6.2 POST /api/barcodes/link
- 목적: 품목에 바코드 연결
- Body:
  - `itemId`
  - `barcode`

## 7. 대시보드 API

### 7.1 GET /api/dashboard/summary
- 목적: 대시보드 요약 정보 조회
- 반환 예시:
  - 총 품목 수
  - 총 위치 수
  - 재고 0개 품목 수
  - 최근 수정 이력

## 8. 인증 API 방향
- Firebase Auth 자체를 사용하므로 별도 회원가입 API는 필수가 아니다.
- 필요 시 사용자 프로필 동기화용 API를 둔다.

### 8.1 POST /api/users/sync
- 목적: 로그인 후 사용자 문서 생성 또는 동기화

## 9. 구현 원칙
- 쓰기 API는 가능하면 서버에서 트랜잭션 또는 일관성 있는 순차 처리로 구현한다.
- 재고 수량 변경과 이력 기록은 같은 요청에서 함께 완료되어야 한다.
- 응답에는 프론트에서 바로 반영 가능한 최소 데이터 집합을 포함한다.
