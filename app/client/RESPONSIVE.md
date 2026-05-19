# 移动端适配规范

## 断点策略

统一使用 Tailwind CSS 的 `md:` 断点（768px）作为移动端/桌面端分界线。

- **< 768px**：移动端布局
- **≥ 768px**：桌面端布局

辅助断点：`sm:` (640px) 用于小型平板过渡，`lg:` / `xl:` 用于大屏网格列数。

---

## 导航栏

| 属性 | 移动端 | 桌面端 |
|------|--------|--------|
| 高度 | `h-14` | `h-16` |
| 内边距 | `px-4` | `px-8` |
| 导航方式 | 汉堡菜单（展开式） | 水平链接 + 下拉 |
| Logo字号 | `text-xl` | `text-2xl` |

移动端导航菜单使用 `v-show` 控制显隐，点击跳转后自动关闭。

---

## 内容区

| 属性 | 移动端 | 桌面端 |
|------|--------|--------|
| 内边距 | `px-3 py-4` | `px-8 py-8` |
| 最大宽度 | `max-w-screen-2xl` | 同左 |

---

## 字号规范

| 场景 | 移动端 | 桌面端 |
|------|--------|--------|
| body基础 | `text-sm` (14px) | `text-base` (16px) |
| 页面标题 | `text-xl` | `text-2xl` |
| 卡片标题 | `text-base` | `text-lg` |
| 精灵名（详情） | `text-2xl` | `text-3xl` |
| 正文/表格内容 | `text-xs` ~ `text-sm` | `text-sm` ~ `text-base` |
| 辅助文字 | `text-[10px]` ~ `text-xs` | `text-xs` ~ `text-sm` |

---

## 间距规范

| 场景 | 移动端 | 桌面端 |
|------|--------|--------|
| card内边距 | `p-3` | `p-5` |
| 卡片间距 (gap) | `gap-2` ~ `gap-3` | `gap-4` |
| 段落间距 (mb) | `mb-3` ~ `mb-4` | `mb-5` ~ `mb-6` |
| 元素间隙 | `gap-1` ~ `gap-1.5` | `gap-2` ~ `gap-3` |

---

## 图标尺寸

| 场景 | 移动端 | 桌面端 |
|------|--------|--------|
| 属性筛选图标 | `w-6 h-6` | `w-8 h-8` |
| 属性筛选按钮 | `w-9 h-9` | `w-11 h-11` |
| 技能/属性标签图标 | `w-4 h-4` ~ `w-5 h-5` | `w-5 h-5` ~ `w-7 h-7` |
| PetCard立绘 | `w-20 h-20` | `w-28 h-28` |
| PetDetail立绘 | `w-36 h-36` | `w-48 h-48` |
| 切换缩略图 | `w-8 h-8` | `w-10 h-10` |

---

## 网格系统

### 精灵列表（PetCard）
```
grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5
```

### 精灵横向卡片（learners/eggs等）
```
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
```

### 属性选择网格（详细查询）
```
grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-9
```

### 打击面格子
```
grid-cols-2 md:grid-cols-4
```

---

## 表格处理

- **桌面端**：使用 `<table>` 布局，完整展示所有列
- **移动端**：
  - 技能列表改为卡片式 (`hidden md:block` 表格 + `md:hidden` 卡片)
  - 克制表使用 `overflow-x-auto` + `-mx-3 md:mx-0` 实现全宽横滚
  - 单元格尺寸缩小 (`w-8 h-8` vs `w-14 h-12`)
  - 文字用 `hidden md:block` 隐藏非关键信息

---

## 表单控件

| 控件 | 移动端 | 桌面端 |
|------|--------|--------|
| input | `w-full`, `px-3 py-2` | `w-52`, `px-4 py-2.5` |
| select | `text-sm`, flex-1 | `text-sm`, auto宽 |
| 按钮 | `px-2 py-0.5` ~ `px-2.5 py-1` | `px-3 py-1` ~ `px-4 py-2` |

---

## 特殊处理

### 雷达图
通过 `window.innerWidth` 监听 + `computed` 动态设置 size：
- 移动端：160px
- 桌面端：200px

### 文本截断
- 移动端技能描述使用 `line-clamp-2` 限制两行
- 桌面端不限制 (`md:line-clamp-none`)

### 横滚表格
克制表/双属性表在移动端使用负边距突破容器：
```html
<div class="overflow-x-auto -mx-3 md:mx-0 rounded-none md:rounded-xl">
```

### 触摸优化
```scss
body {
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
}
```

---

## 命名约定

- 所有响应式类使用 **mobile-first** 写法：先写移动端样式，再用 `md:` 覆盖桌面端
- 示例：`text-sm md:text-base`、`w-6 md:w-8`、`p-3 md:p-5`
- 隐藏/显示：`hidden md:block`（桌面可见）、`md:hidden`（仅移动可见）
