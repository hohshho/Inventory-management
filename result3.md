# result3

## 이번 작업

- `services/api-spring`을 Firestore repository 방식에서 `Spring Data JPA + PostgreSQL` 구조로 전환했다.
- `services/api-spring/pom.xml`
  - `spring-boot-starter-data-jpa` 추가
  - `postgresql` 드라이버 추가
  - Firestore repository 전환 때 임시로 남아 있던 의존성 정리
- `services/api-spring/src/main/resources/application.yml`
  - `spring.datasource.*` 추가
  - `spring.jpa.hibernate.ddl-auto=update` 추가
  - Supabase PostgreSQL 접속용 JDBC URL 반영
- `services/api-spring/src/main/java/com/inventory/management/api/config/FirebaseAdminConfig.java`
  - Firestore bean 제거
  - Firebase Auth 검증용 `FirebaseApp`, `FirebaseAuth`만 유지
- `services/api-spring/src/main/java/com/inventory/management/api/repository/*`
  - Firestore 구현 클래스를 전부 `JpaRepository` 인터페이스로 교체
- `services/api-spring/src/main/java/com/inventory/management/api/service/AccessService.java`
  - Firestore 시절 `findById((Object) ...)`, `save((Object) ...)` 호출을 JPA 호출로 정리
- `services/api-spring/src/main/java/com/inventory/management/api/service/OperationsService.java`
  - 동일하게 JPA 호출 형태로 정리
- `services/api-spring/src/main/java/com/inventory/management/api/model/GroupEntity.java`
  - 사용자별로 같은 그룹명을 허용하기 위해 `nameKey`의 전역 unique 제약 제거
- `services/api-spring/src/main/java/com/inventory/management/api/repository/FirestoreRepositorySupport.java`
  - 삭제

## 검증 결과

- 성공
  - `mvn -B -f services/api-spring/pom.xml -DskipTests compile`
  - `mvn -B -f services/api-spring/pom.xml -DskipTests package`
- 실패
  - 1차 로컬 기동 테스트
  - 원인: direct host `db.cfzkwtlgadwgctrbnvsa.supabase.co` 가 현재 환경에서 `UnknownHostException` 발생

## 접속 정보 수정

- `postgrsql.md`를 direct host에서 Supabase pooler host로 갱신했다.
- 현재 반영한 기본 datasource 값
  - host: `aws-1-ap-northeast-2.pooler.supabase.com`
  - port: `5432`
  - database: `postgres`
  - user: `postgres.cfzkwtlgadwgctrbnvsa`

## 2차 검증 결과

- 성공
  - pooler 정보 기준 로컬 기동 성공
  - HikariCP PostgreSQL 연결 성공
  - JPA EntityManager 초기화 성공
  - `/health` 요청 유입 확인

## 현재 상태

- `api-spring`은 이제 `Firebase Auth + PostgreSQL(JPA)` 조합으로 기동 가능한 상태다.
- Cloud Run `inventory-api`에 JPA 버전을 재배포했다.
  - revision: `inventory-api-00008-qmb`
  - url: `https://inventory-api-478791070948.asia-northeast3.run.app`
  - health: `200`, `{"status":"ok"}`
- 기존 Node API 삭제는 배포 후 실제 기능 parity 확인 뒤 진행하는 게 안전하다.

## 실서비스 스모크 테스트

- Firebase custom token 기반 테스트 사용자 2명으로 보호 엔드포인트를 직접 호출했다.
- 확인 완료
  - `/users/sync`
  - `/me`
  - `/groups`
  - `/groups/mine`
  - `/groups/join`
  - `/groups/join-requests`
  - `/groups/join-requests/approve`
  - `/groups/members`
  - `/groups/select`
  - `/locations`
  - `/counterparties`
  - `/items`
  - `/items/{id}`
  - `/inventories`
  - `/history`
  - `/barcodes/resolve`
  - `/dashboard/summary`
  - `/alerts/low-stock`
  - `/planner/tasks`
  - `/planner/memos`
  - `/planner/summary`
  - `/planner/tasks/toggle`
- 확인 결과
  - 그룹 생성 정상
  - 초대코드 가입 요청 정상
  - 오너 승인 후 멤버십 생성 정상
  - 위치 생성 정상
  - 거래처 생성 정상
  - 품목 생성 정상
  - 재고 생성 정상
  - 품목 생성 이력 기록 정상
  - 바코드 조회 정상
  - 대시보드 집계 정상
  - 플래너 작업/메모 생성 정상

## 메모

- PowerShell의 `Invoke-RestMethod`가 배열 응답을 단일 결과일 때 `value/Count` 형태로 감싸 보여서 처음에 그룹 승인 결과를 잘못 읽었다.
- 실제 API 응답 기준으로는 그룹 승인 후 멤버 2명 확인까지 정상이다.

## Node API 정리

- 루트 `package.json`의 개발/빌드 스크립트를 Spring 기준으로 변경했다.
- 기존 `services/api` Node 백엔드는 더 이상 운영 경로에 쓰지 않으므로 제거 대상으로 판단했다.
- `services/api` 디렉터리 삭제 완료
- `pnpm-lock.yaml`, `package-lock.json` 갱신 완료
- 삭제 전 확인 근거
  - Cloud Run `inventory-api`가 Spring/JPA 버전으로 배포 완료
  - 주요 인증/그룹/재고/이력/플래너 스모크 테스트 완료

## 삭제 후 검증

- `npm run typecheck` 성공
- `npm run build` 성공
  - web: Next.js production build 성공
  - api: `mvn -f services/api-spring/pom.xml -DskipTests package` 성공

## 현재 판단

- 코드 기준 JPA 전환은 완료됐다.
- 하지만 Supabase 연결이 아직 실제로 열리지 않아서 운영 교체 완료 상태는 아니다.
- 그래서 기존 `services/api` Node API는 아직 삭제하지 않았다.
- 삭제 기준:
  - Spring API가 PostgreSQL에 정상 기동
  - `/health`, `/me`, `/groups/*`, `/items`, `/inventories`, `/history`, `/planner/*` 실동작 확인
  - 웹과 실제 연동 확인

## 다음으로 필요한 것

- Supabase에서 direct host 대신 실제 접속 가능한 connection string 또는 pooler host 확인
- 필요하면 아래 형태로 교체
  - `SPRING_DATASOURCE_URL`
  - `SPRING_DATASOURCE_USERNAME`
  - `SPRING_DATASOURCE_PASSWORD`
- 연결 확인 후 Spring API 재기동
- 정상 확인되면 그때 `services/api` 삭제 검토
