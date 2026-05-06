# Quartz 项目上下文（供 Claude 快速理解）

> 本文件由 Claude 生成，用于下次对话快速载入项目背景，避免重复扫描代码库。
> 最后更新：2026-05-07

---

## 一、项目概览

**Tamino's Wiki** —— 基于 [Quartz v4](https://quartz.jzhao.xyz/) 构建的个人知识库静态站点。

| 项目 | 值 |
|---|---|
| 框架 | Quartz 4（TypeScript + Preact JSX，输出纯静态 HTML） |
| 语言/地区 | `zh-CN` |
| SPA | 已启用（`enableSPA: true`），页面跳转不刷新，靠 `nav` 自定义事件驱动组件更新 |
| 热更新 | dev 模式下修改内容/配置后自动重建，客户端通过 WebSocket 接收信号并触发 `nav` 事件 |
| 内容目录 | `content/`（Markdown 文件） |
| 主配置 | `quartz.config.ts` |
| 布局配置 | `quartz.layout.ts` |

---

## 二、主题颜色变量（CSS custom properties）

定义在 `quartz.config.ts` → `theme.colors`，编译后注入为 CSS 变量：

| 变量 | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--light` | `#faf8f8` | `#161618` | 背景 |
| `--secondary` | `#284b63` | `#7b97aa` | 文件夹标题、次要文字 |
| `--tertiary` | `#84a59d` | `#84a59d` | **强调色**（active 状态、高亮） |
| `--dark` | `#2b2b2b` | `#ebebec` | 正文 |
| `--gray` | `#b8b8b8` | `#646464` | 边框等 |

字体：`header: Schibsted Grotesk` / `body: Source Sans Pro` / `code: IBM Plex Mono`

---

## 三、目录结构关键路径

```
quartz/
├── components/
│   ├── Explorer.tsx              # Explorer 组件外壳（JSX 模板）
│   ├── DocumentCount.tsx         # 全局文章计数组件（左侧边栏顶部）
│   ├── scripts/
│   │   ├── explorer.inline.ts    # Explorer 客户端逻辑（核心）
│   │   └── documentCount.inline.ts
│   └── styles/
│       └── explorer.scss         # Explorer 样式
├── util/
│   └── fileTrie.ts               # FileTrieNode：文件树数据结构（核心）
├── plugins/
│   └── emitters/
│       └── contentIndex.tsx      # 生成 contentIndex.json（所有页面数据源）
quartz.config.ts                  # 主题、插件配置
quartz.layout.ts                  # 页面布局（左/右侧栏组件组合）
content/                          # Markdown 内容文件
```

---

## 四、Explorer 组件工作原理

### 4.1 架构分层

```
构建时（Node.js）
  contentIndex.tsx → 生成 /public/static/contentIndex.json
                     { slug: { title, filePath, ... }, ... }

运行时（浏览器）
  Explorer.tsx      → 渲染 HTML 外壳 + <template> 元素（不含实际列表）
  explorer.inline.ts→ 监听 nav 事件 → fetch contentIndex.json
                     → 构建 FileTrieNode 树 → 渲染 DOM 列表
```

### 4.2 数据流（每次页面跳转）

1. SPA 触发 `nav` 自定义事件（携带 `e.detail.url` = 当前 slug）
2. `setupExplorer()` 被调用
3. `fetchData`（已缓存的 Promise）返回 contentIndex 数据
4. `FileTrieNode.fromEntries(entries)` 构建文件树
5. 按 `order: ["filter", "map", "sort"]` 依次处理（默认过滤掉 `tags` 目录）
6. 遍历 `trie.children`（一级节点）创建 DOM，插入 `.explorer-ul`

### 4.3 热更新机制

dev 模式下新增/删除文章 → Quartz 重建 contentIndex.json → 客户端收到重载信号 → 触发 `nav` 事件 → `setupExplorer` 重新 fetch 数据并重建 DOM。**所有从 contentIndex 推导的展示数据（包括计数）均自动更新，无需额外处理。**

### 4.4 文件夹 DOM 模板（`template-folder`）

```html
<li>
  <div class="folder-container" data-folderpath="...">
    <svg class="folder-icon">...</svg>
    <div>
      <!-- folderClickBehavior="link" 时为 <a class="folder-title"> -->
      <!-- folderClickBehavior="collapse" 时为 <button><span class="folder-title"></span></button> -->
    </div>
  </div>
  <div class="folder-outer [open]">
    <ul class="content"><!-- 子节点递归插入 --></ul>
  </div>
</li>
```

---

## 五、FileTrieNode（`quartz/util/fileTrie.ts`）

关键属性和方法：

| 成员 | 说明 |
|---|---|
| `isFolder: boolean` | 是否为文件夹节点 |
| `children: FileTrieNode[]` | 子节点 |
| `displayName: string` | 展示名（优先级：override > title > fileSegmentHint > slugSegment） |
| `slug: FullSlug` | 完整路径（文件夹追加 `/index`） |
| `slugSegment: string` | 路径最后一段 |
| `numFiles: number` | **[自定义新增]** 递归统计叶子文件数量 |
| `.filter(fn)` | 原地过滤（类似 Array.filter） |
| `.map(fn)` | 原地 map |
| `.sort(fn)` | 原地排序 |
| `FileTrieNode.fromEntries(entries)` | 静态工厂方法，从 contentIndex 条目构建树 |

---

## 六、已完成的定制功能

### 6.1 全局文章计数（`DocumentCount.tsx`）

- 位置：左侧边栏，PageTitle 下方
- 展示文字：`已收录：N 个知识点 ✨`
- 数据来源：`documentCount.inline.ts` 客户端 fetch contentIndex，统计条目总数

### 6.2 Explorer 一级菜单文章计数（2026-05-07 新增）

**需求**：在左侧 Explorer 每个一级文件夹名称后显示 `(N)`，N 为该分类下文章总数（含嵌套）。

**改动文件**：

1. **`quartz/util/fileTrie.ts`** — 新增 `numFiles` getter：
   ```ts
   get numFiles(): number {
     if (!this.isFolder) return 1
     return this.children.reduce((sum, c) => sum + c.numFiles, 0)
   }
   ```

2. **`quartz/components/scripts/explorer.inline.ts`** — `createFolderNode` 增加 `showCount = false` 参数；为 `true` 时在标题元素后 append `<span class="folder-count">(N)</span>`；`setupExplorer` 遍历顶级 `trie.children` 时传 `true`，递归子层保持默认 `false`。

3. **`quartz/components/styles/explorer.scss`** — 新增 `.folder-count` 样式（`var(--tertiary)` 强调色，`0.8em` 字号，`pointer-events: none`）。

**设计决策**：
- 只有一级菜单显示计数，子目录不显示
- `tags` 目录被 `filterFn` 过滤，不计入
- 计数在 filter 之后计算，反映实际可见内容数量

---

## 七、布局组件组合（`quartz.layout.ts`）

左侧边栏（from top to bottom）：
```
PageTitle
DocumentCount       ← 全局计数
MobileOnly(Spacer)
Flex(Search + Darkmode + ReaderMode)
Explorer            ← 文件树导航
```

右侧边栏：`Graph / TableOfContents(DesktopOnly) / Backlinks`

---

## 八、开发注意事项

- `*.inline.ts` 文件是**纯客户端脚本**，通过 `afterDOMLoaded` 注入，不能使用 Node.js API
- `*.tsx` 组件在**构建时**执行（SSG），只生成 HTML 字符串
- 添加新的客户端行为：在对应 `*.inline.ts` 里监听 `nav` 事件（SPA 模式），并用 `window.addCleanup(() => ...)` 注册清理函数防止内存泄漏
- `fetchData` 是模块级缓存 Promise，整个 session 只 fetch 一次（除非页面刷新）
- 折叠状态存储在 `localStorage.fileTree`，滚动位置存储在 `sessionStorage.explorerScrollTop`
