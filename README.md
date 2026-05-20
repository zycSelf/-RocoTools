# Roco Tools - 洛克王国世界数据工具

洛克王国世界（Roco World）游戏数据爬取、存储与展示工具集。

**在线体验**：待部署  
**数据来源**：[洛克王国世界 BWIKI](https://wiki.biligame.com/rocom)  
**源码仓库**：[GitHub](https://github.com/zycSelf/-RocoTools)

---

## 项目结构

```
-RocoTools/
├── crawler/                # Python 爬虫（并发模式，5-8 分钟全量）
│   ├── run.py              # 总入口（--full / --update）
│   ├── scrapers/           # 各数据源爬虫
│   └── utils/              # 下载工具 + 校验报告
├── data/                   # 爬取数据（JSON + 图片，不纳入 git）
│   ├── elements/           # 属性克制关系（18 种）
│   ├── skills/             # 技能数据（469+）
│   ├── eggs/               # 蛋组数据（15 组）
│   ├── pets/               # 精灵数据（466+）
│   ├── public/             # 图片静态资源
│   ├── FIELDS.md           # 字段对照表
│   └── STRUCTURE_RULES.md  # 数据结构化规则
├── app/                    # 应用层
│   ├── server/             # Express 后台（SQLite + RESTful API）
│   └── client/             # Vue3 前端（Vite + TailwindCSS + Sass）
│       └── RESPONSIVE.md   # 移动端适配规范
└── .ai-memory.md           # AI 协作记忆文件（跨设备同步用）
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 爬虫 | Python 3, requests, BeautifulSoup4, 并发线程池 |
| 后台 | Node.js, Express, better-sqlite3 |
| 前端 | Vue 3, Vue Router, Vite, TailwindCSS, Sass |
| 数据库 | SQLite3（轻量单文件） |
| 部署 | 前端 build → server/public/，单服务部署 |

---

## 功能一览

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 数据概览、快速导航、版权声明 |
| 精灵图鉴 | `/pets` | 搜索/属性筛选/排序/分页 |
| 精灵详情 | `/pets/:uid` | 立绘切换、种族值雷达图、属性克制、打击面分析、技能列表 |
| 技能列表 | `/skills` | 按属性/分类/应对/效果关键词筛选 |
| 技能详情 | `/skills/:uid` | 技能数据 + 可学习精灵（按来源分类） |
| 打击面分析 | `/coverage` | 选属性组合 → 查匹配精灵（含血脉） |
| 蛋组 | `/eggs` | 15 种蛋组及其精灵成员 |
| 属性克制 | `/elements` | 克制表(18×18)、双属性表(171行)、详细查询 |

---

## 快速开始

```bash
# 1. 爬虫 - 爬取数据
pip install -r crawler/requirements.txt
python crawler/run.py --full

# 2. 后台 - 初始化数据库
cd app/server
npm install && npm run setup

# 3. 前端 - 开发模式
cd app/client
npm install && npm run dev

# 4. 生产部署（单服务）
cd app/client && npm run build
cd ../server && npm run dev    # http://localhost:3000
```

---

## 数据流

数据源自 [洛克王国世界 BWIKI](https://wiki.biligame.com/rocom)，由自动化爬虫采集、清洗、结构化后同步至 SQLite，前端通过 API 读取展示。

```
BWIKI → crawler(采集+清洗) → data/(JSON+图片) → SQLite(结构化入库) → API → 前端展示
```

---

## 爬虫执行顺序

| 步骤 | 脚本 | 说明 |
|------|------|------|
| 1 | fetch_element_chart.py | 属性克制关系 |
| 2 | process_element_chart.py | 属性结构化 + 图标本地化 |
| 3 | fetch_skill_list.py | 技能列表 + 图标 |
| 4 | fetch_egg_group.py | 蛋组归属数据 |
| 5 | fetch_pet_list.py | 精灵列表 + 缩略图 + 注入 egg_groups |
| 6 | fetch_pet_detail.py | 精灵详情 + 立绘 + 映射刷新 |

---

## 核心数据模型

4 层关联：**属性(18) → 技能(469+) → 蛋组(15) → 精灵(466+)**

详见：
- [data/FIELDS.md](./data/FIELDS.md) — 字段对照表
- [data/STRUCTURE_RULES.md](./data/STRUCTURE_RULES.md) — 数据结构化规则

### 属性克制计算

属性克制关系**不从 BWIKI 爬取**（页面模板不统一），而是通过 `element_chart.json` + 精灵属性**实时计算**。

**规则（双属性乘积法）**：
- A 的 `strong_against` 含目标 → ×2
- 目标的 `resistant_to` 含 A → ×0.5
- 双重克制(2×2) → ×3（`double_strong`）
- 双重抵抗(0.5×0.5) → ×0.25（`double_resist`）

---

## 开发规范

### 前端适配规范

详见 [app/client/RESPONSIVE.md](./app/client/RESPONSIVE.md)

核心原则：
- **Mobile-first**：先写移动端样式，用 `md:` (768px) 覆盖桌面端
- 导航栏：移动端汉堡菜单，桌面端水平导航
- 表格：移动端用卡片替代或横滚
- 统一使用 Tailwind 响应式断点

### 数据规范

- 空值使用 `null`，不用空字符串
- 图片路径统一 `/public/...` 格式
- UID 格式：`elem_{id}`、`skill_{N}`、`pet_{id}` 或 `pet_{id}_{N}`
- 增量判断通过 `version` 字段
- 执行顺序严格按依赖关系

### 代码规范

- Service 层独立于 Express，可复用到 Electron IPC
- 前端组件单文件 `.vue`，TailwindCSS 优先
- 暗色模式通过 `body.dark` 类切换
- 主题色：`#D69F23`（primary-500）

---

## 版权声明

© 2026 Roco Tools Developed by [@eachzhang](https://github.com/zycSelf)

- 本项目部分数据与内容引用自 [B站洛克王国Wiki](https://wiki.biligame.com/rocom/)，其版权归哔哩哔哩游戏wiki所有。
- 洛克王国游戏及相关IP版权归腾讯公司所有。
- 本项目仅用于学习交流，非官方应用，无任何商业用途。

## 协议

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) — 数据来自洛克王国世界 BWIKI，非商业用途。

详见 [LICENSE](./LICENSE)。
