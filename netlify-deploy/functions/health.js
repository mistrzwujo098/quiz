// Health check endpoint
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'ok',
      timestamp: Math.floor(Date.now() / 1000),
      api_configured: !!process.env.GEMINI_API_KEY,
      config_method: process.env.GEMINI_API_KEY ? 'netlify_env' : 'not_found',
      environment: 'netlify',
      node_version: process.version
    })
  };
};