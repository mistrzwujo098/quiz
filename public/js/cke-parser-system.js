/**
 * System parsowania oficjalnych arkuszy CKE z wykorzystaniem AI
 * Obsługuje zadania zamknięte, otwarte, równania matematyczne i obrazki
 */

class CKEParserSystem {
    constructor() {
        this.geminiAPI = window.TaskVariantGenerator?.geminiAPI;
        this.mathModule = window.AdvancedMathModule;
        this.pdfParser = window.AdvancedPDFParser;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        // Ładowanie dodatkowych bibliotek
        await this.loadDependencies();
        this.initialized = true;
    }

    async loadDependencies() {
        // pdf.js już jest załadowany
        // Dodajemy tesseract.js dla lepszego OCR
        if (!window.Tesseract) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }
    }

    /**
     * Główna funkcja parsująca arkusz CKE
     */
    async parseOfficialExam(examPdfFile, answerKeyPdfFile, options = {}) {
        await this.initialize();
        
        const config = {
            subject: options.subject || 'auto-detect', // matematyka, polski, etc.
            examType: options.examType || 'auto-detect', // ósmoklasisty, matura
            useOCR: options.useOCR !== false,
            extractImages: options.extractImages !== false,
            extractFormulas: options.extractFormulas !== false,
            ...options
        };

        try {
            // 1. Ekstrakcja zawartości z PDF
            console.log('📄 Ekstraktuję zawartość arkusza...');
            const examContent = await this.extractEnhancedPdfContent(examPdfFile, config);
            
            console.log('📋 Ekstraktuję klucz odpowiedzi...');
            const answerContent = await this.extractEnhancedPdfContent(answerKeyPdfFile, {
                ...config,
                isAnswerKey: true
            });

            // 2. Analiza AI - rozpoznanie struktury
            console.log('🤖 Analizuję strukturę arkusza...');
            const structuredData = await this.analyzeExamStructure(examContent, answerContent, config);

            // 3. Przetworzenie zadań
            console.log('✏️ Przetwarzam zadania...');
            const tasks = await this.processExtractedTasks(structuredData, examContent);

            // 4. Walidacja i poprawa jakości
            console.log('✅ Walidacja wyników...');
            const validatedTasks = await this.validateAndEnhanceTasks(tasks);

            return {
                success: true,
                tasks: validatedTasks,
                metadata: {
                    subject: structuredData.subject,
                    examType: structuredData.examType,
                    year: structuredData.year,
                    totalPoints: validatedTasks.reduce((sum, t) => sum + t.punkty, 0),
                    taskCount: validatedTasks.length
                }
            };

        } catch (error) {
            console.error('Błąd parsowania:', error);
            return {
                success: false,
                error: error.message,
                tasks: []
            };
        }
    }

    /**
     * Zaawansowana ekstrakcja z PDF z OCR i rozpoznawaniem elementów
     */
    async extractEnhancedPdfContent(pdfFile, config) {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const content = {
            text: [],
            images: [],
            formulas: [],
            tables: [],
            diagrams: [],
            pages: []
        };

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            
            // Tekst
            const textContent = await page.getTextContent();
            const pageText = this.extractStructuredText(textContent);
            content.pages.push(pageText);
            content.text.push(pageText);

            // Obrazki i diagramy
            if (config.extractImages) {
                const images = await this.extractImagesFromPage(page, pageNum);
                content.images.push(...images);
            }

            // Formuły matematyczne
            if (config.extractFormulas) {
                const formulas = await this.detectMathFormulas(page, pageText);
                content.formulas.push(...formulas);
            }

            // OCR dla obszarów graficznych
            if (config.useOCR) {
                const ocrResults = await this.performOCR(page);
                this.mergeOCRResults(content, ocrResults);
            }
        }

        return content;
    }

    /**
     * Ekstrakcja tekstu z zachowaniem struktury
     */
    extractStructuredText(textContent) {
        const items = textContent.items;
        const structured = {
            lines: [],
            blocks: [],
            raw: ''
        };

        let currentLine = [];
        let lastY = null;

        items.forEach(item => {
            // Wykrywanie nowej linii
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                if (currentLine.length > 0) {
                    structured.lines.push({
                        text: currentLine.map(i => i.str).join(' '),
                        y: lastY,
                        items: currentLine
                    });
                    currentLine = [];
                }
            }
            currentLine.push(item);
            lastY = item.transform[5];
        });

        // Ostatnia linia
        if (currentLine.length > 0) {
            structured.lines.push({
                text: currentLine.map(i => i.str).join(' '),
                y: lastY,
                items: currentLine
            });
        }

        // Grupowanie w bloki
        structured.blocks = this.groupIntoBlocks(structured.lines);
        structured.raw = structured.lines.map(l => l.text).join('\n');

        return structured;
    }

    /**
     * Grupowanie linii w logiczne bloki (zadania)
     */
    groupIntoBlocks(lines) {
        const blocks = [];
        let currentBlock = [];
        
        lines.forEach((line, index) => {
            // Wykrywanie początku nowego zadania
            if (this.isTaskStart(line.text)) {
                if (currentBlock.length > 0) {
                    blocks.push({
                        lines: currentBlock,
                        text: currentBlock.map(l => l.text).join('\n')
                    });
                }
                currentBlock = [line];
            } else {
                currentBlock.push(line);
            }
        });

        if (currentBlock.length > 0) {
            blocks.push({
                lines: currentBlock,
                text: currentBlock.map(l => l.text).join('\n')
            });
        }

        return blocks;
    }

    /**
     * Wykrywanie początku zadania
     */
    isTaskStart(text) {
        // Wzorce dla różnych typów zadań
        const patterns = [
            /^Zadanie\s+\d+\.?\s*\(/i,
            /^Zadanie\s+\d+\./i,
            /^\d+\.\s+\(/,
            /^Zad\.\s*\d+/i,
            /^Task\s+\d+/i
        ];
        
        return patterns.some(pattern => pattern.test(text.trim()));
    }

    /**
     * Ekstrakcja obrazków z zachowaniem kontekstu
     */
    async extractImagesFromPage(page, pageNum) {
        const images = [];
        const ops = await page.getOperatorList();
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Canvas do renderowania
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Renderowanie strony
        await page.render({ canvasContext: context, viewport }).promise;

        // Analiza operatorów graficznych
        let currentImage = null;
        let imageIndex = 0;

        for (let i = 0; i < ops.fnArray.length; i++) {
            const fn = ops.fnArray[i];
            const args = ops.argsArray[i];

            if (fn === pdfjsLib.OPS.paintImageXObject) {
                // Znaleziono obrazek
                const transform = context.getTransform();
                const bounds = this.getImageBounds(transform, args);
                
                // Wycinanie obrazka
                const imageData = context.getImageData(
                    bounds.x, bounds.y, bounds.width, bounds.height
                );
                
                // Konwersja do base64
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = bounds.width;
                tempCanvas.height = bounds.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                images.push({
                    page: pageNum,
                    index: imageIndex++,
                    base64: tempCanvas.toDataURL('image/png'),
                    bounds: bounds,
                    type: 'image'
                });
            }
        }

        // Wykrywanie diagramów i wykresów
        const diagrams = await this.detectDiagrams(canvas, pageNum);
        images.push(...diagrams);

        return images;
    }

    /**
     * Wykrywanie diagramów geometrycznych
     */
    async detectDiagrams(canvas, pageNum) {
        const diagrams = [];
        const context = canvas.getContext('2d');
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Użycie AI do wykrycia obszarów z diagramami
        if (this.geminiAPI) {
            const base64 = canvas.toDataURL('image/png');
            const prompt = `
            Przeanalizuj obraz strony ${pageNum} arkusza egzaminacyjnego.
            Znajdź wszystkie diagramy, wykresy, rysunki geometryczne.
            Dla każdego znalezionego elementu podaj:
            - typ (diagram, wykres, rysunek geometryczny, schemat)
            - przybliżone współrzędne (x, y, szerokość, wysokość) w procentach
            - opis zawartości
            - numer zadania, do którego należy
            
            Zwróć jako JSON.
            `;
            
            try {
                const result = await this.geminiAPI.analyzeImage(base64, prompt);
                const detected = JSON.parse(result);
                
                for (const item of detected) {
                    const bounds = {
                        x: Math.floor(canvas.width * item.x / 100),
                        y: Math.floor(canvas.height * item.y / 100),
                        width: Math.floor(canvas.width * item.width / 100),
                        height: Math.floor(canvas.height * item.height / 100)
                    };
                    
                    // Wycinanie obszaru
                    const diagramData = context.getImageData(
                        bounds.x, bounds.y, bounds.width, bounds.height
                    );
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = bounds.width;
                    tempCanvas.height = bounds.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.putImageData(diagramData, 0, 0);
                    
                    diagrams.push({
                        page: pageNum,
                        base64: tempCanvas.toDataURL('image/png'),
                        bounds: bounds,
                        type: item.type,
                        description: item.description,
                        taskNumber: item.taskNumber
                    });
                }
            } catch (error) {
                console.error('Błąd wykrywania diagramów:', error);
            }
        }
        
        return diagrams;
    }

    /**
     * Wykrywanie formuł matematycznych
     */
    async detectMathFormulas(page, pageText) {
        const formulas = [];
        
        // Wzorce dla formuł matematycznych
        const mathPatterns = [
            /\$[^$]+\$/g,                    // LaTeX inline
            /\$\$[^$]+\$\$/g,                // LaTeX display
            /\\begin\{equation\}[\s\S]+?\\end\{equation\}/g,
            /[a-zA-Z]\s*=\s*[^,\n]+/g,       // Równania
            /\d+\s*[+\-*/]\s*\d+/g,          // Działania
            /\\frac\{[^}]+\}\{[^}]+\}/g,     // Ułamki
            /\\sqrt(\[[^\]]+\])?\{[^}]+\}/g, // Pierwiastki
            /\b\d+x\b/g,                     // Wyrażenia algebraiczne
            /[∫∑∏√±×÷≤≥≠≈∞]/g               // Symbole matematyczne
        ];

        // Przeszukiwanie tekstu
        const text = pageText.raw || pageText;
        mathPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                formulas.push({
                    formula: match[0],
                    type: this.detectFormulaType(match[0]),
                    index: match.index,
                    context: text.substring(
                        Math.max(0, match.index - 50),
                        Math.min(text.length, match.index + match[0].length + 50)
                    )
                });
            }
        });

        // Renderowanie formuł do obrazków jeśli potrzeba
        for (const formula of formulas) {
            if (formula.type === 'latex') {
                formula.rendered = await this.renderLatexFormula(formula.formula);
            }
        }

        return formulas;
    }

    /**
     * Określanie typu formuły
     */
    detectFormulaType(formula) {
        if (formula.includes('\\frac') || formula.includes('\\sqrt')) return 'latex';
        if (formula.includes('$')) return 'latex';
        if (/[∫∑∏]/.test(formula)) return 'advanced';
        if (/^\d+\s*[+\-*/]\s*\d+/.test(formula)) return 'arithmetic';
        if (/[a-zA-Z]/.test(formula)) return 'algebraic';
        return 'general';
    }

    /**
     * OCR dla obszarów graficznych
     */
    async performOCR(page) {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        // Użycie Tesseract.js
        const result = await Tesseract.recognize(canvas, 'pol+eng+equ', {
            logger: m => console.log('OCR:', m)
        });
        
        return {
            text: result.data.text,
            words: result.data.words,
            lines: result.data.lines,
            confidence: result.data.confidence
        };
    }

    /**
     * Analiza struktury arkusza przy pomocy AI
     */
    async analyzeExamStructure(examContent, answerContent, config) {
        const prompt = `
        Przeanalizuj strukturę arkusza egzaminacyjnego CKE.
        
        TREŚĆ ARKUSZA:
        ${examContent.text.slice(0, 10000).join('\n')}
        
        KLUCZ ODPOWIEDZI:
        ${answerContent.text.slice(0, 5000).join('\n')}
        
        Zidentyfikuj i zwróć w formacie JSON:
        {
            "subject": "nazwa przedmiotu",
            "examType": "typ egzaminu (ósmoklasisty/matura podstawowa/matura rozszerzona)",
            "year": "rok egzaminu",
            "tasks": [
                {
                    "number": "numer zadania",
                    "type": "zamkniete/otwarte",
                    "content": "pełna treść zadania",
                    "options": ["A...", "B...", "C...", "D..."] lub null,
                    "correctAnswer": "odpowiedź z klucza",
                    "points": liczba punktów,
                    "scoringCriteria": {
                        "dla zadań otwartych - kryteria punktacji"
                    },
                    "hasImage": true/false,
                    "imageDescription": "opis obrazka jeśli jest",
                    "hasFormula": true/false,
                    "formulas": ["lista formuł w zadaniu"],
                    "topic": "dział tematyczny",
                    "difficulty": "łatwe/średnie/trudne"
                }
            ]
        }
        
        Bardzo dokładnie wyodrębnij:
        1. Pełną treść każdego zadania
        2. Wszystkie opcje odpowiedzi dla zadań zamkniętych
        3. Kryteria oceniania dla zadań otwartych
        4. Informacje o obrazkach i formułach
        `;

        try {
            const response = await this.geminiAPI.generateContent(prompt);
            const structured = JSON.parse(response);
            
            // Dodatkowa analiza dla lepszego mapowania obrazków
            structured.tasks = await this.mapImagesToTasks(
                structured.tasks, 
                examContent.images,
                examContent.formulas
            );
            
            return structured;
        } catch (error) {
            console.error('Błąd analizy AI:', error);
            // Fallback do prostszej analizy
            return this.fallbackStructureAnalysis(examContent, answerContent);
        }
    }

    /**
     * Mapowanie obrazków i formuł do zadań
     */
    async mapImagesToTasks(tasks, images, formulas) {
        for (const task of tasks) {
            // Mapowanie obrazków
            if (task.hasImage && images.length > 0) {
                const taskImages = images.filter(img => {
                    // Sprawdzenie czy obrazek jest blisko zadania
                    return img.taskNumber === task.number ||
                           this.isImageNearTask(img, task);
                });
                
                if (taskImages.length > 0) {
                    task.images = taskImages.map(img => ({
                        base64: img.base64,
                        type: img.type,
                        description: img.description || task.imageDescription
                    }));
                }
            }
            
            // Mapowanie formuł
            if (task.hasFormula && formulas.length > 0) {
                const taskFormulas = formulas.filter(formula => {
                    return task.content.includes(formula.formula) ||
                           formula.context.includes(task.number);
                });
                
                task.formulas = taskFormulas.map(f => ({
                    original: f.formula,
                    type: f.type,
                    rendered: f.rendered
                }));
            }
        }
        
        return tasks;
    }

    /**
     * Przetwarzanie zadań do formatu aplikacji
     */
    async processExtractedTasks(structuredData, examContent) {
        const tasks = [];
        
        for (const taskData of structuredData.tasks) {
            const task = {
                id: `cke_${structuredData.examType}_${structuredData.year}_${taskData.number}`,
                przedmiot: this.mapSubjectToFormat(structuredData.subject, structuredData.examType),
                temat: taskData.topic || this.detectTopic(taskData.content),
                tresc: taskData.content,
                typ: taskData.type,
                odpowiedzi: taskData.options || [],
                poprawna: taskData.correctAnswer,
                punkty: taskData.points,
                poziom: taskData.difficulty || 'średnie',
                kategoria: this.detectCategory(taskData.content),
                wymaganie: this.detectRequirement(taskData.content),
                rok: structuredData.year,
                arkusz: `${structuredData.examType}_${structuredData.year}`
            };
            
            // Dodawanie obrazków
            if (taskData.images && taskData.images.length > 0) {
                task.obrazki = taskData.images;
                // Główny obrazek jako SVG lub base64
                task.obrazek = taskData.images[0].base64;
            }
            
            // Dodawanie formuł
            if (taskData.formulas && taskData.formulas.length > 0) {
                task.formuly = taskData.formulas;
                // Integracja formuł w treści
                task.tresc = this.integrateFormulasInContent(task.tresc, taskData.formulas);
            }
            
            // Kryteria oceniania dla zadań otwartych
            if (taskData.type === 'otwarte' && taskData.scoringCriteria) {
                task.kryteriaOceniania = taskData.scoringCriteria;
                task.schematOceniania = await this.generateScoringScheme(taskData);
            }
            
            tasks.push(task);
        }
        
        return tasks;
    }

    /**
     * Generowanie schematu oceniania
     */
    async generateScoringScheme(taskData) {
        const scheme = {
            maxPoints: taskData.points,
            steps: [],
            partialScoring: true
        };
        
        if (taskData.scoringCriteria) {
            // Parsowanie kryteriów CKE
            for (let i = 1; i <= taskData.points; i++) {
                const criterion = taskData.scoringCriteria[`${i}pkt`] || 
                                 taskData.scoringCriteria[`za${i}pkt`] ||
                                 taskData.scoringCriteria[i];
                
                if (criterion) {
                    scheme.steps.push({
                        points: 1,
                        description: criterion,
                        required: i === 1, // Pierwszy krok wymagany
                        alternatives: [] // Alternatywne sposoby zdobycia punktu
                    });
                }
            }
        }
        
        // Użycie AI do rozbudowania schematu
        if (this.geminiAPI && scheme.steps.length === 0) {
            const prompt = `
            Utwórz schemat oceniania dla zadania:
            "${taskData.content}"
            
            Maksymalna liczba punktów: ${taskData.points}
            
            Zwróć schemat punktacji krok po kroku.
            `;
            
            const aiScheme = await this.geminiAPI.generateContent(prompt);
            scheme.steps = this.parseAIScoringScheme(aiScheme);
        }
        
        return scheme;
    }

    /**
     * Walidacja i poprawa jakości zadań
     */
    async validateAndEnhanceTasks(tasks) {
        const validated = [];
        
        for (const task of tasks) {
            // Sprawdzenie kompletności
            if (!task.tresc || task.tresc.length < 10) {
                console.warn(`Zadanie ${task.id} ma zbyt krótką treść`);
                continue;
            }
            
            // Walidacja zadań zamkniętych
            if (task.typ === 'zamkniete') {
                if (!task.odpowiedzi || task.odpowiedzi.length < 2) {
                    console.warn(`Zadanie ${task.id} ma za mało opcji odpowiedzi`);
                    continue;
                }
                if (!task.poprawna) {
                    console.warn(`Zadanie ${task.id} nie ma oznaczonej poprawnej odpowiedzi`);
                    continue;
                }
            }
            
            // Poprawa jakości obrazków
            if (task.obrazki) {
                task.obrazki = await this.enhanceImages(task.obrazki);
            }
            
            // Walidacja formuł
            if (task.formuly) {
                task.formuly = this.validateFormulas(task.formuly);
            }
            
            // Dodanie metadanych
            task.metadata = {
                importDate: new Date().toISOString(),
                source: 'CKE Official',
                validated: true,
                confidence: this.calculateConfidence(task)
            };
            
            validated.push(task);
        }
        
        return validated;
    }

    /**
     * Poprawa jakości obrazków
     */
    async enhanceImages(images) {
        const enhanced = [];
        
        for (const img of images) {
            try {
                // Konwersja do Canvas dla przetwarzania
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const image = new Image();
                
                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                    image.src = img.base64;
                });
                
                canvas.width = image.width;
                canvas.height = image.height;
                ctx.drawImage(image, 0, 0);
                
                // Poprawa kontrastu i ostrości
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                this.enhanceImageData(imageData);
                ctx.putImageData(imageData, 0, 0);
                
                enhanced.push({
                    ...img,
                    base64: canvas.toDataURL('image/png'),
                    enhanced: true
                });
            } catch (error) {
                console.error('Błąd poprawy obrazka:', error);
                enhanced.push(img);
            }
        }
        
        return enhanced;
    }

    /**
     * Poprawa kontrastu i ostrości obrazu
     */
    enhanceImageData(imageData) {
        const data = imageData.data;
        
        // Zwiększenie kontrastu
        const factor = 1.5; // Współczynnik kontrastu
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, (data[i] - 128) * factor + 128);     // R
            data[i+1] = Math.min(255, (data[i+1] - 128) * factor + 128); // G
            data[i+2] = Math.min(255, (data[i+2] - 128) * factor + 128); // B
        }
    }

    /**
     * Pomocnicze funkcje mapowania
     */
    mapSubjectToFormat(subject, examType) {
        const mapping = {
            'matematyka': {
                'ósmoklasisty': 'egzamin ósmoklasisty',
                'matura podstawowa': 'matura podstawowa',
                'matura rozszerzona': 'matura rozszerzona'
            },
            'język polski': {
                'ósmoklasisty': 'egzamin ósmoklasisty',
                'matura podstawowa': 'matura podstawowa',
                'matura rozszerzona': 'matura rozszerzona'
            }
            // Dodać więcej przedmiotów
        };
        
        return mapping[subject.toLowerCase()]?.[examType] || examType;
    }

    detectTopic(content) {
        // Słowa kluczowe dla różnych działów
        const topics = {
            'geometria': ['trójkąt', 'prostokąt', 'koło', 'figura', 'kąt', 'pole', 'obwód'],
            'algebra': ['równanie', 'nierówność', 'funkcja', 'wyrażenie', 'x', 'y'],
            'analiza': ['granica', 'pochodna', 'całka', 'ciągłość'],
            'statystyka': ['średnia', 'mediana', 'prawdopodobieństwo', 'wykres'],
            'arytmetyka': ['liczba', 'działanie', 'procent', 'ułamek', 'proporcja']
        };
        
        const contentLower = content.toLowerCase();
        
        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => contentLower.includes(keyword))) {
                return topic;
            }
        }
        
        return 'inne';
    }

    detectCategory(content) {
        // Implementacja podobna do detectTopic
        return 'standardowe';
    }

    detectRequirement(content) {
        // Wykrywanie wymagań egzaminacyjnych
        return 'II.3'; // Przykładowe wymaganie
    }

    calculateConfidence(task) {
        let confidence = 100;
        
        // Obniżanie pewności za brakujące elementy
        if (!task.obrazki && task.tresc.includes('rysunek')) confidence -= 20;
        if (!task.formuly && /[∫∑∏√]/.test(task.tresc)) confidence -= 15;
        if (task.typ === 'otwarte' && !task.kryteriaOceniania) confidence -= 25;
        
        return Math.max(0, confidence);
    }

    /**
     * Renderowanie formuł LaTeX
     */
    async renderLatexFormula(formula) {
        // Używamy MathJax jeśli jest dostępny
        if (window.MathJax) {
            const span = document.createElement('span');
            span.innerHTML = formula;
            await MathJax.typesetPromise([span]);
            
            // Konwersja do SVG
            const svg = span.querySelector('svg');
            if (svg) {
                return svg.outerHTML;
            }
        }
        
        // Fallback - zwracamy oryginalną formułę
        return formula;
    }

    /**
     * Integracja formuł w treści zadania
     */
    integrateFormulasInContent(content, formulas) {
        let integrated = content;
        
        formulas.forEach((formula, index) => {
            if (formula.rendered && formula.rendered.startsWith('<svg')) {
                // Zastąpienie tekstowej formuły renderowaną wersją
                integrated = integrated.replace(
                    formula.original,
                    `<span class="math-formula" data-formula-id="${index}">${formula.rendered}</span>`
                );
            }
        });
        
        return integrated;
    }
}

// Eksport jako globalna klasa
window.CKEParserSystem = CKEParserSystem;