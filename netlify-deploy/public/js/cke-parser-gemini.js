/**
 * Uproszczony parser CKE używający tylko Gemini API
 * Przesyła cały tekst arkusza do AI i otrzymuje sformatowane zadania
 */

class CKEParserGemini {
    constructor() {
        this.initialized = false;
        this.apiClient = null;
    }

    /**
     * Inicjalizacja parsera
     */
    async initialize() {
        if (this.initialized) return;
        
        // Użyj globalnego APIClient
        if (window.APIClient) {
            this.apiClient = window.APIClient;
            this.initialized = true;
            console.log('✅ CKE Parser Gemini zainicjalizowany');
        } else {
            console.error('❌ Brak APIClient - parser nie będzie działał');
            throw new Error('APIClient nie jest dostępny');
        }
    }

    /**
     * Parsowanie arkusza CKE używając tylko Gemini API
     */
    async parseWithGemini(examPdfFile, answerKeyPdfFile = null) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.apiClient) {
            throw new Error('Parser nie został prawidłowo zainicjalizowany');
        }

        try {
            // 1. Wyciągnij tekst z PDF-ów
            console.log('📄 Ekstraktuję tekst z arkusza...');
            const examText = await this.extractTextFromPDF(examPdfFile);
            
            let answerText = '';
            if (answerKeyPdfFile) {
                console.log('📋 Ekstraktuję tekst z klucza odpowiedzi...');
                answerText = await this.extractTextFromPDF(answerKeyPdfFile);
            }

            // 2. Przygotuj prompt dla Gemini
            const prompt = this.createParsingPrompt(examText, answerText);

            // 3. Wyślij do Gemini i otrzymaj sparsowane zadania
            console.log('🤖 Analizuję arkusz za pomocą Gemini AI...');
            const response = await this.apiClient.generateContent(prompt, {
                temperature: 0.1, // Niska temperatura dla dokładności
                maxTokens: 4096
            });

            // 4. Przetwórz odpowiedź
            const parsedData = this.processGeminiResponse(response);

            // 5. Waliduj i zwróć wyniki
            const validatedTasks = this.validateTasks(parsedData.tasks);

            return {
                success: true,
                tasks: validatedTasks,
                metadata: parsedData.metadata || {}
            };

        } catch (error) {
            console.error('Błąd parsowania przez Gemini:', error);
            return {
                success: false,
                error: error.message,
                tasks: []
            };
        }
    }

    /**
     * Wyciąga tekst z PDF używając pdf.js
     */
    async extractTextFromPDF(pdfFile) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('Biblioteka pdf.js nie jest załadowana');
        }

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `\n\n--- STRONA ${i} ---\n${pageText}`;
        }

        return fullText;
    }

    /**
     * Tworzy prompt do parsowania arkusza
     */
    createParsingPrompt(examText, answerText) {
        return `Jesteś ekspertem w analizie arkuszy egzaminacyjnych CKE. Przeanalizuj poniższy arkusz egzaminacyjny i wyodrębnij wszystkie zadania.

ARKUSZ EGZAMINACYJNY:
${examText}

${answerText ? `KLUCZ ODPOWIEDZI:\n${answerText}` : ''}

Zwróć dane w formacie JSON zawierającym:

{
  "metadata": {
    "subject": "przedmiot (matematyka/polski/angielski/itp)",
    "examType": "typ egzaminu (ósmoklasisty/matura podstawowa/matura rozszerzona)",
    "year": "rok egzaminu",
    "totalPoints": liczba_punktów
  },
  "tasks": [
    {
      "id": "unikalny_identyfikator",
      "tresc": "pełna treść zadania",
      "typ": "zamkniete" lub "otwarte",
      "punkty": liczba_punktów,
      "odpowiedzi": ["A...", "B...", "C...", "D..."] // dla zadań zamkniętych,
      "poprawna": "poprawna odpowiedź",
      "kategoria": "kategoria zadania",
      "podkategoria": "podkategoria",
      "poziom": "podstawowy/średni/zaawansowany",
      "wskazowki": ["wskazówka 1", "wskazówka 2"] // opcjonalne
    }
  ]
}

WAŻNE ZASADY:
1. Zachowaj DOKŁADNĄ treść każdego zadania
2. Dla zadań zamkniętych wylistuj WSZYSTKIE opcje odpowiedzi
3. Jeśli jest klucz odpowiedzi, użyj go do określenia poprawnych odpowiedzi
4. Kategoryzuj zadania według tematyki
5. Określ poziom trudności na podstawie złożoności
6. Dla zadań matematycznych zachowaj formuły i wyrażenia
7. Zwróć TYLKO poprawny JSON, bez dodatkowych komentarzy`;
    }

    /**
     * Przetwarza odpowiedź z Gemini
     */
    processGeminiResponse(response) {
        try {
            // Wyciągnij JSON z odpowiedzi
            const responseText = typeof response === 'string' ? response : response.text;
            
            // Znajdź JSON w odpowiedzi (może być otoczony tekstem)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Nie znaleziono poprawnego JSON w odpowiedzi');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Upewnij się że mamy wymagane pola
            if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
                throw new Error('Brak tablicy zadań w odpowiedzi');
            }

            return parsed;
        } catch (error) {
            console.error('Błąd przetwarzania odpowiedzi Gemini:', error);
            throw new Error('Nie udało się przetworzyć odpowiedzi AI: ' + error.message);
        }
    }

    /**
     * Waliduje i poprawia zadania
     */
    validateTasks(tasks) {
        return tasks.map((task, index) => {
            // Generuj ID jeśli brak
            if (!task.id) {
                task.id = `cke_${Date.now()}_${index}`;
            }

            // Domyślne wartości
            task.typ = task.typ || 'otwarte';
            task.punkty = task.punkty || 1;
            task.kategoria = task.kategoria || 'Nieprzypisane';
            task.poziom = task.poziom || 'średni';

            // Dla zadań zamkniętych sprawdź odpowiedzi
            if (task.typ === 'zamkniete') {
                if (!task.odpowiedzi || task.odpowiedzi.length < 2) {
                    console.warn(`Zadanie ${task.id} ma za mało opcji odpowiedzi`);
                    task.typ = 'otwarte'; // Zmień na otwarte jeśli brak opcji
                }
            }

            // Upewnij się że treść istnieje
            if (!task.tresc || task.tresc.trim() === '') {
                task.tresc = `Zadanie ${index + 1}`;
            }

            return task;
        });
    }

    /**
     * Pomocnicza metoda do testowania parsera
     */
    async testParser(examText, answerText = '') {
        const prompt = this.createParsingPrompt(examText, answerText);
        console.log('Test prompt:', prompt);
        
        try {
            const response = await this.apiClient.generateContent(prompt);
            const result = this.processGeminiResponse(response);
            console.log('Test result:', result);
            return result;
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    }
}

// Eksportuj jako globalną
window.CKEParserGemini = CKEParserGemini;