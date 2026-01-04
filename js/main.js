import { loadData } from './dataLoader.js';
import { flashcardManager } from './flashcardManager.js';
import { ui } from './ui.js';

/** 更新 UI */
function updateUI() {
    const data = flashcardManager.getCurrentData();
    const status = flashcardManager.getStatus();
    ui.renderCard(data, status);
}

/** 載入流程 */
async function loadUserSheet() {
    const url = ui.getCsvUrl();

    if (!url) {
        ui.showError("請貼上發佈為 CSV 的連結");
        ui.focusInput();
        return;
    }

    ui.setLoading(true);
    ui.clearError();

    try {
        const questions = await loadData(url);
        
        flashcardManager.init(questions);
        
        renderCategoriesWithEvents();
        updateUI();

        // 成功提示
        // 這裡直接操作 DOM 或者加一個 ui 方法？
        // 原有程式碼: progressEl.textContent = `成功載入 ${allQuestions.length} 題`;
        // 但 updateUI 接著會覆蓋 progressEl。
        // 所以 updateUI 顯示 "第 1 / N 題" 就足夠了，或者我們可以暫時顯示成功訊息。
        // 為了簡單，直接呼叫 updateUI 即可。
        
    } catch (e) {
        console.error("載入錯誤:", e);
        ui.showError(`載入失敗：${e.message}`);
        // progressEl.textContent = "載入失敗，請重試"; // 這部分 ui.js 沒有直接暴露，但 showError 已經足夠
    } finally {
        ui.setLoading(false);
    }
}

/** 渲染分類並綁定事件 */
function renderCategoriesWithEvents() {
    ui.renderCategories(
        flashcardManager.getCategories(), 
        flashcardManager.currentCategory,
        (cat) => {
            flashcardManager.filterCategory(cat);
            renderCategoriesWithEvents(); // Re-render to update active state
            updateUI();
        }
    );
}

/** 切換題目（帶防閃爍邏輯） */
function changeQuestion(step) {
    const hasNext = flashcardManager.changeQuestion(step);
    if (!hasNext) return;

    if (ui.elements.card.classList.contains("is-flipped")) {
        ui.elements.card.classList.remove("is-flipped");
        setTimeout(() => {
            updateUI();
        }, 300);
    } else {
        updateUI();
    }
}

/** 手動洗牌 */
function manualShuffle() {
    if (flashcardManager.questions.length === 0) {
        ui.showError("目前沒有題目可以洗牌！");
        return;
    }
    flashcardManager.shuffleQuestions();
    updateUI();
    
    // 簡單的通知 (可選)
    // progressEl.textContent = ... (updateUI handled this)
}


/* ============================================
   事件監聽器設置
   ============================================ */

function setupEventListeners() {
    // 載入按鈕 (HTML onclick移除後，這裡需要綁定)
    // 但因為 HTML 結構有 onclick="..."，我們需要先移除它們，或者覆蓋 window 函數
    // 為了符合模組化，我們在 main.js 啟動時綁定事件
    
    // 綁定載入按鈕
    const loadBtn = document.querySelector(".btn-sm"); // 或者 ui.elements.loadBtn
    if (loadBtn) {
        loadBtn.addEventListener("click", loadUserSheet);
    }

    // 綁定控制按鈕
    const prevBtn = document.querySelector(".btn-secondary"); // 上一題
    const shuffleBtn = document.querySelector(".btn-shuffle"); // 洗牌
    const nextBtn = document.querySelector(".btn-primary"); // 下一題

    if (prevBtn) prevBtn.addEventListener("click", () => changeQuestion(-1));
    if (shuffleBtn) shuffleBtn.addEventListener("click", manualShuffle);
    if (nextBtn) nextBtn.addEventListener("click", () => changeQuestion(1));


    // 卡片點擊翻面
    ui.elements.card.addEventListener("click", (e) => {
        if (e.target.classList.contains("option-btn")) return;
        ui.flipCard();
    });

    // 鍵盤導航
    document.addEventListener("keydown", (e) => {
        if (e.target === ui.elements.csvInput) return;

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            changeQuestion(-1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            changeQuestion(1);
        } else if (e.key === " " || e.code === "Space") {
            e.preventDefault();
            ui.flipCard();
        }
    });

    // Enter 鍵載入
    ui.elements.csvInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            loadUserSheet();
        }
    });
}

// 啟動
window.addEventListener("load", () => {
    setupEventListeners();
    console.log("✅ 應用程式已啟動 (Modules)");
    ui.focusCard();
});
