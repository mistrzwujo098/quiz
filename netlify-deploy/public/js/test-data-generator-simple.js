/**
 * Uproszczony generator danych testowych - tylko Paulina jako nauczyciel
 */

class SimpleTestDataGenerator {
    constructor() {
        this.currentDate = new Date();
    }

    /**
     * Hashuje hasło używając SHA256
     */
    hashPassword(password) {
        if (typeof CryptoJS !== 'undefined') {
            return CryptoJS.SHA256(password).toString();
        }
        
        // Prosty fallback
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }

    /**
     * Generuje i zapisuje tylko konto Pauliny
     */
    generatePaulinaOnly() {
        console.log('🎯 Tworzenie konta nauczyciela Pauliny...');
        
        // Pobierz istniejących użytkowników
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Usuń stare konto Pauliny jeśli istnieje
        users = users.filter(u => u.username !== 'paulinaodmatematyki');
        
        // Dodaj nowe konto Pauliny
        const paulina = {
            id: 'teacher_paulina',
            userId: 'teacher_paulina',
            username: 'paulinaodmatematyki',
            imie: 'Paulina',
            nazwisko: 'Kowalska',
            email: 'paulina.kowalska@szkola.edu.pl',
            password: this.hashPassword('paulina#314159265'),
            haslo: this.hashPassword('paulina#314159265'),
            role: 'teacher',
            rola: 'teacher',
            przedmioty: ['matematyka', 'fizyka', 'chemia', 'informatyka'],
            klasy: ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b', '8a', '8b'],
            tytul: 'mgr',
            telefon: '123-456-789',
            gabinetNumer: '201',
            godzinyKonsultacji: 'Wtorek 14:00-15:00, Czwartek 13:00-14:00',
            aktywny: true,
            wychowawcaKlasy: '8a',
            uprawnienia: {
                tworzenieTesztow: true,
                ocenianie: true,
                zarzadzanieKlasami: true,
                raporty: true,
                wychowawstwo: true
            }
        };
        
        users.push(paulina);
        
        // Zapisz użytkowników
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('✅ Konto nauczyciela utworzone!');
        console.log('📝 Dane logowania:');
        console.log('   Login: paulinaodmatematyki');
        console.log('   Hasło: paulina#314159265');
        
        return paulina;
    }

    /**
     * Aktualizuje wszystkich uczniów i rodziców aby byli przypisani do Pauliny
     */
    updateUsersForPaulina() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Znajdź wszystkich uczniów
        const students = users.filter(u => u.role === 'student' || u.rola === 'student');
        const parents = users.filter(u => u.role === 'parent' || u.rola === 'parent');
        
        console.log(`📚 Znaleziono ${students.length} uczniów i ${parents.length} rodziców`);
        
        // Aktualizuj uczniów
        students.forEach(student => {
            if (!student.nauczyciele) {
                student.nauczyciele = [];
            }
            if (!student.nauczyciele.includes('teacher_paulina')) {
                student.nauczyciele.push('teacher_paulina');
            }
            student.wychowawca = 'teacher_paulina';
        });
        
        // Aktualizuj rodziców
        parents.forEach(parent => {
            if (!parent.kontaktNauczyciele) {
                parent.kontaktNauczyciele = [];
            }
            if (!parent.kontaktNauczyciele.includes('teacher_paulina')) {
                parent.kontaktNauczyciele.push('teacher_paulina');
            }
        });
        
        // Zapisz zmiany
        localStorage.setItem('users', JSON.stringify(users));
        
        console.log('✅ Wszyscy uczniowie i rodzice przypisani do Pauliny');
    }

    /**
     * Główna funkcja
     */
    setupPaulina() {
        this.generatePaulinaOnly();
        this.updateUsersForPaulina();
        
        return {
            success: true,
            message: 'Konto nauczyciela Pauliny skonfigurowane pomyślnie!'
        };
    }
}

// Eksportuj jako globalną
window.SimpleTestDataGenerator = SimpleTestDataGenerator;

// Automatycznie wykonaj przy ładowaniu
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        const generator = new SimpleTestDataGenerator();
        generator.setupPaulina();
    });
}