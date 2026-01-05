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
  
  // 新增元素
  dashboard: {
    due: document.getElementById("count-due"),
    new: document.getElementById("count-new"),
    mastered: document.getElementById("count-mastered")
  },
  modeSwitcher: {
    container: document.getElementById("mode-switcher"),
    btns: document.querySelectorAll(".mode-btn")
  },
  controls: {
    browse: document.getElementById("browse-controls"),
    srs: document.getElementById("srs-controls")
  },
  reviewComplete: document.getElementById("review-complete"),
  frontHint: document.querySelector(".card-front .card-hint")
};

export const ui = {
  elements,

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

  /** 設定 UI 模式 (browse | review) */
  setMode(mode) {
    // 更新切換器狀態
    elements.modeSwitcher.btns.forEach(btn => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
    });

    // 切換底部控制列
    if (mode === 'review') {
      elements.controls.browse.classList.add("hidden");
      elements.controls.srs.classList.remove("hidden");
    } else {
      elements.controls.browse.classList.remove("hidden");
      elements.controls.srs.classList.add("hidden");
      elements.reviewComplete.classList.add("hidden");
      elements.card.classList.remove("hidden");
    }
  },

  /** 顯示複習完成畫面 */
  showReviewComplete() {
    elements.card.classList.add("hidden");
    elements.reviewComplete.classList.remove("hidden");
    elements.controls.srs.classList.add("hidden"); // 隱藏評分按鈕
    elements.progress.textContent = "今日剩餘: 0 題";
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
  renderCard(data, status, mode = 'browse') {
    // 若複習模式且無卡片，顯示完成畫面
    if (mode === 'review' && !data) {
        ui.showReviewComplete();
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
    if (mode === 'review') {
        elements.progress.textContent = `今日剩餘: ${status.remaining} 題`;
    } else {
        elements.progress.textContent = `第 ${status.current} / ${status.total} 題 (${status.category})`;
    }
    
    // 重置翻面狀態
    elements.card.classList.remove("is-flipped");
    elements.cardFront.setAttribute("aria-hidden", "false");
    elements.cardBack.setAttribute("aria-hidden", "true");

    // 根據模式更新提示文字
    if (mode === 'review') {
        elements.frontHint.textContent = "🤔 思考答案後，點擊翻面";
        // 隱藏 SRS 按鈕直到翻面
        elements.controls.srs.classList.add("hidden"); 
    } else {
        elements.frontHint.textContent = "正面：題目 (點擊翻面)";
    }
  },

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

      setTimeout(() => ui.flipCard(), 500);
    } else {
      // 視覺震動：加入動畫 Class
      clickedBtn.classList.add("option-wrong", "shake-animation");

      // 觸覺震動：手機震動 200ms (如果裝置支援)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      clickedBtn.disabled = true;
      clickedBtn.style.pointerEvents = "none";
      
      clickedBtn.setAttribute(
        "aria-label",
        clickedBtn.getAttribute("aria-label") + " - 錯誤"
      );

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
    const isReviewMode = document.querySelector('.mode-btn[data-mode="review"]').classList.contains('active');

    if (isReviewMode) {
        if (isFlipped) {
            // 翻到背面 -> 顯示 SRS 按鈕
            elements.controls.srs.classList.remove("hidden");
        } else {
            // 翻回正面 -> 隱藏 SRS 按鈕
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
};
