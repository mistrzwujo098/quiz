exports.handler = async (event) => {
  // Tylko POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body);
    
    // Sprawdź czy to nauczyciel Paulina
    if (username === 'paulinaodmatematyki') {
      const correctPassword = process.env.PAULINA_PASSWORD || 'paulina#314159265';
      
      if (password === correctPassword) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true,
            user: {
              username: 'paulinaodmatematyki',
              role: 'teacher',
              fullName: 'Paulina - Nauczyciel Matematyki'
            }
          })
        };
      }
    }
    
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};