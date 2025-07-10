/**
 * System inicjalizacji danych dla QuizMaster
 * Automatycznie tworzy konto Pauliny i przykładowe dane
 */

class DataInitializer {
    constructor() {
        this.initialized = false;
    }

    /**
     * Hashuje hasło używając SHA256
     */
    hashPassword(password) {
        if (typeof CryptoJS !== 'undefined') {
            return CryptoJS.SHA256(password).toString();
        }
        // Fallback
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    /**
     * Główna funkcja inicjalizacji
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Inicjalizacja danych QuizMaster...');
        
        // 1. Sprawdź czy już mamy dane
        const hasData = localStorage.getItem('dataInitialized') === 'true';
        if (hasData) {
            console.log('✅ Dane już zainicjalizowane');
            this.initialized = true;
            return;
        }

        try {
            // 2. Utwórz konto Pauliny
            await this.createPaulinaAccount();
            
            // 3. Utwórz przykładowych uczniów
            this.createSampleStudents();
            
            // 4. Utwórz przykładowych rodziców
            this.createSampleParents();
            
            // 5. Utwórz przykładowe quizy
            this.createSampleQuizzes();
            
            // 6. Oznacz jako zainicjalizowane
            localStorage.setItem('dataInitialized', 'true');
            this.initialized = true;
            
            console.log('✅ Inicjalizacja zakończona pomyślnie!');
            
        } catch (error) {
            console.error('❌ Błąd inicjalizacji:', error);
        }
    }

    /**
     * Tworzy konto nauczyciela Pauliny
     */
    async createPaulinaAccount() {
        console.log('👩‍🏫 Tworzenie konta nauczyciela Pauliny...');
        
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Sprawdź czy już istnieje
        if (users.find(u => u.username === 'paulinaodmatematyki')) {
            console.log('✅ Konto Pauliny już istnieje');
            return;
        }

        let passwordHash = this.hashPassword('paulina#314159265'); // domyślne
        
        // Spróbuj pobrać hasło z Netlify env
        try {
            const response = await fetch('/.netlify/functions/teacher-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getTeacherCredentials' })
            });
            
            if (response.ok) {
                const data = await response.json();
                passwordHash = data.passwordHash;
                console.log('✅ Pobrano hasło z Netlify env');
            }
        } catch (error) {
            console.warn('⚠️ Używam domyślnego hasła (brak połączenia z Netlify)');
        }

        const paulina = {
            id: 'teacher_paulina',
            userId: 'teacher_paulina',
            username: 'paulinaodmatematyki',
            password: passwordHash,
            role: 'teacher',
            imie: 'Paulina',
            nazwisko: 'Kowalska',
            email: 'paulina.kowalska@szkola.edu.pl',
            fullName: 'Paulina Kowalska',
            przedmioty: ['matematyka', 'fizyka', 'chemia', 'informatyka'],
            klasy: ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b'],
            createdAt: new Date().toISOString()
        };

        users.push(paulina);
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('✅ Konto Pauliny utworzone');
    }

    /**
     * Tworzy przykładowych uczniów
     */
    createSampleStudents() {
        console.log('👥 Tworzenie przykładowych uczniów...');
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const studentNames = [
            { imie: 'Anna', nazwisko: 'Nowak', klasa: '8a' },
            { imie: 'Piotr', nazwisko: 'Kowalski', klasa: '8a' },
            { imie: 'Katarzyna', nazwisko: 'Wiśniewska', klasa: '8b' },
            { imie: 'Michał', nazwisko: 'Wójcik', klasa: '8b' },
            { imie: 'Magdalena', nazwisko: 'Kamińska', klasa: '7a' },
            { imie: 'Jakub', nazwisko: 'Lewandowski', klasa: '7a' },
            { imie: 'Aleksandra', nazwisko: 'Dąbrowska', klasa: '7b' },
            { imie: 'Tomasz', nazwisko: 'Zieliński', klasa: '7b' },
            { imie: 'Natalia', nazwisko: 'Szymańska', klasa: '6a' },
            { imie: 'Adam', nazwisko: 'Woźniak', klasa: '6a' }
        ];

        studentNames.forEach((student, index) => {
            const username = `${student.imie.toLowerCase()}.${student.nazwisko.toLowerCase()}`;
            
            // Sprawdź czy już istnieje
            if (users.find(u => u.username === username)) return;

            const newStudent = {
                id: `student_${1000 + index}`,
                userId: `student_${1000 + index}`,
                username: username,
                password: this.hashPassword('uczen123'),
                role: 'student',
                imie: student.imie,
                nazwisko: student.nazwisko,
                klasa: student.klasa,
                email: `${username}@szkola.edu.pl`,
                fullName: `${student.imie} ${student.nazwisko}`,
                numerDziennika: index + 1,
                dataUrodzenia: `200${8 + Math.floor(index/3)}-0${(index % 9) + 1}-${10 + index}`,
                createdAt: new Date().toISOString()
            };

            users.push(newStudent);
        });

        localStorage.setItem('users', JSON.stringify(users));
        console.log(`✅ Utworzono ${studentNames.length} uczniów`);
    }

    /**
     * Tworzy przykładowych rodziców
     */
    createSampleParents() {
        console.log('👨‍👩‍👧 Tworzenie przykładowych rodziców...');
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const students = users.filter(u => u.role === 'student');
        
        // Dla każdego ucznia utwórz 1-2 rodziców
        students.forEach((student, index) => {
            // Matka
            const motherUsername = `rodzic.${student.nazwisko.toLowerCase()}.matka`;
            if (!users.find(u => u.username === motherUsername)) {
                users.push({
                    id: `parent_m_${student.id}`,
                    userId: `parent_m_${student.id}`,
                    username: motherUsername,
                    password: this.hashPassword('rodzic123'),
                    role: 'parent',
                    imie: 'Anna',
                    nazwisko: student.nazwisko,
                    email: `${motherUsername}@gmail.com`,
                    fullName: `Anna ${student.nazwisko}`,
                    dzieci: [student.id],
                    telefon: `600${100000 + index}`,
                    createdAt: new Date().toISOString()
                });
            }

            // Ojciec (70% szans)
            if (Math.random() > 0.3) {
                const fatherUsername = `rodzic.${student.nazwisko.toLowerCase()}.ojciec`;
                if (!users.find(u => u.username === fatherUsername)) {
                    users.push({
                        id: `parent_f_${student.id}`,
                        userId: `parent_f_${student.id}`,
                        username: fatherUsername,
                        password: this.hashPassword('rodzic123'),
                        role: 'parent',
                        imie: 'Jan',
                        nazwisko: student.nazwisko,
                        email: `${fatherUsername}@gmail.com`,
                        fullName: `Jan ${student.nazwisko}`,
                        dzieci: [student.id],
                        telefon: `601${100000 + index}`,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        });

        localStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Utworzono rodziców dla uczniów');
    }

    /**
     * Tworzy przykładowe quizy
     */
    createSampleQuizzes() {
        console.log('📝 Tworzenie przykładowych quizów...');
        
        const quizzes = [
            {
                id: 'quiz_sample_1',
                nazwa: 'Test z matematyki - Funkcje kwadratowe',
                przedmiot: 'matematyka',
                klasa: '8a',
                nauczyciel: 'teacher_paulina',
                czasTrwania: 45,
                punkty: 30,
                aktywny: true,
                dataUtworzenia: new Date().toISOString(),
                pytania: [
                    {
                        id: 'q1',
                        tresc: 'Rozwiąż równanie: x² + 5x + 6 = 0',
                        typ: 'otwarte',
                        punkty: 10,
                        odpowiedzWzorcowa: 'x₁ = -2, x₂ = -3',
                        kryteriaOceniania: [
                            'Zastosowanie wzoru lub rozkładu',
                            'Poprawne obliczenia',
                            'Podanie obu pierwiastków'
                        ]
                    },
                    {
                        id: 'q2',
                        tresc: 'Wyznacz współrzędne wierzchołka paraboli y = x² - 4x + 3',
                        typ: 'otwarte',
                        punkty: 10,
                        odpowiedzWzorcowa: 'W = (2, -1)',
                        kryteriaOceniania: [
                            'Obliczenie p = -b/2a',
                            'Obliczenie q = f(p)',
                            'Poprawny zapis odpowiedzi'
                        ]
                    },
                    {
                        id: 'q3',
                        tresc: 'Dla jakich wartości parametru m równanie x² + mx + 4 = 0 ma dwa różne rozwiązania?',
                        typ: 'otwarte',
                        punkty: 10,
                        odpowiedzWzorcowa: 'm ∈ (-∞, -4) ∪ (4, +∞)',
                        kryteriaOceniania: [
                            'Wyznaczenie delty: Δ = m² - 16',
                            'Nierówność Δ > 0',
                            'Rozwiązanie nierówności',
                            'Poprawny zapis przedziału'
                        ]
                    }
                ]
            },
            {
                id: 'quiz_sample_2',
                nazwa: 'Kartkówka z fizyki - Ruch jednostajny',
                przedmiot: 'fizyka',
                klasa: '7a',
                nauczyciel: 'teacher_paulina',
                czasTrwania: 20,
                punkty: 20,
                aktywny: true,
                dataUtworzenia: new Date().toISOString(),
                pytania: [
                    {
                        id: 'q1',
                        tresc: 'Samochód przejechał 120 km w czasie 1,5 godziny. Oblicz jego średnią prędkość.',
                        typ: 'otwarte',
                        punkty: 10,
                        odpowiedzWzorcowa: 'v = 80 km/h',
                        kryteriaOceniania: [
                            'Zastosowanie wzoru v = s/t',
                            'Podstawienie danych',
                            'Obliczenia',
                            'Jednostka'
                        ]
                    },
                    {
                        id: 'q2',
                        tresc: 'Pociąg jedzie ze stałą prędkością 90 km/h. Jaką drogę pokona w czasie 40 minut?',
                        typ: 'otwarte',
                        punkty: 10,
                        odpowiedzWzorcowa: 's = 60 km',
                        kryteriaOceniania: [
                            'Zamiana jednostek (40 min = 2/3 h)',
                            'Zastosowanie wzoru s = v·t',
                            'Obliczenia',
                            'Jednostka'
                        ]
                    }
                ]
            }
        ];

        const existingQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        const newQuizzes = [...existingQuizzes, ...quizzes];
        localStorage.setItem('quizzes', JSON.stringify(newQuizzes));
        
        console.log(`✅ Utworzono ${quizzes.length} przykładowych quizów`);
    }

    /**
     * Resetuje wszystkie dane (do testów)
     */
    resetAllData() {
        if (confirm('Czy na pewno chcesz usunąć WSZYSTKIE dane? Ta operacja jest nieodwracalna!')) {
            const keysToRemove = [
                'users', 'quizzes', 'quizResults', 'classes', 'subjects',
                'dataInitialized', 'currentUser', 'examResults'
            ];
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
            
            console.log('🗑️ Wszystkie dane zostały usunięte');
            location.reload();
        }
    }
}

// Eksportuj globalnie
window.DataInitializer = DataInitializer;

// Automatyczna inicjalizacja przy ładowaniu
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const initializer = new DataInitializer();
        await initializer.initialize();
    });
}