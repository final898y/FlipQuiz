import { shuffleArray } from './utils.js';

class FlashcardManager {
    constructor() {
        this.allQuestions = [];
        this.questions = [];
        this.currentIndex = 0;
        this.currentCategory = "全部";
        this.cachedCategories = [];
    }

    /** 初始化題目數據 */
    init(data) {
        this.allQuestions = data;
        this.updateCachedCategories();
        this.filterCategory("全部", true);
    }

    /** 更新快取的分類列表 */
    updateCachedCategories() {
        const categorySet = new Set(
            this.allQuestions.map((q) => q.category).filter((c) => c && c.trim() !== "")
        );
        this.cachedCategories = ["全部", ...Array.from(categorySet)];
    }

    /** 分類與篩選 */
    filterCategory(cat, shouldShuffle = false) {
        this.currentCategory = cat;
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
        this.currentIndex = (this.currentIndex + step + this.questions.length) % this.questions.length;
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
            hasQuestions: this.questions.length > 0
        };
    }

    getCategories() {
        return this.cachedCategories;
    }
}

export const flashcardManager = new FlashcardManager();
