// ===== MODUŁ ULEPSZEŃ UI/UX =====
// Poprawki responsywności, animacje, dostępność

class UIImprovements {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'dark';
    this.animations = localStorage.getItem('animations') !== 'false';
    this.fontSize = localStorage.getItem('fontSize') || 'normal';
    this.highContrast = localStorage.getItem('highContrast') === 'true';
  }

  /**
   * Inicjalizuje wszystkie ulepszenia UI
   */
  init() {
    this.applyTheme();
    this.setupResponsiveHelpers();
    this.enhanceAccessibility();
    this.setupAnimations();
    this.setupKeyboardShortcuts();
    this.improveFormValidation();
    this.addLoadingStates();
    this.setupTooltips();
    this.enhanceMobileExperience();
  }

  /**
   * Stosuje wybrany motyw
   */
  applyTheme() {
    const themes = {
      dark: {
        '--bg-primary': '#0a0a0a',
        '--bg-secondary': '#111111',
        '--bg-tertiary': '#1a1a1a',
        '--text-primary': '#ffffff',
        '--text-secondary': '#a0a0a0',
        '--accent-primary': '#7c3aed',
        '--accent-secondary': '#a855f7'
      },
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8f9fa',
        '--bg-tertiary': '#e9ecef',
        '--text-primary': '#212529',
        '--text-secondary': '#6c757d',
        '--accent-primary': '#6f42c1',
        '--accent-secondary': '#7c3aed'
      },
      highContrast: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#1a1a1a',
        '--bg-tertiary': '#2a2a2a',
        '--text-primary': '#ffffff',
        '--text-secondary': '#ffff00',
        '--accent-primary': '#00ff00',
        '--accent-secondary': '#00ffff'
      }
    };

    const selectedTheme = this.highContrast ? themes.highContrast : themes[this.theme];
    
    Object.entries(selectedTheme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    // Dodaj klasę do body
    document.body.className = `theme-${this.theme} ${this.highContrast ? 'high-contrast' : ''}`;
  }

  /**
   * Konfiguruje pomocniki responsywności
   */
  setupResponsiveHelpers() {
    // Wykryj urządzenie
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('is-tablet', isTablet);

    // Obsługa orientacji
    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      document.body.classList.toggle('is-landscape', isLandscape);
      document.body.classList.toggle('is-portrait', !isLandscape);
    };

    window.addEventListener('resize', handleOrientation);
    handleOrientation();

    // Viewport height fix dla mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setVH);
    setVH();
  }

  /**
   * Poprawia dostępność
   */
  enhanceAccessibility() {
    // Skip links - usunięte bo powoduje duplikację
    // const skipLink = document.createElement('a');
    // skipLink.href = '#main-content';
    // skipLink.className = 'skip-link';
    // skipLink.textContent = 'Przejdź do głównej treści';
    // document.body.insertBefore(skipLink, document.body.firstChild);

    // ARIA live regions
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);

    // Focus trap dla modali
    this.setupFocusTrap();

    // Ulepszone etykiety formularzy
    this.enhanceFormLabels();
  }

  /**
   * Konfiguruje animacje
   */
  setupAnimations() {
    if (!this.animations) {
      document.body.classList.add('no-animations');
      return;
    }

    // Intersection Observer dla animacji przy przewijaniu
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Obserwuj elementy z klasą animate-on-scroll
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  /**
   * Konfiguruje skróty klawiaturowe
   */
  setupKeyboardShortcuts() {
    const shortcuts = {
      'ctrl+s': () => this.saveCurrentWork(),
      'ctrl+/': () => this.toggleSearch(),
      'ctrl+k': () => this.openCommandPalette(),
      'escape': () => this.closeModals(),
      'alt+t': () => this.toggleTheme(),
      'alt+h': () => this.showHelp()
    };

    document.addEventListener('keydown', (e) => {
      const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.altKey ? 'alt+' : ''}${e.key.toLowerCase()}`;
      
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
  }

  /**
   * Ulepsza walidację formularzy
   */
  improveFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        // Walidacja w czasie rzeczywistym
        input.addEventListener('blur', () => this.validateInput(input));
        
        // Wizualne wskazówki
        input.addEventListener('focus', () => {
          this.showInputHint(input);
        });
      });

      // Obsługa wysyłania formularza
      form.addEventListener('submit', (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
          this.showFormErrors(form);
        }
      });
    });
  }

  /**
   * Dodaje stany ładowania
   */
  addLoadingStates() {
    // Globalny loader
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader hidden';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p class="loader-text">Ładowanie...</p>
      </div>
    `;
    document.body.appendChild(loader);

    // Skeleton screens zostaną dodane później jeśli będą potrzebne
    // this.createSkeletonScreens();
  }

  /**
   * Konfiguruje tooltips
   */
  setupTooltips() {
    const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
    
    tooltipTriggers.forEach(trigger => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = trigger.getAttribute('data-tooltip');
      
      trigger.addEventListener('mouseenter', (e) => {
        document.body.appendChild(tooltip);
        this.positionTooltip(tooltip, trigger);
        tooltip.classList.add('show');
      });
      
      trigger.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.remove(), 300);
      });
    });
  }

  /**
   * Ulepsza doświadczenie mobilne
   */
  enhanceMobileExperience() {
    // Touch feedback
    document.addEventListener('touchstart', (e) => {
      if (e.target.classList.contains('touchable')) {
        e.target.classList.add('touch-active');
      }
    });

    document.addEventListener('touchend', (e) => {
      if (e.target.classList.contains('touchable')) {
        setTimeout(() => {
          e.target.classList.remove('touch-active');
        }, 150);
      }
    });

    // Swipe gestures
    this.setupSwipeGestures();

    // Pull to refresh
    this.setupPullToRefresh();
  }

  /**
   * Tworzy komponent przełącznika motywu
   */
  createThemeToggle() {
    const toggle = document.createElement('div');
    toggle.className = 'theme-toggle';
    toggle.innerHTML = `
      <button class="theme-toggle-btn" aria-label="Zmień motyw">
        <i class="fas fa-moon" data-theme="dark"></i>
        <i class="fas fa-sun" data-theme="light"></i>
      </button>
    `;

    toggle.querySelector('button').addEventListener('click', () => {
      this.toggleTheme();
    });

    return toggle;
  }

  /**
   * Tworzy komponent ustawień dostępności
   */
  createAccessibilityPanel() {
    const panel = document.createElement('div');
    panel.className = 'accessibility-panel';
    panel.innerHTML = `
      <h3>Ustawienia dostępności</h3>
      <div class="setting">
        <label>
          <input type="checkbox" id="high-contrast" ${this.highContrast ? 'checked' : ''}>
          Wysoki kontrast
        </label>
      </div>
      <div class="setting">
        <label>
          <input type="checkbox" id="animations" ${this.animations ? 'checked' : ''}>
          Animacje
        </label>
      </div>
      <div class="setting">
        <label>Rozmiar czcionki</label>
        <select id="font-size">
          <option value="small" ${this.fontSize === 'small' ? 'selected' : ''}>Mały</option>
          <option value="normal" ${this.fontSize === 'normal' ? 'selected' : ''}>Normalny</option>
          <option value="large" ${this.fontSize === 'large' ? 'selected' : ''}>Duży</option>
          <option value="xlarge" ${this.fontSize === 'xlarge' ? 'selected' : ''}>Bardzo duży</option>
        </select>
      </div>
    `;

    // Event listeners
    panel.querySelector('#high-contrast').addEventListener('change', (e) => {
      this.highContrast = e.target.checked;
      localStorage.setItem('highContrast', this.highContrast);
      this.applyTheme();
    });

    panel.querySelector('#animations').addEventListener('change', (e) => {
      this.animations = e.target.checked;
      localStorage.setItem('animations', this.animations);
      document.body.classList.toggle('no-animations', !this.animations);
    });

    panel.querySelector('#font-size').addEventListener('change', (e) => {
      this.fontSize = e.target.value;
      localStorage.setItem('fontSize', this.fontSize);
      document.body.className = document.body.className.replace(/font-size-\w+/, '');
      document.body.classList.add(`font-size-${this.fontSize}`);
    });

    return panel;
  }

  /**
   * Helpers
   */
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
    this.announce(`Motyw zmieniony na ${this.theme === 'dark' ? 'ciemny' : 'jasny'}`);
  }

  announce(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 3000);
    }
  }

  showLoader(text = 'Ładowanie...') {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.querySelector('.loader-text').textContent = text;
      loader.classList.remove('hidden');
    }
  }

  hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  }

  positionTooltip(tooltip, trigger) {
    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;
    
    // Sprawdź czy nie wychodzi poza viewport
    if (top < 0) {
      top = rect.bottom + 10;
    }
    if (left < 0) {
      left = 10;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  setupSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    });
    
    this.handleSwipe = () => {
      const swipeThreshold = 50;
      const diff = touchEndX - touchStartX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe right
          document.dispatchEvent(new CustomEvent('swiperight'));
        } else {
          // Swipe left
          document.dispatchEvent(new CustomEvent('swipeleft'));
        }
      }
    };
  }

  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    
    const pullToRefresh = document.createElement('div');
    pullToRefresh.className = 'pull-to-refresh';
    pullToRefresh.innerHTML = '<i class="fas fa-sync"></i>';
    document.body.appendChild(pullToRefresh);
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      
      currentY = e.touches[0].pageY;
      const diff = currentY - startY;
      
      if (diff > 0 && diff < 150) {
        pullToRefresh.style.transform = `translateY(${diff}px) rotate(${diff * 2}deg)`;
        pullToRefresh.style.opacity = diff / 150;
      }
    });
    
    document.addEventListener('touchend', () => {
      if (!pulling) return;
      
      const diff = currentY - startY;
      if (diff > 100) {
        location.reload();
      } else {
        pullToRefresh.style.transform = '';
        pullToRefresh.style.opacity = '0';
      }
      
      pulling = false;
    });
  }

  /**
   * Konfiguruje pułapkę fokusa dla modali
   */
  setupFocusTrap() {
    this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal:not(.hidden), .fixed:not(.hidden)');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  /**
   * Pułapka fokusa w elemencie
   */
  trapFocus(e, element) {
    const focusables = element.querySelectorAll(this.focusableElements);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Ulepsza etykiety formularzy
   */
  enhanceFormLabels() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.id) {
        input.id = `input-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Znajdź etykietę
      let label = input.closest('label');
      if (!label) {
        label = document.querySelector(`label[for="${input.id}"]`);
      }
      
      // Dodaj wymagane atrybuty ARIA
      if (input.hasAttribute('required')) {
        input.setAttribute('aria-required', 'true');
      }
      
      // Dodaj opisy błędów
      const errorId = `${input.id}-error`;
      input.setAttribute('aria-describedby', errorId);
    });
  }

  /**
   * Sprawdza poprawność pola
   */
  validateInput(input) {
    const errorEl = document.getElementById(`${input.id}-error`);
    if (!errorEl) return;
    
    if (!input.validity.valid) {
      errorEl.textContent = input.validationMessage;
      errorEl.classList.remove('hidden');
      input.setAttribute('aria-invalid', 'true');
    } else {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      input.setAttribute('aria-invalid', 'false');
    }
  }
}

// Eksportuj moduł
window.UIImprovements = UIImprovements;

// Style CSS dla ulepszeń
const uiStyles = `
<style>
/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--accent-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Global loader */
.global-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.3s;
}

.global-loader.hidden {
  opacity: 0;
  pointer-events: none;
}

.loader-content {
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Tooltip */
.tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 10000;
}

.tooltip.show {
  opacity: 1;
}

/* Theme toggle */
.theme-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.theme-toggle-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.theme-toggle-btn:hover {
  transform: scale(1.1);
}

.theme-toggle-btn i {
  font-size: 20px;
}

body.theme-dark .fa-sun,
body.theme-light .fa-moon {
  display: none;
}

/* Accessibility panel */
.accessibility-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  min-width: 300px;
  z-index: 1001;
}

.accessibility-panel h3 {
  margin-bottom: 16px;
  color: var(--text-primary);
}

.accessibility-panel .setting {
  margin-bottom: 16px;
}

.accessibility-panel label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.accessibility-panel select,
.accessibility-panel input[type="checkbox"] {
  margin-left: 8px;
}

/* Font sizes */
body.font-size-small { font-size: 14px; }
body.font-size-normal { font-size: 16px; }
body.font-size-large { font-size: 18px; }
body.font-size-xlarge { font-size: 20px; }

/* High contrast mode */
body.high-contrast {
  filter: contrast(2);
}

body.high-contrast .btn-primary {
  border: 2px solid var(--accent-primary);
}

/* No animations */
body.no-animations * {
  animation: none !important;
  transition: none !important;
}

/* Touch feedback */
.touchable {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.touch-active {
  transform: scale(0.95);
  opacity: 0.7;
}

/* Pull to refresh */
.pull-to-refresh {
  position: fixed;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: none;
  z-index: 9999;
}

/* Animations */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s, transform 0.6s;
}

.animate-on-scroll.animate-in {
  opacity: 1;
  transform: translateY(0);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }
  
  .card-modern {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  
  .modal {
    margin: 16px;
    max-height: calc(100vh - 32px);
  }
  
  table {
    font-size: 14px;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    margin-bottom: 8px;
  }
}

/* Landscape mode adjustments */
@media (max-height: 500px) and (orientation: landscape) {
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .sidebar {
    position: fixed;
    height: 100vh;
    overflow-y: auto;
  }
  
  .main-content {
    margin-left: 250px;
  }
}

/* Viewport height fix */
.full-height {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
}

/* Skeleton screens */
.skeleton {
  background: linear-gradient(90deg, 
    var(--bg-secondary) 25%, 
    var(--bg-tertiary) 50%, 
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.skeleton-button {
  height: 40px;
  width: 120px;
  border-radius: 8px;
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('ui-improvements-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'ui-improvements-styles';
  styleElement.innerHTML = uiStyles;
  document.head.appendChild(styleElement.firstChild);
}

// Automatyczna inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIImprovements();
  ui.init();
  window.uiImprovements = ui;
});