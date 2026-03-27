# Firestore Data Model

## 1. 개요
- 본 문서는 재고관리 시스템의 Firestore 데이터 모델 초안을 정의한다.
- Firestore는 문서 기반 데이터베이스이므로 관계형 정규화보다 조회 효율과 구현 단순성을 우선한다.
- 목록 조회 성능을 위해 일부 필드는 중복 저장할 수 있다.

## 2. 컬렉션 구성
- `items`
- `locations`
- `inventories`
- `inventory_adjustments`
- `users`

## 3. 컬렉션 상세

### 3.1 items
- 목적: 품목의 기본 정보를 저장한다.
- 문서 ID: `itemId`
- 주요 필드:
  - `name`: string
  - `barcode`: string | null
  - `defaultUnit`: string
  - `memo`: string | null
  - `isActive`: boolean
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp
  - `createdBy`: string | null
  - `updatedBy`: string | null

예시:

```json
{
  "name": "우유",
  "barcode": "8800000000001",
  "defaultUnit": "개",
  "memo": "냉장 보관",
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "createdBy": "user_1",
  "updatedBy": "user_1"
}
```

### 3.2 locations
- 목적: 냉장고, 창고, 선반 등 보관 위치 정보를 저장한다.
- 문서 ID: `locationId`
- 주요 필드:
  - `name`: string
  - `type`: string
  - `description`: string | null
  - `isActive`: boolean
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

예시:

```json
{
  "name": "냉장고 A-1",
  "type": "fridge",
  "description": "주방 냉장 구역",
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### 3.3 inventories
- 목적: 품목별 현재 재고 상태를 저장한다.
- 문서 ID: 권장 형식 `itemId_locationId`
- 주요 필드:
  - `itemId`: string
  - `itemName`: string
  - `barcode`: string | null
  - `locationId`: string
  - `locationName`: string
  - `quantity`: number
  - `unit`: string
  - `updatedAt`: Timestamp
  - `updatedBy`: string | null

설계 원칙:
- 목록 조회가 많으므로 `itemName`, `barcode`, `locationName`을 중복 저장한다.
- 품목명이나 위치명이 바뀌면 관련 inventory 문서도 함께 갱신해야 한다.

예시:

```json
{
  "itemId": "item_milk",
  "itemName": "우유",
  "barcode": "8800000000001",
  "locationId": "loc_fridge_a1",
  "locationName": "냉장고 A-1",
  "quantity": 12,
  "unit": "개",
  "updatedAt": "serverTimestamp",
  "updatedBy": "user_1"
}
```

### 3.4 inventory_adjustments
- 목적: 재고 변경 이력을 저장한다.
- 문서 ID: auto ID
- 주요 필드:
  - `itemId`: string
  - `itemName`: string
  - `locationId`: string
  - `locationName`: string
  - `beforeQuantity`: number
  - `afterQuantity`: number
  - `changeType`: string
  - `reason`: string | null
  - `createdBy`: string | null
  - `createdAt`: Timestamp

`changeType` 예시:
- `create`
- `increase`
- `decrease`
- `manual_edit`
- `delete`

예시:

```json
{
  "itemId": "item_milk",
  "itemName": "우유",
  "locationId": "loc_fridge_a1",
  "locationName": "냉장고 A-1",
  "beforeQuantity": 10,
  "afterQuantity": 12,
  "changeType": "increase",
  "reason": "입고 반영",
  "createdBy": "user_1",
  "createdAt": "serverTimestamp"
}
```

### 3.5 users
- 목적: 사용자 기본 정보를 저장한다.
- 문서 ID: Firebase Auth UID 사용 권장
- 주요 필드:
  - `email`: string
  - `name`: string
  - `role`: string
  - `isActive`: boolean
  - `createdAt`: Timestamp
  - `updatedAt`: Timestamp

## 4. 조회 패턴 기준

### 4.1 자주 발생하는 조회
- 전체 재고 목록 조회
- 위치별 재고 조회
- 바코드로 품목 조회
- 품목 상세 조회
- 재고 변경 이력 조회

### 4.2 조회 최적화 원칙
- 목록 화면에서 필요한 필드는 한 문서에서 바로 읽을 수 있게 유지한다.
- 조인 대신 중복 저장을 허용한다.
- 변경 이력은 append-only 성격으로 관리한다.

## 5. 인덱스 고려사항
- `inventories`: `locationId + updatedAt`
- `inventories`: `itemName`
- `inventories`: `barcode`
- `inventory_adjustments`: `itemId + createdAt`
- `inventory_adjustments`: `locationId + createdAt`

## 6. 문서 ID 규칙
- `items`: auto ID 또는 의미 있는 slug ID
- `locations`: auto ID 또는 의미 있는 위치 코드
- `inventories`: `itemId_locationId`
- `inventory_adjustments`: auto ID
- `users`: Firebase Auth UID

## 7. 주의사항
- Firestore는 관계형 조인이 없으므로, 쓰기 시점의 데이터 동기화 전략이 중요하다.
- 품목명/위치명 변경 시 중복 저장된 필드를 함께 갱신해야 한다.
- 재고 수량 변경과 이력 저장은 가능한 한 하나의 서버 로직에서 함께 처리해야 한다.
