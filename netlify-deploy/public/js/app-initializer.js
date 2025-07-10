/**
 * App Initializer dla QuizMaster
 * Zarządza właściwą kolejnością inicjalizacji komponentów
 */

class AppInitializer {
    constructor() {
        this.initialized = false;
        this.initSteps = [];
    }

    /**
     * Główna funkcja inicjalizacji
     */
    async initialize() {
        console.log('🚀 Rozpoczynam inicjalizację aplikacji...');

        try {
            // 1. Poczekaj na załadowanie DOM
            await this.waitForDOM();

            // 2. Załaduj konfigurację Supabase
            await this.loadSupabaseConfig();

            // 3. Inicjalizuj Data Adapter
            await this.initializeDataAdapter();

            // 4. Sprawdź autoryzację
            await this.checkAuthentication();

            // 5. Załaduj początkowe dane
            await this.loadInitialData();

            // 6. Inicjalizuj komponenty UI
            await this.initializeUIComponents();

            this.initialized = true;
            console.log('✅ Aplikacja zainicjalizowana pomyślnie!');

            // Wywołaj event
            window.dispatchEvent(new CustomEvent('appInitialized', {
                detail: { success: true }
            }));

        } catch (error) {
            console.error('❌ Błąd inicjalizacji:', error);
            this.showInitError(error);

            window.dispatchEvent(new CustomEvent('appInitialized', {
                detail: { success: false, error }
            }));
        }
    }

    /**
     * Czekaj na załadowanie DOM
     */
    async waitForDOM() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    /**
     * Załaduj konfigurację Supabase
     */
    async loadSupabaseConfig() {
        console.log('📦 Ładowanie konfiguracji Supabase...');

        // Poczekaj aż funkcja loadSupabaseConfig będzie dostępna
        let attempts = 0;
        while (!window.loadSupabaseConfig && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.loadSupabaseConfig) {
            const loaded = await window.loadSupabaseConfig();
            if (!loaded) {
                console.warn('⚠️ Supabase niedostępny - używam trybu offline');
            }
        }
    }

    /**
     * Inicjalizuj Data Adapter
     */
    async initializeDataAdapter() {
        console.log('🔌 Inicjalizacja Data Adapter...');

        // Poczekaj na dataAdapter
        let attempts = 0;
        while (!window.dataAdapter && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.dataAdapter) {
            const mode = await window.dataAdapter.initialize();
            console.log(`📊 Data Adapter zainicjalizowany w trybie: ${mode}`);
        } else {
            throw new Error('Data Adapter niedostępny');
        }
    }

    /**
     * Sprawdź autoryzację
     */
    async checkAuthentication() {
        const currentUser = window.dataAdapter?.getCurrentUser();
        
        if (currentUser) {
            console.log(`👤 Zalogowany jako: ${currentUser.username} (${currentUser.role})`);
        } else {
            console.log('👤 Użytkownik niezalogowany');
        }
    }

    /**
     * Załaduj początkowe dane
     */
    async loadInitialData() {
        console.log('📚 Ładowanie początkowych danych...');

        // Sprawdź czy są dane w localStorage
        const hasLocalData = localStorage.getItem('users') || localStorage.getItem('quizzes');
        
        if (!hasLocalData && !window.dataAdapter?.isUsingSupabase()) {
            console.log('🔄 Brak danych - ładuję domyślne...');
            
            try {
                // Spróbuj pobrać dane z Netlify Function
                const response = await fetch('/.netlify/functions/default-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getDefaultData' })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Zapisz do localStorage
                    if (data.users) {
                        localStorage.setItem('users', JSON.stringify(data.users));
                    }
                    if (data.quizzes) {
                        localStorage.setItem('quizzes', JSON.stringify(data.quizzes));
                    }
                    
                    console.log('✅ Załadowano domyślne dane');
                }
            } catch (error) {
                console.warn('⚠️ Nie można załadować domyślnych danych:', error);
            }
        }
    }

    /**
     * Inicjalizuj komponenty UI
     */
    async initializeUIComponents() {
        console.log('🎨 Inicjalizacja komponentów UI...');

        // Poczekaj na React
        let attempts = 0;
        while ((!window.React || !window.ReactDOM) && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Wywołaj event że UI jest gotowe
        window.dispatchEvent(new CustomEvent('uiReady'));
    }

    /**
     * Pokaż błąd inicjalizacji
     */
    showInitError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc2626;
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            z-index: 9999;
            max-width: 400px;
            text-align: center;
        `;
        
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">⚠️ Błąd inicjalizacji</h3>
            <p style="margin: 0;">${error.message}</p>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 8px 16px;
                background: white;
                color: #dc2626;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            ">Odśwież stronę</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
}

// Utwórz globalną instancję
window.appInitializer = new AppInitializer();

// Automatyczna inicjalizacja
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Daj czas na załadowanie innych skryptów
        setTimeout(() => {
            window.appInitializer.initialize();
        }, 100);
    });
} else {
    // DOM już załadowany
    setTimeout(() => {
        window.appInitializer.initialize();
    }, 100);
}