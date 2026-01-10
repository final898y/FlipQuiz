import { createFlashcard } from "./models/flashcardFactory.js";
import { getFutureDate } from "./utils.js";
/**
 * SRS 設定常數
 * 集中管理「魔法數字」，避免散落在程式中
 */
const SRS_CONFIG = {
  DEFAULT_EF: 2.5, // 預設易難度因子
  MIN_EF: 1.3, // EF 最低下限，防止間隔崩壞
  FIRST_INTERVAL: 1, // 第一次答對後的間隔（天）
  SECOND_INTERVAL: 6, // 第二次答對後的間隔（天）
  EF_PENALTY: 0.2, // 答錯時 EF 的懲罰值
  VALID_QUALITY: [0, 2, 4, 5], // 合法的評分值
};

/**
 * SRS 核心物件
 */
export const SRS = {
  /**
   * 計算下一次複習的 SRS 數據
   * * @param {Object} incomingData - 傳入的卡片資料（可以是部分或不完整物件）
   * @param {number} q - 使用者評分 (0-5)
   * @returns {Object} 更新後的全新標準化 Flashcard 物件
   */
  calculateNextReview(incomingData, q) {
    // 1. 防禦性程式設計：先將傳入資料「清洗」成標準卡片格式
    // 就算 incomingData 是 {} 或缺漏欄位，card 也會有正確的數字型別與預設值
    const card = createFlashcard(incomingData);

    const quality = Number(q);
    if (!SRS_CONFIG.VALID_QUALITY.includes(quality)) {
      throw new Error(`[SRS] 無效的評分值: ${quality}`);
    }

    // 從已清洗的 card 物件中解構資料
    let {
      srs_level: nextLevel,
      easiness: nextEF,
      interval: nextInterval,
    } = card;

    // 2. 計算新的 EF (Easiness Factor)
    if (quality >= 3) {
      nextEF = nextEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      nextEF = nextEF - SRS_CONFIG.EF_PENALTY;
    }

    // 保護下限
    nextEF = Math.max(SRS_CONFIG.MIN_EF, nextEF);

    // 3. 決定下一次複習間隔
    if (quality < 3) {
      if (quality === 0) {
        nextLevel = 0; // 按 1：徹底忘記，打回原形
        nextInterval = 0;
      } else {
        // 按 2：很吃力，但維持在 Level 1 或是至少標記為「已啟動」
        nextLevel = Math.max(1, nextLevel);
        nextInterval = SRS_CONFIG.FIRST_INTERVAL;
      }
    } else {
      if (nextLevel === 0) {
        nextInterval = SRS_CONFIG.FIRST_INTERVAL;
      } else if (nextLevel === 1) {
        nextInterval = SRS_CONFIG.SECOND_INTERVAL;
      } else {
        nextInterval = Math.round(card.interval * nextEF);
      }
      nextLevel++;
    }

    // 4. 回傳全新物件：結合舊資料與新算出的 SRS 數值
    return createFlashcard({
      ...card, // 保留題目、答案、UID 等不變資訊
      srs_level: nextLevel,
      easiness: Number(nextEF.toFixed(2)),
      interval: nextInterval,
      next_review: getFutureDate(nextInterval),
      attempts: card.attempts + 1,
    });
  },
};
