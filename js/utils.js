import { createFlashcard } from "./models/flashcardFactory.js";

/** 工具：洗牌演算法 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * 解析 CSV 文字並轉為 Flashcard 陣列
 *
 * @param {string} text CSV 原始文字
 * @returns {{
 *   data: import("../models/flashcard.js").Flashcard[],
 *   report: {
 *     total: number,
 *     updatedDates: number,
 *     errors: number
 *   }
 * }}
 */
export function parseCSV(text) {
  // ---------- 0. 基本防禦 ----------
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("CSV 內容為空或格式不正確");
  }

  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    throw new Error("CSV 檔案為空");
  }

  // ---------- 1. 解析並標準化 Header ----------
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  if (headers.length === 0) {
    throw new Error("CSV 標題行無效");
  }

  // ---------- 2. 驗證必要欄位 ----------
  const requiredFields = ["type", "question", "answer"];
  const missingFields = requiredFields.filter(
    (field) => !headers.includes(field)
  );

  if (missingFields.length > 0) {
    throw new Error(
      `CSV 缺少必要欄位: ${missingFields.join(", ")} (請檢查標題列拼字)`
    );
  }

  // ---------- 3. 初始化結果與統計 ----------
  const results = [];
  const stats = {
    total: 0,
    updatedDates: 0,
    errors: 0,
  };

  // ---------- 4. 逐行解析 ----------
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCsvLine(lines[i]);
      const rawData = {};

      headers.forEach((header, idx) => {
        const value = values[idx]?.trim();
        if (!value) return; // 空值直接略過，交給 model 補預設

        switch (header) {
          case "options":
            rawData.options = value
              .split(";")
              .map((o) => o.trim())
              .filter(Boolean);
            break;
          case "next_review":
            // 日期轉換邏輯可以保留在這，因為這是 CSV 格式處理的一部分
            const inputDate = new Date(value);
            rawData.next_review = !isNaN(inputDate.getTime())
              ? formatDate(inputDate)
              : null;
            break;
          case "srs_level":
          case "interval":
          case "easiness":
            rawData[header] = Number(value); // 轉成數字就好，不在此做邏輯判斷
            break;
          default:
            rawData[header] = value;
        }
      });

      // ---------- 5. 建立標準化 Flashcard ----------
      const card = createFlashcard(rawData);

      // 補 UID（若 CSV 沒給）
      if (!card.uid) {
        card.uid = generateUUID();
      }

      // ---------- 6. 最終驗證 ----------
      if (card.question && card.answer) {
        results.push(card);
        stats.total++;
      }
    } catch (err) {
      console.warn(`解析第 ${i + 1} 行時出錯:`, err);
      stats.errors++;
    }
  }

  return {
    data: results,
    report: stats,
  };
}

/* ============================================================
 * Helper Functions
 * ============================================================
 */

/**
 * 解析單行 CSV（支援基本引號）
 *
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * 將 Date 物件轉為 YYYY-MM-DD（本地時間）
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 將各種輸入轉為 Date（安全版）
 *
 * 支援的輸入：
 * - Date 物件（合法才回傳）
 * - YYYY-MM-DD 字串（轉為「本地時區」的當天 00:00）
 * - 其他可被 JavaScript Date 解析的字串
 *
 * 不合法或不支援的輸入一律回傳 null
 *
 * @param {unknown} value - 任意輸入值
 * @returns {Date|null} 轉換後的 Date，或 null
 */
export function toDateOrNull(value) {
  // 1️⃣ null / undefined / 空字串
  if (!value) return null;

  // 2️⃣ 已經是 Date
  if (value instanceof Date) {
    // getTime() 為 NaN 代表是 Invalid Date
    return isNaN(value.getTime()) ? null : value;
  }

  // 3️⃣ 字串處理
  if (typeof value === "string") {
    // 僅處理純日期格式 YYYY-MM-DD，避免 UTC 時區陷阱
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      // match 結構：
      // [0] = 完整字串, [1] = 年, [2] = 月, [3] = 日
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      // 月份要減 1，因為 JS Date 的月份是 0 ~ 11
      return new Date(year, month - 1, day);
    }

    // 其他字串交給 JavaScript 原生 Date 嘗試解析
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // 4️⃣ 其他型別（number、object、boolean...）一律拒絕
  return null;
}

/**
 * 判斷指定日期是否「早於或等於今天」
 *
 * 規則說明：
 * - dateStr 必須是可解析的日期字串
 * - 若是 YYYY-MM-DD，會視為「當地時區」的當天 00:00
 * - 今天的判斷基準也是「當地時區」的今天 00:00
 *
 * @param {string|null|undefined} dateStr - 外部傳入的日期字串
 * @returns {boolean} 若日期 <= 今天（含今天）回傳 true，否則 false
 */
export function isDue(dateStr) {
  // 將外部輸入轉為安全的 Date
  const targetDate = toDateOrNull(dateStr);
  if (!targetDate) return false;

  // 建立「今天」的本地午夜時間
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 只比較日期（不比較時間）
  return targetDate.getTime() <= today.getTime();
}

/**
 * 取得「今天 + N 天」的 YYYY-MM-DD（本地時間安全版）
 *
 * @param {number} days
 * @returns {string}
 */
export function getFutureDate(days) {
  const date = new Date();

  // 固定在本地午夜，避免 toISOString 的 UTC 時區陷阱
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

/** * 產生唯一識別碼 (UUID v4)
 * 這是業界標準，重複機率低到可以忽略不計
 */
export function generateUUID() {
  // 現代瀏覽器內建的功能
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 備用方案：如果環境太舊，用隨機數湊一個
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 將資料物件陣列轉換為符合 RFC 4180 標準的 CSV 字串
 * * @param {Object[]} data - 要轉換的原始資料物件陣列
 * @param {string[]} headers - 定義要匯出的欄位名稱與順序
 * @returns {string} 包含 BOM 標頭的 CSV 字串，可用於 Excel 開啟
 */
const convertToCSVString = (data, headers) => {
    // \uFEFF 是 Byte Order Mark (BOM)，告訴 Excel 此檔案採 UTF-8 編碼，避免中文亂碼
    const BOM = '\uFEFF';
    
    // 處理每一行資料
    const rows = data.map(row => 
        headers.map(header => {
            // 使用 ?? (虛值合併運算子)：若為 null 或 undefined 則給予空字串
            let val = row[header] ?? ''; 
            
            // 如果欄位內容是陣列（例如 options），用分號合併成一個字串
            if (Array.isArray(val)) {
                val = val.join(';');
            }
            
            // CSV 安全處理：
            // 1. 先轉成字串
            // 2. 將內容中的單個雙引號 " 替換成兩個雙引號 "" (CSV 跳脫規則)
            // 3. 兩端用雙引號包起來，這樣即使內容有逗號或換行也不會出錯
            const cell = String(val).replace(/"/g, '""');
            return `"${cell}"`;
        }).join(',') // 每一格欄位用逗號隔開
    );

    // 將標題列與資料列結合，並用換行符號連接
    return BOM + [headers.join(','), ...rows].join('\n');
};

/**
 * 匯出資料並觸發瀏覽器下載 CSV 檔案
 * * @param {Object[]} data - 卡片資料陣列 (例如：Flashcard 物件陣列)
 * @param {string} [filename='flipquiz_export.csv'] - 預設的檔案名稱 (可選)
 * @throws {Error} 當檔案下載過程發生嚴重錯誤時拋出
 */
export function exportToCSV(data, filename = 'flipquiz_export.csv') {
    // 衛句：確保有資料才執行，避免程式崩潰
    if (!data?.length) {
        console.warn('匯出失敗：沒有可供匯出的資料');
        return;
    }

    // 明確定義欄位順序，這在業界稱為「白名單 (Whitelist)」機制，確保資料格式穩定
    const headers = [
        'category', 'type', 'question', 'answer', 'options', 'note',
        'srs_level', 'next_review', 'interval', 'easiness', 'attempts'
    ];

    try {
        // 1. 取得 CSV 字串
        const csvString = convertToCSVString(data, headers);
        
        // 2. 建立 Blob 物件，指定格式為 CSV 與編碼
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        // 3. 產生指向該 Blob 的暫時性記憶體網址 (URL)
        const url = URL.createObjectURL(blob);
        
        // 4. 建立隱藏的 <a> 標籤並觸發點擊，開始下載
        const link = document.createElement('a');
        link.href = url;
        link.download = filename; // 指定下載後的檔名
        document.body.appendChild(link); // 暫時加入 DOM 以確保相容性
        link.click();
        
        // 5. 善後處理：移除標籤並釋放記憶體網址，避免記憶體洩漏 (Memory Leak)
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
    } catch (error) {
        // 業界實踐：匯出失敗應有錯誤紀錄，方便後續排查
        console.error('CSV 匯出過程中發生錯誤:', error);
    }
}
