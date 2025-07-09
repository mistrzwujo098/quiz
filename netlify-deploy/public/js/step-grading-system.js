/**
 * System oceniania krokowego z wykorzystaniem AI
 * Umożliwia punktację częściową zadań otwartych zgodnie z kryteriami CKE
 */

class StepGradingSystem {
    constructor() {
        this.geminiAPI = window.TaskVariantGenerator?.geminiAPI;
        this.currentTask = null;
        this.gradingHistory = [];
    }

    /**
     * Inicjalizacja systemu oceniania dla zadania
     */
    async initializeGrading(task, studentAnswer) {
        this.currentTask = task;
        
        // Analiza zadania i rozbicie na kroki
        const gradingPlan = await this.createGradingPlan(task);
        
        // Wstępna analiza odpowiedzi ucznia
        const initialAnalysis = await this.analyzeStudentAnswer(studentAnswer, gradingPlan);
        
        return {
            task: task,
            gradingPlan: gradingPlan,
            studentAnswer: studentAnswer,
            initialAnalysis: initialAnalysis,
            suggestedScore: initialAnalysis.totalPoints,
            maxScore: task.punkty
        };
    }

    /**
     * Tworzenie planu oceniania na podstawie zadania
     */
    async createGradingPlan(task) {
        // Jeśli zadanie ma już schemat oceniania z CKE
        if (task.schematOceniania) {
            return this.adaptCKEScheme(task.schematOceniania);
        }
        
        // Generowanie schematu przy pomocy AI
        const prompt = `
        Przeanalizuj zadanie egzaminacyjne i utwórz szczegółowy schemat oceniania.
        
        ZADANIE:
        ${task.tresc}
        
        Typ zadania: ${task.typ}
        Maksymalna liczba punktów: ${task.punkty}
        Przedmiot: ${task.przedmiot}
        ${task.kryteriaOceniania ? `Kryteria CKE: ${JSON.stringify(task.kryteriaOceniania)}` : ''}
        
        Utwórz schemat oceniania zawierający:
        1. Listę kroków rozwiązania z punktacją
        2. Alternatywne metody rozwiązania
        3. Typowe błędy i ich konsekwencje punktowe
        4. Wymagania dla pełnej punktacji
        
        Zwróć w formacie JSON:
        {
            "steps": [
                {
                    "id": "step1",
                    "name": "Nazwa kroku",
                    "description": "Szczegółowy opis",
                    "points": 1,
                    "required": true/false,
                    "dependencies": ["id kroków wymaganych wcześniej"],
                    "acceptableForms": ["lista akceptowalnych form odpowiedzi"],
                    "commonErrors": [
                        {
                            "description": "opis błędu",
                            "penalty": -0.5,
                            "fatal": false
                        }
                    ]
                }
            ],
            "alternativePaths": [
                {
                    "name": "Alternatywna metoda",
                    "steps": ["step1_alt", "step2_alt"]
                }
            ],
            "globalCriteria": {
                "requiresUnits": true/false,
                "requiresJustification": true/false,
                "precisionRequired": "liczba miejsc po przecinku",
                "formattingRules": ["lista zasad formatowania"]
            }
        }
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const plan = JSON.parse(response);
            
            // Walidacja i uzupełnienie planu
            return this.validateGradingPlan(plan, task);
        } catch (error) {
            console.error('Błąd generowania planu:', error);
            return this.createFallbackPlan(task);
        }
    }

    /**
     * Analiza odpowiedzi ucznia
     */
    async analyzeStudentAnswer(answer, gradingPlan) {
        const analysis = {
            identifiedSteps: [],
            missingSteps: [],
            errors: [],
            totalPoints: 0,
            feedback: [],
            confidence: 0
        };
        
        // Analiza każdego kroku
        for (const step of gradingPlan.steps) {
            const stepAnalysis = await this.analyzeStep(answer, step, analysis.identifiedSteps);
            
            if (stepAnalysis.found) {
                analysis.identifiedSteps.push({
                    ...stepAnalysis,
                    step: step
                });
                analysis.totalPoints += stepAnalysis.pointsAwarded;
            } else if (step.required) {
                analysis.missingSteps.push(step);
            }
        }
        
        // Sprawdzenie błędów globalnych
        const globalErrors = await this.checkGlobalCriteria(answer, gradingPlan.globalCriteria);
        analysis.errors.push(...globalErrors);
        
        // Obliczenie końcowej punktacji
        analysis.totalPoints = this.calculateFinalScore(analysis, gradingPlan);
        
        // Generowanie feedbacku
        analysis.feedback = await this.generateFeedback(analysis, gradingPlan);
        
        // Obliczenie pewności oceny
        analysis.confidence = this.calculateConfidence(analysis);
        
        return analysis;
    }

    /**
     * Analiza pojedynczego kroku
     */
    async analyzeStep(answer, step, previousSteps) {
        const prompt = `
        Sprawdź czy odpowiedź ucznia zawiera wykonanie tego kroku rozwiązania.
        
        KROK: ${step.name}
        OPIS: ${step.description}
        AKCEPTOWALNE FORMY: ${JSON.stringify(step.acceptableForms)}
        
        ODPOWIEDŹ UCZNIA:
        ${answer}
        
        ${previousSteps.length > 0 ? `WCZEŚNIEJ ZIDENTYFIKOWANE KROKI: ${previousSteps.map(s => s.step.name).join(', ')}` : ''}
        
        Oceń czy krok został wykonany i jak. Zwróć JSON:
        {
            "found": true/false,
            "quality": "perfect/good/partial/poor",
            "location": "gdzie w odpowiedzi znajduje się ten krok",
            "content": "treść wykonania kroku przez ucznia",
            "errors": ["lista błędów w tym kroku"],
            "pointsAwarded": liczba (0-${step.points}),
            "justification": "uzasadnienie przyznanej punktacji"
        }
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            return JSON.parse(response);
        } catch (error) {
            console.error('Błąd analizy kroku:', error);
            return {
                found: false,
                quality: 'unknown',
                pointsAwarded: 0,
                errors: ['Błąd analizy']
            };
        }
    }

    /**
     * Sprawdzenie kryteriów globalnych
     */
    async checkGlobalCriteria(answer, criteria) {
        const errors = [];
        
        if (criteria.requiresUnits) {
            const hasUnits = await this.checkForUnits(answer);
            if (!hasUnits) {
                errors.push({
                    type: 'missing_units',
                    description: 'Brak jednostek w odpowiedzi końcowej',
                    penalty: -0.5,
                    fatal: false
                });
            }
        }
        
        if (criteria.requiresJustification) {
            const hasJustification = await this.checkForJustification(answer);
            if (!hasJustification) {
                errors.push({
                    type: 'missing_justification',
                    description: 'Brak uzasadnienia rozwiązania',
                    penalty: -1,
                    fatal: false
                });
            }
        }
        
        if (criteria.precisionRequired) {
            const precisionErrors = await this.checkPrecision(answer, criteria.precisionRequired);
            errors.push(...precisionErrors);
        }
        
        return errors;
    }

    /**
     * Interfejs graficzny oceniania krokowego
     */
    renderGradingInterface(gradingData) {
        const { task, gradingPlan, studentAnswer, initialAnalysis } = gradingData;
        
        return `
            <div class="step-grading-container">
                <div class="task-info">
                    <h3>Zadanie ${task.numer || task.id}</h3>
                    <div class="task-content">${task.tresc}</div>
                    ${task.obrazki ? `<div class="task-images">${this.renderImages(task.obrazki)}</div>` : ''}
                    <div class="max-points">Maksymalna liczba punktów: ${task.punkty}</div>
                </div>
                
                <div class="student-answer-section">
                    <h4>Odpowiedź ucznia:</h4>
                    <div class="student-answer">${studentAnswer}</div>
                </div>
                
                <div class="grading-section">
                    <h4>Ocena krokowa:</h4>
                    <div class="grading-steps">
                        ${gradingPlan.steps.map((step, index) => this.renderGradingStep(
                            step, 
                            initialAnalysis.identifiedSteps.find(s => s.step.id === step.id),
                            index
                        )).join('')}
                    </div>
                    
                    <div class="global-criteria">
                        <h5>Kryteria ogólne:</h5>
                        ${this.renderGlobalCriteria(gradingPlan.globalCriteria, initialAnalysis.errors)}
                    </div>
                    
                    <div class="alternative-methods">
                        ${gradingPlan.alternativePaths.length > 0 ? `
                            <h5>Alternatywne metody rozwiązania:</h5>
                            ${this.renderAlternativePaths(gradingPlan.alternativePaths)}
                        ` : ''}
                    </div>
                </div>
                
                <div class="grading-summary">
                    <div class="ai-analysis">
                        <h4>Analiza AI:</h4>
                        <div class="confidence">Pewność oceny: ${Math.round(initialAnalysis.confidence)}%</div>
                        <div class="suggested-score">
                            Sugerowana punktacja: 
                            <span class="score">${initialAnalysis.totalPoints} / ${task.punkty}</span>
                        </div>
                        <div class="feedback">
                            <h5>Feedback:</h5>
                            <ul>
                                ${initialAnalysis.feedback.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    
                    <div class="manual-override">
                        <h4>Korekta ręczna:</h4>
                        <div class="final-score-input">
                            <label>Ostateczna punktacja:</label>
                            <input type="number" 
                                   id="final-score" 
                                   min="0" 
                                   max="${task.punkty}" 
                                   step="0.5" 
                                   value="${initialAnalysis.totalPoints}">
                            <span>/ ${task.punkty} pkt</span>
                        </div>
                        <textarea id="teacher-comment" 
                                  placeholder="Dodatkowy komentarz nauczyciela..."
                                  rows="3"></textarea>
                    </div>
                    
                    <div class="grading-actions">
                        <button onclick="StepGradingSystem.saveGrading()" class="btn-primary">
                            💾 Zapisz ocenę
                        </button>
                        <button onclick="StepGradingSystem.requestAIReview()" class="btn-secondary">
                            🤖 Ponowna analiza AI
                        </button>
                        <button onclick="StepGradingSystem.compareWithModelAnswer()" class="btn-secondary">
                            📊 Porównaj z wzorem
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderowanie pojedynczego kroku oceniania
     */
    renderGradingStep(step, analysis, index) {
        const isIdentified = analysis && analysis.found;
        const quality = analysis?.quality || 'not_found';
        const points = analysis?.pointsAwarded || 0;
        
        return `
            <div class="grading-step ${isIdentified ? 'identified' : 'missing'}" data-step-id="${step.id}">
                <div class="step-header">
                    <input type="checkbox" 
                           id="step-${index}" 
                           ${isIdentified ? 'checked' : ''}
                           onchange="StepGradingSystem.toggleStep('${step.id}', this.checked)">
                    <label for="step-${index}">
                        <span class="step-name">${step.name}</span>
                        <span class="step-points">(${step.points} pkt)</span>
                    </label>
                </div>
                
                <div class="step-details">
                    <div class="step-description">${step.description}</div>
                    
                    ${isIdentified ? `
                        <div class="step-analysis">
                            <div class="quality-indicator quality-${quality}">
                                Jakość: ${this.translateQuality(quality)}
                            </div>
                            <div class="step-location">📍 ${analysis.location}</div>
                            <div class="step-content">
                                <em>"${analysis.content}"</em>
                            </div>
                            ${analysis.errors.length > 0 ? `
                                <div class="step-errors">
                                    ⚠️ Błędy: ${analysis.errors.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="step-missing">
                            ❌ Krok nie został zidentyfikowany w odpowiedzi
                        </div>
                    `}
                    
                    <div class="step-scoring">
                        <label>Punkty:</label>
                        <input type="number" 
                               min="0" 
                               max="${step.points}" 
                               step="0.5" 
                               value="${points}"
                               onchange="StepGradingSystem.updateStepScore('${step.id}', this.value)">
                        <span>/ ${step.points}</span>
                    </div>
                    
                    ${step.acceptableForms.length > 0 ? `
                        <div class="acceptable-forms">
                            <details>
                                <summary>Akceptowalne formy</summary>
                                <ul>
                                    ${step.acceptableForms.map(form => `<li>${form}</li>`).join('')}
                                </ul>
                            </details>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Renderowanie kryteriów globalnych
     */
    renderGlobalCriteria(criteria, errors) {
        return `
            <div class="global-criteria-list">
                ${criteria.requiresUnits ? `
                    <div class="criterion ${errors.find(e => e.type === 'missing_units') ? 'error' : 'ok'}">
                        <input type="checkbox" 
                               id="units-check" 
                               ${!errors.find(e => e.type === 'missing_units') ? 'checked' : ''}>
                        <label for="units-check">Jednostki w odpowiedzi</label>
                    </div>
                ` : ''}
                
                ${criteria.requiresJustification ? `
                    <div class="criterion ${errors.find(e => e.type === 'missing_justification') ? 'error' : 'ok'}">
                        <input type="checkbox" 
                               id="justification-check" 
                               ${!errors.find(e => e.type === 'missing_justification') ? 'checked' : ''}>
                        <label for="justification-check">Uzasadnienie rozwiązania</label>
                    </div>
                ` : ''}
                
                ${criteria.precisionRequired ? `
                    <div class="criterion">
                        <label>Dokładność obliczeń: ${criteria.precisionRequired} miejsc po przecinku</label>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Generowanie feedbacku dla ucznia
     */
    async generateFeedback(analysis, gradingPlan) {
        const feedback = [];
        
        // Feedback za wykonane kroki
        for (const step of analysis.identifiedSteps) {
            if (step.quality === 'perfect') {
                feedback.push(`✅ Doskonale wykonany ${step.step.name}`);
            } else if (step.quality === 'good') {
                feedback.push(`👍 Dobrze wykonany ${step.step.name}`);
            } else if (step.quality === 'partial') {
                feedback.push(`⚠️ Częściowo wykonany ${step.step.name}: ${step.errors.join(', ')}`);
            }
        }
        
        // Feedback za brakujące kroki
        for (const step of analysis.missingSteps) {
            feedback.push(`❌ Brak: ${step.name} (-${step.points} pkt)`);
        }
        
        // Feedback za błędy globalne
        for (const error of analysis.errors) {
            feedback.push(`⚠️ ${error.description} (${error.penalty} pkt)`);
        }
        
        // Dodatkowe wskazówki AI
        if (this.geminiAPI && analysis.totalPoints < gradingPlan.maxPoints * 0.8) {
            const tips = await this.generateImprovementTips(analysis, gradingPlan);
            feedback.push(...tips);
        }
        
        return feedback;
    }

    /**
     * Generowanie wskazówek do poprawy
     */
    async generateImprovementTips(analysis, gradingPlan) {
        const prompt = `
        Na podstawie analizy odpowiedzi ucznia, wygeneruj 2-3 konkretne wskazówki, 
        jak poprawić rozwiązanie.
        
        Brakujące kroki: ${analysis.missingSteps.map(s => s.name).join(', ')}
        Błędy: ${analysis.errors.map(e => e.description).join(', ')}
        
        Wskazówki powinny być konstruktywne i pomocne.
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            return response.split('\n').filter(tip => tip.trim().length > 0);
        } catch (error) {
            return ['💡 Przeanalizuj ponownie treść zadania', '💡 Sprawdź obliczenia'];
        }
    }

    /**
     * Porównanie z modelową odpowiedzią
     */
    async compareWithModelAnswer(studentAnswer, modelAnswer) {
        const prompt = `
        Porównaj odpowiedź ucznia z modelową odpowiedzią.
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        ODPOWIEDŹ MODELOWA:
        ${modelAnswer}
        
        Wskaż:
        1. Główne różnice
        2. Brakujące elementy
        3. Elementy dodatkowe (jeśli poprawne)
        4. Alternatywne podejścia ucznia
        
        Zwróć analizę w formacie JSON.
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            return JSON.parse(response);
        } catch (error) {
            console.error('Błąd porównania:', error);
            return null;
        }
    }

    /**
     * Zapisywanie oceny
     */
    saveGrading(taskId, studentId, grading) {
        const record = {
            taskId,
            studentId,
            timestamp: new Date().toISOString(),
            automaticScore: grading.initialAnalysis.totalPoints,
            manualScore: parseFloat(document.getElementById('final-score')?.value || grading.initialAnalysis.totalPoints),
            teacherComment: document.getElementById('teacher-comment')?.value || '',
            gradingDetails: grading,
            confidence: grading.initialAnalysis.confidence
        };
        
        // Zapisz w localStorage
        const history = JSON.parse(localStorage.getItem('gradingHistory') || '[]');
        history.push(record);
        localStorage.setItem('gradingHistory', JSON.stringify(history));
        
        // Event dla integracji z systemem
        window.dispatchEvent(new CustomEvent('gradingSaved', { detail: record }));
        
        return record;
    }

    /**
     * Statyczne metody dla interfejsu
     */
    static instance = null;
    
    static getInstance() {
        if (!StepGradingSystem.instance) {
            StepGradingSystem.instance = new StepGradingSystem();
        }
        return StepGradingSystem.instance;
    }
    
    static async saveGrading() {
        const instance = StepGradingSystem.getInstance();
        const grading = instance.currentGrading;
        if (grading) {
            instance.saveGrading(grading.task.id, 'current-student', grading);
            alert('Ocena została zapisana!');
        }
    }
    
    static async requestAIReview() {
        const instance = StepGradingSystem.getInstance();
        alert('Ponowna analiza AI w toku...');
        // Implementacja ponownej analizy
    }
    
    static async compareWithModelAnswer() {
        const instance = StepGradingSystem.getInstance();
        // Implementacja porównania
        alert('Funkcja porównania z modelem w przygotowaniu');
    }
    
    static toggleStep(stepId, checked) {
        // Implementacja przełączania kroków
        console.log(`Krok ${stepId}: ${checked ? 'zaznaczony' : 'odznaczony'}`);
    }
    
    static updateStepScore(stepId, score) {
        // Implementacja aktualizacji punktów
        console.log(`Krok ${stepId}: ${score} punktów`);
    }

    /**
     * Pomocnicze funkcje
     */
    translateQuality(quality) {
        const translations = {
            'perfect': 'Doskonała',
            'good': 'Dobra',
            'partial': 'Częściowa',
            'poor': 'Słaba',
            'not_found': 'Nie znaleziono'
        };
        return translations[quality] || quality;
    }

    calculateConfidence(analysis) {
        let confidence = 100;
        
        // Obniż pewność za każdy niepewny element
        analysis.identifiedSteps.forEach(step => {
            if (step.quality === 'partial') confidence -= 10;
            if (step.quality === 'poor') confidence -= 20;
        });
        
        // Obniż za brakujące wymagane kroki
        confidence -= analysis.missingSteps.filter(s => s.required).length * 15;
        
        return Math.max(0, Math.min(100, confidence));
    }

    /**
     * Adaptacja schematu CKE
     */
    adaptCKEScheme(ckeScheme) {
        const adapted = {
            steps: [],
            alternativePaths: [],
            globalCriteria: {
                requiresUnits: false,
                requiresJustification: false,
                precisionRequired: null
            },
            maxPoints: ckeScheme.maxPoints
        };
        
        // Konwersja kroków
        if (ckeScheme.steps) {
            adapted.steps = ckeScheme.steps.map((step, index) => ({
                id: `step_${index + 1}`,
                name: step.description.substring(0, 50),
                description: step.description,
                points: step.points,
                required: step.required || false,
                dependencies: [],
                acceptableForms: step.alternatives || [],
                commonErrors: []
            }));
        }
        
        return adapted;
    }

    /**
     * Fallback plan dla prostych zadań
     */
    createFallbackPlan(task) {
        const pointsPerStep = task.punkty <= 3 ? 1 : Math.ceil(task.punkty / 3);
        
        return {
            steps: Array.from({ length: Math.ceil(task.punkty / pointsPerStep) }, (_, i) => ({
                id: `step_${i + 1}`,
                name: `Krok ${i + 1}`,
                description: `Część ${i + 1} rozwiązania`,
                points: Math.min(pointsPerStep, task.punkty - (i * pointsPerStep)),
                required: i === 0,
                dependencies: i > 0 ? [`step_${i}`] : [],
                acceptableForms: [],
                commonErrors: []
            })),
            alternativePaths: [],
            globalCriteria: {
                requiresUnits: task.przedmiot.includes('fizyka') || task.przedmiot.includes('chemia'),
                requiresJustification: task.typ === 'otwarte' && task.punkty > 2,
                precisionRequired: task.przedmiot.includes('matematyka') ? 2 : null
            },
            maxPoints: task.punkty
        };
    }

    /**
     * Sprawdzanie jednostek
     */
    async checkForUnits(answer) {
        const unitPatterns = [
            /\d+\s*(m|cm|mm|km|kg|g|mg|s|min|h|°C|K|J|W|N|Pa|V|A|Ω)(\b|²|³)/,
            /\d+\s*(metr|centymetr|kilogram|gram|sekund|minut|godzin)/i
        ];
        
        return unitPatterns.some(pattern => pattern.test(answer));
    }

    /**
     * Sprawdzanie uzasadnienia
     */
    async checkForJustification(answer) {
        const justificationIndicators = [
            'ponieważ', 'dlatego', 'gdyż', 'bo', 'wynika to z',
            'na podstawie', 'zgodnie z', 'według', 'zatem', 'więc'
        ];
        
        const lowerAnswer = answer.toLowerCase();
        return justificationIndicators.some(indicator => lowerAnswer.includes(indicator));
    }

    /**
     * Sprawdzanie dokładności
     */
    async checkPrecision(answer, requiredPrecision) {
        const errors = [];
        const numberPattern = /\d+([.,]\d+)?/g;
        const matches = answer.match(numberPattern);
        
        if (matches) {
            matches.forEach(match => {
                const decimalPart = match.split(/[.,]/)[1];
                if (decimalPart && decimalPart.length < requiredPrecision) {
                    errors.push({
                        type: 'insufficient_precision',
                        description: `Liczba ${match} ma za małą dokładność (wymagane: ${requiredPrecision} miejsc)`,
                        penalty: -0.5,
                        fatal: false
                    });
                }
            });
        }
        
        return errors;
    }

    /**
     * Renderowanie obrazków
     */
    renderImages(images) {
        return images.map((img, index) => `
            <div class="task-image">
                <img src="${img.base64}" alt="${img.description || `Obrazek ${index + 1}`}">
                ${img.description ? `<p class="image-caption">${img.description}</p>` : ''}
            </div>
        `).join('');
    }

    /**
     * Renderowanie alternatywnych ścieżek
     */
    renderAlternativePaths(paths) {
        return `
            <div class="alternative-paths">
                ${paths.map(path => `
                    <div class="alt-path">
                        <strong>${path.name}:</strong>
                        ${path.steps.join(' → ')}
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Eksport jako globalna klasa
window.StepGradingSystem = StepGradingSystem;