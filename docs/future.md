# 動態社群題庫功能規劃書 (Dynamic Community Library Plan)

## 1. 專案概述 (Overview)

**目標**：將現有的靜態「推薦題庫」功能升級為動態的「社群題庫」。
**核心概念**：利用 Google Sheets 作為輕量級後端資料庫 (Serverless Database)，讀取由社群提交並經管理者審核的題庫列表。
**優勢**：零維護成本、即時更新、易於管理（僅需操作 Google Sheets）。

---

## 2. 系統架構 (Architecture)

### 資料流向
1.  **提交 (Write)**：使用者填寫 Google Form -> 資料寫入「Raw Data Sheet」。
2.  **審核 (Curate)**：管理者將合規的資料複製/移動到「Published Sheet (發布表)」。
3.  **發布 (Publish)**：「Published Sheet」發布為 Web CSV。
4.  **讀取 (Read)**：FlipQuiz App (前端) 透過 `fetch()` 抓取 Master CSV -> 解析並渲染列表。

### 資料庫設計 (The Master Sheet)

我們需要建立一張專用的 Google Sheet 作為索引目錄。

**建議欄位 (Headers)**：

| 欄位名稱 | 類型 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| `id` | String | 唯一識別碼 (UUID 或自動編號) | `lib_001` |
| `title` | String | 題庫標題 | `多益必考 500 單字` |
| `description` | String | 簡短說明 (建議限 50 字) | `針對 2026 新制多益設計...` |
| `category` | String | 分類標籤 | `語言學習` |
| `author` | String | 作者暱稱 | `EnglishMaster` |
| `csv_url` | String | **關鍵欄位**：題庫的 CSV 下載連結 | `https://docs.google.com/.../pub?output=csv` |
| `tags` | String | 標籤 (以分號隔開) | `TOEIC;單字;進階` |
| `created_at` | Date | 建立日期 | `2026-01-12` |
| `is_featured` | Boolean | 是否置頂推薦 (`TRUE`/`FALSE`) | `TRUE` |

---

## 3. 前端實作規劃 (Frontend Implementation)

### 3.1 核心邏輯 (`js/libraryLoader.js`)

需建立一個新的模組負責處理外部圖書館的邏輯。

**功能需求**：
1.  **Fetch & Parse**：使用與 `dataLoader.js` 相同的 CSV 解析邏輯 (基於 PapaParse 或簡易 regex) 讀取 Master Sheet。
2.  **Caching**：為了效能與減少請求，需將解析後的列表存入 `localStorage`，設定 TTL (例如 1 小時)。
    *   Key: `flipquiz_library_cache`
    *   Structure: `{ timestamp: 123456789, data: [...] }`
3.  **Filtering**：提供簡易的篩選功能 (依分類或關鍵字)。

### 3.2 UI 調整 (`js/ui.js` & `index.html`)

**修改目標**：
-   現有的 `#recommend-list` 容器將改為動態渲染。
-   新增 **搜尋/篩選列** 於 Modal 頂部。
-   新增 **載入狀態 (Skeleton Loading)** 動畫，優化等待體驗。

**UI 狀態流**：
1.  使用者點擊「📚 推薦」。
2.  檢查 Cache -> 若有效直接渲染。
3.  若無 Cache -> 顯示 Loading Spinner -> Fetch Master CSV -> 渲染列表 -> 存入 Cache。
4.  若 Fetch 失敗 -> 顯示錯誤訊息與「重試」按鈕。

### 3.3 投稿機制 (Submission)

-   在 Modal 底部保留「分享我的題庫」區塊。
-   連結至預先建立好的 **Google Form**。
-   Google Form 應包含說明：「請務必確認您的 Google Sheet 已發布為 CSV 格式」。

---

## 4. 執行步驟 (Execution Steps)

### Phase 1: 基礎建設
1.  建立 Google Sheet (Master Sheet) 並填入現有的靜態推薦資料作為測試數據。
2.  將 Master Sheet 發布為 CSV，取得 URL。
3.  建立 Google Form 用於收集使用者投稿。

### Phase 2: 程式開發
1.  **新增 `js/libraryLoader.js`**：
    -   實作 `fetchLibrary(masterUrl)`。
    -   實作 Cache 機制。
2.  **修改 `js/main.js`**：
    -   將原本引用 `recommendations.js` 的靜態資料改為呼叫 `libraryLoader.js`。
    -   定義 Master CSV 的 URL 常數。

### Phase 3: UI 優化
1.  **樣式升級 (`style.css`)**：
    -   為社群列表增加分類標籤 (Tags) 的樣式。
    -   增加搜尋框樣式。
2.  **搜尋功能**：
    -   在 Modal 內實作即時搜尋 (Real-time filtering)。

---

## 5. 安全性與限制 (Security & Limitations)

1.  **連結驗證**：前端讀取 Master CSV 後，應檢查每一列的 `csv_url` 是否為合法的 Google Sheets URL 格式，避免惡意連結。
2.  **內容審核**：採「先審後上」制。使用者投稿到 Google Form，開發者手動檢查後才複製到 Master Sheet，確保無垃圾內容。
3.  **錯誤處理**：若 Master CSV 欄位跑版或讀取失敗，應有 Fallback 機制 (顯示預設的靜態推薦)。

## 6. 未來擴充 (Future Features)

-   **按讚/熱門度**：利用 Google Sheets 記錄點擊數 (需搭配 Google Apps Script)。
-   **我的最愛**：允許使用者將社群題庫收藏到本地瀏覽器 (Local Bookmark)。
-   **預覽功能**：在載入前先預覽該題庫的前 3 題。
