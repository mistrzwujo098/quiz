// ===== MODUŁ PANELU RODZICA =====
// Panel dla rodziców do monitorowania postępów dziecka

class ParentPanel {
  constructor() {
    this.currentParent = null;
    this.linkedChildren = [];
    this.settings = this.loadSettings();
    this.notificationManager = null;
  }

  /**
   * Inicjalizuje panel rodzica
   */
  init() {
    this.loadParentData();
    // Powiadomienia będą dodane później
    // this.setupNotifications();
    this.checkPendingReports();
  }

  /**
   * Łączy konto dziecka z kontem rodzica
   */
  linkChildAccount(code) {
    if (!code || !this.currentParent) return false;
    
    // Pobierz listę kodów
    const linkCodes = JSON.parse(localStorage.getItem('parentLinkCodes') || '[]');
    const linkData = linkCodes.find(l => l.code === code);
    
    if (!linkData) return false;
    
    // Sprawdź czy kod nie wygasł
    if (new Date(linkData.expiresAt) < new Date()) {
      alert('Kod wygasł. Poproś dziecko o wygenerowanie nowego kodu.');
      return false;
    }
    
    // Utwórz połączenie
    const links = JSON.parse(localStorage.getItem('parentChildLinks') || '[]');
    
    // Sprawdź czy nie istnieje już takie połączenie
    const existingLink = links.find(l => 
      l.parentId === this.currentParent.userId && 
      l.childId === linkData.childId
    );
    
    if (existingLink) {
      alert('To konto jest już połączone.');
      return false;
    }
    
    // Dodaj nowe połączenie
    links.push({
      parentId: this.currentParent.userId,
      childId: linkData.childId,
      linkedAt: new Date().toISOString()
    });
    
    localStorage.setItem('parentChildLinks', JSON.stringify(links));
    
    // Usuń wykorzystany kod
    const remainingCodes = linkCodes.filter(l => l.code !== code);
    localStorage.setItem('parentLinkCodes', JSON.stringify(remainingCodes));
    
    return true;
  }

  /**
   * Ładuje dane rodzica
   */
  loadParentData() {
    const parentData = JSON.parse(localStorage.getItem('currentParent') || 'null');
    if (parentData) {
      this.currentParent = parentData;
      this.linkedChildren = this.getLinkedChildren();
    }
  }

  /**
   * Pobiera połączone konta dzieci
   */
  getLinkedChildren() {
    const links = JSON.parse(localStorage.getItem('parentChildLinks') || '[]');
    return links
      .filter(link => link.parentId === this.currentParent?.userId)
      .map(link => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.find(u => u.userId === link.childId);
      })
      .filter(Boolean);
  }

  /**
   * Renderuje główny panel
   */
  renderDashboard() {
    if (!this.currentParent) {
      return this.renderLoginPrompt();
    }

    return `
      <div class="parent-dashboard">
        <div class="dashboard-header">
          <h1>Panel Rodzica</h1>
          <div class="parent-info">
            <i class="fas fa-user-circle"></i>
            <span>${this.currentParent.fullName || this.currentParent.username}</span>
            <button class="btn-icon" onclick="parentPanel.showSettings()">
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>

        <div class="children-tabs">
          ${this.linkedChildren.map((child, index) => `
            <button class="child-tab ${index === 0 ? 'active' : ''}" 
                    onclick="parentPanel.selectChild('${child.userId}')">
              <i class="fas fa-child"></i>
              ${child.fullName || child.username}
            </button>
          `).join('')}
          <button class="add-child-btn" onclick="parentPanel.showAddChildDialog()">
            <i class="fas fa-plus"></i>
            Dodaj dziecko
          </button>
        </div>

        <div id="parent-content">
          ${this.linkedChildren.length > 0 
            ? this.renderChildDashboard(this.linkedChildren[0].userId)
            : this.renderNoChildrenMessage()
          }
        </div>
      </div>
    `;
  }

  /**
   * Renderuje dashboard dla wybranego dziecka
   */
  renderChildDashboard(childId) {
    const child = this.linkedChildren.find(c => c.userId === childId);
    if (!child) return '';

    const stats = this.getChildStats(childId);
    const recentActivity = this.getRecentActivity(childId);
    const achievements = this.getChildAchievements(childId);
    const upcomingExams = this.getUpcomingExams(childId);

    return `
      <div class="child-dashboard" data-child-id="${childId}">
        <!-- Podsumowanie -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="card-content">
              <h3>Średni wynik</h3>
              <div class="card-value">${stats.averageScore.toFixed(1)}%</div>
              <div class="card-trend ${stats.trend}">
                <i class="fas fa-arrow-${stats.trend === 'up' ? 'up' : 'down'}"></i>
                ${Math.abs(stats.trendValue).toFixed(1)}%
              </div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <i class="fas fa-trophy"></i>
            </div>
            <div class="card-content">
              <h3>Osiągnięcia</h3>
              <div class="card-value">${achievements.unlocked.length}</div>
              <div class="card-subtitle">z ${achievements.total}</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="card-content">
              <h3>Czas nauki</h3>
              <div class="card-value">${this.formatTime(stats.totalTime)}</div>
              <div class="card-subtitle">ten tydzień</div>
            </div>
          </div>

          <div class="summary-card">
            <div class="card-icon">
              <i class="fas fa-fire"></i>
            </div>
            <div class="card-content">
              <h3>Seria dni</h3>
              <div class="card-value">${stats.streak}</div>
              <div class="card-subtitle">dni z rzędu</div>
            </div>
          </div>
        </div>

        <!-- Wykres postępów -->
        <div class="progress-section">
          <h2>Postępy w nauce</h2>
          <div class="progress-chart-container">
            <canvas id="progress-chart"></canvas>
          </div>
          <div class="chart-controls">
            <button class="chart-btn active" onclick="parentPanel.updateChart('week')">
              Tydzień
            </button>
            <button class="chart-btn" onclick="parentPanel.updateChart('month')">
              Miesiąc
            </button>
            <button class="chart-btn" onclick="parentPanel.updateChart('year')">
              Rok
            </button>
          </div>
        </div>

        <!-- Ostatnia aktywność -->
        <div class="activity-section">
          <h2>Ostatnia aktywność</h2>
          <div class="activity-timeline">
            ${recentActivity.map(activity => this.renderActivityItem(activity)).join('')}
          </div>
          ${recentActivity.length === 0 ? `
            <div class="no-activity">
              <i class="fas fa-inbox"></i>
              <p>Brak aktywności w ostatnim czasie</p>
            </div>
          ` : ''}
        </div>

        <!-- Nadchodzące egzaminy -->
        ${upcomingExams.length > 0 ? `
          <div class="upcoming-exams-section">
            <h2>Nadchodzące egzaminy</h2>
            <div class="exam-list">
              ${upcomingExams.map(exam => `
                <div class="exam-item">
                  <div class="exam-date">
                    <div class="date-day">${new Date(exam.date).getDate()}</div>
                    <div class="date-month">${this.getMonthName(new Date(exam.date).getMonth())}</div>
                  </div>
                  <div class="exam-details">
                    <h4>${exam.title}</h4>
                    <p>${exam.subject} • ${exam.questionCount} pytań</p>
                  </div>
                  <button class="btn-secondary" onclick="parentPanel.sendReminder('${exam.id}', '${childId}')">
                    <i class="fas fa-bell"></i>
                    Przypomnij
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Analiza tematów -->
        <div class="topics-analysis-section">
          <h2>Analiza tematów</h2>
          <div class="topics-grid">
            ${this.renderTopicsAnalysis(childId)}
          </div>
        </div>

        <!-- Akcje -->
        <div class="parent-actions">
          <button class="btn-primary" onclick="parentPanel.generateReport('${childId}')">
            <i class="fas fa-file-pdf"></i>
            Generuj raport
          </button>
          <button class="btn-secondary" onclick="parentPanel.showLimitsDialog('${childId}')">
            <i class="fas fa-shield-alt"></i>
            Ustaw limity
          </button>
          <button class="btn-secondary" onclick="parentPanel.showRewardsDialog('${childId}')">
            <i class="fas fa-gift"></i>
            Nagrody
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderuje element aktywności
   */
  renderActivityItem(activity) {
    const icons = {
      exam_completed: 'clipboard-check',
      achievement_unlocked: 'trophy',
      study_session: 'book-reader',
      mistake_reviewed: 'redo'
    };

    const colors = {
      exam_completed: activity.score >= 80 ? 'success' : activity.score >= 50 ? 'warning' : 'danger',
      achievement_unlocked: 'success',
      study_session: 'info',
      mistake_reviewed: 'warning'
    };

    return `
      <div class="activity-item ${colors[activity.type]}">
        <div class="activity-icon">
          <i class="fas fa-${icons[activity.type] || 'circle'}"></i>
        </div>
        <div class="activity-content">
          <h4>${activity.title}</h4>
          <p>${activity.description}</p>
          <span class="activity-time">${this.formatRelativeTime(activity.timestamp)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Renderuje analizę tematów
   */
  renderTopicsAnalysis(childId) {
    const topics = this.getTopicStats(childId);
    
    return Object.entries(topics)
      .sort((a, b) => b[1].totalQuestions - a[1].totalQuestions)
      .slice(0, 6)
      .map(([topic, stats]) => {
        const proficiency = this.calculateProficiency(stats);
        return `
          <div class="topic-card">
            <h4>${topic}</h4>
            <div class="proficiency-meter">
              <div class="proficiency-fill ${proficiency.level}" 
                   style="width: ${proficiency.percentage}%"></div>
            </div>
            <div class="topic-stats">
              <span class="stat">
                <i class="fas fa-check"></i> ${stats.correct}/${stats.totalQuestions}
              </span>
              <span class="stat">
                <i class="fas fa-percentage"></i> ${proficiency.percentage.toFixed(0)}%
              </span>
            </div>
            ${proficiency.level === 'low' ? `
              <button class="suggest-practice" 
                      onclick="parentPanel.suggestPractice('${topic}', '${childId}')">
                <i class="fas fa-lightbulb"></i> Zasugeruj ćwiczenia
              </button>
            ` : ''}
          </div>
        `;
      }).join('');
  }

  /**
   * Dialog dodawania dziecka
   */
  showAddChildDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content">
        <h2>Połącz konto dziecka</h2>
        
        <div class="connection-methods">
          <div class="method-card" onclick="parentPanel.selectMethod('code')">
            <i class="fas fa-qrcode"></i>
            <h3>Kod połączenia</h3>
            <p>Wprowadź kod wygenerowany przez dziecko</p>
          </div>
          
          <div class="method-card" onclick="parentPanel.selectMethod('username')">
            <i class="fas fa-user"></i>
            <h3>Nazwa użytkownika</h3>
            <p>Wyszukaj po nazwie użytkownika</p>
          </div>
        </div>

        <div id="connection-form" style="display: none;">
          <!-- Formularz będzie tutaj -->
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Anuluj
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Wybór metody połączenia
   */
  selectMethod(method) {
    const formContainer = document.getElementById('connection-form');
    
    if (method === 'code') {
      formContainer.innerHTML = `
        <div class="code-input-container">
          <label>Wprowadź 6-cyfrowy kod:</label>
          <input type="text" 
                 id="connection-code" 
                 maxlength="6" 
                 pattern="[0-9]{6}"
                 placeholder="123456"
                 class="code-input">
          <button class="btn-primary" onclick="parentPanel.connectByCode()">
            Połącz
          </button>
        </div>
      `;
    } else {
      formContainer.innerHTML = `
        <div class="username-search-container">
          <label>Nazwa użytkownika dziecka:</label>
          <input type="text" 
                 id="child-username" 
                 placeholder="np. jan.kowalski"
                 class="username-input">
          <button class="btn-primary" onclick="parentPanel.searchChild()">
            Szukaj
          </button>
          <div id="search-results"></div>
        </div>
      `;
    }
    
    formContainer.style.display = 'block';
  }

  /**
   * Połącz przez kod
   */
  connectByCode() {
    const code = document.getElementById('connection-code').value;
    
    if (code.length !== 6) {
      this.showError('Kod musi mieć 6 cyfr');
      return;
    }
    
    // Sprawdź kod w bazie
    const pendingConnections = JSON.parse(localStorage.getItem('pendingConnections') || '[]');
    const connection = pendingConnections.find(c => c.code === code && !c.used);
    
    if (!connection) {
      this.showError('Nieprawidłowy kod lub kod został już użyty');
      return;
    }
    
    // Utwórz połączenie
    this.createParentChildLink(connection.childId);
    
    // Oznacz kod jako użyty
    connection.used = true;
    localStorage.setItem('pendingConnections', JSON.stringify(pendingConnections));
    
    // Zamknij dialog i odśwież
    document.querySelector('.modal-overlay').remove();
    this.init();
    location.reload();
  }

  /**
   * Ustawienia panelu
   */
  showSettings() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content settings-modal">
        <h2>Ustawienia panelu rodzica</h2>
        
        <div class="settings-section">
          <h3>Powiadomienia</h3>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-low-scores" 
                     ${this.settings.notifications.lowScores ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-info">
              <span>Niskie wyniki</span>
              <small>Powiadom gdy wynik < 50%</small>
            </div>
          </div>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-achievements" 
                     ${this.settings.notifications.achievements ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-info">
              <span>Osiągnięcia</span>
              <small>Powiadom o nowych osiągnięciach</small>
            </div>
          </div>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="weekly-reports" 
                     ${this.settings.notifications.weeklyReports ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-info">
              <span>Tygodniowe raporty</span>
              <small>Otrzymuj podsumowanie co tydzień</small>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>Raporty</h3>
          
          <div class="setting-item">
            <label>Częstotliwość raportów:</label>
            <select id="report-frequency">
              <option value="daily" ${this.settings.reportFrequency === 'daily' ? 'selected' : ''}>
                Codziennie
              </option>
              <option value="weekly" ${this.settings.reportFrequency === 'weekly' ? 'selected' : ''}>
                Co tydzień
              </option>
              <option value="monthly" ${this.settings.reportFrequency === 'monthly' ? 'selected' : ''}>
                Co miesiąc
              </option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>Szczegółowość:</label>
            <select id="report-detail">
              <option value="basic" ${this.settings.reportDetail === 'basic' ? 'selected' : ''}>
                Podstawowa
              </option>
              <option value="detailed" ${this.settings.reportDetail === 'detailed' ? 'selected' : ''}>
                Szczegółowa
              </option>
              <option value="full" ${this.settings.reportDetail === 'full' ? 'selected' : ''}>
                Pełna
              </option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3>Prywatność</h3>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="require-permission" 
                     ${this.settings.privacy.requirePermission ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-info">
              <span>Wymagaj zgody dziecka</span>
              <small>Dziecko musi zaakceptować połączenie</small>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Anuluj
          </button>
          <button class="btn-primary" onclick="parentPanel.saveSettings()">
            Zapisz
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Limity czasowe
   */
  showLimitsDialog(childId) {
    const child = this.linkedChildren.find(c => c.userId === childId);
    const limits = this.getChildLimits(childId);
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content">
        <h2>Limity dla ${child.fullName || child.username}</h2>
        
        <div class="limits-section">
          <h3>Limity czasowe</h3>
          
          <div class="limit-item">
            <label>Maksymalny czas dziennie:</label>
            <input type="number" 
                   id="daily-limit" 
                   min="0" 
                   max="480" 
                   value="${limits.dailyMinutes || 0}"
                   placeholder="0 = bez limitu">
            <span>minut</span>
          </div>
          
          <div class="limit-item">
            <label>Godziny dostępu:</label>
            <div class="time-range">
              <input type="time" id="access-from" value="${limits.accessFrom || '06:00'}">
              <span>do</span>
              <input type="time" id="access-to" value="${limits.accessTo || '22:00'}">
            </div>
          </div>
        </div>

        <div class="limits-section">
          <h3>Limity egzaminów</h3>
          
          <div class="limit-item">
            <label>Maksymalna liczba prób dziennie:</label>
            <input type="number" 
                   id="exam-attempts" 
                   min="0" 
                   max="20" 
                   value="${limits.maxExamAttempts || 0}"
                   placeholder="0 = bez limitu">
          </div>
          
          <div class="limit-item">
            <label class="switch">
              <input type="checkbox" 
                     id="require-break" 
                     ${limits.requireBreak ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <div class="setting-info">
              <span>Wymagaj przerw</span>
              <small>15 min przerwy co godzinę</small>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Anuluj
          </button>
          <button class="btn-primary" onclick="parentPanel.saveLimits('${childId}')">
            Zapisz limity
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * System nagród
   */
  showRewardsDialog(childId) {
    const child = this.linkedChildren.find(c => c.userId === childId);
    const rewards = this.getChildRewards(childId);
    
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal-content rewards-modal">
        <h2>Nagrody dla ${child.fullName || child.username}</h2>
        
        <div class="points-display">
          <i class="fas fa-coins"></i>
          <span class="points-value">${rewards.points}</span>
          <span class="points-label">punktów</span>
        </div>

        <div class="rewards-section">
          <h3>Dostępne nagrody</h3>
          <div class="rewards-grid">
            ${this.settings.rewards.map(reward => `
              <div class="reward-card ${rewards.points >= reward.cost ? 'available' : 'locked'}">
                <div class="reward-icon">
                  <i class="fas fa-${reward.icon}"></i>
                </div>
                <h4>${reward.name}</h4>
                <p>${reward.description}</p>
                <div class="reward-cost">
                  <i class="fas fa-coins"></i> ${reward.cost}
                </div>
                ${rewards.points >= reward.cost ? `
                  <button class="btn-primary" 
                          onclick="parentPanel.claimReward('${reward.id}', '${childId}')">
                    Odbierz
                  </button>
                ` : `
                  <div class="locked-info">
                    Brakuje ${reward.cost - rewards.points} pkt
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="rewards-section">
          <h3>Historia nagród</h3>
          <div class="rewards-history">
            ${rewards.history.slice(0, 5).map(item => `
              <div class="history-item">
                <i class="fas fa-${item.icon}"></i>
                <div class="history-details">
                  <span>${item.name}</span>
                  <small>${this.formatDate(item.claimedAt)}</small>
                </div>
                <div class="history-cost">-${item.cost} pkt</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="add-reward-section">
          <button class="btn-secondary" onclick="parentPanel.showAddRewardForm()">
            <i class="fas fa-plus"></i>
            Dodaj nową nagrodę
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">
            Zamknij
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Generowanie raportu PDF
   */
  async generateReport(childId) {
    const child = this.linkedChildren.find(c => c.userId === childId);
    const period = this.getReportPeriod();
    
    this.showLoader('Generowanie raportu...');
    
    try {
      // Użyj modułu PDF Export
      if (window.PDFExporter) {
        const exporter = new PDFExporter();
        const reportData = this.prepareReportData(childId, period);
        
        // Niestandardowy raport dla rodzica
        await exporter.generateParentReport(reportData);
      } else {
        // Fallback - prosty raport
        this.generateSimpleReport(childId);
      }
    } catch (error) {
      console.error('Błąd generowania raportu:', error);
      this.showError('Nie udało się wygenerować raportu');
    } finally {
      this.hideLoader();
    }
  }

  /**
   * Przygotowanie danych do raportu
   */
  prepareReportData(childId, period) {
    const child = this.linkedChildren.find(c => c.userId === childId);
    const stats = this.getChildStats(childId);
    const results = this.getChildResults(childId, period);
    const topics = this.getTopicStats(childId);
    const achievements = this.getChildAchievements(childId);
    
    return {
      child,
      period,
      stats,
      results,
      topics,
      achievements,
      recommendations: this.generateRecommendations(stats, topics)
    };
  }

  /**
   * Wykres postępów
   */
  renderProgressChart(childId, period = 'week') {
    const canvas = document.getElementById('progress-chart');
    if (!canvas || !window.Chart) return;
    
    const data = this.getChartData(childId, period);
    
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Wyniki',
          data: data.scores,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Wynik: ${context.parsed.y}%`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + '%'
            }
          }
        }
      }
    });
  }

  /**
   * Pomocnicze metody
   */
  getChildStats(childId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]')
      .filter(r => r.userId === childId);
    
    const lastWeekResults = results.filter(r => {
      const date = new Date(r.completedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    });
    
    const previousWeekResults = results.filter(r => {
      const date = new Date(r.completedAt);
      const twoWeeksAgo = new Date();
      const weekAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= twoWeeksAgo && date < weekAgo;
    });
    
    const avgScore = lastWeekResults.length > 0
      ? lastWeekResults.reduce((sum, r) => sum + r.score, 0) / lastWeekResults.length
      : 0;
    
    const prevAvgScore = previousWeekResults.length > 0
      ? previousWeekResults.reduce((sum, r) => sum + r.score, 0) / previousWeekResults.length
      : avgScore;
    
    const trend = avgScore > prevAvgScore ? 'up' : 'down';
    const trendValue = avgScore - prevAvgScore;
    
    // Oblicz serię dni
    const streak = this.calculateStreak(childId);
    
    // Oblicz czas nauki
    const totalTime = lastWeekResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    return {
      averageScore: avgScore,
      trend,
      trendValue,
      totalTime,
      streak,
      totalExams: results.length,
      weeklyExams: lastWeekResults.length
    };
  }

  getRecentActivity(childId) {
    const activities = [];
    
    // Pobierz wyniki egzaminów
    const results = JSON.parse(localStorage.getItem('examResults') || '[]')
      .filter(r => r.userId === childId)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5);
    
    results.forEach(result => {
      activities.push({
        type: 'exam_completed',
        title: 'Ukończono egzamin',
        description: `${result.examTitle} - Wynik: ${result.score}%`,
        score: result.score,
        timestamp: result.completedAt
      });
    });
    
    // Pobierz osiągnięcia
    const achievements = JSON.parse(localStorage.getItem('achievements') || '[]')
      .find(a => a.userId === childId);
    
    if (achievements?.unlocked) {
      achievements.unlocked
        .slice(-3)
        .forEach(ach => {
          activities.push({
            type: 'achievement_unlocked',
            title: 'Nowe osiągnięcie',
            description: ach.name,
            timestamp: ach.unlockedAt
          });
        });
    }
    
    // Sortuj według czasu
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return activities.slice(0, 10);
  }

  getChildAchievements(childId) {
    const userAchievements = JSON.parse(localStorage.getItem('achievements') || '[]')
      .find(a => a.userId === childId);
    
    const allAchievements = window.achievementsSystem?.achievements || [];
    
    return {
      unlocked: userAchievements?.unlocked || [],
      total: allAchievements.length
    };
  }

  getUpcomingExams(childId) {
    const scheduled = JSON.parse(localStorage.getItem('scheduledExams') || '[]');
    const now = new Date();
    
    return scheduled
      .filter(exam => {
        const examDate = new Date(exam.date);
        return examDate > now && exam.assignedTo?.includes(childId);
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  }

  getTopicStats(childId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]')
      .filter(r => r.userId === childId);
    
    const topicStats = {};
    
    results.forEach(result => {
      if (result.answers) {
        result.answers.forEach(answer => {
          const topic = answer.topic || 'Inne';
          
          if (!topicStats[topic]) {
            topicStats[topic] = {
              correct: 0,
              incorrect: 0,
              totalQuestions: 0
            };
          }
          
          topicStats[topic].totalQuestions++;
          if (answer.correct) {
            topicStats[topic].correct++;
          } else {
            topicStats[topic].incorrect++;
          }
        });
      }
    });
    
    return topicStats;
  }

  calculateProficiency(stats) {
    const accuracy = stats.totalQuestions > 0 
      ? (stats.correct / stats.totalQuestions) * 100 
      : 0;
    
    let level = 'low';
    if (accuracy >= 80) level = 'high';
    else if (accuracy >= 60) level = 'medium';
    
    return {
      percentage: accuracy,
      level
    };
  }

  calculateStreak(childId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]')
      .filter(r => r.userId === childId)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    if (results.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const result of results) {
      const resultDate = new Date(result.completedAt);
      resultDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate - resultDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff > streak) {
        break;
      }
    }
    
    return streak;
  }

  createParentChildLink(childId) {
    const links = JSON.parse(localStorage.getItem('parentChildLinks') || '[]');
    
    // Sprawdź czy połączenie już istnieje
    const existingLink = links.find(
      l => l.parentId === this.currentParent.userId && l.childId === childId
    );
    
    if (existingLink) {
      this.showError('To konto jest już połączone');
      return;
    }
    
    // Dodaj nowe połączenie
    links.push({
      parentId: this.currentParent.userId,
      childId: childId,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    
    localStorage.setItem('parentChildLinks', JSON.stringify(links));
    
    // Powiadom dziecko
    this.notifyChildAboutLink(childId);
  }

  notifyChildAboutLink(childId) {
    // Tutaj można dodać system powiadomień dla dziecka
    console.log('Powiadomienie wysłane do dziecka:', childId);
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }

  formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} min temu`;
    if (hours < 24) return `${hours} godz. temu`;
    if (days === 1) return 'Wczoraj';
    if (days < 7) return `${days} dni temu`;
    
    return date.toLocaleDateString('pl-PL');
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getMonthName(monthIndex) {
    const months = [
      'STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE',
      'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU'
    ];
    return months[monthIndex];
  }

  showLoader(text) {
    // Implementacja loadera
  }

  hideLoader() {
    // Implementacja ukrywania loadera
  }

  showError(message) {
    // Implementacja pokazywania błędów
    alert(message);
  }

  loadSettings() {
    const defaults = {
      notifications: {
        lowScores: true,
        achievements: true,
        weeklyReports: true,
        dailyActivity: false
      },
      reportFrequency: 'weekly',
      reportDetail: 'detailed',
      privacy: {
        requirePermission: true,
        hideDetails: false
      },
      rewards: [
        {
          id: 'extra-time',
          name: 'Dodatkowy czas',
          description: '+30 minut czasu gry',
          cost: 100,
          icon: 'gamepad'
        },
        {
          id: 'movie-night',
          name: 'Wieczór filmowy',
          description: 'Wybór filmu na piątkowy wieczór',
          cost: 200,
          icon: 'film'
        },
        {
          id: 'ice-cream',
          name: 'Lody',
          description: 'Wycieczka do lodziarni',
          cost: 150,
          icon: 'ice-cream'
        }
      ]
    };
    
    const saved = localStorage.getItem('parentPanelSettings');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  saveSettings() {
    // Pobierz wartości z formularza
    this.settings.notifications.lowScores = document.getElementById('notify-low-scores').checked;
    this.settings.notifications.achievements = document.getElementById('notify-achievements').checked;
    this.settings.notifications.weeklyReports = document.getElementById('weekly-reports').checked;
    this.settings.reportFrequency = document.getElementById('report-frequency').value;
    this.settings.reportDetail = document.getElementById('report-detail').value;
    this.settings.privacy.requirePermission = document.getElementById('require-permission').checked;
    
    localStorage.setItem('parentPanelSettings', JSON.stringify(this.settings));
    document.querySelector('.modal-overlay').remove();
    
    this.showSuccess('Ustawienia zapisane');
  }

  showSuccess(message) {
    // Implementacja pokazywania sukcesu
    console.log('Sukces:', message);
  }

  /**
   * Renderuje panel ustawień
   */
  renderSettings() {
    const settings = this.settings;
    
    return `
      <div class="settings-panel">
        <h3 class="text-xl font-semibold mb-4">Ustawienia panelu rodzica</h3>
        
        <div class="settings-section mb-6">
          <h4 class="text-lg font-medium mb-3">Powiadomienia</h4>
          <div class="space-y-3">
            <label class="flex items-center">
              <input type="checkbox" id="notify-low-scores" 
                     ${settings.notifications.lowScores ? 'checked' : ''}
                     class="mr-3">
              <span>Powiadamiaj o niskich wynikach (poniżej 60%)</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="notify-achievements" 
                     ${settings.notifications.achievements ? 'checked' : ''}
                     class="mr-3">
              <span>Powiadamiaj o nowych osiągnięciach</span>
            </label>
            <label class="flex items-center">
              <input type="checkbox" id="weekly-reports" 
                     ${settings.notifications.weeklyReports ? 'checked' : ''}
                     class="mr-3">
              <span>Wysyłaj tygodniowe podsumowania</span>
            </label>
          </div>
        </div>

        <div class="settings-section mb-6">
          <h4 class="text-lg font-medium mb-3">Raporty</h4>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-2">Częstotliwość raportów</label>
            <select id="report-frequency" class="input-modern w-full">
              <option value="daily" ${settings.reportFrequency === 'daily' ? 'selected' : ''}>Codziennie</option>
              <option value="weekly" ${settings.reportFrequency === 'weekly' ? 'selected' : ''}>Co tydzień</option>
              <option value="monthly" ${settings.reportFrequency === 'monthly' ? 'selected' : ''}>Co miesiąc</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-2">Szczegółowość raportów</label>
            <select id="report-detail" class="input-modern w-full">
              <option value="basic" ${settings.reportDetail === 'basic' ? 'selected' : ''}>Podstawowe</option>
              <option value="detailed" ${settings.reportDetail === 'detailed' ? 'selected' : ''}>Szczegółowe</option>
              <option value="full" ${settings.reportDetail === 'full' ? 'selected' : ''}>Pełne</option>
            </select>
          </div>
        </div>

        <div class="settings-section mb-6">
          <h4 class="text-lg font-medium mb-3">Prywatność</h4>
          <label class="flex items-center">
            <input type="checkbox" id="require-permission" 
                   ${settings.privacy.requirePermission ? 'checked' : ''}
                   class="mr-3">
            <span>Wymagaj zgody dziecka na dostęp do szczegółowych danych</span>
          </label>
        </div>

        <div class="flex gap-4 mt-6">
          <button onclick="parentPanel.saveSettings()" class="btn-primary">
            <i class="fas fa-save mr-2"></i>
            Zapisz ustawienia
          </button>
          <button onclick="parentPanel.resetSettings()" class="btn-secondary">
            <i class="fas fa-undo mr-2"></i>
            Przywróć domyślne
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Resetuje ustawienia do domyślnych
   */
  resetSettings() {
    if (confirm('Czy na pewno chcesz przywrócić domyślne ustawienia?')) {
      localStorage.removeItem('parentPanelSettings');
      this.settings = this.loadSettings();
      window.location.reload();
    }
  }
}

// Eksportuj moduł
window.ParentPanel = ParentPanel;

// Style CSS dla panelu rodzica
const parentPanelStyles = `
<style>
/* Parent Panel Styles */
.parent-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.dashboard-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
}

.parent-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 12px 20px;
  border-radius: 12px;
}

.parent-info i {
  font-size: 24px;
  color: var(--accent-primary);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--accent-primary);
  color: white;
}

/* Children tabs */
.children-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 16px;
}

.child-tab {
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.child-tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.child-tab.active {
  background: var(--accent-primary);
  color: white;
}

.add-child-btn {
  padding: 12px 20px;
  border: 2px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.add-child-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Summary cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 16px;
  transition: all 0.3s;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.card-icon {
  width: 56px;
  height: 56px;
  background: var(--accent-primary);
  background: var(--accent-gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  flex-shrink: 0;
}

.card-content h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.card-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 6px;
}

.card-trend.up {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.card-trend.down {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

/* Progress section */
.progress-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.progress-section h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.progress-chart-container {
  height: 300px;
  margin-bottom: 20px;
}

.chart-controls {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.chart-btn {
  padding: 8px 16px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-btn:hover,
.chart-btn.active {
  background: var(--accent-primary);
  color: white;
}

/* Activity section */
.activity-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.activity-section h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border-left: 4px solid;
  transition: all 0.2s;
}

.activity-item:hover {
  transform: translateX(4px);
}

.activity-item.success {
  border-left-color: #22c55e;
}

.activity-item.warning {
  border-left-color: #fbbf24;
}

.activity-item.danger {
  border-left-color: #ef4444;
}

.activity-item.info {
  border-left-color: #3b82f6;
}

.activity-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-content h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.activity-content p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.no-activity {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.no-activity i {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Upcoming exams */
.upcoming-exams-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.upcoming-exams-section h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.exam-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.2s;
}

.exam-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.exam-date {
  width: 60px;
  height: 60px;
  background: var(--accent-primary);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.date-day {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.date-month {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.exam-details {
  flex: 1;
}

.exam-details h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.exam-details p {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Topics analysis */
.topics-analysis-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.topics-analysis-section h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.topic-card {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.topic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.topic-card h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.proficiency-meter {
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.proficiency-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.proficiency-fill.high {
  background: #22c55e;
}

.proficiency-fill.medium {
  background: #fbbf24;
}

.proficiency-fill.low {
  background: #ef4444;
}

.topic-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--text-secondary);
}

.topic-stats .stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.suggest-practice {
  margin-top: 12px;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--accent-primary);
  background: transparent;
  color: var(--accent-primary);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggest-practice:hover {
  background: var(--accent-primary);
  color: white;
}

/* Parent actions */
.parent-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}

/* Connection dialog */
.connection-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.method-card {
  padding: 24px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.method-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.method-card i {
  font-size: 48px;
  color: var(--accent-primary);
  margin-bottom: 12px;
}

.method-card h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.method-card p {
  font-size: 14px;
  color: var(--text-secondary);
}

.code-input-container,
.username-search-container {
  padding: 24px;
  text-align: center;
}

.code-input {
  font-size: 32px;
  letter-spacing: 8px;
  text-align: center;
  width: 300px;
  margin: 16px auto;
  padding: 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
}

.username-input {
  width: 100%;
  max-width: 300px;
  margin: 16px auto;
  padding: 12px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 16px;
}

/* Settings modal */
.settings-modal {
  max-width: 600px;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.setting-info {
  flex: 1;
}

.setting-info span {
  display: block;
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.setting-info small {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
}

.time-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Rewards modal */
.rewards-modal {
  max-width: 800px;
}

.points-display {
  text-align: center;
  padding: 24px;
  background: var(--accent-gradient);
  border-radius: 16px;
  margin-bottom: 32px;
  color: white;
}

.points-display i {
  font-size: 48px;
  margin-bottom: 12px;
}

.points-value {
  font-size: 48px;
  font-weight: 700;
  display: block;
}

.points-label {
  font-size: 16px;
  opacity: 0.9;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.reward-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.2s;
}

.reward-card.available {
  border-color: var(--accent-primary);
}

.reward-card.locked {
  opacity: 0.6;
}

.reward-icon {
  width: 64px;
  height: 64px;
  background: var(--accent-primary);
  background: var(--accent-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 28px;
  color: white;
}

.reward-card h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.reward-card p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.reward-cost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 12px;
}

.locked-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.rewards-history {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 16px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.history-item:last-child {
  border-bottom: none;
}

.history-details {
  flex: 1;
}

.history-details span {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
}

.history-details small {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.history-cost {
  font-size: 16px;
  font-weight: 500;
  color: #ef4444;
}

/* Mobile styles */
@media (max-width: 768px) {
  .parent-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .children-tabs {
    flex-wrap: wrap;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .topics-grid {
    grid-template-columns: 1fr;
  }
  
  .parent-actions {
    flex-direction: column;
  }
  
  .parent-actions button {
    width: 100%;
  }
  
  .connection-methods {
    grid-template-columns: 1fr;
  }
  
  .rewards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('parent-panel-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'parent-panel-styles';
  styleElement.innerHTML = parentPanelStyles;
  document.head.appendChild(styleElement.firstChild);
}

// Rozszerzenie dla PDF Exporter
if (window.PDFExporter) {
  PDFExporter.prototype.generateParentReport = async function(reportData) {
    await this.loadJsPDF();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const { child, period, stats, results, topics, achievements, recommendations } = reportData;
    
    let yPosition = 20;
    
    // Nagłówek
    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237);
    doc.text(`Raport dla rodzica - ${child.fullName || child.username}`, 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Okres: ${period.from} - ${period.to}`, 20, yPosition);
    
    yPosition += 20;
    
    // Podsumowanie
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Podsumowanie', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(10);
    
    const summaryData = [
      ['Średni wynik:', `${stats.averageScore.toFixed(1)}%`],
      ['Trend:', stats.trend === 'up' ? '↑ Wzrost' : '↓ Spadek'],
      ['Ukończone egzaminy:', stats.weeklyExams.toString()],
      ['Czas nauki:', `${Math.floor(stats.totalTime / 60)} godz.`],
      ['Seria dni:', `${stats.streak} dni`]
    ];
    
    summaryData.forEach((item, index) => {
      doc.text(item[0], 25, yPosition + (index * 7));
      doc.text(item[1], 80, yPosition + (index * 7));
    });
    
    // Dalsze sekcje raportu...
    
    doc.save(`raport_rodzicielski_${child.username}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
}