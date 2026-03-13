// DOM 元素引用
const elements = {
  card: document.getElementById("card"),
  question: document.getElementById("question-text"),
  answer: document.getElementById("answer-text"),
  note: document.getElementById("note-text"),
  options: document.getElementById("options-container"),
  progress: document.getElementById("progress-info"),
  tags: document.getElementById("category-tags"),
  error: document.getElementById("error-message"),
  loadBtn: document.querySelector(".btn-sm"),
  csvInput: document.getElementById("csv-url-input"),
  cardFront: document.querySelector(".card-front"),
  cardBack: document.querySelector(".card-back"),

  // Navbar 按鈕
  btnRecommend: document.getElementById("btn-recommend"),
  btnExport: document.getElementById("btn-export"),
  btnHelp: document.getElementById("btn-help"),

  // Modal
  modal: document.getElementById("help-modal"),
  modalClose: document.querySelector(".btn-close"),
  modalBackdrop: document.querySelector(".modal-backdrop"),

  // 推薦 Modal
  recommendModal: document.getElementById("recommend-modal"),
  recommendList: document.getElementById("recommend-list"),
  recommendClose: document.querySelector(".btn-close-recommend"),
  recommendBackdrop: document.querySelector("#recommend-modal .modal-backdrop"),
  // 新增元素
  dashboard: {
    due: document.getElementById("count-due"),
    new: document.getElementById("count-new"),
    mastered: document.getElementById("count-mastered"),
  },
  modeSwitcher: {
    container: document.getElementById("mode-switcher"),
    btns: document.querySelectorAll(".mode-btn"),
  },
  scoreboard: {
    container: document.getElementById("exam-scoreboard"),
    correct: document.getElementById("score-correct"),
    wrong: document.getElementById("score-wrong"),
    accuracy: document.getElementById("score-accuracy"),
  },
  modeDescription: document.getElementById("mode-description"),
  controls: {
    browse: document.getElementById("browse-controls"),
    srs: document.getElementById("srs-controls"),
  },
  reviewComplete: document.getElementById("review-complete"),
  frontHint: document.querySelector(".card-front .card-hint"),
};

export const ui = {
  elements,

  /** 狀態追蹤：當前卡片答錯次數 */
  wrongAttempts: 0,
  /** 外部回調：自動評分 (由 main.js 注入) */
  onAutoRate: null,

  /** 顯示錯誤訊息 */
  showError(message) {
    elements.error.textContent = message;
    elements.error.classList.add("show");
    setTimeout(() => elements.error.classList.remove("show"), 5000);
  },

  /** 清除錯誤訊息 */
  clearError() {
    elements.error.classList.remove("show");
  },

  /** 設定載入狀態 */
  setLoading(isLoading) {
    if (isLoading) {
      elements.loadBtn.classList.add("loading");
      elements.loadBtn.disabled = true;
    } else {
      elements.loadBtn.classList.remove("loading");
      elements.loadBtn.disabled = false;
    }
  },

  /** 更新 Dashboard 數據 */
  updateDashboard(stats) {
    elements.dashboard.due.textContent = stats.due || 0;
    elements.dashboard.new.textContent = stats.new || 0;
    elements.dashboard.mastered.textContent = stats.mastered || 0;
  },

  /** 設定 UI 模式 (browse | review | quiz | exam) */
  setMode(mode) {
    // 更新切換器狀態
    elements.modeSwitcher.btns.forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
    });

    // 更新模式說明文字
    const descriptions = {
      browse: "正在瀏覽所有卡片。",
      review: "針對到期卡片進行手動評分。",
      quiz: "僅測驗選擇題，依結果自動計算 SRS。",
      exam: "僅測驗選擇題，不影響 SRS 進度。",
    };
    if (elements.modeDescription) {
      elements.modeDescription.textContent = descriptions[mode] || "";
    }

    // 顯示/隱藏記分板 (僅快速測驗模式顯示)
    if (mode === "exam") {
      elements.scoreboard.container.classList.remove("hidden");
      this.updateScoreboard({ correct: 0, wrong: 0, total: 0 });
    } else {
      elements.scoreboard.container.classList.add("hidden");
    }

    // 切換底部控制列
    if (mode === "review") {
      elements.controls.browse.classList.add("hidden");
      elements.controls.srs.classList.remove("hidden");
    } else if (mode === "quiz" || mode === "exam") {
      elements.controls.browse.classList.add("hidden");
      elements.controls.srs.classList.add("hidden");
    } else {
      elements.controls.browse.classList.remove("hidden");
      elements.controls.srs.classList.add("hidden");
    }

    // 重置畫面
    elements.reviewComplete.classList.add("hidden");
    elements.card.classList.remove("hidden");
  },

  /** 更新記分板數值 */
  updateScoreboard(stats) {
    elements.scoreboard.correct.textContent = stats.correct;
    elements.scoreboard.wrong.textContent = stats.wrong;

    const totalAnswered = stats.correct + stats.wrong;
    const accuracy =
      totalAnswered === 0
        ? 0
        : Math.round((stats.correct / totalAnswered) * 100);
    elements.scoreboard.accuracy.textContent = `${accuracy}%`;
  },

  /** 外部回調：下一題 (由 main.js 注入) */
  onNextQuestion: null,

  /** 顯示複習完成畫面 */
  showReviewComplete(mode = "review", stats = null) {
    elements.card.classList.add("hidden");
    elements.reviewComplete.classList.remove("hidden");
    elements.controls.srs.classList.add("hidden");
    elements.progress.textContent = "任務完成！";

    const title = elements.reviewComplete.querySelector("h2");
    const desc = elements.reviewComplete.querySelector("p");

    if (mode === "exam" && stats) {
      const accuracy =
        stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
      title.textContent = "測驗結束！";
      desc.innerHTML = `本次得分：<strong>${stats.correct}</strong> / ${stats.total}<br>準確率：<strong>${accuracy}%</strong>`;
    } else {
      title.textContent = "今日複習任務已完成！";
      desc.textContent = "太棒了！您已經處理完所有到期的卡片。";
    }
  },

  /** 渲染分類標籤 */
  renderCategories(categories, currentCategory, onSelect) {
    elements.tags.innerHTML = "";

    categories.forEach((cat) => {
      const span = document.createElement("span");
      span.className = `tag ${cat === currentCategory ? "active" : ""}`;
      span.textContent = cat;
      span.setAttribute("role", "button");
      span.setAttribute("tabindex", "0");
      span.setAttribute("aria-pressed", cat === currentCategory);

      const handleSelect = () => {
        if (onSelect) onSelect(cat);
      };

      // 點擊事件
      span.addEventListener("click", handleSelect);

      // 鍵盤事件（Enter 或 Space）
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      });

      elements.tags.appendChild(span);
    });
  },

  /** 渲染卡片內容 */
  renderCard(data, status, mode = "browse") {
    // 重置答錯計數
    this.wrongAttempts = 0;

    // 若複習/測驗/考試模式且無卡片，顯示完成畫面
    if ((mode === "review" || mode === "quiz" || mode === "exam") && !data) {
      ui.showReviewComplete(mode);
      return;
    }

    // 恢復顯示卡片（可能從完成畫面切換回來）
    elements.card.classList.remove("hidden");
    elements.reviewComplete.classList.add("hidden");

    // 處理無題目的情況 (Browse Mode)
    if (!status.hasQuestions) {
      elements.progress.textContent = "目前沒有題目";
      elements.question.textContent = "請選擇其他分類或重新載入題庫";
      elements.options.innerHTML = "";
      elements.answer.textContent = "";
      elements.note.textContent = "";
      elements.note.style.display = "none";
      return;
    }

    // 安全的屬性讀取
    elements.question.textContent = data?.question || "(無題目)";
    elements.answer.textContent = data?.answer || "(無解答)";

    // 處理補充說明
    if (data?.note && data.note.trim() !== "") {
      elements.note.textContent = "💡 補充：\n" + data.note;
      elements.note.style.display = "block";
    } else {
      elements.note.textContent = "";
      elements.note.style.display = "none";
    }

    // 渲染選項
    elements.options.innerHTML = "";
    if (
      data?.type === "quiz" &&
      Array.isArray(data.options) &&
      data.options.length > 0
    ) {
      data.options.forEach((opt, index) => {
        if (!opt || opt.trim() === "") return;

        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt.trim();
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-label", `選項 ${index + 1}: ${opt.trim()}`);

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          ui.handleQuizChoice(btn, opt.trim(), data.answer);
        });

        elements.options.appendChild(btn);
      });
    }

    // 更新進度文字
    if (mode === "review" || mode === "quiz" || mode === "exam") {
      const remaining =
        mode === "exam" ? status.total - status.current + 1 : status.remaining;
      elements.progress.textContent = `進度: ${status.current} / ${status.total} (剩餘 ${remaining} 題)`;
    } else {
      elements.progress.textContent = `第 ${status.current} / ${status.total} 題 (${status.category})`;
    }

    // 重置翻面狀態
    elements.card.classList.remove("is-flipped");
    elements.cardFront.setAttribute("aria-hidden", "false");
    elements.cardBack.setAttribute("aria-hidden", "true");

    // 根據模式更新提示文字
    if (mode === "review") {
      elements.frontHint.textContent = "思考答案後，點擊翻面";
      elements.controls.srs.classList.add("hidden");
    } else if (mode === "quiz") {
      elements.frontHint.textContent = "自動 SRS (測驗中)";
      elements.controls.srs.classList.add("hidden");
    } else if (mode === "exam") {
      elements.frontHint.textContent = "快速測驗 (不計入 SRS)";
      elements.controls.srs.classList.add("hidden");
    } else {
      elements.frontHint.textContent = "正面：題目 (點擊翻面)";
    }
  },

  /** 外部回調：測驗動作 (由 main.js 注入) */
  onExamAction: null,

  /** 處理選擇題點擊 */
  handleQuizChoice(clickedBtn, choice, correct) {
    const isCorrect = choice.trim() === correct?.trim();

    if (isCorrect) {
      clickedBtn.classList.add("option-correct");
      clickedBtn.setAttribute(
        "aria-label",
        clickedBtn.getAttribute("aria-label") + " - 正確！"
      );

      // 禁用所有按鈕
      const allBtns = elements.options.querySelectorAll(".option-btn");
      allBtns.forEach((b) => {
        b.disabled = true;
        b.style.pointerEvents = "none";
        if (b !== clickedBtn) b.style.opacity = "0.5";
      });

      // 檢查目前的模式
      const currentModeBtn = document.querySelector(".mode-btn.active");
      const currentMode = currentModeBtn
        ? currentModeBtn.dataset.mode
        : "browse";

      if (currentMode === "quiz" && typeof this.onAutoRate === "function") {
        // 自動 SRS 模式：自動評分邏輯
        let rating = 3;
        if (this.wrongAttempts === 0) rating = 3;
        else if (this.wrongAttempts === 1) rating = 2;
        else rating = 1;

        setTimeout(() => {
          this.onAutoRate(rating);
        }, 500);
      } else if (
        currentMode === "exam" &&
        typeof this.onExamAction === "function"
      ) {
        // 快速測驗模式：純計分，自動跳轉
        this.onExamAction(true);
        setTimeout(() => {
          // 自動跳到下一題 (由 main.js 處理)
          if (this.onNextQuestion) this.onNextQuestion();
        }, 800);
      } else {
        // Review 或 Browse 模式：翻面顯示背面
        setTimeout(() => ui.flipCard(), 500);
      }
    } else {
      // 記錄本次答錯
      this.wrongAttempts++;

      // 視覺震動
      clickedBtn.classList.add("option-wrong", "shake-animation");

      if (navigator.vibrate) navigator.vibrate(200);

      clickedBtn.disabled = true;
      clickedBtn.style.pointerEvents = "none";

      const currentModeBtn = document.querySelector(".mode-btn.active");
      const currentMode = currentModeBtn
        ? currentModeBtn.dataset.mode
        : "browse";

      if (currentMode === "exam" && typeof this.onExamAction === "function") {
        // 測驗模式答錯：計分並翻面看答案
        this.onExamAction(false);
        setTimeout(() => {
          ui.flipCard();
          // 顯示背面 2 秒後自動跳下一題，或者讓使用者手動點？
          // 這裡採自動跳轉，確保「快速」測驗
          setTimeout(() => {
            if (this.onNextQuestion) this.onNextQuestion();
          }, 2500);
        }, 500);
      }

      setTimeout(() => clickedBtn.classList.remove("shake-animation"), 500);
    }
  },

  /** 翻轉卡片 */
  flipCard() {
    const isFlipped = elements.card.classList.toggle("is-flipped");
    // 更新 ARIA 屬性
    elements.cardFront.setAttribute("aria-hidden", isFlipped);
    elements.cardBack.setAttribute("aria-hidden", !isFlipped);

    // 檢查目前模式 (透過 DOM 狀態判斷)
    const currentModeBtn = document.querySelector(".mode-btn.active");
    const currentMode = currentModeBtn ? currentModeBtn.dataset.mode : "browse";

    // 只有在 "複習模式 (Review)" 且 "翻到背面" 時才顯示 SRS 按鈕
    // "快速測驗 (Quiz)" 模式即使翻面（例如答錯後翻面看筆記）也不需要手動評分
    if (currentMode === "review") {
      if (isFlipped) {
        elements.controls.srs.classList.remove("hidden");
      } else {
        elements.controls.srs.classList.add("hidden");
      }
    }
  },

  /** 取得 CSV 輸入值 */
  getCsvUrl() {
    return elements.csvInput.value.trim();
  },

  /** 設定 CSV 輸入值 */
  setCsvUrl(url) {
    if (url) elements.csvInput.value = url;
  },

  focusCard() {
    if (elements.card) elements.card.focus();
  },

  focusInput() {
    if (elements.csvInput) elements.csvInput.focus();
  },

  /** 切換 Modal 顯示狀態 */
  toggleModal(show) {
    if (show) {
      elements.modal.classList.remove("hidden");
      // 為了動畫，延遲一下加入 visible class (如果 CSS 有做)
      // 這裡直接移除 hidden 讓 opacity transition 生效
    } else {
      elements.modal.classList.add("hidden");
    }
  },

  /** 切換推薦 Modal 顯示狀態 */
  toggleRecommendModal(show) {
    if (show) {
      elements.recommendModal.classList.remove("hidden");
    } else {
      elements.recommendModal.classList.add("hidden");
    }
  },
};
