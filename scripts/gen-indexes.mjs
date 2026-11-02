// firestore.indexes.json 만들기: node scripts/gen-indexes.mjs
// 레슨 목록(src/services/lessonService.js listLessons)의 필터 조합마다 복합 색인이 하나씩 필요합니다.
//   같음 조건: teach, sido, 그리고 수업 방식(online 또는 offline 중 하나)
//   포함 조건: learns (array-contains)
//   정렬: no 내림차순
import { writeFileSync } from 'node:fs'

const indexes = []
for (const teach of [false, true])
  for (const sido of [false, true])
    for (const mode of [null, 'online', 'offline'])
      for (const learns of [false, true]) {
        const fields = []
        if (teach) fields.push({ fieldPath: 'teach', order: 'ASCENDING' })
        if (sido) fields.push({ fieldPath: 'sido', order: 'ASCENDING' })
        if (mode) fields.push({ fieldPath: mode, order: 'ASCENDING' })
        if (learns) fields.push({ fieldPath: 'learns', arrayConfig: 'CONTAINS' })
        if (fields.length === 0) continue // 필터 없음: 기본 색인으로 충분
        indexes.push({ collectionGroup: 'lessons', queryScope: 'COLLECTION', fields: [...fields, { fieldPath: 'no', order: 'DESCENDING' }] })
      }

writeFileSync(new URL('../firestore.indexes.json', import.meta.url), JSON.stringify({ indexes, fieldOverrides: [] }, null, 2) + '\n')
console.log(`색인 ${indexes.length}개를 firestore.indexes.json 에 썼습니다.`)
