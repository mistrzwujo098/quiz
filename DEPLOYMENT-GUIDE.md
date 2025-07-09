# Przewodnik Wdrożenia QuizMaster

## Spis treści
1. [Przygotowanie do wdrożenia](#przygotowanie)
2. [Konfiguracja Supabase](#supabase)
3. [Wdrożenie na Netlify](#netlify)
4. [Wdrożenie na Vercel](#vercel)
5. [Konfiguracja środowiska](#environment)
6. [Testowanie](#testing)

## Przygotowanie do wdrożenia {#przygotowanie}

### 1. Wymagania
- Konto GitHub
- Konto Supabase (darmowe)
- Konto Netlify lub Vercel (darmowe)
- Klucz API Gemini (opcjonalny, dla AI)

### 2. Przygotowanie kodu
```bash
# Sklonuj repozytorium
git clone [your-repo-url]
cd quizmaster

# Zainstaluj zależności
npm install
cd server && npm install && cd ..

# Przetestuj lokalnie
npm start
```

## Konfiguracja Supabase {#supabase}

### 1. Utwórz projekt Supabase
1. Wejdź na https://supabase.com
2. Utwórz nowy projekt
3. Zapisz URL i klucz anon

### 2. Utwórz schemat bazy danych
W SQL Editor wykonaj:

```sql
-- Tabela pytań
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  answers JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  level TEXT,
  subject TEXT,
  topic TEXT,
  image TEXT,
  additional_images JSONB,
  subtasks JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela egzaminów
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  time_limit INTEGER,
  created_by TEXT,
  subject TEXT,
  level TEXT,
  groups JSONB,
  active BOOLEAN DEFAULT true,
  scheduled_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela wyników
CREATE TABLE results (
  id TEXT PRIMARY KEY,
  exam_id TEXT REFERENCES exams(id),
  user_id TEXT,
  score DECIMAL(5,2),
  correct_answers INTEGER,
  total_questions INTEGER,
  completed_at TIMESTAMPTZ,
  duration INTEGER,
  answers JSONB,
  metadata JSONB
);

-- Indeksy
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_exams_active ON exams(active);
CREATE INDEX idx_results_user ON results(user_id);
```

### 3. Konfiguracja RLS (Row Level Security)
```sql
-- Włącz RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Polityki publicznego odczytu
CREATE POLICY "Public read questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Public read active exams" ON exams
  FOR SELECT USING (active = true);
```

## Wdrożenie na Netlify {#netlify}

### 1. Połącz z GitHub
1. Zaloguj się na https://netlify.com
2. Kliknij "New site from Git"
3. Wybierz repozytorium

### 2. Konfiguracja budowania
- Build command: (zostaw puste)
- Publish directory: `.`

### 3. Zmienne środowiskowe
W Settings > Environment variables dodaj:
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Dodaj plik konfiguracyjny
Plik `netlify.toml` jest już w repozytorium.

### 5. Deploy
Kliknij "Deploy site"

## Wdrożenie na Vercel {#vercel}

### 1. Import projektu
1. Zaloguj się na https://vercel.com
2. Kliknij "Import Project"
3. Wybierz repozytorium GitHub

### 2. Konfiguracja
- Framework Preset: Other
- Build Command: (zostaw puste)
- Output Directory: `.`

### 3. Zmienne środowiskowe
Dodaj w panelu:
```
SUPABASE_URL
SUPABASE_ANON_KEY
GEMINI_API_KEY
```

### 4. Deploy
Kliknij "Deploy"

## Konfiguracja środowiska {#environment}

### 1. Plik konfiguracyjny (publiczny)
Utwórz `js/config.js`:
```javascript
window.APP_CONFIG = {
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  },
  features: {
    aiGeneration: true,
    onlineSync: true,
    offlineMode: true
  }
};
```

### 2. Dodaj do index.html
```html
<script src="js/config.js"></script>
<script src="js/database-sync.js"></script>
```

### 3. Inicjalizacja w aplikacji
```javascript
// W głównym komponencie React
useEffect(() => {
  if (window.APP_CONFIG?.supabase) {
    const dbSync = new DatabaseSync();
    dbSync.initialize(window.APP_CONFIG.supabase);
  }
}, []);
```

## Testowanie {#testing}

### 1. Sprawdź połączenie z bazą
```javascript
// W konsoli przeglądarki
const dbSync = new DatabaseSync();
await dbSync.initialize({
  supabaseUrl: 'your-url',
  supabaseKey: 'your-key'
});
const data = await dbSync.fetchAllData();
console.log(data);
```

### 2. Test synchronizacji
1. Dodaj zadanie lokalnie
2. Sprawdź czy pojawiło się w Supabase
3. Wyłącz internet i dodaj kolejne
4. Włącz internet - powinno się zsynchronizować

### 3. Test wydajności
- Sprawdź czas ładowania
- Test z dużą ilością danych
- Test na słabym połączeniu

## Dodatkowe uwagi

### Bezpieczeństwo
1. Używaj tylko klucza `anon` (publiczny)
2. Wrażliwe operacje przez Edge Functions
3. Walidacja po stronie Supabase

### Optymalizacja
1. Lazy loading dla obrazków
2. Kompresja zasobów
3. CDN dla bibliotek

### Monitoring
1. Netlify Analytics / Vercel Analytics
2. Supabase Dashboard
3. Sentry dla błędów

### Backup
1. Automatyczny backup Supabase
2. Eksport lokalny co tydzień
3. Wersjonowanie w Git

## Problemy i rozwiązania

### CORS
Jeśli występują błędy CORS:
1. Sprawdź konfigurację w Supabase
2. Dodaj domenę do allowed origins
3. Użyj proxy przez Edge Functions

### Limity
- Netlify: 100GB transfer/miesiąc
- Vercel: 100GB transfer/miesiąc
- Supabase: 500MB storage, 2GB transfer

### Wsparcie
- Dokumentacja: `/docs`
- Issues: GitHub
- Email: support@quizmaster.pl