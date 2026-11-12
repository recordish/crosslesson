/**
 * 크로스레슨 메일 알림 (Google Apps Script 웹 앱)
 *
 * - 레슨 신청이 들어오면 레슨 작성자에게, 수락·거절 답장이 오면 신청자에게 Gmail 로 알립니다.
 * - 사이트가 신청/답장을 저장한 직후 이 웹 앱을 호출합니다 (src/services/notifyService.js).
 * - 호출한 사람의 Firebase 로그인 토큰을 확인하고, 신청 내용은 Firestore 에서 직접 읽습니다.
 *   (사이트가 보낸 내용은 믿지 않습니다. 받는 사람 이메일도 여기서만 조회합니다.)
 *
 * 스크립트 속성 (프로젝트 설정 → 스크립트 속성)
 *   FIREBASE_API_KEY      .env.production 의 VITE_FIREBASE_API_KEY
 *   SERVICE_ACCOUNT_JSON  mail-notifier 서비스 계정 키(JSON) 전체 — 읽기 전용 권한
 *   UNSUB_SECRET          아무 긴 무작위 문자열 (수신 거부 링크 서명용)
 *   WEBAPP_URL            (선택) 배포한 웹 앱 주소. 비워 두면 자동으로 찾습니다
 * 설치 방법: scripts/email/README.md
 */

var PROJECT_ID = 'croesson2026'
var SITE = 'https://crosslesson.com'
var WINDOW_MS = 10 * 60 * 1000 // 저장한 지 10분 안의 신청/답장만 알림
var CATEGORY = {"101":"영어","102":"일본어","103":"중국어","104":"프랑스어","105":"독일어","106":"스페인어","107":"한국어","108":"러시아어","109":"포르투갈어","110":"이탈리아어","111":"태국어","112":"베트남어","113":"아랍어","114":"그리스어","201":"피아노","202":"재즈","203":"기타","204":"바이올린","205":"첼로","206":"플루트","207":"색소폰","208":"드럼","209":"클라리넷","210":"우쿨렐레","211":"국악","212":"오보에","213":"베이스","251":"보컬","252":"성악(클래식)","253":"작곡","254":"화성학","255":"미디","256":"디제잉","257":"음향 · 음원 제작","301":"미술","302":"디자인","303":"사진","304":"요리","305":"커피","306":"영상","307":"캘리그라피","308":"일러스트","351":"댄스","352":"발레","353":"연기","354":"문예창작","355":"의상","356":"뷰티","357":"꽃","358":"마술","359":"공예","360":"바둑","361":"패션","362":"영화","401":"포토샵","402":"프로그래밍","403":"MS 오피스","404":"3D · 캐드","405":"쇼핑몰","406":"웹 개발","407":"앱 개발","408":"AI 활용","409":"게임 개발","601":"수영","602":"헬스","603":"요가 · 필라테스","604":"골프","605":"테니스","606":"태권도","607":"승마","608":"스키","609":"볼링","610":"스쿠버다이빙","611":"검도","612":"복싱","613":"스케이트보드","614":"운전","615":"필라테스","701":"수학","702":"통계학","703":"화학","704":"심리학","705":"역사학","706":"의학","707":"마케팅","708":"경제학","709":"법학","710":"경영학","711":"철학","712":"물리학","713":"취업 · 면접","714":"공무원 · 자격증","999":"기타"}

function prop_(k) {
  var v = PropertiesService.getScriptProperties().getProperty(k)
  if (!v) throw new Error('스크립트 속성 ' + k + ' 가 없습니다')
  return v
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

// ---------- 인증 ----------

// 붙여 넣는 과정에서 줄바꿈이 사라지거나 \\n 글자로 바뀐 비공개 키를 PEM 모양으로 되돌립니다.
function pemKey_(key) {
  var k = String(key || '').replace(/\\n/g, '\n').replace(/\r/g, '')
  var m = k.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/)
  if (!m) throw new Error('SERVICE_ACCOUNT_JSON 의 private_key 가 없거나 잘렸습니다. 키 JSON 파일 전체를 다시 붙여 넣으세요.')
  var body = m[1].replace(/[^A-Za-z0-9+/=]/g, '')
  return '-----BEGIN PRIVATE KEY-----\n' + body.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n'
}

// 서비스 계정으로 Google API 접근 토큰 (50분 캐시)
function saToken_() {
  var cache = CacheService.getScriptCache()
  var cached = cache.get('sa_token')
  if (cached) return cached
  var sa = JSON.parse(prop_('SERVICE_ACCOUNT_JSON'))
  var now = Math.floor(Date.now() / 1000)
  var b64 = function (s) { return Utilities.base64EncodeWebSafe(s).replace(/=+$/, '') }
  var header = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  var claim = b64(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(header + '.' + claim, pemKey_(sa.private_key))).replace(/=+$/, '')
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: header + '.' + claim + '.' + sig },
  })
  var token = JSON.parse(res.getContentText()).access_token
  cache.put('sa_token', token, 3000)
  return token
}

// 사이트에서 보낸 Firebase 로그인 토큰 확인 → uid
function verifyCaller_(idToken) {
  if (!idToken) return null
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + prop_('FIREBASE_API_KEY'), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() !== 200) return null
  var users = JSON.parse(res.getContentText()).users || []
  return users.length ? users[0].localId : null
}

// uid → 로그인 이메일 (예전 회원 포함)
function emailOf_(uid) {
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + PROJECT_ID + '/accounts:lookup', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + saToken_() },
    payload: JSON.stringify({ localId: [uid] }),
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() !== 200) return null
  var users = JSON.parse(res.getContentText()).users || []
  return users.length && !users[0].disabled ? users[0].email || null : null
}

// ---------- Firestore 읽기 ----------

function value_(v) {
  if (!v) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value_)
  if ('mapValue' in v) return fields_(v.mapValue.fields || {})
  if ('timestampValue' in v) return v.timestampValue
  return null
}
function fields_(f) {
  var o = {}
  for (var k in f) o[k] = value_(f[k])
  return o
}
function getDoc_(path) {
  var res = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/' + path, {
    headers: { Authorization: 'Bearer ' + saToken_() },
    muteHttpExceptions: true,
  })
  if (res.getResponseCode() === 404) return null
  if (res.getResponseCode() !== 200) throw new Error('Firestore ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200))
  return fields_(JSON.parse(res.getContentText()).fields || {})
}

// ---------- 수신 거부 ----------

function unsubSig_(uid) {
  var raw = Utilities.computeHmacSha256Signature(uid, prop_('UNSUB_SECRET'))
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '').slice(0, 32)
}
function wantsMail_(uid) {
  if (PropertiesService.getScriptProperties().getProperty('off:' + uid)) return false
  var pref = getDoc_('emailPrefs/' + uid)
  return !(pref && pref.off === true)
}

// ---------- 메일 ----------

function webAppUrl_() {
  var url = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL')
  if (url) return url
  try {
    return ScriptApp.getService().getUrl()
  } catch (e) {
    return SITE + '/me'
  }
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  })
}
function cut_(s, n) {
  s = String(s || '')
  return s.length > n ? s.slice(0, n) + '…' : s
}
function exchange_(app) {
  var teach = app.lessonTeach != null ? CATEGORY[app.lessonTeach] || '' : ''
  var learns = (app.lessonLearns || []).map(function (c) { return CATEGORY[c] || '' }).filter(String).join(', ')
  if (teach && learns) return teach + ' ⇄ ' + learns
  return teach || learns || '레슨'
}

function send_(toUid, subject, lines, button) {
  if (!wantsMail_(toUid)) return 'opted_out'
  var to = emailOf_(toUid)
  if (!to) return 'no_email'
  if (MailApp.getRemainingDailyQuota() < 1) return 'quota'
  var unsub = webAppUrl_() + '?unsub=' + encodeURIComponent(toUid) + '&sig=' + unsubSig_(toUid)
  var html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.6">' +
    '<p style="font-size:18px;font-weight:700;margin:0 0 16px">' + esc_(subject) + '</p>' +
    lines.map(function (l) { return '<p style="margin:0 0 12px;white-space:pre-wrap">' + l + '</p>' }).join('') +
    '<p style="margin:24px 0"><a href="' + button.url + '" style="background:#2b8fd6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;display:inline-block">' + esc_(button.label) + '</a></p>' +
    '<p style="font-size:12px;color:#6b7280;margin-top:32px">크로스레슨(crosslesson.com)에서 보낸 알림입니다. 이 메일에는 답장할 수 없어요.<br>' +
    '알림을 그만 받으려면 <a href="' + unsub + '" style="color:#6b7280">수신 거부</a>를 누르거나 사이트의 내 활동에서 끌 수 있어요.</p></div>'
  var plain = function (l) {
    return l.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  }
  var text = subject + '\n\n' + lines.map(plain).join('\n\n') + '\n\n' + button.label + ': ' + button.url + '\n\n수신 거부: ' + unsub
  MailApp.sendEmail({ to: to, subject: '[크로스레슨] ' + subject, htmlBody: html, body: text, name: '크로스레슨' })
  return 'sent'
}

// 같은 알림은 한 번만, 한 사람이 시간당 20번까지
function once_(key) {
  var cache = CacheService.getScriptCache()
  if (cache.get(key)) return false
  cache.put(key, '1', 21600)
  return true
}
function rateOk_(uid) {
  var cache = CacheService.getScriptCache()
  var key = 'rate:' + uid
  var n = Number(cache.get(key) || 0)
  if (n >= 20) return false
  cache.put(key, String(n + 1), 3600)
  return true
}

// ---------- 웹 앱 ----------

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    var uid = verifyCaller_(body.idToken)
    if (!uid) return json_({ ok: false, error: 'auth' })
    var appId = String(body.appId || '')
    if (!/^\d+_[A-Za-z0-9_-]{1,128}$/.test(appId)) return json_({ ok: false, error: 'bad_id' })
    if (!rateOk_(uid)) return json_({ ok: false, error: 'rate' })

    var app = getDoc_('applications/' + appId)
    if (!app) return json_({ ok: false, error: 'not_found' })
    var now = Date.now()
    var result

    if (body.type === 'applied') {
      if (app.applicantUid !== uid || app.status !== 'pending' || now - app.createdAt > WINDOW_MS) return json_({ ok: false, error: 'invalid' })
      if (!once_('applied:' + appId + ':' + app.createdAt)) return json_({ ok: true, result: 'duplicate' })
      result = send_(app.lessonOwnerUid, app.applicantName + '님이 레슨을 신청했어요', [
        '<b>' + esc_(exchange_(app)) + '</b> 레슨에 새 신청이 왔어요.',
        '<span style="color:#6b7280">신청 메시지</span><br>' + esc_(cut_(app.message, 500)),
        '수락하거나 거절하고 답장을 남겨 주세요.',
      ], { label: '신청 확인하기', url: SITE + '/me?tab=received' })
    } else if (body.type === 'replied') {
      if (app.lessonOwnerUid !== uid || ['accepted', 'rejected'].indexOf(app.status) < 0 || now - app.updatedAt > WINDOW_MS) return json_({ ok: false, error: 'invalid' })
      if (!once_('replied:' + appId + ':' + app.status + ':' + app.updatedAt)) return json_({ ok: true, result: 'duplicate' })
      var accepted = app.status === 'accepted'
      var lines = ['<b>' + esc_(exchange_(app)) + '</b> 레슨 신청이 <b>' + (accepted ? '수락' : '거절') + '</b>되었어요.']
      if (app.reply) lines.push('<span style="color:#6b7280">작성자 답장</span><br>' + esc_(cut_(app.reply, 500)))
      if (accepted) lines.push('답장에 적힌 방법으로 연락해 보세요.')
      result = send_(app.applicantUid, '레슨 신청이 ' + (accepted ? '수락' : '거절') + '되었어요', lines, { label: '내 신청 보기', url: SITE + '/me?tab=sent' })
    } else {
      return json_({ ok: false, error: 'bad_type' })
    }
    return json_({ ok: true, result: result })
  } catch (err) {
    console.error(err)
    return json_({ ok: false, error: 'server' })
  }
}

// 수신 거부 링크
function doGet(e) {
  var p = (e && e.parameter) || {}
  var msg = '잘못된 링크예요.'
  if (p.unsub && p.sig && p.sig === unsubSig_(p.unsub)) {
    PropertiesService.getScriptProperties().setProperty('off:' + p.unsub, String(Date.now()))
    msg = '크로스레슨 알림 메일을 더 이상 보내지 않아요.'
  }
  return HtmlService.createHtmlOutput(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><div style="font-family:sans-serif;padding:40px 20px;text-align:center"><p style="font-size:18px">' +
      esc_(msg) + '</p><p><a href="' + SITE + '">크로스레슨으로 가기</a></p></div>',
  ).setTitle('크로스레슨 수신 거부')
}

// 설치 후 편집기에서 한 번 실행해 권한을 승인하고 연결을 확인합니다.
function setupCheck() {
  console.log('메일 남은 할당량:', MailApp.getRemainingDailyQuota())
  console.log('서비스 계정 토큰:', saToken_() ? 'OK' : '실패')
  console.log('Firestore 읽기:', getDoc_('counters/lessons') ? 'OK' : '문서 없음')
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + PROJECT_ID + '/accounts:lookup', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + saToken_() },
    payload: JSON.stringify({ localId: ['legacy-1'] }), muteHttpExceptions: true,
  })
  console.log('회원 이메일 조회 권한:', res.getResponseCode() === 200 ? 'OK' : '실패 ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200))
  console.log('웹 앱 주소:', webAppUrl_())
}
