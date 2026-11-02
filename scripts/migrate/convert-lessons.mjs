// 예전 레슨 테이블(mini_board_language) → data/lessons.json (import-lessons.mjs 가 읽는 형식)
//
// 1) phpMyAdmin → SQL 탭에서 아래 쿼리 실행 → 결과 내보내기 → 형식 JSON → data/legacy-lessons.json 으로 저장
//      SELECT no, member_no, name, tp, title, ment, theday, thetime, theage,
//             reg_date, last_update, hit, hide, prev, next, etc1, etc2, etc3, etc4
//      FROM mini_board_language ORDER BY no DESC;
//    (pass, ip 칸은 빼고 꺼냅니다)
// 2) node convert-lessons.mjs [--include-hidden]
//
// 칸의 뜻 (예전 레슨 등록 화면 newlesson.php 에서 확인)
//   prev = 가르칠 과목 코드, next = 배울 과목 코드, etc2 = 희망 위치,
//   theday = 요일 ("Monday,Tuesday"), thetime = 시간 코드 (10,14,16,18,20),
//   theage = "20-45", ment = 소개, name = 닉네임, member_no = 회원번호 (cl_member.no),
//   hit = 조회수, hide = 1 이면 숨긴 글 (기본은 옮기지 않음, --include-hidden 이면 "모집 완료"로 옮김)
import { readFileSync, writeFileSync } from 'node:fs'

const IN = 'data/legacy-lessons.json'
const OUT = 'data/lessons.json'
const includeHidden = process.argv.includes('--include-hidden')

// phpMyAdmin JSON 내보내기는 [{type:'header'}, {type:'table', data:[...]}] 모양입니다. 그냥 배열도 받습니다.
function readRows(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  if (Array.isArray(raw) && raw.some((x) => x?.type === 'table')) return raw.filter((x) => x.type === 'table').flatMap((t) => t.data ?? [])
  if (Array.isArray(raw)) return raw
  throw new Error(`${path} 형식을 알 수 없습니다`)
}

// 예전 게시판은 글을 HTML 로 저장했을 수 있어서 글자로 되돌립니다.
function toText(html) {
  const decode = (t) =>
    t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&')
  const strip = (t) => t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n').replace(/<\/?[a-z][^>]*>/gi, '')
  // 한 번 이스케이프된 태그(&lt;br /&gt;)도 있어서: 태그 제거 → 문자 되돌리기 → 다시 태그 제거
  return strip(decode(strip(String(html ?? ''))))
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// 시간 코드 → 오전 / 오후 / 저녁
const SLOT_OF = { 10: 'morning', 14: 'afternoon', 16: 'afternoon', 18: 'evening', 20: 'evening' }
function timeSlots(v) {
  const codes = String(v ?? '').split(/[^0-9]+/).filter(Boolean).map(Number)
  return [...new Set(codes.map((c) => SLOT_OF[c]).filter(Boolean))]
}

function ages(v) {
  const m = String(v ?? '').match(/(\d{2})\D+(\d{2})/)
  if (m) return [Number(m[1]), Number(m[2])]
  const one = String(v ?? '').match(/(\d{2})/)
  return one ? [Number(one[1]), null] : [null, null]
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

const rows = readRows(IN)
const out = []
let hidden = 0
for (const r of rows) {
  const isHidden = String(r.hide) === '1'
  if (isHidden && !includeHidden) {
    hidden++
    continue
  }
  const [ageMin, ageMax] = ages(r.theage)
  const memberNo = num(r.member_no)
  out.push({
    no: num(r.no),
    legacyUserId: memberNo > 0 ? memberNo : null,
    authorName: toText(r.name),
    teach: num(r.prev),
    learn: num(r.next),
    region: toText(r.etc2),
    days: String(r.theday ?? ''),
    timeSlots: timeSlots(r.thetime),
    ageMin,
    ageMax,
    content: toText(r.ment),
    views: num(r.hit) ?? 0,
    createdAt: num(r.reg_date),
    updatedAt: num(r.last_update) || num(r.reg_date),
    closed: isHidden,
  })
}

writeFileSync(OUT, JSON.stringify(out, null, 1))
const noTeach = out.filter((l) => !l.teach || !l.learn).length
console.log(`레슨 ${rows.length}개 읽음 → ${out.length}개를 ${OUT} 에 씀 (숨긴 글 ${hidden}개 제외${includeHidden ? ' 안 함' : ''})`)
if (noTeach) console.warn(`  ⚠️ 과목 코드(prev/next)가 비어 있는 글 ${noTeach}개 → import 때 건너뜁니다`)
console.log('다음: node import-lessons.mjs --dry-run')
