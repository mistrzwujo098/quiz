/**
 * Skrypt naprawczy dla błędów w teście API
 * Zapewnia globalne definicje klas przed ich użyciem
 */

// Sprawdź czy klasy są już zdefiniowane
if (typeof StepGradingSystem === 'undefined') {
    // Tymczasowa definicja klasy StepGradingSystem
    window.StepGradingSystem = class StepGradingSystem {
        constructor() {
            this.initialized = false;
            this.gradingPlans = new Map();
        }
        
        async initialize() {
            this.initialized = true;
        }
        
        async initializeGrading(task, studentAnswer) {
            return {
                gradingPlan: {
                    steps: []
                },
                initialAnalysis: {
                    identifiedSteps: [],
                    totalPoints: 0,
                    confidence: 70,
                    feedback: ['Analiza krokowa niedostępna']
                }
            };
        }
    };
}

// Upewnij się, że APIClient używa właściwego endpointu
if (window.APIClient) {
    const originalGenerateContent = window.APIClient.prototype.generateContent;
    window.APIClient.prototype.generateContent = async function(prompt, options = {}) {
        // Przekieruj na bezpośrednie wywołanie jeśli to Netlify
        if (window.location.hostname.includes('netlify')) {
            const response = await fetch('/.netlify/functions/gemini-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    temperature: options.temperature || 0.7,
                    maxTokens: options.maxTokens || 2048,
                    model: 'gemini-2.0-flash-exp' // Wymuszenie modelu Flash
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Zwróć sam tekst odpowiedzi
            if (data.candidates && data.candidates[0]) {
                return data.candidates[0].content.parts[0].text;
            }
            
            throw new Error('No response from API');
        }
        
        // W przeciwnym razie użyj oryginalnej metody
        return originalGenerateContent.call(this, prompt, options);
    };
}

// Globalna instancja GeminiAPI dla kompatybilności
if (!window.GeminiAPI && window.APIClient) {
    window.GeminiAPI = window.APIClient;
}

console.log('✅ Fix dla błędów testowych załadowany');