let allQuestions = [];
let questions = [];
let currentIndex = 0;
let currentCategory = '全部';
let cachedCategories = [];

// DOM 元素引用
const cardEl = document.getElementById('card');
const questionEl = document.getElementById('question-text');
const answerEl = document.getElementById('answer-text');
const noteEl = document.getElementById('note-text');
const optionsEl = document.getElementById('options-container');
const progressEl = document.getElementById('progress-info');
const tagsEl = document.getElementById('category-tags');
const errorEl = document.getElementById('error-message');
const loadBtn = document.querySelector('.btn-sm');
const csvInput = document.getElementById('csv-url-input');

/** 顯示錯誤訊息 */
function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
}

/** 清除錯誤訊息 */
function clearError() {
    errorEl.classList.remove('show');
}

/** 設定載入狀態 */
function setLoading(isLoading) {
    if (isLoading) {
        loadBtn.classList.add('loading');
        loadBtn.disabled = true;
    } else {
        loadBtn.classList.remove('loading');
        loadBtn.disabled = false;
    }
}

/** 載入 CSV 資料 */
async function loadUserSheet() {
    const url = csvInput.value.trim();
    
    if (!url) {
        showError("請貼上發佈為 CSV 的連結");
        csvInput.focus();
        return;
    }
    
    setLoading(true);
    clearError();
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 無法載入檔案`);
        }
        const csvText = await response.text();
        
        if (!csvText.trim()) {
            throw new Error('CSV 檔案為空');
        }
        
        allQuestions = parseCSV(csvText);
        
        if (allQuestions.length === 0) {
            throw new Error('未找到有效題目，請檢查 CSV 格式');
        }
        
        // 快取分類列表
        updateCachedCategories();
        
        // 初始載入：全部並洗牌
        filterCategory('全部', true); 
        renderCategories();
        
        // 成功提示
        progressEl.textContent = `成功載入 ${allQuestions.length} 題`;
        
    } catch (e) {
        console.error('載入錯誤:', e);
        showError(`載入失敗：${e.message}`);
        progressEl.textContent = '載入失敗，請重試';
    } finally {
        setLoading(false);
    }
}

/** 更新快取的分類列表 */
function updateCachedCategories() {
    const categorySet = new Set(
        allQuestions
            .map(q => q.category)
            .filter(c => c && c.trim() !== '')
    );
    cachedCategories = ['全部', ...Array.from(categorySet)];
}

/** 分類與篩選 */
function filterCategory(cat, shouldShuffle = false) {
    currentCategory = cat;
    questions = (cat === '全部') 
        ? [...allQuestions] 
        : allQuestions.filter(q => q.category === cat);
    
    if (shouldShuffle) shuffleArray(questions);
    
    currentIndex = 0;
    renderCategories();
    renderCard();
}

/** 渲染分類標籤（安全版本） */
function renderCategories() {
    tagsEl.innerHTML = '';
    
    cachedCategories.forEach(cat => {
        const span = document.createElement('span');
        span.className = `tag ${cat === currentCategory ? 'active' : ''}`;
        span.textContent = cat;
        span.setAttribute('role', 'button');
        span.setAttribute('tabindex', '0');
        span.setAttribute('aria-pressed', cat === currentCategory);
        
        // 點擊事件
        span.addEventListener('click', () => filterCategory(cat));
        
        // 鍵盤事件（Enter 或 Space）
        span.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                filterCategory(cat);
            }
        });
        
        tagsEl.appendChild(span);
    });
}

/** 渲染卡片內容（安全版本） */
function renderCard() {
    if (questions.length === 0) {
        progressEl.textContent = '目前沒有題目';
        questionEl.textContent = '請選擇其他分類或重新載入題庫';
        optionsEl.innerHTML = '';
        answerEl.textContent = '';
        noteEl.textContent = '';
        noteEl.style.display = 'none';
        return;
    }
    
    const data = questions[currentIndex];
    
    // 安全的屬性讀取
    questionEl.textContent = data?.question || '(無題目)';
    answerEl.textContent = data?.answer || '(無解答)';
    
    // 處理補充說明
    if (data?.note && data.note.trim() !== '') {
        noteEl.textContent = "💡 補充：\n" + data.note;
        noteEl.style.display = "block";
    } else {
        noteEl.textContent = "";
        noteEl.style.display = "none";
    }

    // 渲染選項
    optionsEl.innerHTML = '';
    if (data?.type === 'quiz' && Array.isArray(data.options) && data.options.length > 0) {
        data.options.forEach((opt, index) => {
            if (!opt || opt.trim() === '') return;
            
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt.trim();
            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-label', `選項 ${index + 1}: ${opt.trim()}`);
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleQuizChoice(btn, opt.trim(), data.answer);
            });
            
            optionsEl.appendChild(btn);
        });
    }

    progressEl.textContent = `第 ${currentIndex + 1} / ${questions.length} 題 (${currentCategory})`;
    cardEl.classList.remove('is-flipped');
    
    // 更新 ARIA 屬性
    cardEl.querySelector('.card-front').setAttribute('aria-hidden', 'false');
    cardEl.querySelector('.card-back').setAttribute('aria-hidden', 'true');
}

/** 處理選擇題點擊 */
function handleQuizChoice(clickedBtn, choice, correct) {
    const isCorrect = choice.trim() === correct?.trim();
    
    if (isCorrect) {
        clickedBtn.classList.add('option-correct');
        clickedBtn.setAttribute('aria-label', clickedBtn.getAttribute('aria-label') + ' - 正確！');
        
        // 禁用所有按鈕
        const allBtns = optionsEl.querySelectorAll('.option-btn');
        allBtns.forEach(b => { 
            b.disabled = true;
            b.style.pointerEvents = 'none'; 
            if (b !== clickedBtn) b.style.opacity = '0.5'; 
        });
        
        setTimeout(() => flipCard(), 500);
    } else {
        clickedBtn.classList.add('option-wrong', 'shake-animation');
        clickedBtn.disabled = true;
        clickedBtn.style.pointerEvents = 'none';
        clickedBtn.style.opacity = '0.5';
        clickedBtn.setAttribute('aria-label', clickedBtn.getAttribute('aria-label') + ' - 錯誤');
        
        setTimeout(() => clickedBtn.classList.remove('shake-animation'), 500);
    }
}

/** 翻轉卡片 */
function flipCard() {
    const isFlipped = cardEl.classList.toggle('is-flipped');
    
    // 更新 ARIA 屬性
    cardEl.querySelector('.card-front').setAttribute('aria-hidden', isFlipped);
    cardEl.querySelector('.card-back').setAttribute('aria-hidden', !isFlipped);
}

/** 切換題目（帶防閃爍邏輯） */
function changeQuestion(step) {
    if (questions.length === 0) return;
    
    const nextIdx = (currentIndex + step + questions.length) % questions.length;
    
    if (cardEl.classList.contains('is-flipped')) {
        cardEl.classList.remove('is-flipped');
        setTimeout(() => { 
            currentIndex = nextIdx; 
            renderCard(); 
        }, 300);
    } else {
        currentIndex = nextIdx;
        renderCard();
    }
}

function nextCard() { changeQuestion(1); }
function prevCard() { changeQuestion(-1); }

/** 手動洗牌 */
function manualShuffle() {
    if (questions.length === 0) {
        showError("目前沒有題目可以洗牌！");
        return;
    }
    shuffleArray(questions);
    currentIndex = 0;
    renderCard();
    
    // 使用非阻塞的通知方式
    progressEl.textContent = `已隨機打亂！第 1 / ${questions.length} 題 (${currentCategory})`;
}

/** 工具：洗牌演算法 */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/** 工具：強化版 CSV 解析器 */
function parseCSV(text) {
    const lines = text.split('\n').filter(l => l.trim() !== "");
    
    if (lines.length === 0) {
        throw new Error('CSV 檔案為空');
    }
    
    const headers = parseCsvLine(lines[0]);
    
    if (headers.length === 0) {
        throw new Error('CSV 標題行無效');
    }
    
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCsvLine(lines[i]);
            const obj = {};
            
            headers.forEach((header, idx) => {
                const value = values[idx] ? values[idx].trim() : "";
                
                if (header === 'options' && value !== "") {
                    obj[header] = value.split(';').map(o => o.trim()).filter(o => o !== '');
                } else {
                    obj[header] = value;
                }
            });
            
            // 驗證必要欄位
            if (obj.question && obj.answer) {
                results.push(obj);
            }
        } catch (e) {
            console.warn(`解析第 ${i + 1} 行時出錯:`, e);
        }
    }
    
    return results;
}

/** 解析單行 CSV（處理引號內的逗號） */
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

/* ============================================
   事件監聽器
   ============================================ */

// 點擊卡片翻面
cardEl.addEventListener('click', (e) => {
    // 如果點擊的是選項按鈕，不翻面
    if (e.target.classList.contains('option-btn')) return;
    flipCard();
});

// 鍵盤導航 - 簡化版本
document.addEventListener('keydown', (e) => {
    // 如果正在輸入框中打字，不處理快捷鍵
    if (e.target === csvInput) return;
    
    // 處理方向鍵
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
        console.log('← 上一題');
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
        console.log('→ 下一題');
    } 
    // 處理空白鍵
    else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        flipCard();
        console.log('空白鍵 - 翻轉卡片');
    }
});

// Enter 鍵載入
csvInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        loadUserSheet();
    }
});

// 初始化時給卡片焦點
window.addEventListener('load', () => {
    console.log('✅ 智學卡已載入！');
    console.log('📌 鍵盤快捷鍵：');
    console.log('   ← → 切換題目');
    console.log('   空白鍵 翻轉卡片');
});