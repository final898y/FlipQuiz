import { loadData } from './dataLoader.js';
import { flashcardManager } from './flashcardManager.js';
import { ui } from './ui.js';
import { cache } from './cache.js';

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
        
        // 儲存到快取
        cache.saveSourceConfig('google_sheets', url);
        cache.saveCardData(questions);
        cache.saveCategoryProgress("全部", 0);
        
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
            // 讀取該分類上次的進度
            const savedIndex = cache.getCategoryProgress(cat);

            // 切換分類 (不自動洗牌，以維持順序)
            flashcardManager.filterCategory(cat, false);
            
            // 恢復進度
            flashcardManager.currentIndex = savedIndex;
            if (flashcardManager.currentIndex >= flashcardManager.questions.length) {
                flashcardManager.currentIndex = 0;
            }

            // 更新快取狀態 (設為當前分類)
            cache.saveCategoryProgress(cat, flashcardManager.currentIndex);

            renderCategoriesWithEvents(); // Re-render to update active state
            updateUI();
        }
    );
}

/** 切換題目（帶防閃爍邏輯） */
function changeQuestion(step) {
    const hasNext = flashcardManager.changeQuestion(step);
    if (!hasNext) return;

    // 儲存進度到快取 (包含目前分類)
    cache.saveCategoryProgress(flashcardManager.currentCategory, flashcardManager.currentIndex);

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
    
    // 洗牌後進度歸零，並更新快取
    cache.saveCategoryProgress(flashcardManager.currentCategory, 0);
    
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
    
    // 嘗試從快取載入
    const cached = cache.loadAll();

    if (cached.sourceUrl) {
        ui.setCsvUrl(cached.sourceUrl);
    }

    if (cached.cardData && cached.cardData.length > 0) {
        // 從快取載入時不洗牌，以維持題目順序與索引的一致性
        // 注意：init 預設會切換到 "全部"。如果 cached.currentCategory 不是 "全部"，我們需要再次篩選
        flashcardManager.init(cached.cardData, false);
        
        // 取得上次分類
        const targetCategory = cached.currentCategory || "全部";
        
        if (targetCategory !== "全部") {
             flashcardManager.filterCategory(targetCategory, false);
        }

        // 嘗試恢復該分類的專屬進度
        // 注意：loadAll 回傳的 currentIndex 是 "全域最後一次閱讀的 index"
        // 為了確保一致性，我們再次呼叫 getCategoryProgress 確保拿到的是該分類的進度
        const savedIndex = cache.getCategoryProgress(targetCategory);
        
        if (savedIndex >= 0 && savedIndex < flashcardManager.questions.length) {
             flashcardManager.currentIndex = savedIndex;
        } else {
             flashcardManager.currentIndex = 0;
        }
        
        renderCategoriesWithEvents();
        updateUI();
        console.log(`📦 已從快取載入上次資料 (分類: ${targetCategory}, 更新於: ${cache.getFormattedLastUpdate()})`);
    }

    console.log("✅ 應用程式已啟動 (Modules)");
    ui.focusCard();
});
