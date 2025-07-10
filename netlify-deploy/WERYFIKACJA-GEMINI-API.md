# 🔍 Weryfikacja połączenia z Gemini API na Netlify

## 📋 Lista kontrolna

### 1. **Sprawdzenie konfiguracji Netlify**

#### A. Zmienne środowiskowe
1. Zaloguj się do Netlify: https://app.netlify.com
2. Wybierz swoją aplikację
3. Przejdź do: **Site settings** → **Environment variables**
4. Sprawdź czy istnieje zmienna:
   - Key: `GEMINI_API_KEY`
   - Value: Twój klucz API z Google AI Studio

#### B. Jeśli brak klucza:
1. Kliknij **Add a variable**
2. Dodaj:
   - Key: `GEMINI_API_KEY`
   - Value: [wklej klucz z https://makersuite.google.com/app/apikey]
3. Kliknij **Save**
4. **WAŻNE**: Zrestartuj deploy:
   - Deploys → Trigger deploy → **Clear cache and deploy site**

### 2. **Test online**

#### A. Użyj strony testowej:
1. Otwórz: `https://twoja-nazwa.netlify.app/test-gemini-api.html`
2. Kliknij kolejno wszystkie przyciski testowe
3. Sprawdź wyniki

#### B. Co powinno działać:
- ✅ Health endpoint: `api_configured: true`
- ✅ Test Generate: Odpowiedź "Warszawa" na pytanie o stolicę
- ✅ AI Grader: Inicjalizacja bez błędów
- ✅ Moduły AI: Wszystkie załadowane z dostępem do Gemini

### 3. **Szybki test w konsoli**

Otwórz konsolę przeglądarki (F12) na swojej aplikacji i wklej:

```javascript
// Test 1: Health check
fetch('/.netlify/functions/health')
  .then(r => r.json())
  .then(data => console.log('Health:', data));

// Test 2: Gemini generate
fetch('/.netlify/functions/gemini-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Odpowiedz TAK lub NIE: Czy 2+2=4?',
    maxTokens: 10
  })
})
.then(r => r.json())
.then(data => console.log('Gemini:', data));
```

## 🚨 Rozwiązywanie problemów

### Problem: "API key not configured"
**Rozwiązanie:**
1. Sprawdź zmienne środowiskowe w Netlify
2. Upewnij się, że nazwa to dokładnie `GEMINI_API_KEY`
3. Po dodaniu klucza - **Clear cache and deploy**

### Problem: "403 Forbidden" lub "Invalid API key"
**Rozwiązanie:**
1. Sprawdź czy klucz API jest aktywny
2. Wygeneruj nowy klucz: https://makersuite.google.com/app/apikey
3. Zaktualizuj w Netlify

### Problem: Funkcje AI nie działają mimo poprawnego API
**Rozwiązanie:**
1. Wyczyść cache przeglądarki (Ctrl+Shift+R)
2. Sprawdź konsolę błędów JavaScript
3. Upewnij się, że wszystkie pliki JS są załadowane

## 📊 Struktura API

### Endpoints dostępne na Netlify:
- `/.netlify/functions/health` - sprawdzenie statusu
- `/.netlify/functions/gemini-generate` - generowanie treści

### Moduły używające Gemini API:
1. **AIGrader** - ocenianie odpowiedzi
2. **RecommendationSystem** - rekomendacje nauki
3. **StepGradingSystem** - ocenianie krokowe

## ✅ Potwierdzenie działania

Jeśli wszystko działa poprawnie, powinieneś zobaczyć:

1. W teście Health:
   ```json
   {
     "status": "ok",
     "api_configured": true,
     "config_method": "netlify_env"
   }
   ```

2. W teście Generate:
   - Odpowiedź AI na proste pytanie

3. W panelu ucznia:
   - Działające przyciski AI (nie pokazują "niedostępne")
   - Możliwość użycia AI Grader
   - Działające rekomendacje

## 🔗 Przydatne linki

- [Google AI Studio](https://makersuite.google.com/app/apikey) - zarządzanie kluczami API
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/) - dokumentacja
- [Status Gemini API](https://status.cloud.google.com/) - sprawdzenie dostępności usługi