# Cloud Run Deployment Guide

## 1. 개요
- 본 문서는 Next.js 애플리케이션을 Cloud Run에 배포하기 위한 초기 가이드를 정의한다.
- 본 프로젝트는 Cloud Run 서비스 1개를 기준으로 운영한다.
- 새 배포는 같은 서비스 내 새 revision 생성 방식으로 관리한다.

## 2. 선행 조건
- Google Cloud 프로젝트 생성
- Firebase 프로젝트 연결
- Firestore 생성 완료
- Firebase Authentication 활성화
- Cloud Run API 활성화
- Artifact Registry API 활성화
- Cloud Build API 활성화

## 3. 배포 구조
- 애플리케이션: `Next.js`
- 컨테이너 레지스트리: `Artifact Registry`
- 실행 환경: `Cloud Run`

구조:

```text
Developer
  -> Build container image
  -> Push image to Artifact Registry
  -> Deploy image to Cloud Run
```

## 4. Cloud Run 서비스 운영 원칙
- 초기에는 Cloud Run 서비스 1개만 사용한다.
- 프론트엔드와 API는 같은 Next.js 앱에서 처리한다.
- 새 버전 배포 시 새 서비스가 아니라 새 revision이 생성된다.

## 5. 배포 준비 항목

### 5.1 필수 환경변수
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 5.2 서비스 계정
- Cloud Run 실행 서비스 계정에 Firestore 접근 권한이 필요하다.
- 최소 권한 원칙으로 필요한 IAM Role만 부여한다.

## 6. 추천 설정

### 6.1 초기 Cloud Run 설정
- 서비스 수: 1개
- 최소 인스턴스: `0`
- 최대 인스턴스: 트래픽 수준에 따라 제한
- 리전: Firestore와 가까운 리전 우선 고려
- 인증: 공개 앱이면 unauthenticated 허용, 내부 앱이면 접근 제어 검토

### 6.2 비용 최적화 기준
- 최소 인스턴스는 `0`으로 시작
- 과도한 로그 출력 방지
- 재고 목록 API는 페이지네이션 적용
- Firestore 읽기 수를 줄일 수 있도록 목록 문서 구조를 최적화

## 7. 배포 절차

### 7.1 로컬 개발
- Next.js 프로젝트 생성
- Firebase Web SDK 연결
- Firebase Admin SDK 연결
- 로컬 `.env` 설정

### 7.2 이미지 빌드
- Dockerfile 작성
- 프로덕션 빌드 확인
- 컨테이너 이미지 생성

### 7.3 이미지 저장
- Artifact Registry 저장소 생성
- 컨테이너 이미지 push

### 7.4 Cloud Run 배포
- Cloud Run에서 새 서비스 생성
- 기존 컨테이너 이미지 URL 선택
- 포트 설정 확인
- 환경변수 등록
- 배포 실행

## 8. 배포 후 확인 항목
- 앱 URL 접속 확인
- 로그인 동작 확인
- Firestore 조회/쓰기 확인
- API 응답 확인
- 모바일 화면 기본 동작 확인

## 9. 주의사항
- Cloud Run에서 `기존 컨테이너 이미지`를 선택하려면 먼저 이미지가 Artifact Registry에 있어야 한다.
- Firebase Admin SDK private key는 개행 문자 처리에 주의해야 한다.
- Firestore 보안 규칙과 서버 권한 모델을 혼동하지 않도록 구분해야 한다.

## 10. 다음 작업
- Dockerfile 작성
- Next.js 초기 프로젝트 생성
- Firebase SDK 설정 파일 작성
- Cloud Run 첫 배포
