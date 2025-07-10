// Netlify Function dla Gemini API
exports.handler = async (event, context) => {
  // Tylko POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { prompt, temperature = 0.7, maxTokens = 2048, topK = 40, topP = 0.95, safetySettings, model } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing prompt' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ 
          error: 'Service Unavailable',
          message: 'Gemini API key not configured'
        })
      };
    }

    // Lista modeli do wypróbowania w kolejności priorytetowej
    // Na podstawie testów tylko gemini-2.5-flash jest dostępny
    const modelsToTry = model ? [model] : [
      'gemini-2.5-flash', // Jedyny działający model 2.5
      'gemini-2.0-flash-exp', // fallback do 2.0
      'gemini-1.5-flash', // dodatkowy fallback
      'gemini-pro' // ostatni fallback
    ];
    
    let lastError = null;
    let successResponse = null;
    let usedModel = null;
    
    // Próbuj modele po kolei
    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                topK,
                topP
              },
              safetySettings: safetySettings || [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_NONE"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_NONE"
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          // Sukces! Dodaj informację o użytym modelu
          data._usedModel = modelName;
          successResponse = data;
          usedModel = modelName;
          console.log(`Successfully used model: ${modelName}`);
          break; // Znaleźliśmy działający model
        } else {
          // Model nie działa, zapisz błąd i próbuj następny
          lastError = {
            model: modelName,
            status: response.status,
            error: data
          };
          console.log(`Model ${modelName} failed with status ${response.status}`);
        }
      } catch (error) {
        // Błąd sieci lub inny, próbuj następny model
        lastError = {
          model: modelName,
          error: error.message
        };
        console.log(`Model ${modelName} error: ${error.message}`);
      }
    }
    
    // Jeśli znaleźliśmy działający model
    if (successResponse) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(successResponse)
      };
    }
    
    // Żaden model nie zadziałał
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'All models failed',
        message: 'None of the Gemini models responded successfully',
        triedModels: modelsToTry,
        lastError: lastError
      })
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      })
    };
  }
};