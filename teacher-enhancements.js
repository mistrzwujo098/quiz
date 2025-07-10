// ===== ULEPSZENIA PANELU NAUCZYCIELA =====
// Brakujące funkcjonalności dla kompletnego doświadczenia nauczyciela

class TeacherEnhancements {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicjalizacja modułu
   */
  init() {
    if (this.initialized) return;
    
    // Inicjalizacja event listenerów i UI
    this.setupEventListeners();
    this.initialized = true;
    console.log('TeacherEnhancements zainicjalizowany');
  }

  /**
   * Konfiguracja event listenerów
   */
  setupEventListeners() {
    // Event listenery będą dodane gdy UI będzie gotowe
    document.addEventListener('teacherPanelReady', () => {
      this.enhanceTeacherPanel();
    });
  }

  /**
   * Rozszerza panel nauczyciela
   */
  enhanceTeacherPanel() {
    // Dodaj dodatkowe funkcjonalności do panelu nauczyciela
    const panel = document.querySelector('#teacher-panel');
    if (panel) {
      // Dodaj przyciski i funkcje
      console.log('Panel nauczyciela rozszerzony');
    }
  }

  /**
   * System zarządzania uczniami
   */
  createStudentManagementSystem() {
    return {
      /**
       * Import uczniów z CSV/Excel
       */
      async importStudents(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (e) => {
            try {
              let students = [];
              
              if (file.name.endsWith('.csv')) {
                // Parse CSV
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                for (let i = 1; i < lines.length; i++) {
                  if (lines[i].trim()) {
                    const values = lines[i].split(',').map(v => v.trim());
                    const student = {};
                    headers.forEach((header, index) => {
                      student[header] = values[index];
                    });
                    students.push(student);
                  }
                }
              } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                // Parse Excel using XLSX library
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                students = XLSX.utils.sheet_to_json(firstSheet);
              }
              
              // Process students
              const processedStudents = students.map(s => ({
                username: this.generateUsername(s.imie || s.name, s.nazwisko || s.surname),
                fullName: `${s.imie || s.name} ${s.nazwisko || s.surname}`,
                email: s.email || '',
                category: s.kategoria || s.category || 'egzamin ósmoklasisty',
                class: s.klasa || s.class || '',
                temporaryPassword: this.generateTempPassword()
              }));
              
              resolve(processedStudents);
            } catch (error) {
              reject(error);
            }
          };
          
          if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
          } else {
            reader.readAsArrayBuffer(file);
          }
        });
      },

      /**
       * Generuje nazwę użytkownika
       */
      generateUsername(firstName, lastName) {
        const first = firstName.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const last = lastName.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return `${first}.${last}`;
      },

      /**
       * Generuje tymczasowe hasło
       */
      generateTempPassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      },

      /**
       * Masowe tworzenie kont
       */
      async bulkCreateAccounts(students) {
        const results = [];
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        for (const student of students) {
          try {
            // Sprawdź czy użytkownik już istnieje
            if (users.find(u => u.username === student.username)) {
              results.push({
                ...student,
                status: 'exists',
                message: 'Użytkownik już istnieje'
              });
              continue;
            }
            
            // Utwórz konto
            const newUser = {
              id: Date.now() + Math.random(),
              userId: Date.now() + Math.random(),
              username: student.username,
              password: CryptoJS.SHA256(student.temporaryPassword).toString(),
              role: 'student',
              category: student.category,
              fullName: student.fullName,
              email: student.email,
              class: student.class,
              createdAt: new Date(),
              needsPasswordChange: true,
              isActive: true
            };
            
            users.push(newUser);
            
            results.push({
              ...student,
              status: 'created',
              message: 'Konto utworzone pomyślnie'
            });
          } catch (error) {
            results.push({
              ...student,
              status: 'error',
              message: error.message
            });
          }
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        return results;
      },

      /**
       * Renderuje panel zarządzania uczniami
       */
      renderStudentManagementPanel() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const students = users.filter(u => u.role === 'student');
        
        return `
          <div class="student-management-panel">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold">Zarządzanie uczniami</h2>
              <div class="flex gap-3">
                <button onclick="teacherEnhancements.showImportDialog()" class="btn-primary">
                  <i class="fas fa-file-import mr-2"></i>
                  Importuj z pliku
                </button>
                <button onclick="teacherEnhancements.showAddStudentDialog()" class="btn-primary">
                  <i class="fas fa-user-plus mr-2"></i>
                  Dodaj ucznia
                </button>
              </div>
            </div>

            <div class="mb-4 flex gap-4">
              <input 
                type="text" 
                id="student-search"
                placeholder="Szukaj ucznia..."
                class="input-modern flex-1"
                onkeyup="teacherEnhancements.filterStudents()"
              />
              <select id="class-filter" class="input-modern" onchange="teacherEnhancements.filterStudents()">
                <option value="">Wszystkie klasy</option>
                ${[...new Set(students.map(s => s.class).filter(Boolean))].map(c => 
                  `<option value="${c}">${c}</option>`
                ).join('')}
              </select>
              <select id="category-filter" class="input-modern" onchange="teacherEnhancements.filterStudents()">
                <option value="">Wszystkie kategorie</option>
                <option value="egzamin ósmoklasisty">Egzamin ósmoklasisty</option>
                <option value="matura podstawowa">Matura podstawowa</option>
                <option value="matura rozszerzona">Matura rozszerzona</option>
              </select>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-700">
                    <th class="text-left p-3">Imię i nazwisko</th>
                    <th class="text-left p-3">Login</th>
                    <th class="text-left p-3">Klasa</th>
                    <th class="text-left p-3">Kategoria</th>
                    <th class="text-left p-3">Status</th>
                    <th class="text-left p-3">Akcje</th>
                  </tr>
                </thead>
                <tbody id="students-table-body">
                  ${students.map(student => `
                    <tr class="border-b border-gray-800 hover:bg-gray-800/50">
                      <td class="p-3">${student.fullName || student.username}</td>
                      <td class="p-3 text-gray-400">${student.username}</td>
                      <td class="p-3">${student.class || '-'}</td>
                      <td class="p-3">
                        <span class="px-2 py-1 rounded text-xs bg-purple-600/20 text-purple-300">
                          ${student.category || 'Brak'}
                        </span>
                      </td>
                      <td class="p-3">
                        <span class="px-2 py-1 rounded text-xs ${
                          student.isActive !== false 
                            ? 'bg-green-600/20 text-green-300' 
                            : 'bg-red-600/20 text-red-300'
                        }">
                          ${student.isActive !== false ? 'Aktywny' : 'Nieaktywny'}
                        </span>
                      </td>
                      <td class="p-3">
                        <div class="flex gap-2">
                          <button 
                            onclick="teacherEnhancements.editStudent('${student.userId}')"
                            class="text-blue-400 hover:text-blue-300"
                            title="Edytuj"
                          >
                            <i class="fas fa-edit"></i>
                          </button>
                          <button 
                            onclick="teacherEnhancements.resetPassword('${student.userId}')"
                            class="text-yellow-400 hover:text-yellow-300"
                            title="Resetuj hasło"
                          >
                            <i class="fas fa-key"></i>
                          </button>
                          <button 
                            onclick="teacherEnhancements.toggleStudentStatus('${student.userId}')"
                            class="text-gray-400 hover:text-gray-300"
                            title="${student.isActive !== false ? 'Dezaktywuj' : 'Aktywuj'}"
                          >
                            <i class="fas fa-${student.isActive !== false ? 'toggle-on' : 'toggle-off'}"></i>
                          </button>
                          <button 
                            onclick="teacherEnhancements.viewStudentDetails('${student.userId}')"
                            class="text-purple-400 hover:text-purple-300"
                            title="Szczegóły"
                          >
                            <i class="fas fa-chart-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    };
  }

  /**
   * System komunikacji
   */
  createCommunicationSystem() {
    return {
      /**
       * Tablica ogłoszeń
       */
      announcements: {
        create(title, content, targetGroups = ['all']) {
          const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
          const newAnnouncement = {
            id: Date.now(),
            title,
            content,
            author: this.getCurrentTeacher(),
            targetGroups,
            createdAt: new Date(),
            readBy: [],
            priority: 'normal'
          };
          
          announcements.unshift(newAnnouncement);
          localStorage.setItem('announcements', JSON.stringify(announcements));
          
          // Wyślij powiadomienia
          if (window.navigationIntegration?.modules?.pushNotifications) {
            window.navigationIntegration.modules.pushNotifications.showNotification(
              'Nowe ogłoszenie',
              {
                body: title,
                tag: `announcement-${newAnnouncement.id}`,
                data: { type: 'announcement', id: newAnnouncement.id }
              }
            );
          }
          
          return newAnnouncement;
        },

        renderAnnouncementBoard() {
          const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
          
          return `
            <div class="announcement-board">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-semibold">Tablica ogłoszeń</h3>
                <button onclick="teacherEnhancements.showCreateAnnouncementDialog()" class="btn-primary">
                  <i class="fas fa-bullhorn mr-2"></i>
                  Nowe ogłoszenie
                </button>
              </div>
              
              <div class="space-y-4">
                ${announcements.length === 0 ? 
                  '<p class="text-gray-400 text-center py-8">Brak ogłoszeń</p>' :
                  announcements.map(ann => `
                    <div class="card-modern ${ann.priority === 'high' ? 'border-red-500' : ''}">
                      <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold ${ann.priority === 'high' ? 'text-red-400' : ''}">
                          ${ann.priority === 'high' ? '<i class="fas fa-exclamation-circle mr-2"></i>' : ''}
                          ${ann.title}
                        </h4>
                        <button 
                          onclick="teacherEnhancements.deleteAnnouncement(${ann.id})"
                          class="text-gray-400 hover:text-red-400"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                      <p class="text-gray-300 mb-3">${ann.content}</p>
                      <div class="flex justify-between items-center text-sm text-gray-400">
                        <span>
                          <i class="fas fa-user mr-1"></i>
                          ${ann.author}
                        </span>
                        <span>
                          <i class="fas fa-clock mr-1"></i>
                          ${new Date(ann.createdAt).toLocaleString('pl-PL')}
                        </span>
                      </div>
                      <div class="mt-2 text-xs text-gray-500">
                        <i class="fas fa-eye mr-1"></i>
                        Przeczytane przez ${ann.readBy.length} osób
                      </div>
                    </div>
                  `).join('')
                }
              </div>
            </div>
          `;
        }
      },

      /**
       * System wiadomości
       */
      messaging: {
        sendMessage(recipientId, subject, content) {
          const messages = JSON.parse(localStorage.getItem('messages') || '[]');
          const newMessage = {
            id: Date.now(),
            from: this.getCurrentTeacher(),
            to: recipientId,
            subject,
            content,
            sentAt: new Date(),
            read: false,
            replied: false
          };
          
          messages.push(newMessage);
          localStorage.setItem('messages', JSON.stringify(messages));
          
          return newMessage;
        },

        renderMessagingInterface() {
          return `
            <div class="messaging-interface">
              <div class="grid md:grid-cols-3 gap-6">
                <div class="card-modern">
                  <h4 class="font-semibold mb-4">Szybka wiadomość</h4>
                  <select id="quick-message-recipient" class="input-modern w-full mb-3">
                    <option value="">Wybierz odbiorcę...</option>
                    <optgroup label="Uczniowie">
                      ${this.getStudentOptions()}
                    </optgroup>
                    <optgroup label="Rodzice">
                      ${this.getParentOptions()}
                    </optgroup>
                  </select>
                  <input 
                    type="text" 
                    id="quick-message-subject"
                    placeholder="Temat"
                    class="input-modern w-full mb-3"
                  />
                  <textarea 
                    id="quick-message-content"
                    placeholder="Treść wiadomości"
                    class="input-modern w-full h-32 mb-3"
                  ></textarea>
                  <button onclick="teacherEnhancements.sendQuickMessage()" class="btn-primary w-full">
                    <i class="fas fa-paper-plane mr-2"></i>
                    Wyślij
                  </button>
                </div>
                
                <div class="card-modern md:col-span-2">
                  <h4 class="font-semibold mb-4">Ostatnie wiadomości</h4>
                  ${this.renderRecentMessages()}
                </div>
              </div>
            </div>
          `;
        }
      }
    };
  }

  /**
   * System oceniania i rubryk
   */
  createGradingSystem() {
    return {
      /**
       * Tworzenie rubryk
       */
      createRubric(name, criteria) {
        const rubrics = JSON.parse(localStorage.getItem('rubrics') || '[]');
        const newRubric = {
          id: Date.now(),
          name,
          criteria,
          createdBy: this.getCurrentTeacher(),
          createdAt: new Date()
        };
        
        rubrics.push(newRubric);
        localStorage.setItem('rubrics', JSON.stringify(rubrics));
        
        return newRubric;
      },

      /**
       * Interfejs ręcznego oceniania
       */
      renderManualGradingInterface(examId) {
        const results = JSON.parse(localStorage.getItem('examResults') || '[]');
        const examResults = results.filter(r => r.examId === examId);
        
        return `
          <div class="manual-grading-interface">
            <h3 class="text-xl font-semibold mb-4">Ocenianie ręczne</h3>
            
            <div class="mb-4">
              <label class="text-sm text-gray-400">Wybierz rubrykę (opcjonalne)</label>
              <select id="rubric-select" class="input-modern w-full">
                <option value="">Bez rubryki</option>
                ${this.getRubricOptions()}
              </select>
            </div>
            
            <div class="space-y-6">
              ${examResults.map(result => `
                <div class="card-modern">
                  <div class="flex justify-between items-center mb-4">
                    <h4 class="font-semibold">
                      ${result.studentName || result.studentId}
                    </h4>
                    <span class="text-sm text-gray-400">
                      Złożono: ${new Date(result.completedAt).toLocaleString('pl-PL')}
                    </span>
                  </div>
                  
                  ${result.answers.filter(a => a.type === 'otwarte').map((answer, idx) => `
                    <div class="mb-4 p-4 bg-gray-800 rounded">
                      <h5 class="font-medium mb-2">Pytanie ${idx + 1}: ${answer.questionText}</h5>
                      <div class="mb-3 p-3 bg-gray-900 rounded">
                        <p class="text-gray-300">${answer.userAnswer || 'Brak odpowiedzi'}</p>
                      </div>
                      <div class="flex items-center gap-4">
                        <label class="text-sm">Punkty:</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="${answer.maxPoints || 10}"
                          class="input-modern w-20"
                          id="points-${result.id}-${idx}"
                          value="${answer.points || 0}"
                        />
                        <span class="text-sm text-gray-400">/ ${answer.maxPoints || 10}</span>
                      </div>
                      <textarea 
                        placeholder="Komentarz (opcjonalny)"
                        class="input-modern w-full h-20 mt-2"
                        id="comment-${result.id}-${idx}"
                      >${answer.comment || ''}</textarea>
                    </div>
                  `).join('')}
                  
                  <button 
                    onclick="teacherEnhancements.saveGrades('${result.id}')"
                    class="btn-primary"
                  >
                    <i class="fas fa-save mr-2"></i>
                    Zapisz oceny
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    };
  }

  /**
   * Zaawansowana analityka
   */
  createAdvancedAnalytics() {
    return {
      /**
       * Analiza trudności pytań
       */
      analyzeQuestionDifficulty() {
        const results = JSON.parse(localStorage.getItem('examResults') || '[]');
        const questionStats = {};
        
        results.forEach(result => {
          result.answers.forEach(answer => {
            if (!questionStats[answer.questionId]) {
              questionStats[answer.questionId] = {
                total: 0,
                correct: 0,
                totalTime: 0,
                text: answer.questionText
              };
            }
            
            questionStats[answer.questionId].total++;
            if (answer.correct) {
              questionStats[answer.questionId].correct++;
            }
            if (answer.timeSpent) {
              questionStats[answer.questionId].totalTime += answer.timeSpent;
            }
          });
        });
        
        // Oblicz statystyki
        Object.keys(questionStats).forEach(qId => {
          const stat = questionStats[qId];
          stat.difficulty = 1 - (stat.correct / stat.total);
          stat.avgTime = stat.totalTime / stat.total;
          stat.successRate = (stat.correct / stat.total) * 100;
        });
        
        return questionStats;
      },

      /**
       * Wykrywanie nieuczciwości
       */
      detectCheating(examId) {
        const results = JSON.parse(localStorage.getItem('examResults') || '[]');
        const examResults = results.filter(r => r.examId === examId);
        const suspiciousPatterns = [];
        
        // Analiza wzorców odpowiedzi
        examResults.forEach((result, idx) => {
          // Sprawdź czas rozwiązywania
          const avgTimePerQuestion = result.totalTime / result.answers.length;
          if (avgTimePerQuestion < 10) { // Mniej niż 10 sekund na pytanie
            suspiciousPatterns.push({
              studentId: result.studentId,
              type: 'too_fast',
              message: 'Podejrzanie krótki czas rozwiązywania'
            });
          }
          
          // Sprawdź identyczne odpowiedzi
          examResults.forEach((otherResult, otherIdx) => {
            if (idx !== otherIdx) {
              const sameAnswers = result.answers.filter((a, i) => 
                a.userAnswer === otherResult.answers[i]?.userAnswer
              ).length;
              
              const similarity = sameAnswers / result.answers.length;
              if (similarity > 0.9) {
                suspiciousPatterns.push({
                  studentId: result.studentId,
                  otherStudentId: otherResult.studentId,
                  type: 'similar_answers',
                  message: `${Math.round(similarity * 100)}% identycznych odpowiedzi`,
                  similarity
                });
              }
            }
          });
        });
        
        return suspiciousPatterns;
      },

      /**
       * Renderuj dashboard analityczny
       */
      renderAnalyticsDashboard() {
        const questionStats = this.analyzeQuestionDifficulty();
        const mostDifficult = Object.entries(questionStats)
          .sort((a, b) => b[1].difficulty - a[1].difficulty)
          .slice(0, 5);
        
        return `
          <div class="analytics-dashboard">
            <h2 class="text-2xl font-bold mb-6">Zaawansowana analityka</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <div class="card-modern">
                <h3 class="text-xl font-semibold mb-4">
                  <i class="fas fa-brain text-red-400 mr-2"></i>
                  Najtrudniejsze pytania
                </h3>
                <div class="space-y-3">
                  ${mostDifficult.map(([id, stat]) => `
                    <div class="p-3 bg-gray-800 rounded">
                      <p class="text-sm mb-2">${stat.text}</p>
                      <div class="flex justify-between text-xs">
                        <span class="text-red-400">
                          Trudność: ${Math.round(stat.difficulty * 100)}%
                        </span>
                        <span class="text-gray-400">
                          Poprawnych: ${Math.round(stat.successRate)}%
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div class="card-modern">
                <h3 class="text-xl font-semibold mb-4">
                  <i class="fas fa-tachometer-alt text-blue-400 mr-2"></i>
                  Średni czas odpowiedzi
                </h3>
                <canvas id="time-analysis-chart"></canvas>
              </div>
            </div>
            
            <div class="card-modern mt-6">
              <h3 class="text-xl font-semibold mb-4">
                <i class="fas fa-shield-alt text-yellow-400 mr-2"></i>
                Wykrywanie nieuczciwości
              </h3>
              <button 
                onclick="teacherEnhancements.runCheatingDetection()"
                class="btn-primary mb-4"
              >
                <i class="fas fa-search mr-2"></i>
                Uruchom analizę
              </button>
              <div id="cheating-results"></div>
            </div>
          </div>
        `;
      }
    };
  }

  /**
   * Dashboard nauczyciela
   */
  createTeacherDashboard() {
    const stats = this.calculateDashboardStats();
    
    return `
      <div class="teacher-dashboard">
        <h2 class="text-2xl font-bold mb-6">Panel główny</h2>
        
        <!-- Statystyki -->
        <div class="grid md:grid-cols-4 gap-4 mb-6">
          <div class="card-modern text-center">
            <div class="text-3xl font-bold text-blue-400">${stats.totalStudents}</div>
            <div class="text-sm text-gray-400">Uczniów</div>
          </div>
          <div class="card-modern text-center">
            <div class="text-3xl font-bold text-green-400">${stats.activeExams}</div>
            <div class="text-sm text-gray-400">Aktywnych egzaminów</div>
          </div>
          <div class="card-modern text-center">
            <div class="text-3xl font-bold text-purple-400">${stats.completedToday}</div>
            <div class="text-sm text-gray-400">Ukończonych dzisiaj</div>
          </div>
          <div class="card-modern text-center">
            <div class="text-3xl font-bold text-yellow-400">${stats.avgScore}%</div>
            <div class="text-sm text-gray-400">Średni wynik</div>
          </div>
        </div>
        
        <!-- Szybkie akcje -->
        <div class="grid md:grid-cols-3 gap-6 mb-6">
          <div class="card-modern">
            <h3 class="text-lg font-semibold mb-4">Szybkie akcje</h3>
            <div class="space-y-3">
              <button onclick="teacherEnhancements.quickCreateExam()" class="w-full text-left p-3 hover:bg-gray-800 rounded flex items-center">
                <i class="fas fa-plus-circle text-green-400 mr-3"></i>
                Utwórz szybki test
              </button>
              <button onclick="teacherEnhancements.viewPendingGrades()" class="w-full text-left p-3 hover:bg-gray-800 rounded flex items-center">
                <i class="fas fa-edit text-yellow-400 mr-3"></i>
                Oceń zadania otwarte
                ${stats.pendingGrades > 0 ? `<span class="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded">${stats.pendingGrades}</span>` : ''}
              </button>
              <button onclick="teacherEnhancements.generateWeeklyReport()" class="w-full text-left p-3 hover:bg-gray-800 rounded flex items-center">
                <i class="fas fa-file-alt text-blue-400 mr-3"></i>
                Generuj raport tygodniowy
              </button>
            </div>
          </div>
          
          <div class="card-modern">
            <h3 class="text-lg font-semibold mb-4">Ostatnia aktywność</h3>
            <div class="space-y-2 text-sm">
              ${this.getRecentActivity().map(activity => `
                <div class="flex items-center gap-2 text-gray-300">
                  <i class="fas fa-${activity.icon} text-${activity.color}-400"></i>
                  <span>${activity.text}</span>
                  <span class="text-gray-500 text-xs ml-auto">${activity.time}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="card-modern">
            <h3 class="text-lg font-semibold mb-4">Nadchodzące terminy</h3>
            <div class="space-y-2">
              ${this.getUpcomingDeadlines().map(deadline => `
                <div class="p-2 bg-gray-800 rounded">
                  <div class="font-medium text-sm">${deadline.title}</div>
                  <div class="text-xs text-gray-400">
                    <i class="fas fa-calendar mr-1"></i>
                    ${deadline.date}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <!-- Widget komunikacji -->
        ${this.createCommunicationSystem().announcements.renderAnnouncementBoard()}
      </div>
    `;
  }

  /**
   * Pomocnicze metody
   */
  getCurrentTeacher() {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    return user.fullName || user.username || 'Nauczyciel';
  }

  calculateDashboardStats() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const exams = JSON.parse(localStorage.getItem('exams') || '[]');
    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedToday = results.filter(r => {
      const date = new Date(r.completedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    }).length;
    
    const totalScores = results.reduce((sum, r) => 
      sum + ((r.correctAnswers / r.totalQuestions) * 100), 0
    );
    
    const pendingGrades = results.filter(r => 
      Array.isArray(r.answers) && r.answers.some(a => a.type === 'otwarte' && a.points === undefined)
    ).length;
    
    return {
      totalStudents: users.filter(u => u.role === 'student').length,
      activeExams: exams.filter(e => e.status === 'active').length,
      completedToday,
      avgScore: results.length > 0 ? Math.round(totalScores / results.length) : 0,
      pendingGrades
    };
  }

  getRecentActivity() {
    // Symulacja ostatniej aktywności
    return [
      { icon: 'check-circle', color: 'green', text: 'Anna Nowak ukończyła test', time: '5 min' },
      { icon: 'plus', color: 'blue', text: 'Utworzono nowy egzamin', time: '1 godz.' },
      { icon: 'users', color: 'purple', text: 'Dodano 3 uczniów do grupy 8A', time: '2 godz.' },
      { icon: 'chart-line', color: 'yellow', text: 'Wygenerowano raport miesięczny', time: '3 godz.' }
    ];
  }

  getUpcomingDeadlines() {
    const scheduler = new ExamScheduler();
    const upcoming = scheduler.getUpcomingEvents(7); // Następne 7 dni
    
    return upcoming.slice(0, 3).map(event => ({
      title: event.title,
      date: new Date(event.start).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  }

  /**
   * Dialogi i formularze
   */
  showImportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-2xl w-full">
        <h3 class="text-2xl font-bold mb-6">Import uczniów</h3>
        
        <div class="mb-6">
          <p class="text-gray-400 mb-4">
            Prześlij plik CSV lub Excel z danymi uczniów. 
            Plik powinien zawierać kolumny: imie, nazwisko, email, klasa, kategoria
          </p>
          
          <div class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <input 
              type="file" 
              id="import-file"
              accept=".csv,.xlsx,.xls"
              class="hidden"
              onchange="teacherEnhancements.handleFileImport(this.files[0])"
            />
            <label for="import-file" class="cursor-pointer">
              <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
              <p class="text-gray-300">Kliknij aby wybrać plik</p>
              <p class="text-sm text-gray-500">CSV, XLSX (max 5MB)</p>
            </label>
          </div>
        </div>
        
        <div class="flex justify-between">
          <button onclick="teacherEnhancements.downloadTemplate()" class="btn-secondary">
            <i class="fas fa-download mr-2"></i>
            Pobierz szablon
          </button>
          <button onclick="this.closest('.fixed').remove()" class="btn-secondary">
            Anuluj
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  async handleFileImport(file) {
    if (!file) return;
    
    try {
      const studentManagement = this.createStudentManagementSystem();
      const students = await studentManagement.importStudents(file);
      
      // Pokaż podgląd
      this.showImportPreview(students);
    } catch (error) {
      alert('Błąd importu: ' + error.message);
    }
  }

  showImportPreview(students) {
    const dialog = document.querySelector('.fixed');
    dialog.innerHTML = `
      <div class="glass-dark p-8 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <h3 class="text-2xl font-bold mb-6">Podgląd importu</h3>
        
        <p class="text-gray-400 mb-4">
          Znaleziono ${students.length} uczniów. Sprawdź dane przed importem:
        </p>
        
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="text-left p-2">Imię i nazwisko</th>
                <th class="text-left p-2">Login</th>
                <th class="text-left p-2">Email</th>
                <th class="text-left p-2">Klasa</th>
                <th class="text-left p-2">Kategoria</th>
                <th class="text-left p-2">Hasło tymczasowe</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr class="border-b border-gray-800">
                  <td class="p-2">${s.fullName}</td>
                  <td class="p-2 text-gray-400">${s.username}</td>
                  <td class="p-2 text-gray-400">${s.email}</td>
                  <td class="p-2">${s.class}</td>
                  <td class="p-2">${s.category}</td>
                  <td class="p-2 font-mono text-xs">${s.temporaryPassword}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="flex justify-between">
          <button onclick="this.closest('.fixed').remove()" class="btn-secondary">
            Anuluj
          </button>
          <button onclick="teacherEnhancements.confirmImport(${JSON.stringify(students).replace(/"/g, '&quot;')})" class="btn-primary">
            <i class="fas fa-check mr-2"></i>
            Importuj ${students.length} uczniów
          </button>
        </div>
      </div>
    `;
  }

  async confirmImport(students) {
    const studentManagement = this.createStudentManagementSystem();
    const results = await studentManagement.bulkCreateAccounts(students);
    
    const successful = results.filter(r => r.status === 'created').length;
    const failed = results.filter(r => r.status !== 'created').length;
    
    alert(`Import zakończony!\n\nUtworzono: ${successful} kont\nBłędy: ${failed}`);
    
    // Odśwież widok
    document.querySelector('.fixed').remove();
    window.location.reload();
  }

  downloadTemplate() {
    const template = [
      ['imie', 'nazwisko', 'email', 'klasa', 'kategoria'],
      ['Jan', 'Kowalski', 'jan.kowalski@szkola.pl', '8A', 'egzamin ósmoklasisty'],
      ['Anna', 'Nowak', 'anna.nowak@szkola.pl', '8B', 'egzamin ósmoklasisty'],
      ['Piotr', 'Wiśniewski', 'piotr.wisniewski@szkola.pl', '3A', 'matura podstawowa']
    ];
    
    const csv = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'szablon_import_uczniow.csv';
    link.click();
  }
}

// Utwórz globalną instancję
window.teacherEnhancements = new TeacherEnhancements();

// Style CSS
const enhancementStyles = `
<style>
.student-management-panel table {
  font-size: 14px;
}

.announcement-board .card-modern {
  transition: all 0.3s ease;
}

.announcement-board .card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.analytics-dashboard canvas {
  max-height: 300px;
}

.teacher-dashboard .card-modern {
  transition: all 0.3s ease;
}

.teacher-dashboard .card-modern:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Animacje */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-in {
  animation: slideInRight 0.3s ease;
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('teacher-enhancement-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'teacher-enhancement-styles';
  styleElement.innerHTML = enhancementStyles;
  document.head.appendChild(styleElement.firstChild);
}