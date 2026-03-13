/**
 * 推薦題庫資料與邏輯
 */

export const recommendations = [
  {
    title: "基礎英文單字練習",
    description: "適合初學者的常用生活單字，包含發音練習與例句。",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzESjCbYEH1AHvNYOCGlxBSzeF4abDHPfZ9y19L-8Kmmk9KSHv5EtC573EQ9Z3-Gjv4o01wAdmMGdG/pub?output=csv",
    author: "Final898y",
    category: "基礎英文",
  },
  {
    title: "JavaScript 核心概念",
    description: "涵蓋 Closure, Promise, Async/Await 等面試常考題。",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQjAEsFFc0qjt5pNKcg7OMrX0vjsLmBQ1jjAH9VDlptDqsWbUc8wqK2FJsaJjT_Yu_fbCqZ8MweW7ul/pub?output=csv",
    author: "Final898y",
    category: "JavaScript",
  },
  {
    title: "iPAS AI應用規劃師初級模擬試題",
    description: "涵蓋AI基礎知識、應用場景及倫理議題的模擬試題。",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQunR6SYZtuUE2Ndaa2PTS36-FrLlj5dlSrLEJVdycN0oMCG4eRanLmLFqCH2bOPDbg-RvOfwaHEWPh/pub?output=csv",
    author: "Final898y",
    category: "AI",
  },
];

/**
 * 渲染推薦題庫列表
 * @param {HTMLElement} container 容器元素
 * @param {Function} onSelect 當選擇題庫時的回調
 */
export function renderRecommendationList(container, onSelect) {
  container.innerHTML = "";

  recommendations.forEach((item) => {
    const card = document.createElement("div");
    card.className = "recommend-card";
    card.innerHTML = `
      <div class="recommend-info">
        <span class="recommend-tag">${item.category}</span>
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        <small>作者：${item.author}</small>
      </div>
      <button type="button" class="btn-load-recommend">載入</button>
    `;

    card.querySelector(".btn-load-recommend").addEventListener("click", () => {
      onSelect(item.url);
    });

    container.appendChild(card);
  });
}
