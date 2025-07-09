# 🎯 DANE TESTOWE - QUIZMASTER

## 👨‍🏫 KONTA NAUCZYCIELI

### Główne konto:
- **Login**: `paulinaodmatematyki`
- **Hasło**: `paulina#314159265`

### Dodatkowe konta testowe:
- **Login**: `jan.kowalski` / **Hasło**: `nauczyciel123`
- **Login**: `maria.nowak` / **Hasło**: `nauczyciel123`

## 👨‍🎓 KONTA UCZNIÓW (20 uczniów)

### Przykładowe konta:
- **Login**: `anna.kowalska` / **Hasło**: `haslo123`
- **Login**: `piotr.nowak` / **Hasło**: `haslo123`
- **Login**: `katarzyna.wisniewska` / **Hasło**: `haslo123`
- **Login**: `michal.wojcik` / **Hasło**: `haslo123`

### Pełna lista uczniów:
1. Anna Kowalska → `anna.kowalska`
2. Piotr Nowak → `piotr.nowak`
3. Katarzyna Wiśniewska → `katarzyna.wisniewska`
4. Michał Wójcik → `michal.wojcik`
5. Magdalena Kowalczyk → `magdalena.kowalczyk`
6. Jakub Kamiński → `jakub.kaminski`
7. Natalia Lewandowska → `natalia.lewandowska`
8. Mateusz Zieliński → `mateusz.zielinski`
9. Aleksandra Szymańska → `aleksandra.szymanska`
10. Bartosz Woźniak → `bartosz.wozniak`
11. Julia Dąbrowska → `julia.dabrowska`
12. Szymon Kozłowski → `szymon.kozlowski`
13. Wiktoria Jankowska → `wiktoria.jankowska`
14. Filip Mazur → `filip.mazur`
15. Zuzanna Krawczyk → `zuzanna.krawczyk`
16. Dominik Piotrowski → `dominik.piotrowski`
17. Oliwia Grabowska → `oliwia.grabowska`
18. Kacper Pawłowski → `kacper.pawlowski`
19. Maja Michalska → `maja.michalska`
20. Adrian Adamczyk → `adrian.adamczyk`

## 🏫 GRUPY UCZNIÓW

### Klasy:
- **Klasa 8A**: Anna, Piotr, Katarzyna, Michał, Magdalena, Jakub
- **Klasa 8B**: Natalia, Mateusz, Aleksandra, Bartosz, Julia, Szymon
- **Maturzyści podstawowi**: Wiktoria, Filip, Zuzanna, Dominik
- **Maturzyści rozszerzeni**: Oliwia, Kacper, Maja, Adrian

## 📊 WYGENEROWANE DANE

### Wyniki egzaminów:
- **~100 wyników** z ostatnich 30 dni
- Różne przedmioty: Matematyka, Fizyka, Chemia, Biologia, Geografia
- Wyniki od 40% do 95%

### Osiągnięcia:
- Postępy dla wszystkich uczniów
- Różne poziomy osiągnięć
- Daily streaks od 0 do 15 dni

### Harmonogram:
- **6 wydarzeń** w najbliższych 2 tygodniach
- Sprawdziany, kartkówki, zadania domowe
- Przypomnienia 24h i 48h przed

### Rywalizacja:
- Aktywny ranking globalny
- **3 aktywne wyzwania** między uczniami
- **1 turniej matematyczny** w trakcie rejestracji

### Bank arkuszy:
- **3 gotowe szablony** do użycia
- **1 szablon udostępniony** publicznie
- Różne poziomy trudności

### Komentarze:
- **30% wyników** ma komentarze nauczyciela
- Różnorodne komentarze motywujące i instruktażowe

## 🎮 JAK TESTOWAĆ FUNKCJE

### 1. System osiągnięć:
- Zaloguj się jako uczeń → rozwiąż kilka zadań → sprawdź osiągnięcia

### 2. Personalizowane rekomendacje:
- Zaloguj się jako uczeń z historią → sprawdź rekomendacje
- Lub jako nauczyciel → Wyniki i rekomendacje → wybierz ucznia

### 3. Rywalizacja:
- Zaloguj się jako uczeń → sprawdź ranking
- Wyślij wyzwanie innemu uczniowi
- Dołącz do turnieju

### 4. Harmonogram:
- Jako nauczyciel → Harmonogram → dodaj wydarzenie
- Jako uczeń → sprawdź kalendarz w panelu głównym

### 5. Bank arkuszy:
- Jako nauczyciel → Bank arkuszy → użyj szablonu lub stwórz nowy

## 🔧 ZARZĄDZANIE DANYMI

### Wyczyszczenie danych testowych:
```javascript
// W konsoli przeglądarki:
const generator = new TestDataGenerator();
generator.clearTestData();
```

### Ponowne wygenerowanie:
```javascript
// W konsoli przeglądarki:
localStorage.removeItem('testDataGenerated');
location.reload(); // Przeładuj stronę
```

## 🔗 LINKI SZYBKIEGO DOSTĘPU

- **Główna aplikacja**: http://localhost:8000
- **Test tryb**: http://localhost:8000/test-practice.html
- **Test połączenia Gemini**: http://localhost:8000/test-gemini-connection.html

---

**Uwaga**: Dane są generowane automatycznie przy pierwszym uruchomieniu aplikacji. Wszystkie dane są przechowywane w localStorage przeglądarki.