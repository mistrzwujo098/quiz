# Jak zaktualizować aplikację na produkcji

## Szybka aktualizacja (tylko pliki)

### 1. Przez FTP/Panel plików:
- Wgraj zaktualizowany plik `index.html` do:
  `/home/srv70582/domains/quiz.paulinaodmatematyki.com/public_html/`

### 2. Restart aplikacji:
- W panelu DirectAdmin → Node.js → kliknij "Restart" przy aplikacji

### 3. Wyczyść cache przeglądarki:
- Ctrl+F5 (Windows) lub Cmd+Shift+R (Mac)
- Lub otwórz w trybie incognito

## Pełna aktualizacja (wszystkie pliki)

Jeśli zaktualizowałeś więcej plików:

1. **Zatrzymaj aplikację** w panelu DirectAdmin
2. **Wgraj wszystkie zmienione pliki** przez FTP
3. **Uruchom ponownie** aplikację w panelu
4. **Wyczyść cache** przeglądarki

## Testowanie po aktualizacji

1. Otwórz: https://quiz.paulinaodmatematyki.com
2. Zaloguj się jako nauczyciel
3. Sprawdź czy "Statystyki" działają poprawnie
4. Jeśli nie, sprawdź konsolę (F12)

## W razie problemów

Jeśli nadal nie działa:
- Sprawdź logi w DirectAdmin
- Upewnij się, że plik został wgrany
- Spróbuj w trybie incognito
- Zrestartuj aplikację jeszcze raz