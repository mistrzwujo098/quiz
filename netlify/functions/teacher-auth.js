/**
 * Netlify Function do autoryzacji nauczyciela
 * Pobiera hasło z zmiennych środowiskowych
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Obsługa CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Tylko POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action } = JSON.parse(event.body || '{}');

    if (action === 'getTeacherCredentials') {
      // Pobierz hasło ze zmiennych środowiskowych
      const teacherPassword = process.env.TEACHER_PASSWORD || 'paulina#314159265';
      
      // Zwróć zaszyfrowane dane
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          username: 'paulinaodmatematyki',
          // Nie zwracamy hasła w plain text - tylko hash
          passwordHash: crypto
            .createHash('sha256')
            .update(teacherPassword)
            .digest('hex')
        })
      };
    }

    if (action === 'verifyTeacher') {
      const body = JSON.parse(event.body || '{}');
      const { password } = body;
      const teacherPassword = process.env.TEACHER_PASSWORD || 'paulina#314159265';
      
      // Weryfikuj hasło
      const isValid = password === teacherPassword;
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          valid: isValid
        })
      };
    }

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Teacher auth error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};