// Generator danych testowych dla QuizMaster
class TestDataGenerator {
    constructor() {
        this.studentNames = [
            'Anna Kowalska', 'Piotr Nowak', 'Katarzyna Wiśniewska', 'Michał Wójcik',
            'Magdalena Kowalczyk', 'Jakub Kamiński', 'Natalia Lewandowska', 'Mateusz Zieliński',
            'Aleksandra Szymańska', 'Bartosz Woźniak', 'Julia Dąbrowska', 'Szymon Kozłowski',
            'Wiktoria Jankowska', 'Filip Mazur', 'Zuzanna Krawczyk', 'Dominik Piotrowski',
            'Oliwia Grabowska', 'Kacper Pawłowski', 'Maja Michalska', 'Adrian Adamczyk'
        ];
        
        this.categories = ['Egzamin ósmoklasisty', 'Matura podstawowa', 'Matura rozszerzona'];
        this.subjects = ['Matematyka', 'Fizyka', 'Chemia', 'Biologia', 'Geografia'];
        this.topics = {
            'Matematyka': ['Geometria', 'Algebra', 'Procenty', 'Funkcje', 'Statystyka'],
            'Fizyka': ['Mechanika', 'Termodynamika', 'Elektryczność', 'Optyka', 'Fale'],
            'Chemia': ['Reakcje chemiczne', 'Układ okresowy', 'Związki organiczne', 'Kwasy i zasady'],
            'Biologia': ['Komórka', 'Genetyka', 'Ekologia', 'Anatomia człowieka'],
            'Geografia': ['Klimat', 'Ukształtowanie terenu', 'Gospodarka', 'Mapy']
        };
    }

    // Generuj dane testowe
    generateTestData() {
        console.log('🎯 Generowanie danych testowych...');
        
        // 1. Utwórz użytkowników
        this.createTestUsers();
        
        // 2. Utwórz grupy
        this.createTestGroups();
        
        // 3. Generuj wyniki egzaminów
        this.generateExamResults();
        
        // 4. Generuj osiągnięcia
        this.generateAchievements();
        
        // 5. Generuj harmonogram
        this.generateSchedule();
        
        // 6. Generuj wyzwania i ranking
        this.generateCompetitionData();
        
        // 7. Generuj szablony arkuszy
        this.generateExamTemplates();
        
        // 8. Generuj komentarze nauczyciela
        this.generateTeacherComments();
        
        console.log('✅ Dane testowe wygenerowane pomyślnie!');
    }

    // 1. Tworzenie użytkowników
    createTestUsers() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Dodaj uczniów jeśli nie istnieją
        this.studentNames.forEach((name, index) => {
            const username = name.toLowerCase().replace(' ', '.');
            const userId = 1000 + index;
            
            if (!users.find(u => u.id === userId || u.username === username)) {
                users.push({
                    id: userId,
                    userId: userId, // dla kompatybilności wstecznej
                    username: username,
                    password: CryptoJS.SHA256('haslo123').toString(),
                    role: 'student',
                    category: this.categories[index % 3],
                    createdAt: new Date()
                });
            }
        });
        
        // Dodaj nauczycieli testowych
        const testTeachers = [
            { username: 'jan.kowalski', name: 'Jan Kowalski', userId: 2001 },
            { username: 'maria.nowak', name: 'Maria Nowak', userId: 2002 }
        ];
        
        testTeachers.forEach(teacher => {
            if (!users.find(u => u.id === teacher.userId || u.username === teacher.username)) {
                users.push({
                    id: teacher.userId,
                    userId: teacher.userId, // dla kompatybilności wstecznej
                    username: teacher.username,
                    password: CryptoJS.SHA256('nauczyciel123').toString(),
                    role: 'teacher',
                    createdAt: new Date()
                });
            }
        });
        
        localStorage.setItem('users', JSON.stringify(users));
        console.log(`✓ Utworzono ${this.studentNames.length} uczniów i ${testTeachers.length} nauczycieli`);
    }

    // 2. Tworzenie grup
    createTestGroups() {
        const groups = [
            { id: 1, name: 'Klasa 8A', students: [1000, 1001, 1002, 1003, 1004, 1005] },
            { id: 2, name: 'Klasa 8B', students: [1006, 1007, 1008, 1009, 1010, 1011] },
            { id: 3, name: 'Maturzyści podstawowi', students: [1012, 1013, 1014, 1015] },
            { id: 4, name: 'Maturzyści rozszerzeni', students: [1016, 1017, 1018, 1019] }
        ];
        
        localStorage.setItem('studentGroups', JSON.stringify(groups));
        console.log(`✓ Utworzono ${groups.length} grup uczniów`);
    }

    // 3. Generowanie wyników egzaminów
    generateExamResults() {
        const results = [];
        const tasks = JSON.parse(localStorage.getItem('zadaniaDB') || '[]');
        
        // Dla każdego ucznia generuj 5-10 wyników
        for (let i = 0; i < 20; i++) {
            const studentId = 1000 + i;
            const studentName = this.studentNames[i];
            const resultsCount = 5 + Math.floor(Math.random() * 6);
            
            for (let j = 0; j < resultsCount; j++) {
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Ostatnie 30 dni
                
                // Losuj zadania
                const questionsCount = 10 + Math.floor(Math.random() * 11);
                const selectedTasks = this.selectRandomTasks(tasks, questionsCount);
                const answers = {};
                let correct = 0;
                
                selectedTasks.forEach(task => {
                    // Symuluj odpowiedzi (70% szans na poprawną)
                    const isCorrect = Math.random() < 0.7;
                    if (task.typ === 'zamkniete' && task.odpowiedzi) {
                        answers[task.id] = isCorrect ? task.poprawna : task.odpowiedzi[Math.floor(Math.random() * task.odpowiedzi.length)];
                        if (isCorrect) correct++;
                    }
                });
                
                results.push({
                    examId: Date.now() + Math.random(),
                    examTitle: `Test z ${this.subjects[j % 5]}`,
                    studentName: studentName,
                    studentId: studentId,
                    category: this.categories[i % 3],
                    correctAnswers: correct,
                    totalQuestions: questionsCount,
                    earnedPoints: correct,
                    totalPoints: questionsCount,
                    percentage: Math.round((correct / questionsCount) * 100),
                    completedAt: date.toISOString(),
                    timeSpent: 600 + Math.floor(Math.random() * 1800), // 10-40 minut
                    answers: answers,
                    questions: selectedTasks,
                    subject: this.subjects[j % 5]
                });
            }
        }
        
        // Sortuj według daty
        results.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        
        localStorage.setItem('examResults', JSON.stringify(results));
        console.log(`✓ Wygenerowano ${results.length} wyników egzaminów`);
    }

    // 4. Generowanie osiągnięć
    generateAchievements() {
        // Dla każdego ucznia wygeneruj postępy
        for (let i = 0; i < 20; i++) {
            const studentId = 1000 + i;
            const progress = {
                totalTasks: 20 + Math.floor(Math.random() * 80),
                perfectScores: Math.floor(Math.random() * 10),
                averageScore: 60 + Math.floor(Math.random() * 30),
                dailyStreak: Math.floor(Math.random() * 15),
                lastActivityDate: new Date().toDateString(),
                subjectTasks: {
                    'Matematyka': 5 + Math.floor(Math.random() * 20),
                    'Fizyka': 5 + Math.floor(Math.random() * 20),
                    'Chemia': 5 + Math.floor(Math.random() * 15)
                },
                tasksWithoutHints: Math.floor(Math.random() * 15),
                weeklyScores: [],
                totalPoints: 100 + Math.floor(Math.random() * 400)
            };
            
            localStorage.setItem(`userProgress_${studentId}`, JSON.stringify(progress));
        }
        
        console.log('✓ Wygenerowano postępy i osiągnięcia dla uczniów');
    }

    // 5. Generowanie harmonogramu
    generateSchedule() {
        const scheduler = new ExamScheduler();
        const today = new Date();
        
        // Generuj wydarzenia na najbliższe 30 dni
        const events = [
            { title: 'Sprawdzian z matematyki - geometria', type: 'exam', daysFromNow: 3, subject: 'Matematyka' },
            { title: 'Kartkówka z fizyki - ruch', type: 'quiz', daysFromNow: 5, subject: 'Fizyka' },
            { title: 'Egzamin próbny', type: 'exam', daysFromNow: 7, subject: 'Matematyka' },
            { title: 'Test z chemii', type: 'exam', daysFromNow: 10, subject: 'Chemia' },
            { title: 'Zadanie domowe - funkcje', type: 'homework', daysFromNow: 2, subject: 'Matematyka' },
            { title: 'Projekt z biologii', type: 'homework', daysFromNow: 14, subject: 'Biologia' }
        ];
        
        events.forEach(event => {
            const date = new Date(today);
            date.setDate(date.getDate() + event.daysFromNow);
            
            scheduler.addEvent({
                title: event.title,
                type: event.type,
                date: date.toISOString().split('T')[0],
                time: '09:00',
                duration: event.type === 'exam' ? 90 : 45,
                subject: event.subject,
                targetGroups: [1, 2], // Klasy 8A i 8B
                createdBy: 'paulinaodmatematyki',
                reminders: [24, 48] // Przypomnienia 24h i 48h przed
            });
        });
        
        console.log(`✓ Wygenerowano ${events.length} wydarzeń w harmonogramie`);
    }

    // 6. Generowanie danych rywalizacji
    generateCompetitionData() {
        const competitionSystem = new CompetitionSystem();
        
        // Generuj punkty rankingowe
        const examResults = JSON.parse(localStorage.getItem('examResults') || '[]');
        examResults.forEach(result => {
            competitionSystem.updateLeaderboard(
                result.studentId,
                result.studentName,
                result
            );
        });
        
        // Generuj wyzwania
        const challenges = [
            { challenger: 1000, opponent: 1001, subject: 'Matematyka' },
            { challenger: 1002, opponent: 1003, subject: 'Fizyka' },
            { challenger: 1004, opponent: 1005, subject: 'Chemia' }
        ];
        
        challenges.forEach(ch => {
            competitionSystem.createChallenge({
                challengerId: ch.challenger,
                challengerName: this.studentNames[ch.challenger - 1000],
                opponentId: ch.opponent,
                opponentName: this.studentNames[ch.opponent - 1000],
                subject: ch.subject,
                questionsCount: 10,
                timeLimit: 15
            });
        });
        
        // Generuj turniej
        competitionSystem.createTournament({
            name: 'Turniej Matematyczny',
            description: 'Miesięczny turniej z matematyki dla klas 8',
            subject: 'Matematyka',
            maxParticipants: 16,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: 'paulinaodmatematyki'
        });
        
        console.log('✓ Wygenerowano dane rywalizacji i rankingów');
    }

    // 7. Generowanie szablonów arkuszy
    generateExamTemplates() {
        const templatesBank = new ExamTemplatesBank();
        const tasks = JSON.parse(localStorage.getItem('zadaniaDB') || '[]');
        
        const templates = [
            {
                name: 'Test geometria podstawowa',
                description: 'Podstawowe zadania z geometrii dla klasy 8',
                subject: 'Matematyka',
                level: 'podstawowy',
                tags: ['geometria', 'klasa8', 'podstawy']
            },
            {
                name: 'Sprawdzian funkcje',
                description: 'Funkcje liniowe i kwadratowe',
                subject: 'Matematyka',
                level: 'średni',
                tags: ['funkcje', 'algebra', 'matura']
            },
            {
                name: 'Test mechanika',
                description: 'Ruch, siły, energia',
                subject: 'Fizyka',
                level: 'podstawowy',
                tags: ['mechanika', 'fizyka', 'podstawy']
            }
        ];
        
        templates.forEach(template => {
            const selectedTasks = this.selectRandomTasks(tasks, 15);
            templatesBank.saveAsTemplate(
                {
                    title: template.name,
                    timeLimit: 45,
                    questions: selectedTasks,
                    targetCategories: ['Egzamin ósmoklasisty', 'Matura podstawowa']
                },
                {
                    ...template,
                    createdBy: 'paulinaodmatematyki'
                }
            );
        });
        
        // Udostępnij pierwszy szablon
        const savedTemplates = templatesBank.loadTemplates();
        if (savedTemplates.length > 0) {
            templatesBank.shareTemplate(savedTemplates[0].id, 'paulinaodmatematyki');
        }
        
        console.log(`✓ Wygenerowano ${templates.length} szablonów arkuszy`);
    }

    // 8. Generowanie komentarzy nauczyciela
    generateTeacherComments() {
        const comments = {};
        const results = JSON.parse(localStorage.getItem('examResults') || '[]');
        
        const sampleComments = [
            'Świetna praca! Widać postępy w rozwiązywaniu zadań.',
            'Zwróć uwagę na zadania z geometrii - warto je poćwiczyć.',
            'Bardzo dobry wynik. Tak trzymaj!',
            'Popracuj nad zadaniami z procentów.',
            'Widać systematyczną pracę. Gratulacje!',
            'Spróbuj rozwiązywać zadania wolniej i dokładniej.',
            'Dobry wynik, ale można lepiej. Ćwicz dalej!',
            'Brawo! Doskonale opanowany materiał.',
            'Skup się na zadaniach tekstowych.',
            'Świetnie radzisz sobie z algebrą!'
        ];
        
        // Dodaj komentarze do 30% wyników
        results.slice(0, Math.floor(results.length * 0.3)).forEach((result, index) => {
            const key = `${result.studentId}_${result.examId}_${result.completedAt}`;
            comments[key] = sampleComments[index % sampleComments.length];
        });
        
        localStorage.setItem('examComments', JSON.stringify(comments));
        console.log(`✓ Wygenerowano ${Object.keys(comments).length} komentarzy nauczyciela`);
    }

    // Pomocnicze funkcje
    selectRandomTasks(tasks, count) {
        const shuffled = [...tasks].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, tasks.length));
    }

    // Wyczyść wszystkie dane testowe
    clearTestData() {
        const keysToRemove = [
            'examResults',
            'studentGroups',
            'examScheduleEvents',
            'competitionLeaderboards',
            'competitionChallenges',
            'competitionTournaments',
            'examTemplates',
            'sharedExamTemplates',
            'examComments'
        ];
        
        // Usuń klucze główne
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Usuń klucze per użytkownik
        for (let i = 0; i < 20; i++) {
            const studentId = 1000 + i;
            localStorage.removeItem(`userProgress_${studentId}`);
            localStorage.removeItem(`userAchievements_${studentId}`);
            localStorage.removeItem(`recommendation_progress_${studentId}`);
        }
        
        // Usuń testowych użytkowników
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const filteredUsers = users.filter(u => u.userId < 1000 || u.userId > 2999);
        localStorage.setItem('users', JSON.stringify(filteredUsers));
        
        console.log('✓ Dane testowe zostały wyczyszczone');
    }
}

// Eksportuj jako globalną
window.TestDataGenerator = TestDataGenerator;

// Automatycznie wygeneruj dane przy ładowaniu
document.addEventListener('DOMContentLoaded', () => {
    const generator = new TestDataGenerator();
    
    // Sprawdź czy dane testowe już istnieją
    const hasTestData = localStorage.getItem('testDataGenerated');
    
    if (!hasTestData) {
        console.log('🚀 Pierwsz uruchomienie - generowanie danych testowych...');
        generator.generateTestData();
        localStorage.setItem('testDataGenerated', 'true');
    } else {
        console.log('ℹ️ Dane testowe już istnieją. Użyj TestDataGenerator.clearTestData() aby wyczyścić.');
    }
});