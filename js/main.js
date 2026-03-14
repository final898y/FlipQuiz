import { loadData } from "./dataLoader.js";
import { flashcardManager } from "./flashcardManager.js";
import { ui } from "./ui.js";
import { cache } from "./cache.js";
import { exportToCSV, getFutureDate } from "./utils.js";
import { renderRecommendationList } from "./recommendations.js";
import { tts } from "./tts.js";

/** 更新 UI */
function updateUI() {
  const data = flashcardManager.getCurrentData();
  const status = flashcardManager.getStatus();
  ui.renderCard(data, status, flashcardManager.mode);

  // 切換題目時停止語音
  tts.stop();

  // 如果是測驗模式，更新記分板
  if (flashcardManager.mode === 'exam') {
      ui.updateScoreboard(flashcardManager.examStats);
  }

  // 同步更新 Dashboard
  const stats = flashcardManager.getDashboardStats();
  ui.updateDashboard(stats);
}

/** 處理測驗模式答題 */
function handleExamRating(isCorrect) {
    flashcardManager.handleExamAction(isCorrect);
    ui.updateScoreboard(flashcardManager.examStats);
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
    cache.saveSourceConfig("google_sheets", url);
    cache.saveCardData(questions);
    cache.saveCategoryProgress("全部", 0);

    renderCategoriesWithEvents();
    updateUI();
  } catch (e) {
    console.error("載入錯誤:", e);
    ui.showError(`載入失敗：${e.message}`);
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
      // 讀取該分類上次的進度 (僅在 Browse Mode 有效，Review Mode 會重置)
      const savedIndex = cache.getCategoryProgress(cat);

      // 切換分類
      flashcardManager.filterCategory(cat, false);

      // 僅在 Browse Mode 恢復進度
      if (flashcardManager.mode === "browse") {
        flashcardManager.currentIndex = savedIndex;
        if (
          flashcardManager.currentIndex >= flashcardManager.questions.length
        ) {
          flashcardManager.currentIndex = 0;
        }
      }

      // 更新快取狀態
      cache.saveCategoryProgress(cat, flashcardManager.currentIndex);

      renderCategoriesWithEvents(); // Re-render to update active state
      updateUI();
    }
  );
}

/** 切換題目（帶防閃爍邏輯） */
function changeQuestion(step) {
  const hasNext = flashcardManager.changeQuestion(step);

  // 如果在 Review/Quiz/Exam Mode 且沒有下一題了 -> 顯示完成
  if (!hasNext && (flashcardManager.mode === "review" || flashcardManager.mode === "quiz" || flashcardManager.mode === "exam")) {
    ui.showReviewComplete(flashcardManager.mode, flashcardManager.examStats);
    // 更新 Dashboard
    ui.updateDashboard(flashcardManager.getDashboardStats());
    return;
  }

  if (!hasNext && flashcardManager.mode === "browse") {
    // Browse mode 循環切換，理論上 flashcardManager.changeQuestion 會處理循環，
    // 但若列表為空則回傳 false
    return;
  }

  // 儲存進度到快取
  cache.saveCategoryProgress(
    flashcardManager.currentCategory,
    flashcardManager.currentIndex
  );

  if (ui.elements.card.classList.contains("is-flipped")) {
    ui.elements.card.classList.remove("is-flipped");
    // 等待翻轉動畫一半再更新內容
    setTimeout(() => {
      updateUI();
    }, 300);
  } else {
    updateUI();
  }
}

/** 處理 SRS 評分行為 */
function handleSrsRating(rating) {
  const KEY_TO_QUALITY = {
    1: 0, // 忘記了 (Again)
    2: 2, // 很吃力 (Hard)
    3: 4, // 記住了 (Good)
    4: 5, // 太簡單 (Easy)
  };

  const hasNext = flashcardManager.handleSrsAction(KEY_TO_QUALITY[rating]);

  if (hasNext) {
    // 切換到下一張 (邏輯與 changeQuestion 類似，但這裏明確是 SRS 前進)
    if (ui.elements.card.classList.contains("is-flipped")) {
      ui.elements.card.classList.remove("is-flipped");
      setTimeout(() => {
        updateUI();
      }, 300);
    } else {
      updateUI();
    }
  } else {
    // 完成所有複習
    ui.showReviewComplete();
    ui.updateDashboard(flashcardManager.getDashboardStats());
  }
}

/** 切換模式 (Browse <-> Review) */
function switchMode(newMode) {
  if (flashcardManager.mode === newMode) return;

  flashcardManager.setMode(newMode);
  ui.setMode(newMode);
  updateUI();
}

/** 手動洗牌 */
function manualShuffle() {
  if (flashcardManager.questions.length === 0) {
    ui.showError("目前沒有題目可以洗牌！");
    return;
  }
  flashcardManager.shuffleQuestions();
  cache.saveCategoryProgress(flashcardManager.currentCategory, 0);
  updateUI();
}

/** 處理 TTS 朗讀 */
function handleTTS(side) {
  const data = flashcardManager.getCurrentData();
  if (!data) return;

  const isFlipped = ui.elements.card.classList.contains("is-flipped");
  const targetSide = side || (isFlipped ? "back" : "front");

  const text = targetSide === "front" ? data.question : data.answer;
  const lang = targetSide === "front" ? data.lang_front : data.lang_back;

  tts.speak(text, lang, {
    onStart: () => ui.setSpeakingStatus(targetSide, true),
    onEnd: () => ui.setSpeakingStatus(targetSide, false),
  });
}

/* ============================================
   事件監聽器設置
   ============================================ */

function setupEventListeners() {
  // 注入回調給 UI
  ui.onAutoRate = handleSrsRating;
  ui.onExamAction = handleExamRating;
  ui.onNextQuestion = () => changeQuestion(1);

  // 綁定載入按鈕
  const loadBtn = document.querySelector(".btn-sm");
  if (loadBtn) {
    loadBtn.addEventListener("click", loadUserSheet);
  }

  // 綁定 TTS 按鈕
  if (ui.elements.ttsFront) {
    ui.elements.ttsFront.addEventListener("click", (e) => {
      e.stopPropagation();
      handleTTS("front");
    });
  }

  if (ui.elements.ttsBack) {
    ui.elements.ttsBack.addEventListener("click", (e) => {
      e.stopPropagation();
      handleTTS("back");
    });
  }

  // 綁定控制按鈕 (Browse Mode)
  const prevBtn = document.getElementById("prev-btn");
  const shuffleBtn = document.getElementById("shuffle-btn");
  const nextBtn = document.getElementById("next-btn");

  if (prevBtn) prevBtn.addEventListener("click", () => changeQuestion(-1));
  if (shuffleBtn) shuffleBtn.addEventListener("click", manualShuffle);
  if (nextBtn) nextBtn.addEventListener("click", () => changeQuestion(1));

  // 綁定 SRS 按鈕 (Review Mode)
  const srsBtns = document.querySelectorAll(".btn-srs");
  srsBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // 避免觸發卡片翻轉
      const rating = parseInt(btn.dataset.rating);
      handleSrsRating(rating);
    });
  });

  // 綁定模式切換器
  const modeBtns = document.querySelectorAll(".mode-btn");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });

  // 卡片點擊翻面 (Browse Mode)
  ui.elements.card.addEventListener("click", (e) => {
    if (e.target.closest(".option-btn") || e.target.closest(".btn-tts")) return;
    // Review mode 下，如果未翻面且有遮罩，click event 可能被遮罩攔截(上面已處理)。
    // 如果已翻面，點擊卡片本身也可以翻回來。
    ui.flipCard();
  });

  // 鍵盤導航
  document.addEventListener("keydown", (e) => {
    if (e.target === ui.elements.csvInput) return;

    // 僅在 Browse Mode 支援左右鍵
    if (flashcardManager.mode === "browse") {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changeQuestion(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        changeQuestion(1);
      }
    }

    // 空白鍵：翻牌
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      ui.flipCard();
    }

    // V 鍵：朗讀
    if (e.key.toLowerCase() === "v") {
      e.preventDefault();
      handleTTS();
    }

    // 數字鍵 1-4：SRS 評分 (僅在 Review Mode 且卡片翻到背面時)
    if (
      flashcardManager.mode === "review" &&
      ui.elements.card.classList.contains("is-flipped")
    ) {
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        handleSrsRating(parseInt(e.key));
      }
    }
  });

  // Enter 鍵載入
  ui.elements.csvInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadUserSheet();
    }
  });

  // 匯出按鈕
  if (ui.elements.btnExport) {
    ui.elements.btnExport.addEventListener("click", () => {
        if (flashcardManager.allQuestions.length === 0) {
            ui.showError("沒有資料可以匯出");
            return;
        }
        const todayStr = getFutureDate(0); // 取得今天日期字串
        exportToCSV(flashcardManager.allQuestions, `flipquiz_backup_${todayStr}.csv`);
    });
  }

  // 任務完成後的「繼續練習」按鈕
  const btnContinue = document.getElementById("btn-continue-practice");
  if (btnContinue) {
      btnContinue.addEventListener("click", () => {
          // 切換回瀏覽模式
          switchMode("browse");
          // 自動洗牌，讓題目順序打亂
          manualShuffle();
      });
  }

  // 推薦按鈕與 Modal 控制
  if (ui.elements.btnRecommend) {
      ui.elements.btnRecommend.addEventListener("click", () => {
          ui.toggleRecommendModal(true);
          renderRecommendationList(ui.elements.recommendList, (url) => {
              ui.setCsvUrl(url);
              ui.toggleRecommendModal(false);
              loadUserSheet(); // 自動載入
          });
      });
  }

  if (ui.elements.recommendClose) {
      ui.elements.recommendClose.addEventListener("click", () => ui.toggleRecommendModal(false));
  }

  if (ui.elements.recommendBackdrop) {
      ui.elements.recommendBackdrop.addEventListener("click", () => ui.toggleRecommendModal(false));
  }

  // 說明按鈕與 Modal 控制
  if (ui.elements.btnHelp) {
      ui.elements.btnHelp.addEventListener("click", () => ui.toggleModal(true));
  }
  
  if (ui.elements.modalClose) {
      ui.elements.modalClose.addEventListener("click", () => ui.toggleModal(false));
  }

  if (ui.elements.modalBackdrop) {
      ui.elements.modalBackdrop.addEventListener("click", () => ui.toggleModal(false));
  }
  
  // Modal 內的 Escape 鍵關閉
  document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !ui.elements.modal.classList.contains("hidden")) {
          ui.toggleModal(false);
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
    flashcardManager.init(cached.cardData, false);

    const targetCategory = cached.currentCategory || "全部";

    if (targetCategory !== "全部") {
      flashcardManager.filterCategory(targetCategory, false);
    }

    const savedIndex = cache.getCategoryProgress(targetCategory);
    if (savedIndex >= 0) {
      flashcardManager.currentIndex = savedIndex;
    }

    renderCategoriesWithEvents();
    updateUI();
    console.log(`📦 已從快取載入上次資料`);
  } else {
    // 初始狀態更新 Dashboard (全 0)
    ui.updateDashboard(flashcardManager.getDashboardStats());
  }

  console.log("✅ 應用程式已啟動");
  ui.focusCard();
});
