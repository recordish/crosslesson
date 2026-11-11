// 접속 기록 (관리자 페이지 /admin 에서만 볼 수 있습니다)
//   visits/{자동 ID} = { t, vid, sid, entry, newVisitor, path, ref, refPath, keyword, source, medium, campaign,
//                       lang, tz, country, device, os, browser, app, signedIn, uid, ua, expireAt }
// ua: 분류하지 못한 방문(운영체제·브라우저 '기타', Linux PC)만 브라우저 식별 문자열 원문, 나머지는 ''
// uid: 로그인한 상태면 회원 식별자 (관리자 페이지에서 닉네임으로 보여 줌), 아니면 ''
// 5년이 지난 기록은 관리자 페이지를 열 때 지웁니다 (adminService.purgeOldVisits).
// expireAt 은 나중에 유료 요금제에서 Firestore TTL 정책을 켤 때를 위한 값입니다.
// 브라우저에서 화면이 바뀔 때마다 한 건씩 남깁니다. 검색 로봇·자동화 도구는 남기지 않습니다.
// IP 주소는 저장하지 않습니다. 국가는 기기의 시간대와 언어로 추정합니다.
import { addDoc, collection, Timestamp } from 'firebase/firestore/lite'
import { db } from '../firebase/config'

const BOT_RE =
  /bot|crawl|spider|slurp|scrap|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|whatsapp|telegram|kakaotalk-scrap|yeti|daum(oa)?-?bot|python|curl|wget|httpclient|okhttp|go-http|java\//i

const NO_TRACK_KEY = 'crosslesson:noTrack'
const VID_KEY = 'crosslesson:vid'
const SID_KEY = 'crosslesson:sid'

function storage(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

function randomId() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, '').slice(0, 20)
}

export function isBot() {
  const ua = navigator.userAgent || ''
  return !ua || BOT_RE.test(ua) || navigator.webdriver === true
}

// 관리자 본인의 방문은 통계에서 뺍니다 (관리자 페이지를 한 번 열면 이 기기는 기록하지 않음).
export function setNoTrack() {
  try {
    storage('local')?.setItem(NO_TRACK_KEY, '1')
  } catch {
    /* 저장소를 못 쓰면 무시 */
  }
}

// 시간대 → 국가 (자주 보이는 곳만, 나머지는 언어의 국가 코드로 추정)
const TZ_COUNTRY = {
  'Asia/Seoul': 'KR', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
  'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Manila': 'PH',
  'Asia/Jakarta': 'ID', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE',
  'Asia/Pyongyang': 'KP', 'Asia/Ulaanbaatar': 'MN', 'Asia/Tashkent': 'UZ', 'Asia/Almaty': 'KZ',
  'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ',
  'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Moscow': 'RU', 'Europe/Istanbul': 'TR', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US',
  'America/Anchorage': 'US', 'Pacific/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
}

function guessCountry(tz, lang) {
  if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz]
  const region = (lang.split('-')[1] || '').toUpperCase()
  return /^[A-Z]{2}$/.test(region) ? region : ''
}

function deviceInfo(ua) {
  const tablet = /iPad|Tablet|SM-T|SM-X|Tab/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const mobile = !tablet && /Mobi|iPhone|iPod|Android/i.test(ua)
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /CrOS/i.test(ua) ? 'ChromeOS'
    : /Linux/i.test(ua) ? 'Linux' : '기타'
  const browser = /SamsungBrowser/i.test(ua) ? 'Samsung Internet'
    : /NAVER\(inapp|NAVER/i.test(ua) ? '네이버 앱'
    : /KAKAOTALK/i.test(ua) ? '카카오톡'
    : /Instagram/i.test(ua) ? '인스타그램'
    : /FBAN|FBAV/i.test(ua) ? '페이스북'
    : /Whale/i.test(ua) ? 'Whale'
    : /Edg\//i.test(ua) ? 'Edge'
    : /OPR\/|Opera/i.test(ua) ? 'Opera'
    : /Firefox|FxiOS/i.test(ua) ? 'Firefox'
    : /; wv\)/i.test(ua) ? 'WebView'
    : /Chrome|CriOS/i.test(ua) ? 'Chrome'
    : /Safari/i.test(ua) ? 'Safari' : '기타'
  return { device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', os, browser }
}

const SEARCH_HOST = /(^|\.)(google\.[a-z.]+|naver\.com|daum\.net|bing\.com|yahoo\.[a-z.]+|duckduckgo\.com|zum\.com|nate\.com|baidu\.com|yandex\.[a-z]+)$/i
const cut = (v, n) => String(v ?? '').slice(0, n)

let sessionMeta = null

// 세션(브라우저 탭)이 시작될 때 한 번: 유입 경로와 UTM
function getSession() {
  if (sessionMeta) return sessionMeta
  const ss = storage('session')
  const ls = storage('local')
  let saved = null
  try {
    saved = JSON.parse(ss?.getItem(SID_KEY) || 'null')
  } catch {
    saved = null
  }
  let vid = ls?.getItem(VID_KEY)
  const newVisitor = !vid
  if (!vid) {
    vid = randomId()
    try { ls?.setItem(VID_KEY, vid) } catch { /* 무시 */ }
  }
  if (saved?.sid) {
    sessionMeta = { ...saved, vid, newVisitor: false, entry: false }
    return sessionMeta
  }
  const params = new URLSearchParams(location.search)
  let ref = ''
  let refPath = ''
  let keyword = ''
  try {
    if (document.referrer) {
      const u = new URL(document.referrer)
      if (u.hostname !== location.hostname) {
        ref = u.hostname.replace(/^www\./, '')
        refPath = u.pathname
        // 검색 사이트가 검색어를 넘겨 줄 때만 (대부분은 넘겨 주지 않음)
        if (SEARCH_HOST.test(u.hostname)) {
          for (const k of ['query', 'q', 'oquery', 'p', 'wd', 'keyword']) {
            const v = u.searchParams.get(k)
            if (v && v.trim()) { keyword = v.trim(); break }
          }
        }
      }
    }
  } catch { /* 무시 */ }
  sessionMeta = {
    sid: randomId(),
    vid,
    newVisitor,
    entry: true,
    ref: cut(ref, 100),
    refPath: cut(refPath, 200),
    keyword: cut(keyword, 100),
    source: cut(params.get('utm_source'), 100),
    medium: cut(params.get('utm_medium'), 100),
    campaign: cut(params.get('utm_campaign'), 100),
  }
  try {
    ss?.setItem(SID_KEY, JSON.stringify({ sid: sessionMeta.sid, ref: sessionMeta.ref, refPath: sessionMeta.refPath, keyword: sessionMeta.keyword,
      source: sessionMeta.source, medium: sessionMeta.medium, campaign: sessionMeta.campaign }))
  } catch { /* 무시 */ }
  return sessionMeta
}

export async function trackPageView(path, { uid = '' } = {}) {
  if (!db || import.meta.env.DEV) return
  if (path.startsWith('/admin')) return
  if (storage('local')?.getItem(NO_TRACK_KEY) === '1') return
  if (isBot() || document.visibilityState === 'prerender') return

  const s = getSession()
  const ua = navigator.userAgent
  const lang = cut(navigator.language || '', 20)
  const tz = cut(Intl.DateTimeFormat().resolvedOptions().timeZone || '', 50)
  const visit = {
    t: Date.now(),
    vid: s.vid,
    sid: s.sid,
    entry: s.entry,
    newVisitor: s.newVisitor,
    path: cut(path, 200),
    ref: s.ref,
    refPath: s.refPath,
    keyword: s.keyword ?? '',
    source: s.source,
    medium: s.medium,
    campaign: s.campaign,
    lang,
    tz,
    country: guessCountry(tz, lang),
    ...deviceInfo(ua),
    ua: '',
    app: Boolean(window.Capacitor?.isNativePlatform?.()),
    signedIn: Boolean(uid),
    uid: cut(uid, 128),
    expireAt: Timestamp.fromMillis(Date.now() + 5 * 365 * 24 * 3600 * 1000),
  }
  // 운영체제·브라우저를 알아보지 못했거나 Linux PC(봇이 많음)면 원문을 남겨 분류를 고칠 때 씁니다.
  if (visit.os === '기타' || visit.browser === '기타' || (visit.os === 'Linux' && visit.device === 'desktop')) visit.ua = cut(ua, 300)
  // 같은 세션의 다음 화면부터는 첫 방문/첫 화면이 아닙니다.
  s.entry = false
  s.newVisitor = false
  try {
    await addDoc(collection(db, 'visits'), visit)
  } catch (e) {
    console.warn('접속 기록을 남기지 못했습니다:', e?.code ?? e)
  }
}
