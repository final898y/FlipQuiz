/**
 * 設定區
 */
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPuDW6SKAsQIJ0wKP3WPo1hlvvwzjtNJNQblg2vGOE2FKoFa1v_ddTcekrXGMsXIvMQubW5JGSqEEl/pub?output=csv'; 

let questions = []; // 存課題庫的陣列
let currentIndex = 0; // 目前題號

// 取得 HTML 元素的引用 (References)
const questionEl = document.getElementById('question-text');
const answerEl = document.getElementById('answer-text');
const cardEl = document.getElementById('card');
const optionsEl = document.getElementById('options-container');
/**
 * 初始化：一進網站就執行
 */
async function init() {
    // 檢查元素是否存在，避免 null 錯誤
    if (!questionEl || !answerEl || !cardEl) {
        console.error("錯誤：找不到 HTML 元素，請檢查 index.html 中的 ID。");
        return;
    }

    // 點擊卡片翻面的邏輯
    cardEl.addEventListener('click', () => {
        cardEl.classList.toggle('is-flipped');
    });

    try {
        // 1. 從網路抓取 CSV
        const response = await fetch(sheetUrl);
        if (!response.ok) throw new Error("網頁抓取失敗，請檢查網址是否正確 (404)");

        const csvText = await response.text();
        
        // 2. 解析 CSV 並存入 questions
        questions = parseCSV(csvText);
        
        // 3. 顯示第一題
        if (questions.length > 0) {
            renderCard();
        } else {
            questionEl.innerText = "題庫裡好像沒有資料喔！";
        }
    } catch (error) {
        console.error("載入失敗：", error);
        questionEl.innerText = "載入失敗：" + error.message;
    }
}

/**
 * 把目前的資料畫在卡片上
 */
function renderCard() {
    if (questions.length === 0) return;

    const currentData = questions[currentIndex];
    
    // 1. 基本文字顯示
    questionEl.innerText = currentData.question || "無題目";
    answerEl.innerText = currentData.answer || "無答案";

    // 2. 清空之前的選項
    optionsEl.innerHTML = '';

    // 3. 判斷是否為選擇題 (quiz)
    if (currentData.type === 'quiz' && currentData.options) {
        // 將 A;B;C;D 拆分成陣列並產生按鈕
        currentData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            
            // 這裡可以加一個簡單的點擊回饋
            btn.onclick = (e) => {
                e.stopPropagation(); // 防止觸發卡片翻面
                if (opt === currentData.answer) {
                    alert("答對了！");
                } else {
                    alert("再試試看喔！");
                }
            };
            optionsEl.appendChild(btn);
        });
    }

    // 換題時回到正面
    cardEl.classList.remove('is-flipped');
}

/**
 * 按鈕功能：下一題
 */
function nextCard() {
    if (questions.length === 0) return;
    currentIndex = (currentIndex + 1) % questions.length;
    renderCard();
}

/**
 * 按鈕功能：上一題
 */
function prevCard() {
    if (questions.length === 0) return;
    currentIndex = (currentIndex - 1 + questions.length) % questions.length;
    renderCard();
}

/**
 * CSV 解析器：把文字轉成物件
 */
function parseCSV(text) {
    // 依行拆分，並過濾掉空行
    const lines = text.split('\n').filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    // 取得第一行作為標題
    const headers = lines[0].split(',').map(h => h.trim());
    
    // 處理每一行數據
    return lines.slice(1).map(line => {
        const values = line.split(',');
        let obj = {};
        headers.forEach((h, i) => {
            // 將標題對應到數值
            let val = values[i] ? values[i].trim() : "";
            if (h === 'options' && val !== "") {
                // 將 "A;B;C" 轉換成 ["A", "B", "C"]
                obj[h] = val.split(';'); 
            } else {
                obj[h] = val;
            }
        });
        return obj;
    });
}

// 執行初始化
init();