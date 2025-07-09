#!/bin/bash

echo "🚀 Uruchamianie kompletnego środowiska QuizMaster..."
echo ""

# Sprawdź czy serwer proxy działa
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Serwer proxy już działa na porcie 3001"
else
    echo "🔧 Uruchamiam serwer proxy..."
    cd /Users/kacperczaczyk/Documents/quizy/server
    node server.js &
    PROXY_PID=$!
    sleep 2
    echo "✅ Serwer proxy uruchomiony (PID: $PROXY_PID)"
fi

# Sprawdź czy serwer WWW działa
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Serwer WWW już działa na porcie 8000"
else
    echo "🌐 Uruchamiam serwer WWW..."
    cd /Users/kacperczaczyk/Documents/quizy
    python3 -m http.server 8000 &
    WWW_PID=$!
    sleep 2
    echo "✅ Serwer WWW uruchomiony (PID: $WWW_PID)"
fi

echo ""
echo "📋 Status serwerów:"
echo "-------------------"

# Sprawdź status
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Serwer proxy: http://localhost:3001 - DZIAŁA"
else
    echo "❌ Serwer proxy: http://localhost:3001 - NIE DZIAŁA"
fi

if curl -s http://localhost:8000 > /dev/null; then
    echo "✅ Aplikacja: http://localhost:8000 - DZIAŁA"
else
    echo "❌ Aplikacja: http://localhost:8000 - NIE DZIAŁA"
fi

echo ""
echo "🔗 Linki do aplikacji:"
echo "----------------------"
echo "📚 Główna aplikacja: http://localhost:8000"
echo "🧪 Test połączenia: http://localhost:8000/test-gemini-connection.html"
echo "🎯 Test generacji: http://localhost:8000/test-variant-generation.html"
echo "🔍 Test prosty: http://localhost:8000/simple-test.html"
echo ""
echo "💡 Wskazówka: Użyj Ctrl+C aby zatrzymać serwery"