/**
 * System inicjalizacji aplikacji QuizMaster
 * Pobiera dane z Netlify Functions i inicjalizuje localStorage
 */

class AppInitializer {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
    }

    /**
     * Inicjalizuje aplikację
     */
    async initialize() {
        // Zapobiegaj wielokrotnej inicjalizacji
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        console.log('🚀 Inicjalizacja QuizMaster...');
        
        try {
            // Sprawdź czy mamy już dane
            const hasUsers = localStorage.getItem('users');
            const initVersion = localStorage.getItem('initVersion');
            const currentVersion = '2.0'; // Zwiększ aby wymusić reinicjalizację
            
            if (hasUsers && initVersion === currentVersion) {
                console.log('✅ Dane już zainicjalizowane (wersja ' + currentVersion + ')');
                this.initialized = true;
                return true;
            }

            console.log('📥 Pobieranie domyślnych danych...');
            
            // Pobierz dane z Netlify Function
            const response = await fetch('/.netlify/functions/default-data');
            
            if (!response.ok) {
                throw new Error('Nie można pobrać danych: ' + response.statusText);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                // Zapisz dane do localStorage
                localStorage.setItem('users', JSON.stringify(result.data.users));
                localStorage.setItem('quizzes', JSON.stringify(result.data.quizzes));
                localStorage.setItem('initVersion', currentVersion);
                
                console.log('✅ Dane załadowane pomyślnie!');
                console.log(`📊 Statystyki:
- Użytkownicy: ${result.info.totalUsers}
  - Nauczyciele: ${result.info.teachers}
  - Uczniowie: ${result.info.students}  
  - Rodzice: ${result.info.parents}
- Quizy: ${result.info.quizzes}`);
                
                this.initialized = true;
                return true;
            }
            
            throw new Error('Nieprawidłowa odpowiedź serwera');
            
        } catch (error) {
            console.error('❌ Błąd inicjalizacji:', error);
            
            // Fallback - użyj lokalnych danych awaryjnych
            console.log('⚠️ Używam lokalnych danych awaryjnych...');
            this.initializeFallbackData();
            
            return false;
        }
    }

    /**
     * Inicjalizacja awaryjna z minimalnym zestawem danych
     */
    initializeFallbackData() {
        const fallbackUsers = [
            {
                id: 'teacher_paulina',
                userId: 'teacher_paulina',
                username: 'paulinaodmatematyki',
                password: this.hashPassword('paulina#314159265'),
                role: 'teacher',
                fullName: 'Paulina Kowalska',
                createdAt: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('users', JSON.stringify(fallbackUsers));
        localStorage.setItem('initVersion', '2.0');
        
        console.log('✅ Dane awaryjne załadowane');
    }

    /**
     * Hashuje hasło
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
     * Pokazuje informacje o dostępnych kontach
     */
    showAvailableAccounts() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        console.log('📋 Dostępne konta:');
        console.log('================');
        
        // Nauczyciele
        const teachers = users.filter(u => u.role === 'teacher');
        if (teachers.length > 0) {
            console.log('👩‍🏫 NAUCZYCIELE:');
            teachers.forEach(t => {
                console.log(`  • ${t.username} (${t.fullName || t.imie + ' ' + t.nazwisko})`);
            });
        }
        
        // Uczniowie
        const students = users.filter(u => u.role === 'student');
        if (students.length > 0) {
            console.log('\n👥 UCZNIOWIE (hasło: uczen123):');
            students.forEach(s => {
                console.log(`  • ${s.username} (${s.fullName || s.imie + ' ' + s.nazwisko}) - klasa ${s.klasa}`);
            });
        }
        
        // Rodzice
        const parents = users.filter(u => u.role === 'parent');
        if (parents.length > 0) {
            console.log('\n👨‍👩‍👧 RODZICE (hasło: rodzic123):');
            parents.forEach(p => {
                console.log(`  • ${p.username} (${p.fullName || p.imie + ' ' + p.nazwisko})`);
            });
        }
        
        console.log('\n💡 Wskazówka: Aby zobaczyć to ponownie, wpisz w konsoli:');
        console.log('   appInitializer.showAvailableAccounts()');
    }

    /**
     * Wymusza ponowną inicjalizację
     */
    async forceReinitialize() {
        console.log('🔄 Wymuszanie reinicjalizacji...');
        localStorage.removeItem('initVersion');
        this.initialized = false;
        this.initPromise = null;
        await this.initialize();
        location.reload();
    }
}

// Utwórz globalną instancję
window.appInitializer = new AppInitializer();

// Automatyczna inicjalizacja
if (typeof window !== 'undefined') {
    // Czekaj na załadowanie DOM i CryptoJS
    window.addEventListener('DOMContentLoaded', async () => {
        // Daj chwilę na załadowanie innych skryptów
        setTimeout(async () => {
            await window.appInitializer.initialize();
            
            // Pokaż dostępne konta w konsoli
            if (!sessionStorage.getItem('accountsShown')) {
                window.appInitializer.showAvailableAccounts();
                sessionStorage.setItem('accountsShown', 'true');
            }
        }, 100);
    });
}