# 예전 데이터 이전 (MySQL → Firebase)

예전 crosslesson.com(카페24 MySQL)의 회원과 레슨을 새 Firebase 프로젝트로 옮기는 일회용 스크립트입니다.

## 순서

1. **백업**: 카페24 phpMyAdmin → 내보내기 → SQL 파일로 전체 저장
2. **JSON 만들기**: 회원 테이블과 레슨 테이블을 아래 형식의 `data/users.json`, `data/lessons.json`으로 바꿉니다.
   (테이블 구조를 알려 주시면 변환 스크립트를 따로 만들어 드립니다. `data/`는 git에 올라가지 않습니다)
3. **서비스 계정 키**: Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 → `service-account.json`으로 저장 (**절대 커밋 금지**)
4. **연습 실행**: `--dry-run`을 붙이면 아무것도 저장하지 않고 경고만 보여 줍니다
5. **실행**:
   ```bash
   cd scripts/migrate
   npm install
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json HASH=BCRYPT node import-users.mjs --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json HASH=BCRYPT node import-users.mjs
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node import-lessons.mjs
   ```

에뮬레이터로 먼저 연습하려면 `GOOGLE_APPLICATION_CREDENTIALS` 대신
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`를 지정하세요.

## 형식

`data/users.json`
```json
[{ "legacyId": 123, "email": "a@b.com", "passwordHash": "$2y$10$...", "salt": "",
   "nickname": "글로리", "intro": "", "joinedAt": "2016-01-26 13:05:00" }]
```

`data/lessons.json`
```json
[{ "no": 5858, "legacyUserId": 123, "authorName": "글로리", "teach": 204, "learn": 306,
   "region": "오리역", "sido": "", "ageMin": 20, "ageMax": 45, "content": "...",
   "views": 2426, "createdAt": "2025-04-16 10:00:00", "closed": false }]
```

- 새 uid는 `legacy-{예전 회원번호}`입니다. 그래서 레슨 작성자가 그대로 이어지고, 회원이 로그인하면 자기 레슨을 수정할 수 있습니다.
- 레슨 번호는 그대로 유지되고, 끝나면 `counters/lessons`가 가장 큰 번호로 맞춰집니다.
- 날짜 문자열은 한국 시간으로 읽습니다. 초 단위 유닉스 시간도 받습니다.
- 보안 규칙을 벗어나는 값(나이 범위, 글자 수, 닉네임 길이, 시/도 이름)은 규칙에 맞게 다듬고 경고로 알려 줍니다.

## 비밀번호 (`HASH`)

예전 PHP 가입 코드에서 비밀번호를 저장하는 줄을 보고 고릅니다.

| 코드 | HASH |
| --- | --- |
| `password_hash($pw, ...)` | `BCRYPT` |
| `md5($pw)` | `MD5` |
| `hash('sha256', $pw)` | `SHA256` |
| 알 수 없음 / 솔트 섞는 방식 등 | `NONE` (회원은 "비밀번호를 잊었어요"로 새로 만듦) |

⚠️ 실제 이전 전에 **테스트 계정 하나로 로그인이 되는지** 꼭 확인하세요.

## 개인정보

Firebase 서버는 해외(Google)에 있습니다. 회원정보를 옮기기 전에 개인정보처리방침에
**국외 이전**(이전받는 자: Google LLC, 항목, 국가, 기간)을 적고 회원에게 알려야 합니다.
오래 로그인하지 않은 회원은 이번 기회에 정리하는 것도 방법입니다.
