/**
 * Netlify Function - Supabase Configuration Provider
 * Bezpiecznie dostarcza konfigurację Supabase do frontendu
 */

exports.handler = async (event, context) => {
    // Obsługa CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: ''
        };
    }

    // Tylko GET jest dozwolony
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Method not allowed'
            })
        };
    }

    try {
        // Pobierz konfigurację z zmiennych środowiskowych
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Brak konfiguracji Supabase w zmiennych środowiskowych');
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Supabase configuration not found',
                    message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
                })
            };
        }

        // Zwróć konfigurację
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache na 1 godzinę
            },
            body: JSON.stringify({
                url: supabaseUrl,
                anonKey: supabaseAnonKey
            })
        };

    } catch (error) {
        console.error('Błąd w supabase-config:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};