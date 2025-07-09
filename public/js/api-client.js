/**
 * Uniwersalny klient API dla QuizMaster
 * Działa zarówno z PHP proxy jak i Node.js server
 */

class APIClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiPath = null;
        this.initialized = false;
    }

    /**
     * Automatycznie wykrywa dostępny endpoint
     */
    async initialize() {
        if (this.initialized) return;

        // Sprawdź różne możliwe ścieżki
        const endpoints = [
            '/.netlify/functions/health',
            '/api/health',
            '/api-proxy.php/health',
            '/server/api/health'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(this.baseUrl + endpoint);
                if (response.ok) {
                    const data = await response.json();
                    // Sprawdź czy API jest skonfigurowane
                    if (data.api_configured || data.apiConfigured) {
                        if (endpoint.includes('netlify')) {
                            this.apiPath = '/.netlify/functions';
                        } else if (endpoint.includes('api-proxy.php')) {
                            this.apiPath = '/api-proxy.php';
                        } else {
                            this.apiPath = '/api';
                        }
                        this.initialized = true;
                        console.log('API Client initialized with:', this.apiPath);
                        return;
                    }
                }
            } catch (e) {
                // Kontynuuj próbowanie
            }
        }

        // Fallback - użyj domyślnego
        this.apiPath = '/api-proxy.php';
        this.initialized = true;
        console.warn('API Client using fallback path:', this.apiPath);
    }

    /**
     * Wywołuje Gemini API
     */
    async generateContent(prompt, options = {}) {
        await this.initialize();

        const endpoint = this.apiPath === '/.netlify/functions' ?
            `${this.baseUrl}/.netlify/functions/gemini-generate` :
            `${this.baseUrl}${this.apiPath}/gemini/generate`;
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    temperature: options.temperature || 0.7,
                    maxTokens: options.maxTokens || 2048,
                    topK: options.topK || 40,
                    topP: options.topP || 0.95,
                    safetySettings: options.safetySettings || [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_NONE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Normalizuj odpowiedź (PHP i Node mogą zwracać różne formaty)
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return {
                    text: data.candidates[0].content.parts[0].text,
                    raw: data
                };
            } else if (data.text) {
                return {
                    text: data.text,
                    raw: data
                };
            } else {
                throw new Error('Unexpected response format');
            }

        } catch (error) {
            console.error('API call failed:', error);
            
            // Jeśli błąd CORS lub połączenia, spróbuj innego endpointa
            if (!error.message.includes('CORS') && this.apiPath === '/api-proxy.php') {
                this.apiPath = '/api';
                this.initialized = false;
                return this.generateContent(prompt, options);
            }
            
            throw error;
        }
    }

    /**
     * Sprawdza status API
     */
    async checkHealth() {
        await this.initialize();
        
        const endpoint = this.apiPath === '/.netlify/functions' ?
            `${this.baseUrl}/.netlify/functions/health` :
            `${this.baseUrl}${this.apiPath}/health`;
        
        try {
            const response = await fetch(endpoint);
            return await response.json();
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

// Eksportuj globalną instancję
window.APIClient = new APIClient();