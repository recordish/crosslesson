// 레슨 분류(과목) 코드표
// 코드는 예전 crosslesson.com 의 분류 번호 체계(100단위 = 대분류)를 따릅니다.
//   class.php?d=204 (바이올린), learn.php?d=306 (영상) 처럼 옛 주소의 번호가 그대로 쓰입니다.
// ⚠️ 101 영어, 204 바이올린, 306 영상, 402 프로그래밍, 601 수영 외의 이름은
//    예전 DB의 분류표와 아직 대조하지 않았습니다. 데이터 이전 전에 꼭 맞춰 주세요.
export const GROUPS = [
  {
    id: 'language',
    name: '외국어',
    items: [
      [101, '영어'], [102, '중국어'], [103, '일본어'], [104, '프랑스어'], [105, '스페인어'],
      [106, '독일어'], [107, '러시아어'], [111, '한국어'], [112, '기타 외국어'],
    ],
  },
  {
    id: 'music',
    name: '음악',
    items: [
      [201, '피아노'], [202, '기타'], [203, '보컬'], [204, '바이올린'], [205, '첼로'],
      [206, '드럼'], [207, '우쿨렐레'], [208, '플루트'], [210, '작곡'], [211, '베이스'],
      [213, '색소폰'],
    ],
  },
  {
    id: 'art',
    name: '미술 · 디자인',
    items: [
      [301, '그림'], [302, '디자인'], [303, '사진'], [304, '캘리그라피'], [305, '공예'],
      [306, '영상'], [308, '일러스트'],
    ],
  },
  {
    id: 'computer',
    name: '컴퓨터',
    items: [[401, '오피스 · 엑셀'], [402, '프로그래밍'], [403, '포토샵'], [404, '웹 제작']],
  },
  {
    id: 'exercise',
    name: '운동',
    items: [
      [601, '수영'], [602, '헬스'], [603, '요가'], [604, '필라테스'], [605, '댄스'],
      [606, '테니스'], [607, '골프'], [608, '축구'], [609, '등산'], [613, '클라이밍'],
    ],
  },
  {
    id: 'study',
    name: '공부',
    items: [
      [701, '수학'], [702, '과학'], [703, '국어 · 논술'], [704, '자격증'],
      [705, '면접 · 취업'], [707, '독서'], [711, '기타 공부'],
    ],
  },
  { id: 'etc', name: '기타', items: [[999, '기타']] },
]

const BY_CODE = new Map(
  GROUPS.flatMap((g) => g.items.map(([code, name]) => [code, { code, name, group: g.id }])),
)

export const isCategory = (code) => BY_CODE.has(code)
export const categoryName = (code) => BY_CODE.get(code)?.name ?? `분류 ${code}`
export const categoryGroup = (code) => BY_CODE.get(code)?.group ?? 'etc'

// 시/도. 빈 문자열('')은 "지정 안 함"(예전 글 이전분 포함)입니다. 온라인 여부는 수업 방식(online/offline)으로 따로 저장합니다.
// firestore.rules 의 isSido 목록과 같아야 합니다.
export const SIDO = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '해외',
]

export function ageLabel(min, max) {
  if (min == null && max == null) return '나이 무관'
  if (min == null) return `~${max}세`
  if (max == null) return `${min}세~`
  return `${min}-${max}세`
}
