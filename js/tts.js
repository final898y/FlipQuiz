/**
 * TTS (Text-to-Speech) 核心模組
 * 封裝 Web Speech API，提供簡單的朗讀介面。
 */
export const tts = {
    synth: window.speechSynthesis,
    voices: [],
    
    /**
     * 初始化語音列表
     * 由於語音包是非同步載入，需監聽 voiceschanged 事件
     */
    init() {
        this.voices = this.synth.getVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
    },

    /**
     * 開始朗讀
     * @param {string} text - 要朗讀的文字
     * @param {string} lang - 語言代碼 (預設 en-US)
     * @param {Object} callbacks - 回調函數 { onStart, onEnd }
     * @param {number} rate - 語速 (0.1 - 10, 預設 1.0)
     */
    speak(text, lang = 'en-US', callbacks = {}, rate = 1.0) {
        if (!text) return;
        
        // 停止之前的朗讀，避免重疊
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // 尋找最匹配的語言包
        const voice = this.voices.find(v => v.lang.startsWith(lang)) || 
                      this.voices.find(v => v.lang.includes(lang.split('-')[0]));
        
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (callbacks.onStart) {
            utterance.onstart = callbacks.onStart;
        }

        if (callbacks.onEnd) {
            utterance.onend = callbacks.onEnd;
        }

        utterance.onerror = (event) => {
            console.error('TTS Error:', event);
            if (callbacks.onEnd) callbacks.onEnd();
        };

        this.synth.speak(utterance);
    },

    /**
     * 立即停止朗讀
     */
    stop() {
        if (this.synth.speaking) {
            this.synth.cancel();
        }
    }
};

// 初始化
tts.init();
