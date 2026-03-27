# Inventory Management Technical Stack

## 1. 개요
- 본 문서는 재고관리 시스템의 최종 기술 스택과 역할 분리를 명시한다.
- 본 프로젝트는 `Firebase Auth + Firestore + Cloud Run + Next.js` 조합을 기준으로 한다.
- 데이터 저장소는 `Firestore`를 사용하며, `Prisma` 등 ORM은 사용하지 않는다.

## 2. 최종 기술 스택

### 2.1 프론트엔드
- `Next.js`
- `React`
- `TypeScript`
- `TanStack Query (React Query)`
- `Zustand`
- `React Hook Form`

### 2.2 백엔드 / 서버
- `Next.js Route Handlers`
- `Firebase Admin SDK`

### 2.3 인증 / 데이터
- `Firebase Authentication`
- `Cloud Firestore`

### 2.4 인프라 / 배포
- `Google Cloud Run`
- `Google Cloud Artifact Registry`

## 3. 기술 선택 기준

### 3.1 Next.js
- 프론트엔드와 API를 하나의 애플리케이션에서 함께 관리하기 위해 사용한다.
- App Router 기반으로 화면과 서버 로직을 통합 관리한다.

### 3.2 Firestore
- 초기 개발 속도와 Firebase 연동 편의성을 고려해 메인 데이터 저장소로 사용한다.
- 문서 기반 구조를 사용하며, 품목/재고/위치/이력 데이터를 컬렉션 단위로 관리한다.

### 3.3 ORM 미사용
- Firestore는 관계형 데이터베이스가 아니므로 일반적인 ORM 사용 구조와 맞지 않는다.
- 데이터 접근은 `Firebase Admin SDK`와 서비스/리포지토리 레이어를 통해 처리한다.

### 3.4 React Query
- 서버 상태 조회, 캐싱, 동기화, mutation 관리를 담당한다.
- 품목 목록, 위치 목록, 재고 목록, 상세 조회 등의 데이터 패칭에 사용한다.

### 3.5 Zustand
- 클라이언트 전역 UI 상태를 관리한다.
- 예: 필터 상태, 선택된 위치, 모달 상태, 스캔 UI 상태

## 4. 아키텍처 원칙

### 4.1 API 구성
- 클라이언트는 직접 Firestore에 쓰기보다 `Next.js Route Handlers`를 통해 서버 API를 호출한다.
- 서버는 인증 검증 후 Firestore에 접근한다.

### 4.2 데이터 접근 방식
- 클라이언트 인증 정보는 Firebase Auth를 사용한다.
- 서버 데이터 처리는 `Firebase Admin SDK`를 통해 수행한다.
- Firestore 접근 코드는 기능별 리포지토리 또는 서비스 파일로 분리한다.

### 4.3 배포 방식
- Next.js 애플리케이션은 컨테이너 이미지로 빌드하여 Cloud Run에 배포한다.
- Cloud Run 서비스는 초기 기준 1개로 운영한다.
- 새 배포 시 동일 서비스 내에서 새 revision을 생성한다.

## 5. 권장 프로젝트 구조

```text
app/
  api/
  (routes)/
components/
hooks/
  queries/
lib/
  firebase/
    client.ts
    admin.ts
  firestore/
    items.repository.ts
    inventories.repository.ts
    locations.repository.ts
stores/
types/
```

## 6. 상태관리 기준

### 6.1 React Query 담당 범위
- 목록 조회
- 상세 조회
- 생성 / 수정 / 삭제 mutation
- 서버 캐시 무효화 및 재조회

### 6.2 Zustand 담당 범위
- 검색 UI 상태
- 선택된 필터 값
- 모달 open/close
- 스캔 화면의 임시 상태

## 7. 데이터 모델 방향
- `items`: 품목 기본 정보
- `locations`: 보관 위치 정보
- `inventories`: 위치별 현재 재고
- `inventory_adjustments`: 재고 변경 이력
- `users`: 사용자 정보 또는 역할 정보

## 8. 최종 결정 사항
- 메인 프레임워크는 `Next.js`를 사용한다.
- 인증은 `Firebase Authentication`을 사용한다.
- 데이터 저장소는 `Firestore`를 사용한다.
- ORM은 사용하지 않는다.
- 서버 상태관리는 `React Query`를 사용한다.
- 클라이언트 전역 상태관리는 `Zustand`를 사용한다.
- 배포는 `Cloud Run`을 사용한다.
