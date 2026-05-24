# RocoTools 脚本工具

## 一、服务器数据同步脚本

`scripts/sync_from_server.sh` 用于将服务器上的数据库和图片同步到本地开发环境。

### 使用方法

```bash
# 仅同步数据库
bash scripts/sync_from_server.sh --db

# 仅同步图片（增量）
bash scripts/sync_from_server.sh --images

# 仅同步赛季备份文件
bash scripts/sync_from_server.sh --seasons

# 全部同步
bash scripts/sync_from_server.sh --all
```

### 功能说明

| 选项 | 说明 |
|------|------|
| `--db` | 下载服务器当前 `roco.db`，覆盖本地（自动备份旧文件） |
| `--images` | rsync 增量同步 `public/` 和 `uploads/` 目录 |
| `--seasons` | rsync 同步赛季备份到 `temp/seasons/` |
| `--all` | 以上全部 |

### 前置条件

- 本机已配置 SSH 免密登录到服务器（`ssh-copy-id eachzhang@43.138.230.96`）
- 本机已安装 `rsync`（Git Bash 自带）

### 管理端下载

也可以通过管理端 Dashboard 页面直接下载：
- **下载当前 DB** 按钮：下载当前线上数据库
- 各备份列表的 **下载** 按钮：下载指定备份文件

---

## 二、赛季公告生成脚本

`scripts/generate_patch_notes.js` 用于对比两个赛季的数据库快照，自动生成格式化的赛季更新公告文档（Markdown）。

### 使用方法

#### 前置条件

1. 从服务器下载两个赛季的数据库备份到 `temp/seasons/` 目录：
   ```bash
   # 方式一：使用同步脚本
   bash scripts/sync_from_server.sh --seasons

   # 方式二：手动 scp
   scp eachzhang@43.138.230.96:/var/www/roco/app/server/data/backups/seasons/season_S1_*.db temp/seasons/
   scp eachzhang@43.138.230.96:/var/www/roco/app/server/data/backups/seasons/season_S2_*.db temp/seasons/
   ```

2. 确保 `app/server/node_modules/better-sqlite3` 已安装。

### 运行命令

```bash
node scripts/generate_patch_notes.js <旧版本db> <新版本db> [--output <输出路径>]
```

### 示例

```bash
# 对比 S1 → S2，输出到 temp/patch_S2.md
node scripts/generate_patch_notes.js temp/seasons/season_S1_20260521.db temp/seasons/season_S2_20260524.db --output temp/patch_S2.md

# 不指定输出路径，默认输出到 temp/patch_notes_<新db文件名>.md
node scripts/generate_patch_notes.js temp/seasons/season_S1_20260521.db temp/seasons/season_S2_20260524.db
```

## 输出内容

生成的公告文档包含以下章节：

1. **更新概览** - 各类变更的数量汇总
2. **新增精灵** - 按进化线分组展示
3. **新增技能** - 表格展示（如有）
4. **技能调整** - 逐个列出能耗/威力/效果变化
5. **精灵特性调整** - 按相同改动分组，合并进化线
6. **精灵数值调整** - 表格展示六维变化和差值
7. **技能学习面变动** - 已有精灵新增/移除的可学习技能（如有）

## 过滤规则

脚本自动过滤以下非游戏性变更：
- `manual_edit` 标记变化
- `version` 字段变化
- 标签列变化（`is_final_form`, `is_legendary` 等）
- `show_shiny` 字段变化
- `level` 格式变化（如 "LV1" → "1"）

## 数据库备份命名规范

建议格式：`season_{赛季ID}_{日期YYYYMMDD}.db`

例如：
- `season_S1_20260521.db`
- `season_S2_20260524.db`
- `season_S3_20260701.db`

## 扩展

如需添加新的对比维度，修改 `scripts/generate_patch_notes.js` 中对应的数据收集和 Markdown 生成部分。
