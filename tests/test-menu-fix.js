// Test poprawki menu nauczyciela
const puppeteer = require('puppeteer');

async function testMenuFix() {
  console.log('🧪 Testowanie poprawki menu nauczyciela...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1366, height: 768 } // Typowa rozdzielczość laptopa
    });
    
    const page = await browser.newPage();
    
    // Zaloguj się jako nauczyciel
    console.log('🔐 Logowanie jako nauczyciel...');
    await page.goto('http://localhost:8000');
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]');
    await page.type('input[placeholder="Nazwa użytkownika"]', 'paulinaodmatematyki');
    await page.type('input[placeholder="Hasło"]', 'paulina#314159265');
    await page.click('button[type="submit"]');
    
    // Poczekaj na panel nauczyciela
    await page.waitForTimeout(2000);
    
    // Screenshot przed kliknięciem dropdown
    await page.screenshot({ 
      path: 'tests/screenshots/teacher-menu-before.png',
      fullPage: false 
    });
    console.log('📸 Screenshot menu przed kliknięciem');
    
    // Sprawdź widoczne zakładki
    const visibleTabs = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.tab-modern');
      return Array.from(tabs).map(tab => ({
        text: tab.textContent.trim(),
        visible: tab.offsetWidth > 0
      }));
    });
    
    console.log('\n📊 Widoczne zakładki:');
    visibleTabs.forEach(tab => {
      console.log(`  - ${tab.text}: ${tab.visible ? '✅ widoczna' : '❌ ukryta'}`);
    });
    
    // Kliknij dropdown "Pozostałe"
    console.log('\n🖱️ Klikanie w dropdown "Pozostałe"...');
    const dropdownButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && btn.textContent.includes('Pozostałe')
      );
    });
    
    if (dropdownButton && dropdownButton.asElement()) {
      await dropdownButton.click();
      await page.waitForTimeout(1000);
      
      // Screenshot z otwartym dropdown
      await page.screenshot({ 
        path: 'tests/screenshots/teacher-menu-dropdown.png',
        fullPage: false 
      });
      console.log('📸 Screenshot z otwartym dropdown');
      
      // Sprawdź opcje w dropdown
      const dropdownOptions = await page.evaluate(() => {
        const options = document.querySelectorAll('.absolute.top-full button');
        return Array.from(options).map(opt => opt.textContent.trim());
      });
      
      console.log('\n📋 Opcje w dropdown:');
      dropdownOptions.forEach(opt => console.log(`  - ${opt}`));
    } else {
      console.log('❌ Nie znaleziono przycisku dropdown');
    }
    
    // Sprawdź szerokość menu
    const menuWidth = await page.evaluate(() => {
      const menuContainer = document.querySelector('.flex.space-x-1.mb-6.border-b');
      return menuContainer ? menuContainer.scrollWidth : 0;
    });
    
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    console.log(`\n📏 Szerokość menu: ${menuWidth}px`);
    console.log(`📏 Szerokość okna: ${viewportWidth}px`);
    console.log(`✅ Menu mieści się: ${menuWidth <= viewportWidth ? 'TAK' : 'NIE'}`);
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error(`\n❌ Błąd: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testMenuFix();