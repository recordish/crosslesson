# 예전 데이터 이전 (MySQL → Firebase)

예전 crosslesson.com(카페24 MySQL)의 회원과 레슨을 새 Firebase 프로젝트로 옮기는 일회용 스크립트입니다.

## 순서

1. **백업**: 카페24 phpMyAdmin → 내보내기 → SQL 파일로 전체 저장
2. **JSON 만들기** (`data/`는 git에 올라가지 않습니다)
   - **레슨**: phpMyAdmin → SQL 탭에서 아래 쿼리 실행 → 결과 내보내기(형식 JSON) → `data/legacy-lessons.json`으로 저장 → `node convert-lessons.mjs`
     ```sql
     SELECT no, member_no, name, tp, title, ment, theday, thetime, theage,
            reg_date, last_update, hit, hide, prev, next, etc1, etc2, etc3, etc4
     FROM mini_board_language ORDER BY no DESC;
     ```
     → `data/lessons.json`이 만들어집니다. 숨긴 글(`hide=1`)은 빠지고, `--include-hidden`을 붙이면 "모집 완료"로 옮깁니다
   - **회원**: 아래 형식의 `data/users.json` (회원 테이블 `cl_member`에서. 변환 방법은 따로 안내)
3. **서비스 계정 키**: Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 → `service-account.json`으로 저장 (**절대 커밋 금지**)
4. **연습 실행**: `--dry-run`을 붙이면 아무것도 저장하지 않고 경고만 보여 줍니다
5. **실행**:
   ```bash
   cd scripts/migrate
   npm install
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-users.mjs --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-users.mjs
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs
   ```

에뮬레이터로 먼저 연습하려면 `GOOGLE_APPLICATION_CREDENTIALS` 대신
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`를 지정하세요.

## 예전 테이블 (knight12n DB)

| 테이블 | 내용 | 옮김 |
| --- | --- | --- |
| `mini_board_language` | 레슨 글. `prev`=가르칠 과목, `next`=배울 과목, `etc2`=위치, `theday`=요일, `thetime`=시간 코드(10/14/16/18/20), `theage`=나이대, `hit`=조회수, `hide`=숨김 | ✅ |
| `cl_member` | 회원. `no`, `email`, `username`(닉네임), `bio`(소개), `reg_date`만 씀 | ✅ |
| `cl_major` | 과목 이름 (영/한/일/프/스) | 코드표는 `src/data/categories.js`에 반영 |
| `cl_apply`, `cl_letters*`, `cl_mssg`, `lesson_comment`, `cl_scrap` | 신청, 쪽지, 댓글, 스크랩 | ❌ |
| `access_logs`, `cl_visit*`, `cl_searched*`, `cl_count` | 방문·검색 기록 | ❌ |
| `mini_*`, `luv_member0`, `luun`, `luup`, `fab_news` | 예전 게시판 프로그램, 다른 서비스 데이터 | ❌ (주민번호 등 민감 정보 칸이 있어 옮기지 않음) |

시간 코드: 10 → 오전, 14·16 → 오후, 18·20 → 저녁. 비회원 글(`member_no`=0)은 글마다 따로 주인(`legacy-guest-{번호}`)을 둡니다.

## 형식

`data/users.json`
```json
[{ "legacyId": 123, "email": "a@gmail.com", "nickname": "글로리", "intro": "",
   "joinedAt": "2016-01-26 13:05:00" }]
```

`data/lessons.json`
```json
[{ "no": 5858, "legacyUserId": 123, "authorName": "글로리", "teach": 204, "learn": 306,
   "region": "오리역", "sido": "", "days": "Tuesday, Wednesday", "ageMin": 20, "ageMax": 45,
   "content": "...", "views": 2426, "createdAt": "2025-04-16 10:00:00", "closed": false }]
```

- 새 uid는 `legacy-{예전 회원번호}`입니다. 그래서 레슨 작성자가 그대로 이어지고, 회원이 로그인하면 자기 레슨을 수정할 수 있습니다.
- 레슨 번호는 그대로 유지되고, 끝나면 `counters/lessons`가 가장 큰 번호로 맞춰집니다.
- 날짜 문자열은 한국 시간으로 읽습니다. 초 단위 유닉스 시간도 받습니다.
- 보안 규칙을 벗어나는 값(나이 범위, 글자 수, 닉네임 길이, 시/도 이름)은 규칙에 맞게 다듬고 경고로 알려 줍니다.
- 새 사이트에만 있는 항목은 이렇게 채웁니다.
  - 배우고 싶은 과목(`learns`): 예전 `learn` 하나를 목록으로. 여러 개가 있으면 `"learns": [306, 402]`처럼 넣어도 됩니다 (최대 3개)
  - 수업 방식(`online`/`offline`): `mode`가 있으면 그대로, 없으면 장소에 "온라인·화상·줌·전화" 같은 말이 있으면 온라인, 소개 글에만 있으면 둘 다, 아니면 만나서
  - 시/도(`sido`): 비어 있으면 장소 글에서 "부산", "서울" 같은 시/도 이름을 찾아 넣습니다
  - 요일(`days`): 예전 요일 항목(`Monday, Thursday` / `월,목` / `평일`)을 옮깁니다. 시간대(`timeSlots`)는 비워 둡니다 ("시간 협의"로 보임)
  - 실력·수준(`teachLevel`, `learnLevel`): 비워 둡니다 (선택 안 함)

## 로그인 (Google만)

새 사이트는 Google 로그인만 씁니다. **비밀번호는 옮기지 않습니다.**

- 이메일이 있는 회원은 비밀번호 없는 계정(uid `legacy-{회원번호}`)으로 미리 만들어 둡니다.
  같은 **Gmail 주소**로 Google 로그인하면 그 계정에 이어지는 것이 목표입니다 (Firebase 기본 설정 "이메일 주소당 계정 1개").
  ⚠️ 실제 이전 전에 테스트 계정 하나로 꼭 확인하세요 (로그인 후 예전 레슨에 수정 버튼이 보이는지).
- **Gmail이 아닌 주소**(네이버, 다음 등)로 가입했던 회원은 Google 로그인으로 이어지지 않습니다.
  프로필과 레슨은 그대로 남고, 요청이 오면 관리자가 레슨 작성자(`uid`)를 새 계정으로 바꿔 줄 수 있습니다.
- 시험 실행(`--dry-run`)을 하면 전체 회원 중 Gmail 회원이 몇 명인지 알려 줍니다.

## 개인정보

Firebase 서버는 해외(Google)에 있습니다. 회원정보를 옮기기 전에 개인정보처리방침에
**국외 이전**(이전받는 자: Google LLC, 항목, 국가, 기간)을 적고 회원에게 알려야 합니다.
오래 로그인하지 않은 회원은 이번 기회에 정리하는 것도 방법입니다.
