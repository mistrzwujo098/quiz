/**
 * Wrapper dla Gemini API - używa uniwersalnego APIClient
 */
class GeminiAPIWrapper {
    constructor() {
        this.client = window.APIClient;
    }

    async generateContent(prompt, options = {}) {
        try {
            const result = await this.client.generateContent(prompt, options);
            return result;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    async checkHealth() {
        return await this.client.checkHealth();
    }
}

// Globalna instancja dla kompatybilności wstecznej
window.GeminiAPI = new GeminiAPIWrapper();