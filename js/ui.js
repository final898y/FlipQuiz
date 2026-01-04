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
    cardBack: document.querySelector(".card-back")
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
    renderCard(data, status) {
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

        elements.progress.textContent = `第 ${status.current} / ${status.total} 題 (${status.category})`;
        elements.card.classList.remove("is-flipped");

        // 更新 ARIA 屬性
        elements.cardFront.setAttribute("aria-hidden", "false");
        elements.cardBack.setAttribute("aria-hidden", "true");
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
            clickedBtn.classList.add("option-wrong", "shake-animation");
            clickedBtn.disabled = true;
            clickedBtn.style.pointerEvents = "none";
            clickedBtn.style.opacity = "0.5";
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
    },

    /** 取得 CSV 輸入值 */
    getCsvUrl() {
        return elements.csvInput.value.trim();
    },
    
    focusCard() {
        if(elements.card) elements.card.focus();
    },

    focusInput() {
        if(elements.csvInput) elements.csvInput.focus();
    }
};
