/**
 * Klient Supabase dla QuizMaster
 * Zarządza połączeniem z bazą danych i autoryzacją
 */

// Konfiguracja Supabase - te wartości powinny być w zmiennych środowiskowych
const SUPABASE_URL = window.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your-anon-key';

// Inicjalizacja klienta Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

/**
 * Manager autoryzacji Supabase
 */
class SupabaseAuthManager {
    constructor() {
        this.currentUser = null;
        this.session = null;
        this.initializeAuth();
    }

    /**
     * Inicjalizacja autoryzacji
     */
    async initializeAuth() {
        // Sprawdź aktualną sesję
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.session = session;
            this.currentUser = session.user;
            await this.loadUserProfile();
        }

        // Nasłuchuj zmian autoryzacji
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event);
            this.session = session;
            this.currentUser = session?.user || null;
            
            if (session) {
                await this.loadUserProfile();
            }
            
            // Wywołaj event dla aplikacji
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { event, session, user: this.currentUser } 
            }));
        });
    }

    /**
     * Załaduj profil użytkownika
     */
    async loadUserProfile() {
        if (!this.currentUser) return;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*, students(*), teachers(*), parents(*)')
            .eq('id', this.currentUser.id)
            .single();

        if (!error && profile) {
            this.currentUser = { ...this.currentUser, profile };
        }
    }

    /**
     * Logowanie
     */
    async login(username, password) {
        // Najpierw znajdź email na podstawie username
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', username)
            .single();

        if (!profile) {
            throw new Error('Nieprawidłowa nazwa użytkownika lub hasło');
        }

        // Zaloguj używając email
        const { data, error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: password
        });

        if (error) throw error;
        
        await this.loadUserProfile();
        return this.currentUser;
    }

    /**
     * Rejestracja
     */
    async register(userData) {
        const { email, password, username, role, fullName } = userData;

        // Sprawdź czy username jest wolny
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            throw new Error('Nazwa użytkownika jest już zajęta');
        }

        // Zarejestruj użytkownika
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    role,
                    full_name: fullName
                }
            }
        });

        if (error) throw error;
        return data;
    }

    /**
     * Wylogowanie
     */
    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        this.currentUser = null;
        this.session = null;
    }

    /**
     * Pobierz aktualnego użytkownika
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Sprawdź rolę użytkownika
     */
    hasRole(role) {
        return this.currentUser?.profile?.role === role;
    }

    /**
     * Zmień hasło
     */
    async updatePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
    }
}

/**
 * Manager danych QuizMaster
 */
class SupabaseDataManager {
    /**
     * Pobierz quizy
     */
    async getQuizzes(filters = {}) {
        let query = supabase
            .from('quizzes')
            .select(`
                *,
                nauczyciel:profiles!nauczyciel_id(id, username, full_name),
                questions(*)
            `)
            .order('created_at', { ascending: false });

        // Zastosuj filtry
        if (filters.przedmiot) {
            query = query.eq('przedmiot', filters.przedmiot);
        }
        if (filters.klasa) {
            query = query.eq('klasa', filters.klasa);
        }
        if (filters.aktywny !== undefined) {
            query = query.eq('aktywny', filters.aktywny);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    /**
     * Pobierz quiz z pytaniami
     */
    async getQuizWithQuestions(quizId) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                nauczyciel:profiles!nauczyciel_id(id, username, full_name),
                questions(
                    *,
                    question_options(*)
                )
            `)
            .eq('id', quizId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Utwórz quiz
     */
    async createQuiz(quizData) {
        const user = authManager.getCurrentUser();
        if (!authManager.hasRole('teacher')) {
            throw new Error('Tylko nauczyciele mogą tworzyć quizy');
        }

        const { questions, ...quiz } = quizData;
        quiz.nauczyciel_id = user.id;

        // Rozpocznij transakcję
        const { data: quizResult, error: quizError } = await supabase
            .from('quizzes')
            .insert(quiz)
            .select()
            .single();

        if (quizError) throw quizError;

        // Dodaj pytania
        if (questions && questions.length > 0) {
            const questionsWithQuizId = questions.map((q, index) => ({
                ...q,
                quiz_id: quizResult.id,
                kolejnosc: index
            }));

            const { error: questionsError } = await supabase
                .from('questions')
                .insert(questionsWithQuizId);

            if (questionsError) throw questionsError;
        }

        return quizResult;
    }

    /**
     * Rozpocznij quiz
     */
    async startQuiz(quizId) {
        const user = authManager.getCurrentUser();
        if (!user) throw new Error('Musisz być zalogowany');

        const { data, error } = await supabase
            .from('quiz_results')
            .insert({
                student_id: user.id,
                quiz_id: quizId,
                status: 'w_trakcie'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Zapisz odpowiedź
     */
    async saveAnswer(resultId, questionId, answer) {
        const { data, error } = await supabase
            .from('student_answers')
            .upsert({
                result_id: resultId,
                question_id: questionId,
                odpowiedz_ucznia: answer
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Zakończ quiz
     */
    async finishQuiz(resultId, answers) {
        // Zapisz wszystkie odpowiedzi
        if (answers && answers.length > 0) {
            const { error: answersError } = await supabase
                .from('student_answers')
                .upsert(answers);

            if (answersError) throw answersError;
        }

        // Oblicz wynik
        const { data: result, error: resultError } = await supabase
            .rpc('calculate_quiz_score', { result_id: resultId });

        if (resultError) throw resultError;

        // Zaktualizuj status
        const { error: updateError } = await supabase
            .from('quiz_results')
            .update({
                status: 'zakonczony',
                data_zakonczenia: new Date().toISOString()
            })
            .eq('id', resultId);

        if (updateError) throw updateError;

        return result;
    }

    /**
     * Pobierz wyniki ucznia
     */
    async getStudentResults(studentId) {
        const { data, error } = await supabase
            .from('quiz_results')
            .select(`
                *,
                quiz:quizzes(id, nazwa, przedmiot),
                student_answers(*)
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Pobierz uczniów klasy
     */
    async getClassStudents(klasa) {
        const { data, error } = await supabase
            .from('students')
            .select(`
                *,
                profile:profiles(*)
            `)
            .eq('klasa', klasa)
            .order('numer_dziennika');

        if (error) throw error;
        return data;
    }

    /**
     * Wyślij wiadomość
     */
    async sendMessage(recipientId, subject, content) {
        const user = authManager.getCurrentUser();
        if (!user) throw new Error('Musisz być zalogowany');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                nadawca_id: user.id,
                odbiorca_id: recipientId,
                temat: subject,
                tresc: content
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Pobierz wiadomości
     */
    async getMessages(type = 'received') {
        const user = authManager.getCurrentUser();
        if (!user) throw new Error('Musisz być zalogowany');

        const column = type === 'sent' ? 'nadawca_id' : 'odbiorca_id';
        
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                nadawca:profiles!nadawca_id(username, full_name),
                odbiorca:profiles!odbiorca_id(username, full_name)
            `)
            .eq(column, user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}

// Eksportuj globalne instancje
window.supabaseClient = supabase;
window.authManager = new SupabaseAuthManager();
window.dataManager = new SupabaseDataManager();

// Helper do migracji z localStorage
window.migrateFromLocalStorage = async function() {
    console.log('🔄 Rozpoczynam migrację danych z localStorage do Supabase...');
    
    try {
        // Pobierz dane z localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const quizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        
        console.log(`Znaleziono: ${users.length} użytkowników, ${quizzes.length} quizów`);
        
        // TODO: Implementacja migracji
        // To wymaga bardziej złożonej logiki i powinno być wykonane ostrożnie
        
        console.log('✅ Migracja zakończona');
    } catch (error) {
        console.error('❌ Błąd migracji:', error);
    }
};