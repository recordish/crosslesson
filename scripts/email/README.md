# 메일 알림 (Google Apps Script)

레슨 신청이 오면 **레슨 작성자**에게, 수락·거절 답장이 오면 **신청자**에게 Gmail 로 알림을 보냅니다.
예전 사이트에서 옮겨 온 회원도 로그인 계정의 이메일로 받습니다.

```
사이트(신청/답장 저장) ──POST(로그인 토큰, 신청 id)──▶ Apps Script 웹 앱 (crosslesson@gmail.com)
                                                      ├─ 토큰 확인 (Identity Toolkit)
                                                      ├─ 신청 내용 읽기 (Firestore, 서비스 계정·읽기 전용)
                                                      ├─ 받는 사람 이메일 조회 (Firebase Auth, 읽기 전용)
                                                      └─ MailApp 으로 발송 (하루 약 100통)
```

- 사이트가 보낸 내용은 믿지 않고, Firestore 의 실제 신청 문서로만 메일을 만듭니다.
- 신청은 저장한 지 10분 안, 신청자 본인이 부를 때만 / 답장은 레슨 작성자 본인이 부를 때만 보냅니다.
- 같은 알림은 한 번만, 한 사람이 시간당 20번까지.
- 수신 거부: 메일 아래 링크(스크립트 속성에 기록) 또는 사이트 내 활동의 "알림 메일 받기"(emailPrefs/{uid}).

## 설치 (한 번만)

### 1. 서비스 계정 권한 (Google Cloud 콘솔, 프로젝트 소유자 계정)
서비스 계정 `mail-notifier@croesson2026.iam.gserviceaccount.com` 은 만들어 두었습니다. 읽기 권한 두 개만 주세요.

1. https://console.cloud.google.com/iam-admin/iam?project=croesson2026 → **액세스 권한 부여**
2. 새 주 구성원: `mail-notifier@croesson2026.iam.gserviceaccount.com`
3. 역할: **Cloud Datastore 뷰어** 와 **Firebase 인증 뷰어** (역할 추가로 두 개) → 저장

### 2. 서비스 계정 키 만들기
1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=croesson2026 → `mail-notifier` 클릭
2. **키** 탭 → **키 추가 → 새 키 만들기 → JSON** → 파일이 내려받아집니다
3. 이 파일은 비밀번호와 같습니다. 채팅·메일·저장소에 올리지 말고, 4단계에 붙여 넣은 뒤 PC 에서 지우세요.

### 3. Apps Script 프로젝트 (crosslesson@gmail.com 으로 로그인)
1. https://script.google.com → **새 프로젝트**, 이름 `크로스레슨 메일 알림`
2. 왼쪽 **⚙ 프로젝트 설정** → **"appsscript.json" 매니페스트 파일 표시** 체크
3. **편집기**에서 `appsscript.json` 내용을 이 폴더의 `appsscript.json` 으로 바꿉니다
4. `Code.gs` 내용을 이 폴더의 `Code.gs` 로 바꿉니다 → 저장

### 4. 스크립트 속성 (⚙ 프로젝트 설정 → 스크립트 속성 → 속성 추가)
| 속성 | 값 |
|---|---|
| `FIREBASE_API_KEY` | 저장소 `.env.production` 의 `VITE_FIREBASE_API_KEY` 값 |
| `SERVICE_ACCOUNT_JSON` | 2단계에서 받은 JSON 파일을 메모장으로 열어 **전체** 복사 |
| `UNSUB_SECRET` | 아무 긴 무작위 문자열 (예: 비밀번호 생성기로 40자) |

### 5. 연결 확인
편집기 위쪽 함수 목록에서 `setupCheck` 선택 → **실행** → 권한 검토(고급 → 이동 → 허용).
실행 로그에 `서비스 계정 토큰: OK`, `Firestore 읽기: OK`, `회원 이메일 조회 권한: OK` 가 나오면 됩니다.

### 6. 웹 앱 배포
1. 오른쪽 위 **배포 → 새 배포** → 유형 **웹 앱**
2. 다음 사용자 인증 정보로 실행: **나**, 액세스 권한: **모든 사용자** → 배포
3. 나온 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`)을 `.env.production` 의 `VITE_NOTIFY_URL` 에 넣고 다시 빌드·배포합니다.

코드를 고친 뒤에는 **배포 → 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포** 로 같은 URL 을 유지하세요.
