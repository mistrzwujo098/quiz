# 🚀 Wdrożenie QuizMaster na Netlify - Instrukcja krok po kroku

## ✅ Dlaczego Netlify?

- **Darmowy hosting** z SSL
- **Automatyczny deploy** z GitHub
- **Netlify Functions** - obsługa API bez serwera
- **Zmienne środowiskowe** - bezpieczne przechowywanie kluczy
- **Brak problemów z Node.js** jak na shared hostingu

## 📋 Przygotowanie (5 minut)

### 1. Utwórz konto GitHub
- Wejdź na [github.com](https://github.com)
- Zarejestruj się (jeśli nie masz konta)

### 2. Utwórz nowe repozytorium
- Kliknij "New repository"
- Nazwa: `quizmaster`
- Ustaw jako "Private" (prywatne)
- NIE zaznaczaj "Initialize with README"
- Kliknij "Create repository"

## 🔧 Wgranie kodu (10 minut)

### Opcja A: Przez przeglądarkę (najłatwiejsze)

1. W swoim nowym repo kliknij "uploading an existing file"
2. Przeciągnij WSZYSTKIE pliki z folderu `netlify-deploy/`
3. Commit message: "Initial QuizMaster deployment"
4. Kliknij "Commit changes"

### Opcja B: Przez Git (dla zaawansowanych)

```bash
cd netlify-deploy
git init
git add .
git commit -m "Initial QuizMaster deployment"
git remote add origin https://github.com/TWOJE_KONTO/quizmaster.git
git push -u origin main
```

## 🌐 Deploy na Netlify (5 minut)

### 1. Utwórz konto Netlify
- Wejdź na [app.netlify.com](https://app.netlify.com)
- Kliknij "Sign up" → "GitHub"
- Autoryzuj dostęp

### 2. Połącz z GitHub
- Kliknij "Add new site" → "Import an existing project"
- Wybierz "GitHub"
- Znajdź i wybierz repo `quizmaster`

### 3. Konfiguracja
Netlify automatycznie wykryje ustawienia z `netlify.toml`.
Kliknij "Deploy site"!

## 🔑 Konfiguracja API (2 minuty)

### 1. Uzyskaj klucz Gemini
- Wejdź na [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
- Zaloguj się kontem Google
- Kliknij "Create API Key"
- Skopiuj klucz

### 2. Ustaw w Netlify
- W Netlify: Site settings → Environment variables
- Kliknij "Add a variable"
- Key: `GEMINI_API_KEY`
- Value: wklej swój klucz
- Kliknij "Save"

### 3. Zrestartuj
- Deploys → "Trigger deploy" → "Clear cache and deploy site"

## ✅ Gotowe!

### Twoja aplikacja działa pod adresem:
```
https://[nazwa-twojej-strony].netlify.app
```

### Testowanie:
1. Otwórz aplikację
2. Zaloguj się: `nauczyciel` / `haslo123`
3. Menu → Więcej → Import CKE

## 🎯 Własna domena (opcjonalne)

### Jeśli masz domenę (np. quiz.paulinaodmatematyki.com):
1. Domain settings → Add custom domain
2. Wpisz swoją domenę
3. Ustaw DNS według instrukcji Netlify

## 🔧 Aktualizacje

### Każda zmiana w GitHub = automatyczny deploy!
1. Edytuj pliki w GitHub
2. Commit changes
3. Netlify automatycznie zaktualizuje stronę

## ❓ Problemy?

### API nie działa
- Sprawdź: Site settings → Environment variables
- Upewnij się, że `GEMINI_API_KEY` jest ustawiony
- Trigger deploy → Clear cache and deploy

### Strona nie ładuje się
- Sprawdź: Deploys → Zobacz logi
- Upewnij się, że wszystkie pliki zostały wgrane

### Błąd 404
- Sprawdź strukturę folderów
- `public/` musi zawierać `index.html`

## 📞 Pomoc

- [Dokumentacja Netlify](https://docs.netlify.com)
- [Status Netlify](https://www.netlifystatus.com)
- [Community Forum](https://community.netlify.com)

---

## 🎉 Gratulacje!

Twoja aplikacja QuizMaster działa teraz na profesjonalnym hostingu z:
- ✅ Automatycznymi aktualizacjami
- ✅ SSL (https://)
- ✅ Globalnym CDN
- ✅ Wsparciem dla AI
- ✅ Bez limitów PHP czy Node.js

**Całkowity czas wdrożenia: ~20 minut**