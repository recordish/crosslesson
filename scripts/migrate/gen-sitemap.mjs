// 사이트맵 만들기: public/sitemap.xml (레슨 상세 페이지 전체 + 고정 페이지)
// 레슨이 많이 늘었을 때 다시 실행하고 배포하세요.
//   GOOGLE_APPLICATION_CREDENTIALS=... node gen-sitemap.mjs
import { writeFileSync } from 'node:fs'
import { db } from './admin.mjs'

const SITE = 'https://crosslesson.com'
const day = (ms) => new Date(ms).toISOString().slice(0, 10)

const snap = await db.collection('lessons').select('no', 'updatedAt', 'createdAt', 'closed').get()
const lessons = snap.docs
  .map((d) => d.data())
  .filter((l) => Number.isInteger(l.no))
  .sort((a, b) => b.no - a.no)

const latest = Math.max(...lessons.map((l) => l.updatedAt || l.createdAt || 0), Date.now() - 864e5)
const urls = [
  { loc: '/', lastmod: day(latest), changefreq: 'daily', priority: '1.0' },
  { loc: '/about', changefreq: 'monthly', priority: '0.5' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.2' },
  ...lessons.map((l) => ({
    loc: `/lesson/${l.no}`,
    lastmod: day(l.updatedAt || l.createdAt),
    changefreq: l.closed ? 'yearly' : 'monthly',
    priority: l.closed ? '0.3' : '0.6',
  })),
]

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map((u) =>
      ['  <url>', `    <loc>${SITE}${u.loc}</loc>`, u.lastmod && `    <lastmod>${u.lastmod}</lastmod>`,
        `    <changefreq>${u.changefreq}</changefreq>`, `    <priority>${u.priority}</priority>`, '  </url>']
        .filter(Boolean).join('\n'))
    .join('\n') +
  '\n</urlset>\n'

writeFileSync(new URL('../../public/sitemap.xml', import.meta.url), xml)
console.log(`sitemap.xml: 주소 ${urls.length}개 (레슨 ${lessons.length}개)`)
