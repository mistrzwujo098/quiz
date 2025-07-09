#!/bin/bash

echo "🛑 Zatrzymuję stary serwer..."
# Znajdź i zatrzymaj proces na porcie 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Poczekaj chwilę
sleep 1

echo "🚀 Uruchamiam serwer proxy..."
cd /Users/kacperczaczyk/Documents/quizy/server

# Sprawdź czy node_modules istnieje
if [ ! -d "node_modules" ]; then
    echo "📦 Instaluję zależności..."
    npm install
fi

echo "✅ Startuję serwer na porcie 3001..."
node server.js