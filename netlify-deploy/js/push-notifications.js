// ===== MODUŁ POWIADOMIEŃ PUSH =====
// System powiadomień o nadchodzących egzaminach, wynikach, osiągnięciach

class PushNotificationManager {
  constructor() {
    this.permission = Notification.permission || 'default';
    this.subscription = null;
    this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Należy wygenerować klucze VAPID
    this.serverEndpoint = '/api/notifications'; // Endpoint do zapisywania subskrypcji
    this.notificationSettings = this.loadSettings();
  }

  /**
   * Inicjalizuje system powiadomień
   */
  async init() {
    // Sprawdź wsparcie dla Service Worker i Push API
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers nie są obsługiwane');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('Push API nie jest obsługiwane');
      return false;
    }

    // Zarejestruj Service Worker
    try {
      const registration = await this.registerServiceWorker();
      console.log('Service Worker zarejestrowany:', registration);

      // Sprawdź istniejącą subskrypcję
      this.subscription = await registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('Powiadomienia już aktywne');
        return true;
      }

      // Jeśli użytkownik ma włączone powiadomienia w ustawieniach
      if (this.notificationSettings.enabled) {
        await this.requestPermission();
      }

      return true;
    } catch (error) {
      console.error('Błąd inicjalizacji powiadomień:', error);
      return false;
    }
  }

  /**
   * Rejestruje Service Worker
   */
  async registerServiceWorker() {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return registration;
  }

  /**
   * Prosi o pozwolenie na powiadomienia
   */
  async requestPermission() {
    if (this.permission === 'granted') {
      await this.subscribeUser();
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Powiadomienia zostały zablokowane');
      return false;
    }

    // Poproś o pozwolenie
    const permission = await Notification.requestPermission();
    this.permission = permission;

    if (permission === 'granted') {
      await this.subscribeUser();
      return true;
    }

    return false;
  }

  /**
   * Subskrybuje użytkownika do powiadomień push
   */
  async subscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      this.subscription = subscription;
      
      // Zapisz subskrypcję na serwerze
      await this.saveSubscription(subscription);
      
      console.log('Użytkownik zasubskrybowany:', subscription);
      return subscription;
    } catch (error) {
      console.error('Błąd subskrypcji:', error);
      throw error;
    }
  }

  /**
   * Anuluje subskrypcję powiadomień
   */
  async unsubscribe() {
    if (!this.subscription) return false;

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscription();
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Błąd anulowania subskrypcji:', error);
      return false;
    }
  }

  /**
   * Wysyła lokalne powiadomienie
   */
  async showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Brak pozwolenia na powiadomienia');
      return false;
    }

    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      tag: 'quizmaster-notification',
      requireInteraction: false,
      ...options
    };

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, defaultOptions);
      return true;
    } catch (error) {
      console.error('Błąd wyświetlania powiadomienia:', error);
      return false;
    }
  }

  /**
   * Planuje powiadomienia
   */
  scheduleNotifications() {
    const settings = this.notificationSettings;
    const exams = this.getUpcomingExams();
    
    exams.forEach(exam => {
      // Powiadomienie dzień przed
      if (settings.dayBefore) {
        const dayBefore = new Date(exam.date);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(settings.dayBeforeTime.hours);
        dayBefore.setMinutes(settings.dayBeforeTime.minutes);
        
        this.scheduleNotification({
          title: 'Jutro egzamin!',
          body: `Jutro o ${exam.time} odbędzie się egzamin: ${exam.title}`,
          tag: `exam-reminder-${exam.id}-day`,
          timestamp: dayBefore.getTime(),
          data: { examId: exam.id, type: 'day-before' }
        });
      }

      // Powiadomienie godzinę przed
      if (settings.hourBefore) {
        const hourBefore = new Date(exam.date);
        hourBefore.setHours(hourBefore.getHours() - 1);
        
        this.scheduleNotification({
          title: 'Egzamin za godzinę!',
          body: `Za godzinę rozpocznie się egzamin: ${exam.title}`,
          tag: `exam-reminder-${exam.id}-hour`,
          timestamp: hourBefore.getTime(),
          data: { examId: exam.id, type: 'hour-before' }
        });
      }
    });
  }

  /**
   * Wysyła powiadomienia o wynikach
   */
  async notifyResults(examId, score) {
    const exam = this.getExamData(examId);
    const isPassed = score >= 50;

    await this.showNotification(
      isPassed ? '🎉 Gratulacje!' : '📚 Spróbuj ponownie',
      {
        body: `Twój wynik z egzaminu "${exam.title}": ${score}%`,
        icon: isPassed ? '/icons/success.png' : '/icons/retry.png',
        tag: `result-${examId}`,
        data: {
          examId,
          score,
          type: 'result'
        },
        actions: [
          {
            action: 'view',
            title: 'Zobacz szczegóły'
          },
          {
            action: 'share',
            title: 'Udostępnij'
          }
        ]
      }
    );
  }

  /**
   * Powiadomienia o osiągnięciach
   */
  async notifyAchievement(achievement) {
    await this.showNotification(
      '🏆 Nowe osiągnięcie!',
      {
        body: `Zdobyłeś osiągnięcie: ${achievement.name}`,
        icon: achievement.icon || '/icons/achievement.png',
        tag: `achievement-${achievement.id}`,
        data: {
          achievementId: achievement.id,
          type: 'achievement'
        },
        actions: [
          {
            action: 'view',
            title: 'Zobacz'
          }
        ]
      }
    );
  }

  /**
   * Powiadomienia dla rodziców
   */
  async notifyParent(event, studentData) {
    const templates = {
      exam_completed: {
        title: 'Dziecko ukończyło egzamin',
        body: `${studentData.name} właśnie ukończył(a) egzamin "${event.examTitle}" z wynikiem ${event.score}%`
      },
      achievement_unlocked: {
        title: 'Nowe osiągnięcie!',
        body: `${studentData.name} zdobył(a) osiągnięcie: ${event.achievementName}`
      },
      weekly_report: {
        title: 'Tygodniowy raport',
        body: `Podsumowanie tygodnia dla ${studentData.name} jest dostępne`
      },
      low_score_alert: {
        title: '⚠️ Niski wynik',
        body: `${studentData.name} uzyskał(a) ${event.score}% z egzaminu "${event.examTitle}". Może potrzebuje pomocy?`
      }
    };

    const template = templates[event.type];
    if (!template) return;

    await this.showNotification(template.title, {
      body: template.body,
      tag: `parent-${event.type}-${Date.now()}`,
      data: {
        type: 'parent-notification',
        eventType: event.type,
        studentId: studentData.id
      }
    });
  }

  /**
   * Ustawienia powiadomień
   */
  loadSettings() {
    const defaultSettings = {
      enabled: false,
      dayBefore: true,
      dayBeforeTime: { hours: 18, minutes: 0 },
      hourBefore: true,
      results: true,
      achievements: true,
      parentNotifications: false,
      soundEnabled: true,
      vibrationEnabled: true
    };

    const saved = localStorage.getItem('notificationSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }

  saveSettings(settings) {
    this.notificationSettings = settings;
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }

  /**
   * Komponent ustawień powiadomień
   */
  createSettingsComponent() {
    const settings = this.notificationSettings;
    
    return `
      <div class="notification-settings">
        <h3>Ustawienia powiadomień</h3>
        
        <div class="setting-item">
          <label class="switch">
            <input type="checkbox" id="notifications-enabled" 
                   ${settings.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <span>Włącz powiadomienia</span>
        </div>

        <div class="settings-group ${settings.enabled ? '' : 'disabled'}">
          <h4>Przypomnienia o egzaminach</h4>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-day-before" 
                     ${settings.dayBefore ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Dzień przed egzaminem</span>
            <input type="time" id="day-before-time" 
                   value="${String(settings.dayBeforeTime.hours).padStart(2, '0')}:${String(settings.dayBeforeTime.minutes).padStart(2, '0')}">
          </div>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-hour-before" 
                     ${settings.hourBefore ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Godzinę przed egzaminem</span>
          </div>
        </div>

        <div class="settings-group ${settings.enabled ? '' : 'disabled'}">
          <h4>Inne powiadomienia</h4>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-results" 
                     ${settings.results ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Wyniki egzaminów</span>
          </div>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-achievements" 
                     ${settings.achievements ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Nowe osiągnięcia</span>
          </div>
          
          <div class="setting-item">
            <label class="switch">
              <input type="checkbox" id="notify-sound" 
                     ${settings.soundEnabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>Dźwięk powiadomień</span>
          </div>
        </div>

        <button class="btn-primary" onclick="pushNotifications.testNotification()">
          Testuj powiadomienie
        </button>
      </div>
    `;
  }

  /**
   * Testuje powiadomienie
   */
  async testNotification() {
    await this.showNotification(
      'Test powiadomienia 🔔',
      {
        body: 'To jest testowe powiadomienie z QuizMaster',
        tag: 'test-notification',
        requireInteraction: true,
        actions: [
          {
            action: 'confirm',
            title: 'Działa!'
          }
        ]
      }
    );
  }

  /**
   * Pomocnicze metody
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async saveSubscription(subscription) {
    // W prawdziwej aplikacji wysłać do serwera
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
  }

  async removeSubscription() {
    // W prawdziwej aplikacji usunąć z serwera
    localStorage.removeItem('pushSubscription');
  }

  getUpcomingExams() {
    const exams = JSON.parse(localStorage.getItem('scheduledExams') || '[]');
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    return exams.filter(exam => {
      const examDate = new Date(exam.date);
      return examDate >= now && examDate <= weekFromNow;
    });
  }

  getExamData(examId) {
    const exams = JSON.parse(localStorage.getItem('exams') || '[]');
    return exams.find(e => e.id === examId) || {};
  }

  scheduleNotification(notificationData) {
    // W prawdziwej aplikacji użyć Push API z serwerem
    // Tutaj symulacja z setTimeout
    const now = Date.now();
    const delay = notificationData.timestamp - now;
    
    if (delay > 0) {
      setTimeout(() => {
        this.showNotification(notificationData.title, {
          body: notificationData.body,
          tag: notificationData.tag,
          data: notificationData.data
        });
      }, delay);
    }
  }
}

// Service Worker dla obsługi powiadomień push
const serviceWorkerCode = `
// Service Worker - sw.js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nowe powiadomienie z QuizMaster',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'quizmaster-notification',
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'QuizMaster', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'view') {
    event.waitUntil(
      clients.openWindow('/results.html?examId=' + data.examId)
    );
  } else if (action === 'share') {
    // Implementacja udostępniania
  } else {
    // Domyślna akcja - otwórz aplikację
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Synchronizacja w tle
self.addEventListener('sync', event => {
  if (event.tag === 'sync-results') {
    event.waitUntil(syncResults());
  }
});

async function syncResults() {
  // Synchronizuj wyniki z serwerem
  console.log('Synchronizacja wyników...');
}
`;

// Eksportuj moduł
window.PushNotificationManager = PushNotificationManager;

// Style CSS dla powiadomień
const notificationStyles = `
<style>
.notification-settings {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  margin: 0 auto;
}

.notification-settings h3 {
  margin-bottom: 24px;
  color: var(--text-primary);
}

.notification-settings h4 {
  margin: 24px 0 16px;
  color: var(--text-secondary);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.settings-group {
  transition: opacity 0.3s;
}

.settings-group.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Switch toggle */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-primary);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

input[type="time"] {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 6px;
  margin-left: auto;
}

/* Notification badge */
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* Notification popup */
.notification-popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  min-width: 300px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  animation: slideIn 0.3s ease;
  z-index: 10000;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-popup.hiding {
  animation: slideOut 0.3s ease forwards;
}

@keyframes slideOut {
  to {
    transform: translateX(400px);
    opacity: 0;
  }
}

.notification-popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.notification-popup-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.notification-popup-title {
  font-weight: 600;
  color: var(--text-primary);
}

.notification-popup-body {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.notification-popup-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.notification-popup-actions button {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.notification-popup-actions .primary {
  background: var(--accent-primary);
  color: white;
}

.notification-popup-actions .secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.notification-popup-actions button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .notification-popup {
    left: 10px;
    right: 10px;
    top: 10px;
    min-width: auto;
  }
  
  .notification-settings {
    padding: 16px;
  }
  
  .setting-item {
    flex-wrap: wrap;
  }
  
  input[type="time"] {
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('notification-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'notification-styles';
  styleElement.innerHTML = notificationStyles;
  document.head.appendChild(styleElement.firstChild);
}

// Tworzenie pliku Service Worker
const createServiceWorkerFile = () => {
  const blob = new Blob([serviceWorkerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  
  // Informacja dla developera
  console.log(`
    ========================================
    Service Worker dla powiadomień push
    ========================================
    
    Aby włączyć powiadomienia push, utwórz plik sw.js w katalogu głównym
    z następującą zawartością:
    
    ${serviceWorkerCode}
    
    Oraz wygeneruj klucze VAPID:
    npm install -g web-push
    web-push generate-vapid-keys
    
    ========================================
  `);
};

// Wywołaj po załadowaniu
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createServiceWorkerFile);
} else {
  createServiceWorkerFile();
}