// System rekomendacji personalizowanych zadań
class RecommendationSystem {
    constructor() {
        this.userAnalytics = new Map();
    }

    // Analizuj wyniki ucznia
    analyzeStudentPerformance(studentId) {
        const results = JSON.parse(localStorage.getItem('examResults') || '[]')
            .filter(r => r.studentId === studentId);
        
        if (results.length === 0) {
            return {
                hasData: false,
                weakTopics: [],
                strongTopics: [],
                averageScore: 0,
                totalTasks: 0
            };
        }

        // Analiza per temat
        const topicStats = {};
        let totalScore = 0;
        let totalTasks = 0;

        results.forEach(result => {
            if (result.questions) {
                result.questions.forEach((question, idx) => {
                    const topic = question.temat || 'Inne';
                    const subject = question.przedmiot || 'Inne';
                    const key = `${subject}|${topic}`;
                    
                    if (!topicStats[key]) {
                        topicStats[key] = {
                            subject,
                            topic,
                            correct: 0,
                            total: 0,
                            scores: [],
                            difficulties: []
                        };
                    }
                    
                    topicStats[key].total++;
                    
                    // Sprawdź czy odpowiedź była poprawna
                    const userAnswer = result.answers[question.id];
                    if (userAnswer === question.poprawna) {
                        topicStats[key].correct++;
                        topicStats[key].scores.push(100);
                    } else {
                        topicStats[key].scores.push(0);
                    }
                    
                    // Zapisz poziom trudności
                    topicStats[key].difficulties.push(question.poziom || 'podstawowy');
                });
            }
            
            totalScore += result.percentage;
            totalTasks += result.totalQuestions || 0;
        });

        // Oblicz statystyki per temat
        const topicAnalysis = Object.entries(topicStats).map(([key, stats]) => {
            const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
            const successRate = (stats.correct / stats.total) * 100;
            
            // Określ trend (poprawa/pogorszenie)
            let trend = 'stable';
            if (stats.scores.length >= 3) {
                const recent = stats.scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
                const earlier = stats.scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                if (recent > earlier + 10) trend = 'improving';
                else if (recent < earlier - 10) trend = 'declining';
            }
            
            return {
                subject: stats.subject,
                topic: stats.topic,
                avgScore,
                successRate,
                totalTasks: stats.total,
                trend,
                difficulties: stats.difficulties,
                lastAttempt: results[results.length - 1].completedAt
            };
        });

        // Podziel na słabe i mocne strony
        const weakTopics = topicAnalysis
            .filter(t => t.successRate < 60)
            .sort((a, b) => a.successRate - b.successRate);
            
        const strongTopics = topicAnalysis
            .filter(t => t.successRate >= 80)
            .sort((a, b) => b.successRate - a.successRate);
            
        const averageScore = totalScore / results.length;

        // Zapisz analizę
        this.userAnalytics.set(studentId, {
            lastAnalysis: new Date(),
            topicAnalysis,
            weakTopics,
            strongTopics,
            averageScore,
            totalTasks
        });

        return {
            hasData: true,
            weakTopics,
            strongTopics,
            averageScore,
            totalTasks,
            topicAnalysis
        };
    }

    // Generuj rekomendacje zadań
    generateRecommendations(studentId, options = {}) {
        const analysis = this.analyzeStudentPerformance(studentId);
        
        if (!analysis.hasData) {
            return {
                recommendations: [],
                reason: 'Brak danych o wynikach ucznia'
            };
        }

        const {
            maxRecommendations = 10,
            focusOnWeak = true,
            includeMixed = true,
            difficultyProgression = true
        } = options;

        const recommendations = [];
        const allTasks = JSON.parse(localStorage.getItem('zadaniaDB') || '[]')
            .filter(task => !task.deleted);

        // 1. Zadania ze słabych tematów (60% rekomendacji)
        if (focusOnWeak && analysis.weakTopics.length > 0) {
            const weakCount = Math.ceil(maxRecommendations * 0.6);
            
            analysis.weakTopics.forEach(weakTopic => {
                const tasksForTopic = allTasks.filter(task => 
                    task.przedmiot === weakTopic.subject && 
                    task.temat === weakTopic.topic
                );
                
                // Sortuj według poziomu trudności
                if (difficultyProgression) {
                    tasksForTopic.sort((a, b) => {
                        const levels = ['podstawowy', 'średni', 'zaawansowany'];
                        return levels.indexOf(a.poziom || 'podstawowy') - 
                               levels.indexOf(b.poziom || 'podstawowy');
                    });
                }
                
                // Dodaj najlepsze zadania
                tasksForTopic.slice(0, 2).forEach(task => {
                    if (recommendations.length < weakCount) {
                        recommendations.push({
                            task,
                            reason: `Ćwicz słaby temat: ${weakTopic.topic} (${weakTopic.successRate.toFixed(0)}% skuteczności)`,
                            priority: 'high',
                            expectedImprovement: 100 - weakTopic.successRate
                        });
                    }
                });
            });
        }

        // 2. Zadania mieszane - utrzymanie formy (30% rekomendacji)
        if (includeMixed) {
            const mixedCount = Math.ceil(maxRecommendations * 0.3);
            
            // Tematy ze średnimi wynikami (60-80%)
            const mediumTopics = analysis.topicAnalysis
                .filter(t => t.successRate >= 60 && t.successRate < 80)
                .sort((a, b) => a.successRate - b.successRate);
                
            mediumTopics.forEach(topic => {
                const tasksForTopic = allTasks.filter(task => 
                    task.przedmiot === topic.subject && 
                    task.temat === topic.topic &&
                    (task.poziom === 'średni' || task.poziom === 'zaawansowany')
                );
                
                tasksForTopic.slice(0, 1).forEach(task => {
                    if (recommendations.length < weakCount + mixedCount) {
                        recommendations.push({
                            task,
                            reason: `Podnieś poziom w: ${topic.topic}`,
                            priority: 'medium',
                            expectedImprovement: 80 - topic.successRate
                        });
                    }
                });
            });
        }

        // 3. Wyzwania - trudniejsze zadania z mocnych tematów (10% rekomendacji)
        if (analysis.strongTopics.length > 0) {
            const challengeCount = maxRecommendations - recommendations.length;
            
            analysis.strongTopics.slice(0, 3).forEach(strongTopic => {
                const challengeTasks = allTasks.filter(task => 
                    task.przedmiot === strongTopic.subject && 
                    task.temat === strongTopic.topic &&
                    task.poziom === 'zaawansowany'
                );
                
                challengeTasks.slice(0, 1).forEach(task => {
                    if (recommendations.length < maxRecommendations) {
                        recommendations.push({
                            task,
                            reason: `Wyzwanie w mocnym temacie: ${strongTopic.topic}`,
                            priority: 'low',
                            expectedImprovement: 0
                        });
                    }
                });
            });
        }

        // 4. Jeśli brakuje rekomendacji, dodaj losowe zadania
        if (recommendations.length < maxRecommendations) {
            const remainingCount = maxRecommendations - recommendations.length;
            const unusedTasks = allTasks.filter(task => 
                !recommendations.find(r => r.task.id === task.id)
            );
            
            // Losuj zadania
            for (let i = 0; i < remainingCount && i < unusedTasks.length; i++) {
                const randomIndex = Math.floor(Math.random() * unusedTasks.length);
                const task = unusedTasks.splice(randomIndex, 1)[0];
                
                recommendations.push({
                    task,
                    reason: 'Odkryj nowe tematy',
                    priority: 'low',
                    expectedImprovement: 0
                });
            }
        }

        // Sortuj według priorytetu
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        return {
            recommendations: recommendations.slice(0, maxRecommendations),
            analysis: {
                weakTopicsCount: analysis.weakTopics.length,
                strongTopicsCount: analysis.strongTopics.length,
                averageScore: analysis.averageScore
            }
        };
    }

    // Śledź postęp w rekomendacjach
    trackRecommendationProgress(studentId, taskId, result) {
        const key = `recommendation_progress_${studentId}`;
        const progress = JSON.parse(localStorage.getItem(key) || '{}');
        
        if (!progress[taskId]) {
            progress[taskId] = {
                attempts: [],
                firstAttempt: new Date(),
                improved: false
            };
        }
        
        progress[taskId].attempts.push({
            date: new Date(),
            correct: result.correct,
            score: result.score,
            timeSpent: result.timeSpent
        });
        
        // Sprawdź czy nastąpiła poprawa
        if (progress[taskId].attempts.length > 1) {
            const firstScore = progress[taskId].attempts[0].score;
            const lastScore = result.score;
            progress[taskId].improved = lastScore > firstScore;
        }
        
        localStorage.setItem(key, JSON.stringify(progress));
        
        // Zaktualizuj analizę
        this.analyzeStudentPerformance(studentId);
    }

    // Pobierz plan nauki
    generateStudyPlan(studentId, days = 7) {
        const analysis = this.analyzeStudentPerformance(studentId);
        const recommendations = this.generateRecommendations(studentId, {
            maxRecommendations: days * 3 // 3 zadania dziennie
        });
        
        const plan = [];
        const tasksPerDay = 3;
        
        for (let day = 0; day < days; day++) {
            const dayTasks = recommendations.recommendations
                .slice(day * tasksPerDay, (day + 1) * tasksPerDay);
                
            if (dayTasks.length > 0) {
                plan.push({
                    day: day + 1,
                    date: new Date(Date.now() + day * 24 * 60 * 60 * 1000),
                    tasks: dayTasks,
                    focusArea: dayTasks[0].reason.split(':')[0],
                    estimatedTime: dayTasks.length * 15 // 15 minut per zadanie
                });
            }
        }
        
        return {
            plan,
            totalTasks: plan.reduce((sum, day) => sum + day.tasks.length, 0),
            estimatedTotalTime: plan.reduce((sum, day) => sum + day.estimatedTime, 0),
            weakAreasTargeted: analysis.weakTopics.length,
            expectedImprovement: this.calculateExpectedImprovement(analysis, recommendations)
        };
    }

    // Oblicz oczekiwaną poprawę
    calculateExpectedImprovement(analysis, recommendations) {
        if (!analysis.hasData || recommendations.recommendations.length === 0) {
            return 0;
        }
        
        const avgImprovement = recommendations.recommendations
            .reduce((sum, r) => sum + r.expectedImprovement, 0) / 
            recommendations.recommendations.length;
            
        // Zakładamy że uczeń rozwiąże 70% rekomendowanych zadań
        return Math.min(avgImprovement * 0.7, 25); // Max 25% poprawy
    }

    // Pobierz szczegółowe statystyki tematu
    getTopicDetails(studentId, subject, topic) {
        const analysis = this.userAnalytics.get(studentId);
        if (!analysis) {
            this.analyzeStudentPerformance(studentId);
            return null;
        }
        
        const topicData = analysis.topicAnalysis.find(t => 
            t.subject === subject && t.topic === topic
        );
        
        if (!topicData) return null;
        
        // Znajdź wszystkie zadania z tego tematu
        const allTasks = JSON.parse(localStorage.getItem('zadaniaDB') || '[]')
            .filter(task => 
                !task.deleted && 
                task.przedmiot === subject && 
                task.temat === topic
            );
            
        return {
            ...topicData,
            availableTasks: allTasks.length,
            tasksByDifficulty: {
                podstawowy: allTasks.filter(t => t.poziom === 'podstawowy').length,
                średni: allTasks.filter(t => t.poziom === 'średni').length,
                zaawansowany: allTasks.filter(t => t.poziom === 'zaawansowany').length
            }
        };
    }

    /**
     * Pokazuje rekomendacje w modalnym oknie
     */
    showRecommendations() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-lightbulb text-yellow-400 mr-2"></i>
                        Rekomendacje dla Ciebie
                    </h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="grid gap-6">
                    ${this.generateRecommendationsUI()}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return true;
    }

    /**
     * Generuje UI rekomendacji
     */
    generateRecommendationsUI() {
        const recommendations = this.generateRecommendations();
        
        if (recommendations.length === 0) {
            return '<p class="text-gray-400">Brak rekomendacji w tej chwili. Rozwiąż więcej zadań!</p>';
        }
        
        return recommendations.map(rec => `
            <div class="card-modern">
                <div class="flex items-center mb-2">
                    <i class="fas fa-${rec.icon} text-${rec.color}-400 mr-2"></i>
                    <h3 class="font-semibold">${rec.title}</h3>
                </div>
                <p class="text-gray-400 mb-4">${rec.description}</p>
                <button onclick="window.recommendationSystem.applyRecommendation('${rec.id}')" 
                        class="btn-primary">
                    ${rec.action}
                </button>
            </div>
        `).join('');
    }

    /**
     * Aplikuje rekomendację
     */
    applyRecommendation(recommendationId) {
        // Implementacja aplikacji rekomendacji
        alert(`Aplikuję rekomendację: ${recommendationId}`);
        // W przyszłości: przekierowanie do odpowiednich zadań
    }
}

// Eksportuj jako globalną
window.RecommendationSystem = RecommendationSystem;