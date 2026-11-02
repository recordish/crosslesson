# 크로스레슨 (crosslesson.com) 리뉴얼

재능교환 · 교환과외 플랫폼 크로스레슨을 **React + Vite + Firebase**로 다시 만든 버전입니다.
"가르쳐 줄 수 있는 것 ⇄ 배우고 싶은 것"을 올리고, 마음에 드는 레슨에 신청하고, 작성자가 수락하면 답장으로 연락처를 주고받습니다.

## 기능

- **레슨 찾기**: 배우고 싶은 과목, 가르쳐 줄 수 있는 과목, 지역으로 거르기. 최신순 20개씩 "더 보기"
- **레슨 등록 · 수정 · 삭제 · 모집 완료**: 레슨 번호는 예전 번호를 이어서 붙습니다 (#5859부터)
- **신청**: 레슨 하나에 한 번. 작성자만 내용을 봅니다. 작성자는 수락/거절하고 답장을 남깁니다
- **내 활동**: 내 레슨, 받은 신청, 보낸 신청
- **로그인**: Google, 이메일/비밀번호(가입, 비밀번호 재설정). 첫 로그인 때 닉네임을 정합니다
- **예전 주소 연결**: `lesson.php?no=5858` → `/lesson/5858` 등 301 리다이렉트 (`public/.htaccess`)

## 실행

Node.js 20.19+ 또는 22.12+ 가 필요합니다.

```bash
npm install
npm run dev        # http://localhost:5173
```

Firebase 설정값(`.env.local`)이 없으면 **로컬 모드**로 동작합니다. 데이터는 브라우저 localStorage에 저장되고,
"테스트 사용자 A/B"로 로그인해서 레슨 등록 → 신청 → 수락 흐름을 혼자 시험해 볼 수 있습니다.

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | 코드 검사 (oxlint) |

## 폴더 구조

```
├── .github/workflows/deploy.yml   # 검사·빌드 + (main) 카페24 FTP 자동 업로드
├── public/
│   ├── .htaccess                  # 카페24(Apache): https, 예전 주소 리다이렉트, 화면 주소 처리
│   └── favicon.svg
├── firestore.rules                # Firestore 보안 규칙
├── firestore.indexes.json         # 필터 + 최신순 정렬용 복합 색인 7개
├── firebase.json                  # Firebase CLI (규칙/색인 배포, Hosting, 에뮬레이터)
├── scripts/migrate/               # 예전 MySQL 데이터 → Firebase 이전 스크립트
├── tests/rules/                   # 보안 규칙 테스트 (에뮬레이터)
└── src/
    ├── data/categories.js         # 과목 코드표(예전 번호 체계), 시/도 목록
    ├── firebase/config.js         # Firebase 초기화 (설정 없으면 로컬 모드)
    ├── services/                  # 데이터 계층: Firestore 또는 localStorage
    │   ├── lessonService.js       #   레슨 목록/상세/등록(번호 트랜잭션)/수정/조회수
    │   ├── applicationService.js  #   신청/취소/수락·거절
    │   ├── profileService.js      #   닉네임·소개
    │   ├── authService.js         #   Google·이메일 로그인, 로컬 테스트 사용자
    │   └── localDb.js             #   로컬 모드 저장소 + 예시 데이터
    ├── contexts/AuthContext.jsx   # 로그인 사용자 + 프로필
    ├── hooks/                     # useLessons(목록·더 보기), useNow, useTitle
    ├── components/                # 헤더, 레슨 카드, 과목 배지, 신청 카드 등
    └── pages/                     # 홈, 레슨 상세, 등록/수정, 로그인, 프로필, 내 활동, 소개
```

## 데이터 구조 (Firestore)

| 경로 | 내용 | 읽기 / 쓰기 |
| --- | --- | --- |
| `users/{uid}` | `{ nickname, intro, createdAt, updatedAt }` | 누구나 / 본인 |
| `lessons/{no}` | `{ no, uid, authorName, teach, learn, sido, region, ageMin, ageMax, content, closed, views, createdAt, updatedAt }` | 누구나 / 작성자 (조회수 +1은 누구나) |
| `counters/lessons` | `{ last }` 마지막 레슨 번호 | 누구나 / 레슨 만들 때 +1 |
| `applications/{no}_{uid}` | `{ lessonNo, lessonOwnerUid, lessonTeach, lessonLearn, applicantUid, applicantName, message, status, reply, createdAt, updatedAt }` | 신청자·작성자 / 신청자(신청·취소), 작성자(수락·거절·답장) |

- 과목 코드(`teach`, `learn`)는 예전 사이트 번호를 그대로 씁니다 (101 영어, 204 바이올린, 306 영상, 402 프로그래밍, 601 수영 …).
  **나머지 과목 이름은 예전 DB의 분류표와 대조해서 `src/data/categories.js`를 고쳐야 합니다.**
- 보안 규칙이 필드 종류와 길이, 작성자, 레슨 번호 순서, 중복 신청, 자기 레슨 신청, 모집 완료 레슨 신청을 서버에서 검사합니다.
  테스트: `cd tests/rules && npm install && npm test` (Java 필요, 42개 항목)

## Firebase 설정 (처음 한 번)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 만들기 → **웹 앱 추가** → 설정값을 `.env.production`에 넣고 커밋 (`.env.example` 참고. 브라우저에 공개되는 값이라 커밋해도 됩니다)
2. **Authentication → 로그인 방법**: Google, 이메일/비밀번호 사용 설정
3. **Authentication → 설정 → 승인된 도메인**: `crosslesson.com` 추가
4. **Firestore Database 만들기**: 프로덕션 모드, 위치 `asia-northeast3`(서울)
5. 규칙과 색인 배포:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <프로젝트ID>
   ```

## 카페24에 배포

**자동 (추천)**: 저장소 Secrets에 `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`(보통 `/www/`)를 등록하면
`main`에 푸시할 때마다 GitHub Actions가 빌드해서 올립니다.

**수동**: `npm run build` 후 `dist/` 안의 파일 전부(숨김 파일 `.htaccess` 포함)를 FTP로 `/www/`에 올립니다.

> ⚠️ **처음 올리기 전에** 기존 사이트 파일과 DB를 **전부 백업**하세요. 예전 `index.php`가 남아 있어도 `.htaccess`의
> `DirectoryIndex index.html`이 새 화면을 먼저 보여 주고, 예전 PHP 주소는 새 주소로 넘어갑니다.
> 확인이 끝나면 예전 PHP 파일은 지워 주세요 (오류 메시지로 서버 경로가 드러나던 문제도 함께 없어집니다).

Firebase Hosting을 쓰려면: `npm run build && npx firebase-tools deploy --only hosting` (설정은 `firebase.json`에 있음).

## 예전 데이터 옮기기

`scripts/migrate/README.md`를 보세요.

## 다음에 할 일

- [ ] 과목 코드표를 예전 DB 분류표와 맞추기
- [ ] 회원·레슨 데이터 이전, 개인정보처리방침에 국외 이전(Google Firebase) 고지
- [ ] 레슨 상세 페이지 검색 노출(프리렌더링), sitemap.xml
- [ ] 카카오 로그인 (서버 함수가 필요해 Firebase Blaze 요금제 필요)
- [ ] 신청 알림 (이메일 또는 카카오 알림톡)
