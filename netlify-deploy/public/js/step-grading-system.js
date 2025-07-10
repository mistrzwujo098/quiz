/**
 * System oceniania krokowego z wykorzystaniem AI
 * Umożliwia punktację częściową zadań otwartych zgodnie z kryteriami CKE
 */

class StepGradingSystem {
    constructor() {
        this.geminiAPI = null; // Będzie inicjalizowane później
        this.currentTask = null;
        this.gradingHistory = [];
        
        // Próba inicjalizacji API przy tworzeniu
        if (window.GeminiAPI) {
            this.geminiAPI = window.GeminiAPI;
        } else if (window.APIClient) {
            this.geminiAPI = window.APIClient;
            // Inicjalizacja APIClient jeśli potrzebna
            if (this.geminiAPI.initialize && !this.geminiAPI.initialized) {
                this.geminiAPI.initialize().catch(console.error);
            }
        }
    }

    /**
     * Inicjalizacja systemu oceniania dla zadania
     */
    async initializeGrading(task, studentAnswer) {
        this.currentTask = task;
        
        // Analiza zadania i rozbicie na kroki
        const gradingPlan = await this.createGradingPlan(task);
        
        // Analiza odpowiedzi ucznia
        const initialAnalysis = await this.analyzeStudentAnswer(studentAnswer, gradingPlan);
        
        return {
            task,
            gradingPlan,
            studentAnswer,
            initialAnalysis
        };
    }

    /**
     * Tworzenie planu oceniania na podstawie zadania
     */
    async createGradingPlan(task) {
        // Sprawdź czy mamy schemat CKE
        if (task.schematOceniania || task.kryteriaOceniania) {
            return this.adaptCKEScheme(task.schematOceniania || task.kryteriaOceniania);
        }
        
        // Jeśli nie ma schematu, użyj AI do analizy
        if (this.geminiAPI) {
            const prompt = `
            Przeanalizuj to zadanie egzaminacyjne i stwórz schemat oceniania krokowego.
            
            Zadanie: ${task.tresc}
            Typ: ${task.typ}
            Punkty: ${task.punkty}
            Przedmiot: ${task.przedmiot}
            
            Stwórz schemat oceniania w formacie JSON zawierający:
            {
                "steps": [
                    {
                        "id": "step_1",
                        "name": "nazwa kroku",
                        "description": "opis co powinno być wykonane",
                        "points": liczba_punktów,
                        "required": true/false,
                        "dependencies": ["id_poprzedniego_kroku"],
                        "acceptableForms": ["alternatywne formy zapisu"],
                        "commonErrors": ["typowe błędy"]
                    }
                ],
                "alternativePaths": [
                    {
                        "name": "nazwa alternatywnej metody",
                        "steps": ["step_ids"]
                    }
                ],
                "globalCriteria": {
                    "requiresUnits": true/false,
                    "requiresJustification": true/false,
                    "precisionRequired": liczba_miejsc_po_przecinku
                },
                "maxPoints": ${task.punkty}
            }
            `;
            
            try {
                const response = await this.geminiAPI.generateContent(prompt);
                // APIClient zwraca obiekt z właściwością text
                const responseText = typeof response === 'string' ? response : response.text;
                return JSON.parse(responseText);
            } catch (error) {
                console.error('Błąd generowania planu:', error);
                return this.createFallbackPlan(task);
            }
        }
        
        return this.createFallbackPlan(task);
    }

    /**
     * Analiza odpowiedzi ucznia według planu
     */
    async analyzeStudentAnswer(answer, gradingPlan) {
        const analysis = {
            identifiedSteps: [],
            missingSteps: [],
            errors: [],
            totalPoints: 0,
            confidence: 0,
            feedback: []
        };
        
        // Analiza każdego kroku
        for (const step of gradingPlan.steps) {
            const stepAnalysis = await this.analyzeStep(answer, step, analysis.identifiedSteps);
            
            if (stepAnalysis.found) {
                analysis.identifiedSteps.push({
                    step: step,
                    ...stepAnalysis
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
            // APIClient zwraca obiekt z właściwością text
            const responseText = typeof response === 'string' ? response : response.text;
            return JSON.parse(responseText);
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
     * Obliczanie końcowej punktacji
     */
    calculateFinalScore(analysis, gradingPlan) {
        let score = analysis.totalPoints;
        
        // Aplikuj kary za błędy globalne
        analysis.errors.forEach(error => {
            if (!error.fatal) {
                score += error.penalty || 0;
            }
        });
        
        // Upewnij się, że wynik jest w zakresie 0 do max
        return Math.max(0, Math.min(gradingPlan.maxPoints, score));
    }

    /**
     * Generowanie feedbacku
     */
    async generateFeedback(analysis, gradingPlan) {
        const feedback = [];
        
        // Feedback za zidentyfikowane kroki
        analysis.identifiedSteps.forEach(step => {
            if (step.quality === 'perfect') {
                feedback.push(`✅ ${step.step.name} - wykonane doskonale (${step.pointsAwarded}/${step.step.points} pkt)`);
            } else if (step.quality === 'good') {
                feedback.push(`✓ ${step.step.name} - wykonane dobrze (${step.pointsAwarded}/${step.step.points} pkt)`);
            } else if (step.quality === 'partial') {
                feedback.push(`⚠️ ${step.step.name} - wykonane częściowo (${step.pointsAwarded}/${step.step.points} pkt)`);
            }
        });
        
        // Feedback za brakujące kroki
        analysis.missingSteps.forEach(step => {
            if (step.required) {
                feedback.push(`❌ Brak: ${step.name} (0/${step.points} pkt)`);
            }
        });
        
        // Feedback za błędy globalne
        analysis.errors.forEach(error => {
            feedback.push(`⚠️ ${error.description} (${error.penalty} pkt)`);
        });
        
        return feedback;
    }

    /**
     * Obliczanie pewności oceny
     */
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
     * Sprawdzanie obecności jednostek
     */
    async checkForUnits(answer) {
        const unitPatterns = [
            /\d+\s*(?:m|cm|mm|km|kg|g|mg|s|min|h|°C|K|J|W|N|Pa|V|A|Ω)(?:\b|²|³)/,
            /\d+\s*(?:metr|centymetr|kilogram|gram|sekund|minut|godzin)/i
        ];
        
        return unitPatterns.some(pattern => pattern.test(answer));
    }

    /**
     * Sprawdzanie obecności uzasadnienia
     */
    async checkForJustification(answer) {
        const justificationIndicators = [
            'ponieważ', 'dlatego', 'gdyż', 'z powodu',
            'wynika to z', 'świadczy o tym', 'dowodzi',
            'zatem', 'więc', 'stąd'
        ];
        
        return justificationIndicators.some(indicator => 
            answer.toLowerCase().includes(indicator)
        );
    }

    /**
     * Sprawdzanie precyzji obliczeń
     */
    async checkPrecision(answer, requiredPrecision) {
        const errors = [];
        const numberPattern = /\d+\.?\d*/g;
        const numbers = answer.match(numberPattern) || [];
        
        numbers.forEach(num => {
            const decimalPlaces = (num.split('.')[1] || '').length;
            if (decimalPlaces < requiredPrecision) {
                errors.push({
                    type: 'insufficient_precision',
                    description: `Liczba ${num} powinna mieć ${requiredPrecision} miejsc po przecinku`,
                    penalty: -0.5,
                    fatal: false
                });
            }
        });
        
        return errors;
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
            maxPoints: ckeScheme.maxPoints || this.currentTask.punkty
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
     * Otwiera interfejs oceniania krokowego
     */
    openStepGrading() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-dark p-8 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-tasks text-blue-400 mr-2"></i>
                        Ocenianie krokowe
                    </h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="grid gap-6">
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-clipboard-check text-green-400 mr-2"></i>
                            Wybierz zadanie do oceny
                        </h3>
                        <p class="text-gray-400 mb-4">
                            System automatycznie rozłoży zadanie na kroki i przydzieli punktację częściową
                        </p>
                        <div id="task-selector" class="space-y-2">
                            <p class="text-sm text-gray-500">Ładowanie zadań...</p>
                        </div>
                    </div>
                    
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-history text-yellow-400 mr-2"></i>
                            Historia oceniania
                        </h3>
                        <div id="grading-history" class="space-y-2">
                            <p class="text-sm text-gray-500">Brak wcześniejszych ocen</p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-blue-600/20 rounded-lg">
                    <p class="text-sm text-gray-300">
                        <i class="fas fa-info-circle mr-2"></i>
                        Ocenianie krokowe pozwala na przyznawanie punktów częściowych za każdy etap rozwiązania,
                        zgodnie ze schematami oceniania CKE.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Załaduj dostępne zadania
        this.loadTasksForGrading();
        
        return true;
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
            <div class="grading-step ${isIdentified ? 'identified' : 'missing'}">
                <div class="step-header">
                    <input type="checkbox" 
                           id="step_${step.id}" 
                           ${isIdentified ? 'checked' : ''}
                           onchange="StepGradingSystem.toggleStep('${step.id}', this.checked)">
                    <label for="step_${step.id}">
                        <span class="step-number">${index + 1}.</span>
                        <span class="step-name">${step.name}</span>
                        <span class="step-points">${points} / ${step.points} pkt</span>
                    </label>
                </div>
                
                <div class="step-details">
                    <p class="step-description">${step.description}</p>
                    
                    ${isIdentified ? `
                        <div class="step-analysis">
                            <p><strong>Jakość wykonania:</strong> ${this.translateQuality(quality)}</p>
                            <p><strong>Lokalizacja:</strong> ${analysis.location}</p>
                            <p><strong>Treść:</strong> <em>${analysis.content}</em></p>
                            ${analysis.errors.length > 0 ? `
                                <p><strong>Błędy:</strong></p>
                                <ul class="errors-list">
                                    ${analysis.errors.map(e => `<li>${e}</li>`).join('')}
                                </ul>
                            ` : ''}
                            <p><strong>Uzasadnienie punktacji:</strong> ${analysis.justification}</p>
                        </div>
                        
                        <div class="manual-score-adjustment">
                            <label>Korekta punktów:</label>
                            <input type="number" 
                                   min="0" 
                                   max="${step.points}" 
                                   step="0.5" 
                                   value="${points}"
                                   onchange="StepGradingSystem.updateStepScore('${step.id}', this.value)">
                        </div>
                    ` : `
                        <p class="step-not-found">Krok nie został zidentyfikowany w odpowiedzi ucznia</p>
                    `}
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
                    <div class="criterion ${errors.some(e => e.type === 'missing_units') ? 'error' : 'ok'}">
                        <i class="fas ${errors.some(e => e.type === 'missing_units') ? 'fa-times' : 'fa-check'}"></i>
                        Jednostki w odpowiedzi
                    </div>
                ` : ''}
                
                ${criteria.requiresJustification ? `
                    <div class="criterion ${errors.some(e => e.type === 'missing_justification') ? 'error' : 'ok'}">
                        <i class="fas ${errors.some(e => e.type === 'missing_justification') ? 'fa-times' : 'fa-check'}"></i>
                        Uzasadnienie rozwiązania
                    </div>
                ` : ''}
                
                ${criteria.precisionRequired ? `
                    <div class="criterion ${errors.some(e => e.type === 'insufficient_precision') ? 'error' : 'ok'}">
                        <i class="fas ${errors.some(e => e.type === 'insufficient_precision') ? 'fa-times' : 'fa-check'}"></i>
                        Dokładność do ${criteria.precisionRequired} miejsc po przecinku
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Pomocnicze funkcje UI
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

    renderImages(images) {
        return images.map((img, index) => `
            <div class="task-image">
                <img src="${img.base64}" alt="${img.description || `Obrazek ${index + 1}`}">
                ${img.description ? `<p class="image-caption">${img.description}</p>` : ''}
            </div>
        `).join('');
    }

    /**
     * Metody statyczne dla UI
     */
    static toggleStep(stepId, checked) {
        console.log(`Krok ${stepId}: ${checked ? 'zaznaczony' : 'odznaczony'}`);
    }
    
    static updateStepScore(stepId, score) {
        console.log(`Krok ${stepId}: ${score} punktów`);
    }

    /**
     * Ładowanie zadań do oceny
     */
    async loadTasksForGrading() {
        const taskSelector = document.getElementById('task-selector');
        if (!taskSelector) return;
        
        // Pobierz zadania z bazy
        const tasks = window.QuizMaster?.currentQuiz?.pytania || [];
        const openTasks = tasks.filter(t => t.typ === 'otwarte');
        
        if (openTasks.length === 0) {
            taskSelector.innerHTML = '<p class="text-sm text-gray-500">Brak zadań otwartych do oceny</p>';
            return;
        }
        
        taskSelector.innerHTML = openTasks.map(task => `
            <div class="task-item p-3 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer" 
                 onclick="window.stepGrading.selectTaskForGrading(${task.id})">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold">Zadanie ${task.numer || task.id}</h4>
                        <p class="text-sm text-gray-400 mt-1">${task.tresc.substring(0, 100)}...</p>
                    </div>
                    <div class="text-right ml-4">
                        <span class="text-lg font-bold">${task.punkty} pkt</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Wybór zadania do oceny
     */
    async selectTaskForGrading(taskId) {
        const task = window.QuizMaster?.currentQuiz?.pytania.find(p => p.id === taskId);
        if (!task) return;
        
        // Pokaż formularz wprowadzania odpowiedzi
        const modal = document.querySelector('.fixed');
        if (modal) {
            modal.innerHTML = `
                <div class="glass-dark p-8 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">
                            <i class="fas fa-tasks text-blue-400 mr-2"></i>
                            Ocenianie: Zadanie ${task.numer || task.id}
                        </h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div class="task-content mb-6">
                        <h3 class="text-lg font-semibold mb-2">Treść zadania:</h3>
                        <div class="p-4 bg-gray-800 rounded">${task.tresc}</div>
                        <p class="mt-2 text-sm text-gray-400">Maksymalna liczba punktów: ${task.punkty}</p>
                    </div>
                    
                    <div class="answer-input mb-6">
                        <h3 class="text-lg font-semibold mb-2">Wprowadź odpowiedź ucznia:</h3>
                        <textarea id="student-answer" 
                                  class="w-full p-3 bg-gray-800 rounded text-white"
                                  rows="6"
                                  placeholder="Wpisz lub wklej odpowiedź ucznia..."></textarea>
                    </div>
                    
                    <button onclick="window.stepGrading.startGrading(${taskId})" 
                            class="btn-primary w-full">
                        <i class="fas fa-brain mr-2"></i>
                        Rozpocznij ocenianie krokowe
                    </button>
                </div>
            `;
        }
    }

    /**
     * Rozpoczęcie oceniania
     */
    async startGrading(taskId) {
        const task = window.QuizMaster?.currentQuiz?.pytania.find(p => p.id === taskId);
        const studentAnswer = document.getElementById('student-answer')?.value;
        
        if (!task || !studentAnswer) {
            alert('Wprowadź odpowiedź ucznia');
            return;
        }
        
        // Pokaż loader
        const modal = document.querySelector('.fixed .glass-dark');
        if (modal) {
            modal.innerHTML = `
                <div class="text-center py-16">
                    <div class="loader mb-4"></div>
                    <p class="text-lg">Analizuję odpowiedź...</p>
                    <p class="text-sm text-gray-400 mt-2">To może potrwać kilka sekund</p>
                </div>
            `;
        }
        
        try {
            // Wykonaj ocenianie
            const gradingData = await this.initializeGrading(task, studentAnswer);
            
            // Pokaż wyniki
            if (modal) {
                modal.innerHTML = this.renderGradingInterface(gradingData);
            }
        } catch (error) {
            console.error('Błąd oceniania:', error);
            if (modal) {
                modal.innerHTML = `
                    <div class="text-center py-16">
                        <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                        <p class="text-lg text-red-400">Błąd podczas oceniania</p>
                        <p class="text-sm text-gray-400 mt-2">${error.message}</p>
                        <button onclick="this.closest('.fixed').remove()" 
                                class="btn-secondary mt-4">
                            Zamknij
                        </button>
                    </div>
                `;
            }
        }
    }
}

// Eksport klasy
window.StepGradingSystem = StepGradingSystem;

// Tworz instancję leniwie przy pierwszym użyciu
Object.defineProperty(window, 'stepGrading', {
    get: function() {
        if (!this._stepGrading) {
            this._stepGrading = new StepGradingSystem();
        }
        return this._stepGrading;
    },
    configurable: true
});