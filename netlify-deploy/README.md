# QuizMaster - Platforma Egzaminacyjna

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mistrzwujo098/quiz)

**💡 Używa Gemini 2.5 Flash** - najnowszy model AI z automatycznym fallbackiem

## 🚀 Funkcje

- ✅ Import arkuszy CKE z AI
- ✅ Ocenianie krokowe (0-5 punktów)
- ✅ Generator wariantów zadań
- ✅ Panel nauczyciela i ucznia
- ✅ Statystyki i analityka
- ✅ Eksport do PDF

## 📋 Wdrożenie na Netlify

### Opcja 1: Deploy przez GitHub (zalecane)

1. **Fork lub stwórz nowe repo**
2. **Wgraj pliki z tego folderu**
3. **Połącz z Netlify**:
   - Zaloguj się na [netlify.com](https://netlify.com)
   - "Add new site" → "Import an existing project"
   - Wybierz GitHub → Wybierz repo
   - Deploy!

### Opcja 2: Bezpośredni upload

1. Przeciągnij folder na [app.netlify.com/drop](https://app.netlify.com/drop)

## 🔑 Konfiguracja

### Ustaw zmienne środowiskowe w Netlify:

1. Site settings → Environment variables
2. Dodaj:
   - `GEMINI_API_KEY` = twój klucz z [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🧪 Testowanie lokalne

```bash
# Zainstaluj Netlify CLI
npm install -g netlify-cli

# Uruchom lokalnie
netlify dev
```

## 📁 Struktura

```
├── public/           # Pliki statyczne
│   ├── index.html   # Główna aplikacja
│   ├── js/          # Moduły JavaScript
│   └── *.json       # Dane aplikacji
├── functions/        # Netlify Functions (API)
│   ├── health.js    # Health check
│   └── gemini-generate.js  # Proxy dla Gemini
└── netlify.toml     # Konfiguracja Netlify
```

## 🎯 Demo

Po wdrożeniu:
1. Otwórz: `https://twoja-nazwa.netlify.app`
2. Zaloguj się: `nauczyciel` / `haslo123`
3. Menu → Więcej → Import CKE

## 📞 Wsparcie

- [Dokumentacja Netlify](https://docs.netlify.com)
- [Status Netlify](https://www.netlifystatus.com)

---
*QuizMaster v2.0 - Powered by Netlify*