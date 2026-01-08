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
   *
   * @param {Object} item
   * @param {number|string} item.srs_level - 目前的 SRS 等級
   * @param {number|string} item.easiness - 目前的 EF
   * @param {number|string} item.interval - 上一次的間隔天數
   * @param {number} q - 使用者評分（0, 2, 4, 5）
   * @returns {Object} 更新後的 SRS 資料
   */
  calculate(item, q) {
    // --- 1. 防禦式處理輸入資料（避免 NaN 傳染） ---

    const currentLevel = Number(item?.srs_level) || 0;
    const currentEF = Number(item?.easiness) || SRS_CONFIG.DEFAULT_EF;
    const prevInterval = Number(item?.interval) || 0;

    const quality = Number(q);

    // 驗證評分是否合法（邏輯錯誤，應該直接中斷）
    if (!SRS_CONFIG.VALID_QUALITY.includes(quality)) {
      throw new Error(`Invalid SRS quality value: ${quality}`);
    }

    let nextLevel = currentLevel;
    let nextEF = currentEF;
    let nextInterval = 0;

    // --- 2. 計算新的 EF（易難度因子） ---
    // SM-2 原始公式：
    // EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))

    if (quality >= 3) {
      nextEF = nextEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      // 答錯或太吃力 → 顯著降低 EF
      nextEF = nextEF - SRS_CONFIG.EF_PENALTY;
    }

    // 保護 EF 下限
    if (nextEF < SRS_CONFIG.MIN_EF) {
      nextEF = SRS_CONFIG.MIN_EF;
    }

    // --- 3. 決定下一次複習間隔 ---
    if (quality < 3) {
      // 答錯：重來，明天再測
      nextLevel = 0;
      nextInterval = SRS_CONFIG.FIRST_INTERVAL;
    } else {
      // 答對：依等級擴展間隔
      if (currentLevel === 0) {
        nextInterval = SRS_CONFIG.FIRST_INTERVAL;
      } else if (currentLevel === 1) {
        nextInterval = SRS_CONFIG.SECOND_INTERVAL;
      } else {
        nextInterval = Math.round(prevInterval * nextEF);
      }
      nextLevel++;
    }

    // --- 4. 回傳全新的 SRS 狀態（不修改原物件） ---
    return {
      srs_level: nextLevel,
      easiness: Number(nextEF.toFixed(2)), // 固定兩位小數，並轉回 number
      interval: nextInterval,
      next_review: this.getFutureDate(nextInterval),
    };
  },

  /**
   * 取得「今天 + N 天」的 YYYY-MM-DD（本地時間安全版）
   *
   * @param {number} days
   * @returns {string}
   */
  getFutureDate(days) {
    const date = new Date();

    // 固定在本地午夜，避免 toISOString 的 UTC 時區陷阱
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  },
};
