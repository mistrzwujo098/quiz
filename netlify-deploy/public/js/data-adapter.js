/**
 * Data Adapter dla QuizMaster
 * Warstwa abstrakcji między aplikacją a źródłem danych (localStorage lub Supabase)
 */

class DataAdapter {
    constructor() {
        this.mode = 'localStorage'; // 'localStorage' lub 'supabase'
        this.initialized = false;
    }

    /**
     * Inicjalizacja adaptera
     */
    async initialize() {
        // Najpierw spróbuj zainicjalizować Supabase
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && 
            window.SUPABASE_URL !== 'https://your-project.supabase.co') {
            
            // Inicjalizuj Supabase jeśli jeszcze nie zainicjalizowany
            if (!window.supabaseClient && window.initializeSupabase) {
                window.initializeSupabase();
            }
            
            // Sprawdź czy Supabase działa
            if (window.supabaseClient) {
                try {
                    // Test połączenia
                    const { data, error } = await window.supabaseClient
                        .from('profiles')
                        .select('count')
                        .limit(1);
                    
                    if (!error || error.code === 'PGRST116') { // PGRST116 = tabela pusta
                        this.mode = 'supabase';
                        console.log('✅ Używam Supabase jako źródła danych');
                    } else {
                        console.warn('⚠️ Supabase niedostępny:', error.message);
                        console.log('📦 Używam localStorage');
                    }
                } catch (e) {
                    console.warn('⚠️ Błąd połączenia z Supabase:', e.message);
                    console.log('📦 Używam localStorage');
                }
            }
        } else {
            console.log('📦 Supabase nie skonfigurowany - używam localStorage');
        }
        
        this.initialized = true;
        return this.mode;
    }

    /**
     * Autoryzacja - Login
     */
    async login(username, password) {
        if (this.mode === 'supabase') {
            return await window.authManager.login(username, password);
        } else {
            // localStorage fallback
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const hashedPassword = this.hashPassword(password);
            
            const user = users.find(u => 
                u.username === username && 
                u.password === hashedPassword
            );
            
            if (!user) {
                throw new Error('Nieprawidłowa nazwa użytkownika lub hasło');
            }
            
            // Zapisz sesję
            const session = {
                userId: user.id || user.userId,
                username: user.username,
                role: user.role,
                fullName: user.fullName || user.full_name,
                loginTime: new Date()
            };
            
            sessionStorage.setItem('currentUser', JSON.stringify(session));
            return session;
        }
    }

    /**
     * Wylogowanie
     */
    async logout() {
        if (this.mode === 'supabase') {
            await window.authManager.logout();
        } else {
            sessionStorage.removeItem('currentUser');
        }
    }

    /**
     * Pobierz aktualnego użytkownika
     */
    getCurrentUser() {
        if (this.mode === 'supabase') {
            return window.authManager.getCurrentUser();
        } else {
            const session = sessionStorage.getItem('currentUser');
            return session ? JSON.parse(session) : null;
        }
    }

    /**
     * Pobierz quizy
     */
    async getQuizzes(filters = {}) {
        if (this.mode === 'supabase') {
            return await window.dataManager.getQuizzes(filters);
        } else {
            let quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
            
            // Zastosuj filtry
            if (filters.przedmiot) {
                quizzes = quizzes.filter(q => q.przedmiot === filters.przedmiot);
            }
            if (filters.klasa) {
                quizzes = quizzes.filter(q => q.klasa === filters.klasa);
            }
            if (filters.aktywny !== undefined) {
                quizzes = quizzes.filter(q => q.aktywny === filters.aktywny);
            }
            
            return quizzes;
        }
    }

    /**
     * Pobierz quiz z pytaniami
     */
    async getQuizWithQuestions(quizId) {
        if (this.mode === 'supabase') {
            return await window.dataManager.getQuizWithQuestions(quizId);
        } else {
            const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
            return quizzes.find(q => q.id === quizId);
        }
    }

    /**
     * Utwórz quiz
     */
    async createQuiz(quizData) {
        if (this.mode === 'supabase') {
            return await window.dataManager.createQuiz(quizData);
        } else {
            const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
            const newQuiz = {
                ...quizData,
                id: `quiz_${Date.now()}`,
                dataUtworzenia: new Date().toISOString()
            };
            
            quizzes.push(newQuiz);
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            return newQuiz;
        }
    }

    /**
     * Zapisz wynik quizu
     */
    async saveQuizResult(resultData) {
        if (this.mode === 'supabase') {
            // TODO: Implementacja dla Supabase
            return resultData;
        } else {
            const results = JSON.parse(localStorage.getItem('quizResults') || '[]');
            const newResult = {
                ...resultData,
                id: `result_${Date.now()}`,
                dataZakonczenia: new Date().toISOString()
            };
            
            results.push(newResult);
            localStorage.setItem('quizResults', JSON.stringify(results));
            return newResult;
        }
    }

    /**
     * Pobierz wyniki ucznia
     */
    async getStudentResults(studentId) {
        if (this.mode === 'supabase') {
            return await window.dataManager.getStudentResults(studentId);
        } else {
            const results = JSON.parse(localStorage.getItem('quizResults') || '[]');
            return results.filter(r => r.studentId === studentId);
        }
    }

    /**
     * Pobierz użytkowników
     */
    async getUsers(filters = {}) {
        if (this.mode === 'supabase') {
            let query = window.supabaseClient
                .from('profiles')
                .select('*, students(*), teachers(*), parents(*)');
            
            if (filters.role) {
                query = query.eq('role', filters.role);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data;
        } else {
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            
            if (filters.role) {
                users = users.filter(u => u.role === filters.role);
            }
            
            return users;
        }
    }

    /**
     * Helper - hashowanie hasła
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
     * Sprawdź czy używamy Supabase
     */
    isUsingSupabase() {
        return this.mode === 'supabase';
    }
}

// Utwórz globalną instancję
window.dataAdapter = new DataAdapter();

// Automatyczna inicjalizacja
window.addEventListener('DOMContentLoaded', async () => {
    // Poczekaj na załadowanie Supabase
    setTimeout(async () => {
        const mode = await window.dataAdapter.initialize();
        console.log(`📊 Data Adapter zainicjalizowany w trybie: ${mode}`);
        
        // Wywołaj event
        window.dispatchEvent(new CustomEvent('dataAdapterReady', { 
            detail: { mode } 
        }));
    }, 500);
});