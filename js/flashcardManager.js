import { shuffleArray, isDue } from "./utils.js";
import { SRS } from "./srs.js";
import { cache } from "./cache.js";

class FlashcardManager {
  constructor() {
    this.allQuestions = [];
    this.questions = []; // 當前顯示列表 (Browse or Review)
    this.reviewQueue = []; // 待複習列表
    this.currentIndex = 0;
    this.currentCategory = "全部";
    this.cachedCategories = [];
    this.mode = "browse"; // 'browse' | 'review' | 'quiz' | 'exam'
    
    // 測驗模式統計
    this.examStats = {
      correct: 0,
      wrong: 0,
      total: 0
    };
  }

  /** 初始化題目數據 */
  init(data, shouldShuffle = true) {
    // 預處理數據：確保 SRS 欄位存在
    this.allQuestions = data.map((q, index) => ({
      ...q,
      uid: q.uid ?? index, // 確保有 ID
      srs_level: parseInt(q.srs_level) || 0,
      next_review: q.next_review || null,
    }));
    this.updateCachedCategories();

    // 預設進入瀏覽模式
    this.setMode("browse", shouldShuffle);
  }

  /** 設定模式 */
  setMode(mode, shouldShuffle = false) {
    this.mode = mode;

    if (mode === "review" || mode === "quiz") {
      this.buildReviewQueue();
      this.questions = this.reviewQueue;
    } else if (mode === "exam") {
      // 測驗模式：使用該分類所有題目
      let candidates = this.currentCategory === "全部" 
        ? [...this.allQuestions]
        : this.allQuestions.filter(q => q.category === this.currentCategory);
      
      // 僅限選擇題 (Quiz Type)
      this.questions = candidates.filter(q => q.type === 'quiz');

      // 測驗模式強制洗牌
      shuffleArray(this.questions);
      
      // 重置統計
      this.examStats = {
        correct: 0,
        wrong: 0,
        total: this.questions.length
      };
    } else {
      // 瀏覽模式：重新套用分類篩選
      this.filterCategory(this.currentCategory, shouldShuffle);
    }

    this.currentIndex = 0;
  }

  /** 建立複習佇列 (Due + New) */
  buildReviewQueue() {
    // 篩選條件：
    // 1. New: srs_level === 0
    // 2. Due: next_review <= today
    // 3. Category: 需符合當前分類 (若不是 "全部")

    this.reviewQueue = this.allQuestions.filter((q) => {
      // 分類篩選
      if (
        this.currentCategory !== "全部" &&
        q.category !== this.currentCategory
      ) {
        return false;
      }

      const isNewCard = q.attempts === 0;
      const isDueCard = isDue(q.next_review);
      
      // 額外過濾：若為 Quiz Mode (Auto SRS)，僅允許 type === 'quiz'
      if (this.mode === 'quiz' && q.type !== 'quiz') {
        return false;
      }

      // 包含 "新卡片" 或 "到期卡片" (甚至是 "過期卡片")
      return isNewCard || isDueCard;
    });
  }

  /** 處理 SRS 評分 */
  handleSrsAction(rating) {
    const currentCard = this.getCurrentData();
    if (!currentCard) return false;

    // 1. 計算新的 SRS 數據
    const updatedCard = SRS.calculateNextReview(currentCard, rating);

    // 2. 同步更新 Master List (確保資料一致性)
    const masterIndex = this.allQuestions.findIndex(
      (q) => q.uid === currentCard.uid
    );
    if (masterIndex !== -1) {
      this.allQuestions[masterIndex] = updatedCard;
      cache.saveCardData(this.allQuestions);
    }

    // 3. 佇列管理：移除目前卡片
    // 使用 splice 移除後，陣列會自動遞補，原本的 index 就會指向下一張卡片
    this.questions.splice(this.currentIndex, 1);

    // 4. 特殊規則：如果評分為 "重來 (Again/1)"，將卡片重新排入佇列尾端
    // 這樣使用者在同一個 Session 內會再次看到它
    if (rating === 0) {
      this.questions.push(updatedCard);
    }

    // 5. 指標修正
    // 只有當剛才刪除的是最後一張（且沒有 push 新的）時，需要歸零或檢查邊界
    if (this.currentIndex >= this.questions.length) {
      this.currentIndex = 0;
    }

    // 6. 檢查是否完成 (若佇列長度 > 0 代表還有題目)
    return this.questions.length > 0;
  }

  /** 更新快取的分類列表 */
  updateCachedCategories() {
    const categorySet = new Set(
      this.allQuestions
        .map((q) => q.category)
        .filter((c) => c && c.trim() !== "")
    );
    this.cachedCategories = ["全部", ...Array.from(categorySet)];
  }

  /**
   * 取得指定分類的 Dashboard 統計數據
   * @returns {Object} 包含 {due, newCount, mastered} 的統計物件
   */ getDashboardStats() {
    let due = 0;
    let newCount = 0;
    let mastered = 0;
    let masteredThreshold = 21; // 間隔超過 21 天就視為已精通

    this.allQuestions.forEach((q) => {
      // 1. 分類過濾邏輯
      if (
        this.currentCategory !== "全部" &&
        q.category !== this.currentCategory
      ) {
        return;
      }

      const interval = parseInt(q.interval) || 0;
      const attempts = parseInt(q.attempts) || 0;
      const isDueCard = isDue(q.next_review);

      // 2. 核心狀態判定
      if (attempts === 0) {
        // 1. 新卡片：Level 為 0 且「從未有過下次複習日期」
        newCount++;
      } else if (isDueCard) {
        due++;
      } else if (interval >= masteredThreshold) {
        mastered++;
      }
    });

    return { due, new: newCount, mastered };
  }

  /** 處理測驗模式紀錄 (不更新 SRS) */
  handleExamAction(isCorrect) {
    if (isCorrect) {
      this.examStats.correct++;
    } else {
      this.examStats.wrong++;
    }
    // 注意：測驗模式下不移除題目，由 currentIndex 控制進度
  }

  /** 分類與篩選 */
  filterCategory(cat, shouldShuffle = false) {
    this.currentCategory = cat;

    if (this.mode === "review" || this.mode === "quiz" || this.mode === "exam") {
      // 複習/測驗模式下切換分類 -> 重建佇列或重新取題
      this.setMode(this.mode, shouldShuffle);
    } else {
      // 瀏覽模式
      this.questions =
        cat === "全部"
          ? [...this.allQuestions]
          : this.allQuestions.filter((q) => q.category === cat);

      if (shouldShuffle) {
        this.shuffleQuestions();
      } else {
        this.currentIndex = 0;
      }
    }
  }

  /** 洗牌 */
  shuffleQuestions() {
    if (this.questions.length > 0) {
      shuffleArray(this.questions);
      this.currentIndex = 0;
    }
  }

  /** 切換題目 (回傳是否成功切換) */
  changeQuestion(step) {
    if (this.questions.length === 0) return false;

    // 複習/測驗/考試模式邏輯：單向，且可能會有 "完成" 狀態
    if (this.mode === "review" || this.mode === "quiz" || this.mode === "exam") {
      // 簡單實作：只允許往後，到底了就 false
      const nextIndex = this.currentIndex + step;
      if (nextIndex >= this.questions.length) {
        return false; // 已完成所有佇列
      }
      if (nextIndex < 0) return false;

      this.currentIndex = nextIndex;
      return true;
    }

    // 瀏覽模式：循環切換
    this.currentIndex =
      (this.currentIndex + step + this.questions.length) %
      this.questions.length;
    return true;
  }

  /** 獲取當前題目數據 */
  getCurrentData() {
    if (this.questions.length === 0) return null;
    return this.questions[this.currentIndex];
  }

  /** 獲取狀態資訊 */
  getStatus() {
    return {
      total: this.questions.length,
      current: this.currentIndex + 1,
      category: this.currentCategory,
      hasQuestions: this.questions.length > 0,
      remaining: this.questions.length, // For Review Mode
    };
  }

  getCategories() {
    return this.cachedCategories;
  }
}

export const flashcardManager = new FlashcardManager();
