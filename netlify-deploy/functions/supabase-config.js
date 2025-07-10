/**
 * Netlify Function - Konfiguracja Supabase
 * Bezpiecznie udostępnia konfigurację Supabase
 */

exports.handler = async (event, context) => {
    // Tylko GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Sprawdź czy mamy konfigurację
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Brak konfiguracji Supabase w zmiennych środowiskowych' 
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
};