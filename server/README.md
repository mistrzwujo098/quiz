# QuizMaster Proxy Server

Serwer proxy dla API Gemini z autoryzacją i rate limiting.

## Instalacja

```bash
cd server
npm install
```

## Konfiguracja

1. Skopiuj plik `.env.example` jako `.env`
2. Ustaw swój klucz API Gemini w pliku `.env`:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## Uruchomienie

### Produkcja
```bash
npm start
```

### Development (z automatycznym restartem)
```bash
npm run dev
```

## Endpointy

### POST /api/auth/session
Tworzy nową sesję dla użytkownika.

Body:
```json
{
  "userId": "student123",
  "role": "student" // lub "teacher"
}
```

Response:
```json
{
  "sessionToken": "token_sesji"
}
```

### POST /api/gemini/generate
Generuje wariant zadania używając Gemini API.

Headers:
```
Authorization: Bearer <sessionToken>
```

Body:
```json
{
  "prompt": "Treść promptu",
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 1024
  }
}
```

### GET /api/auth/status
Sprawdza status sesji.

Headers:
```
Authorization: Bearer <sessionToken>
```

## Limity

- Ogólny limit: 100 żądań na 15 minut na IP
- Limit Gemini: 50 żądań na 15 minut na IP
- Dzienny limit dla uczniów: 50 żądań
- Dzienny limit dla nauczycieli: 200 żądań

## Bezpieczeństwo

- Klucz API Gemini jest przechowywany tylko po stronie serwera
- Wszystkie żądania wymagają autoryzacji tokenem sesji
- Rate limiting chroni przed nadużyciami
- Sesje wygasają po 24 godzinach