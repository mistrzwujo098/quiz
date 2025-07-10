/**
 * Konfiguracja Supabase dla QuizMaster
 * 
 * WAŻNE: Te wartości powinny być ustawione w zmiennych środowiskowych Netlify:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */

// Funkcja do bezpiecznego pobierania konfiguracji
async function loadSupabaseConfig() {
    try {
        // Spróbuj pobrać z Netlify Function
        const response = await fetch('/.netlify/functions/supabase-config');
        if (response.ok) {
            const config = await response.json();
            if (config.url && config.anonKey) {
                window.SUPABASE_URL = config.url;
                window.SUPABASE_ANON_KEY = config.anonKey;
                return true;
            }
        } else if (response.status === 404) {
            // Brak konfiguracji - to normalne, aplikacja będzie działać w trybie offline
            console.log('📦 Supabase nie skonfigurowany - aplikacja działa w trybie offline');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Nie można sprawdzić konfiguracji Supabase:', error.message);
    }
    
    // Fallback - użyj wartości z meta tagów (jeśli są)
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
    
    if (urlMeta && keyMeta) {
        window.SUPABASE_URL = urlMeta.content;
        window.SUPABASE_ANON_KEY = keyMeta.content;
        return true;
    }
    
    // Brak konfiguracji - aplikacja będzie działać offline
    console.log('📦 Aplikacja działa w trybie offline (localStorage)');
    return false;
}

// Załaduj konfigurację przy starcie
window.addEventListener('DOMContentLoaded', async () => {
    const configLoaded = await loadSupabaseConfig();
    
    // Nie pokazuj błędu - aplikacja może działać offline
    if (!configLoaded) {
        console.log('🔄 Aplikacja uruchomiona w trybie offline');
    }
});