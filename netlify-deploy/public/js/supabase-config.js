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
            window.SUPABASE_URL = config.url;
            window.SUPABASE_ANON_KEY = config.anonKey;
            return true;
        }
    } catch (error) {
        console.warn('Nie można pobrać konfiguracji Supabase z serwera');
    }
    
    // Fallback - użyj wartości z meta tagów (jeśli są)
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-anon-key"]');
    
    if (urlMeta && keyMeta) {
        window.SUPABASE_URL = urlMeta.content;
        window.SUPABASE_ANON_KEY = keyMeta.content;
        return true;
    }
    
    console.error('❌ Brak konfiguracji Supabase! Ustaw zmienne środowiskowe.');
    return false;
}

// Załaduj konfigurację przy starcie
window.addEventListener('DOMContentLoaded', async () => {
    const configLoaded = await loadSupabaseConfig();
    
    if (!configLoaded) {
        // Pokaż komunikat o błędzie
        document.body.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        text-align: center; background: #ff4444; color: white; padding: 20px; 
                        border-radius: 10px; font-family: Arial, sans-serif;">
                <h2>⚠️ Błąd konfiguracji</h2>
                <p>Brak konfiguracji Supabase!</p>
                <p>Skontaktuj się z administratorem.</p>
            </div>
        `;
    }
});