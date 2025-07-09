/**
 * Mock API Gemini dla testowania importu CKE
 */
class GeminiAPIMock {
    constructor() {
        console.log('Inicjalizacja Mock API Gemini');
    }

    async generateContent(prompt) {
        console.log('Mock generateContent wywołane z promptem:', prompt.substring(0, 100) + '...');
        
        // Zwróć przykładową odpowiedź
        return JSON.stringify({
            subject: "matematyka",
            examType: "egzamin ósmoklasisty",
            year: "2024",
            tasks: [
                {
                    number: "1",
                    type: "zamkniete",
                    content: "Oblicz wartość wyrażenia 2 + 2 × 2",
                    options: ["A. 6", "B. 8", "C. 4", "D. 10"],
                    correctAnswer: "A",
                    points: 1,
                    hasImage: false,
                    hasFormula: false,
                    topic: "arytmetyka",
                    difficulty: "łatwe"
                },
                {
                    number: "2",
                    type: "otwarte",
                    content: "Rozwiąż równanie: 3x + 5 = 20",
                    options: null,
                    correctAnswer: "x = 5",
                    points: 2,
                    scoringCriteria: {
                        "1pkt": "Za prawidłowe przekształcenie równania",
                        "2pkt": "Za kompletne rozwiązanie z odpowiedzią x = 5"
                    },
                    hasImage: false,
                    hasFormula: true,
                    formulas: ["3x + 5 = 20"],
                    topic: "algebra",
                    difficulty: "średnie"
                }
            ]
        });
    }

    async analyzeImage(base64, prompt) {
        console.log('Mock analyzeImage wywołane');
        return JSON.stringify([]);
    }
}

// Ustaw globalnie
window.GeminiAPIMock = GeminiAPIMock;