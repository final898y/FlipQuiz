/**
 * flashcard.js
 * Flashcard & Quiz 資料模型
 * * 本模組負責定義與標準化學習資料結構。
 */
import { generateUUID, formatDate, toDateOrNull } from "../utils.js";

/**
 * 支援的題目類型列舉
 * @readonly
 * @enum {string}
 */
export const CardType = {
  FLASHCARD: "flashcard",
  QUIZ: "quiz",
};

/**
 * @typedef {Object} Flashcard
 * @property {string|null} uid 唯一識別碼
 * @property {string} category 題目分類
 * @property {"flashcard"|"quiz"} type 題目類型：flashcard (翻卡) 或 quiz (測驗)
 * @property {string} question 題目內容（正面）
 * @property {string} answer 題目答案（背面）
 * @property {string[]} options 選項陣列（Quiz 模式使用）
 * @property {string} note 補充筆記
 * @property {number} srs_level SRS 等級 (0-n)
 * @property {string|null} next_review 下次複習日期 (YYYY-MM-DD)
 * @property {number} interval 複習間隔（天）
 * @property {number} easiness 易難度因子 (預設 2.5)
 */

/**
 * 建立一個標準化的 Flashcard 或 Quiz 物件
 * * @param {Object} [data={}] - 傳入的初始化資料
 * @param {string} [data.uid=null] - 識別碼
 * @param {string} [data.category="Default"] - 分類
 * @param {"flashcard"|"quiz"} [data.type="flashcard"] - 類型
 * @param {string} [data.question=""] - 題目
 * @param {string} [data.answer=""] - 答案
 * @param {string[]} [data.options=[]] - 選擇題選項
 * @param {string} [data.note=""] - 筆記
 * @param {number} [data.srs_level=0] - 學習等級
 * @param {string|null} [data.next_review=null] - 複習日期
 * @param {number} [data.interval=0] - 間隔天數
 * @param {number} [data.easiness=2.5] - 難易度
 * @property {number} attempts 總嘗試次數
 * * @returns {Readonly<Flashcard>} 標準化後的物件
 */
export function createFlashcard(data = {}) {
  // 增加一個檢查邏輯
  if (data !== null && typeof data === "object") {
    const requiredKeys = ["srs_level", "easiness", "interval"];
    requiredKeys.forEach((key) => {
      // 如果開發中發現傳入的物件缺少關鍵欄位，印出警告但不中斷程式
      if (!(key in data)) {
        console.warn(
          `[Data Warning]: 傳入的物件缺少欄位 ${key}，已套用預設值。`
        );
      }
    });
  }

  // 內部輔助：確保類型合法
  const validTypes = Object.values(CardType);
  const type = validTypes.includes(data.type) ? data.type : CardType.FLASHCARD;

  let finalReviewDate = toDateOrNull(data.next_review);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (finalReviewDate === null || finalReviewDate < today) {
    finalReviewDate = today;
  }

  // 封裝物件
  const flashcard = {
    // 識別與分類
    uid: data.uid ?? generateUUID(),
    category: data.category ?? "Default",
    type: type,

    // 內容 (確保為字串且修剪空白)
    question: String(data.question ?? "").trim(),
    answer: String(data.answer ?? "").trim(),

    // 選項：只有在類型為 quiz 或確實有傳入選項時才保留內容
    options: Array.isArray(data.options) ? [...data.options] : [],

    note: String(data.note ?? "").trim(),

    // SRS 學習演算法欄位
    srs_level: Math.max(0, Number(data.srs_level) || 0),
    next_review: formatDate(finalReviewDate),
    interval: Math.max(0, Number(data.interval) || 0),
    easiness: Number(data.easiness) || 2.5,
    attempts: Math.max(0, Number(data.attempts) || 0),
  };

  // 封鎖物件結構，防止意外修改
  return Object.seal(flashcard);
}
