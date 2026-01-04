// js/cache.js - 快取管理模組 (LocalStorage 實作)

const KEYS = {
    DATA_SOURCE: 'flashcard_data_source', // 來源類型 (如: google_sheets)
    SOURCE_URL: 'flashcard_source_url',     // 來源網址
    CARD_DATA: 'flashcard_card_data',       // 題目資料
    LAST_UPDATE: 'flashcard_last_update',   // 最後更新時間
    CURRENT_INDEX: 'flashcard_current_index', // 目前進度 (相容舊版/當前顯示用)
    CURRENT_CATEGORY: 'flashcard_current_category', // 目前分類
    CATEGORY_PROGRESS: 'flashcard_category_progress_map' // 各分類進度地圖
};

export const cache = {
    /** 儲存資料來源設定 */
    saveSourceConfig(type, url) {
        try {
            localStorage.setItem(KEYS.DATA_SOURCE, type);
            localStorage.setItem(KEYS.SOURCE_URL, url);
        } catch (e) {
            console.error('儲存來源設定失敗:', e);
        }
    },

    /** 儲存卡片資料與更新時間 */
    saveCardData(data) {
        try {
            localStorage.setItem(KEYS.CARD_DATA, JSON.stringify(data));
            localStorage.setItem(KEYS.LAST_UPDATE, new Date().toISOString());
        } catch (e) {
            console.error('儲存卡片資料失敗:', e);
        }
    },

    /** 更新特定分類的進度 */
    saveCategoryProgress(category, index) {
        try {
            // 1. 儲存當前狀態 (相容舊邏輯)
            localStorage.setItem(KEYS.CURRENT_INDEX, index.toString());
            localStorage.setItem(KEYS.CURRENT_CATEGORY, category);

            // 2. 更新分類進度 Map
            const mapData = localStorage.getItem(KEYS.CATEGORY_PROGRESS);
            const progressMap = mapData ? JSON.parse(mapData) : {};
            
            progressMap[category] = index;
            
            localStorage.setItem(KEYS.CATEGORY_PROGRESS, JSON.stringify(progressMap));
        } catch (e) {
            console.error('儲存分類進度失敗:', e);
        }
    },

    /** 取得特定分類的進度 */
    getCategoryProgress(category) {
        try {
            const mapData = localStorage.getItem(KEYS.CATEGORY_PROGRESS);
            if (!mapData) return 0;
            
            const progressMap = JSON.parse(mapData);
            return progressMap[category] ? parseInt(progressMap[category], 10) : 0;
        } catch (e) {
            console.error('讀取分類進度失敗:', e);
            return 0;
        }
    },

    /** 讀取所有設定與資料 */
    loadAll() {
        try {
            return {
                sourceType: localStorage.getItem(KEYS.DATA_SOURCE),
                sourceUrl: localStorage.getItem(KEYS.SOURCE_URL),
                cardData: JSON.parse(localStorage.getItem(KEYS.CARD_DATA)),
                currentIndex: parseInt(localStorage.getItem(KEYS.CURRENT_INDEX) || '0', 10),
                currentCategory: localStorage.getItem(KEYS.CURRENT_CATEGORY) || "全部",
                lastUpdate: localStorage.getItem(KEYS.LAST_UPDATE)
            };
        } catch (e) {
            console.error('讀取快取失敗:', e);
            return null;
        }
    },

    /** 取得最後更新時間的格式化文字 */
    getFormattedLastUpdate() {
        const timestamp = localStorage.getItem(KEYS.LAST_UPDATE);
        return timestamp ? new Date(timestamp).toLocaleString('zh-TW') : '無資料';
    },

    /** 清除所有快取 */
    clear() {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
    }
};
