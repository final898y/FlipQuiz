/**
 * flashcard.js
 * Flashcard 資料模型（Factory Function）
 *
 * 本模組負責「定義 Flashcard 資料結構」
 * 所有 Flashcard 物件都應該透過 createFlashcard 建立
 */

/**
 * Flashcard 資料結構定義
 *
 * @typedef {Object} Flashcard
 *
 * @property {string|null} uid
 * 唯一識別碼，若為 null 表示尚未由系統產生
 *
 * @property {string} category
 * 題目分類，例如：Vocabulary、Math、Default
 *
 * @property {string} type
 * 題目類型，目前固定為 "flashcard"
 *
 * @property {string} question
 * 題目內容（正面）
 *
 * @property {string} answer
 * 題目答案（背面）
 *
 * @property {string[]} options
 * 選項陣列（選擇題時使用，非選擇題為空陣列）
 *
 * @property {string} note
 * 補充筆記或說明
 *
 * @property {number} srs_level
 * SRS 等級，0 表示尚未學習
 *
 * @property {string|null} next_review
 * 下次複習日期，格式為 YYYY-MM-DD，若尚未安排則為 null
 *
 * @property {number} interval
 * 複習間隔（天）
 *
 * @property {number} easiness
 * 易難度因子（EF / Easiness Factor）
 */

/**
 * 建立一個全新的 Flashcard 物件
 *
 * @param {Partial<Flashcard>} [data={}]
 * 可傳入部分欄位，其餘欄位會自動套用預設值
 *
 * @returns {Flashcard}
 * 標準化後的 Flashcard 物件
 */
export function createFlashcard(data = {}) {
  return {
    uid: data.uid ?? null,
    category: data.category ?? "Default",
    type: data.type ?? "flashcard",

    question: data.question ?? "",
    answer: data.answer ?? "",
    options: Array.isArray(data.options) ? data.options : [],

    note: data.note ?? "",

    srs_level: Number(data.srs_level) || 0,
    next_review: data.next_review ?? null,
    interval: Number(data.interval) || 0,
    easiness: Number(data.easiness) || 2.5,
  };
}
