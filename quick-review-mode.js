// ===== MODUŁ SZYBKIEJ POWTÓRKI =====
// Tryb szybkiego przeglądania błędnych odpowiedzi i flashcards

class QuickReviewMode {
  constructor() {
    this.currentSession = null;
    this.reviewQueue = [];
    this.currentCardIndex = 0;
    this.stats = {
      reviewed: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0
    };
    this.settings = this.loadSettings();
    this.spacedRepetition = new SpacedRepetitionEngine();
  }

  /**
   * Inicjalizuje tryb szybkiej powtórki
   */
  init() {
    this.loadReviewQueue();
    this.setupKeyboardShortcuts();
    this.initializeUI();
  }

  /**
   * Ładuje zadania do powtórki
   */
  loadReviewQueue() {
    const sources = {
      mistakes: this.getMistakes(),
      flagged: this.getFlaggedQuestions(),
      scheduled: this.getScheduledReviews(),
      weak: this.getWeakTopics()
    };

    // Priorytetyzuj według ustawień
    this.reviewQueue = this.prioritizeQuestions(sources);
  }

  /**
   * Pobiera błędne odpowiedzi
   */
  getMistakes() {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    const mistakes = [];

    results.forEach(result => {
      if (result.answers) {
        result.answers.forEach((answer, index) => {
          if (!answer.correct && answer.questionId) {
            const question = this.getQuestionById(answer.questionId);
            if (question) {
              mistakes.push({
                ...question,
                lastAttempt: result.completedAt,
                userAnswer: answer.userAnswer,
                correctAnswer: answer.correctAnswer,
                priority: 'high',
                source: 'mistake'
              });
            }
          }
        });
      }
    });

    return mistakes;
  }

  /**
   * Pobiera oznaczone pytania
   */
  getFlaggedQuestions() {
    const flagged = JSON.parse(localStorage.getItem('flaggedQuestions') || '[]');
    return flagged.map(id => {
      const question = this.getQuestionById(id);
      return question ? { ...question, priority: 'medium', source: 'flagged' } : null;
    }).filter(Boolean);
  }

  /**
   * Pobiera zaplanowane powtórki (spaced repetition)
   */
  getScheduledReviews() {
    return this.spacedRepetition.getDueReviews();
  }

  /**
   * Pobiera słabe tematy
   */
  getWeakTopics() {
    const stats = JSON.parse(localStorage.getItem('topicStats') || '{}');
    const weakTopics = [];

    Object.entries(stats).forEach(([topic, data]) => {
      if (data.accuracy < 0.6) { // Poniżej 60% poprawności
        const questions = this.getQuestionsByTopic(topic);
        questions.forEach(q => {
          weakTopics.push({
            ...q,
            priority: 'medium',
            source: 'weak-topic',
            topicAccuracy: data.accuracy
          });
        });
      }
    });

    return weakTopics;
  }

  /**
   * Priorytetyzuje pytania
   */
  prioritizeQuestions(sources) {
    const { mistakes, flagged, scheduled, weak } = sources;
    let queue = [];

    if (this.settings.includeMistakes) {
      queue = queue.concat(mistakes);
    }
    if (this.settings.includeFlagged) {
      queue = queue.concat(flagged);
    }
    if (this.settings.includeScheduled) {
      queue = queue.concat(scheduled);
    }
    if (this.settings.includeWeak) {
      queue = queue.concat(weak);
    }

    // Usuń duplikaty
    const seen = new Set();
    queue = queue.filter(q => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    // Sortuj według priorytetu i daty
    queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Jeśli ten sam priorytet, sortuj po dacie ostatniej próby
      return new Date(a.lastAttempt || 0) - new Date(b.lastAttempt || 0);
    });

    // Ogranicz do maksymalnej liczby
    if (this.settings.maxCards > 0) {
      queue = queue.slice(0, this.settings.maxCards);
    }

    return queue;
  }

  /**
   * Rozpoczyna sesję powtórki
   */
  startSession(options = {}) {
    this.currentSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      mode: options.mode || 'normal', // normal, speed, exam
      timeLimit: options.timeLimit || null,
      cards: options.cards || this.reviewQueue,
      results: []
    };

    this.currentCardIndex = 0;
    this.stats = {
      reviewed: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0
    };

    if (options.shuffle) {
      this.shuffleCards();
    }

    this.showReviewInterface();
    this.showCurrentCard();
  }

  /**
   * Pokazuje interfejs powtórki
   */
  showReviewInterface() {
    const container = document.getElementById('quick-review-container') || this.createContainer();
    
    container.innerHTML = `
      <div class="quick-review-wrapper">
        <div class="review-header">
          <div class="review-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">0 / ${this.currentSession.cards.length}</span>
          </div>
          
          <div class="review-timer" ${this.currentSession.timeLimit ? '' : 'style="display:none"'}>
            <i class="fas fa-clock"></i>
            <span class="timer-text">00:00</span>
          </div>
          
          <button class="close-review" onclick="quickReview.endSession()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="review-card-container">
          <div class="review-card" id="review-card">
            <!-- Karta będzie tutaj -->
          </div>
        </div>

        <div class="review-controls">
          <button class="review-btn skip" onclick="quickReview.skipCard()">
            <i class="fas fa-forward"></i>
            Pomiń
          </button>
          
          <div class="answer-buttons" id="answer-buttons">
            <!-- Przyciski odpowiedzi -->
          </div>
          
          <button class="review-btn hint" onclick="quickReview.showHint()">
            <i class="fas fa-lightbulb"></i>
            Podpowiedź
          </button>
        </div>

        <div class="review-stats">
          <div class="stat-item correct">
            <i class="fas fa-check-circle"></i>
            <span id="correct-count">0</span>
          </div>
          <div class="stat-item incorrect">
            <i class="fas fa-times-circle"></i>
            <span id="incorrect-count">0</span>
          </div>
          <div class="stat-item skipped">
            <i class="fas fa-forward"></i>
            <span id="skipped-count">0</span>
          </div>
        </div>
      </div>
    `;

    // Uruchom timer jeśli potrzebny
    if (this.currentSession.timeLimit) {
      this.startTimer();
    }
  }

  /**
   * Pokazuje aktualną kartę
   */
  showCurrentCard() {
    if (this.currentCardIndex >= this.currentSession.cards.length) {
      this.endSession();
      return;
    }

    const card = this.currentSession.cards[this.currentCardIndex];
    const cardElement = document.getElementById('review-card');
    
    // Animacja przejścia
    cardElement.classList.add('card-exit');
    
    setTimeout(() => {
      cardElement.innerHTML = this.renderCard(card);
      cardElement.classList.remove('card-exit');
      cardElement.classList.add('card-enter');
      
      // Renderuj przyciski odpowiedzi
      this.renderAnswerButtons(card);
      
      // Aktualizuj progress
      this.updateProgress();
      
      // Zapisz czas rozpoczęcia
      this.currentCardStartTime = Date.now();
      
      setTimeout(() => {
        cardElement.classList.remove('card-enter');
      }, 300);
    }, 300);
  }

  /**
   * Renderuje kartę
   */
  renderCard(card) {
    const sourceLabels = {
      mistake: '❌ Błędna odpowiedź',
      flagged: '🚩 Oznaczone',
      scheduled: '📅 Zaplanowana powtórka',
      'weak-topic': '📊 Słaby temat'
    };

    return `
      <div class="card-header">
        <span class="card-source ${card.source}">
          ${sourceLabels[card.source] || card.source}
        </span>
        <span class="card-subject">${card.przedmiot} • ${card.temat}</span>
      </div>
      
      <div class="card-content">
        <div class="question-text">${card.tresc}</div>
        
        ${card.obrazek ? `
          <div class="question-image">
            <img src="${card.obrazek}" alt="Diagram">
          </div>
        ` : ''}
        
        ${card.lastAttempt && card.userAnswer ? `
          <div class="previous-attempt">
            <i class="fas fa-history"></i>
            Ostatnia odpowiedź: <span class="wrong">${card.userAnswer}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="card-footer">
        <span class="difficulty ${card.poziom}">
          ${this.getDifficultyIcon(card.poziom)} ${card.poziom}
        </span>
        <span class="points">${card.punkty} pkt</span>
      </div>
    `;
  }

  /**
   * Renderuje przyciski odpowiedzi
   */
  renderAnswerButtons(card) {
    const container = document.getElementById('answer-buttons');
    
    if (card.typ === 'zamkniete' && card.odpowiedzi) {
      // Pytanie zamknięte - pokaż opcje
      container.innerHTML = card.odpowiedzi.map((odp, index) => `
        <button class="answer-option" onclick="quickReview.selectAnswer('${odp.replace(/'/g, "\\'")}')">
          ${String.fromCharCode(65 + index)}) ${odp}
        </button>
      `).join('');
    } else {
      // Pytanie otwarte - pokaż pole tekstowe
      container.innerHTML = `
        <div class="open-answer-container">
          <input type="text" 
                 id="open-answer-input" 
                 class="open-answer-input" 
                 placeholder="Wpisz odpowiedź..."
                 onkeypress="if(event.key==='Enter') quickReview.submitOpenAnswer()">
          <button class="submit-answer" onclick="quickReview.submitOpenAnswer()">
            <i class="fas fa-check"></i>
          </button>
        </div>
      `;
      
      // Focus na pole tekstowe
      setTimeout(() => {
        document.getElementById('open-answer-input')?.focus();
      }, 100);
    }
  }

  /**
   * Obsługuje wybór odpowiedzi
   */
  selectAnswer(answer) {
    const card = this.currentSession.cards[this.currentCardIndex];
    const isCorrect = answer === card.poprawna;
    const timeSpent = Date.now() - this.currentCardStartTime;

    // Zapisz wynik
    this.currentSession.results.push({
      questionId: card.id,
      userAnswer: answer,
      correctAnswer: card.poprawna,
      isCorrect,
      timeSpent,
      timestamp: new Date()
    });

    // Aktualizuj statystyki
    if (isCorrect) {
      this.stats.correct++;
      this.showFeedback('correct', 'Brawo! Poprawna odpowiedź');
    } else {
      this.stats.incorrect++;
      this.showFeedback('incorrect', `Błąd. Poprawna odpowiedź: ${card.poprawna}`);
    }
    this.stats.reviewed++;

    // Aktualizuj spaced repetition
    this.spacedRepetition.recordReview(card.id, isCorrect);

    // Przejdź do następnej karty
    setTimeout(() => {
      this.nextCard();
    }, this.settings.feedbackDuration);
  }

  /**
   * Obsługuje pytania otwarte
   */
  submitOpenAnswer() {
    const input = document.getElementById('open-answer-input');
    if (!input) return;
    
    const answer = input.value.trim();
    if (!answer) return;
    
    const card = this.currentSession.cards[this.currentCardIndex];
    const isCorrect = this.checkOpenAnswer(answer, card);
    
    this.selectAnswer(answer);
  }

  /**
   * Sprawdza odpowiedź otwartą
   */
  checkOpenAnswer(userAnswer, card) {
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, '').replace(/[.,]/g, '');
    
    // Sprawdź główną odpowiedź
    if (normalize(userAnswer) === normalize(card.poprawna)) {
      return true;
    }
    
    // Sprawdź alternatywne formy
    if (card.akceptowane_formy) {
      return card.akceptowane_formy.some(form => 
        normalize(userAnswer) === normalize(form)
      );
    }
    
    // Dla odpowiedzi matematycznych - sprawdź wartość numeryczną
    if (!isNaN(userAnswer) && !isNaN(card.poprawna)) {
      return Math.abs(parseFloat(userAnswer) - parseFloat(card.poprawna)) < 0.001;
    }
    
    return false;
  }

  /**
   * Pokazuje podpowiedź
   */
  showHint() {
    const card = this.currentSession.cards[this.currentCardIndex];
    
    if (card.wskazowka) {
      this.showFeedback('hint', card.wskazowka);
    } else if (card.typ === 'zamkniete') {
      // Eliminuj 2 błędne odpowiedzi
      const incorrect = card.odpowiedzi.filter(odp => odp !== card.poprawna);
      const toEliminate = incorrect.slice(0, 2);
      
      document.querySelectorAll('.answer-option').forEach(btn => {
        if (toEliminate.includes(btn.textContent.substring(3))) {
          btn.classList.add('eliminated');
          btn.disabled = true;
        }
      });
      
      this.showFeedback('hint', 'Wyeliminowano 2 błędne odpowiedzi');
    } else {
      // Pokaż pierwszą literę
      const firstLetter = card.poprawna.charAt(0);
      this.showFeedback('hint', `Odpowiedź zaczyna się na: ${firstLetter}...`);
    }
  }

  /**
   * Pomija kartę
   */
  skipCard() {
    this.stats.skipped++;
    this.stats.reviewed++;
    
    const card = this.currentSession.cards[this.currentCardIndex];
    this.currentSession.results.push({
      questionId: card.id,
      skipped: true,
      timestamp: new Date()
    });
    
    this.showFeedback('skipped', 'Pominięto');
    setTimeout(() => {
      this.nextCard();
    }, 500);
  }

  /**
   * Przechodzi do następnej karty
   */
  nextCard() {
    this.currentCardIndex++;
    this.updateStats();
    this.showCurrentCard();
  }

  /**
   * Pokazuje feedback
   */
  showFeedback(type, message) {
    const feedback = document.createElement('div');
    feedback.className = `review-feedback ${type}`;
    feedback.innerHTML = `
      <i class="fas fa-${this.getFeedbackIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    document.querySelector('.review-card-container').appendChild(feedback);
    
    setTimeout(() => {
      feedback.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      feedback.remove();
    }, this.settings.feedbackDuration);
  }

  /**
   * Aktualizuje progress
   */
  updateProgress() {
    const progress = ((this.currentCardIndex + 1) / this.currentSession.cards.length) * 100;
    document.querySelector('.progress-fill').style.width = `${progress}%`;
    document.querySelector('.progress-text').textContent = 
      `${this.currentCardIndex + 1} / ${this.currentSession.cards.length}`;
  }

  /**
   * Aktualizuje statystyki
   */
  updateStats() {
    document.getElementById('correct-count').textContent = this.stats.correct;
    document.getElementById('incorrect-count').textContent = this.stats.incorrect;
    document.getElementById('skipped-count').textContent = this.stats.skipped;
  }

  /**
   * Kończy sesję
   */
  endSession() {
    if (!this.currentSession) return;
    
    this.currentSession.endTime = new Date();
    this.currentSession.stats = { ...this.stats };
    
    // Zapisz sesję
    this.saveSession();
    
    // Pokaż podsumowanie
    this.showSummary();
  }

  /**
   * Pokazuje podsumowanie
   */
  showSummary() {
    const duration = (this.currentSession.endTime - this.currentSession.startTime) / 1000;
    const accuracy = this.stats.reviewed > 0 
      ? (this.stats.correct / this.stats.reviewed * 100).toFixed(1)
      : 0;
    
    const container = document.getElementById('quick-review-container');
    container.innerHTML = `
      <div class="review-summary">
        <h2>Podsumowanie powtórki</h2>
        
        <div class="summary-stats">
          <div class="summary-stat">
            <i class="fas fa-clock"></i>
            <div class="stat-value">${this.formatTime(duration)}</div>
            <div class="stat-label">Czas trwania</div>
          </div>
          
          <div class="summary-stat">
            <i class="fas fa-percentage"></i>
            <div class="stat-value">${accuracy}%</div>
            <div class="stat-label">Skuteczność</div>
          </div>
          
          <div class="summary-stat">
            <i class="fas fa-redo"></i>
            <div class="stat-value">${this.stats.reviewed}</div>
            <div class="stat-label">Przeglądnięte</div>
          </div>
        </div>
        
        <div class="summary-breakdown">
          <div class="breakdown-item correct">
            <span>Poprawne odpowiedzi</span>
            <span>${this.stats.correct}</span>
          </div>
          <div class="breakdown-item incorrect">
            <span>Błędne odpowiedzi</span>
            <span>${this.stats.incorrect}</span>
          </div>
          <div class="breakdown-item skipped">
            <span>Pominięte</span>
            <span>${this.stats.skipped}</span>
          </div>
        </div>
        
        <div class="summary-actions">
          <button class="btn-secondary" onclick="quickReview.reviewMistakes()">
            <i class="fas fa-redo"></i>
            Powtórz błędne
          </button>
          <button class="btn-primary" onclick="quickReview.closeReview()">
            <i class="fas fa-check"></i>
            Zakończ
          </button>
        </div>
        
        ${this.generateRecommendations()}
      </div>
    `;
  }

  /**
   * Generuje rekomendacje
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.incorrect > this.stats.correct) {
      recommendations.push({
        icon: 'book',
        text: 'Zalecamy przejrzenie materiałów z tych tematów'
      });
    }
    
    if (this.stats.skipped > 3) {
      recommendations.push({
        icon: 'lightbulb',
        text: 'Spróbuj użyć podpowiedzi zamiast pomijać pytania'
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        icon: 'trophy',
        text: 'Świetna robota! Kontynuuj regularne powtórki'
      });
    }
    
    return `
      <div class="recommendations">
        <h3>Rekomendacje</h3>
        ${recommendations.map(rec => `
          <div class="recommendation-item">
            <i class="fas fa-${rec.icon}"></i>
            <span>${rec.text}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Konfiguruje skróty klawiszowe
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.currentSession) return;
      
      // Cyfry 1-4 dla odpowiedzi ABCD
      if (e.key >= '1' && e.key <= '4') {
        const buttons = document.querySelectorAll('.answer-option');
        const index = parseInt(e.key) - 1;
        if (buttons[index]) {
          buttons[index].click();
        }
      }
      
      // Spacja dla następnej karty
      if (e.key === ' ' && this.currentCardIndex < this.currentSession.cards.length) {
        e.preventDefault();
        this.skipCard();
      }
      
      // H dla podpowiedzi
      if (e.key === 'h' || e.key === 'H') {
        this.showHint();
      }
      
      // ESC dla zakończenia
      if (e.key === 'Escape') {
        this.endSession();
      }
    });
  }

  /**
   * Pomocnicze metody
   */
  loadSettings() {
    const defaults = {
      includeMistakes: true,
      includeFlagged: true,
      includeScheduled: true,
      includeWeak: true,
      maxCards: 20,
      feedbackDuration: 2000,
      autoAdvance: true,
      showTimer: true,
      enableSounds: true,
      difficulty: 'adaptive' // adaptive, easy, medium, hard
    };
    
    const saved = localStorage.getItem('quickReviewSettings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  saveSettings(settings) {
    this.settings = settings;
    localStorage.setItem('quickReviewSettings', JSON.stringify(settings));
  }

  saveSession() {
    const sessions = JSON.parse(localStorage.getItem('reviewSessions') || '[]');
    sessions.push(this.currentSession);
    
    // Zachowaj tylko ostatnie 50 sesji
    if (sessions.length > 50) {
      sessions.shift();
    }
    
    localStorage.setItem('reviewSessions', JSON.stringify(sessions));
  }

  getQuestionById(id) {
    const questions = window.zadania || [];
    return questions.find(q => q.id === id);
  }

  getQuestionsByTopic(topic) {
    const questions = window.zadania || [];
    return questions.filter(q => q.temat === topic);
  }

  shuffleCards() {
    for (let i = this.currentSession.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.currentSession.cards[i], this.currentSession.cards[j]] = 
      [this.currentSession.cards[j], this.currentSession.cards[i]];
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getDifficultyIcon(level) {
    const icons = {
      latwy: '🟢',
      sredni: '🟡',
      trudny: '🔴'
    };
    return icons[level] || '⚪';
  }

  getFeedbackIcon(type) {
    const icons = {
      correct: 'check-circle',
      incorrect: 'times-circle',
      skipped: 'forward',
      hint: 'lightbulb'
    };
    return icons[type] || 'info-circle';
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'quick-review-container';
    container.className = 'quick-review-container';
    document.body.appendChild(container);
    return container;
  }

  closeReview() {
    const container = document.getElementById('quick-review-container');
    if (container) {
      container.remove();
    }
    this.currentSession = null;
  }

  reviewMistakes() {
    const mistakes = this.currentSession.results
      .filter(r => !r.isCorrect && !r.skipped)
      .map(r => this.getQuestionById(r.questionId))
      .filter(Boolean);
    
    if (mistakes.length > 0) {
      this.startSession({
        cards: mistakes,
        shuffle: true
      });
    }
  }

  startTimer() {
    const startTime = Date.now();
    const timeLimit = this.currentSession.timeLimit * 1000;
    
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      
      document.querySelector('.timer-text').textContent = 
        this.formatTime(remaining / 1000);
      
      if (remaining === 0) {
        clearInterval(this.timerInterval);
        this.endSession();
      }
    }, 100);
  }
}

/**
 * Silnik powtórek rozłożonych w czasie
 */
class SpacedRepetitionEngine {
  constructor() {
    this.intervals = [1, 3, 7, 14, 30, 90]; // dni
    this.reviews = this.loadReviews();
  }

  recordReview(questionId, isCorrect) {
    if (!this.reviews[questionId]) {
      this.reviews[questionId] = {
        level: 0,
        lastReview: null,
        nextReview: null,
        correctStreak: 0,
        totalReviews: 0
      };
    }

    const review = this.reviews[questionId];
    review.lastReview = new Date();
    review.totalReviews++;

    if (isCorrect) {
      review.correctStreak++;
      if (review.correctStreak >= 2) {
        review.level = Math.min(review.level + 1, this.intervals.length - 1);
        review.correctStreak = 0;
      }
    } else {
      review.level = Math.max(0, review.level - 1);
      review.correctStreak = 0;
    }

    // Zaplanuj następną powtórkę
    const daysUntilNext = this.intervals[review.level];
    review.nextReview = new Date();
    review.nextReview.setDate(review.nextReview.getDate() + daysUntilNext);

    this.saveReviews();
  }

  getDueReviews() {
    const now = new Date();
    const due = [];

    Object.entries(this.reviews).forEach(([questionId, review]) => {
      if (review.nextReview && new Date(review.nextReview) <= now) {
        const question = window.zadania?.find(q => q.id === questionId);
        if (question) {
          due.push({
            ...question,
            priority: 'high',
            source: 'scheduled',
            daysOverdue: Math.floor((now - new Date(review.nextReview)) / (1000 * 60 * 60 * 24))
          });
        }
      }
    });

    return due;
  }

  loadReviews() {
    const saved = localStorage.getItem('spacedRepetitionData');
    return saved ? JSON.parse(saved) : {};
  }

  saveReviews() {
    localStorage.setItem('spacedRepetitionData', JSON.stringify(this.reviews));
  }

  /**
   * Otwiera tryb szybkiej powtórki
   */
  openQuickReview() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">
            <i class="fas fa-brain text-purple-400 mr-2"></i>
            Szybka Powtórka
          </h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div id="quick-review-content">
          ${this.render()}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return true;
  }
}

// Eksportuj moduły
window.QuickReviewMode = QuickReviewMode;
window.SpacedRepetitionEngine = SpacedRepetitionEngine;

// Style CSS
const quickReviewStyles = `
<style>
.quick-review-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.quick-review-wrapper {
  width: 90%;
  max-width: 800px;
  height: 90%;
  max-height: 600px;
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.review-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transition: width 0.3s ease;
}

.progress-text {
  color: var(--text-secondary);
  font-size: 14px;
  min-width: 60px;
}

.review-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 16px;
}

.close-review {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.close-review:hover {
  background: var(--accent-primary);
  color: white;
}

.review-card-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.review-card {
  height: 100%;
  background: var(--bg-tertiary);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.review-card.card-exit {
  transform: translateX(-100%);
  opacity: 0;
}

.review-card.card-enter {
  transform: translateX(100%);
  opacity: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-source {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.card-source.mistake {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.card-source.flagged {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.card-source.scheduled {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.card-source.weak-topic {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
}

.card-subject {
  color: var(--text-secondary);
  font-size: 14px;
}

.card-content {
  flex: 1;
  overflow-y: auto;
}

.question-text {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.question-image {
  text-align: center;
  margin: 20px 0;
}

.question-image img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
}

.previous-attempt {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.previous-attempt .wrong {
  color: #ef4444;
  font-weight: 500;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.difficulty {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.difficulty.latwy {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.difficulty.sredni {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.difficulty.trudny {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.points {
  color: var(--text-secondary);
  font-size: 14px;
}

.review-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.review-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-btn.skip {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.review-btn.hint {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.review-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

#answer-buttons {
  flex: 1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.answer-option {
  flex: 1;
  min-width: 150px;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.answer-option:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.answer-option.eliminated {
  opacity: 0.3;
  text-decoration: line-through;
  cursor: not-allowed;
}

.open-answer-container {
  flex: 1;
  display: flex;
  gap: 8px;
  max-width: 400px;
}

.open-answer-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.open-answer-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.submit-answer {
  padding: 12px 20px;
  border: none;
  background: var(--accent-primary);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-answer:hover {
  background: var(--accent-secondary);
  transform: translateY(-2px);
}

.review-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
}

.stat-item.correct {
  color: #22c55e;
}

.stat-item.incorrect {
  color: #ef4444;
}

.stat-item.skipped {
  color: #fbbf24;
}

.review-feedback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px 32px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 100;
}

.review-feedback.show {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.review-feedback.correct {
  background: rgba(34, 197, 94, 0.9);
}

.review-feedback.incorrect {
  background: rgba(239, 68, 68, 0.9);
}

.review-feedback.hint {
  background: rgba(251, 191, 36, 0.9);
}

.review-feedback.skipped {
  background: rgba(100, 116, 139, 0.9);
}

/* Summary styles */
.review-summary {
  text-align: center;
  padding: 40px;
}

.review-summary h2 {
  margin-bottom: 32px;
  color: var(--text-primary);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 40px;
}

.summary-stat {
  background: var(--bg-tertiary);
  padding: 24px;
  border-radius: 12px;
}

.summary-stat i {
  font-size: 32px;
  color: var(--accent-primary);
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.summary-breakdown {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-item.correct {
  color: #22c55e;
}

.breakdown-item.incorrect {
  color: #ef4444;
}

.breakdown-item.skipped {
  color: #fbbf24;
}

.summary-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.recommendations {
  margin-top: 32px;
  text-align: left;
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 20px;
}

.recommendations h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  color: var(--text-secondary);
}

.recommendation-item i {
  color: var(--accent-primary);
}

/* Mobile styles */
@media (max-width: 768px) {
  .quick-review-wrapper {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
    padding: 16px;
  }
  
  .question-text {
    font-size: 16px;
  }
  
  .answer-option {
    min-width: 100%;
  }
  
  .review-stats {
    gap: 16px;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .summary-actions {
    flex-direction: column;
  }
  
  .summary-actions button {
    width: 100%;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('quick-review-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'quick-review-styles';
  styleElement.innerHTML = quickReviewStyles;
  document.head.appendChild(styleElement.firstChild);
}