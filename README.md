# 📚 Flashcard Master：AI 規劃師學習助手

這是一個專為「AI 應用規劃師」證照及語言學習設計的輕量化、靜態單字卡網站。

## 一、 專案核心規格

- **目標：** 簡單、無後端、跨平台（手機/電腦）。
- **資料源：** 串接 Google Sheets（透過 CSV 格式）。
- **功能需求：**
- **單字卡模式 (Flashcard)：** 點擊翻面，學習專有名詞。
- **測驗模式 (Quiz)：** 單選題練習，即時回饋正誤。
- **動態載入：** 修改 Google 表格內容後，網頁重新整理即可更新。

## 二、 資料結構設計 (Google Sheets)

請在 Google Sheets 建立以下欄位，並發佈為 **CSV** 格式。

| 欄位名稱 (Header) | 說明                | 範例內容                                  |
| ----------------- | ------------------- | ----------------------------------------- |
| `category`        | 學習分類            | AI 應用規劃師 / 英文 / 日文               |
| `type`            | 模式                | `flashcard` (名詞解釋) 或 `quiz` (單選題) |
| `question`        | 題目或單字          | 什麼是機器學習？ / Apple                  |
| `options`         | 選項 (僅 quiz 使用) | 選項 A;選項 B;選項 C (以分號分隔)         |
| `answer`          | 正確答案            | 答案內容                                  |
| `note`            | 補充說明            | 相關章節或解釋                            |

---

## 三、 核心邏輯設計 (JavaScript)

### 1. 資料處理流程

1. **Fetch：** 從 Google Sheets 網址抓取原始 CSV 文字。
2. **Split：** 將文字按「行」拆分，再按「逗點」拆分出各欄位。
3. **Map：** 將拆分後的資料轉換為 JavaScript 物件清單（Array of Objects）。
4. **Render：** 根據資料的 `type` 決定要在畫面顯示「翻面卡片」還是「選擇題」。

### 2. 資料轉換範例碼

```javascript
// 負責抓取與解析資料的函數
async function initData() {
  const sheetUrl = "你的GoogleSheets發佈網址";

  // 取得資料
  const response = await fetch(sheetUrl);
  const text = await response.text();

  // 簡易 CSV 轉物件邏輯
  const lines = text.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const data = lines.slice(1).map((line) => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ? values[i].trim() : "";
    });

    // 處理選項：將 "A;B;C" 轉成 ["A", "B", "C"]
    if (obj.options) {
      obj.options = obj.options.split(";");
    }
    return obj;
  });

  console.log("資料準備就緒:", data);
  return data;
}
```

---

## 四、 程式碼審查與開發建議

### 1. 檔案組織結構

建議你的專案資料夾長這樣，保持簡單：

```text
/my-learning-app
  ├── index.html   (網頁結構與內容)
  ├── style.css    (外觀美化與翻轉動畫)
  └── script.js    (抓取資料與互動邏輯)

```

### 2. 優良程式習慣提醒

- **資料防錯：** 在 `split(',')` 時，如果你的題目內容本身包含逗點，可能會導致解析錯誤。建議未來可以使用 `PapaParse` 套件來處理複雜的 CSV。
- **行動裝置優先 (Mobile First)：** 寫 CSS 時先考慮手機寬度，再調整電腦版的外觀。
- **語義化標籤：** 使用 `<main>`, `<section>`, `<button>` 等標籤，這對手機的閱讀輔助工具非常友善。
