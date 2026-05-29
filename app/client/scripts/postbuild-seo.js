/**
 * Post-build SEO script
 * Generates route-specific index.html files with proper meta tags,
 * canonical URLs, and JSON-LD structured data for search engines.
 *
 * Run after `vite build`: node scripts/postbuild-seo.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'server', 'public')
const BASE_URL = 'https://eachz.cn/rocotools'

// Route SEO definitions
const routes = [
  {
    path: '/',
    title: 'Roco Tools - 洛克王国世界数据工具',
    description: '洛克王国世界精灵图鉴、技能查询、属性克制计算、打击面分析、蛋组查询等实用数据工具。数据源自BWIKI，自动化采集更新。',
    keywords: '洛克王国世界,洛克王国,精灵图鉴,技能查询,属性克制,打击面分析,蛋组,种族值,Roco World',
  },
  {
    path: '/season',
    title: '赛季信息 - Roco Tools',
    description: '洛克王国世界当前赛季详情，包含赛季精灵、通行证奖励、赛季活动等信息。',
    keywords: '洛克王国世界赛季,赛季精灵,通行证,赛季活动',
  },
  {
    path: '/events',
    title: '活动日历 - Roco Tools',
    description: '洛克王国世界活动日历，实时追踪版本活动、领地试炼、大量出没、常驻课题等活动时间。',
    keywords: '洛克王国世界活动,活动日历,领地试炼,大量出没,命定花种',
  },
  {
    path: '/pets',
    title: '精灵图鉴 - Roco Tools',
    description: '洛克王国世界全精灵图鉴，支持按属性、蛋组、种族值筛选排序，查看精灵详细数据。',
    keywords: '洛克王国世界精灵,精灵图鉴,种族值,精灵属性,精灵列表',
  },
  {
    path: '/skills',
    title: '技能大全 - Roco Tools',
    description: '洛克王国世界全技能列表，支持按属性、类型、威力筛选，查看技能详细效果。',
    keywords: '洛克王国世界技能,技能大全,技能属性,技能威力,技能效果',
  },
  {
    path: '/coverage',
    title: '打击面分析 - Roco Tools',
    description: '洛克王国世界打击面分析工具，计算技能组合对全属性的覆盖情况，优化精灵配招。',
    keywords: '洛克王国世界打击面,属性克制,配招分析,技能覆盖',
  },
  {
    path: '/eggs',
    title: '蛋组查询 - Roco Tools',
    description: '洛克王国世界蛋组查询，查看15个蛋组分类及各蛋组包含的精灵列表。',
    keywords: '洛克王国世界蛋组,蛋组精灵,蛋组查询,蛋组分类',
  },
  {
    path: '/natures',
    title: '性格表 - Roco Tools',
    description: '洛克王国世界30种性格一览表，查看每种性格的加成与减益属性。',
    keywords: '洛克王国世界性格,性格加成,性格表,精灵性格',
  },
  {
    path: '/elements',
    title: '属性克制表 - Roco Tools',
    description: '洛克王国世界18种属性克制关系表，快速查询属性相克、抵抗关系。',
    keywords: '洛克王国世界属性,属性克制,属性相克,属性抵抗',
  },
  {
    path: '/pika',
    title: '皮卡月刊 - Roco Tools',
    description: '洛克王国世界皮卡月刊汇总，查看每期月刊精灵、时装概念图和上架时间。',
    keywords: '洛克王国世界皮卡月刊,月刊精灵,洛克时装,许愿星',
  },
  {
    path: '/fate-flower',
    title: '命定花种 - Roco Tools',
    description: '洛克王国世界命定花种精灵查询，查看当期和历史命定花种精灵及反制推荐。',
    keywords: '洛克王国世界命定花种,命定精灵,反制推荐,花种精灵',
  },
]

// JSON-LD structured data for the website
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Roco Tools - 洛克王国世界数据工具',
  url: BASE_URL + '/',
  description: '洛克王国世界精灵图鉴、技能查询、属性克制计算等实用数据工具',
  inLanguage: 'zh-CN',
}

function generateHtml(route, templateHtml) {
  const canonicalUrl = BASE_URL + (route.path === '/' ? '/' : route.path + '/')
  let html = templateHtml

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${route.title}</title>`
  )

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${route.description}" />`
  )

  // Replace meta keywords
  html = html.replace(
    /<meta name="keywords" content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${route.keywords}" />`
  )

  // Replace canonical URL
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  )

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${route.title}" />`
  )
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${route.description}" />`
  )
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  )

  // Add JSON-LD structured data before </head>
  const jsonLd = route.path === '/'
    ? JSON.stringify(websiteJsonLd)
    : JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: route.title,
        description: route.description,
        url: canonicalUrl,
        isPartOf: { '@type': 'WebSite', url: BASE_URL + '/' },
      })

  html = html.replace(
    '</head>',
    `  <script type="application/ld+json">${jsonLd}</script>\n</head>`
  )

  // Add noscript fallback content inside #app for crawlers that don't execute JS
  const noscriptContent = `<noscript><h1>${route.title}</h1><p>${route.description}</p><nav><a href="${BASE_URL}/">首页</a> | <a href="${BASE_URL}/pets/">精灵图鉴</a> | <a href="${BASE_URL}/skills/">技能大全</a> | <a href="${BASE_URL}/elements/">属性克制</a> | <a href="${BASE_URL}/events/">活动日历</a></nav></noscript>`

  html = html.replace(
    '<div id="app"></div>',
    `<div id="app">${noscriptContent}</div>`
  )

  return html
}

function main() {
  const indexPath = path.join(PUBLIC_DIR, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Build output not found. Run `vite build` first.')
    process.exit(1)
  }

  const templateHtml = fs.readFileSync(indexPath, 'utf-8')
  let count = 0

  for (const route of routes) {
    const html = generateHtml(route, templateHtml)

    if (route.path === '/') {
      // Overwrite root index.html
      fs.writeFileSync(indexPath, html, 'utf-8')
    } else {
      // Create subdirectory with index.html
      const dir = path.join(PUBLIC_DIR, route.path)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8')
    }
    count++
  }

  console.log(`✅ SEO: Generated ${count} pre-rendered HTML files with meta tags.`)
}

main()
