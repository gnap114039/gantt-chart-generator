# 甘特圖生成器 — 規格文件

## 專案概述

純前端甘特圖生成器，無需後端或安裝。單一 `index.html` 直接在瀏覽器開啟即可使用。主要用途為專案報告輸出，支援視覺化編輯、計劃 vs 實際對比、子任務展開，以及 CSV 存檔。

---

## 技術架構

| 項目 | 選擇 |
|------|------|
| 語言 | 純 HTML / CSS / JavaScript（無框架、無建置工具） |
| 圖表渲染 | SVG（inline，動態產生） |
| 拖曳互動 | 自訂 mousemove/mousedown/mouseup |
| 圖片匯出 | html2canvas（CDN） |
| 資料持久化 | localStorage |
| 檔案存取 | File System Access API（Chrome/Edge），fallback 為下載 |

---

## 檔案結構

```
gantt_chart_generator/
├── index.html              主頁面，所有 HTML 結構與引用
├── css/
│   └── style.css           版面配置與視覺樣式
├── js/
│   ├── data.js             資料模型、localStorage CRUD、helper 函式
│   ├── i18n.js             中英文翻譯字典、t() / setLang() / applyLang()
│   ├── renderer.js         SVG 渲染引擎（時間軸、橫條、連線、子面板）
│   ├── drag.js             拖曳互動（移動、調整計劃/實際橫條邊界）
│   ├── modal.js            新增/編輯任務彈窗，含子任務管理
│   ├── export.js           圖片匯出（PNG/剪貼簿）、HTML 預覽匯出
│   └── app.js              初始化、事件綁定、CSV 開啟/儲存/匯出
├── .github/workflows/
│   └── deploy.yml          GitHub Actions 自動部署到 GitHub Pages
├── .gitignore
├── .nojekyll               停用 GitHub Pages 的 Jekyll 處理
├── README.md
├── SPEC.md
└── CLAUDE.md
```

> script 載入順序：`data → i18n → renderer → drag → modal → export → app`

> 所有 JS 檔案以全域 script 載入，不使用 ES modules，函式均掛載於 `window` 全域。

---

## 資料模型

### Task

```js
{
  id: number,           // 自動遞增，從 1 開始
  name: string,
  start: string,        // 'YYYY-MM-DD'
  end: string,          // 'YYYY-MM-DD'（里程碑時 end === start）
  color: string,        // hex color，例如 '#4A90D9'
  isMilestone: boolean,
  dependencies: number[],   // 前置任務 id 陣列
  actualStart: string|null, // 實際開始日期
  actualEnd: string|null,   // 實際結束日期
  progress: number,         // 0–100，完成百分比
  parentId: number|null,    // 子任務的父任務 id，頂層任務為 null
}
```

### localStorage keys

| Key | 內容 |
|-----|------|
| `gantt_tasks` | `{ tasks: Task[], nextId: number }` |
| `gantt_project_name` | 專案名稱字串 |
| `gantt_view_mode` | `'hierarchy'` 或 `'subpanel'` |
| `gantt_version` | 資料版本號（目前為 3） |
| `gantt_lang` | `'zh'` 或 `'en'`，預設 `'zh'` |
| `gantt_theme` | `'light'` 或 `'dark'`，預設 `'light'` |

> 版本號升級時會清除舊資料並重新產生範例。

---

## 功能規格

### 甘特圖渲染

- 時間軸表頭：月份列（上）+ 日期列（下），週末顯示淡灰背景
- 今日線：橘色虛線，自動定位
- 列高依層級不同：
  - 頂層任務列：52px
  - 子任務列：38px（最後一個子任務為 45px，確保與下一父任務間距一致）
  - 計劃條和實際條位置依列高動態垂直置中
  - **計劃條**（高 18px）：外框樣式，顯示任務名稱
  - **實際條**（高 10px）：實色，含進度填充與百分比文字
- 里程碑：菱形（旋轉 45° 的正方形），顯示於計劃日期
- 依賴關係：貝茲曲線箭頭，連接前置任務結尾與後置任務起點

### 時間縮放

- `DAY_WIDTH` 根據右側面板寬度自動計算（`availableWidth / totalDays`）
- 限制範圍：16px–64px per day
- 視窗或面板大小改變時（ResizeObserver，80ms debounce）自動重算

### 拖曳互動

- **計劃條**：拖曳中央移動整條；拖曳左/右邊緣調整 start/end
- **實際條**：同上，調整 actualStart/actualEnd
- 吸附至天（snap to day）
- `data-type="plan"` 或 `"actual"` 區分兩條

### 子任務（兩層）

- `parentId` 欄位關聯父子任務，最多兩層（頂層 + 子層）
- **層級模式（hierarchy）**：父任務可展開/收合，子任務縮排顯示於同一圖表
- **分頁模式（subpanel）**：點擊父任務在下方展開獨立子甘特圖（main-area 58% / 42% 分割）
- 父任務橫條右側顯示 `N ▸/▾` 標籤，點擊橫條觸發展開/收合
- 刪除父任務時，子任務一併刪除

### 子任務視覺標示

- 父任務橫條右側顯示子任務數量與展開方向（`▸` 收合 / `▾` 展開）
- 展開後（層級模式）在 SVG 繪製 L 形層級連線（顏色同任務，透明度 0.35）

### 完成狀態視覺標示（progress = 100）

- 計劃條右上角顯示圓形 ✓ badge（顏色同任務色，白色打勾）
- 左側任務清單名稱顯示刪除線（`text-decoration: line-through`）

### 鍵盤操作

- `Esc`：關閉任務編輯 modal（等同點擊取消或背景遮罩）

### 圖片匯出

- **下載 PNG**：html2canvas 截取 `#gantt-container`，scale = 2
- **複製**：Clipboard API（`ClipboardItem`），不支援時提示改用下載

### CSV 格式

```csv
# 專案名稱
id,name,start,end,color,milestone,actualStart,actualEnd,progress,dependencies,parentId
1,需求分析,2025-05-01,2025-05-07,#4A90D9,false,2025-05-01,2025-05-08,100,,
6,用戶訪談,2025-05-01,2025-05-03,#4A90D9,false,2025-05-01,2025-05-03,100,,1
2,設計階段,2025-05-05,2025-05-13,#7B61FF,false,,,0,1,
```

- 第一行 `# 專案名稱` 為選填 comment
- `dependencies`：多個值以 `;` 分隔（避免 CSV 逗號衝突）
- `parentId`：空字串表示頂層任務
- 欄位含逗號或引號時以 `"..."` 包裹（RFC 4180 標準）
- 匯入時自動重新映射 `id`，確保 dependencies/parentId 關係正確

### CSV 檔案操作

| 功能 | 說明 |
|------|------|
| 開啟 CSV | 使用 File System Access API（Chrome/Edge），保存 file handle |
| 儲存（Ctrl+S）| 寫回目前開啟的 CSV；無 handle 時觸發另存新檔對話框 |
| 匯出 CSV | 另存新檔，不影響目前的 file handle |
| Fallback | Firefox/Safari 不支援 File System Access API，儲存降級為下載 |

---

## UI 版面

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Toolbar: 專案名稱(可編輯) | + 新增任務 | ☰ 層級 ⊞ 分頁 |                     │
│          開啟CSV 儲存 匯出 | 📄 filename.csv | 匯出圖片 複製圖片              │
│          匯出HTML | 中 EN | 🌙 | ？                                           │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ 任務清單（左）│ 時間軸表頭（sticky）                                          │
│ 200px 固定   │────────────────────────────────────────────────────────────── │
│              │ SVG 甘特圖（可橫向/縱向捲動）                                  │
│ ▾ 需求分析   │ [計劃條═══════════] 3 ▾                                       │
│   └ 用戶訪談 │     [實際條▓▓▓▓▓100%]                                         │
│   └ 文件撰寫 │  L─ [計劃條══]                                                │
│ ▸ 設計階段   │     [實際條▓▓▓]                                               │
├──────────────┴───────────────────────────────────────────────────────────────┤
│ 子任務面板（分頁模式，42% 高）                                                 │
│ 子任務 · 需求分析 [+ 新增子任務] [✕]                                          │
│ 任務清單 + 子甘特圖（獨立時間軸）                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 渲染常數（renderer.js）

| 常數 | 值 | 說明 |
|------|----|------|
| `ROW_HEIGHT` | 52 | 頂層任務列高（px） |
| `SUB_ROW_HEIGHT` | 38 | 子任務列高（px） |
| `LAST_CHILD_ROW_HEIGHT` | 45 | 最後子任務列高（px），確保與下一父任務間距一致 |
| `PLAN_BAR_H` | 18 | 計劃條高度（px） |
| `ACTUAL_BAR_H` | 10 | 實際條高度（px） |
| `BARS_GAP` | 1 | 計劃條與實際條間距（px） |
| `BARS_TOTAL_H` | 29 | 兩條合計高度（PLAN_BAR_H + BARS_GAP + ACTUAL_BAR_H） |
| `SUB_BAR_OFFSET` | 5 | 子任務橫條距列頂距離（px），= `(SUB_ROW_HEIGHT - BARS_TOTAL_H) / 2` |
| `MILESTONE_SIZE` | 14 | 里程碑菱形半徑（px） |
| `MIN_DAY_WIDTH` | 16 | 每天最小寬度（px） |
| `MAX_DAY_WIDTH` | 64 | 每天最大寬度（px） |

> `planY`（計劃條起始 Y）依列高動態計算：子任務列固定用 `SUB_BAR_OFFSET`；頂層任務列置中計算 `(ROW_HEIGHT - BARS_TOTAL_H) / 2`。`actualY = planY + PLAN_BAR_H + BARS_GAP`。

---

### 多語言（i18n）


- 語言：繁體中文（預設）/ 英文
- 翻譯字典在 `js/i18n.js` 的 `I18N` 物件中維護
- `t(key)` — 取得當前語言的翻譯文字
- `setLang(lang)` — 設定語言並寫入 localStorage（key: `gantt_lang`）
- `applyLang()` — 更新所有 `data-i18n` / `data-i18n-placeholder` 屬性的元素
- 語言切換後呼叫 `applyLang()` 再 `render()`，確保動態渲染的文字也同步更新

### 深色模式（Dark Mode）

- 工具列 `🌙 / ☀` 按鈕手動切換，偏好儲存於 localStorage（key: `gantt_theme`）
- 所有 HTML/CSS 元素透過 CSS custom properties（`--bg`、`--surface` 等）自動切換
- SVG 元素使用 `svgTheme(light, dark)` helper 在 render 時選擇對應色值
- 任務自訂色使用 `effectiveColor(hex)`：dark mode 下若亮度低於 35% 自動調亮，避免深色任務消失在深色背景

### HTML 預覽匯出

- 功能：將當前甘特圖匯出為單一自含 `.html` 檔案
- 做法：`fetch()` 讀取 `css/style.css`、`js/data.js`、`js/i18n.js`、`js/renderer.js`，連同任務資料內嵌至 HTML
- 匯出檔功能：展開/收合子任務、切換 hierarchy/subpanel 視圖模式
- 不含功能：拖曳編輯、任務新增/刪除、CSV 存取、圖片匯出
- 限制：需 HTTP 環境（VS Code Live Preview 或 GitHub Pages），`file://` 協議下 `fetch()` 受安全限制無法運作
- 任務資料以 IIFE 注入，首次載入時寫入匯出檔的 localStorage；之後該檔案的修改（如展開狀態）保存在使用者自己的 localStorage

---

## 已知限制

- 子任務最多兩層（設計上限制）
- 圖片匯出依賴 html2canvas CDN，離線環境無法使用
- HTML 預覽匯出需 HTTP 環境（GitHub Pages 或本地 HTTP server），`file://` 不支援
- File System Access API 僅 Chrome/Edge 支援；Firefox/Safari 降級為下載
- 使用 VS Code Live Preview 開發時，若 CSV 儲存在專案資料夾內，存檔會觸發頁面重整（建議將 CSV 儲存在專案資料夾外）
- 無多人協作，資料僅存於本機 localStorage 與 CSV
- 依賴關係箭頭不支援跨子任務層級（僅同層任務）
