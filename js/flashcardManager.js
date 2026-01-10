import { shuffleArray } from "./utils.js";
import { SRS } from "./srs.js";

class FlashcardManager {
  constructor() {
    this.allQuestions = [];
    this.questions = []; // 當前顯示列表 (Browse or Review)
    this.reviewQueue = []; // 待複習列表
    this.currentIndex = 0;
    this.currentCategory = "全部";
    this.cachedCategories = [];
    this.mode = "browse"; // 'browse' | 'review'
  }

  /** 初始化題目數據 */
  init(data, shouldShuffle = true) {
    // 預處理數據：確保 SRS 欄位存在
    this.allQuestions = data.map((q, index) => ({
      ...q,
      uid: q.uid || index, // 確保有 ID
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

    if (mode === "review") {
      this.buildReviewQueue();
      this.questions = this.reviewQueue;
      // 複習模式下，通常不隨機洗牌，而是依照急迫性 (這裡暫時不排序，直接用列表)
      // 若要隨機：shuffleArray(this.questions);
    } else {
      // 瀏覽模式：重新套用分類篩選
      this.filterCategory(this.currentCategory, shouldShuffle);
    }

    this.currentIndex = 0;
  }

  /** 建立複習佇列 (Due + New) */
  buildReviewQueue() {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // 固定在本地午夜
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;

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

      const isNew = q.srs_level === 0;
      const isDue = q.next_review && q.next_review <= today;

      // 包含 "新卡片" 或 "到期卡片" (甚至是 "過期卡片")
      return isNew || isDue;
    });
  }

  /** 取得 Dashboard 統計數據 */
  getDashboardStats() {
    const today = new Date().toISOString().split("T")[0];

    let due = 0;
    let newCards = 0;
    let mastered = 0;

    this.allQuestions.forEach((q) => {
      const isNew = !q.srs_level || q.srs_level === 0;
      const isDue = q.next_review && q.next_review <= today;

      if (isNew) {
        newCards++;
      } else if (isDue) {
        due++;
      } else {
        mastered++;
      }
    });

    return { due, new: newCards, mastered };
  }

  /** 處理 SRS 評分 */
  handleSrsAction(rating) {
    // TODO: 實作真正的 SM-2 演算法
    // 目前僅做簡單模擬：評分後從佇列移除，進入下一張

    const currentCard = this.getCurrentData();
    if (!currentCard) return false;
    const updatedCard = SRS.calculateNextReview(currentCard, rating);
    //後續待更新資料庫或 CSV
    // 模擬更新 (暫存於記憶體，未寫回 CSV)
    // 這裡可以根據 rating (1-4) 更新 next_review
    console.log(`SRS Action: Card ${currentCard.question}, Rating: ${rating}`);

    // 在複習模式下，這張卡片處理完了，應該從當前佇列隱藏或標記
    // 但為了簡單 UI 操作，我們直接往後走。
    // 如果要做到 "處理完就消失"，我們可以在 changeQuestion 時跳過已處理的。
    // 目前先單純切換下一張。

    return this.changeQuestion(1);
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

  /** 分類與篩選 */
  filterCategory(cat, shouldShuffle = false) {
    this.currentCategory = cat;

    if (this.mode === "review") {
      // 複習模式下切換分類 -> 重建佇列
      this.buildReviewQueue();
      this.questions = this.reviewQueue;
      this.currentIndex = 0;
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

    // 複習模式邏輯：單向，且可能會有 "完成" 狀態
    if (this.mode === "review") {
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
      remaining: this.questions.length - this.currentIndex, // For Review Mode
    };
  }

  getCategories() {
    return this.cachedCategories;
  }
}

export const flashcardManager = new FlashcardManager();
