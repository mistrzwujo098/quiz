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