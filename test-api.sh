#!/bin/bash

# Uzyskaj token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test_manual", "role": "teacher"}' -s | jq -r .sessionToken)

echo "Token: $TOKEN"

# Prosty test
curl -X POST http://localhost:3001/api/gemini/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Wygeneruj wariant zadania matematycznego: Oblicz pole prostokąta o bokach 5 cm i 8 cm. Odpowiedź: 40 cm². Wygeneruj podobne zadanie ze zmienionymi liczbami. Odpowiedz w formacie JSON z polami: tresc, poprawna, bledne (tablica 3 elementów).",
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 2000
    }
  }' -s | jq .