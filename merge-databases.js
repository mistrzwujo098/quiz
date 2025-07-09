// Script to merge all databases into one comprehensive database
const fs = require('fs').promises;

async function mergeDatabases() {
    try {
        console.log('🔄 Starting database merge process...\n');
        
        // 1. Load existing databases
        const databases = [];
        
        // Load quiz_data.json (50 basic tasks)
        try {
            console.log('📖 Loading quiz_data.json...');
            const quizDataRaw = await fs.readFile('quiz_data.json', 'utf8');
            const quizData = JSON.parse(quizDataRaw);
            
            // Convert quiz_data format
            const quizTasks = quizData.questions.map((question) => ({
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
            
            databases.push(...quizTasks);
            console.log(`✅ Loaded ${quizTasks.length} tasks from quiz_data.json`);
        } catch (error) {
            console.log('⚠️  Could not load quiz_data.json');
        }
        
        // Load zadania_trudniejsze.json (50 harder tasks)
        try {
            console.log('\n📖 Loading zadania_trudniejsze.json...');
            const harderDataRaw = await fs.readFile('zadania_trudniejsze.json', 'utf8');
            const harderData = JSON.parse(harderDataRaw);
            
            // Convert harder tasks format
            const harderTasks = harderData.questions.map((question) => ({
                id: `harder_2025_${question.id}`,
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
                poziom: 'rozszerzony', // Mark as advanced level
                rok: '2025',
                sesja: 'główna',
                obrazek: question.hasImage && question.imageSvg ? question.imageSvg : null,
                wyjaśnienie: question.explanation || null,
                trudnosc: 'trudniejsze' // Additional marker
            }));
            
            databases.push(...harderTasks);
            console.log(`✅ Loaded ${harderTasks.length} harder tasks from zadania_trudniejsze.json`);
        } catch (error) {
            console.log('⚠️  Could not load zadania_trudniejsze.json');
        }
        
        // Load updated-exam-database.json if exists
        try {
            console.log('\n📖 Loading updated-exam-database.json...');
            const updatedDataRaw = await fs.readFile('updated-exam-database.json', 'utf8');
            const updatedData = JSON.parse(updatedDataRaw);
            
            // Filter out duplicates based on the original quiz_data
            const filteredUpdated = updatedData.filter(task => 
                !task.id.startsWith('quiz_2025_') && !task.id.startsWith('harder_2025_')
            );
            
            databases.push(...filteredUpdated);
            console.log(`✅ Loaded ${filteredUpdated.length} additional tasks from updated-exam-database.json`);
        } catch (error) {
            console.log('⚠️  Could not load updated-exam-database.json');
        }
        
        // Remove duplicates
        const uniqueTasks = [];
        const seenIds = new Set();
        
        for (const task of databases) {
            if (!seenIds.has(task.id)) {
                seenIds.add(task.id);
                uniqueTasks.push(task);
            }
        }
        
        console.log(`\n🔍 Removed ${databases.length - uniqueTasks.length} duplicate tasks`);
        
        // Sort tasks by subject and then by ID
        uniqueTasks.sort((a, b) => {
            if (a.przedmiot !== b.przedmiot) {
                return a.przedmiot.localeCompare(b.przedmiot);
            }
            return a.id.localeCompare(b.id);
        });
        
        // Save merged database
        const outputPath = 'complete-exam-database.json';
        await fs.writeFile(outputPath, JSON.stringify(uniqueTasks, null, 2));
        
        console.log(`\n💾 Saved merged database to: ${outputPath}`);
        
        // Statistics
        console.log('\n📊 MERGED DATABASE STATISTICS:');
        console.log(`   Total tasks: ${uniqueTasks.length}`);
        
        const stats = {
            'egzamin ósmoklasisty': uniqueTasks.filter(t => t.przedmiot === 'egzamin ósmoklasisty').length,
            'matura podstawowa': uniqueTasks.filter(t => t.przedmiot === 'matura podstawowa').length,
            'matura rozszerzona': uniqueTasks.filter(t => t.przedmiot === 'matura rozszerzona').length
        };
        
        Object.entries(stats).forEach(([key, value]) => {
            if (value > 0) {
                console.log(`   ${key}: ${value} tasks`);
            }
        });
        
        const withImages = uniqueTasks.filter(t => t.obrazek).length;
        const basicLevel = uniqueTasks.filter(t => t.poziom === 'podstawowy').length;
        const advancedLevel = uniqueTasks.filter(t => t.poziom === 'rozszerzony').length;
        
        console.log(`\n   Tasks with images: ${withImages}`);
        console.log(`   Basic level: ${basicLevel}`);
        console.log(`   Advanced level: ${advancedLevel}`);
        
        // Create HTML import page
        const importHTML = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Import Complete Database</title>
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
        <h1>🎯 Complete Exam Database</h1>
        
        <div class="success-box">
            <h3>✅ Successfully merged all databases!</h3>
            <p>The complete database includes all tasks from quiz_data.json, zadania_trudniejsze.json, and existing tasks.</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">${uniqueTasks.length}</span>
                <span>Total Tasks</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats['egzamin ósmoklasisty']}</span>
                <span>8th Grade Exam</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${basicLevel}</span>
                <span>Basic Level</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${advancedLevel}</span>
                <span>Advanced Level</span>
            </div>
        </div>
        
        <button id="importBtn" onclick="importTasks()">
            📥 Import to Application
        </button>
        
        <div id="result" class="result"></div>
    </div>

    <script>
        const tasksToImport = ${JSON.stringify(uniqueTasks)};
        
        function importTasks() {
            const btn = document.getElementById('importBtn');
            const resultDiv = document.getElementById('result');
            
            btn.disabled = true;
            btn.innerHTML = '⏳ Importing...';
            
            setTimeout(() => {
                try {
                    localStorage.setItem('zadaniaDB', JSON.stringify(tasksToImport));
                    
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`
                        <h3>✅ Import completed!</h3>
                        <p>Imported \${tasksToImport.length} tasks to the application.</p>
                        <br>
                        <a href="index.html" style="color: #667eea; font-weight: bold; text-decoration: none; font-size: 1.1em;">
                            → Go to Application
                        </a>
                    \`;
                    
                    btn.innerHTML = '✅ Imported!';
                    
                } catch (error) {
                    alert('Error: ' + error.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Try Again';
                }
            }, 1000);
        }
    </script>
</body>
</html>`;
        
        await fs.writeFile('import-complete-database.html', importHTML);
        console.log(`\n🌐 Created import page: import-complete-database.html`);
        
        console.log('\n✅ DATABASE MERGE COMPLETED SUCCESSFULLY!');
        console.log('   Open import-complete-database.html in browser to import the data.');
        
    } catch (error) {
        console.error('❌ Error during merge:', error);
    }
}

// Run the merge
mergeDatabases()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });