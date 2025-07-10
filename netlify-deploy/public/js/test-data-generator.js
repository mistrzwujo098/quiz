/**
 * Generator kompleksowych danych testowych dla QuizMaster
 * Zawiera dane dla uczniów, nauczycieli i rodziców
 */

class TestDataGenerator {
    constructor() {
        this.currentDate = new Date();
        this.schoolYear = this.currentDate.getMonth() < 7 ? 
            `${this.currentDate.getFullYear() - 1}/${this.currentDate.getFullYear()}` : 
            `${this.currentDate.getFullYear()}/${this.currentDate.getFullYear() + 1}`;
    }

    /**
     * Hashuje hasło używając SHA256
     */
    hashPassword(password) {
        // Prosta implementacja SHA256 - dla kompatybilności z systemem logowania
        if (typeof CryptoJS !== 'undefined') {
            return CryptoJS.SHA256(password).toString();
        }
        
        // Jeśli CryptoJS nie jest załadowany, spróbuj go załadować
        if (!window.cryptoJSLoaded) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
            document.head.appendChild(script);
            window.cryptoJSLoaded = true;
            console.warn('Ładowanie CryptoJS... Wygeneruj dane ponownie za chwilę.');
        }
        
        // Tymczasowy fallback - prosta funkcja hashująca
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    /**
     * Generuje kompletny zestaw danych testowych
     */
    generateCompleteTestData() {
        console.log('🎯 Generowanie kompleksowych danych testowych...');
        
        // 1. Użytkownicy
        const students = this.generateStudents();
        const teachers = this.generateTeachers();
        const parents = this.generateParents(students);
        
        // 2. Klasy i przedmioty
        const classes = this.generateClasses();
        const subjects = this.generateSubjects();
        
        // 3. Quizy i zadania
        const quizzes = this.generateQuizzes(subjects);
        const tasks = this.generateTasks(subjects);
        
        // 4. Wyniki i statystyki
        const results = this.generateResults(students, quizzes);
        const statistics = this.generateStatistics(results);
        
        // 5. Plany lekcji i wydarzenia
        const schedules = this.generateSchedules(classes, subjects, teachers);
        const events = this.generateEvents();
        
        // 6. Wiadomości i powiadomienia
        const messages = this.generateMessages(teachers, parents, students);
        const notifications = this.generateNotifications();
        
        return {
            users: {
                students,
                teachers,
                parents
            },
            academic: {
                classes,
                subjects,
                schedules
            },
            content: {
                quizzes,
                tasks
            },
            performance: {
                results,
                statistics
            },
            communication: {
                messages,
                notifications,
                events
            }
        };
    }

    /**
     * Generuje uczniów
     */
    generateStudents() {
        const students = [];
        const firstNames = ['Anna', 'Jan', 'Maria', 'Piotr', 'Katarzyna', 'Michał', 'Agnieszka', 'Krzysztof', 'Barbara', 'Andrzej', 'Małgorzata', 'Tomasz', 'Ewa', 'Paweł', 'Magdalena'];
        const lastNames = ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak'];
        
        const classes = ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b'];
        
        let id = 1000;
        
        // Generuj 5-8 uczniów na klasę
        classes.forEach(className => {
            const studentsInClass = 5 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < studentsInClass; i++) {
                const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@szkola.edu.pl`;
                
                students.push({
                    id: `student_${id}`,
                    userId: `student_${id}`, // dla kompatybilności
                    username: email, // system logowania używa username, nie email
                    imie: firstName,
                    nazwisko: lastName,
                    email: email,
                    password: this.hashPassword('Test123!'), // AuthManager szuka 'password'
                    haslo: this.hashPassword('Test123!'), // zachowaj dla kompatybilności
                    role: 'student', // AuthManager używa 'role'
                    rola: 'student', // zachowaj dla kompatybilności
                    klasa: className,
                    numerDziennika: i + 1,
                    dataUrodzenia: this.generateBirthDate(className),
                    pesel: this.generatePESEL(),
                    adres: this.generateAddress(),
                    telefon: this.generatePhoneNumber(),
                    aktywny: true,
                    dataRejestracji: new Date(2024, 8, 1).toISOString(),
                    ostatnieLogowanie: this.generateRecentDate(),
                    zdjecie: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
                    osiagniecia: this.generateAchievements(),
                    statystyki: {
                        quizyRozwiazane: Math.floor(Math.random() * 50),
                        sredniaOcen: 3.5 + Math.random() * 1.5,
                        punktyXP: Math.floor(Math.random() * 5000),
                        poziom: Math.floor(Math.random() * 20) + 1,
                        seria: Math.floor(Math.random() * 30)
                    }
                });
                
                id++;
            }
        });
        
        // Dodaj specjalnych uczniów testowych
        students.push(
            {
                id: 'student_demo',
                userId: 'student_demo',
                username: 'uczen@demo.pl',
                imie: 'Demo',
                nazwisko: 'Uczeń',
                email: 'uczen@demo.pl',
                password: this.hashPassword('demo123'),
                haslo: this.hashPassword('demo123'),
                role: 'student',
                rola: 'student',
                klasa: '8a',
                numerDziennika: 1,
                dataUrodzenia: '2010-05-15',
                aktywny: true,
                statystyki: {
                    quizyRozwiazane: 127,
                    sredniaOcen: 4.75,
                    punktyXP: 12500,
                    poziom: 25,
                    seria: 45
                },
                osiagniecia: ['quiz_master', 'perfect_week', 'speed_demon', 'knowledge_seeker']
            },
            {
                id: 'student_test',
                imie: 'Test',
                nazwisko: 'Student',
                email: 'test.student@szkola.pl',
                haslo: this.hashPassword('test123'),
                rola: 'student',
                klasa: '7b',
                numerDziennika: 15,
                aktywny: true,
                statystyki: {
                    quizyRozwiazane: 45,
                    sredniaOcen: 3.85,
                    punktyXP: 4200,
                    poziom: 12,
                    seria: 7
                }
            }
        );
        
        return students;
    }

    /**
     * Generuje nauczycieli
     */
    generateTeachers() {
        // Nie generuj nauczycieli - tylko Paulina będzie dodana osobno
        console.log('📚 Pominięto generowanie nauczycieli - tylko Paulina będzie utworzona osobno');
        return [];
    }

    /**
     * Generuje rodziców
     */
    generateParents(students) {
        const parents = [];
        
        // Dla każdego ucznia generuj 1-2 rodziców
        students.forEach((student, index) => {
            if (Math.random() > 0.1) { // 90% uczniów ma rodziców w systemie
                // Pierwszy rodzic (matka)
                parents.push({
                    id: `parent_${index * 2 + 1}`,
                    userId: `parent_${index * 2 + 1}`,
                    username: `rodzic.${student.nazwisko.toLowerCase()}${index}`,
                    imie: this.generateParentName(student.imie, 'female'),
                    nazwisko: student.nazwisko,
                    email: `rodzic.${student.nazwisko.toLowerCase()}${index}@gmail.com`,
                    password: this.hashPassword('Test123!'),
                    haslo: this.hashPassword('Test123!'),
                    role: 'parent',
                    rola: 'parent',
                    dzieci: [student.id],
                    telefon: this.generatePhoneNumber(),
                    aktywny: true,
                    powiadomienia: {
                        email: true,
                        sms: false,
                        push: true,
                        oOcenach: true,
                        oNieobecnosciach: true,
                        oZadaniach: true,
                        oWydarzeniach: true
                    }
                });
                
                // Drugi rodzic (ojciec) - 70% szans
                if (Math.random() > 0.3) {
                    parents.push({
                        id: `parent_${index * 2 + 2}`,
                        userId: `parent_${index * 2 + 2}`,
                        username: `tata.${student.nazwisko.toLowerCase()}${index}`,
                        imie: this.generateParentName(student.imie, 'male'),
                        nazwisko: student.nazwisko,
                        email: `tata.${student.nazwisko.toLowerCase()}${index}@gmail.com`,
                        password: this.hashPassword('Test123!'),
                        haslo: this.hashPassword('Test123!'),
                        role: 'parent',
                        rola: 'parent',
                        dzieci: [student.id],
                        telefon: this.generatePhoneNumber(),
                        aktywny: true
                    });
                }
            }
        });
        
        // Dodaj rodziców testowych
        parents.push(
            {
                id: 'parent_demo',
                userId: 'parent_demo',
                username: 'rodzic@demo.pl',
                imie: 'Demo',
                nazwisko: 'Rodzic',
                email: 'rodzic@demo.pl',
                password: this.hashPassword('demo123'),
                haslo: this.hashPassword('demo123'),
                role: 'parent',
                rola: 'parent',
                dzieci: ['student_demo', 'student_1001'], // Ma dwoje dzieci
                telefon: '600-700-800',
                aktywny: true,
                powiadomienia: {
                    wszystkie: true
                }
            }
        );
        
        return parents;
    }

    /**
     * Generuje klasy
     */
    generateClasses() {
        const classes = [];
        const poziomy = [1, 2, 3, 4, 5, 6, 7, 8];
        const oddzialy = ['a', 'b'];
        
        poziomy.forEach(poziom => {
            oddzialy.forEach(oddzial => {
                classes.push({
                    id: `class_${poziom}${oddzial}`,
                    nazwa: `${poziom}${oddzial}`,
                    poziom: poziom,
                    oddzial: oddzial,
                    rokSzkolny: this.schoolYear,
                    wychowawca: null, // Będzie przypisany z nauczycieli
                    liczbaUczniow: 0, // Będzie obliczona
                    salaDomyslna: `${poziom}0${oddzialy.indexOf(oddzial) + 1}`,
                    profil: poziom >= 7 ? (oddzial === 'a' ? 'matematyczno-fizyczny' : 'humanistyczny') : 'ogólny'
                });
            });
        });
        
        return classes;
    }

    /**
     * Generuje przedmioty
     */
    generateSubjects() {
        return [
            { id: 'mat', nazwa: 'Matematyka', skrot: 'MAT', kategoria: 'ścisłe' },
            { id: 'pol', nazwa: 'Język polski', skrot: 'POL', kategoria: 'humanistyczne' },
            { id: 'ang', nazwa: 'Język angielski', skrot: 'ANG', kategoria: 'języki' },
            { id: 'his', nazwa: 'Historia', skrot: 'HIS', kategoria: 'humanistyczne' },
            { id: 'geo', nazwa: 'Geografia', skrot: 'GEO', kategoria: 'przyrodnicze' },
            { id: 'bio', nazwa: 'Biologia', skrot: 'BIO', kategoria: 'przyrodnicze' },
            { id: 'che', nazwa: 'Chemia', skrot: 'CHE', kategoria: 'ścisłe' },
            { id: 'fiz', nazwa: 'Fizyka', skrot: 'FIZ', kategoria: 'ścisłe' },
            { id: 'inf', nazwa: 'Informatyka', skrot: 'INF', kategoria: 'ścisłe' },
            { id: 'wf', nazwa: 'Wychowanie fizyczne', skrot: 'WF', kategoria: 'inne' },
            { id: 'muz', nazwa: 'Muzyka', skrot: 'MUZ', kategoria: 'artystyczne' },
            { id: 'pla', nazwa: 'Plastyka', skrot: 'PLA', kategoria: 'artystyczne' }
        ];
    }

    /**
     * Generuje quizy
     */
    generateQuizzes(subjects) {
        const quizzes = [];
        let quizId = 1;
        
        // Przykładowe quizy dla każdego przedmiotu
        const quizTemplates = {
            mat: [
                { temat: 'Działania na ułamkach', poziom: 6, trudnosc: 'średnia' },
                { temat: 'Równania liniowe', poziom: 7, trudnosc: 'średnia' },
                { temat: 'Funkcje kwadratowe', poziom: 8, trudnosc: 'trudna' },
                { temat: 'Geometria - pola figur', poziom: 7, trudnosc: 'łatwa' },
                { temat: 'Procenty i proporcje', poziom: 6, trudnosc: 'średnia' }
            ],
            pol: [
                { temat: 'Części mowy', poziom: 5, trudnosc: 'łatwa' },
                { temat: 'Lektury - Pan Tadeusz', poziom: 8, trudnosc: 'trudna' },
                { temat: 'Ortografia', poziom: 6, trudnosc: 'średnia' },
                { temat: 'Środki stylistyczne', poziom: 7, trudnosc: 'średnia' },
                { temat: 'Gramatyka - zdania złożone', poziom: 7, trudnosc: 'trudna' }
            ],
            ang: [
                { temat: 'Present Simple vs Continuous', poziom: 6, trudnosc: 'średnia' },
                { temat: 'Irregular Verbs', poziom: 7, trudnosc: 'łatwa' },
                { temat: 'Conditionals', poziom: 8, trudnosc: 'trudna' },
                { temat: 'Vocabulary - Daily Routines', poziom: 5, trudnosc: 'łatwa' }
            ],
            bio: [
                { temat: 'Budowa komórki', poziom: 7, trudnosc: 'średnia' },
                { temat: 'Układ krwionośny', poziom: 8, trudnosc: 'trudna' },
                { temat: 'Fotosynteza', poziom: 6, trudnosc: 'średnia' },
                { temat: 'Ewolucja', poziom: 8, trudnosc: 'trudna' }
            ],
            fiz: [
                { temat: 'Ruch i siły', poziom: 7, trudnosc: 'średnia' },
                { temat: 'Prąd elektryczny', poziom: 8, trudnosc: 'trudna' },
                { temat: 'Dźwięk i fale', poziom: 7, trudnosc: 'średnia' }
            ]
        };
        
        // Generuj quizy dla każdego przedmiotu
        Object.keys(quizTemplates).forEach(subjectId => {
            const templates = quizTemplates[subjectId];
            
            templates.forEach(template => {
                const quiz = {
                    id: `quiz_${quizId++}`,
                    nazwa: template.temat,
                    przedmiot: subjectId,
                    temat: template.temat,
                    poziom: template.poziom,
                    klasa: `${template.poziom}a`,
                    trudnosc: template.trudnosc,
                    czasTrwania: template.trudnosc === 'łatwa' ? 15 : template.trudnosc === 'średnia' ? 30 : 45,
                    punkty: template.trudnosc === 'łatwa' ? 20 : template.trudnosc === 'średnia' ? 30 : 40,
                    nauczyciel: 'teacher_paulina',
                    dataUtworzenia: this.generatePastDate(30),
                    dataAktywacji: this.generatePastDate(20),
                    dataZakonczenia: this.generateFutureDate(10),
                    aktywny: Math.random() > 0.3,
                    pytania: this.generateQuestions(template.temat, template.trudnosc),
                    statystyki: {
                        liczbaRozwiazan: Math.floor(Math.random() * 50),
                        sredniaOcen: 3 + Math.random() * 2,
                        sredniCzas: Math.floor(Math.random() * 20) + 10
                    }
                };
                
                quizzes.push(quiz);
            });
        });
        
        // Dodaj specjalny quiz demo
        quizzes.push({
            id: 'quiz_demo',
            nazwa: 'Quiz Demonstracyjny - Matematyka',
            przedmiot: 'mat',
            temat: 'Różne działy matematyki',
            poziom: 7,
            klasa: '7a',
            trudnosc: 'średnia',
            czasTrwania: 30,
            punkty: 50,
            nauczyciel: 'teacher_paulina',
            aktywny: true,
            pytania: [
                {
                    id: 'q1',
                    tresc: 'Oblicz: 3/4 + 2/3',
                    typ: 'jednokrotny',
                    punkty: 5,
                    odpowiedzi: [
                        { id: 'a', tresc: '17/12', poprawna: true },
                        { id: 'b', tresc: '5/7', poprawna: false },
                        { id: 'c', tresc: '1', poprawna: false },
                        { id: 'd', tresc: '5/12', poprawna: false }
                    ]
                },
                {
                    id: 'q2',
                    tresc: 'Rozwiąż równanie: 2x + 5 = 13',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 'x = 4',
                    kryteriaOceniania: ['Odjęcie 5 od obu stron', 'Podzielenie przez 2', 'Poprawny wynik']
                },
                {
                    id: 'q3',
                    tresc: 'Które z poniższych liczb są liczbami pierwszymi?',
                    typ: 'wielokrotny',
                    punkty: 8,
                    odpowiedzi: [
                        { id: 'a', tresc: '17', poprawna: true },
                        { id: 'b', tresc: '21', poprawna: false },
                        { id: 'c', tresc: '29', poprawna: true },
                        { id: 'd', tresc: '35', poprawna: false }
                    ]
                }
            ]
        });
        
        return quizzes;
    }

    /**
     * Generuje zadania domowe
     */
    generateTasks(subjects) {
        const tasks = [];
        let taskId = 1;
        
        const taskTypes = [
            'Zadanie domowe',
            'Projekt',
            'Praca klasowa',
            'Kartkówka',
            'Referat',
            'Prezentacja'
        ];
        
        // Generuj 3-5 zadań dla każdego przedmiotu
        subjects.forEach(subject => {
            const taskCount = 3 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < taskCount; i++) {
                const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
                const daysOffset = Math.floor(Math.random() * 14) - 7; // -7 do +7 dni
                
                tasks.push({
                    id: `task_${taskId++}`,
                    nazwa: `${taskType} - ${subject.nazwa}`,
                    typ: taskType,
                    przedmiot: subject.id,
                    opis: this.generateTaskDescription(subject.nazwa, taskType),
                    dataZadania: this.generateDateOffset(daysOffset - 7),
                    terminOddania: this.generateDateOffset(daysOffset),
                    punkty: taskType === 'Praca klasowa' ? 100 : taskType === 'Projekt' ? 50 : 20,
                    nauczyciel: 'teacher_paulina',
                    klasa: `${Math.floor(Math.random() * 8) + 1}a`,
                    zalaczniki: Math.random() > 0.7 ? ['materialy.pdf'] : [],
                    wymagania: this.generateTaskRequirements(taskType)
                });
            }
        });
        
        return tasks;
    }

    /**
     * Generuje wyniki quizów
     */
    generateResults(students, quizzes) {
        const results = [];
        let resultId = 1;
        
        students.forEach(student => {
            // Każdy uczeń rozwiązał 30-70% quizów
            const solvedQuizzes = quizzes.filter(() => Math.random() > 0.5);
            
            solvedQuizzes.forEach(quiz => {
                const percentageScore = 50 + Math.random() * 50; // 50-100%
                const points = Math.floor((percentageScore / 100) * quiz.punkty);
                const timeSpent = Math.floor(quiz.czasTrwania * (0.5 + Math.random() * 0.8));
                
                results.push({
                    id: `result_${resultId++}`,
                    studentId: student.id,
                    quizId: quiz.id,
                    przedmiot: quiz.przedmiot,
                    dataRozpoczecia: this.generatePastDate(20),
                    dataZakonczenia: this.generatePastDate(20),
                    czasTrwania: timeSpent,
                    punktyZdobyte: points,
                    punktyMax: quiz.punkty,
                    procent: Math.round(percentageScore),
                    ocena: this.calculateGrade(percentageScore),
                    odpowiedzi: this.generateAnswers(quiz.pytania, percentageScore),
                    liczbaPoprawnych: Math.floor(quiz.pytania.length * percentageScore / 100),
                    liczbaBlednych: Math.ceil(quiz.pytania.length * (100 - percentageScore) / 100),
                    status: 'zakończony'
                });
            });
        });
        
        return results;
    }

    /**
     * Generuje statystyki
     */
    generateStatistics(results) {
        const stats = {
            global: {
                totalQuizzes: results.length,
                averageScore: results.reduce((sum, r) => sum + r.procent, 0) / results.length,
                totalPoints: results.reduce((sum, r) => sum + r.punktyZdobyte, 0),
                totalTime: results.reduce((sum, r) => sum + r.czasTrwania, 0)
            },
            bySubject: {},
            byStudent: {},
            byClass: {},
            trends: this.generateTrends()
        };
        
        // Statystyki per przedmiot
        const subjects = [...new Set(results.map(r => r.przedmiot))];
        subjects.forEach(subject => {
            const subjectResults = results.filter(r => r.przedmiot === subject);
            stats.bySubject[subject] = {
                count: subjectResults.length,
                average: subjectResults.reduce((sum, r) => sum + r.procent, 0) / subjectResults.length,
                bestScore: Math.max(...subjectResults.map(r => r.procent)),
                worstScore: Math.min(...subjectResults.map(r => r.procent))
            };
        });
        
        return stats;
    }

    /**
     * Generuje plany lekcji
     */
    generateSchedules(classes, subjects, teachers) {
        const schedules = [];
        const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
        const hours = [
            { nr: 1, start: '8:00', end: '8:45' },
            { nr: 2, start: '8:50', end: '9:35' },
            { nr: 3, start: '9:45', end: '10:30' },
            { nr: 4, start: '10:40', end: '11:25' },
            { nr: 5, start: '11:35', end: '12:20' },
            { nr: 6, start: '12:30', end: '13:15' },
            { nr: 7, start: '13:25', end: '14:10' },
            { nr: 8, start: '14:20', end: '15:05' }
        ];
        
        classes.forEach(cls => {
            const classSchedule = {
                klasa: cls.nazwa,
                rokSzkolny: this.schoolYear,
                plan: {}
            };
            
            days.forEach(day => {
                classSchedule.plan[day] = [];
                
                // 5-8 lekcji dziennie
                const lessonsCount = 5 + Math.floor(Math.random() * 4);
                
                for (let i = 0; i < lessonsCount; i++) {
                    const subject = subjects[Math.floor(Math.random() * subjects.length)];
                    const teacher = teachers.find(t => t.przedmioty && t.przedmioty.includes(subject.nazwa.toLowerCase()));
                    
                    classSchedule.plan[day].push({
                        godzina: hours[i],
                        przedmiot: subject.nazwa,
                        nauczyciel: teacher ? `${teacher.imie} ${teacher.nazwisko}` : 'TBD',
                        sala: `${Math.floor(Math.random() * 3) + 1}0${Math.floor(Math.random() * 9) + 1}`
                    });
                }
            });
            
            schedules.push(classSchedule);
        });
        
        return schedules;
    }

    /**
     * Generuje wydarzenia
     */
    generateEvents() {
        return [
            {
                id: 'event_1',
                nazwa: 'Wywiadówka - klasy 7-8',
                typ: 'wywiadówka',
                data: this.generateFutureDate(7),
                godzina: '17:00',
                miejsce: 'Aula szkolna',
                opis: 'Spotkanie z rodzicami uczniów klas 7-8',
                obowiazkowe: true,
                uczestnicyTyp: 'rodzice',
                klasy: ['7a', '7b', '8a', '8b']
            },
            {
                id: 'event_2',
                nazwa: 'Dzień Otwarty Szkoły',
                typ: 'wydarzenie',
                data: this.generateFutureDate(14),
                godzina: '10:00',
                miejsce: 'Cała szkoła',
                opis: 'Prezentacja oferty edukacyjnej dla przyszłych uczniów',
                obowiazkowe: false
            },
            {
                id: 'event_3',
                nazwa: 'Konkurs Matematyczny',
                typ: 'konkurs',
                data: this.generateFutureDate(21),
                godzina: '12:00',
                miejsce: 'Sala 301',
                opis: 'Szkolny etap konkursu matematycznego',
                obowiazkowe: false,
                przedmiot: 'matematyka'
            },
            {
                id: 'event_4',
                nazwa: 'Wycieczka do muzeum',
                typ: 'wycieczka',
                data: this.generateFutureDate(10),
                godzina: '8:00',
                miejsce: 'Muzeum Narodowe',
                opis: 'Wycieczka edukacyjna dla klas 6',
                klasy: ['6a', '6b'],
                koszt: 25
            },
            {
                id: 'event_5',
                nazwa: 'Próbny egzamin ósmoklasisty',
                typ: 'egzamin',
                data: this.generateFutureDate(30),
                godzina: '9:00',
                miejsce: 'Sale egzaminacyjne',
                opis: 'Próbny egzamin z matematyki',
                obowiazkowe: true,
                klasy: ['8a', '8b']
            }
        ];
    }

    /**
     * Generuje wiadomości
     */
    generateMessages(teachers, parents, students) {
        const messages = [];
        let msgId = 1;
        
        // Wiadomości od nauczycieli do rodziców
        for (let i = 0; i < 10; i++) {
            const teacher = teachers[Math.floor(Math.random() * teachers.length)];
            const parent = parents[Math.floor(Math.random() * parents.length)];
            
            messages.push({
                id: `msg_${msgId++}`,
                nadawca: teacher.id,
                nadawcaTyp: 'teacher',
                odbiorca: parent.id,
                odbiorcaTyp: 'parent',
                temat: this.generateMessageSubject('teacher-parent'),
                tresc: this.generateMessageContent('teacher-parent'),
                data: this.generatePastDate(7),
                przeczytana: Math.random() > 0.3,
                wazna: Math.random() > 0.8,
                kategoria: 'informacja'
            });
        }
        
        // Wiadomości od rodziców do nauczycieli
        for (let i = 0; i < 5; i++) {
            const parent = parents[Math.floor(Math.random() * parents.length)];
            const teacher = teachers[Math.floor(Math.random() * teachers.length)];
            
            messages.push({
                id: `msg_${msgId++}`,
                nadawca: parent.id,
                nadawcaTyp: 'parent',
                odbiorca: teacher.id,
                odbiorcaTyp: 'teacher',
                temat: this.generateMessageSubject('parent-teacher'),
                tresc: this.generateMessageContent('parent-teacher'),
                data: this.generatePastDate(5),
                przeczytana: Math.random() > 0.2,
                odpowiedz: Math.random() > 0.5
            });
        }
        
        // Ogłoszenia systemowe
        messages.push(
            {
                id: `msg_${msgId++}`,
                nadawca: 'system',
                nadawcaTyp: 'system',
                odbiorca: 'all',
                odbiorcaTyp: 'broadcast',
                temat: 'Witamy w nowym roku szkolnym!',
                tresc: 'Drodzy uczniowie, rodzice i nauczyciele! Witamy w nowym roku szkolnym. Życzymy owocnej nauki!',
                data: new Date(2024, 8, 1).toISOString(),
                przeczytana: true,
                kategoria: 'ogłoszenie'
            },
            {
                id: `msg_${msgId++}`,
                nadawca: 'system',
                nadawcaTyp: 'system',
                odbiorca: 'teachers',
                odbiorcaTyp: 'group',
                temat: 'Przypomnienie o wypełnieniu planów nauczania',
                tresc: 'Prosimy o przesłanie planów nauczania do końca września.',
                data: this.generatePastDate(3),
                przeczytana: false,
                wazna: true,
                kategoria: 'przypomnienie'
            }
        );
        
        return messages;
    }

    /**
     * Generuje powiadomienia
     */
    generateNotifications() {
        const notifications = [];
        let notifId = 1;
        
        const notificationTypes = [
            { typ: 'nowy_quiz', ikona: 'quiz', kolor: 'blue', tytul: 'Nowy quiz dostępny' },
            { typ: 'wynik_quizu', ikona: 'check', kolor: 'green', tytul: 'Wynik quizu' },
            { typ: 'zadanie_domowe', ikona: 'task', kolor: 'yellow', tytul: 'Nowe zadanie domowe' },
            { typ: 'ocena', ikona: 'grade', kolor: 'purple', tytul: 'Nowa ocena' },
            { typ: 'wiadomosc', ikona: 'message', kolor: 'indigo', tytul: 'Nowa wiadomość' },
            { typ: 'wydarzenie', ikona: 'event', kolor: 'pink', tytul: 'Nadchodzące wydarzenie' },
            { typ: 'nieobecnosc', ikona: 'warning', kolor: 'red', tytul: 'Nieobecność' },
            { typ: 'osiagniecie', ikona: 'trophy', kolor: 'gold', tytul: 'Nowe osiągnięcie!' }
        ];
        
        // Generuj 20-30 powiadomień
        for (let i = 0; i < 25; i++) {
            const notifType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
            
            notifications.push({
                id: `notif_${notifId++}`,
                typ: notifType.typ,
                tytul: notifType.tytul,
                tresc: this.generateNotificationContent(notifType.typ),
                data: this.generatePastDate(14),
                przeczytane: Math.random() > 0.4,
                ikona: notifType.ikona,
                kolor: notifType.kolor,
                link: this.generateNotificationLink(notifType.typ),
                uzytkownik: `student_${1000 + Math.floor(Math.random() * 20)}`
            });
        }
        
        return notifications;
    }

    // Funkcje pomocnicze

    generateBirthDate(className) {
        const classLevel = parseInt(className);
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - 6 - classLevel;
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;
        return new Date(birthYear, month, day).toISOString().split('T')[0];
    }

    generatePESEL() {
        // Uproszczona generacja PESEL (nie jest prawdziwa)
        return `0${Math.floor(Math.random() * 9)}${Math.floor(100000000 + Math.random() * 900000000)}`;
    }

    generateAddress() {
        const streets = ['Główna', 'Szkolna', 'Parkowa', 'Słoneczna', 'Kwiatowa', 'Leśna'];
        const cities = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk'];
        
        return {
            ulica: `ul. ${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 100) + 1}`,
            kodPocztowy: `${Math.floor(10 + Math.random() * 90)}-${Math.floor(100 + Math.random() * 900)}`,
            miasto: cities[Math.floor(Math.random() * cities.length)]
        };
    }

    generatePhoneNumber() {
        return `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    }

    generateRecentDate() {
        const daysAgo = Math.floor(Math.random() * 7);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    }

    generatePastDate(maxDaysAgo) {
        const daysAgo = Math.floor(Math.random() * maxDaysAgo);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    }

    generateFutureDate(maxDaysAhead) {
        const daysAhead = Math.floor(Math.random() * maxDaysAhead);
        const date = new Date();
        date.setDate(date.getDate() + daysAhead);
        return date.toISOString();
    }

    generateDateOffset(daysOffset) {
        const date = new Date();
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString();
    }

    generateAchievements() {
        const allAchievements = [
            'first_quiz', 'perfect_score', 'speed_demon', 'quiz_master',
            'streak_week', 'streak_month', 'early_bird', 'night_owl',
            'perfectionist', 'persistent', 'helper', 'explorer'
        ];
        
        const count = Math.floor(Math.random() * 5);
        const achievements = [];
        
        for (let i = 0; i < count; i++) {
            const achievement = allAchievements[Math.floor(Math.random() * allAchievements.length)];
            if (!achievements.includes(achievement)) {
                achievements.push(achievement);
            }
        }
        
        return achievements;
    }

    generateParentName(childName, gender) {
        const femaleNames = ['Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Barbara', 'Ewa'];
        const maleNames = ['Jan', 'Andrzej', 'Piotr', 'Krzysztof', 'Tomasz', 'Paweł', 'Marek'];
        
        return gender === 'female' ? 
            femaleNames[Math.floor(Math.random() * femaleNames.length)] :
            maleNames[Math.floor(Math.random() * maleNames.length)];
    }

    generateRandomClasses() {
        const allClasses = ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b'];
        const count = 4 + Math.floor(Math.random() * 5);
        const selected = [];
        
        for (let i = 0; i < count; i++) {
            const cls = allClasses[Math.floor(Math.random() * allClasses.length)];
            if (!selected.includes(cls)) {
                selected.push(cls);
            }
        }
        
        return selected;
    }

    generateQuestions(topic, difficulty) {
        const questionCount = difficulty === 'łatwa' ? 5 : difficulty === 'średnia' ? 8 : 10;
        const questions = [];
        
        for (let i = 0; i < questionCount; i++) {
            const types = ['jednokrotny', 'wielokrotny', 'prawda-falsz'];
            if (difficulty !== 'łatwa') types.push('otwarte');
            
            const type = types[Math.floor(Math.random() * types.length)];
            
            questions.push({
                id: `q${i + 1}`,
                tresc: `Pytanie ${i + 1} dotyczące: ${topic}`,
                typ: type,
                punkty: type === 'otwarte' ? 5 : 2,
                odpowiedzi: type === 'otwarte' ? null : this.generateAnswerOptions(type)
            });
        }
        
        return questions;
    }

    generateAnswerOptions(type) {
        if (type === 'prawda-falsz') {
            return [
                { id: 'a', tresc: 'Prawda', poprawna: Math.random() > 0.5 },
                { id: 'b', tresc: 'Fałsz', poprawna: false }
            ];
        }
        
        const options = [];
        const correctCount = type === 'wielokrotny' ? 2 : 1;
        
        for (let i = 0; i < 4; i++) {
            options.push({
                id: String.fromCharCode(97 + i),
                tresc: `Odpowiedź ${String.fromCharCode(65 + i)}`,
                poprawna: i < correctCount
            });
        }
        
        // Przemieszaj
        return options.sort(() => Math.random() - 0.5);
    }

    generateAnswers(questions, percentageCorrect) {
        const answers = {};
        
        questions.forEach((question, index) => {
            const isCorrect = Math.random() * 100 < percentageCorrect;
            
            if (question.typ === 'otwarte') {
                answers[question.id] = isCorrect ? 'Poprawna odpowiedź' : 'Błędna odpowiedź';
            } else {
                const correctAnswers = question.odpowiedzi.filter(a => a.poprawna).map(a => a.id);
                if (isCorrect) {
                    answers[question.id] = question.typ === 'jednokrotny' ? correctAnswers[0] : correctAnswers;
                } else {
                    const wrongAnswers = question.odpowiedzi.filter(a => !a.poprawna).map(a => a.id);
                    answers[question.id] = question.typ === 'jednokrotny' ? 
                        wrongAnswers[0] : 
                        [wrongAnswers[0]];
                }
            }
        });
        
        return answers;
    }

    calculateGrade(percentage) {
        if (percentage >= 95) return '6';
        if (percentage >= 85) return '5';
        if (percentage >= 70) return '4';
        if (percentage >= 55) return '3';
        if (percentage >= 40) return '2';
        return '1';
    }

    generateTaskDescription(subject, type) {
        const descriptions = {
            'Zadanie domowe': `Rozwiąż zadania z podręcznika ${subject} ze stron 45-48`,
            'Projekt': `Przygotuj projekt na temat wybranego zagadnienia z ${subject}`,
            'Praca klasowa': `Praca klasowa obejmująca materiał z ostatniego działu`,
            'Kartkówka': `Krótki sprawdzian z ostatnich trzech lekcji`,
            'Referat': `Przygotuj referat na wybrany temat związany z ${subject}`,
            'Prezentacja': `Stwórz prezentację multimedialną (10-15 slajdów)`
        };
        
        return descriptions[type] || 'Zadanie do wykonania';
    }

    generateTaskRequirements(type) {
        const requirements = {
            'Projekt': ['Minimum 5 stron', 'Bibliografia', 'Ilustracje'],
            'Prezentacja': ['10-15 slajdów', 'Źródła', 'Czas: 10 minut'],
            'Referat': ['2-3 strony A4', 'Wstęp i zakończenie', 'Przypisy']
        };
        
        return requirements[type] || [];
    }

    generateTrends() {
        const trends = [];
        const lastDays = 30;
        
        for (let i = 0; i < lastDays; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (lastDays - i));
            
            trends.push({
                date: date.toISOString().split('T')[0],
                quizzesSolved: Math.floor(Math.random() * 20),
                averageScore: 60 + Math.random() * 30,
                activeUsers: 50 + Math.floor(Math.random() * 100)
            });
        }
        
        return trends;
    }

    generateMessageSubject(type) {
        const subjects = {
            'teacher-parent': [
                'Postępy w nauce',
                'Zachowanie ucznia',
                'Nieobecności',
                'Zaproszenie na konsultacje',
                'Informacja o sprawdzianie'
            ],
            'parent-teacher': [
                'Usprawiedliwienie nieobecności',
                'Prośba o konsultacje',
                'Pytanie o zadanie domowe',
                'Informacja o chorobie dziecka',
                'Prośba o dodatkowe materiały'
            ]
        };
        
        const typeSubjects = subjects[type] || ['Wiadomość'];
        return typeSubjects[Math.floor(Math.random() * typeSubjects.length)];
    }

    generateMessageContent(type) {
        const contents = {
            'teacher-parent': 'Szanowni Państwo, chciałbym poinformować o postępach Państwa dziecka w nauce. Ogólnie wyniki są zadowalające, choć widzę przestrzeń do poprawy w...',
            'parent-teacher': 'Dzień dobry, zwracam się z prośbą o informację dotyczącą ostatniego zadania domowego. Moje dziecko nie jest pewne czy dobrze zrozumiało polecenie...'
        };
        
        return contents[type] || 'Treść wiadomości';
    }

    generateNotificationContent(type) {
        const contents = {
            'nowy_quiz': 'Nauczyciel dodał nowy quiz z matematyki',
            'wynik_quizu': 'Twój wynik: 85% - Świetna robota!',
            'zadanie_domowe': 'Nowe zadanie z języka polskiego - termin: za 3 dni',
            'ocena': 'Otrzymałeś ocenę 5 z kartkówki',
            'wiadomosc': 'Masz nową wiadomość od wychowawcy',
            'wydarzenie': 'Przypomnienie: Jutro wywiadówka o 17:00',
            'nieobecnosc': 'Twoja nieobecność została odnotowana',
            'osiagniecie': 'Zdobyłeś odznakę "Mistrz Quizów"!'
        };
        
        return contents[type] || 'Nowe powiadomienie';
    }

    generateNotificationLink(type) {
        const links = {
            'nowy_quiz': '/quiz/start',
            'wynik_quizu': '/results',
            'zadanie_domowe': '/tasks',
            'ocena': '/grades',
            'wiadomosc': '/messages',
            'wydarzenie': '/calendar',
            'nieobecnosc': '/attendance',
            'osiagniecie': '/achievements'
        };
        
        return links[type] || '#';
    }

    /**
     * Zapisuje dane do localStorage
     */
    saveToLocalStorage(data) {
        // Dodaj specjalne konta demo jeśli nie istnieją
        const demoStudent = data.users.students.find(s => s.email === 'uczen@demo.pl');
        const demoTeacher = data.users.teachers.find(t => t.email === 'nauczyciel@demo.pl');
        const demoParent = data.users.parents.find(p => p.email === 'rodzic@demo.pl');
        
        // Zapisz użytkowników
        const allUsers = [
            ...data.users.students,
            ...data.users.teachers,
            ...data.users.parents
        ];
        localStorage.setItem('users', JSON.stringify(allUsers));
        
        // Zapisz dane akademickie
        localStorage.setItem('classes', JSON.stringify(data.academic.classes));
        localStorage.setItem('subjects', JSON.stringify(data.academic.subjects));
        localStorage.setItem('schedules', JSON.stringify(data.academic.schedules));
        
        // Zapisz quizy i zadania
        localStorage.setItem('quizzes', JSON.stringify(data.content.quizzes));
        localStorage.setItem('tasks', JSON.stringify(data.content.tasks));
        
        // Zapisz wyniki
        localStorage.setItem('quizResults', JSON.stringify(data.performance.results));
        localStorage.setItem('statistics', JSON.stringify(data.performance.statistics));
        
        // Zapisz komunikację
        localStorage.setItem('messages', JSON.stringify(data.communication.messages));
        localStorage.setItem('notifications', JSON.stringify(data.communication.notifications));
        localStorage.setItem('events', JSON.stringify(data.communication.events));
        
        // Zapisz przykładowe pytania dla quizów
        const sampleQuestions = [
            {
                id: 1,
                przedmiot: "matematyka",
                temat: "Ułamki zwykłe",
                poziom: 6,
                tresc: "Oblicz: 3/4 + 2/3",
                typ: "otwarte",
                punkty: 2,
                odpowiedz: "17/12 lub 1 5/12"
            },
            {
                id: 2,
                przedmiot: "matematyka",
                temat: "Równania",
                poziom: 7,
                tresc: "Rozwiąż równanie: 2x + 5 = 13",
                typ: "otwarte",
                punkty: 3,
                odpowiedz: "x = 4"
            },
            {
                id: 3,
                przedmiot: "polski",
                temat: "Części mowy",
                poziom: 5,
                tresc: "Wskaż wszystkie rzeczowniki w zdaniu: 'Piękny pies biegnie szybko przez zielony park.'",
                typ: "wielokrotny",
                punkty: 2,
                opcje: ["piękny", "pies", "biegnie", "szybko", "przez", "zielony", "park"],
                poprawne: ["pies", "park"]
            }
        ];
        localStorage.setItem('sampleQuestions', JSON.stringify(sampleQuestions));
        
        console.log('✅ Dane testowe zapisane do localStorage');
        console.log('📊 Statystyki:');
        console.log(`- Uczniowie: ${data.users.students.length}`);
        console.log(`- Nauczyciele: ${data.users.teachers.length}`);
        console.log(`- Rodzice: ${data.users.parents.length}`);
        console.log(`- Quizy: ${data.content.quizzes.length}`);
        console.log(`- Wyniki: ${data.performance.results.length}`);
    }

    /**
     * Główna funkcja generująca i zapisująca dane
     */
    generateAndSave() {
        const data = this.generateCompleteTestData();
        this.saveToLocalStorage(data);
        
        // Utwórz przykładowe konta demo
        const demoAccounts = {
            student: {
                login: 'uczen@demo.pl',
                haslo: 'demo123',
                rola: 'Uczeń'
            },
            teacher: {
                login: 'nauczyciel@demo.pl',
                haslo: 'demo123',
                rola: 'Nauczyciel'
            },
            parent: {
                login: 'rodzic@demo.pl',
                haslo: 'demo123',
                rola: 'Rodzic'
            }
        };
        
        localStorage.setItem('demoAccounts', JSON.stringify(demoAccounts));
        
        return {
            success: true,
            data: data,
            demoAccounts: demoAccounts
        };
    }
}

// Eksportuj jako globalną klasę
window.TestDataGenerator = TestDataGenerator;

// Automatycznie generuj dane przy ładowaniu
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        console.log('🚀 Generator danych testowych gotowy!');
        console.log('Użyj: new TestDataGenerator().generateAndSave() aby wygenerować dane');
    });
}