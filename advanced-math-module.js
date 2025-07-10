// ===== ZAAWANSOWANY MODUŁ MATEMATYCZNY =====
// Obsługa zadań z podpunktami, formuł matematycznych i obrazków

class AdvancedMathModule {
  constructor() {
    this.mathSymbols = {
      sqrt: '√',
      pi: 'π',
      alpha: 'α',
      beta: 'β',
      gamma: 'γ',
      delta: 'δ',
      theta: 'θ',
      infinity: '∞',
      pm: '±',
      times: '×',
      div: '÷',
      leq: '≤',
      geq: '≥',
      neq: '≠',
      approx: '≈'
    };
  }

  /**
   * Dzieli zadanie otwarte na podpunkty z możliwością automatycznego sprawdzania
   * @param {Object} task - Zadanie do podzielenia
   * @param {Array} subtasks - Tablica podpunktów
   * @returns {Object} Zadanie z podpunktami
   */
  createSubtaskStructure(task, subtasks) {
    if (task.typ !== 'otwarte') {
      throw new Error('Tylko zadania otwarte mogą być dzielone na podpunkty');
    }

    return {
      ...task,
      typ: 'otwarte_podzielone',
      podpunkty: subtasks.map((subtask, index) => ({
        id: `${task.id}_sub_${index + 1}`,
        nazwa: subtask.nazwa || `Podpunkt ${String.fromCharCode(97 + index)})`,
        tresc: subtask.tresc,
        punkty: subtask.punkty || 1,
        typ: subtask.typ || 'zamkniete', // Domyślnie zamknięte dla łatwiejszego sprawdzania
        odpowiedzi: subtask.odpowiedzi || [],
        poprawna: subtask.poprawna,
        wskazowka: subtask.wskazowka,
        kryteriaOceny: subtask.kryteriaOceny
      })),
      punktyRazem: subtasks.reduce((sum, sub) => sum + (sub.punkty || 1), 0)
    };
  }

  /**
   * Parsuje input matematyczny do formatu LaTeX/MathML
   * @param {string} input - Tekst wejściowy np. "sqrt(5)/8" lub "7√5/8"
   * @returns {Object} Sparsowana formuła
   */
  parseMathInput(input) {
    // Zamieniaj popularne notacje na symbole
    let processed = input
      .replace(/sqrt\((.*?)\)/g, '√($1)')
      .replace(/pi/g, 'π')
      .replace(/\^/g, '**')
      .replace(/\*/g, '×')
      .replace(/\//g, '÷');

    // Konwersja do LaTeX
    const latex = this.convertToLatex(processed);
    
    // Oblicz wartość numeryczną (jeśli możliwe)
    let numericValue = null;
    try {
      numericValue = this.evaluateMathExpression(input);
    } catch (e) {
      console.log('Nie można obliczyć wartości numerycznej:', e);
    }

    return {
      original: input,
      display: processed,
      latex: latex,
      numericValue: numericValue,
      isValid: this.validateMathExpression(input)
    };
  }

  /**
   * Konwertuje wyrażenie do LaTeX
   */
  convertToLatex(expression) {
    let latex = expression
      .replace(/√\((.*?)\)/g, '\\sqrt{$1}')
      .replace(/√(\d+)/g, '\\sqrt{$1}')
      .replace(/\*\*/g, '^')
      .replace(/×/g, '\\times')
      .replace(/÷/g, '\\div')
      .replace(/π/g, '\\pi')
      .replace(/∞/g, '\\infty')
      .replace(/≤/g, '\\leq')
      .replace(/≥/g, '\\geq')
      .replace(/≠/g, '\\neq')
      .replace(/≈/g, '\\approx')
      .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

    // Obsługa ułamków z pierwiastkami np. "7√5/8"
    latex = latex.replace(/(\d+)\\sqrt{(\d+)}\/(\d+)/g, '\\frac{$1\\sqrt{$2}}{$3}');
    
    return latex;
  }

  /**
   * Waliduje wyrażenie matematyczne
   */
  validateMathExpression(expression) {
    try {
      // Sprawdź podstawową składnię
      const validChars = /^[0-9+\-*/^().,\s√πα-ωΑ-Ω]+$/;
      if (!validChars.test(expression.replace(/sqrt|pi|alpha|beta|gamma/g, ''))) {
        return false;
      }

      // Sprawdź zbalansowanie nawiasów
      let parentheses = 0;
      for (let char of expression) {
        if (char === '(') parentheses++;
        if (char === ')') parentheses--;
        if (parentheses < 0) return false;
      }
      
      return parentheses === 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Oblicza wartość wyrażenia matematycznego
   */
  evaluateMathExpression(expression) {
    // Zamień symbole na wartości
    let evalExpr = expression
      .replace(/√/g, 'Math.sqrt')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/π|pi/g, 'Math.PI')
      .replace(/\^/g, '**')
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    // Bezpieczna ewaluacja
    try {
      // Sprawdź czy wyrażenie jest bezpieczne
      if (!/^[0-9+\-*/().,\s]|Math\.(sqrt|PI|pow|abs|sin|cos|tan|log)/.test(evalExpr)) {
        throw new Error('Nieprawidłowe wyrażenie');
      }
      
      // Użyj Function constructor zamiast eval dla bezpieczeństwa
      const result = new Function('return ' + evalExpr)();
      return Number.isFinite(result) ? result : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Porównuje odpowiedzi matematyczne z tolerancją
   */
  compareMathAnswers(userAnswer, correctAnswer, tolerance = 0.01) {
    // Parsuj oba wyrażenia
    const userParsed = this.parseMathInput(userAnswer);
    const correctParsed = this.parseMathInput(correctAnswer);

    // Jeśli oba mają wartości numeryczne, porównaj je
    if (userParsed.numericValue !== null && correctParsed.numericValue !== null) {
      const diff = Math.abs(userParsed.numericValue - correctParsed.numericValue);
      return diff <= tolerance;
    }

    // Porównaj symboliczne reprezentacje
    return this.compareSymbolic(userParsed, correctParsed);
  }

  /**
   * Porównuje wyrażenia symboliczne
   */
  compareSymbolic(expr1, expr2) {
    // Normalizuj wyrażenia
    const normalize = (expr) => {
      return expr.display
        .replace(/\s+/g, '')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .toLowerCase();
    };

    const norm1 = normalize(expr1);
    const norm2 = normalize(expr2);

    // Bezpośrednie porównanie
    if (norm1 === norm2) return true;

    // Sprawdź równoważne formy
    // np. "2*3" = "3*2", "a+b" = "b+a"
    return this.checkEquivalentForms(norm1, norm2);
  }

  /**
   * Sprawdza równoważne formy matematyczne
   */
  checkEquivalentForms(expr1, expr2) {
    // To jest uproszczona wersja - w pełnej implementacji
    // należałoby użyć biblioteki do algebry symbolicznej
    
    // Sprawdź przemienność mnożenia i dodawania
    const commutativeCheck = (e1, e2) => {
      // Prosty test dla a*b = b*a
      const parts1 = e1.split(/[*+]/);
      const parts2 = e2.split(/[*+]/);
      
      if (parts1.length === parts2.length) {
        parts1.sort();
        parts2.sort();
        return parts1.join('') === parts2.join('');
      }
      return false;
    };

    return commutativeCheck(expr1, expr2);
  }

  /**
   * Renderuje wyrażenie matematyczne w HTML
   */
  renderMathExpression(expression, useLatex = false) {
    const parsed = this.parseMathInput(expression);
    
    if (useLatex && window.MathJax) {
      return `<span class="math-latex">\\(${parsed.latex}\\)</span>`;
    }
    
    // Fallback do HTML z symbolami Unicode
    return `<span class="math-expression">${parsed.display}</span>`;
  }

  /**
   * Tworzy komponent do wprowadzania formuł matematycznych
   */
  createMathInputComponent(onChangeCallback) {
    const container = document.createElement('div');
    container.className = 'math-input-container';
    
    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'math-input-field';
    input.placeholder = 'np. sqrt(5)/8 lub 7√5/8';
    
    // Preview
    const preview = document.createElement('div');
    preview.className = 'math-preview';
    
    // Symbol buttons
    const symbolBar = document.createElement('div');
    symbolBar.className = 'math-symbol-bar';
    
    Object.entries(this.mathSymbols).forEach(([key, symbol]) => {
      const btn = document.createElement('button');
      btn.className = 'math-symbol-btn';
      btn.textContent = symbol;
      btn.onclick = () => {
        const pos = input.selectionStart;
        const val = input.value;
        input.value = val.slice(0, pos) + symbol + val.slice(pos);
        input.focus();
        input.setSelectionRange(pos + 1, pos + 1);
        updatePreview();
      };
      symbolBar.appendChild(btn);
    });
    
    // Update preview function
    const updatePreview = () => {
      const parsed = this.parseMathInput(input.value);
      preview.innerHTML = this.renderMathExpression(input.value);
      
      if (parsed.isValid) {
        input.classList.remove('invalid');
        preview.classList.remove('invalid');
      } else {
        input.classList.add('invalid');
        preview.classList.add('invalid');
      }
      
      if (onChangeCallback) {
        onChangeCallback(parsed);
      }
    };
    
    input.addEventListener('input', updatePreview);
    
    container.appendChild(symbolBar);
    container.appendChild(input);
    container.appendChild(preview);
    
    return container;
  }

  /**
   * Obsługuje obrazki w zadaniach
   */
  async handleTaskImage(imageFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Sprawdź rozmiar
          if (img.width > 1200 || img.height > 800) {
            // Zmniejsz rozmiar
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const maxWidth = 1200;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve({
              dataUrl: canvas.toDataURL('image/png'),
              width: width,
              height: height,
              originalSize: imageFile.size,
              compressedSize: canvas.toDataURL('image/png').length
            });
          } else {
            resolve({
              dataUrl: e.target.result,
              width: img.width,
              height: img.height,
              originalSize: imageFile.size,
              compressedSize: e.target.result.length
            });
          }
        };
        
        img.onerror = () => reject(new Error('Błąd ładowania obrazka'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Błąd odczytu pliku'));
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Generuje przykładowe zadanie z podpunktami
   */
  generateExampleSubtaskQuestion() {
    return {
      id: 'example_subtask_' + Date.now(),
      przedmiot: 'matura rozszerzona',
      temat: 'Stereometria',
      tresc: 'Dany jest ostrosłup prawidłowy czworokątny ABCDS, którego krawędź podstawy ma długość 6, a krawędź boczna ma długość 5.',
      typ: 'otwarte',
      punkty: 5,
      poziom: 'rozszerzony',
      obrazek: null,
      podpunkty: [
        {
          nazwa: 'a)',
          tresc: 'Oblicz wysokość ostrosłupa.',
          punkty: 1,
          typ: 'zamkniete',
          odpowiedzi: ['√7', '2√7', '3√7', '4√7'],
          poprawna: '√7',
          wskazowka: 'Użyj twierdzenia Pitagorasa w trójkącie prostokątnym'
        },
        {
          nazwa: 'b)',
          tresc: 'Oblicz kąt nachylenia krawędzi bocznej do płaszczyzny podstawy.',
          punkty: 1,
          typ: 'zamkniete',
          odpowiedzi: ['30°', '45°', '60°', 'arccos(3√2/5)'],
          poprawna: 'arccos(3√2/5)',
          wskazowka: 'Wykorzystaj funkcje trygonometryczne'
        },
        {
          nazwa: 'c)',
          tresc: 'Oblicz tangens kąta między ścianą boczną a płaszczyzną podstawy.',
          punkty: 1,
          typ: 'zamkniete',
          odpowiedzi: ['√14/6', '√14/3', '2√14/3', '√14/2'],
          poprawna: '√14/3',
          wskazowka: 'Znajdź wysokość ściany bocznej'
        },
        {
          nazwa: 'd)',
          tresc: 'Oblicz pole powierzchni całkowitej ostrosłupa.',
          punkty: 1,
          typ: 'zamkniete',
          odpowiedzi: ['36 + 12√14', '36 + 24√14', '36 + 6√14', '36 + 18√14'],
          poprawna: '36 + 12√14',
          wskazowka: 'Pole = pole podstawy + 4 × pole ściany bocznej'
        },
        {
          nazwa: 'e)',
          tresc: 'Oblicz objętość ostrosłupa.',
          punkty: 1,
          typ: 'zamkniete',
          odpowiedzi: ['12√7', '24√7', '36√7', '48√7'],
          poprawna: '12√7',
          wskazowka: 'V = 1/3 × pole podstawy × wysokość'
        }
      ]
    };
  }

  /**
   * Otwiera moduł matematyczny
   */
  openMathModule() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">
            <i class="fas fa-calculator text-blue-400 mr-2"></i>
            Zaawansowana Matematyka
          </h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="grid gap-6">
          <div class="card-modern">
            <h3 class="text-xl font-semibold mb-4">
              <i class="fas fa-square-root-alt text-purple-400 mr-2"></i>
              Kalkulator naukowy
            </h3>
            <p class="text-gray-400 mb-4">
              Zaawansowane obliczenia matematyczne
            </p>
            <button onclick="window.advancedMath.openCalculator()" 
                    class="btn-primary">
              <i class="fas fa-calculator mr-2"></i>
              Otwórz kalkulator
            </button>
          </div>
          
          <div class="card-modern">
            <h3 class="text-xl font-semibold mb-4">
              <i class="fas fa-chart-line text-green-400 mr-2"></i>
              Generator wykresów
            </h3>
            <p class="text-gray-400 mb-4">
              Wizualizacja funkcji matematycznych
            </p>
            <button onclick="window.advancedMath.openGrapher()" 
                    class="btn-primary">
              <i class="fas fa-chart-area mr-2"></i>
              Utwórz wykres
            </button>
          </div>
          
          <div class="card-modern">
            <h3 class="text-xl font-semibold mb-4">
              <i class="fas fa-shapes text-yellow-400 mr-2"></i>
              Geometria interaktywna
            </h3>
            <p class="text-gray-400 mb-4">
              Narzędzia do rysowania figur geometrycznych
            </p>
            <button onclick="window.advancedMath.openGeometry()" 
                    class="btn-primary">
              <i class="fas fa-drafting-compass mr-2"></i>
              Otwórz geometrię
            </button>
          </div>
          
          <div class="card-modern">
            <h3 class="text-xl font-semibold mb-4">
              <i class="fas fa-superscript text-red-400 mr-2"></i>
              Edytor równań
            </h3>
            <p class="text-gray-400 mb-4">
              Tworzenie i formatowanie wzorów matematycznych
            </p>
            <button onclick="window.advancedMath.openEquationEditor()" 
                    class="btn-primary">
              <i class="fas fa-edit mr-2"></i>
              Edytuj równania
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return true;
  }

  /**
   * Otwiera kalkulator naukowy
   */
  openCalculator() {
    alert('Kalkulator naukowy będzie dostępny wkrótce');
  }

  /**
   * Otwiera generator wykresów
   */
  openGrapher() {
    alert('Generator wykresów będzie dostępny wkrótce');
  }

  /**
   * Otwiera narzędzia geometryczne
   */
  openGeometry() {
    alert('Geometria interaktywna będzie dostępna wkrótce');
  }

  /**
   * Otwiera edytor równań
   */
  openEquationEditor() {
    alert('Edytor równań będzie dostępny wkrótce');
  }
}

// Eksportuj moduł
window.AdvancedMathModule = AdvancedMathModule;

// Dodaj style CSS dla komponentów matematycznych
const mathStyles = `
<style>
.math-input-container {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
}

.math-symbol-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.math-symbol-btn {
  padding: 4px 8px;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.5);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.math-symbol-btn:hover {
  background: rgba(124, 58, 237, 0.4);
  transform: translateY(-1px);
}

.math-input-field {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 16px;
  font-family: 'Courier New', monospace;
}

.math-input-field.invalid {
  border-color: #ef4444;
}

.math-preview {
  margin-top: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  font-size: 18px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.math-preview.invalid {
  color: #ef4444;
}

.math-expression {
  font-family: 'Times New Roman', serif;
  font-size: 1.2em;
}

.math-latex {
  font-size: 1.2em;
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('math-module-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'math-module-styles';
  styleElement.innerHTML = mathStyles;
  document.head.appendChild(styleElement.firstChild);
}