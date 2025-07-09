// Automatyczna integracja quiz_data.json z bazą danych aplikacji
const fs = require('fs').promises;

async function integrateQuizData() {
    try {
        console.log('🚀 Rozpoczynam integrację quiz_data.json...\n');
        
        // 1. Wczytaj quiz_data.json
        console.log('📖 Wczytuję quiz_data.json...');
        const quizDataRaw = await fs.readFile('quiz_data.json', 'utf8');
        const quizData = JSON.parse(quizDataRaw);
        console.log(`✅ Załadowano ${quizData.questions.length} pytań z quiz_data.json`);
        
        // 2. Konwertuj format quiz_data na format aplikacji
        console.log('\n🔄 Konwertuję format danych...');
        const convertedTasks = quizData.questions.map((question) => ({
            id: `quiz_2025_${question.id}`,
            przedmiot: 'egzamin ósmoklasisty',
            temat: question.department,
            tresc: question.question,
            typ: 'zamkniete',
            odpowiedzi: [
                question.options.a,
                question.options.b,
                question.options.c,
                question.options.d
            ],
            poprawna: question.correctAnswer.toUpperCase(),
            punkty: 1,
            poziom: 'podstawowy',
            rok: '2025',
            sesja: 'główna',
            obrazek: question.hasImage && question.imageSvg ? question.imageSvg : null,
            wyjaśnienie: question.explanation || null
        }));
        console.log(`✅ Skonwertowano ${convertedTasks.length} zadań`);
        
        // 3. Sprawdź czy istnieje plik z obecną bazą
        let existingTasks = [];
        try {
            const existingData = await fs.readFile('final-fixed-exam-database.json', 'utf8');
            existingTasks = JSON.parse(existingData);
            console.log(`\n📊 Znaleziono istniejącą bazę z ${existingTasks.length} zadaniami`);
        } catch (error) {
            console.log('\n⚠️  Nie znaleziono istniejącej bazy, tworzę nową');
        }
        
        // 4. Sprawdź duplikaty
        const existingIds = new Set(existingTasks.map(t => t.id));
        const newTasks = convertedTasks.filter(t => !existingIds.has(t.id));
        
        if (newTasks.length === 0) {
            console.log('\n⚠️  Wszystkie zadania już istnieją w bazie!');
            return;
        }
        
        console.log(`\n➕ Dodaję ${newTasks.length} nowych zadań`);
        
        // 5. Połącz zadania
        const allTasks = [...existingTasks, ...newTasks];
        
        // 6. Zapisz do pliku
        const outputPath = 'updated-exam-database.json';
        await fs.writeFile(outputPath, JSON.stringify(allTasks, null, 2));
        console.log(`\n💾 Zapisano zaktualizowaną bazę do: ${outputPath}`);
        
        // 7. Statystyki
        console.log('\n📈 STATYSTYKI BAZY DANYCH:');
        console.log(`   Łączna liczba zadań: ${allTasks.length}`);
        
        const stats = {
            'egzamin ósmoklasisty': allTasks.filter(t => t.przedmiot === 'egzamin ósmoklasisty').length,
            'matura podstawowa': allTasks.filter(t => t.przedmiot === 'matura podstawowa').length,
            'matura rozszerzona': allTasks.filter(t => t.przedmiot === 'matura rozszerzona').length
        };
        
        Object.entries(stats).forEach(([key, value]) => {
            if (value > 0) {
                console.log(`   ${key}: ${value} zadań`);
            }
        });
        
        const withImages = allTasks.filter(t => t.obrazek).length;
        console.log(`   Zadania z obrazkami: ${withImages}`);
        
        // 8. Utwórz plik HTML do importu
        const importHTML = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import Zaktualizowanej Bazy Danych</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1a1a1a;
            text-align: center;
            margin-bottom: 30px;
        }
        .success-box {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 20px 40px;
            border-radius: 12px;
            font-size: 20px;
            font-weight: 600;
            cursor: pointer;
            display: block;
            margin: 40px auto;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .result {
            margin-top: 20px;
            padding: 25px;
            border-radius: 12px;
            display: none;
            text-align: center;
        }
        .result.success {
            background: #e6fffa;
            color: #234e52;
            border: 2px solid #81e6d9;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Zaktualizowana Baza Danych</h1>
        
        <div class="success-box">
            <h3>✅ Pomyślnie zintegrowano quiz_data.json!</h3>
            <p>Dodano ${newTasks.length} nowych zadań z egzaminu ósmoklasisty 2025.</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${allTasks.length}</span>
                <span>Wszystkich zadań</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats['egzamin ósmoklasisty']}</span>
                <span>Egzamin ósmoklasisty</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats['matura podstawowa'] || 0}</span>
                <span>Matura podstawowa</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${withImages}</span>
                <span>Zadań z obrazkami</span>
            </div>
        </div>
        
        <button id="importBtn" onclick="importTasks()">
            📥 Importuj do aplikacji
        </button>
        
        <div id="result" class="result"></div>
    </div>

    <script>
        const tasksToImport = ${JSON.stringify(allTasks)};
        
        function importTasks() {
            const btn = document.getElementById('importBtn');
            const resultDiv = document.getElementById('result');
            
            btn.disabled = true;
            btn.innerHTML = '⏳ Importowanie...';
            
            setTimeout(() => {
                try {
                    localStorage.setItem('zadaniaDB', JSON.stringify(tasksToImport));
                    
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`
                        <h3>✅ Import zakończony!</h3>
                        <p>Zaimportowano \${tasksToImport.length} zadań do aplikacji.</p>
                        <br>
                        <a href="index.html" style="color: #667eea; font-weight: bold; text-decoration: none; font-size: 1.1em;">
                            → Przejdź do aplikacji
                        </a>
                    \`;
                    
                    btn.innerHTML = '✅ Zaimportowano!';
                    
                } catch (error) {
                    alert('Błąd: ' + error.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Spróbuj ponownie';
                }
            }, 1000);
        }
    </script>
</body>
</html>`;
        
        await fs.writeFile('import-updated-database.html', importHTML);
        console.log(`\n🌐 Utworzono stronę importu: import-updated-database.html`);
        
        console.log('\n✅ INTEGRACJA ZAKOŃCZONA POMYŚLNIE!');
        console.log('   Otwórz import-updated-database.html w przeglądarce aby zaimportować dane.');
        
    } catch (error) {
        console.error('❌ Błąd podczas integracji:', error);
    }
}

// Uruchom integrację
integrateQuizData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });