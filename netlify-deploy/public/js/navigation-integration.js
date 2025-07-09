// ===== INTEGRACJA NAWIGACJI I NOWYCH FUNKCJI =====
// Ten plik integruje wszystkie nowe moduły z główną aplikacją

class NavigationIntegration {
  constructor() {
    this.modules = {
      pdfExport: null,
      pushNotifications: null,
      quickReview: null,
      parentPanel: null,
      gamification: null
    };
    this.initialized = false;
  }

  /**
   * Inicjalizuje wszystkie moduły
   */
  async init() {
    try {
      // Inicjalizuj moduły
      this.modules.pdfExport = new PDFExporter();
      this.modules.pushNotifications = new PushNotificationManager();
      this.modules.quickReview = new QuickReviewMode();
      this.modules.parentPanel = new ParentPanel();
      this.modules.gamification = new ExtendedGamificationSystem();

      // Inicjalizuj każdy moduł
      await this.modules.pushNotifications.init();
      this.modules.quickReview.init();
      this.modules.parentPanel.init();
      this.modules.gamification.initializeSystem();

      this.initialized = true;
      console.log('Wszystkie moduły zostały zainicjalizowane');
    } catch (error) {
      console.error('Błąd inicjalizacji modułów:', error);
    }
  }

  /**
   * Dodaje elementy nawigacji do panelu ucznia
   */
  enhanceStudentPanel() {
    // Dodaj przycisk szybkiej powtórki
    const quickReviewButton = `
      <button onclick="navigationIntegration.openQuickReview()" 
              class="glass p-4 rounded-xl hover:bg-purple-600/20 transition-all">
        <i class="fas fa-brain text-4xl text-purple-400 mb-2"></i>
        <p class="text-sm">Szybka Powtórka</p>
      </button>
    `;

    // Dodaj widget gamifikacji
    const gamificationWidget = `
      <div class="glass p-4 rounded-xl">
        <div id="gamification-mini-stats"></div>
      </div>
    `;

    return { quickReviewButton, gamificationWidget };
  }

  /**
   * Dodaje elementy nawigacji do panelu nauczyciela
   */
  enhanceTeacherPanel() {
    // Dodaj przycisk eksportu PDF
    const pdfExportButton = `
      <button onclick="navigationIntegration.openPDFExport()" 
              class="glass p-4 rounded-xl hover:bg-purple-600/20 transition-all">
        <i class="fas fa-file-pdf text-4xl text-red-400 mb-2"></i>
        <p class="text-sm">Eksport PDF</p>
      </button>
    `;

    // Dodaj przycisk ustawień powiadomień
    const notificationsButton = `
      <button onclick="navigationIntegration.openNotificationSettings()" 
              class="glass p-4 rounded-xl hover:bg-purple-600/20 transition-all">
        <i class="fas fa-bell text-4xl text-yellow-400 mb-2"></i>
        <p class="text-sm">Powiadomienia</p>
      </button>
    `;

    return { pdfExportButton, notificationsButton };
  }

  /**
   * Dodaje wsparcie dla roli rodzica
   */
  addParentRoleSupport() {
    // Modyfikuj AuthManager aby obsługiwał role rodzica
    if (window.AuthManager) {
      const originalLogin = window.AuthManager.login;
      window.AuthManager.login = async function(username, password) {
        const result = await originalLogin.call(this, username, password);
        
        // Sprawdź czy to konto rodzica
        if (username.startsWith('rodzic.') || username.includes('.rodzic')) {
          result.role = 'parent';
        }
        
        return result;
      };
    }
  }

  /**
   * Otwiera panel szybkiej powtórki
   */
  openQuickReview() {
    if (!this.modules.quickReview) return;
    
    // Utwórz modal z panelem szybkiej powtórki
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Szybka Powtórka</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        <div id="quick-review-content"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Renderuj panel szybkiej powtórki
    const content = document.getElementById('quick-review-content');
    content.innerHTML = this.modules.quickReview.render();
  }

  /**
   * Otwiera panel eksportu PDF
   */
  openPDFExport() {
    if (!this.modules.pdfExport) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-2xl w-full">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Eksport do PDF</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        <div class="space-y-4">
          <button onclick="navigationIntegration.exportStudentReports()" 
                  class="w-full glass p-4 rounded-xl hover:bg-purple-600/20 transition-all text-left">
            <i class="fas fa-user-graduate text-2xl text-blue-400 mb-2"></i>
            <h3 class="font-semibold">Raporty uczniów</h3>
            <p class="text-sm text-gray-400">Eksportuj szczegółowe raporty dla wybranych uczniów</p>
          </button>
          
          <button onclick="navigationIntegration.exportClassReport()" 
                  class="w-full glass p-4 rounded-xl hover:bg-purple-600/20 transition-all text-left">
            <i class="fas fa-users text-2xl text-green-400 mb-2"></i>
            <h3 class="font-semibold">Raport klasowy</h3>
            <p class="text-sm text-gray-400">Eksportuj zbiorczy raport dla całej klasy</p>
          </button>
          
          <button onclick="navigationIntegration.exportCertificates()" 
                  class="w-full glass p-4 rounded-xl hover:bg-purple-600/20 transition-all text-left">
            <i class="fas fa-certificate text-2xl text-yellow-400 mb-2"></i>
            <h3 class="font-semibold">Certyfikaty</h3>
            <p class="text-sm text-gray-400">Generuj certyfikaty ukończenia dla uczniów</p>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Otwiera ustawienia powiadomień
   */
  openNotificationSettings() {
    if (!this.modules.pushNotifications) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-2xl w-full">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Ustawienia powiadomień</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        <div id="notification-settings-content">
          ${this.modules.pushNotifications.createSettingsComponent()}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Dodaj event listenery
    this.setupNotificationSettingsListeners();
  }

  /**
   * Eksportuje raporty uczniów
   */
  async exportStudentReports() {
    try {
      const students = JSON.parse(localStorage.getItem('users') || '[]')
        .filter(u => u.role === 'student');
      
      if (students.length === 0) {
        alert('Brak uczniów do eksportu');
        return;
      }

      // Wybierz uczniów do eksportu
      const selected = await this.selectStudentsDialog(students);
      if (!selected || selected.length === 0) return;

      // Eksportuj raporty
      for (const studentId of selected) {
        await this.modules.pdfExport.generateStudentReport(studentId);
      }

      alert(`Wyeksportowano ${selected.length} raportów`);
    } catch (error) {
      console.error('Błąd eksportu:', error);
      alert('Wystąpił błąd podczas eksportu');
    }
  }

  /**
   * Dialog wyboru uczniów
   */
  async selectStudentsDialog(students) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="glass-dark p-8 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
          <h3 class="text-xl font-bold mb-4">Wybierz uczniów</h3>
          <div class="space-y-2 mb-4">
            ${students.map(s => `
              <label class="flex items-center p-2 hover:bg-white/5 rounded">
                <input type="checkbox" value="${s.userId || s.id}" class="mr-3">
                <span>${s.fullName || s.username}</span>
              </label>
            `).join('')}
          </div>
          <div class="flex gap-4">
            <button onclick="navigationIntegration.confirmStudentSelection(this)" 
                    class="btn-primary">Eksportuj wybrane</button>
            <button onclick="this.closest('.fixed').remove()" 
                    class="btn-secondary">Anuluj</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Zapisz resolve callback
      window._studentSelectionResolve = resolve;
    });
  }

  /**
   * Potwierdza wybór uczniów
   */
  confirmStudentSelection(button) {
    const modal = button.closest('.fixed');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    modal.remove();
    
    if (window._studentSelectionResolve) {
      window._studentSelectionResolve(selected);
      delete window._studentSelectionResolve;
    }
  }

  /**
   * Eksportuje raport klasowy
   */
  async exportClassReport() {
    try {
      await this.modules.pdfExport.generateClassReport();
      alert('Raport klasowy został wygenerowany');
    } catch (error) {
      console.error('Błąd eksportu:', error);
      alert('Wystąpił błąd podczas eksportu');
    }
  }

  /**
   * Eksportuje certyfikaty
   */
  async exportCertificates() {
    try {
      // Pobierz uczniów z wynikami powyżej 80%
      const results = JSON.parse(localStorage.getItem('examResults') || '[]');
      const highScorers = results
        .filter(r => (r.correctAnswers / r.totalQuestions) >= 0.8)
        .map(r => r.studentId)
        .filter((id, index, self) => self.indexOf(id) === index);

      if (highScorers.length === 0) {
        alert('Brak uczniów spełniających kryteria certyfikatu (wynik >= 80%)');
        return;
      }

      for (const studentId of highScorers) {
        await this.modules.pdfExport.generateCertificate(studentId);
      }

      alert(`Wygenerowano ${highScorers.length} certyfikatów`);
    } catch (error) {
      console.error('Błąd generowania certyfikatów:', error);
      alert('Wystąpił błąd podczas generowania certyfikatów');
    }
  }

  /**
   * Konfiguruje listenery dla ustawień powiadomień
   */
  setupNotificationSettingsListeners() {
    const enabledCheckbox = document.getElementById('notifications-enabled');
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', (e) => {
        const settings = this.modules.pushNotifications.loadSettings();
        settings.enabled = e.target.checked;
        this.modules.pushNotifications.saveSettings(settings);
        
        if (e.target.checked) {
          this.modules.pushNotifications.requestPermission();
        } else {
          this.modules.pushNotifications.unsubscribe();
        }
      });
    }

    // Inne checkboxy
    const checkboxes = [
      'notify-day-before', 'notify-hour-before', 
      'notify-results', 'notify-achievements', 'notify-sound'
    ];

    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.updateNotificationSettings();
        });
      }
    });

    // Time picker
    const timeInput = document.getElementById('day-before-time');
    if (timeInput) {
      timeInput.addEventListener('change', () => {
        this.updateNotificationSettings();
      });
    }
  }

  /**
   * Aktualizuje ustawienia powiadomień
   */
  updateNotificationSettings() {
    const settings = {
      enabled: document.getElementById('notifications-enabled')?.checked || false,
      dayBefore: document.getElementById('notify-day-before')?.checked || false,
      hourBefore: document.getElementById('notify-hour-before')?.checked || false,
      results: document.getElementById('notify-results')?.checked || false,
      achievements: document.getElementById('notify-achievements')?.checked || false,
      soundEnabled: document.getElementById('notify-sound')?.checked || false
    };

    const timeValue = document.getElementById('day-before-time')?.value;
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      settings.dayBeforeTime = { hours, minutes };
    }

    this.modules.pushNotifications.saveSettings(settings);
  }

  /**
   * Renderuje mini statystyki gamifikacji
   */
  renderGamificationMiniStats() {
    if (!this.modules.gamification) return '';
    
    const playerData = this.modules.gamification.playerData;
    const levelInfo = this.modules.gamification.calculateLevel(playerData.totalXP);
    
    return `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
            <span class="text-xl font-bold">${levelInfo.level}</span>
          </div>
          <div>
            <div class="text-sm text-gray-400">Poziom ${levelInfo.level}</div>
            <div class="text-xs text-gray-500">${playerData.totalXP} XP</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm text-yellow-400">
            <i class="fas fa-trophy"></i> ${playerData.achievements?.length || 0}
          </div>
          <div class="text-xs text-gray-500">Osiągnięcia</div>
        </div>
      </div>
      <div class="mt-3">
        <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-purple-600" style="width: ${levelInfo.progress}%"></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          ${levelInfo.currentXP} / ${levelInfo.requiredXP} XP do następnego poziomu
        </div>
      </div>
    `;
  }

  /**
   * Integruje gamifikację z wynikami egzaminów
   */
  integrateGamificationWithExams() {
    // Nasłuchuj na zakończenie egzaminu
    const originalFinishExam = window.finishExam;
    if (originalFinishExam) {
      window.finishExam = (results) => {
        // Wywołaj oryginalną funkcję
        const examResults = originalFinishExam(results);
        
        // Przyznaj XP za ukończenie egzaminu
        if (this.modules.gamification) {
          const score = (results.correctAnswers / results.totalQuestions) * 100;
          let xp = 50; // Bazowe XP za ukończenie
          
          if (score >= 90) xp += 100; // Bonus za wynik 90%+
          else if (score >= 80) xp += 50; // Bonus za wynik 80%+
          else if (score >= 70) xp += 25; // Bonus za wynik 70%+
          
          this.modules.gamification.awardXP(xp, 'exam_completed');
          
          // Sprawdź osiągnięcia
          if (score === 100) {
            this.modules.gamification.unlockAchievement('perfect_score');
          }
          
          // Powiadom rodzica
          if (this.modules.parentPanel) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            this.modules.pushNotifications?.notifyParent({
              type: 'exam_completed',
              examTitle: results.examTitle,
              score: Math.round(score)
            }, currentUser);
          }
        }
        
        return examResults;
      };
    }
  }
}

// Utwórz globalną instancję
window.navigationIntegration = new NavigationIntegration();

// Inicjalizuj po załadowaniu DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.navigationIntegration.init();
    window.navigationIntegration.addParentRoleSupport();
    window.navigationIntegration.integrateGamificationWithExams();
  });
} else {
  window.navigationIntegration.init();
  window.navigationIntegration.addParentRoleSupport();
  window.navigationIntegration.integrateGamificationWithExams();
}