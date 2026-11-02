# 크로스레슨 (crosslesson.com) 리뉴얼

재능교환 · 교환과외 플랫폼 크로스레슨을 **React + Vite + Firebase**로 다시 만든 버전입니다.
"가르쳐 줄 수 있는 것 ⇄ 배우고 싶은 것"을 올리고, 마음에 드는 레슨에 신청하고, 작성자가 수락하면 답장으로 연락처를 주고받습니다.

## 기능

- **레슨 찾기**: 배우고 싶은 과목, 가르쳐 줄 수 있는 과목, 수업 방식(만나서/온라인), 지역으로 거르기. 최신순 20개씩 "더 보기"
- **레슨 등록 · 수정 · 삭제 · 모집 완료**: 레슨 번호는 예전 번호를 이어서 붙습니다 (#5859부터)
  - 과목은 분야 → 과목 2단계 버튼으로 고르고, 배우고 싶은 과목은 3개까지
  - 실력·수준, 수업 방식(만나서/온라인/둘 다), 가능한 요일·시간대, 나이대
  - 칸마다 바로 보이는 오류 안내, 연락처 노출 경고, 예시 넣기, "이렇게 보여요" 미리보기, 임시 저장
- **신청**: 레슨 하나에 한 번. 작성자만 내용을 봅니다. 작성자는 수락/거절하고 답장을 남깁니다
- **내 활동**: 내 레슨, 받은 신청, 보낸 신청
- **로그인**: Google 로그인만 씁니다. 첫 로그인 때 닉네임을 정합니다
- **예전 주소 연결**: `lesson.php?no=5858` → `/lesson/5858`, `class.php?d=204` → `/?teach=204` 등 (`src/components/LegacyRedirect.jsx`, `firebase.json`)

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
├── .github/workflows/deploy.yml   # 검사·빌드 + (main) Firebase Hosting 자동 배포
├── public/
│   └── favicon.svg
├── firestore.rules                # Firestore 보안 규칙
├── firestore.indexes.json         # 필터 + 최신순 정렬용 복합 색인 23개 (scripts/gen-indexes.mjs 로 생성)
├── firebase.json                  # Firebase CLI (Hosting 설정·리다이렉트, 규칙/색인, 에뮬레이터)
├── scripts/gen-indexes.mjs        # firestore.indexes.json 생성
├── scripts/migrate/               # 예전 MySQL 데이터 → Firebase 이전 스크립트
├── tests/rules/                   # 보안 규칙 테스트 (에뮬레이터)
└── src/
    ├── data/categories.js         # 과목 코드표(예전 번호 체계), 시/도 목록
    ├── data/lessonOptions.js      # 수업 방식, 요일·시간대, 실력·수준 선택지와 표시 문구
    ├── firebase/config.js         # Firebase 초기화 (설정 없으면 로컬 모드)
    ├── services/                  # 데이터 계층: Firestore 또는 localStorage
    │   ├── lessonService.js       #   레슨 목록/상세/등록(번호 트랜잭션)/수정/조회수
    │   ├── applicationService.js  #   신청/취소/수락·거절
    │   ├── profileService.js      #   닉네임·소개
    │   ├── authService.js         #   Google 로그인, 로컬 테스트 사용자
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
| `lessons/{no}` | `{ no, uid, authorName, teach, learns[1~3], teachLevel, learnLevel, online, offline, sido, region, days[], timeSlots[], ageMin, ageMax, content, closed, views, createdAt, updatedAt }` | 누구나 / 작성자 (조회수 +1은 누구나) |
| `counters/lessons` | `{ last }` 마지막 레슨 번호 | 누구나 / 레슨 만들 때 +1 |
| `applications/{no}_{uid}` | `{ lessonNo, lessonOwnerUid, lessonTeach, lessonLearns, applicantUid, applicantName, message, status, reply, createdAt, updatedAt }` | 신청자·작성자 / 신청자(신청·취소), 작성자(수락·거절·답장) |

- 선택지 값은 `src/data/lessonOptions.js`에 있습니다
  (수업 방식 `online`/`offline` 둘 다 참 = 둘 다, 요일 `mon`~`sun`, 시간대 `morning`/`afternoon`/`evening`,
  실력 `hobby`/`skilled`/`pro`, 수준 `beginner`/`basic`/`intermediate`, 빈 값 = 선택 안 함)
- 과목 코드(`teach`, `learns`)는 예전 사이트 번호를 그대로 씁니다 (101 영어, 204 바이올린, 306 영상, 402 프로그래밍, 601 수영 …).
  **나머지 과목 이름은 예전 DB의 분류표와 대조해서 `src/data/categories.js`를 고쳐야 합니다.**
- 보안 규칙이 필드 종류와 길이, 작성자, 레슨 번호 순서, 중복 신청, 자기 레슨 신청, 모집 완료 레슨 신청을 서버에서 검사합니다.
  테스트: `cd tests/rules && npm install && npm test` (Java 필요, 55개 항목)
- 목록 필터 조합마다 복합 색인이 필요합니다(23개). 필터를 바꾸면 `node scripts/gen-indexes.mjs`로 다시 만드세요

## Firebase 설정 (처음 한 번)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 크로스레슨 전용 프로젝트 만들기 (메모 앱 recordish 와 별도) → **웹 앱 추가**(Firebase 호스팅도 설정 체크) → 설정값을 `.env.production`에 넣고 커밋 (`.env.example` 참고. 브라우저에 공개되는 값이라 커밋해도 됩니다)
2. **Authentication → 로그인 방법**: Google만 사용 설정 (이메일/비밀번호는 꺼 둡니다)
3. **Authentication → 설정 → 승인된 도메인**: `crosslesson.com` 추가
4. **Firestore Database 만들기**: 프로덕션 모드, 위치 `asia-northeast3`(서울)
5. 규칙과 색인 배포:
   ```bash
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project <프로젝트ID>
   ```

## 배포 (Firebase Hosting)

크로스레슨 전용 Firebase 프로젝트에 화면과 데이터를 함께 둡니다. 카페24 웹호스팅은 쓰지 않습니다.

**자동**: 서비스 계정 키(JSON 전체)를 저장소 Secrets의 `FIREBASE_SERVICE_ACCOUNT`로 등록하면
`main`에 푸시할 때마다 GitHub Actions가 빌드해서 배포합니다. 프로젝트 ID는 `.env.production`에서 읽습니다.
(키는 Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키. **채팅이나 저장소에 올리지 마세요**)

**수동**:
```bash
npm run build
npx firebase-tools deploy --only hosting --project <프로젝트ID>
```

- 예전 주소: `/about.php`, `/index.php`는 `firebase.json`의 301 리다이렉트가,
  `?no=`·`?d=` 값이 필요한 `lesson.php`, `class.php`, `learn.php`는 앱(`LegacyRedirect`)이 새 주소로 넘깁니다.
  (Firebase Hosting은 물음표 뒤 값으로 서버 리다이렉트를 할 수 없습니다)

### 도메인 연결 (crosslesson.com, 카페24 도메인)

1. Firebase 콘솔 → Hosting → **커스텀 도메인 추가** → `crosslesson.com` 입력
2. Firebase가 알려 주는 **TXT 레코드**(소유 확인)와 **A 레코드**를 카페24 도메인 관리의 DNS 설정에 추가하고,
   예전 카페24 호스팅을 가리키던 A 레코드는 지웁니다. 메일을 쓰고 있다면 MX 레코드는 그대로 둡니다
3. `www.crosslesson.com`도 추가하고 `crosslesson.com`으로 리다이렉트하도록 고릅니다
4. Authentication → 설정 → **승인된 도메인**에 `crosslesson.com` 추가
5. 인증서 발급까지 몇 시간 걸릴 수 있습니다. 새 사이트가 잘 뜨는지 확인한 뒤 카페24 호스팅을 해지합니다
   (⚠️ 해지 전에 예전 DB를 반드시 내보내 두세요. 도메인은 호스팅을 해지해도 그대로 유지됩니다)

## 예전 데이터 옮기기

`scripts/migrate/README.md`를 보세요.

## 다음에 할 일

- [ ] 과목 코드표를 예전 DB 분류표와 맞추기
- [ ] 회원·레슨 데이터 이전, 개인정보처리방침에 국외 이전(Google Firebase) 고지
- [ ] 레슨 상세 페이지 검색 노출(프리렌더링), sitemap.xml
- [ ] 카카오 로그인 (서버 함수가 필요해 Firebase Blaze 요금제 필요)
- [ ] 신청 알림 (이메일 또는 카카오 알림톡)
