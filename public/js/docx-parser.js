// ===== ZAAWANSOWANY PARSER PLIKÓW DOCX =====
// Import zadań z Worda z obsługą formatowania i obrazków

class DocxParser {
    constructor() {
        this.initialized = false;
        this.mammoth = null;
        this.taskPatterns = {
            // Wzorce rozpoznawania zadań
            zadanie: /^(?:Zadanie|Zad\.?)\s*(\d+)\.?\s*/i,
            punkty: /\((\d+)\s*(?:pkt|punkt[óy]w?)\)/i,
            odpowiedzi: /^[A-D]\)\s*/,
            poprawna: /(?:Odpowiedź|Odp\.?):\s*([A-D])/i,
            rozwiazanie: /(?:Rozwiązanie|Rozw\.?):/i,
            poziom: /(?:Poziom|Poz\.?):\s*(podstawowy|rozszerzony|średni)/i
        };
    }

    /**
     * Inicjalizuje parser (ładuje bibliotekę mammoth.js)
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Sprawdź czy mammoth.js jest załadowany
            if (typeof mammoth === 'undefined') {
                // Załaduj dynamicznie
                await this.loadMammoth();
            }
            this.mammoth = window.mammoth;
            this.initialized = true;
        } catch (error) {
            console.error('Błąd inicjalizacji parsera DOCX:', error);
            throw new Error('Nie można załadować biblioteki do parsowania DOCX');
        }
    }

    /**
     * Dynamicznie ładuje bibliotekę mammoth.js
     */
    async loadMammoth() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Nie można załadować mammoth.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Parsuje plik DOCX i wyciąga zadania
     * @param {File} file - Plik DOCX
     * @returns {Promise<Array>} Tablica zadań
     */
    async parse(file) {
        await this.initialize();
        
        try {
            // Konwertuj DOCX do HTML
            const result = await this.mammoth.convertToHtml({
                arrayBuffer: await file.arrayBuffer()
            }, {
                convertImage: this.mammoth.images.imgElement((image) => {
                    return image.read("base64").then((imageBuffer) => {
                        return {
                            src: "data:" + image.contentType + ";base64," + imageBuffer
                        };
                    });
                })
            });
            
            const html = result.value;
            const messages = result.messages;
            
            // Parsuj HTML i wyciągaj zadania
            const tasks = await this.extractTasksFromHtml(html);
            
            return {
                tasks: tasks,
                messages: messages,
                success: true
            };
            
        } catch (error) {
            console.error('Błąd parsowania DOCX:', error);
            return {
                tasks: [],
                messages: [{
                    type: 'error',
                    message: error.message
                }],
                success: false
            };
        }
    }

    /**
     * Wyciąga zadania z HTML
     */
    async extractTasksFromHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tasks = [];
        
        // Znajdź wszystkie elementy
        const elements = Array.from(doc.body.children);
        
        let currentTask = null;
        let collectingAnswers = false;
        let collectingSolution = false;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const text = element.textContent.trim();
            
            // Sprawdź czy to nowe zadanie
            if (this.taskPatterns.zadanie.test(text)) {
                // Zapisz poprzednie zadanie
                if (currentTask) {
                    tasks.push(this.finalizeTask(currentTask));
                }
                
                // Rozpocznij nowe zadanie
                currentTask = {
                    tresc: text.replace(this.taskPatterns.zadanie, '').trim(),
                    odpowiedzi: [],
                    obrazki: this.extractImages(element),
                    raw: element.outerHTML
                };
                
                // Sprawdź punkty
                const punktyMatch = text.match(this.taskPatterns.punkty);
                if (punktyMatch) {
                    currentTask.punkty = parseInt(punktyMatch[1]);
                }
                
                collectingAnswers = false;
                collectingSolution = false;
            }
            
            // Zbieraj odpowiedzi
            else if (currentTask && this.taskPatterns.odpowiedzi.test(text)) {
                collectingAnswers = true;
                const answer = text.replace(this.taskPatterns.odpowiedzi, '').trim();
                currentTask.odpowiedzi.push(answer);
            }
            
            // Sprawdź poprawną odpowiedź
            else if (currentTask && this.taskPatterns.poprawna.test(text)) {
                const match = text.match(this.taskPatterns.poprawna);
                if (match) {
                    currentTask.poprawnaLitera = match[1];
                }
            }
            
            // Zbieraj rozwiązanie
            else if (currentTask && this.taskPatterns.rozwiazanie.test(text)) {
                collectingSolution = true;
                currentTask.rozwiazanie = text.replace(this.taskPatterns.rozwiazanie, '').trim();
            }
            
            // Kontynuuj zbieranie treści
            else if (currentTask && !collectingAnswers && !collectingSolution) {
                // Dodaj do treści zadania
                currentTask.tresc += '\n' + text;
                
                // Dodaj obrazki jeśli są
                const images = this.extractImages(element);
                if (images.length > 0) {
                    currentTask.obrazki = currentTask.obrazki.concat(images);
                }
            }
            
            // Kontynuuj zbieranie rozwiązania
            else if (currentTask && collectingSolution) {
                currentTask.rozwiazanie += '\n' + text;
            }
        }
        
        // Zapisz ostatnie zadanie
        if (currentTask) {
            tasks.push(this.finalizeTask(currentTask));
        }
        
        return tasks;
    }

    /**
     * Wyciąga obrazki z elementu HTML
     */
    extractImages(element) {
        const images = [];
        const imgElements = element.getElementsByTagName('img');
        
        for (let img of imgElements) {
            if (img.src && img.src.startsWith('data:')) {
                images.push({
                    src: img.src,
                    alt: img.alt || '',
                    width: img.width || null,
                    height: img.height || null
                });
            }
        }
        
        return images;
    }

    /**
     * Finalizuje zadanie - konwertuje do formatu aplikacji
     */
    finalizeTask(rawTask) {
        const task = {
            id: 'import_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            tresc: rawTask.tresc.trim(),
            typ: rawTask.odpowiedzi.length > 0 ? 'zamkniete' : 'otwarte',
            odpowiedzi: rawTask.odpowiedzi,
            punkty: rawTask.punkty || 1,
            importedAt: new Date().toISOString()
        };
        
        // Ustaw poprawną odpowiedź
        if (rawTask.poprawnaLitera && rawTask.odpowiedzi.length > 0) {
            const index = rawTask.poprawnaLitera.charCodeAt(0) - 65; // A=0, B=1, etc.
            if (index >= 0 && index < rawTask.odpowiedzi.length) {
                task.poprawna = rawTask.odpowiedzi[index];
            }
        }
        
        // Dodaj obrazki
        if (rawTask.obrazki && rawTask.obrazki.length > 0) {
            task.obrazek = rawTask.obrazki[0].src; // Główny obrazek
            if (rawTask.obrazki.length > 1) {
                task.dodatkoweObrazki = rawTask.obrazki.slice(1);
            }
        }
        
        // Dodaj rozwiązanie jeśli jest
        if (rawTask.rozwiazanie) {
            task.rozwiazanie = rawTask.rozwiazanie.trim();
        }
        
        // Próbuj określić przedmiot i poziom
        task.przedmiot = this.detectSubject(task.tresc);
        task.poziom = this.detectLevel(task.tresc);
        task.temat = this.detectTopic(task.tresc);
        
        return task;
    }

    /**
     * Wykrywa przedmiot na podstawie treści
     */
    detectSubject(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('matur') && lowerText.includes('rozszerzon')) {
            return 'matura rozszerzona';
        } else if (lowerText.includes('matur')) {
            return 'matura podstawowa';
        } else if (lowerText.includes('ósmoklasist') || lowerText.includes('8 klas')) {
            return 'egzamin ósmoklasisty';
        }
        
        // Domyślnie
        return 'matura podstawowa';
    }

    /**
     * Wykrywa poziom trudności
     */
    detectLevel(text) {
        const lowerText = text.toLowerCase();
        
        // Szukaj słów kluczowych
        const keywords = {
            latwy: ['podstawow', 'prost', 'łatw', 'elementarn'],
            sredni: ['średni', 'typow', 'standard'],
            trudny: ['trudny', 'zaawansowan', 'rozszerzon', 'złożon']
        };
        
        for (const [level, words] of Object.entries(keywords)) {
            if (words.some(word => lowerText.includes(word))) {
                return level;
            }
        }
        
        return 'sredni';
    }

    /**
     * Wykrywa temat zadania
     */
    detectTopic(text) {
        const lowerText = text.toLowerCase();
        
        const topics = {
            'Geometria': ['trójkąt', 'kwadrat', 'koło', 'prostokąt', 'kąt', 'pole', 'obwód'],
            'Algebra': ['równanie', 'nierówność', 'układ', 'funkcja', 'wielomian'],
            'Analiza': ['granica', 'pochodna', 'całka', 'ciągłość'],
            'Statystyka': ['średnia', 'mediana', 'odchylenie', 'prawdopodobieństwo'],
            'Trygonometria': ['sinus', 'cosinus', 'tangens', 'cotangens'],
            'Stereometria': ['bryła', 'ostrosłup', 'walec', 'kula', 'stożek', 'objętość'],
            'Procenty': ['procent', '%', 'procentow'],
            'Ciągi': ['ciąg', 'arytmetyczny', 'geometryczny', 'suma'],
            'Logarytmy': ['logarytm', 'log', 'wykładnicza']
        };
        
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return topic;
            }
        }
        
        return 'Matematyka ogólna';
    }

    /**
     * Tworzy podgląd zaimportowanych zadań
     */
    createPreview(tasks) {
        const preview = document.createElement('div');
        preview.className = 'docx-import-preview';
        
        tasks.forEach((task, index) => {
            const taskPreview = document.createElement('div');
            taskPreview.className = 'task-preview-item';
            taskPreview.innerHTML = `
                <h4>Zadanie ${index + 1}</h4>
                <p><strong>Treść:</strong> ${task.tresc.substring(0, 200)}${task.tresc.length > 200 ? '...' : ''}</p>
                <p><strong>Typ:</strong> ${task.typ}</p>
                <p><strong>Punkty:</strong> ${task.punkty}</p>
                ${task.odpowiedzi.length > 0 ? `
                    <p><strong>Odpowiedzi:</strong></p>
                    <ul>
                        ${task.odpowiedzi.map((odp, i) => 
                            `<li class="${odp === task.poprawna ? 'correct-answer' : ''}">
                                ${String.fromCharCode(65 + i)}) ${odp}
                            </li>`
                        ).join('')}
                    </ul>
                ` : ''}
                ${task.obrazek ? `<p><strong>Zawiera obrazek</strong></p>` : ''}
            `;
            preview.appendChild(taskPreview);
        });
        
        return preview;
    }

    /**
     * Eksportuje zadania do formatu aplikacji
     */
    exportToQuizFormat(tasks, metadata = {}) {
        return tasks.map(task => ({
            ...task,
            przedmiot: metadata.przedmiot || task.przedmiot,
            importSource: 'docx',
            importDate: new Date().toISOString(),
            metadata: metadata
        }));
    }
}

// Eksportuj parser
window.DocxParser = DocxParser;

// Dodaj style dla podglądu
const docxStyles = `
<style>
.docx-import-preview {
    max-height: 500px;
    overflow-y: auto;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
}

.task-preview-item {
    margin-bottom: 24px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.task-preview-item h4 {
    color: #a855f7;
    margin-bottom: 8px;
}

.task-preview-item p {
    margin: 4px 0;
}

.task-preview-item ul {
    list-style: none;
    padding-left: 20px;
}

.task-preview-item li {
    padding: 2px 0;
}

.task-preview-item .correct-answer {
    color: #10b981;
    font-weight: bold;
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('docx-parser-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'docx-parser-styles';
    styleElement.innerHTML = docxStyles;
    document.head.appendChild(styleElement.firstChild);
}