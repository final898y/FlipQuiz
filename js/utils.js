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

  const headers = parseCsvLine(lines[0]);

  if (headers.length === 0) {
    throw new Error("CSV 標題行無效");
  }

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCsvLine(lines[i]);
      const obj = {};

      headers.forEach((header, idx) => {
        const value = values[idx] ? values[idx].trim() : "";

        if (header === "options" && value !== "") {
          obj[header] = value
            .split(";")
            .map((o) => o.trim())
            .filter((o) => o !== "");
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
