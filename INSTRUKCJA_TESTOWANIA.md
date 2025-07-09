# Instrukcja testowania generatora wariantów

## 1. Uruchomienie serwerów

### Terminal 1 - Serwer proxy (WYMAGANY):
```bash
cd server
npm install  # tylko za pierwszym razem
node server.js
```

Serwer powinien wyświetlić:
```
Serwer proxy działa na porcie 3001
Dozwolone originy: http://localhost:8000,http://localhost:3000
```

### Terminal 2 - Serwer WWW:
```bash
cd /Users/kacperczaczyk/Documents/quizy
python -m http.server 8000
```

## 2. Testowanie

### Test A - Sprawdzenie połączenia API:
1. Otwórz: http://localhost:8000/test-gemini-connection.html
2. Kliknij "Uruchom testy"
3. Wszystkie testy powinny być zielone

### Test B - Test generacji wariantu:
1. Otwórz: http://localhost:8000/test-variant-generation.html
2. Kliknij "Generuj wariant"
3. Powinien pojawić się nowy wariant zadania

### Test C - Debug szczegółowy:
1. Otwórz: http://localhost:8000/debug-test.html
2. Sprawdź logi w konsoli

### Test D - Aplikacja główna:
1. Otwórz: http://localhost:8000/index.html
2. Zaloguj się jako nauczyciel
3. Przejdź do zakładki "Generator wariantów"
4. Wybierz zadania i kliknij generuj

### Test E - Tryb testowy ucznia:
1. Otwórz: http://localhost:8000/test-practice.html
2. Wybierz kategorię i rozpocznij test
3. Przy zadaniu kliknij "Generuj podobne zadanie"

## 3. Rozwiązywanie problemów

### Problem: "Serwer proxy niedostępny"
- Sprawdź czy serwer działa na porcie 3001
- Sprawdź logi w terminalu z serwerem

### Problem: "Błąd autoryzacji"
- Sprawdź połączenie z serwerem
- Wyczyść localStorage i spróbuj ponownie

### Problem: "Wygenerowano 0 wariantów"
- Sprawdź logi serwera
- Upewnij się że wybrane zadania są typu "zamkniete"
- Sprawdź czy klucz API w server/.env jest poprawny

### Problem: "Błąd generacji"
- Sprawdź konsolę przeglądarki (F12)
- Sprawdź logi serwera proxy
- Upewnij się że używasz Chrome/Firefox/Safari

## 4. Weryfikacja API

Możesz przetestować API bezpośrednio:
```bash
# Test autoryzacji
curl -X POST http://localhost:3001/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "role": "teacher"}'

# Test statusu (użyj tokena z poprzedniego kroku)
curl http://localhost:3001/api/auth/status \
  -H "Authorization: Bearer TOKEN_Z_POPRZEDNIEGO_KROKU"
```

## 5. Logi

Logi serwera znajdują się w:
- Terminal z serwerem proxy - na żywo
- `server/server.log` - jeśli uruchomiono z przekierowaniem

Każde użycie API jest logowane z informacją o użytkowniku i liczbie żądań.