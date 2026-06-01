# CLAUDE.md — 開發者指引

## 專案簡介

純前端甘特圖生成器，無框架、無建置工具。直接用瀏覽器開啟 `index.html` 即可運作。完整規格請見 [SPEC.md](SPEC.md)。

## 啟動方式

直接在瀏覽器開啟 `index.html`（推薦使用 VS Code Live Preview 或任意 HTTP server）。不需要 `npm install`，沒有 build step。

## 重要規則

- **不使用任何 JS 框架或模組系統**：所有 JS 以 `<script src="...">` 全域載入，函式直接掛在 `window`。
- **不引入新的 npm 套件**：唯一的外部依賴是 html2canvas（CDN）。
- **不加不必要的抽象**：直接修改對應檔案，不要新增 utils 層或 service 層。

## 檔案職責

| 檔案 | 職責 | 注意事項 |
|------|------|----------|
| `js/data.js` | 資料模型、localStorage、CRUD | 最先載入，其他檔案依賴此檔案的全域函式 |
| `js/i18n.js` | 中英文翻譯字典、`t(key)` / `setLang()` / `applyLang()` | data.js 之後載入；renderer/modal/export/app 均依賴 `t()` |
| `js/renderer.js` | SVG 渲染、視圖模式、展開狀態 | `DAY_WIDTH` 和 `viewState` 是全域，drag.js 直接依賴；`svgTheme(light,dark)` 和 `effectiveColor(hex)` 負責 dark mode 色彩適配 |
| `js/drag.js` | 鼠標拖曳邏輯 | 直接使用 renderer.js 的全域 `DAY_WIDTH`、`viewState`、`strToDate`、`addDays`、`dateToStr` |
| `js/modal.js` | 任務新增/編輯彈窗 | 含子任務列表管理，`window.openEditModal` / `openAddModal` / `openAddSubTaskModal`；`returnStack`（陣列）記錄 modal 導航路徑，關閉時 pop 回上一層 modal |
| `js/export.js` | PNG 匯出、剪貼簿複製、HTML 預覽匯出 | 依賴 html2canvas CDN；`exportHtmlPreview()` 需 HTTP 環境（fetch） |
| `js/app.js` | 初始化、事件綁定、CSV 讀寫 | `currentFileHandle` 存放目前開啟的 File System API handle；`isDirty` 追蹤未儲存狀態；`window._ganttDataChanged` 由 data.js 呼叫；`initTheme()` / `setTheme()` 管理深色模式 |
| `css/style.css` | 所有樣式 | 無 CSS preprocessor |
| `index.html` | HTML 結構 | script 載入順序：data → i18n → renderer → drag → modal → export → app |

## 常見開發任務

### 調整橫條比例

修改 `js/renderer.js` 頂部常數：

```js
const PLAN_BAR_H = 18;      // 計劃條高度
const ACTUAL_BAR_H = 10;    // 實際條高度
const BARS_GAP = 1;         // 兩條間距
const ROW_HEIGHT = 52;      // 頂層任務列高
const SUB_ROW_HEIGHT = 38;  // 子任務列高
```

**注意**：`planY`（計劃條起始 Y）和 `actualY`（實際條起始 Y）不再是固定常數，而是在 `renderBarsGroup()` 中依列高動態計算：
- 頂層任務：`planY = rowTop + Math.round((ROW_HEIGHT - BARS_TOTAL_H) / 2)`（置中）
- 子任務：`planY = rowTop + SUB_BAR_OFFSET`（固定偏移，保持各子列間距一致）
- `actualY = planY + PLAN_BAR_H + BARS_GAP`

列高由 `getRowHeight(index, flatItems)` 依上下文決定（展開父列、子列、最後子列各不同）。

### 新增任務欄位

1. `js/data.js` `addTask()` 加入欄位並設預設值
2. `index.html` modal 表單加入 input
3. `js/modal.js` `openModal()` 讀取欄位值，`form.submit` 寫入欄位
4. `js/app.js` `buildCsvContent()` 和 `parseCsv()` 同步新增欄位

### 修改 SVG 渲染

渲染流程：`render()` → `getFlattenedItems()` → `renderTimelineHeaderTo()` + `renderTaskListTo()` + `renderGanttSVGTo()` → `renderBarsGroup()`

- 所有 SVG 元素用 `svgEl(tag, attrs, text)` helper 建立
- X 座標計算：`xCtx(date, ctx)` 使用 context 的 startDate 和 dayWidth
- 主面板用全域 `xForDate(date)`（對應 drag.js）；子面板用 `xCtx(date, ctx)`

### 新增 toolbar 按鈕

1. `index.html` 加入 `<button id="btn-xxx">`
2. `js/app.js` `initApp()` 加入 `document.getElementById('btn-xxx').addEventListener('click', ...)`

### 新增或修改 UI 文字

所有 UI 文字都透過 `js/i18n.js` 管理：

1. 在 `I18N.zh` 和 `I18N.en` 兩個物件中同時新增同一個 key
2. 靜態 HTML 元素：加上 `data-i18n="key"` 屬性，`applyLang()` 會自動更新 `textContent`
   - 若元素含子節點（如 `<span>`），改用 `<span data-i18n="key">` 包住文字部分
   - input placeholder 用 `data-i18n-placeholder="key"`
3. 動態 JS 文字（modal 標題、alert、toast）：直接呼叫 `t('key')`

```js
// i18n.js 新增 key
zh: { myKey: '中文文字' },
en: { myKey: 'English text' },

// HTML 靜態元素
<button data-i18n="myKey">中文文字</button>

// JS 動態文字
alert(t('myKey'));
```

### SVG 點擊事件注意事項

SVG 內部 class 選擇器（`e.target.classList.contains(...)`）不可靠，一律改用 data attribute：

```js
const el = e.target.closest('[data-id]');
const id = parseInt(el?.getAttribute('data-id'));
```

拖曳 handle 的識別用 `e.target.getAttribute('class')?.includes('drag-handle')`。

## 視圖模式

| 模式 | 說明 |
|------|------|
| `hierarchy` | 展開後子任務縮排顯示於同一圖表，用 `expandedSet`（Set）追蹤展開狀態 |
| `subpanel` | 點擊父任務後，下方顯示獨立子甘特圖，`selectedParentId` 記錄目前選中的父任務 |

切換模式：`setViewMode('hierarchy' \| 'subpanel')`，會自動存入 localStorage。

## CSV 格式

匯出格式見 SPEC.md。`buildCsvContent()` 負責生成，`parseCsv()` 負責解析。

**重要**：`parseCsv()` 做兩遍處理（two-pass）確保 id re-mapping 正確：
1. 第一遍：建立任務，記錄 `oldId → newId` 的映射（`idMap`）
2. 第二遍：用 `idMap` 更新 `dependencies` 和 `parentId`

## 資料版本

`DATA_VERSION`（目前為 3）在 `js/app.js` 頂部定義。升版時清除 localStorage 舊資料。只有在資料結構有**破壞性變更**時才需要升版。

## 瀏覽器相容性

- 主要目標：Chrome / Edge（支援 File System Access API）
- Firefox / Safari：可用，但 CSV 儲存降級為下載
- 圖片複製功能需要 `ClipboardItem` API（Chrome 84+）
- HTML 預覽匯出需 HTTP 環境（`fetch()` 在 `file://` 下受安全限制）

## 已知開發注意事項

**VS Code Live Preview + CSV 存檔**：Live Preview 監聽整個 workspace 的檔案變更。若 CSV 儲存在專案資料夾內，File System Access API 寫入後會觸發 Live Preview 自動重整頁面，導致 JS 狀態（currentFileHandle）遺失。

解法：開發時將 CSV 存放在**專案資料夾外**（如桌面、Documents），或直接在 GitHub Pages 上使用。
