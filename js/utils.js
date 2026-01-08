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

  // 固定今天為本地午夜，避免時區問題
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

          case "next_review": {
            const inputDate = new Date(value);
            if (!isNaN(inputDate.getTime())) {
              inputDate.setHours(0, 0, 0, 0);
              if (inputDate < today) {
                rawData.next_review = formatDate(today);
                stats.updatedDates++;
              } else {
                rawData.next_review = formatDate(inputDate);
              }
            } else {
              console.warn(
                `第 ${i + 1} 行日期格式錯誤: "${value}"，已設為 null`
              );
              rawData.next_review = null;
            }
            break;
          }

          case "srs_level":
          case "interval":
            rawData[header] = parseInt(value, 10) || 0;
            break;

          case "easiness":
            rawData.easiness = value ? parseFloat(value) : undefined;
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
function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** * 產生唯一識別碼 (UUID v4)
 * 這是業界標準，重複機率低到可以忽略不計
 */
function generateUUID() {
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
