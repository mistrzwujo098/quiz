// System rywalizacji między uczniami
class CompetitionSystem {
    constructor() {
        this.leaderboards = this.loadLeaderboards();
        this.challenges = this.loadChallenges();
        this.tournaments = this.loadTournaments();
    }

    // Załaduj rankingi
    loadLeaderboards() {
        return JSON.parse(localStorage.getItem('competitionLeaderboards') || JSON.stringify({
            global: [],
            weekly: [],
            monthly: [],
            bySubject: {}
        }));
    }

    // Załaduj wyzwania
    loadChallenges() {
        return JSON.parse(localStorage.getItem('competitionChallenges') || '[]');
    }

    // Załaduj turnieje
    loadTournaments() {
        return JSON.parse(localStorage.getItem('competitionTournaments') || '[]');
    }

    // Zapisz rankingi
    saveLeaderboards() {
        localStorage.setItem('competitionLeaderboards', JSON.stringify(this.leaderboards));
    }

    // Zapisz wyzwania
    saveChallenges() {
        localStorage.setItem('competitionChallenges', JSON.stringify(this.challenges));
    }

    // Zapisz turnieje
    saveTournaments() {
        localStorage.setItem('competitionTournaments', JSON.stringify(this.tournaments));
    }

    // Aktualizuj ranking po zakończeniu testu
    updateLeaderboard(studentId, studentName, examResult) {
        const points = this.calculatePoints(examResult);
        const now = new Date();
        
        // Aktualizuj lub dodaj gracza do rankingów
        this.updatePlayerInLeaderboard('global', studentId, studentName, points);
        this.updatePlayerInLeaderboard('weekly', studentId, studentName, points);
        this.updatePlayerInLeaderboard('monthly', studentId, studentName, points);
        
        // Aktualizuj ranking przedmiotowy
        if (examResult.subject) {
            if (!this.leaderboards.bySubject[examResult.subject]) {
                this.leaderboards.bySubject[examResult.subject] = [];
            }
            this.updatePlayerInLeaderboard(`bySubject.${examResult.subject}`, studentId, studentName, points);
        }
        
        // Wyczyść stare wpisy z rankingów tygodniowych i miesięcznych
        this.cleanupOldEntries();
        
        this.saveLeaderboards();
        
        // Sprawdź osiągnięcia rankingowe
        return this.checkLeaderboardAchievements(studentId);
    }

    // Aktualizuj gracza w konkretnym rankingu
    updatePlayerInLeaderboard(leaderboardPath, studentId, studentName, points) {
        let leaderboard = this.leaderboards;
        const pathParts = leaderboardPath.split('.');
        
        // Nawiguj do właściwego rankingu
        for (let i = 0; i < pathParts.length - 1; i++) {
            leaderboard = leaderboard[pathParts[i]];
        }
        
        const finalKey = pathParts[pathParts.length - 1];
        const board = leaderboard[finalKey];
        
        const existingIndex = board.findIndex(p => p.studentId === studentId);
        
        if (existingIndex >= 0) {
            board[existingIndex].points += points;
            board[existingIndex].lastActivity = new Date();
            board[existingIndex].gamesPlayed++;
        } else {
            board.push({
                studentId,
                studentName,
                points,
                gamesPlayed: 1,
                wins: 0,
                joinedAt: new Date(),
                lastActivity: new Date(),
                badges: []
            });
        }
        
        // Sortuj według punktów
        board.sort((a, b) => b.points - a.points);
        
        // Ogranicz do top 100
        if (board.length > 100) {
            leaderboard[finalKey] = board.slice(0, 100);
        }
    }

    // Oblicz punkty za wynik
    calculatePoints(examResult) {
        let points = 0;
        
        // Podstawowe punkty za procent
        points += Math.floor(examResult.percentage);
        
        // Bonus za perfekcyjny wynik
        if (examResult.percentage === 100) {
            points += 50;
        }
        
        // Bonus za szybkość (jeśli czas < 50% limitu)
        if (examResult.timeSpent && examResult.timeLimit) {
            const timePercent = (examResult.timeSpent / (examResult.timeLimit * 60)) * 100;
            if (timePercent < 50) {
                points += 20;
            } else if (timePercent < 75) {
                points += 10;
            }
        }
        
        // Bonus za trudność
        if (examResult.difficulty === 'zaawansowany') {
            points *= 1.5;
        } else if (examResult.difficulty === 'średni') {
            points *= 1.2;
        }
        
        return Math.floor(points);
    }

    // Wyczyść stare wpisy
    cleanupOldEntries() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Wyczyść tygodniowy ranking
        this.leaderboards.weekly = this.leaderboards.weekly.filter(p => 
            new Date(p.lastActivity) > weekAgo
        );
        
        // Wyczyść miesięczny ranking
        this.leaderboards.monthly = this.leaderboards.monthly.filter(p => 
            new Date(p.lastActivity) > monthAgo
        );
    }

    // Sprawdź osiągnięcia rankingowe
    checkLeaderboardAchievements(studentId) {
        const achievements = [];
        
        // Sprawdź pozycję w globalnym rankingu
        const globalPosition = this.leaderboards.global.findIndex(p => p.studentId === studentId) + 1;
        
        if (globalPosition === 1) {
            achievements.push({
                id: 'global_first',
                name: 'Mistrz Rankingu',
                description: 'Zajmij 1. miejsce w globalnym rankingu',
                icon: '👑',
                points: 100
            });
        } else if (globalPosition <= 3) {
            achievements.push({
                id: 'global_top3',
                name: 'Podium',
                description: 'Zajmij miejsce w top 3 globalnego rankingu',
                icon: '🥇',
                points: 50
            });
        } else if (globalPosition <= 10) {
            achievements.push({
                id: 'global_top10',
                name: 'Top 10',
                description: 'Zajmij miejsce w top 10 globalnego rankingu',
                icon: '🏆',
                points: 25
            });
        }
        
        return achievements;
    }

    // Stwórz wyzwanie 1v1
    createChallenge(challengerData) {
        const challenge = {
            id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            challengerId: challengerData.challengerId,
            challengerName: challengerData.challengerName,
            opponentId: challengerData.opponentId,
            opponentName: challengerData.opponentName,
            subject: challengerData.subject,
            questionsCount: challengerData.questionsCount || 10,
            timeLimit: challengerData.timeLimit || 15,
            status: 'pending', // pending, accepted, rejected, completed
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            results: {
                challenger: null,
                opponent: null
            },
            winner: null
        };
        
        this.challenges.push(challenge);
        this.saveChallenges();
        
        return challenge;
    }

    // Zaakceptuj wyzwanie
    acceptChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.status !== 'pending') return false;
        
        challenge.status = 'accepted';
        challenge.acceptedAt = new Date();
        
        this.saveChallenges();
        return true;
    }

    // Odrzuć wyzwanie
    rejectChallenge(challengeId) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.status !== 'pending') return false;
        
        challenge.status = 'rejected';
        challenge.rejectedAt = new Date();
        
        this.saveChallenges();
        return true;
    }

    // Zapisz wynik wyzwania
    submitChallengeResult(challengeId, playerId, result) {
        const challenge = this.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.status !== 'accepted') return false;
        
        if (playerId === challenge.challengerId) {
            challenge.results.challenger = result;
        } else if (playerId === challenge.opponentId) {
            challenge.results.opponent = result;
        } else {
            return false;
        }
        
        // Sprawdź czy obaj ukończyli
        if (challenge.results.challenger && challenge.results.opponent) {
            challenge.status = 'completed';
            challenge.completedAt = new Date();
            
            // Określ zwycięzcę
            if (challenge.results.challenger.score > challenge.results.opponent.score) {
                challenge.winner = challenge.challengerId;
            } else if (challenge.results.opponent.score > challenge.results.challenger.score) {
                challenge.winner = challenge.opponentId;
            } else {
                challenge.winner = 'draw';
            }
            
            // Przyznaj punkty rankingowe
            if (challenge.winner !== 'draw') {
                const winner = this.leaderboards.global.find(p => p.studentId === challenge.winner);
                if (winner) {
                    winner.points += 30; // Bonus za wygranie wyzwania
                    winner.wins++;
                }
            }
        }
        
        this.saveChallenges();
        this.saveLeaderboards();
        return true;
    }

    // Pobierz wyzwania dla ucznia
    getChallengesForStudent(studentId) {
        const now = new Date();
        
        return {
            incoming: this.challenges.filter(c => 
                c.opponentId === studentId && 
                c.status === 'pending' &&
                new Date(c.expiresAt) > now
            ),
            outgoing: this.challenges.filter(c => 
                c.challengerId === studentId && 
                c.status === 'pending'
            ),
            active: this.challenges.filter(c => 
                (c.challengerId === studentId || c.opponentId === studentId) &&
                c.status === 'accepted'
            ),
            completed: this.challenges.filter(c => 
                (c.challengerId === studentId || c.opponentId === studentId) &&
                c.status === 'completed'
            ).slice(-10) // Ostatnie 10
        };
    }

    // Stwórz turniej
    createTournament(tournamentData) {
        const tournament = {
            id: `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: tournamentData.name,
            description: tournamentData.description || '',
            type: tournamentData.type || 'elimination', // elimination, round_robin, swiss
            subject: tournamentData.subject,
            maxParticipants: tournamentData.maxParticipants || 16,
            participants: [],
            startDate: tournamentData.startDate,
            endDate: tournamentData.endDate,
            status: 'registration', // registration, ongoing, completed
            createdBy: tournamentData.createdBy,
            createdAt: new Date(),
            rounds: [],
            prizes: tournamentData.prizes || {
                first: { points: 500, badge: 'Mistrz Turnieju' },
                second: { points: 300, badge: 'Wicemistrz' },
                third: { points: 150, badge: 'Brązowy Medal' }
            }
        };
        
        this.tournaments.push(tournament);
        this.saveTournaments();
        
        return tournament;
    }

    // Dołącz do turnieju
    joinTournament(tournamentId, studentId, studentName) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament || tournament.status !== 'registration') return false;
        
        if (tournament.participants.length >= tournament.maxParticipants) {
            return { success: false, reason: 'Turniej pełny' };
        }
        
        if (tournament.participants.find(p => p.studentId === studentId)) {
            return { success: false, reason: 'Już jesteś zapisany' };
        }
        
        tournament.participants.push({
            studentId,
            studentName,
            joinedAt: new Date(),
            score: 0,
            wins: 0,
            losses: 0,
            position: null
        });
        
        this.saveTournaments();
        return { success: true };
    }

    // Pobierz aktywne turnieje
    getActiveTournaments() {
        const now = new Date();
        
        return this.tournaments.filter(t => 
            t.status === 'registration' || 
            (t.status === 'ongoing' && new Date(t.endDate) > now)
        );
    }

    // Pobierz statystyki rywalizacji
    getCompetitionStats(studentId) {
        const player = this.leaderboards.global.find(p => p.studentId === studentId);
        const challenges = this.getChallengesForStudent(studentId);
        
        const wonChallenges = challenges.completed.filter(c => c.winner === studentId).length;
        const totalChallenges = challenges.completed.length;
        
        return {
            globalRank: this.leaderboards.global.findIndex(p => p.studentId === studentId) + 1,
            totalPlayers: this.leaderboards.global.length,
            points: player?.points || 0,
            gamesPlayed: player?.gamesPlayed || 0,
            challengesWon: wonChallenges,
            challengesTotal: totalChallenges,
            winRate: totalChallenges > 0 ? (wonChallenges / totalChallenges) * 100 : 0,
            badges: player?.badges || [],
            weeklyRank: this.leaderboards.weekly.findIndex(p => p.studentId === studentId) + 1,
            monthlyRank: this.leaderboards.monthly.findIndex(p => p.studentId === studentId) + 1
        };
    }

    // Pobierz ranking
    getLeaderboard(type = 'global', limit = 10) {
        let board = [];
        
        if (type.startsWith('subject:')) {
            const subject = type.split(':')[1];
            board = this.leaderboards.bySubject[subject] || [];
        } else {
            board = this.leaderboards[type] || [];
        }
        
        return board.slice(0, limit).map((player, index) => ({
            ...player,
            rank: index + 1
        }));
    }
}

// Eksportuj jako globalną
window.CompetitionSystem = CompetitionSystem;