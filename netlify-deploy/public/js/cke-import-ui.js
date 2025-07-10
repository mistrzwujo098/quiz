/**
 * Interfejs użytkownika dla importu arkuszy CKE
 * Integruje parser, system oceniania i AI Grader
 */

class CKEImportUI {
    constructor() {
        this.parser = new CKEParserSystem();
        this.grader = new AIGrader();
        this.currentImport = null;
        this.importedTasks = [];
    }

    /**
     * Statyczna metoda do powrotu do edycji
     */
    static backToEdit() {
        // Znajdź kroki wizard
        const steps = document.querySelectorAll('.wizard-step');
        
        // Ukryj krok 3 (podgląd)
        const step3 = document.getElementById('step-3');
        if (step3) step3.classList.remove('active');
        
        // Pokaż krok 2 (przetwarzanie)
        const step2 = document.getElementById('step-2');
        if (step2) step2.classList.add('active');
        
        // Przywróć możliwość edycji
        const editButtons = document.querySelectorAll('.task-actions button');
        editButtons.forEach(btn => btn.disabled = false);
        
        // Ukryj przyciski nawigacji kroku 3
        const navButtons = document.querySelector('.wizard-navigation');
        if (navButtons) {
            navButtons.style.display = 'none';
        }
        
        console.log('Powrót do edycji zadań');
    }

    /**
     * Renderowanie interfejsu importu
     */
    render() {
        return `
            <div class="cke-import-container">
                <div class="import-header">
                    <h2>🎓 Import Arkuszy CKE</h2>
                    <p>Zaimportuj oficjalne arkusze egzaminacyjne CKE wraz z kluczami odpowiedzi</p>
                </div>

                <div class="import-wizard">
                    <!-- Krok 1: Wybór plików -->
                    <div class="wizard-step active" id="step-1">
                        <h3 style="color: #ffffff;">Krok 1: Wybierz pliki PDF</h3>
                        
                        <div class="file-input-group">
                            <div class="file-input-section">
                                <label>
                                    <span class="file-icon">📄</span>
                                    <span style="color: #ffffff;">Arkusz egzaminacyjny (PDF)</span>
                                    <input type="file" 
                                           id="exam-pdf" 
                                           accept=".pdf" 
                                           onchange="CKEImportUI.handleExamFile(event)">
                                </label>
                                <div id="exam-file-info" class="file-info"></div>
                            </div>
                            
                            <div class="file-input-section">
                                <label>
                                    <span class="file-icon">📋</span>
                                    <span style="color: #ffffff;">Klucz odpowiedzi (PDF)</span>
                                    <input type="file" 
                                           id="answer-pdf" 
                                           accept=".pdf" 
                                           onchange="CKEImportUI.handleAnswerFile(event)">
                                </label>
                                <div id="answer-file-info" class="file-info"></div>
                            </div>
                        </div>
                        
                        <div class="import-options">
                            <h4 style="color: #ffffff;">Opcje importu:</h4>
                            <label>
                                <input type="checkbox" id="use-ocr" checked>
                                Użyj OCR dla słabej jakości skanów
                            </label>
                            <label>
                                <input type="checkbox" id="extract-images" checked>
                                Wyodrębnij obrazki i diagramy
                            </label>
                            <label style="color: #ffffff;">
                                <input type="checkbox" id="extract-formulas" checked>
                                Rozpoznaj formuły matematyczne
                            </label>
                        </div>
                        
                        <div class="wizard-buttons">
                            <button onclick="CKEImportUI.startImport()" 
                                    class="btn-primary" 
                                    id="start-import-btn" 
                                    disabled>
                                Rozpocznij analizę →
                            </button>
                        </div>
                    </div>

                    <!-- Krok 2: Analiza -->
                    <div class="wizard-step" id="step-2" style="display: none;">
                        <h3 style="color: #ffffff;">Krok 2: Analiza arkusza</h3>
                        
                        <div class="analysis-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" id="analysis-progress"></div>
                            </div>
                            <div class="progress-status" id="analysis-status">
                                Inicjalizacja parsera...
                            </div>
                        </div>
                        
                        <div class="analysis-log" id="analysis-log"></div>
                    </div>

                    <!-- Krok 3: Weryfikacja -->
                    <div class="wizard-step" id="step-3" style="display: none;">
                        <h3 style="color: #ffffff;">Krok 3: Weryfikacja zadań</h3>
                        
                        <div class="import-summary" id="import-summary"></div>
                        
                        <div class="tasks-preview" id="tasks-preview"></div>
                        
                        <div class="wizard-buttons">
                            <button onclick="CKEImportUI.backToEdit()" class="btn-secondary">
                                ← Edytuj
                            </button>
                            <button onclick="CKEImportUI.confirmImport()" class="btn-primary">
                                Zapisz zadania ✓
                            </button>
                        </div>
                    </div>

                    <!-- Krok 4: Podsumowanie -->
                    <div class="wizard-step" id="step-4" style="display: none;">
                        <h3 style="color: #ffffff;">Import zakończony!</h3>
                        
                        <div class="import-results" id="import-results"></div>
                        
                        <div class="wizard-buttons">
                            <button onclick="CKEImportUI.newImport()" class="btn-secondary">
                                Nowy import
                            </button>
                            <button onclick="CKEImportUI.viewImportedTasks()" class="btn-primary">
                                Zobacz zadania
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Panel masowego importu -->
                <div class="bulk-import-panel" id="bulk-import-panel" style="display: none;">
                    <h3 style="color: #ffffff;">Import masowy</h3>
                    <div class="bulk-import-controls">
                        <label>
                            Arkusze PDF:
                            <input type="file" 
                                   id="bulk-exam-pdfs" 
                                   accept=".pdf" 
                                   multiple 
                                   onchange="CKEImportUI.handleBulkExams(event)">
                        </label>
                        <label>
                            Klucze odpowiedzi:
                            <input type="file" 
                                   id="bulk-answer-pdfs" 
                                   accept=".pdf" 
                                   multiple 
                                   onchange="CKEImportUI.handleBulkAnswers(event)">
                        </label>
                        <button onclick="CKEImportUI.startBulkImport()" class="btn-primary">
                            Rozpocznij import masowy
                        </button>
                    </div>
                    <div class="bulk-import-status" id="bulk-import-status"></div>
                </div>

                <!-- Przycisk przełączania trybu -->
                <div class="import-mode-toggle">
                    <button onclick="CKEImportUI.toggleBulkMode()" class="btn-link">
                        🔄 Przełącz na import masowy
                    </button>
                </div>
            </div>

            <style>
                .cke-import-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .import-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .import-wizard {
                    background: #2a2a2a;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    padding: 30px;
                    color: #ffffff;
                }

                .wizard-step {
                    animation: fadeIn 0.3s ease-in;
                }

                .file-input-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }

                .file-input-section label {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px;
                    border: 2px dashed #555;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    background: #1a1a1a;
                }

                .file-input-section label:hover {
                    border-color: #7c3aed;
                    background: #2a2a2a;
                }

                .file-input-section input[type="file"] {
                    display: none;
                }

                .file-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }

                .file-info {
                    margin-top: 10px;
                    font-size: 14px;
                    color: #a0a0a0;
                }

                .import-options {
                    background: #1a1a1a;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border: 1px solid #333;
                }

                .import-options label {
                    display: block;
                    margin: 10px 0;
                    cursor: pointer;
                }

                .analysis-progress {
                    margin: 20px 0;
                }

                .progress-bar {
                    height: 20px;
                    background: #1a1a1a;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid #333;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #7c3aed, #a855f7);
                    width: 0%;
                    transition: width 0.3s ease;
                }

                .progress-status {
                    text-align: center;
                    margin-top: 10px;
                    color: #a0a0a0;
                }

                .analysis-log {
                    background: #1a1a1a;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    margin-top: 20px;
                    border: 1px solid #333;
                    color: #a0a0a0;
                }

                .import-summary {
                    background: #1a1a1a;
                    padding: 20px;
                    border: 1px solid #333;
                    color: #ffffff;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }

                .tasks-preview {
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 20px;
                    background: #1a1a1a;
                }

                .task-preview-item {
                    border-bottom: 1px solid #333;
                    padding: 15px 0;
                    margin-bottom: 15px;
                }

                .task-preview-item:last-child {
                    border-bottom: none;
                }

                .task-content {
                    margin: 10px 0;
                    line-height: 1.6;
                }

                .task-image {
                    max-width: 300px;
                    margin: 10px 0;
                    border: 1px solid #333;
                    border-radius: 4px;
                }

                .task-formula {
                    background: #2a2a2a;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    display: inline-block;
                    margin: 5px 0;
                    color: #7c3aed;
                    border: 1px solid #333;
                }

                .task-metadata {
                    display: flex;
                    gap: 15px;
                    font-size: 14px;
                    color: #a0a0a0;
                    margin-top: 10px;
                }

                .wizard-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-top: 30px;
                }

                .btn-primary, .btn-secondary {
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: none;
                }

                .btn-primary {
                    background: #7c3aed;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #a855f7;
                }

                .btn-primary:disabled {
                    background: #444;
                    cursor: not-allowed;
                    color: #666;
                }

                .btn-secondary {
                    background: #2a2a2a;
                    color: #ffffff;
                    border: 1px solid #333;
                }

                .btn-secondary:hover {
                    background: #333;
                    border-color: #7c3aed;
                }

                .import-results {
                    text-align: center;
                    padding: 40px;
                }

                .success-icon {
                    font-size: 64px;
                    color: #4caf50;
                    margin-bottom: 20px;
                }

                .bulk-import-panel {
                    background: #f8f9fa;
                    padding: 30px;
                    border-radius: 12px;
                    margin-top: 20px;
                }

                .bulk-import-controls {
                    display: grid;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .bulk-import-status {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .import-mode-toggle {
                    text-align: center;
                    margin-top: 20px;
                }

                .btn-link {
                    background: none;
                    border: none;
                    color: #0066cc;
                    cursor: pointer;
                    text-decoration: underline;
                    font-size: 16px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .validation-warning {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                    font-size: 14px;
                }

                .validation-error {
                    background: #f8d7da;
                    border: 1px solid #f5c6cb;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                    font-size: 14px;
                }

                .edit-task-btn {
                    float: right;
                    background: #fff;
                    border: 1px solid #ddd;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .edit-task-btn:hover {
                    background: #f0f0f0;
                }
            </style>
        `;
    }

    /**
     * Obsługa plików
     */
    static handleExamFile(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('exam-file-info').textContent = 
                `✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            CKEImportUI.checkIfReadyToImport();
        }
    }

    static handleAnswerFile(event) {
        const file = event.target.files[0];
        if (file) {
            document.getElementById('answer-file-info').textContent = 
                `✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            CKEImportUI.checkIfReadyToImport();
        }
    }

    static checkIfReadyToImport() {
        const examFile = document.getElementById('exam-pdf').files[0];
        const answerFile = document.getElementById('answer-pdf').files[0];
        const startBtn = document.getElementById('start-import-btn');
        
        if (examFile && answerFile) {
            startBtn.disabled = false;
        }
    }

    /**
     * Rozpoczęcie importu
     */
    static async startImport() {
        const examFile = document.getElementById('exam-pdf').files[0];
        const answerFile = document.getElementById('answer-pdf').files[0];
        
        if (!examFile || !answerFile) {
            alert('Wybierz oba pliki PDF');
            return;
        }

        // Przejdź do kroku 2
        CKEImportUI.showStep(2);
        
        const instance = CKEImportUI.getInstance();
        const options = {
            useOCR: document.getElementById('use-ocr').checked,
            extractImages: document.getElementById('extract-images').checked,
            extractFormulas: document.getElementById('extract-formulas').checked
        };

        try {
            // Aktualizacja statusu
            CKEImportUI.updateAnalysisStatus('Inicjalizacja parsera CKE...', 10);
            await instance.parser.initialize();
            
            CKEImportUI.updateAnalysisStatus('Analizowanie arkusza egzaminacyjnego...', 30);
            CKEImportUI.addToLog('📄 Przetwarzanie: ' + examFile.name);
            
            // Parsowanie
            const result = await instance.parser.parseOfficialExam(
                examFile, 
                answerFile, 
                options
            );
            
            if (result.success) {
                CKEImportUI.updateAnalysisStatus('Analiza zakończona pomyślnie!', 100);
                CKEImportUI.addToLog(`✅ Znaleziono ${result.tasks.length} zadań`);
                
                // Zapisz wyniki
                instance.currentImport = result;
                instance.importedTasks = result.tasks;
                
                // Pokaż weryfikację
                setTimeout(() => CKEImportUI.showVerification(result), 1000);
            } else {
                throw new Error(result.error || 'Nieznany błąd parsowania');
            }
            
        } catch (error) {
            console.error('Błąd importu:', error);
            CKEImportUI.updateAnalysisStatus('❌ Błąd: ' + error.message, 0);
            CKEImportUI.addToLog('❌ Import nieudany: ' + error.message);
            
            // Pokaż przycisk powrotu
            setTimeout(() => {
                document.getElementById('analysis-log').innerHTML += `
                    <button onclick="CKEImportUI.showStep(1)" class="btn-secondary" style="margin-top: 20px;">
                        ← Spróbuj ponownie
                    </button>
                `;
            }, 1000);
        }
    }

    /**
     * Pokazywanie weryfikacji
     */
    static showVerification(importResult) {
        CKEImportUI.showStep(3);
        
        // Podsumowanie
        document.getElementById('import-summary').innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>Przedmiot:</strong> ${importResult.metadata.subject}
                </div>
                <div class="summary-item">
                    <strong>Typ egzaminu:</strong> ${importResult.metadata.examType}
                </div>
                <div class="summary-item">
                    <strong>Rok:</strong> ${importResult.metadata.year || 'Nieznany'}
                </div>
                <div class="summary-item">
                    <strong>Liczba zadań:</strong> ${importResult.metadata.taskCount}
                </div>
                <div class="summary-item">
                    <strong>Suma punktów:</strong> ${importResult.metadata.totalPoints}
                </div>
            </div>
        `;
        
        // Podgląd zadań
        const preview = document.getElementById('tasks-preview');
        preview.innerHTML = importResult.tasks.map((task, index) => 
            CKEImportUI.renderTaskPreview(task, index)
        ).join('');
    }

    /**
     * Renderowanie podglądu zadania
     */
    static renderTaskPreview(task, index) {
        return `
            <div class="task-preview-item" data-task-index="${index}">
                <div class="task-header">
                    <h4>Zadanie ${task.numer || index + 1} 
                        <span class="task-points">(${task.punkty} pkt)</span>
                    </h4>
                    <button class="edit-task-btn" onclick="CKEImportUI.editTask(${index})">
                        ✏️ Edytuj
                    </button>
                </div>
                
                <div class="task-content">
                    ${task.tresc}
                </div>
                
                ${task.obrazki && task.obrazki.length > 0 ? `
                    <div class="task-images">
                        ${task.obrazki.map(img => `
                            <img src="${img.base64}" 
                                 alt="${img.description}" 
                                 class="task-image">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${task.formuly && task.formuly.length > 0 ? `
                    <div class="task-formulas">
                        ${task.formuly.map(f => `
                            <span class="task-formula">${f.original}</span>
                        `).join(' ')}
                    </div>
                ` : ''}
                
                ${task.typ === 'zamkniete' ? `
                    <div class="task-options">
                        <strong>Odpowiedzi:</strong>
                        <ol type="A">
                            ${task.odpowiedzi.map(odp => `<li>${odp}</li>`).join('')}
                        </ol>
                        <div class="correct-answer">
                            ✓ Poprawna: ${task.poprawna}
                        </div>
                    </div>
                ` : `
                    <div class="open-question-info">
                        <strong>Zadanie otwarte</strong>
                        ${task.kryteriaOceniania ? `
                            <details>
                                <summary>Kryteria oceniania</summary>
                                <pre>${JSON.stringify(task.kryteriaOceniania, null, 2)}</pre>
                            </details>
                        ` : ''}
                    </div>
                `}
                
                <div class="task-metadata">
                    <span>📚 ${task.temat || 'Brak tematu'}</span>
                    <span>📊 ${task.poziom || 'Średni'}</span>
                    <span>🎯 ${task.kategoria || 'Standardowe'}</span>
                    ${task.metadata?.confidence ? 
                        `<span>🤖 Pewność: ${task.metadata.confidence}%</span>` : ''
                    }
                </div>
                
                ${task.metadata?.confidence < 80 ? `
                    <div class="validation-warning">
                        ⚠️ Niska pewność parsowania. Sprawdź dokładnie to zadanie.
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Potwierdzenie importu
     */
    static async confirmImport() {
        const instance = CKEImportUI.getInstance();
        const tasks = instance.importedTasks;
        
        if (!tasks || tasks.length === 0) {
            alert('Brak zadań do zapisania');
            return;
        }
        
        try {
            // Zapisz zadania
            const savedCount = await CKEImportUI.saveTasks(tasks);
            
            // Pokaż wyniki
            CKEImportUI.showStep(4);
            document.getElementById('import-results').innerHTML = `
                <div class="success-icon">✅</div>
                <h3>Import zakończony pomyślnie!</h3>
                <p>Zaimportowano ${savedCount} zadań do bazy danych.</p>
                <div class="import-stats">
                    <div>Zadania zamknięte: ${tasks.filter(t => t.typ === 'zamkniete').length}</div>
                    <div>Zadania otwarte: ${tasks.filter(t => t.typ === 'otwarte').length}</div>
                    <div>Zadania z obrazkami: ${tasks.filter(t => t.obrazki?.length > 0).length}</div>
                    <div>Zadania z formułami: ${tasks.filter(t => t.formuly?.length > 0).length}</div>
                </div>
            `;
            
        } catch (error) {
            console.error('Błąd zapisywania:', error);
            alert('Błąd podczas zapisywania zadań: ' + error.message);
        }
    }

    /**
     * Zapisywanie zadań
     */
    static async saveTasks(tasks) {
        // Pobierz istniejącą bazę
        const existingData = JSON.parse(localStorage.getItem('quiz_questions') || '[]');
        
        // Dodaj nowe zadania
        const newTasks = tasks.map(task => ({
            ...task,
            id: task.id || `cke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dataImportu: new Date().toISOString(),
            zrodlo: 'CKE Import'
        }));
        
        // Połącz z istniejącymi
        const allTasks = [...existingData, ...newTasks];
        
        // Zapisz
        localStorage.setItem('quiz_questions', JSON.stringify(allTasks));
        
        // Emit event
        window.dispatchEvent(new CustomEvent('tasksImported', { 
            detail: { count: newTasks.length } 
        }));
        
        return newTasks.length;
    }

    /**
     * Edycja zadania
     */
    static editTask(index) {
        const instance = CKEImportUI.getInstance();
        const task = instance.importedTasks[index];
        
        // Tu można dodać modal z edytorem zadania
        const newContent = prompt('Edytuj treść zadania:', task.tresc);
        
        if (newContent !== null) {
            task.tresc = newContent;
            // Odśwież podgląd
            CKEImportUI.showVerification(instance.currentImport);
        }
    }

    /**
     * Import masowy
     */
    static toggleBulkMode() {
        const bulkPanel = document.getElementById('bulk-import-panel');
        const wizardPanel = document.querySelector('.import-wizard');
        const toggleBtn = document.querySelector('.btn-link');
        
        if (bulkPanel.style.display === 'none') {
            bulkPanel.style.display = 'block';
            wizardPanel.style.display = 'none';
            toggleBtn.textContent = '🔄 Przełącz na import pojedynczy';
        } else {
            bulkPanel.style.display = 'none';
            wizardPanel.style.display = 'block';
            toggleBtn.textContent = '🔄 Przełącz na import masowy';
        }
    }

    static bulkExamFiles = [];
    static bulkAnswerFiles = [];

    static handleBulkExams(event) {
        CKEImportUI.bulkExamFiles = Array.from(event.target.files);
        CKEImportUI.updateBulkStatus();
    }

    static handleBulkAnswers(event) {
        CKEImportUI.bulkAnswerFiles = Array.from(event.target.files);
        CKEImportUI.updateBulkStatus();
    }

    static updateBulkStatus() {
        const status = document.getElementById('bulk-import-status');
        status.innerHTML = `
            <div>Arkusze: ${CKEImportUI.bulkExamFiles.length} plików</div>
            <div>Klucze: ${CKEImportUI.bulkAnswerFiles.length} plików</div>
            ${CKEImportUI.bulkExamFiles.length !== CKEImportUI.bulkAnswerFiles.length ? 
                '<div class="validation-error">⚠️ Liczba arkuszy i kluczy musi być taka sama!</div>' : 
                ''
            }
        `;
    }

    static async startBulkImport() {
        if (CKEImportUI.bulkExamFiles.length !== CKEImportUI.bulkAnswerFiles.length) {
            alert('Liczba arkuszy i kluczy odpowiedzi musi być taka sama!');
            return;
        }
        
        if (CKEImportUI.bulkExamFiles.length === 0) {
            alert('Wybierz pliki do importu');
            return;
        }
        
        const instance = CKEImportUI.getInstance();
        const status = document.getElementById('bulk-import-status');
        let allTasks = [];
        
        for (let i = 0; i < CKEImportUI.bulkExamFiles.length; i++) {
            status.innerHTML += `<div>Przetwarzanie ${i + 1}/${CKEImportUI.bulkExamFiles.length}: ${CKEImportUI.bulkExamFiles[i].name}...</div>`;
            
            try {
                const result = await instance.parser.parseOfficialExam(
                    CKEImportUI.bulkExamFiles[i],
                    CKEImportUI.bulkAnswerFiles[i],
                    {
                        useOCR: true,
                        extractImages: true,
                        extractFormulas: true
                    }
                );
                
                if (result.success) {
                    allTasks.push(...result.tasks);
                    status.innerHTML += `<div>✅ Sukces: ${result.tasks.length} zadań</div>`;
                } else {
                    status.innerHTML += `<div>❌ Błąd: ${result.error}</div>`;
                }
                
            } catch (error) {
                status.innerHTML += `<div>❌ Błąd: ${error.message}</div>`;
            }
        }
        
        if (allTasks.length > 0) {
            const saved = await CKEImportUI.saveTasks(allTasks);
            status.innerHTML += `<div class="success-icon">✅ Zaimportowano łącznie ${saved} zadań!</div>`;
        }
    }

    /**
     * Pomocnicze metody
     */
    static showStep(stepNumber) {
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.style.display = 'none';
        });
        document.getElementById(`step-${stepNumber}`).style.display = 'block';
    }

    static updateAnalysisStatus(message, progress) {
        document.getElementById('analysis-status').textContent = message;
        document.getElementById('analysis-progress').style.width = progress + '%';
    }

    static addToLog(message) {
        const log = document.getElementById('analysis-log');
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        log.scrollTop = log.scrollHeight;
    }

    static newImport() {
        CKEImportUI.showStep(1);
        document.getElementById('exam-pdf').value = '';
        document.getElementById('answer-pdf').value = '';
        document.getElementById('exam-file-info').textContent = '';
        document.getElementById('answer-file-info').textContent = '';
        document.getElementById('start-import-btn').disabled = true;
    }

    static viewImportedTasks() {
        // Przekieruj do listy zadań
        window.location.hash = '#zadania';
    }

    static getInstance() {
        if (!CKEImportUI._instance) {
            CKEImportUI._instance = new CKEImportUI();
        }
        return CKEImportUI._instance;
    }

    /**
     * Otwiera interfejs importu CKE
     */
    openCKEImport() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-file-import text-orange-400 mr-2"></i>
                        Import CKE
                    </h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="grid gap-6">
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-upload text-blue-400 mr-2"></i>
                            Importuj arkusz egzaminacyjny
                        </h3>
                        <p class="text-gray-400 mb-4">
                            Załaduj arkusz z Centralnej Komisji Egzaminacyjnej
                        </p>
                        <div class="space-y-4">
                            <input type="file" 
                                   id="cke-file-input" 
                                   accept=".pdf,.docx,.doc"
                                   class="input-modern w-full" />
                            <button onclick="window.ckeImportUI.handleFileImport()" 
                                    class="btn-primary w-full">
                                <i class="fas fa-cloud-upload-alt mr-2"></i>
                                Importuj arkusz
                            </button>
                        </div>
                    </div>
                    
                    <div class="card-modern">
                        <h3 class="text-xl font-semibold mb-4">
                            <i class="fas fa-link text-green-400 mr-2"></i>
                            Import z URL
                        </h3>
                        <p class="text-gray-400 mb-4">
                            Podaj link do arkusza CKE
                        </p>
                        <div class="space-y-4">
                            <input type="url" 
                                   id="cke-url-input" 
                                   placeholder="https://cke.gov.pl/arkusz..."
                                   class="input-modern w-full" />
                            <button onclick="window.ckeImportUI.handleURLImport()" 
                                    class="btn-primary w-full">
                                <i class="fas fa-download mr-2"></i>
                                Pobierz z URL
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-orange-600/20 rounded-lg">
                    <p class="text-sm text-gray-300">
                        <i class="fas fa-info-circle mr-2"></i>
                        Import CKE automatycznie przetwarza arkusze egzaminacyjne, 
                        wyodrębniając zadania, punktację i kryteria oceniania.
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return true;
    }

    /**
     * Obsługuje import pliku
     */
    handleFileImport() {
        const fileInput = document.getElementById('cke-file-input');
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            alert(`Importowanie pliku: ${file.name}`);
            // W przyszłości: rzeczywisty import
        } else {
            alert('Wybierz plik do importu');
        }
    }

    /**
     * Obsługuje import z URL
     */
    handleURLImport() {
        const urlInput = document.getElementById('cke-url-input');
        if (urlInput && urlInput.value) {
            alert(`Importowanie z URL: ${urlInput.value}`);
            // W przyszłości: rzeczywisty import
        } else {
            alert('Podaj URL arkusza');
        }
    }
}

// Eksport jako globalna klasa
window.CKEImportUI = CKEImportUI;