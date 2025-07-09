// Simple test to verify servers are running
const http = require('http');

async function testWebServer() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8000', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Web server is running on port 8000');
        resolve(true);
      } else {
        reject(new Error(`Web server returned status ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(new Error(`Web server error: ${err.message}`));
    });
  });
}

async function testApiProxy() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          if (health.status === 'healthy') {
            console.log('✅ API proxy is running on port 3001');
            resolve(true);
          } else {
            reject(new Error('API proxy is not healthy'));
          }
        } catch (e) {
          reject(new Error(`API proxy response error: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`API proxy error: ${err.message}`));
    });
  });
}

async function runTests() {
  console.log('🧪 Testing server connectivity...\n');
  
  try {
    await testWebServer();
    await testApiProxy();
    console.log('\n✅ All servers are running correctly!');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTests();