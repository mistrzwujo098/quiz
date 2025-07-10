/**
 * Netlify Function do autoryzacji nauczyciela
 * Pobiera hasło z zmiennych środowiskowych
 */

exports.handler = async (event, context) => {
  // Tylko POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action } = JSON.parse(event.body);

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
          passwordHash: require('crypto')
            .createHash('sha256')
            .update(teacherPassword)
            .digest('hex')
        })
      };
    }

    if (action === 'verifyTeacher') {
      const { password } = JSON.parse(event.body);
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
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Teacher auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};