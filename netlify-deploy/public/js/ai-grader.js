/**
 * System inteligentnego oceniania odpowiedzi z wykorzystaniem AI
 * Integruje parsowanie CKE, ocenianie krokowe i analizę odpowiedzi
 */

class AIGrader {
    constructor() {
        this.geminiAPI = null; // Będzie inicjalizowane później
        this.stepGrading = new StepGradingSystem();
        this.ckeParser = new CKEParserSystem();
        this.initialized = false;
        this.gradingCache = new Map();
    }

    async initialize() {
        if (this.initialized) return;
        
        // Inicjalizacja Gemini API
        if (window.GeminiAPI) {
            this.geminiAPI = window.GeminiAPI;
        } else if (window.APIClient) {
            this.geminiAPI = window.APIClient;
        } else {
            console.warn('Gemini API nie jest dostępne - funkcje AI będą ograniczone');
        }
        
        // Inicjalizacja modułów
        await this.ckeParser.initialize();
        
        // Ładowanie modeli oceniania
        await this.loadGradingModels();
        
        this.initialized = true;
    }

    /**
     * Ładowanie specjalistycznych modeli oceniania
     */
    async loadGradingModels() {
        this.gradingModels = {
            matematyka: {
                patterns: [
                    { type: 'equation_solving', weight: 1.0 },
                    { type: 'geometric_proof', weight: 0.8 },
                    { type: 'word_problem', weight: 0.9 }
                ],
                specificCriteria: {
                    requiresSteps: true,
                    requiresUnits: true,
                    precisionMatters: true
                }
            },
            polski: {
                patterns: [
                    { type: 'essay', weight: 1.0 },
                    { type: 'interpretation', weight: 0.9 },
                    { type: 'grammar', weight: 0.7 }
                ],
                specificCriteria: {
                    requiresArguments: true,
                    checkSpelling: true,
                    styleMatters: true
                }
            },
            fizyka: {
                patterns: [
                    { type: 'problem_solving', weight: 1.0 },
                    { type: 'concept_explanation', weight: 0.8 },
                    { type: 'experimental_analysis', weight: 0.9 }
                ],
                specificCriteria: {
                    requiresFormulas: true,
                    requiresUnits: true,
                    requiresDiagrams: false
                }
            }
        };
    }

    /**
     * Główna funkcja oceniania odpowiedzi
     */
    async gradeAnswer(task, studentAnswer, options = {}) {
        await this.initialize();
        
        const config = {
            useCache: options.useCache !== false,
            detailed: options.detailed !== false,
            compareWithModel: options.compareWithModel || false,
            studentId: options.studentId || 'anonymous',
            ...options
        };

        // Sprawdzenie cache
        const cacheKey = this.generateCacheKey(task.id, studentAnswer);
        if (config.useCache && this.gradingCache.has(cacheKey)) {
            return this.gradingCache.get(cacheKey);
        }

        try {
            // 1. Analiza typu zadania i dobór metody oceniania
            const taskAnalysis = await this.analyzeTaskType(task);
            
            // 2. Ocenianie odpowiednie do typu
            let gradingResult;
            
            if (task.typ === 'zamkniete') {
                gradingResult = this.gradeClosedQuestion(task, studentAnswer);
            } else {
                gradingResult = await this.gradeOpenQuestion(task, studentAnswer, taskAnalysis, config);
            }
            
            // 3. Dodatkowa analiza jeśli wymagana
            if (config.detailed) {
                gradingResult.detailedAnalysis = await this.performDetailedAnalysis(
                    task, studentAnswer, gradingResult
                );
            }
            
            // 4. Porównanie z modelem jeśli dostępne
            if (config.compareWithModel && task.modelAnswer) {
                gradingResult.modelComparison = await this.compareWithModel(
                    studentAnswer, task.modelAnswer
                );
            }
            
            // 5. Generowanie raportu
            gradingResult.report = await this.generateGradingReport(gradingResult, task, config);
            
            // Cache wyniku
            if (config.useCache) {
                this.gradingCache.set(cacheKey, gradingResult);
            }
            
            // Zapisz do historii
            this.saveToHistory(task, studentAnswer, gradingResult, config);
            
            return gradingResult;
            
        } catch (error) {
            console.error('Błąd oceniania:', error);
            return {
                success: false,
                error: error.message,
                points: 0,
                maxPoints: task.punkty,
                feedback: ['Wystąpił błąd podczas oceniania. Sprawdź odpowiedź ręcznie.']
            };
        }
    }

    /**
     * Analiza typu zadania
     */
    async analyzeTaskType(task) {
        const analysis = {
            subject: this.detectSubject(task),
            category: task.kategoria || 'general',
            complexity: this.assessComplexity(task),
            requiredSkills: [],
            gradingStrategy: 'standard'
        };
        
        // Użyj AI do głębszej analizy
        if (this.geminiAPI) {
            const prompt = `
            Przeanalizuj to zadanie egzaminacyjne i określ:
            1. Główne umiejętności wymagane do rozwiązania
            2. Typ rozumowania (analityczne, twórcze, pamięciowe)
            3. Zalecana strategia oceniania
            
            Zadanie: ${task.tresc}
            Przedmiot: ${task.przedmiot}
            Punkty: ${task.punkty}
            `;
            
            try {
                const aiAnalysis = await this.geminiAPI.generateContent(prompt);
                Object.assign(analysis, this.parseAIAnalysis(aiAnalysis));
            } catch (error) {
                console.error('Błąd analizy AI:', error);
            }
        }
        
        return analysis;
    }

    /**
     * Ocenianie zadań zamkniętych
     */
    gradeClosedQuestion(task, studentAnswer) {
        const isCorrect = this.normalizeAnswer(studentAnswer) === 
                         this.normalizeAnswer(task.poprawna);
        
        return {
            success: true,
            points: isCorrect ? task.punkty : 0,
            maxPoints: task.punkty,
            isCorrect: isCorrect,
            correctAnswer: task.poprawna,
            studentAnswer: studentAnswer,
            feedback: isCorrect ? 
                ['✅ Odpowiedź poprawna!'] : 
                [`❌ Odpowiedź niepoprawna. Poprawna odpowiedź to: ${task.poprawna}`],
            confidence: 100
        };
    }

    /**
     * Ocenianie zadań otwartych
     */
    async gradeOpenQuestion(task, studentAnswer, taskAnalysis, config) {
        // Użyj systemu oceniania krokowego
        const stepGradingData = await this.stepGrading.initializeGrading(task, studentAnswer);
        
        // Dodatkowa analiza AI
        const aiGrading = await this.performAIGrading(task, studentAnswer, taskAnalysis);
        
        // Połączenie wyników
        const combinedResult = this.combineGradingResults(stepGradingData, aiGrading);
        
        // Specyficzne kryteria przedmiotowe
        if (taskAnalysis.subject && this.gradingModels[taskAnalysis.subject]) {
            await this.applySubjectSpecificCriteria(
                combinedResult, 
                task, 
                studentAnswer, 
                this.gradingModels[taskAnalysis.subject]
            );
        }
        
        return {
            success: true,
            points: combinedResult.finalScore,
            maxPoints: task.punkty,
            stepBreakdown: stepGradingData.gradingPlan.steps.map(step => ({
                name: step.name,
                points: step.points,
                awarded: stepGradingData.initialAnalysis.identifiedSteps
                    .find(s => s.step.id === step.id)?.pointsAwarded || 0
            })),
            feedback: combinedResult.feedback,
            confidence: combinedResult.confidence,
            aiInsights: aiGrading.insights,
            gradingDetails: stepGradingData
        };
    }

    /**
     * Ocenianie AI
     */
    async performAIGrading(task, studentAnswer, taskAnalysis) {
        const prompt = `
        Oceń odpowiedź ucznia na to zadanie egzaminacyjne.
        
        ZADANIE:
        ${task.tresc}
        ${task.obrazki ? 'Zadanie zawiera obrazek/diagram.' : ''}
        
        KRYTERIA OCENIANIA:
        ${JSON.stringify(task.kryteriaOceniania || task.schematOceniania || 'Standardowe kryteria', null, 2)}
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        Maksymalna liczba punktów: ${task.punkty}
        Przedmiot: ${task.przedmiot}
        
        Oceń odpowiedź uwzględniając:
        1. Poprawność merytoryczną
        2. Kompletność rozwiązania
        3. Poprawność obliczeń (jeśli dotyczy)
        4. Użycie właściwej terminologii
        5. Struktura i klarowność odpowiedzi
        
        Zwróć ocenę w formacie JSON:
        {
            "score": liczba_punktów,
            "maxScore": ${task.punkty},
            "strengths": ["lista mocnych stron"],
            "weaknesses": ["lista słabych stron"],
            "errors": ["lista błędów"],
            "suggestions": ["sugestie poprawy"],
            "insights": {
                "understanding": "poziom zrozumienia (0-100)",
                "methodology": "poprawność metodologii (0-100)",
                "execution": "jakość wykonania (0-100)",
                "presentation": "jakość prezentacji (0-100)"
            },
            "partialCredits": [
                {"aspect": "aspekt rozwiązania", "points": punkty}
            ]
        }
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            // APIClient zwraca obiekt z właściwością text
            const responseText = typeof response === 'string' ? response : response.text;
            return JSON.parse(responseText);
        } catch (error) {
            console.error('Błąd oceniania AI:', error);
            return {
                score: 0,
                maxScore: task.punkty,
                strengths: [],
                weaknesses: ['Nie można przeprowadzić automatycznej oceny'],
                errors: [error.message],
                suggestions: ['Wymagana ocena ręczna'],
                insights: {
                    understanding: 0,
                    methodology: 0,
                    execution: 0,
                    presentation: 0
                },
                partialCredits: []
            };
        }
    }

    /**
     * Łączenie wyników różnych metod oceniania
     */
    combineGradingResults(stepGrading, aiGrading) {
        // Średnia ważona wyników
        const stepScore = stepGrading.initialAnalysis.totalPoints;
        const aiScore = aiGrading.score;
        
        // Wagi zależne od pewności
        const stepWeight = stepGrading.initialAnalysis.confidence / 100;
        const aiWeight = 0.8; // Stała waga dla AI
        
        const finalScore = Math.round(
            (stepScore * stepWeight + aiScore * aiWeight) / (stepWeight + aiWeight) * 2
        ) / 2; // Zaokrąglenie do 0.5
        
        // Łączenie feedbacku
        const feedback = [
            ...stepGrading.initialAnalysis.feedback,
            ...aiGrading.strengths.map(s => `✅ ${s}`),
            ...aiGrading.weaknesses.map(w => `⚠️ ${w}`),
            ...aiGrading.suggestions.map(s => `💡 ${s}`)
        ];
        
        // Obliczenie końcowej pewności
        const confidence = Math.round(
            (stepGrading.initialAnalysis.confidence + 80) / 2
        );
        
        return {
            finalScore,
            feedback,
            confidence,
            insights: aiGrading.insights
        };
    }

    /**
     * Zastosowanie kryteriów specyficznych dla przedmiotu
     */
    async applySubjectSpecificCriteria(result, task, answer, subjectModel) {
        const criteria = subjectModel.specificCriteria;
        
        // Matematyka/Fizyka - sprawdzanie jednostek
        if (criteria.requiresUnits) {
            const hasUnits = await this.checkUnits(answer, task);
            if (!hasUnits && task.wymagaJednostek !== false) {
                result.finalScore = Math.max(0, result.finalScore - 0.5);
                result.feedback.push('⚠️ Brak jednostek w odpowiedzi końcowej (-0.5 pkt)');
            }
        }
        
        // Polski - sprawdzanie ortografii
        if (criteria.checkSpelling) {
            const spellingErrors = await this.checkSpelling(answer);
            if (spellingErrors.length > 3) {
                result.finalScore = Math.max(0, result.finalScore - 1);
                result.feedback.push(`⚠️ Błędy ortograficzne: ${spellingErrors.length} (-1 pkt)`);
            }
        }
        
        // Sprawdzanie wymaganych elementów
        if (criteria.requiresArguments) {
            const hasArguments = await this.checkArguments(answer);
            if (!hasArguments) {
                result.finalScore = Math.max(0, result.finalScore - 1);
                result.feedback.push('⚠️ Brak argumentacji (-1 pkt)');
            }
        }
    }

    /**
     * Szczegółowa analiza odpowiedzi
     */
    async performDetailedAnalysis(task, studentAnswer, basicGrading) {
        const analysis = {
            linguistic: await this.analyzeLinguistic(studentAnswer),
            conceptual: await this.analyzeConceptual(studentAnswer, task),
            computational: null,
            visual: null
        };
        
        // Analiza obliczeniowa dla zadań matematycznych
        if (task.przedmiot.includes('matematyka') || task.przedmiot.includes('fizyka')) {
            analysis.computational = await this.analyzeComputational(studentAnswer);
        }
        
        // Analiza wizualna jeśli są diagramy
        if (task.obrazki || studentAnswer.includes('[diagram]')) {
            analysis.visual = await this.analyzeVisual(studentAnswer, task);
        }
        
        return analysis;
    }

    /**
     * Porównanie z odpowiedzią modelową
     */
    async compareWithModel(studentAnswer, modelAnswer) {
        const prompt = `
        Porównaj odpowiedź ucznia z odpowiedzią modelową.
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        ODPOWIEDŹ MODELOWA:
        ${modelAnswer}
        
        Analiza powinna zawierać:
        1. Kluczowe elementy obecne w obu odpowiedziach
        2. Elementy obecne tylko w modelu (pominięte przez ucznia)
        3. Elementy dodatkowe w odpowiedzi ucznia
        4. Ocena równoważności podejść
        5. Procentowe podobieństwo (0-100%)
        
        Zwróć jako JSON.
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            // APIClient zwraca obiekt z właściwością text
            const responseText = typeof response === 'string' ? response : response.text;
            return JSON.parse(responseText);
        } catch (error) {
            return {
                similarity: 0,
                missingElements: ['Nie można porównać'],
                additionalElements: [],
                equivalent: false
            };
        }
    }

    /**
     * Generowanie raportu oceniania
     */
    async generateGradingReport(gradingResult, task, config) {
        const report = {
            summary: {
                taskId: task.id,
                studentId: config.studentId,
                score: gradingResult.points,
                maxScore: gradingResult.maxPoints,
                percentage: Math.round((gradingResult.points / gradingResult.maxPoints) * 100),
                grade: this.calculateGrade(gradingResult.points, gradingResult.maxPoints),
                timestamp: new Date().toISOString()
            },
            details: {
                feedback: gradingResult.feedback,
                confidence: gradingResult.confidence,
                gradingMethod: gradingResult.stepBreakdown ? 'step-by-step' : 'holistic'
            }
        };
        
        // Dodaj szczegóły krokowe jeśli dostępne
        if (gradingResult.stepBreakdown) {
            report.details.steps = gradingResult.stepBreakdown;
        }
        
        // Dodaj analizę AI jeśli dostępna
        if (gradingResult.aiInsights) {
            report.aiAnalysis = gradingResult.aiInsights;
        }
        
        // Generuj rekomendacje
        report.recommendations = await this.generateRecommendations(
            gradingResult, task, config
        );
        
        // Wizualizacja HTML
        report.html = this.generateReportHTML(report);
        
        return report;
    }

    /**
     * Generowanie rekomendacji dla ucznia
     */
    async generateRecommendations(gradingResult, task, config) {
        const recommendations = [];
        
        // Na podstawie wyniku
        const percentage = (gradingResult.points / gradingResult.maxPoints) * 100;
        
        if (percentage < 50) {
            recommendations.push({
                type: 'review',
                priority: 'high',
                message: 'Zalecana powtórka materiału z działu: ' + task.temat
            });
        } else if (percentage < 80) {
            recommendations.push({
                type: 'practice',
                priority: 'medium',
                message: 'Rozwiąż więcej zadań podobnego typu'
            });
        }
        
        // Na podstawie błędów
        if (gradingResult.feedback.some(f => f.includes('jednostek'))) {
            recommendations.push({
                type: 'attention',
                priority: 'medium',
                message: 'Pamiętaj o zapisywaniu jednostek w odpowiedziach'
            });
        }
        
        // Rekomendacje AI
        if (this.geminiAPI && recommendations.length < 3) {
            const aiRecs = await this.generateAIRecommendations(gradingResult, task);
            recommendations.push(...aiRecs);
        }
        
        return recommendations;
    }

    /**
     * Generowanie HTML raportu
     */
    generateReportHTML(report) {
        return `
            <div class="grading-report">
                <h3>Raport oceniania</h3>
                
                <div class="report-summary">
                    <div class="score-display">
                        <span class="score">${report.summary.score}</span>
                        <span class="max-score">/ ${report.summary.maxScore} pkt</span>
                        <span class="percentage">(${report.summary.percentage}%)</span>
                    </div>
                    <div class="grade">Ocena: ${report.summary.grade}</div>
                    <div class="confidence">Pewność oceny: ${report.details.confidence}%</div>
                </div>
                
                ${report.details.steps ? `
                    <div class="step-details">
                        <h4>Punktacja krokowa:</h4>
                        <ul>
                            ${report.details.steps.map(step => `
                                <li>
                                    ${step.name}: 
                                    <strong>${step.awarded} / ${step.points} pkt</strong>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="feedback-section">
                    <h4>Feedback:</h4>
                    <ul>
                        ${report.details.feedback.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
                
                ${report.aiAnalysis ? `
                    <div class="ai-insights">
                        <h4>Analiza AI:</h4>
                        <div class="insights-grid">
                            <div>Zrozumienie: ${report.aiAnalysis.understanding}%</div>
                            <div>Metodologia: ${report.aiAnalysis.methodology}%</div>
                            <div>Wykonanie: ${report.aiAnalysis.execution}%</div>
                            <div>Prezentacja: ${report.aiAnalysis.presentation}%</div>
                        </div>
                    </div>
                ` : ''}
                
                ${report.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h4>Rekomendacje:</h4>
                        ${report.recommendations.map(rec => `
                            <div class="recommendation ${rec.priority}">
                                <span class="rec-type">${rec.type}</span>
                                ${rec.message}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="report-footer">
                    <small>Wygenerowano: ${new Date(report.summary.timestamp).toLocaleString('pl-PL')}</small>
                </div>
            </div>
        `;
    }

    /**
     * Pomocnicze funkcje
     */
    
    generateCacheKey(taskId, answer) {
        return `${taskId}_${this.hashString(answer)}`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    
    normalizeAnswer(answer) {
        return answer.toString().trim().toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[.,;:!?]/g, '');
    }
    
    detectSubject(task) {
        const subject = task.przedmiot.toLowerCase();
        if (subject.includes('matematyka')) return 'matematyka';
        if (subject.includes('polski')) return 'polski';
        if (subject.includes('fizyka')) return 'fizyka';
        if (subject.includes('chemia')) return 'chemia';
        if (subject.includes('biologia')) return 'biologia';
        if (subject.includes('historia')) return 'historia';
        if (subject.includes('geografia')) return 'geografia';
        if (subject.includes('angielski')) return 'angielski';
        return 'ogólny';
    }
    
    assessComplexity(task) {
        let complexity = 1; // Podstawowy
        
        // Więcej punktów = większa złożoność
        if (task.punkty > 3) complexity++;
        if (task.punkty > 5) complexity++;
        
        // Zadania z obrazkami są trudniejsze
        if (task.obrazki) complexity++;
        
        // Długa treść = większa złożoność
        if (task.tresc.length > 500) complexity++;
        
        return Math.min(5, complexity);
    }
    
    calculateGrade(points, maxPoints) {
        const percentage = (points / maxPoints) * 100;
        
        if (percentage >= 90) return '6';
        if (percentage >= 80) return '5';
        if (percentage >= 70) return '4';
        if (percentage >= 60) return '3';
        if (percentage >= 50) return '2';
        return '1';
    }
    
    parseAIAnalysis(aiResponse) {
        try {
            // Obsłuż przypadek gdy aiResponse to już obiekt
            if (typeof aiResponse === 'object' && aiResponse !== null) {
                return aiResponse.text ? JSON.parse(aiResponse.text) : aiResponse;
            }
            return JSON.parse(aiResponse);
        } catch {
            return {};
        }
    }
    
    saveToHistory(task, answer, result, config) {
        const history = JSON.parse(localStorage.getItem('aiGradingHistory') || '[]');
        
        history.push({
            taskId: task.id,
            studentId: config.studentId,
            timestamp: new Date().toISOString(),
            answer: answer.substring(0, 200), // Pierwsze 200 znaków
            score: result.points,
            maxScore: result.maxPoints,
            confidence: result.confidence
        });
        
        // Zachowaj tylko ostatnie 100 wpisów
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        localStorage.setItem('aiGradingHistory', JSON.stringify(history));
    }
    
    /**
     * Funkcje analizy specjalistycznej
     */
    
    async analyzeLinguistic(text) {
        // Podstawowa analiza językowa
        return {
            wordCount: text.split(/\s+/).length,
            sentenceCount: text.split(/[.!?]+/).filter(s => s.trim()).length,
            avgWordLength: text.replace(/\s/g, '').length / text.split(/\s+/).length,
            complexity: this.assessTextComplexity(text)
        };
    }
    
    async analyzeConceptual(answer, task) {
        // Analiza pojęciowa
        const concepts = this.extractConcepts(task.tresc);
        const usedConcepts = concepts.filter(c => 
            answer.toLowerCase().includes(c.toLowerCase())
        );
        
        return {
            expectedConcepts: concepts,
            usedConcepts: usedConcepts,
            coverage: (usedConcepts.length / concepts.length) * 100
        };
    }
    
    async analyzeComputational(answer) {
        // Znajdź i sprawdź obliczenia
        const calculations = this.extractCalculations(answer);
        const verified = [];
        
        for (const calc of calculations) {
            try {
                // Bezpieczna ewaluacja prostych obliczeń
                const result = this.safeEvaluate(calc);
                verified.push({
                    expression: calc,
                    correct: result.correct,
                    expected: result.expected,
                    actual: result.actual
                });
            } catch (error) {
                verified.push({
                    expression: calc,
                    correct: false,
                    error: error.message
                });
            }
        }
        
        return {
            calculations: verified,
            accuracy: verified.filter(v => v.correct).length / verified.length * 100
        };
    }
    
    async checkUnits(answer, task) {
        // Implementacja sprawdzania jednostek
        const unitPatterns = [
            /\d+\s*(?:m|cm|mm|km|kg|g|mg|s|min|h|°C|K|J|W|N|Pa|V|A|Ω)(?:\b|²|³)/,
            /\d+\s*(?:metr|centymetr|kilogram|gram|sekund|minut|godzin)/i
        ];
        
        return unitPatterns.some(pattern => pattern.test(answer));
    }
    
    async checkSpelling(text) {
        // Podstawowe sprawdzanie błędów
        // W prawdziwej implementacji użyłbyś API do sprawdzania pisowni
        const commonErrors = [
            { wrong: 'wziąść', correct: 'wziąć' },
            { wrong: 'włanczać', correct: 'włączać' },
            { wrong: 'prosze', correct: 'proszę' }
        ];
        
        const found = [];
        commonErrors.forEach(error => {
            if (text.includes(error.wrong)) {
                found.push(error);
            }
        });
        
        return found;
    }
    
    async checkArguments(text) {
        // Sprawdzanie obecności argumentacji
        const argumentIndicators = [
            'ponieważ', 'dlatego', 'gdyż', 'z powodu',
            'wynika to z', 'świadczy o tym', 'dowodzi',
            'po pierwsze', 'po drugie', 'dodatkowo'
        ];
        
        return argumentIndicators.some(indicator => 
            text.toLowerCase().includes(indicator)
        );
    }
    
    extractConcepts(taskText) {
        // Wyodrębnianie kluczowych pojęć z treści zadania
        // Uproszczona wersja - w rzeczywistości użyłbyś NLP
        const words = taskText.split(/\s+/)
            .filter(w => w.length > 4)
            .filter(w => !['który', 'która', 'które', 'jakie'].includes(w.toLowerCase()));
        
        return [...new Set(words)];
    }
    
    extractCalculations(text) {
        // Znajdowanie obliczeń w tekście
        const patterns = [
            /\d+\s*[+\-*/]\s*\d+\s*=\s*\d+/g,
            /\d+\s*[+\-*/]\s*\d+/g
        ];
        
        const calculations = [];
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                calculations.push(...matches);
            }
        });
        
        return calculations;
    }
    
    safeEvaluate(expression) {
        // Bezpieczna ewaluacja prostych wyrażeń matematycznych
        // NIE używaj eval() w produkcji!
        const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, '');
        
        try {
            // Tu należałoby użyć bezpiecznego parsera matematycznego
            // np. math.js
            return {
                correct: true,
                expected: 'calculated',
                actual: 'calculated'
            };
        } catch (error) {
            return {
                correct: false,
                error: error.message
            };
        }
    }
    
    assessTextComplexity(text) {
        const avgSentenceLength = text.split(/[.!?]/).filter(s => s.trim()).length / 
                                 text.split(/\s+/).length;
        
        if (avgSentenceLength > 20) return 'complex';
        if (avgSentenceLength > 15) return 'moderate';
        return 'simple';
    }
    
    async generateAIRecommendations(gradingResult, task) {
        if (!this.geminiAPI) return [];
        
        const prompt = `
        Na podstawie wyniku oceniania, zaproponuj 2-3 spersonalizowane rekomendacje dla ucznia.
        
        Wynik: ${gradingResult.points}/${gradingResult.maxPoints} punktów
        Główne błędy: ${gradingResult.feedback.filter(f => f.includes('❌') || f.includes('⚠️')).join(', ')}
        Temat zadania: ${task.temat}
        
        Rekomendacje powinny być konkretne i pomocne.
        `;
        
        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const responseText = typeof response === 'string' ? response : response.text;
            const recommendations = responseText.split('\n')
                .filter(line => line.trim())
                .map(line => ({
                    type: 'ai-suggestion',
                    priority: 'medium',
                    message: line
                }));
            
            return recommendations.slice(0, 3);
        } catch (error) {
            return [];
        }
    }
    
    async analyzeVisual(answer, task) {
        // Analiza elementów wizualnych
        return {
            hasDiagrams: answer.includes('[diagram]') || answer.includes('[rysunek]'),
            referencesImages: task.obrazki && answer.includes('rysunek'),
            visualCommunication: 'text-only' // W przyszłości: analiza załączonych obrazków
        };
    }

    /**
     * Otwiera interfejs AI Gradera
     */
    openAIGrader() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-robot text-purple-400 mr-2"></i>
                        AI Grader - Inteligentne Ocenianie
                    </h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="grid gap-6">
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-upload text-blue-400 mr-2"></i>
                            Import odpowiedzi
                        </h3>
                        <p class="text-gray-400 mb-4">
                            Załaduj odpowiedzi uczniów do automatycznego oceniania
                        </p>
                        <button onclick="window.aiGrader.openImportDialog()" 
                                class="btn-primary">
                            <i class="fas fa-file-import mr-2"></i>
                            Importuj odpowiedzi
                        </button>
                    </div>
                    
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-clipboard-check text-green-400 mr-2"></i>
                            Oceń pojedynczą odpowiedź
                        </h3>
                        <p class="text-gray-400 mb-4">
                            Wprowadź odpowiedź ucznia do szybkiej oceny
                        </p>
                        <button onclick="window.aiGrader.openSingleGradeDialog()" 
                                class="btn-primary">
                            <i class="fas fa-check-circle mr-2"></i>
                            Oceń odpowiedź
                        </button>
                    </div>
                    
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-chart-line text-yellow-400 mr-2"></i>
                            Analiza wyników
                        </h3>
                        <p class="text-gray-400 mb-4">
                            Zobacz statystyki i analizy ocenionych odpowiedzi
                        </p>
                        <button onclick="window.aiGrader.showAnalytics()" 
                                class="btn-primary">
                            <i class="fas fa-analytics mr-2"></i>
                            Pokaż analizy
                        </button>
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-purple-600/20 rounded-lg">
                    <p class="text-sm text-gray-300">
                        <i class="fas fa-info-circle mr-2"></i>
                        AI Grader wykorzystuje zaawansowane modele językowe do analizy odpowiedzi tekstowych,
                        uwzględniając kontekst zadania, poprawność merytoryczną i jakość argumentacji.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        if (!this.initialized) {
            this.initialize().catch(console.error);
        }
        
        return true;
    }

    /**
     * Otwiera dialog importu odpowiedzi
     */
    openImportDialog() {
        // Implementacja dialogu importu
        alert('Funkcja importu odpowiedzi będzie dostępna wkrótce');
    }

    /**
     * Otwiera dialog oceny pojedynczej odpowiedzi
     */
    openSingleGradeDialog() {
        // Implementacja dialogu oceny
        alert('Funkcja oceny pojedynczej odpowiedzi będzie dostępna wkrótce');
    }

    /**
     * Pokazuje analizy wyników
     */
    showAnalytics() {
        // Implementacja analiz
        alert('Funkcja analiz będzie dostępna wkrótce');
    }
}

// Eksport jako globalna klasa
window.AIGrader = AIGrader;