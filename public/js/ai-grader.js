/**
 * System oceniania zadań otwartych z wykorzystaniem AI
 * Integruje parsowanie CKE z systemem oceniania krokowego
 */

class AIGrader {
    constructor() {
        this.geminiAPI = window.TaskVariantGenerator?.geminiAPI;
        this.stepGrading = new StepGradingSystem();
        this.ckeParser = new CKEParserSystem();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        await this.stepGrading.initialize?.();
        await this.ckeParser.initialize?.();
        this.initialized = true;
    }

    /**
     * Ocenianie pojedynczej odpowiedzi
     */
    async gradeAnswer(task, studentAnswer, options = {}) {
        await this.initialize();
        
        const config = {
            useStepGrading: options.useStepGrading !== false,
            provideFeedback: options.provideFeedback !== false,
            compareWithModel: options.compareWithModel || false,
            strictMode: options.strictMode || false,
            ...options
        };

        try {
            // Określ typ zadania i metodę oceniania
            const gradingMethod = this.determineGradingMethod(task);
            
            let result;
            switch (gradingMethod) {
                case 'closed':
                    result = await this.gradeClosedQuestion(task, studentAnswer);
                    break;
                case 'open-simple':
                    result = await this.gradeSimpleOpenQuestion(task, studentAnswer, config);
                    break;
                case 'open-complex':
                    result = await this.gradeComplexOpenQuestion(task, studentAnswer, config);
                    break;
                case 'math':
                    result = await this.gradeMathQuestion(task, studentAnswer, config);
                    break;
                default:
                    result = await this.gradeGenericQuestion(task, studentAnswer, config);
            }

            // Dodaj metadane
            result.metadata = {
                gradingMethod,
                timestamp: new Date().toISOString(),
                aiModel: 'Gemini Pro',
                confidence: result.confidence || 0
            };

            return result;

        } catch (error) {
            console.error('Błąd oceniania:', error);
            return {
                success: false,
                error: error.message,
                score: 0,
                maxScore: task.punkty || 0
            };
        }
    }

    /**
     * Określanie metody oceniania
     */
    determineGradingMethod(task) {
        if (task.typ === 'zamkniete') return 'closed';
        
        if (task.typ === 'otwarte') {
            if (task.punkty === 1) return 'open-simple';
            if (task.przedmiot?.includes('matematyka') || task.kategoria?.includes('obliczenia')) {
                return 'math';
            }
            return 'open-complex';
        }
        
        return 'generic';
    }

    /**
     * Ocenianie zadania zamkniętego
     */
    async gradeClosedQuestion(task, studentAnswer) {
        const isCorrect = this.normalizeAnswer(studentAnswer) === this.normalizeAnswer(task.poprawna);
        
        return {
            success: true,
            score: isCorrect ? task.punkty : 0,
            maxScore: task.punkty,
            isCorrect,
            feedback: isCorrect ? 
                'Odpowiedź poprawna!' : 
                `Odpowiedź niepoprawna. Poprawna odpowiedź to: ${task.poprawna}`,
            confidence: 100
        };
    }

    /**
     * Ocenianie prostego zadania otwartego
     */
    async gradeSimpleOpenQuestion(task, studentAnswer, config) {
        const prompt = `
        Oceń odpowiedź ucznia na zadanie.
        
        ZADANIE:
        ${task.tresc}
        
        POPRAWNA ODPOWIEDŹ/KRYTERIA:
        ${task.poprawna || task.kryteriaOceniania || 'Brak wzorca odpowiedzi'}
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        Przyznaj 1 punkt jeśli odpowiedź jest poprawna, 0 punktów jeśli niepoprawna.
        Weź pod uwagę:
        - Merytoryczną poprawność
        - Dopuszczalne są drobne błędy językowe
        - Różne poprawne sformułowania tej samej odpowiedzi
        
        Zwróć w formacie JSON:
        {
            "score": 0 lub 1,
            "isCorrect": true/false,
            "feedback": "krótkie uzasadnienie",
            "confidence": liczba 0-100
        }
        `;

        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const result = JSON.parse(response);
            
            return {
                success: true,
                score: result.score,
                maxScore: 1,
                isCorrect: result.isCorrect,
                feedback: result.feedback,
                confidence: result.confidence
            };
        } catch (error) {
            return this.fallbackGrading(task, studentAnswer);
        }
    }

    /**
     * Ocenianie złożonego zadania otwartego
     */
    async gradeComplexOpenQuestion(task, studentAnswer, config) {
        if (config.useStepGrading && task.punkty > 1) {
            // Użyj systemu oceniania krokowego
            const gradingData = await this.stepGrading.initializeGrading(task, studentAnswer);
            const analysis = gradingData.initialAnalysis;
            
            return {
                success: true,
                score: analysis.totalPoints,
                maxScore: task.punkty,
                isCorrect: analysis.totalPoints === task.punkty,
                feedback: analysis.feedback.join('\n'),
                stepAnalysis: analysis,
                confidence: analysis.confidence
            };
        }
        
        // Standardowe ocenianie AI
        const prompt = `
        Oceń szczegółowo odpowiedź ucznia na zadanie otwarte.
        
        ZADANIE:
        ${task.tresc}
        ${task.obrazki ? '[Zadanie zawiera obrazki/diagramy]' : ''}
        
        Maksymalna liczba punktów: ${task.punkty}
        
        KRYTERIA OCENIANIA:
        ${JSON.stringify(task.kryteriaOceniania || task.schematOceniania || 'Standardowe kryteria', null, 2)}
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        Oceń odpowiedź przyznając punkty od 0 do ${task.punkty}.
        Uwzględnij:
        1. Kompletność odpowiedzi
        2. Poprawność merytoryczną
        3. Sposób rozwiązania
        4. Klarowność wywodu
        
        Zwróć w formacie JSON:
        {
            "score": liczba punktów,
            "maxScore": ${task.punkty},
            "isCorrect": true jeśli pełna punktacja,
            "partialCredit": {
                "element1": { "points": x, "comment": "..." },
                "element2": { "points": y, "comment": "..." }
            },
            "feedback": "szczegółowe uzasadnienie",
            "suggestions": ["wskazówka 1", "wskazówka 2"],
            "confidence": liczba 0-100
        }
        `;

        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const result = JSON.parse(response);
            
            return {
                success: true,
                ...result
            };
        } catch (error) {
            return this.fallbackGrading(task, studentAnswer);
        }
    }

    /**
     * Ocenianie zadania matematycznego
     */
    async gradeMathQuestion(task, studentAnswer, config) {
        const prompt = `
        Oceń rozwiązanie zadania matematycznego.
        
        ZADANIE:
        ${task.tresc}
        
        Punkty: ${task.punkty}
        
        ROZWIĄZANIE UCZNIA:
        ${studentAnswer}
        
        Oceń uwzględniając:
        1. Poprawność obliczeń
        2. Metodę rozwiązania
        3. Zapis matematyczny
        4. Jednostki (jeśli wymagane)
        5. Odpowiedź końcową
        
        Przyznaj punkty częściowe za:
        - Poprawną metodę nawet przy błędach rachunkowych
        - Częściowe rozwiązanie
        - Poprawne kroki pośrednie
        
        Zwróć w formacie JSON:
        {
            "score": przyznane punkty,
            "maxScore": ${task.punkty},
            "breakdown": {
                "method": { "points": x, "max": y, "comment": "..." },
                "calculations": { "points": x, "max": y, "comment": "..." },
                "finalAnswer": { "points": x, "max": y, "comment": "..." }
            },
            "errors": ["błąd 1", "błąd 2"],
            "feedback": "pełne uzasadnienie",
            "confidence": liczba 0-100
        }
        `;

        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const result = JSON.parse(response);
            
            // Walidacja wyniku matematycznego
            if (task.poprawna && this.isMathExpression(task.poprawna)) {
                const expectedValue = this.evaluateMathExpression(task.poprawna);
                const studentValue = this.extractNumericAnswer(studentAnswer);
                
                if (expectedValue !== null && studentValue !== null) {
                    const isNumericallyCorrect = Math.abs(expectedValue - studentValue) < 0.001;
                    
                    // Korekta oceny jeśli wartość numeryczna się zgadza
                    if (isNumericallyCorrect && result.score < result.maxScore) {
                        result.score = Math.max(result.score, result.maxScore * 0.8);
                        result.feedback += '\n[Wartość numeryczna poprawna]';
                    }
                }
            }
            
            return {
                success: true,
                ...result
            };
        } catch (error) {
            return this.fallbackGrading(task, studentAnswer);
        }
    }

    /**
     * Ocenianie masowe
     */
    async gradeBatch(tasks, answers, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const batchAnswers = answers.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(
                batch.map((task, index) => 
                    this.gradeAnswer(task, batchAnswers[index], options)
                )
            );
            
            results.push(...batchResults);
            
            // Callback postępu
            if (options.onProgress) {
                options.onProgress({
                    current: Math.min(i + batchSize, tasks.length),
                    total: tasks.length,
                    percentage: Math.round(((i + batchSize) / tasks.length) * 100)
                });
            }
        }
        
        return results;
    }

    /**
     * Generowanie raportu oceniania
     */
    generateGradingReport(gradingResults, studentInfo) {
        const totalScore = gradingResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const maxScore = gradingResults.reduce((sum, r) => sum + (r.maxScore || 0), 0);
        const percentage = Math.round((totalScore / maxScore) * 100);
        
        const report = {
            student: studentInfo,
            summary: {
                totalScore,
                maxScore,
                percentage,
                grade: this.calculateGrade(percentage),
                passed: percentage >= 50
            },
            details: gradingResults.map((result, index) => ({
                questionNumber: index + 1,
                score: result.score,
                maxScore: result.maxScore,
                feedback: result.feedback,
                confidence: result.confidence
            })),
            statistics: {
                avgConfidence: this.average(gradingResults.map(r => r.confidence || 0)),
                correctAnswers: gradingResults.filter(r => r.isCorrect).length,
                partialAnswers: gradingResults.filter(r => 
                    r.score > 0 && r.score < r.maxScore
                ).length,
                incorrectAnswers: gradingResults.filter(r => r.score === 0).length
            },
            timestamp: new Date().toISOString()
        };
        
        return report;
    }

    /**
     * Porównanie z odpowiedzią modelową
     */
    async compareWithModelAnswer(task, studentAnswer, modelAnswer) {
        const prompt = `
        Porównaj odpowiedź ucznia z odpowiedzią modelową.
        
        ZADANIE:
        ${task.tresc}
        
        ODPOWIEDŹ MODELOWA:
        ${modelAnswer}
        
        ODPOWIEDŹ UCZNIA:
        ${studentAnswer}
        
        Oceń na ile odpowiedź ucznia pokrywa się z modelową.
        Zwróć analizę w formacie JSON:
        {
            "similarity": procent podobieństwa 0-100,
            "coveredPoints": ["punkt 1", "punkt 2"],
            "missingPoints": ["brakujący punkt 1"],
            "additionalPoints": ["dodatkowy punkt"],
            "overallAssessment": "ogólna ocena",
            "score": sugerowana punktacja 0-${task.punkty}
        }
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
     * Funkcje pomocnicze
     */
    normalizeAnswer(answer) {
        return answer?.toString().trim().toUpperCase();
    }

    fallbackGrading(task, studentAnswer) {
        // Prosta heurystyka gdy AI zawiedzie
        const hasAnswer = studentAnswer && studentAnswer.trim().length > 0;
        const answerLength = studentAnswer?.trim().length || 0;
        const expectedLength = task.tresc.length * 0.2; // Oczekuj odpowiedzi ~20% długości pytania
        
        let score = 0;
        if (hasAnswer) {
            if (answerLength >= expectedLength) {
                score = Math.ceil(task.punkty * 0.5); // 50% punktów za próbę
            } else {
                score = Math.ceil(task.punkty * 0.25); // 25% za krótką odpowiedź
            }
        }
        
        return {
            success: true,
            score,
            maxScore: task.punkty,
            isCorrect: false,
            feedback: 'Ocena automatyczna niedostępna. Przyznano punkty za próbę odpowiedzi.',
            confidence: 20,
            fallback: true
        };
    }

    isMathExpression(text) {
        return /[\d+\-*/=()^√]/.test(text);
    }

    evaluateMathExpression(expr) {
        try {
            // Podstawowa ewaluacja - w produkcji użyj math.js
            const cleaned = expr.replace(/[^0-9+\-*/().]/g, '');
            return Function('"use strict"; return (' + cleaned + ')')();
        } catch {
            return null;
        }
    }

    extractNumericAnswer(text) {
        const match = text.match(/[\d.,]+/g);
        if (match) {
            const num = parseFloat(match[match.length - 1].replace(',', '.'));
            return isNaN(num) ? null : num;
        }
        return null;
    }

    calculateGrade(percentage) {
        if (percentage >= 90) return '5';
        if (percentage >= 75) return '4';
        if (percentage >= 60) return '3';
        if (percentage >= 50) return '2';
        return '1';
    }

    average(numbers) {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }

    /**
     * Eksport ocen do różnych formatów
     */
    async exportGrades(gradingResults, format = 'json') {
        const report = this.generateGradingReport(gradingResults, {
            // Dane ucznia z kontekstu
        });
        
        switch (format) {
            case 'json':
                return JSON.stringify(report, null, 2);
                
            case 'csv':
                const csv = [
                    'Nr,Punkty,Max,Procent,Feedback',
                    ...report.details.map(d => 
                        `${d.questionNumber},${d.score},${d.maxScore},${Math.round((d.score/d.maxScore)*100)}%,"${d.feedback}"`
                    )
                ].join('\n');
                return csv;
                
            case 'pdf':
                // Integracja z PDFExportManager
                if (window.PDFExportManager) {
                    const pdfExporter = new PDFExportManager();
                    return await pdfExporter.generateGradingReport(report);
                }
                break;
        }
        
        return report;
    }
}

// Eksport jako globalna klasa
window.AIGrader = AIGrader;