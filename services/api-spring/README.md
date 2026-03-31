# Spring API Draft

이 모듈은 기존 `services/api`의 Node/Firebase API를 Spring Boot + JPA 형태로 옮기기 위한 초안입니다.

## 목표

- 기존 프런트가 쓰는 HTTP 경로와 응답 shape를 최대한 유지
- Firebase Bearer 토큰 검증 유지
- Firestore 컬렉션 구조를 JPA 엔티티로 평탄화
- 기본 저장소는 H2, 전환 시 PostgreSQL 등 RDB로 교체 가능

## 실행

```bash
mvn -f services/api-spring/pom.xml spring-boot:run
```

기본 포트는 `2002`입니다.

## 주요 환경 변수

- `PORT`
- `CORS_ORIGIN`
- `APP_ENV`
- `MASTER_EMAIL`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_PATH_DEV`
- `FIREBASE_SERVICE_ACCOUNT_PATH_PROD`
- `FIREBASE_PROJECT_ID_DEV`
- `FIREBASE_CLIENT_EMAIL_DEV`
- `FIREBASE_PRIVATE_KEY_DEV`
- `FIREBASE_PROJECT_ID_PROD`
- `FIREBASE_CLIENT_EMAIL_PROD`
- `FIREBASE_PRIVATE_KEY_PROD`

## 현재 범위

- 인증/세션
- 그룹/멤버/가입 요청
- 위치/거래처/아이템/재고 조정
- 바코드 조회
- 대시보드/히스토리/스냅샷
- 플래너 태스크/메모

## 전환 시 주의

- 현재는 JPA 엔티티 관계를 단순화하기 위해 `groupId`, `itemId`, `locationId`를 문자열 키로 보관합니다.
- 운영 전환 전에는 H2 대신 PostgreSQL 같은 실제 DB로 바꾸는 것이 맞습니다.
- 기존 Firestore 데이터 마이그레이션은 아직 포함하지 않았습니다.
