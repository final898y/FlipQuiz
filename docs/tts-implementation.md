# 語音合成 (TTS) 功能實作方案 - Web Speech API

本文件詳述為 FlipQuiz 加入發音功能 (Text-to-Speech, TTS) 的技術研究成果與實作計畫。

---

## 1. 技術選型：Web Speech API (`SpeechSynthesis`)

### 1.1 為何選擇此方案？
- **零成本與隱私**：完全在客戶端運行，不需調用付費 API，亦不傳輸資料至雲端。
- **高效能**：利用瀏覽器內建引擎，無網路延遲。
- **廣泛支援**：支援所有現代瀏覽器 (Chrome, Edge, Safari, Firefox)。

### 1.2 技術核心元件
- **`window.speechSynthesis`**：控制器，負責管理語音隊列、暫停、恢復與取得語音包。
- **`SpeechSynthesisUtterance`**：朗讀請求物件，包含朗讀文字、語速 (`rate`)、音調 (`pitch`)、音量 (`volume`) 與指定語言 (`lang`)。

---

## 2. 實作架構設計

### 2.1 新增語音模組 (`js/tts.js`)
封裝底層 API，提供簡潔的介面供 `main.js` 或 `ui.js` 調用。

**核心 API 設計：**
- `speak(text, lang = 'en-US')`: 開始朗讀。
- `stop()`: 立即停止當前朗讀（切換題目時需呼叫）。
- `getVoices()`: 取得系統支援的語音列表。
- `setOptions(options)`: 調整語速或偏好語音。

### 2.2 資料結構擴充 (CSV)
為了精準控制朗讀語言，建議在 CSV 題庫中增加選用欄位：
- **`lang_front`**: 正面朗讀語言 (預設 `en-US`)。
- **`lang_back`**: 背面朗讀語言 (預設 `zh-TW`)。

### 2.3 UI/UX 整合計畫
1.  **按鈕位置**：在卡片正面與背面各增加一個「發音圖標 (Volume Icon)」按鈕。
2.  **視覺回饋**：朗讀中時圖標可變色或呈現動畫感。
3.  **自動朗讀 (Auto-TTS)**：在設定選單中增加「翻面後自動朗讀」開關。
4.  **鍵盤支援**：新增快捷鍵 (例如 `V`) 觸發朗讀。

---

## 3. 詳細實作步驟 (Action Plan)

### 第一階段：核心模組開發
- 實作 `js/tts.js`，處理 `speechSynthesis` 的非同步初始化問題（`onvoiceschanged` 事件）。
- 實作朗讀中斷機制，避免多個題目音軌重疊。

### 第二階段：UI 與事件綁定
- 修改 `index.html`，在卡片內嵌入 SVG 發音按鈕。
- 修改 `style.css`，設計發音按鈕的 Hover 與 Active 狀態。
- 修改 `js/main.js`，將按鈕點擊事件連結至 `tts.js`。

### 第三階段：相容性與異常處理
- **iOS/Safari 限制**：處理必須由「使用者手動觸發 (User Gesture)」才能發音的限制。
- **語音包回退機制**：若系統無特定語音（如 `ja-JP`），則自動回退至最接近的可用語言。

---

## 4. 預期程式碼片段預覽 (Conceptual Code)

```javascript
// js/tts.js
export const tts = {
    synth: window.speechSynthesis,
    
    speak(text, lang = 'en-US') {
        this.stop(); // 停止之前的朗讀
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        this.synth.speak(utterance);
    },

    stop() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    }
};
```

---

## 5. 測試計畫
- [ ] 測試 Chrome/Edge/Firefox 桌面版。
- [ ] 測試 iOS Safari (檢查靜音開關影響與觸發限制)。
- [ ] 測試不同語言碼的辨識度（en, zh, ja）。
- [ ] 驗證切換題目時是否能正常中斷舊音軌。
