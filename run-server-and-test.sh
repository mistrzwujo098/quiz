#!/bin/bash

echo "🚀 Uruchamianie serwera proxy QuizMaster..."

# Przejdź do katalogu serwera
cd server

# Sprawdź czy node_modules istnieje, jeśli nie - zainstaluj
if [ ! -d "node_modules" ]; then
    echo "📦 Instalowanie zależności..."
    npm install
fi

# Uruchom serwer
echo "🔧 Startowanie serwera na porcie 3001..."
node server.js &
SERVER_PID=$!

# Czekaj aż serwer się uruchomi
sleep 3

# Sprawdź czy serwer działa
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Serwer działa poprawnie!"
    echo ""
    echo "📝 Instrukcje testowania:"
    echo "1. Otwórz nową kartę terminala"
    echo "2. Przejdź do katalogu projektu: cd /Users/kacperczaczyk/Documents/quizy"
    echo "3. Uruchom lokalny serwer WWW: python -m http.server 8000"
    echo "4. Otwórz przeglądarkę: http://localhost:8000/test-gemini-connection.html"
    echo ""
    echo "🛑 Aby zatrzymać serwer proxy, naciśnij Ctrl+C"
    
    # Czekaj na sygnał zatrzymania
    wait $SERVER_PID
else
    echo "❌ Błąd: Serwer nie uruchomił się poprawnie"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi