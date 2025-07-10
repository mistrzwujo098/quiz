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
    // APIClient to już instancja, nie klasa
    const originalGenerateContent = window.APIClient.generateContent;
    window.APIClient.generateContent = async function(prompt, options = {}) {
        console.log('=== APIClient.generateContent called ===');
        console.log('Prompt:', prompt.substring(0, 100) + '...');
        try {
            // Najpierw spróbuj oryginalnej metody
            const result = await originalGenerateContent.call(this, prompt, options);
            console.log('API response format:', typeof result, result);
            return result;
        } catch (error) {
            console.error('Original API call failed:', error);
            
            // Jeśli to Netlify, spróbuj bezpośredniego wywołania
            if (window.location.hostname.includes('netlify')) {
                try {
                    const response = await fetch('/.netlify/functions/gemini-generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            prompt: prompt,
                            temperature: options.temperature || 0.7,
                            maxTokens: options.maxTokens || 2048
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Netlify function error:', errorData);
                        throw new Error(`API Error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Netlify function response:', data);
                    
                    // Zwróć w formacie zgodnym z APIClient
                    if (data.candidates && data.candidates[0]) {
                        const text = data.candidates[0].content.parts[0].text;
                        console.log('Returning formatted response:', { text: text });
                        return { text: text, raw: data };
                    }
                    
                    // Jeśli data ma już właściwość text
                    if (data.text) {
                        console.log('Response already has text property:', data);
                        return data;
                    }
                    
                    throw new Error('No response from API');
                } catch (fallbackError) {
                    console.error('Fallback API call also failed:', fallbackError);
                    throw fallbackError;
                }
            }
            
            throw error;
        }
    };
}

// Globalna instancja GeminiAPI dla kompatybilności
if (!window.GeminiAPI && window.APIClient) {
    window.GeminiAPI = window.APIClient;
}

console.log('✅ Fix dla błędów testowych załadowany');