<<<<<<< HEAD
# QuizMaster - System Egzaminacyjny

## Opis
QuizMaster to zaawansowana platforma do tworzenia i przeprowadzania egzaminów online dla polskich szkół. System obsługuje egzamin ósmoklasisty oraz maturę (podstawową i rozszerzoną).

## Funkcje

### Panel Nauczyciela
- **Generator arkuszy** - tworzenie egzaminów z bazy zadań
- **Wgrywanie arkuszy** - import zadań z plików PDF/DOCX
- **Statystyki** - szczegółowe analizy wyników uczniów
- **Zarządzanie grupami** - organizacja uczniów w grupy
- **Import PDF** - automatyczne parsowanie arkuszy egzaminacyjnych
- **Baza zadań** - zarządzanie bazą pytań (import/eksport JSON)

### Panel Ucznia
- **Rozwiązywanie arkuszy** - egzaminy przypisane przez nauczyciela
- **Tryb treningowy** - ćwiczenia z bazą zadań
- **Historia wyników** - przegląd rozwiązanych testów
- **Statystyki osobiste** - analiza postępów

## Uruchomienie

### Metoda 1: Serwer Python
```bash
python3 -m http.server 8000
```
Następnie otwórz: http://localhost:8000/index.html

### Metoda 2: Node.js
```bash
npm start
```

### Metoda 3: Bezpośrednio
Otwórz plik `index.html` w przeglądarce (działa offline)

## Konta testowe

### Nauczyciele:
- Login: `nauczyciel` / Hasło: `haslo123`
- Login: `admin` / Hasło: `admin123`

### Uczniowie:
- Login: `anna.nowak` / Hasło: `uczen123`
- Pozostali uczniowie używają hasła: `uczen123`

## Zarządzanie bazą danych

### Import zadań
1. Przejdź do panelu nauczyciela
2. Wybierz zakładkę "Baza zadań"
3. Kliknij "Załaduj bazę" i wybierz plik:
   - `quiz_data.json` - 50 zadań egzaminu ósmoklasisty
   - `updated-exam-database.json` - pełna baza zadań
   - Dowolny plik JSON z tablicą zadań

### Eksport zadań
W zakładce "Baza zadań" kliknij "Eksportuj bazę" aby pobrać wszystkie zadania.

## Pliki pomocnicze
- `test-practice.html` - tryb treningowy dla uczniów
- `clear_data.html` - zarządzanie danymi localStorage
- `test-database-loading.html` - testowanie importu bazy danych
- `test-svg-display.html` - testowanie wyświetlania diagramów

## Technologie
- React 18 (przez CDN, bez procesu budowania)
- Tailwind CSS
- LocalStorage (przechowywanie danych)
- PDF.js (parsowanie PDF)
- XLSX (eksport do Excel)
- Chart.js (wykresy statystyk)

## Struktura zadania
```javascript
{
  id: string,
  przedmiot: string,      // "egzamin ósmoklasisty" | "matura podstawowa" | "matura rozszerzona"
  temat: string,          // temat zadania
  tresc: string,          // treść zadania
  typ: "zamkniete" | "otwarte",
  odpowiedzi: string[],   // opcje odpowiedzi (dla zamkniętych)
  poprawna: string,       // poprawna odpowiedź
  punkty: number,
  poziom: string,         // poziom trudności
  obrazek?: string        // opcjonalny diagram SVG
}
```

## Rozwiązywanie problemów

### Czarny ekran
Sprawdź konsolę przeglądarki (F12) - prawdopodobnie błąd JavaScript.

### Brak zadań
1. Załaduj bazę danych przez panel nauczyciela
2. Lub użyj `test-database-loading.html` do importu

### Problemy z obrazkami
Diagramy SVG są automatycznie stylowane dla ciemnego motywu. Jeśli nie są widoczne, sprawdź czy zadanie zawiera pole `obrazek`.

## Autor
QuizMaster Team

## Licencja
Do użytku edukacyjnego
=======
# QuizMaster - Platforma Egzaminacyjna

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mistrzwujo098/quiz)

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
>>>>>>> 8a0b00401063f1e82317c8d6f0f214c73831abe8
