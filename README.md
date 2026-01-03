# 📚 Flashcard Master - AI 學習助手

這是一個輕量化的網頁單字卡應用程式，專為學習與複習設計。它不需要後端伺服器，直接讀取 Google Sheets (試算表) 的資料來產生題目，支援「翻牌記憶」與「選擇題測驗」兩種模式。

## ✨ 特色

- **無需後端**：純靜態網頁，可直接在瀏覽器開啟或部署至 GitHub Pages。
- **即時更新**：題目資料存放在 Google Sheets，修改試算表後，網頁重新整理即同步更新。
- **雙重模式**：
  - **單字卡 (Flashcard)**：點擊卡片翻面查看答案與筆記。
  - **測驗 (Quiz)**：支援單選題，答對自動翻面，答錯會有震動提示。
- **響應式設計**：支援手機與電腦瀏覽，並具備 3D 翻轉動畫效果。

## 🚀 快速開始

1. **下載專案**：將此專案下載到本地電腦。
2. **開啟網頁**：直接雙擊 `index.html` 透過瀏覽器開啟（或使用 VS Code Live Server）。
3. **開始學習**：
   - 點擊 **「上一題 / 下一題」** 切換題目。
   - 點擊 **卡片區域** 可翻面查看答案。
   - 若為選擇題，直接點擊選項作答。

## ⚙️ 如何更換為自己的題庫

本專案預設使用一個示範用的 Google Sheet。若要建立自己的題庫，請依照以下步驟操作：

### 1. 建立 Google Sheet

請建立一個新的 Google 試算表，並依照下列欄位結構填入資料（第一列必須是標題）：

| 欄位名稱 (Header) | 說明 | 範例內容 |
| :--- | :--- | :--- |
| `category` | 分類 (選填) | 英文 / 程式設計 |
| `type` | 題目類型 | `flashcard` (翻牌) 或 `quiz` (選擇題) |
| `question` | 題目內容 | Apple |
| `options` | 選項 (僅 quiz 需填) | 蘋果;香蕉;橘子 (選項間用**分號** `;` 分隔) |
| `answer` | 正確答案 | 蘋果 |
| `note` | 補充筆記 (選填) | 顯示在卡片背面的補充說明 |

### 2. 發佈為 CSV

1. 在 Google Sheet 點選 **「檔案」** > **「共用」** > **「發佈到網路」**。
2. 選擇 **「整份文件」** (或指定工作表) 以及格式選擇 **「逗點分隔值 (.csv)」**。
3. 點擊「發佈」並複製產生的連結。

### 3. 更新程式設定

打開專案中的 `script.js` 檔案，找到最上方的 `sheetUrl` 變數，將其替換為你的 CSV 連結：

```javascript
// script.js
const sheetUrl = '把你的_Google_Sheet_CSV_連結貼在這裡';
```

存檔後重新整理網頁，即可看到你的題目。

## 📂 專案結構

```text
FlashcardMaster/
├── index.html      # 主網頁 (HTML5)
├── style.css       # 樣式表 (CSS3, 包含翻轉動畫與 RWD 設定)
├── script.js       # 核心邏輯 (Fetch API, DOM 操作)
└── README.md       # 專案說明文件
```

## 🛠️ 技術細節

- **Core**: Vanilla JavaScript (ES6+)
- **Data Fetching**: Fetch API
- **Styling**: CSS Custom Properties (Variables), Flexbox, Grid, 3D Transforms

## 📄 授權

本專案採用 [MIT License](LICENSE) 授權。

---
*Happy Learning!*