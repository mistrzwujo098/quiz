// System osiągnięć dla uczniów
class AchievementsSystem {
    constructor() {
        this.achievements = this.loadAchievements();
        this.userProgress = this.loadUserProgress();
    }

    // Definicje osiągnięć
    getAchievementDefinitions() {
        return [
            // Osiągnięcia za liczbę rozwiązanych zadań
            { id: 'first_task', name: 'Pierwszy krok', description: 'Rozwiąż pierwsze zadanie', icon: '🎯', points: 10, condition: (stats) => stats.totalTasks >= 1 },
            { id: 'task_10', name: 'Początkujący', description: 'Rozwiąż 10 zadań', icon: '📚', points: 25, condition: (stats) => stats.totalTasks >= 10 },
            { id: 'task_50', name: 'Pilny uczeń', description: 'Rozwiąż 50 zadań', icon: '📖', points: 50, condition: (stats) => stats.totalTasks >= 50 },
            { id: 'task_100', name: 'Mistrz zadań', description: 'Rozwiąż 100 zadań', icon: '🏆', points: 100, condition: (stats) => stats.totalTasks >= 100 },
            
            // Osiągnięcia za skuteczność
            { id: 'perfect_10', name: 'Perfekcjonista', description: 'Uzyskaj 100% w 10 testach', icon: '⭐', points: 50, condition: (stats) => stats.perfectScores >= 10 },
            { id: 'high_avg', name: 'Świetny wynik', description: 'Utrzymaj średnią powyżej 80%', icon: '📈', points: 75, condition: (stats) => stats.averageScore >= 80 && stats.totalTasks >= 20 },
            
            // Osiągnięcia za systematyczność
            { id: 'streak_7', name: 'Tydzień nauki', description: 'Ucz się codziennie przez 7 dni', icon: '🔥', points: 30, condition: (stats) => stats.dailyStreak >= 7 },
            { id: 'streak_30', name: 'Miesiąc nauki', description: 'Ucz się codziennie przez 30 dni', icon: '💪', points: 100, condition: (stats) => stats.dailyStreak >= 30 },
            
            // Osiągnięcia tematyczne
            { id: 'math_master', name: 'Matematyk', description: 'Rozwiąż 20 zadań z matematyki', icon: '🔢', points: 40, condition: (stats) => (stats.subjectTasks['Matematyka'] || 0) >= 20 },
            { id: 'physics_master', name: 'Fizyk', description: 'Rozwiąż 20 zadań z fizyki', icon: '⚛️', points: 40, condition: (stats) => (stats.subjectTasks['Fizyka'] || 0) >= 20 },
            
            // Osiągnięcia specjalne
            { id: 'no_hints', name: 'Bez pomocy', description: 'Ukończ 10 zadań bez podpowiedzi', icon: '🧠', points: 60, condition: (stats) => stats.tasksWithoutHints >= 10 },
            { id: 'comeback', name: 'Powrót do formy', description: 'Popraw wynik o 20% w ciągu tygodnia', icon: '📊', points: 50, condition: (stats) => stats.weeklyImprovement >= 20 }
        ];
    }

    // Załaduj osiągnięcia użytkownika
    loadAchievements() {
        return JSON.parse(localStorage.getItem('userAchievements') || '[]');
    }

    // Załaduj postępy użytkownika
    loadUserProgress() {
        const defaultProgress = {
            totalTasks: 0,
            perfectScores: 0,
            averageScore: 0,
            dailyStreak: 0,
            lastActivityDate: null,
            subjectTasks: {},
            tasksWithoutHints: 0,
            weeklyScores: [],
            totalPoints: 0
        };
        return JSON.parse(localStorage.getItem('userProgress') || JSON.stringify(defaultProgress));
    }

    // Zapisz osiągnięcia
    saveAchievements() {
        localStorage.setItem('userAchievements', JSON.stringify(this.achievements));
    }

    // Zapisz postępy
    saveUserProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    // Zaktualizuj postępy po rozwiązaniu zadania
    updateProgress(taskResult) {
        // Zwiększ liczbę zadań
        this.userProgress.totalTasks++;
        
        // Aktualizuj zadania per przedmiot
        const subject = taskResult.subject || 'Inne';
        this.userProgress.subjectTasks[subject] = (this.userProgress.subjectTasks[subject] || 0) + 1;
        
        // Sprawdź perfect score
        if (taskResult.percentage === 100) {
            this.userProgress.perfectScores++;
        }
        
        // Aktualizuj średnią
        const allResults = JSON.parse(localStorage.getItem('examResults') || '[]');
        const userResults = allResults.filter(r => r.studentId === taskResult.studentId);
        if (userResults.length > 0) {
            const sum = userResults.reduce((acc, r) => acc + r.percentage, 0);
            this.userProgress.averageScore = sum / userResults.length;
        }
        
        // Sprawdź daily streak
        const today = new Date().toDateString();
        const lastActivity = this.userProgress.lastActivityDate;
        
        if (!lastActivity) {
            this.userProgress.dailyStreak = 1;
        } else {
            const lastDate = new Date(lastActivity);
            const daysDiff = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                this.userProgress.dailyStreak++;
            } else if (daysDiff > 1) {
                this.userProgress.dailyStreak = 1;
            }
        }
        
        this.userProgress.lastActivityDate = today;
        
        // Sprawdź zadania bez podpowiedzi
        if (!taskResult.hintsUsed || taskResult.hintsUsed === 0) {
            this.userProgress.tasksWithoutHints++;
        }
        
        // Aktualizuj tygodniowe wyniki
        this.userProgress.weeklyScores.push({
            date: new Date(),
            score: taskResult.percentage
        });
        
        // Zachowaj tylko wyniki z ostatnich 7 dni
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        this.userProgress.weeklyScores = this.userProgress.weeklyScores.filter(s => new Date(s.date) > weekAgo);
        
        // Oblicz poprawę tygodniową
        if (this.userProgress.weeklyScores.length >= 2) {
            const firstHalf = this.userProgress.weeklyScores.slice(0, Math.floor(this.userProgress.weeklyScores.length / 2));
            const secondHalf = this.userProgress.weeklyScores.slice(Math.floor(this.userProgress.weeklyScores.length / 2));
            
            const avgFirst = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
            
            this.userProgress.weeklyImprovement = avgSecond - avgFirst;
        }
        
        this.saveUserProgress();
        
        // Sprawdź nowe osiągnięcia
        return this.checkNewAchievements();
    }

    // Sprawdź czy są nowe osiągnięcia
    checkNewAchievements() {
        const newAchievements = [];
        const definitions = this.getAchievementDefinitions();
        
        for (const achievement of definitions) {
            // Sprawdź czy osiągnięcie nie zostało już zdobyte
            if (!this.achievements.find(a => a.id === achievement.id)) {
                // Sprawdź warunek
                if (achievement.condition(this.userProgress)) {
                    // Dodaj osiągnięcie
                    const earnedAchievement = {
                        ...achievement,
                        earnedAt: new Date(),
                        condition: undefined // Usuń funkcję przed zapisem
                    };
                    
                    this.achievements.push(earnedAchievement);
                    newAchievements.push(earnedAchievement);
                    
                    // Dodaj punkty
                    this.userProgress.totalPoints += achievement.points;
                }
            }
        }
        
        if (newAchievements.length > 0) {
            this.saveAchievements();
            this.saveUserProgress();
        }
        
        return newAchievements;
    }

    // Pobierz wszystkie osiągnięcia (zdobyte i niezdobyte)
    getAllAchievements() {
        const definitions = this.getAchievementDefinitions();
        return definitions.map(def => {
            const earned = this.achievements.find(a => a.id === def.id);
            return {
                ...def,
                earned: !!earned,
                earnedAt: earned?.earnedAt,
                condition: undefined
            };
        });
    }

    // Pobierz statystyki osiągnięć
    getAchievementStats() {
        const all = this.getAllAchievements();
        return {
            total: all.length,
            earned: all.filter(a => a.earned).length,
            percentage: Math.round((all.filter(a => a.earned).length / all.length) * 100),
            totalPoints: this.userProgress.totalPoints
        };
    }

    // Reset osiągnięć (do testów)
    resetAchievements() {
        this.achievements = [];
        this.userProgress = this.loadUserProgress();
        this.userProgress.totalTasks = 0;
        this.userProgress.perfectScores = 0;
        this.userProgress.averageScore = 0;
        this.userProgress.dailyStreak = 0;
        this.userProgress.lastActivityDate = null;
        this.userProgress.subjectTasks = {};
        this.userProgress.tasksWithoutHints = 0;
        this.userProgress.weeklyScores = [];
        this.userProgress.totalPoints = 0;
        this.saveAchievements();
        this.saveUserProgress();
    }
}

// Eksportuj jako globalną
window.AchievementsSystem = AchievementsSystem;