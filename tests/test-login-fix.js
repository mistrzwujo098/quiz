// Test poprawki logowania nauczyciela
const puppeteer = require('puppeteer');

async function testLoginFix() {
  console.log('🧪 Testowanie poprawki logowania nauczyciela...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Idź do strony
    console.log('📄 Ładowanie strony...');
    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0'
    });
    
    // Poczekaj na React
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 10000 }
    );
    console.log('✅ Strona załadowana');
    
    // Wyczyść localStorage i przeładuj stronę
    console.log('🧹 Czyszczenie localStorage...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    // Sprawdź użytkowników po inicjalizacji
    console.log('\n📊 Sprawdzanie użytkowników po inicjalizacji...');
    const usersAfterInit = await page.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.filter(u => u.username === 'paulinaodmatematyki').map(u => ({
        username: u.username,
        hasId: !!u.id,
        hasUserId: !!u.userId,
        id: u.id,
        userId: u.userId,
        role: u.role
      }));
    });
    
    console.log('Użytkownik paulinaodmatematyki:', JSON.stringify(usersAfterInit, null, 2));
    
    // Test logowania
    console.log('\n🔐 Testowanie logowania nauczyciela...');
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]');
    await page.type('input[placeholder="Nazwa użytkownika"]', 'paulinaodmatematyki');
    await page.type('input[placeholder="Hasło"]', 'paulina#314159265');
    
    // Screenshot przed logowaniem
    await page.screenshot({ path: 'tests/screenshots/before-login-fix.png' });
    
    await page.click('button[type="submit"]');
    
    // Poczekaj na rezultat
    await page.waitForTimeout(3000);
    
    // Screenshot po logowaniu
    await page.screenshot({ path: 'tests/screenshots/after-login-fix.png' });
    
    // Sprawdź czy zalogowano
    const pageContent = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const error = document.querySelector('.text-red-300');
      return {
        h1: h1 ? h1.textContent : null,
        h2: h2 ? h2.textContent : null,
        error: error ? error.textContent : null,
        url: window.location.href
      };
    });
    
    console.log('\n📋 Stan strony po logowaniu:');
    console.log('- H1:', pageContent.h1);
    console.log('- H2:', pageContent.h2);
    console.log('- Błąd:', pageContent.error);
    console.log('- URL:', pageContent.url);
    
    // Sprawdź sesję
    const session = await page.evaluate(() => {
      return sessionStorage.getItem('currentUser');
    });
    
    if (session) {
      console.log('\n✅ SUKCES! Użytkownik zalogowany:');
      console.log(JSON.parse(session));
    } else {
      console.log('\n❌ BŁĄD: Użytkownik nie został zalogowany');
    }
    
    // Poczekaj przed zamknięciem
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error(`\n❌ Błąd: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testLoginFix();