# Instrukcja wdrożenia QuizMaster na SeoHost

## 1. Przygotowanie plików

### A. Utwórz plik .env
Skopiuj `.env.example` jako `.env` i uzupełnij:
```env
GEMINI_API_KEY=twój_klucz_api_gemini
PORT=3001
NODE_ENV=production
DOMAIN=twojadomena.pl
ALLOWED_ORIGINS=https://twojadomena.pl,https://www.twojadomena.pl
```

### B. Użyj server-production.js
Zmień nazwę `server/server-production.js` na `server/server.js`

## 2. Upload plików przez FTP/Panel

Wgraj wszystkie pliki do katalogu aplikacji:
```
/home/twojlogin/domains/twojadomena.pl/public_html/
├── index.html
├── test-practice.html
├── fix-login.html
├── debug-login.html
├── package.json
├── .env
├── /js (cały folder)
├── /server
│   ├── server.js (użyj server-production.js)
│   └── package.json
└── .env.example
```

## 3. Konfiguracja w panelu SeoHost

### Node.js Configuration:
- **Node.js version**: 18.x (lub najnowsza dostępna)
- **Application mode**: production
- **Application root**: `/home/twojlogin/domains/twojadomena.pl/public_html/`
- **Application URL**: `https://twojadomena.pl`
- **Application startup file**: `server/server.js`

## 4. Instalacja zależności

W panelu SeoHost lub przez SSH:
```bash
cd /home/twojlogin/domains/twojadomena.pl/public_html/
npm install

cd server
npm install
```

## 5. Zmiana w index.html

Zmień URL API w pliku `index.html`:

Znajdź:
```javascript
const API_URL = 'http://localhost:3001/api/gemini';
```

Zmień na:
```javascript
const API_URL = window.location.origin + '/api/gemini';
```

## 6. Uruchomienie aplikacji

1. W panelu SeoHost kliknij "Start" przy aplikacji Node.js
2. Aplikacja powinna być dostępna pod: `https://twojadomena.pl`

## 7. Testowanie

1. Otwórz `https://twojadomena.pl`
2. Zaloguj się jako nauczyciel:
   - Login: `paulinaodmatematyki`
   - Hasło: `paulina#314159265`
3. Spróbuj wygenerować warianty zadania

## 8. Troubleshooting

### Problem: Aplikacja nie startuje
- Sprawdź logi w panelu SeoHost
- Upewnij się, że port 3001 jest dostępny
- Sprawdź czy plik .env istnieje i ma poprawny klucz API

### Problem: CORS errors
- Upewnij się, że DOMAIN w .env jest poprawna
- Sprawdź czy używasz HTTPS

### Problem: 404 na plikach JS
- Sprawdź strukturę katalogów
- Upewnij się, że folder /js został wgrany

## 9. Bezpieczeństwo

1. **Nigdy** nie commituj pliku .env do repozytorium
2. Ustaw odpowiednie uprawnienia:
```bash
chmod 600 .env
chmod 755 -R js/
chmod 755 -R server/
```

## 10. Opcjonalne: PM2 (jeśli SeoHost wspiera)

Jeśli SeoHost pozwala na PM2, utwórz `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'quizmaster',
    script: './server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

I uruchom:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Gotowe! 🎉

Twoja aplikacja QuizMaster powinna działać na SeoHost. 
W razie problemów sprawdź logi aplikacji w panelu SeoHost.