# Result

## 오늘 반영한 것

### 1. Firebase / Cloud Run

- Firebase Auth authorized domains에 아래 도메인 추가
  - `inventory-web-478791070948.asia-northeast3.run.app`
- Cloud Run 재배포 완료
  - `inventory-api` -> revision `inventory-api-00003-nhr`
  - `inventory-web` -> revision `inventory-web-00002-dfq`
- 현재 서비스 URL
  - Web: `https://inventory-web-478791070948.asia-northeast3.run.app`
  - API: `https://inventory-api-478791070948.asia-northeast3.run.app`

### 2. Spring Boot + JPA 대체 API 초안 추가

- 새 모듈 경로
  - `services/api-spring`
- 빌드 도구
  - Maven
- 런타임
  - Java 17
- 기본 포트
  - `2002`
- 기본 DB
  - H2 file mode
- 인증
  - Firebase Bearer token 검증 유지

### 3. 추가된 주요 파일

- `services/api-spring/pom.xml`
- `services/api-spring/src/main/resources/application.yml`
- `services/api-spring/src/main/java/com/inventory/management/api/...`
- `services/api-spring/Dockerfile`
- `services/api-spring/README.md`

## Spring API에서 구현해 둔 범위

- `/health`
- `/users/sync`
- `/me`
- `/groups/*`
  - mine, members, join-requests, create, delete, join, select, invite-code regenerate, role update, approve, reject
- `/dashboard/summary`
- `/inventories`
- `/locations`
- `/counterparties`
- `/alerts/low-stock`
- `/history`
- `/items`
- `/items/{itemId}`
- `/items/{itemId}/snapshot`
- `/inventory-adjustments`
- `/barcodes/resolve`
- `/planner/*`
  - summary, tasks create/toggle, memos upsert

## 빌드 확인 결과

- compile 성공
  - `mvn -f services/api-spring/pom.xml -DskipTests compile`
- package 성공
  - `mvn -f services/api-spring/pom.xml -DskipTests package`
- 산출물
  - `services/api-spring/target/api-spring-0.1.0.jar`

## 바로 실행할 때

```bash
mvn -f services/api-spring/pom.xml spring-boot:run
```

또는

```bash
java -jar services/api-spring/target/api-spring-0.1.0.jar
```

## 내일 검토할 포인트

- 현재 Spring 초안은 기존 Node API의 응답 shape와 경로를 맞추는 데 집중함
- DB는 H2로 붙어 있으므로 실제 전환 전에는 PostgreSQL 같은 운영 DB로 바꿔야 함
- Firestore 데이터 -> RDB 마이그레이션 스크립트는 아직 없음
- JPA 엔티티는 빠른 검토용으로 단순 문자열 FK 구조를 사용함
- Node API와 100% 동작 일치 검증용 통합 테스트는 아직 없음

## 메모

- Docker 전역 설정에서 `credHelpers`의 `gcloud` 항목은 제거해서 `wincred`만 남김
- `services/api-spring` 아래 임시 Maven 로그 파일은 백그라운드 프로세스가 잡고 있을 수 있음
