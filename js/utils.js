/** 工具：洗牌演算法 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** 工具：強化版 CSV 解析器 */
export function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV 檔案為空");
  }

  // 1. 解析並標準化 Header (轉小寫、去空白)
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  if (headers.length === 0) {
    throw new Error("CSV 標題行無效");
  }

  // 2. 驗證必要欄位
  const requiredFields = ["type", "question", "answer"];
  const missingFields = requiredFields.filter(
    (field) => !headers.includes(field)
  );

  if (missingFields.length > 0) {
    throw new Error(
      `CSV 缺少必要欄位: ${missingFields.join(", ")} (請檢查標題列拼字)`
    );
  }

  const results = [];
  // 取得「今天」的日期物件，並將時間設定為 00:00:00，確保只比對日期
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const stats = {
    total: 0,
    updatedDates: 0, // 用來記錄有多少張卡片日期被校正了
    errors: 0,
  };

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCsvLine(lines[i]);

      // 3. 建立基礎物件並填入預設值 (SRS 欄位預設值)
      const obj = {
        uid: null, // 稍後若為空則自動產生
        category: "Default",
        type: "flashcard",
        question: "",
        answer: "",
        options: [],
        note: "",
        srs_level: 0, // 預設為未學習
        next_review: null, // 無下次複習日
        interval: 0,
        easiness: 2.5,
      };

      // 4. 填入 CSV 實際數據
      headers.forEach((header, idx) => {
        const value = values[idx] ? values[idx].trim() : "";
        if (value === "") return; // 跳過空值，保留預設值

        if (header === "options") {
          obj[header] = value
            .split(";")
            .map((o) => o.trim())
            .filter((o) => o !== "");
        } else if (header === "next_review") {
          const inputDate = new Date(value);
          // 檢查日期是否有效 (isNaN 代表 "Not a Number")
          if (!isNaN(inputDate.getTime())) {
            if (inputDate < today) {
              // 如果比今天早，自動設為今天 (格式化為 YYYY-MM-DD)
              obj[header] = today.toISOString().split("T")[0];
              console.info(
                `第 ${i + 1} 行日期 [${value}] 已過期，已自動校正為今天。`
              );
              stats.updatedDates++;
            } else {
              // 否則，使用原來的有效日期
              obj[header] = inputDate.toISOString().split("T")[0];
            }
          } else {
            console.warn(`第 ${i + 1} 行日期格式錯誤: "${value}"，已設為 null`);
            obj[header] = null;
          }
        } else if (header === "srs_level" || header === "interval") {
          obj[header] = parseInt(value, 10) || 0;
        } else if (header === "easiness") {
          obj[header] = parseFloat(value) || 2.5;
        } else {
          // 其他文字欄位直接寫入 (包含 uid, question, answer, note, category)
          obj[header] = value;
        }
      });

      // 5. 資料補全與後處理
      // 如果沒有 UID，使用行號 (i) 作為暫時 ID
      if (!obj.uid) {
        obj.uid = generateUUID();
      }

      // 再次確認關鍵數據存在 (雖然 Header 檢查過了，但該行可能數據為空)
      if (obj.question && obj.answer) {
        results.push(obj);
        stats.total++;
      }
    } catch (e) {
      console.warn(`解析第 ${i + 1} 行時出錯:`, e);
      stats.errors++;
    }
  }

  return {
    data: results,
    report: stats,
  };
}

/** 解析單行 CSV（處理引號內的逗號） */
function parseCsvLine(line) {
  const result = [];
  let current = "";
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
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/** * 產生唯一識別碼 (UUID v4)
 * 這是業界標準，重複機率低到可以忽略不計
 */
function generateUUID() {
  // 現代瀏覽器內建的功能
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 備用方案：如果環境太舊，用隨機數湊一個
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
