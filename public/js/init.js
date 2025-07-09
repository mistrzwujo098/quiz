// Inicjalizacja aplikacji QuizMaster
document.addEventListener('DOMContentLoaded', function() {
    console.log('QuizMaster - Inicjalizacja aplikacji');
    
    // Inicjalizacja domyślnych użytkowników
    initializeDefaultData();
    
    // Sprawdź czy są zadania w bazie
    const zadaniaCount = JSON.parse(localStorage.getItem('zadaniaDB') || '[]').length;
    console.log(`Liczba zadań w bazie: ${zadaniaCount}`);
});

function initializeDefaultData() {
    // Sprawdź czy to pierwsze uruchomienie
    const initialized = localStorage.getItem('quizmaster_initialized');
    if (initialized) {
        console.log('Aplikacja już zainicjalizowana');
        return;
    }
    
    // Inicjalizuj użytkowników
    const users = [
        {
            id: 1,
            username: 'nauczyciel',
            password: CryptoJS.SHA256('haslo123').toString(),
            role: 'teacher',
            name: 'Jan Kowalski'
        },
        {
            id: 2,
            username: 'admin',
            password: CryptoJS.SHA256('admin123').toString(),
            role: 'teacher',
            name: 'Administrator'
        },
        // Uczniowie
        {
            id: 3,
            username: 'anna.nowak',
            password: CryptoJS.SHA256('uczen123').toString(),
            role: 'student',
            name: 'Anna Nowak',
            category: 'egzamin-osmoklasisty'
        },
        {
            id: 4,
            username: 'jan.wisniewski',
            password: CryptoJS.SHA256('uczen123').toString(),
            role: 'student',
            name: 'Jan Wiśniewski',
            category: 'matura-podstawowa'
        },
        {
            id: 5,
            username: 'maria.dabrowska',
            password: CryptoJS.SHA256('uczen123').toString(),
            role: 'student',
            name: 'Maria Dąbrowska',
            category: 'matura-rozszerzona'
        }
    ];
    
    // Dodaj specjalne konto administratora
    // Hasło jest przechowywane jako hash w zmiennej środowiskowej
    const adminHash = localStorage.getItem('special_admin_hash');
    if (adminHash) {
        users.push({
            id: 999,
            username: 'paulinaodmatematyki',
            password: adminHash,
            role: 'teacher',
            name: 'Paulina od Matematyki'
        });
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Inicjalizuj puste tablice dla innych danych
    if (!localStorage.getItem('exams')) {
        localStorage.setItem('exams', JSON.stringify([]));
    }
    if (!localStorage.getItem('results')) {
        localStorage.setItem('results', JSON.stringify([]));
    }
    if (!localStorage.getItem('groups')) {
        localStorage.setItem('groups', JSON.stringify([]));
    }
    if (!localStorage.getItem('notifications')) {
        localStorage.setItem('notifications', JSON.stringify([]));
    }
    
    // Oznacz jako zainicjalizowane
    localStorage.setItem('quizmaster_initialized', 'true');
    console.log('Aplikacja zainicjalizowana pomyślnie');
}

// Funkcja pomocnicza do ustawienia hasła specjalnego konta (do użycia w konsoli)
window.setSpecialAdminPassword = function(password) {
    const hash = CryptoJS.SHA256(password).toString();
    localStorage.setItem('special_admin_hash', hash);
    console.log('Hasło administratora ustawione. Odśwież stronę.');
    localStorage.removeItem('quizmaster_initialized');
};
