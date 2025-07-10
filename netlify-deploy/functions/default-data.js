/**
 * Netlify Function - Domyślne dane aplikacji
 * Zwraca predefiniowane dane użytkowników i quizów
 */

const crypto = require('crypto');

// Funkcja hashująca hasło
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Predefiniowane dane
const DEFAULT_DATA = {
    users: [
        // Nauczyciel - Paulina
        {
            id: 'teacher_paulina',
            userId: 'teacher_paulina', 
            username: 'paulinaodmatematyki',
            password: null, // Będzie ustawione dynamicznie z env
            role: 'teacher',
            imie: 'Paulina',
            nazwisko: 'Kowalska',
            email: 'paulina.kowalska@szkola.edu.pl',
            fullName: 'Paulina Kowalska',
            przedmioty: ['matematyka', 'fizyka', 'chemia', 'informatyka'],
            klasy: ['6a', '6b', '7a', '7b', '8a', '8b'],
            createdAt: '2024-01-01T08:00:00Z'
        },
        
        // Uczniowie
        {
            id: 'student_1001',
            userId: 'student_1001',
            username: 'anna.nowak',
            password: hashPassword('uczen123'),
            role: 'student',
            imie: 'Anna',
            nazwisko: 'Nowak',
            klasa: '8a',
            email: 'anna.nowak@szkola.edu.pl',
            fullName: 'Anna Nowak',
            numerDziennika: 1,
            dataUrodzenia: '2009-03-15',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'student_1002',
            userId: 'student_1002',
            username: 'piotr.kowalski',
            password: hashPassword('uczen123'),
            role: 'student',
            imie: 'Piotr',
            nazwisko: 'Kowalski',
            klasa: '8a',
            email: 'piotr.kowalski@szkola.edu.pl',
            fullName: 'Piotr Kowalski',
            numerDziennika: 2,
            dataUrodzenia: '2009-05-22',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'student_1003',
            userId: 'student_1003',
            username: 'katarzyna.wisniewski',
            password: hashPassword('uczen123'),
            role: 'student',
            imie: 'Katarzyna',
            nazwisko: 'Wiśniewska',
            klasa: '8b',
            email: 'katarzyna.wisniewski@szkola.edu.pl',
            fullName: 'Katarzyna Wiśniewska',
            numerDziennika: 3,
            dataUrodzenia: '2009-07-10',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'student_1004',
            userId: 'student_1004',
            username: 'michal.wojcik',
            password: hashPassword('uczen123'),
            role: 'student',
            imie: 'Michał',
            nazwisko: 'Wójcik',
            klasa: '8b',
            email: 'michal.wojcik@szkola.edu.pl',
            fullName: 'Michał Wójcik',
            numerDziennika: 4,
            dataUrodzenia: '2009-11-28',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'student_1005',
            userId: 'student_1005',
            username: 'magdalena.kaminska',
            password: hashPassword('uczen123'),
            role: 'student',
            imie: 'Magdalena',
            nazwisko: 'Kamińska',
            klasa: '7a',
            email: 'magdalena.kaminska@szkola.edu.pl',
            fullName: 'Magdalena Kamińska',
            numerDziennika: 5,
            dataUrodzenia: '2010-02-14',
            createdAt: '2024-01-01T08:00:00Z'
        },
        
        // Rodzice
        {
            id: 'parent_m_1001',
            userId: 'parent_m_1001',
            username: 'rodzic.nowak.matka',
            password: hashPassword('rodzic123'),
            role: 'parent',
            imie: 'Joanna',
            nazwisko: 'Nowak',
            email: 'j.nowak@gmail.com',
            fullName: 'Joanna Nowak',
            dzieci: ['student_1001'],
            telefon: '600100001',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'parent_f_1001',
            userId: 'parent_f_1001',
            username: 'rodzic.nowak.ojciec',
            password: hashPassword('rodzic123'),
            role: 'parent',
            imie: 'Tomasz',
            nazwisko: 'Nowak',
            email: 't.nowak@gmail.com',
            fullName: 'Tomasz Nowak',
            dzieci: ['student_1001'],
            telefon: '601100001',
            createdAt: '2024-01-01T08:00:00Z'
        },
        {
            id: 'parent_m_1002',
            userId: 'parent_m_1002',
            username: 'rodzic.kowalski.matka',
            password: hashPassword('rodzic123'),
            role: 'parent',
            imie: 'Ewa',
            nazwisko: 'Kowalska',
            email: 'e.kowalska@gmail.com',
            fullName: 'Ewa Kowalska',
            dzieci: ['student_1002'],
            telefon: '600100002',
            createdAt: '2024-01-01T08:00:00Z'
        }
    ],
    
    quizzes: [
        {
            id: 'quiz_default_1',
            nazwa: 'Test diagnostyczny - Matematyka klasa 8',
            przedmiot: 'matematyka',
            klasa: '8a',
            nauczyciel: 'teacher_paulina',
            czasTrwania: 45,
            punkty: 40,
            aktywny: true,
            dataUtworzenia: '2024-01-15T10:00:00Z',
            pytania: [
                {
                    id: 'q1',
                    tresc: 'Rozwiąż równanie: 3x² - 12x + 9 = 0',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 'x = 1 lub x = 3',
                    kryteriaOceniania: [
                        'Zastosowanie wzoru skróconego mnożenia lub delty',
                        'Poprawne obliczenia',
                        'Podanie obu rozwiązań',
                        'Weryfikacja odpowiedzi'
                    ]
                },
                {
                    id: 'q2',
                    tresc: 'Oblicz pole trójkąta o bokach długości 5 cm, 12 cm i 13 cm.',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 'P = 30 cm²',
                    kryteriaOceniania: [
                        'Rozpoznanie trójkąta prostokątnego (5² + 12² = 13²)',
                        'Zastosowanie wzoru P = ½ · a · b',
                        'Poprawne obliczenia',
                        'Podanie jednostki'
                    ]
                },
                {
                    id: 'q3',
                    tresc: 'W urnie znajduje się 5 kul białych i 3 czarne. Oblicz prawdopodobieństwo wylosowania kuli białej.',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 'P = 5/8',
                    kryteriaOceniania: [
                        'Obliczenie liczby wszystkich kul (8)',
                        'Zastosowanie wzoru na prawdopodobieństwo',
                        'Uproszczenie wyniku (jeśli możliwe)',
                        'Podanie wyniku w postaci ułamka'
                    ]
                },
                {
                    id: 'q4',
                    tresc: 'Przedstaw liczbę 72 w postaci iloczynu liczb pierwszych.',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: '72 = 2³ · 3²',
                    kryteriaOceniania: [
                        'Systematyczny rozkład liczby',
                        'Znalezienie wszystkich czynników pierwszych',
                        'Zapisanie w postaci potęg',
                        'Poprawność rozkładu'
                    ]
                }
            ]
        },
        {
            id: 'quiz_default_2',
            nazwa: 'Kartkówka - Fizyka - Ruch i siły',
            przedmiot: 'fizyka',
            klasa: '7a',
            nauczyciel: 'teacher_paulina',
            czasTrwania: 20,
            punkty: 20,
            aktywny: true,
            dataUtworzenia: '2024-01-20T09:00:00Z',
            pytania: [
                {
                    id: 'q1',
                    tresc: 'Samochód porusza się ze stałą prędkością 72 km/h. Jaką drogę pokona w czasie 15 minut?',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 's = 18 km',
                    kryteriaOceniania: [
                        'Zamiana jednostek czasu (15 min = 0,25 h)',
                        'Zastosowanie wzoru s = v · t',
                        'Poprawne obliczenia',
                        'Podanie wyniku z jednostką'
                    ]
                },
                {
                    id: 'q2',
                    tresc: 'Na ciało o masie 2 kg działa siła 10 N. Oblicz przyspieszenie tego ciała.',
                    typ: 'otwarte',
                    punkty: 10,
                    odpowiedzWzorcowa: 'a = 5 m/s²',
                    kryteriaOceniania: [
                        'Zastosowanie II zasady dynamiki Newtona (F = m · a)',
                        'Przekształcenie wzoru (a = F/m)',
                        'Podstawienie danych',
                        'Obliczenia i jednostka'
                    ]
                }
            ]
        }
    ]
};

exports.handler = async (event, context) => {
    // Obsługa CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Pobierz hasło nauczyciela z env
        const teacherPassword = process.env.TEACHER_PASSWORD || 'paulina#314159265';
        const teacherPasswordHash = hashPassword(teacherPassword);
        
        // Skopiuj dane i ustaw hasło nauczyciela
        const data = JSON.parse(JSON.stringify(DEFAULT_DATA));
        const paulina = data.users.find(u => u.username === 'paulinaodmatematyki');
        if (paulina) {
            paulina.password = teacherPasswordHash;
        }

        // Zwróć dane
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: data,
                info: {
                    totalUsers: data.users.length,
                    teachers: data.users.filter(u => u.role === 'teacher').length,
                    students: data.users.filter(u => u.role === 'student').length,
                    parents: data.users.filter(u => u.role === 'parent').length,
                    quizzes: data.quizzes.length
                }
            })
        };

    } catch (error) {
        console.error('Default data error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};