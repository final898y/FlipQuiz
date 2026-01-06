import { parseCSV } from "./utils.js";

/** 載入 CSV 資料 */
export async function loadData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: 無法載入檔案`);
  }
  const csvText = await response.text();

  if (!csvText.trim()) {
    throw new Error("CSV 檔案為空");
  }

  const { data, report } = parseCSV(csvText);

  if (data.length === 0) {
    throw new Error("未找到有效題目，請檢查 CSV 格式");
  }

  return data;
}
