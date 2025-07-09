// ===== GENERATOR WARIANTÓW ZADAŃ Z GEMINI 2.5 FLASH =====

class TaskVariantGenerator {
  constructor() {
    // Konfiguracja API - używamy proxy serwera
    const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : window.location.origin;
    
    this.proxyEndpoint = `${baseUrl}/api/gemini/generate`;
    this.authEndpoint = `${baseUrl}/api/auth/session`;
    this.sessionToken = localStorage.getItem('geminiSessionToken') || '';
    
    // Statystyki użycia
    this.usageStats = JSON.parse(localStorage.getItem('geminiUsageStats') || JSON.stringify({
      totalRequests: 0,
      totalCost: 0,
      successCount: 0,
      errorCount: 0,
      lastReset: new Date().toISOString()
    }));
  }

  /**
   * Autoryzuje użytkownika i uzyskuje token sesji
   */
  async authenticate(userId, role) {
    try {
      const response = await fetch(this.authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role })
      });

      if (!response.ok) {
        throw new Error('Błąd autoryzacji');
      }

      const data = await response.json();
      this.sessionToken = data.sessionToken;
      localStorage.setItem('geminiSessionToken', this.sessionToken);
      return true;
    } catch (error) {
      console.error('Błąd autoryzacji:', error);
      return false;
    }
  }

  /**
   * Sprawdza czy zadanie może być generowane
   */
  canGenerateVariant(task) {
    // Sprawdź typ zadania
    if (!task.typ || task.typ !== 'zamkniete') {
      return { canGenerate: false, reason: 'Tylko zadania zamknięte mogą być generowane' };
    }

    // Sprawdź czy ma wystarczające dane
    if (!task.tresc || !task.odpowiedzi || task.odpowiedzi.length < 2) {
      return { canGenerate: false, reason: 'Brak wystarczających danych w zadaniu' };
    }

    // Określ typ generacji
    const simpleTypes = ['arytmetyka', 'geometria_podstawowa', 'procenty_proste'];
    const requiresAI = !simpleTypes.some(type => task.temat.toLowerCase().includes(type));

    return { 
      canGenerate: true, 
      requiresAI,
      estimatedCost: requiresAI ? 0.0019 : 0.0001 
    };
  }

  /**
   * Generuje wariant zadania
   */
  async generateVariant(task, options = {}) {
    const { 
      useAI = true, 
      thinkingBudget = 512,
      preserveContext = true 
    } = options;

    try {
      // Sprawdź możliwość generacji
      const { canGenerate, requiresAI, reason } = this.canGenerateVariant(task);
      
      if (!canGenerate) {
        throw new Error(reason);
      }

      // Jeśli wymaga AI ale AI jest wyłączone
      if (requiresAI && !useAI) {
        throw new Error('To zadanie wymaga AI do generacji wariantu');
      }

      // Użyj odpowiedniego generatora
      let variant;
      if (!requiresAI || !useAI) {
        variant = await this.generateSimpleVariant(task);
      } else {
        variant = await this.generateAIVariant(task, thinkingBudget, preserveContext);
      }

      // Zapisz statystyki
      this.updateUsageStats(requiresAI && useAI);

      return {
        success: true,
        variant,
        usedAI: requiresAI && useAI,
        estimatedCost: requiresAI && useAI ? 0.0019 : 0
      };

    } catch (error) {
      console.error('Błąd generacji wariantu:', error);
      this.usageStats.errorCount++;
      this.saveUsageStats();
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generuje prosty wariant (bez AI)
   */
  async generateSimpleVariant(task) {
    // Znajdź liczby w zadaniu
    const numbers = task.tresc.match(/\d+/g)?.map(Number) || [];
    
    if (numbers.length === 0) {
      throw new Error('Brak liczb do zmiany w zadaniu');
    }

    // Generuj nowe liczby z 30% wariancją
    const newNumbers = numbers.map(num => {
      const variance = Math.floor(num * 0.3);
      const min = Math.max(1, num - variance);
      const max = num + variance;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });

    // Zamień liczby w treści
    let newQuestion = task.tresc;
    numbers.forEach((oldNum, index) => {
      const regex = new RegExp(`\\b${oldNum}\\b`);
      newQuestion = newQuestion.replace(regex, newNumbers[index].toString());
    });

    // Oblicz nową odpowiedź (dla prostych zadań)
    const newAnswer = this.calculateSimpleAnswer(newQuestion, task);

    // Generuj błędne odpowiedzi
    const wrongAnswers = this.generateWrongAnswers(newAnswer, task.typ);

    return {
      id: `variant_${Date.now()}`,
      tresc: newQuestion,
      typ: task.typ,
      odpowiedzi: this.shuffleAnswers([newAnswer, ...wrongAnswers]),
      poprawna: newAnswer,
      punkty: task.punkty,
      poziom: task.poziom,
      przedmiot: task.przedmiot,
      temat: task.temat,
      originalTaskId: task.id,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generuje wariant z użyciem Gemini AI
   */
  async generateAIVariant(task, thinkingBudget, preserveContext) {
    if (!this.sessionToken) {
      throw new Error('Brak autoryzacji. Zaloguj się ponownie.');
    }

    const prompt = this.createOptimizedPrompt(task, preserveContext);
    
    try {
      const response = await fetch(this.proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: JSON.stringify({
          prompt: prompt,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            candidateCount: 1
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Błąd API Gemini');
      }

      const data = await response.json();
      console.log('Odpowiedź z Gemini API:', data);
      
      // Sprawdź czy otrzymaliśmy prawidłową odpowiedź
      if (!data.candidates || !data.candidates[0]) {
        console.error('Brak candidates w odpowiedzi:', data);
        throw new Error('Model nie zwrócił odpowiedzi.');
      }
      
      if (!data.candidates[0].content || !data.candidates[0].content.parts) {
        console.error('Brak content.parts w odpowiedzi. FinishReason:', data.candidates[0].finishReason);
        if (data.candidates[0].finishReason === 'MAX_TOKENS') {
          throw new Error('Przekroczono limit tokenów. Model używa dużo tokenów na myślenie.');
        }
        throw new Error('Model nie zwrócił treści.');
      }
      
      if (!data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
        console.error('Brak tekstu w odpowiedzi:', data);
        throw new Error('Model zwrócił pustą odpowiedź.');
      }
      
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Parsuj odpowiedź JSON
      const parsedTask = this.parseGeminiResponse(generatedText, task);
      
      return parsedTask;

    } catch (error) {
      console.error('Błąd wywołania Gemini API:', error);
      throw new Error(`Błąd generacji AI: ${error.message}`);
    }
  }

  /**
   * Tworzy zoptymalizowany prompt dla Gemini
   */
  createOptimizedPrompt(task, preserveContext) {
    return `Jesteś ekspertem w tworzeniu zadań matematycznych. Wygeneruj wariant poniższego zadania, zmieniając liczby ale zachowując:
- Ten sam poziom trudności (${task.poziom})
- Tę samą strukturę logiczną
- Podobną złożoność obliczeń
${preserveContext ? '- Podobny kontekst (np. zakupy, podróż, sport)' : ''}

ORYGINALNE ZADANIE:
Treść: ${task.tresc}
Poprawna odpowiedź: ${task.poprawna}
Błędne odpowiedzi: ${task.odpowiedzi.filter(o => o !== task.poprawna).join(', ')}
Przedmiot: ${task.przedmiot}
Temat: ${task.temat}

WYMAGANIA:
1. Używaj liczb całkowitych od 1 do 1000
2. Upewnij się, że odpowiedź jest jednoznaczna
3. Wygeneruj 3 błędne odpowiedzi, które mogłyby być wynikiem typowych błędów
4. Zachowaj realizm scenariusza

Odpowiedz TYLKO w formacie JSON:
{
  "tresc": "Nowa treść zadania",
  "poprawna": "Poprawna odpowiedź",
  "bledne": ["Błędna 1", "Błędna 2", "Błędna 3"],
  "wyjasnienie": "Krótkie wyjaśnienie rozwiązania"
}`;
  }

  /**
   * Parsuje odpowiedź z Gemini
   */
  parseGeminiResponse(responseText, originalTask) {
    try {
      // Usuń ewentualne markdown code blocks
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      // Przygotuj wszystkie odpowiedzi
      const allAnswers = [parsed.poprawna, ...parsed.bledne];
      
      return {
        id: `variant_ai_${Date.now()}`,
        tresc: parsed.tresc,
        typ: originalTask.typ,
        odpowiedzi: this.shuffleAnswers(allAnswers),
        poprawna: parsed.poprawna,
        punkty: originalTask.punkty,
        poziom: originalTask.poziom,
        przedmiot: originalTask.przedmiot,
        temat: originalTask.temat,
        wyjasnienie: parsed.wyjasnienie,
        originalTaskId: originalTask.id,
        generatedAt: new Date().toISOString(),
        generatedWithAI: true
      };
    } catch (error) {
      throw new Error('Nie udało się przetworzyć odpowiedzi AI');
    }
  }

  /**
   * Oblicza odpowiedź dla prostych zadań
   */
  calculateSimpleAnswer(question, task) {
    // Próbuj znaleźć proste działanie matematyczne
    const patterns = [
      /(\d+)\s*\+\s*(\d+)/,
      /(\d+)\s*-\s*(\d+)/,
      /(\d+)\s*[*×]\s*(\d+)/,
      /(\d+)\s*[:/÷]\s*(\d+)/
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match) {
        const [, a, b] = match;
        const numA = parseInt(a);
        const numB = parseInt(b);
        
        if (pattern.source.includes('+')) return (numA + numB).toString();
        if (pattern.source.includes('-')) return (numA - numB).toString();
        if (pattern.source.includes('*') || pattern.source.includes('×')) return (numA * numB).toString();
        if (pattern.source.includes(':') || pattern.source.includes('÷')) {
          return (numA / numB).toFixed(2).replace(/\.00$/, '');
        }
      }
    }

    // Dla bardziej złożonych zadań - użyj oryginalnej odpowiedzi z modyfikacją
    const originalAnswer = parseFloat(task.poprawna) || 0;
    const modifier = 0.8 + Math.random() * 0.4; // 80% - 120% oryginalnej wartości
    return Math.round(originalAnswer * modifier).toString();
  }

  /**
   * Generuje błędne odpowiedzi
   */
  generateWrongAnswers(correctAnswer, taskType) {
    const correct = parseFloat(correctAnswer) || 0;
    const wrongAnswers = new Set();

    // Typowe błędy matematyczne
    const commonErrors = [
      correct + 10,
      correct - 10,
      correct * 2,
      correct / 2,
      correct + 1,
      correct - 1,
      Math.round(correct * 1.1),
      Math.round(correct * 0.9)
    ];

    // Wybierz 3 unikalne błędne odpowiedzi
    while (wrongAnswers.size < 3) {
      const error = commonErrors[Math.floor(Math.random() * commonErrors.length)];
      if (error !== correct && error > 0) {
        wrongAnswers.add(error.toString());
      }
    }

    return Array.from(wrongAnswers);
  }

  /**
   * Miesza odpowiedzi
   */
  shuffleAnswers(answers) {
    const shuffled = [...answers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generuje wiele wariantów (batch)
   */
  async generateBatch(tasks, quantity = 5, options = {}) {
    const results = {
      generated: [],
      errors: [],
      totalCost: 0
    };

    for (const task of tasks) {
      for (let i = 0; i < quantity; i++) {
        try {
          const result = await this.generateVariant(task, options);
          if (result.success) {
            results.generated.push(result.variant);
            results.totalCost += result.estimatedCost || 0;
          } else {
            results.errors.push({
              taskId: task.id,
              error: result.error
            });
          }
        } catch (error) {
          results.errors.push({
            taskId: task.id,
            error: error.message
          });
        }

        // Rate limiting - czekaj 100ms między requestami
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Aktualizuje statystyki użycia
   */
  updateUsageStats(usedAI) {
    this.usageStats.totalRequests++;
    this.usageStats.successCount++;
    
    if (usedAI) {
      // Szacowany koszt dla AI generation
      this.usageStats.totalCost += 0.0019;
    }
    
    this.saveUsageStats();
  }

  /**
   * Zapisuje statystyki
   */
  saveUsageStats() {
    localStorage.setItem('geminiUsageStats', JSON.stringify(this.usageStats));
  }

  /**
   * Pobiera statystyki użycia
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      avgCostPerRequest: this.usageStats.totalRequests > 0 
        ? this.usageStats.totalCost / this.usageStats.totalRequests 
        : 0,
      successRate: this.usageStats.totalRequests > 0
        ? this.usageStats.successCount / this.usageStats.totalRequests
        : 0
    };
  }

  /**
   * Resetuje statystyki
   */
  resetStats() {
    this.usageStats = {
      totalRequests: 0,
      totalCost: 0,
      successCount: 0,
      errorCount: 0,
      lastReset: new Date().toISOString()
    };
    this.saveUsageStats();
  }
}

// Eksportuj dla użycia w aplikacji
window.TaskVariantGenerator = TaskVariantGenerator;