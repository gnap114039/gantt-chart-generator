# Gantt Chart Generator / 甘特圖生成器

A zero-dependency, pure frontend Gantt chart tool. Open `index.html` directly in a browser — no install, no build step.

純前端甘特圖工具，無需安裝或建置。直接用瀏覽器開啟 `index.html` 即可使用。

**🔗 Live Demo**: [https://gnap114039.github.io/gantt-chart-generator/](https://gnap114039.github.io/gantt-chart-generator/)

---

## Screenshots / 畫面預覽

> Hierarchy mode (left) · Sub-panel mode (right)  
> 層級展開模式（左）· 子任務面板模式（右）

---

## Features / 功能特色

| Feature | 功能 |
|---------|------|
| Plan vs. Actual dual bars | 計劃條 + 實際條雙軌顯示 |
| Progress percentage | 進度百分比填充 |
| Two-layer task hierarchy | 兩層任務結構（父任務 + 子任務） |
| Hierarchy & Sub-panel view modes | 層級展開 / 子面板兩種視圖 |
| Drag-and-drop editing | 拖曳調整日期 |
| Milestone support | 里程碑（菱形）支援 |
| Dependency arrows | 任務依賴關係箭頭 |
| CSV open / save-in-place | CSV 開啟並直接回存 |
| PNG export & clipboard copy | 匯出 PNG 圖片 / 複製到剪貼簿 |
| Auto-scale to viewport | 根據視窗寬度自動縮放時間軸 |
| Unsaved-change warning | 離開頁面前提示未儲存變更 |
| HTML preview export | 匯出單一可攜帶的預覽 HTML 檔案 |
| Chinese / English UI | 介面中英文即時切換 |

---

## Quick Start / 快速開始

### English

1. Clone or download this repository.
2. Open `index.html` in Chrome or Edge (recommended for full File System API support).
3. Sample data loads automatically on first launch.

**Recommended**: Use [VS Code Live Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server) or any local HTTP server for the best experience.

### 中文

1. Clone 或下載此專案。
2. 用 Chrome 或 Edge 開啟 `index.html`（建議，完整支援 File System API）。
3. 首次開啟會自動載入範例資料。

**建議**：使用 [VS Code Live Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server) 或任意本地 HTTP server 以獲得最佳體驗。

---

## Usage / 使用說明

### Adding & Editing Tasks / 新增與編輯任務

**English**
- Click **+ Add Task** in the toolbar to create a new top-level task.
- Click on a task bar in the chart to open the edit dialog.
- In the edit dialog you can set: name, start/end dates, color, milestone flag, dependencies, progress, and actual dates.
- To add a sub-task, open a parent task's edit dialog and click **+ Add Sub-task** in the sub-task section.

**中文**
- 點擊工具列的 **+ 新增任務** 新增頂層任務。
- 點擊甘特圖中的任務橫條開啟編輯彈窗。
- 編輯彈窗可設定：任務名稱、開始/結束日期、顏色、是否里程碑、依賴前置任務、進度、實際日期。
- 新增子任務：開啟父任務的編輯彈窗，在下方「子任務」區塊點擊 **+ 新增子任務**。

---

### Drag-and-Drop / 拖曳操作

**English**
- **Move task**: Drag the center of a plan bar (outlined) or actual bar (solid) left/right.
- **Resize**: Drag the left or right edge of a bar to adjust its start or end date.
- Dates snap to whole days automatically.

**中文**
- **移動任務**：拖曳計劃條（外框樣式）或實際條（實色）的中央部分左右移動。
- **調整日期**：拖曳橫條的左側或右側邊緣，調整開始或結束日期。
- 日期自動吸附至整天。

---

### View Modes / 視圖模式

**English**

| Mode | Description |
|------|-------------|
| **Hierarchy** (☰) | Sub-tasks expand inline below their parent, with indent and connector lines. Click the task bar or the `N ▾` count label to toggle. |
| **Sub-panel** (⊞) | Click a parent task to open its sub-tasks in a separate panel at the bottom (42% of height). Click ✕ to close. |

**中文**

| 模式 | 說明 |
|------|------|
| **層級模式**（☰） | 子任務在父任務下方縮排展開，有 L 形連接線。點擊任務橫條或右側 `N ▾` 標籤切換展開/收合。 |
| **子面板模式**（⊞） | 點擊父任務，下方展開獨立子甘特圖（佔版面 42%）。點擊 ✕ 關閉。 |

---

### CSV File Operations / CSV 檔案操作

**English**

| Action | How |
|--------|-----|
| Open CSV | Toolbar → **Open CSV** · Stores a file handle so you can save back to the same file. |
| Save (in-place) | Toolbar → **Save** or **Ctrl+S / Cmd+S** · Writes back to the opened file. On first save (no file open), triggers Save As. |
| Export CSV | Toolbar → **Export CSV** · Always downloads a new copy; does not change the current file handle. |
| Unsaved indicator | The filename chip turns amber with an orange dot (●) when there are unsaved changes. |

> **Note**: In-place save uses the [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) and requires Chrome or Edge. Firefox/Safari fall back to file download.

**中文**

| 操作 | 方式 |
|------|------|
| 開啟 CSV | 工具列 → **開啟 CSV** · 記錄 file handle，後續可直接回存同一檔案。 |
| 儲存（回存） | 工具列 → **儲存** 或 **Ctrl+S / Cmd+S** · 寫回目前開啟的檔案；若尚未開啟檔案，則觸發另存新檔對話框。 |
| 匯出 CSV | 工具列 → **匯出 CSV** · 一律另存新檔下載，不影響目前的 file handle。 |
| 未儲存提示 | 有未儲存變更時，工具列的檔案名稱顯示變成琥珀色，並出現橘色圓點（●）。 |

> **注意**：回存功能使用 [File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)，需 Chrome 或 Edge。Firefox/Safari 會降級為下載檔案。

---

### Export Image / 匯出圖片

**English**
- **Download PNG**: Toolbar → **Export Image** — saves a high-resolution PNG (2× scale).
- **Copy to Clipboard**: Toolbar → **Copy Image** — copies the chart to the clipboard for pasting into documents or presentations. Requires Chrome 84+ (`ClipboardItem` API).

**中文**
- **下載 PNG**：工具列 → **匯出圖片** — 儲存高解析度 PNG（2× 縮放）。
- **複製到剪貼簿**：工具列 → **複製圖片** — 複製圖表到剪貼簿，可直接貼到 Word、Google Slides 等文件中。需 Chrome 84+（`ClipboardItem` API）。

---

### Language / 語言切換

**English**  
Click **中** / **EN** in the top-right area of the toolbar to switch the UI language instantly. The preference is saved in the browser and restored on next visit.

**中文**  
點擊工具列右側的 **中** / **EN** 按鈕，介面即時切換中英文。偏好設定儲存於瀏覽器，下次開啟自動套用。

---

### HTML Preview Export / 匯出 HTML 預覽

**English**  
Click **Export HTML** to generate a self-contained `.html` file with all task data embedded. Anyone can open it in a browser to view the chart and expand/collapse the task hierarchy — no server or installation required.

> **Requirement**: Must be used from VS Code Live Preview or GitHub Pages. Does not work when the main `index.html` is opened directly as `file://`.

**中文**  
點擊 **匯出 HTML** 生成單一 `.html` 檔案，任務資料直接內嵌其中。任何人用瀏覽器開啟即可查看甘特圖、展開/收合子任務階層，無需伺服器或安裝。

> **注意**：需在 VS Code Live Preview 或 GitHub Pages 下使用，不支援直接雙擊 `file://` 方式開啟主程式時使用。

---

### Project Name / 專案名稱

**English**  
Click the project name in the top-left of the chart panel to edit it inline. The name is saved in localStorage and included as the first line of exported CSV files.

**中文**  
點擊圖表左上角的專案名稱可直接編輯。名稱儲存於 localStorage，並作為匯出 CSV 的第一行。

---

## CSV Format / CSV 格式

```csv
# My Project
id,name,start,end,color,milestone,actualStart,actualEnd,progress,dependencies,parentId
1,Requirements,2025-05-01,2025-05-07,#4A90D9,false,2025-05-01,2025-05-08,100,,
6,User Interviews,2025-05-01,2025-05-03,#4A90D9,false,2025-05-01,2025-05-03,100,,1
2,Design,2025-05-05,2025-05-13,#7B61FF,false,,,0,1,
5,Launch,2025-05-20,2025-05-20,#F79009,true,,,0,,
```

- Line 1 (`# Project Name`) is optional.
- `dependencies`: multiple IDs separated by `;`.
- `parentId`: empty string for top-level tasks.
- Fields containing commas or quotes are wrapped in `"..."` (RFC 4180).
- IDs are remapped automatically on import — safe to edit CSV by hand.

---

## Browser Compatibility / 瀏覽器相容性

| Browser | Support |
|---------|---------|
| Chrome / Edge | Full support (File System API + Clipboard API) |
| Firefox / Safari | Functional; CSV save degrades to download; image copy may be unavailable |

---

## Deployment / 部署

This project is deployable as a static site with no configuration.

### GitHub Pages

A GitHub Actions workflow is included. After pushing to `main`:

1. Go to **Settings → Pages** in your GitHub repository.
2. Set Source to **GitHub Actions**.
3. Every push to `main` triggers an automatic deploy.

Live URL: [https://gnap114039.github.io/gantt-chart-generator/](https://gnap114039.github.io/gantt-chart-generator/)

---

## Tech Stack / 技術架構

| Item | Choice |
|------|--------|
| Language | Vanilla HTML / CSS / JavaScript (no framework, no build tools) |
| Chart rendering | Inline SVG (dynamically generated) |
| Drag interaction | Custom `mousedown / mousemove / mouseup` |
| Image export | [html2canvas](https://html2canvas.hertzen.com/) (CDN) |
| Data persistence | `localStorage` |
| File I/O | File System Access API (Chrome/Edge), download fallback |

---

## License / 授權

MIT
