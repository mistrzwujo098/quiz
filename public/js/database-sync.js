// ===== MODUŁ SYNCHRONIZACJI Z BAZĄ DANYCH ONLINE =====
// Integracja z Supabase dla przechowywania danych w chmurze

class DatabaseSync {
  constructor() {
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.supabase = null;
    this.initialized = false;
    this.syncEnabled = false;
    this.offlineQueue = [];
    
    // Tabele w bazie danych
    this.tables = {
      questions: 'questions',
      exams: 'exams',
      results: 'results',
      users: 'users',
      groups: 'groups',
      achievements: 'achievements'
    };
  }

  /**
   * Inicjalizuje połączenie z Supabase
   */
  async initialize(config) {
    if (this.initialized) return;
    
    try {
      // Sprawdź konfigurację
      if (!config.supabaseUrl || !config.supabaseKey) {
        throw new Error('Brak konfiguracji Supabase');
      }
      
      this.supabaseUrl = config.supabaseUrl;
      this.supabaseKey = config.supabaseKey;
      
      // Załaduj bibliotekę Supabase jeśli nie jest załadowana
      if (typeof window.supabase === 'undefined') {
        await this.loadSupabaseLibrary();
      }
      
      // Utwórz klienta Supabase
      this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
      this.initialized = true;
      this.syncEnabled = true;
      
      // Rozpocznij synchronizację offline queue
      await this.processOfflineQueue();
      
      // Ustaw listener dla zmian online/offline
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      
      return true;
    } catch (error) {
      console.error('Błąd inicjalizacji bazy danych:', error);
      this.syncEnabled = false;
      return false;
    }
  }

  /**
   * Ładuje bibliotekę Supabase
   */
  async loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Nie można załadować biblioteki Supabase'));
      document.head.appendChild(script);
    });
  }

  /**
   * Synchronizuje zadania z bazą online
   */
  async syncQuestions(localQuestions) {
    if (!this.syncEnabled) {
      return { success: false, error: 'Synchronizacja wyłączona' };
    }
    
    try {
      // Pobierz istniejące zadania z bazy
      const { data: remoteQuestions, error: fetchError } = await this.supabase
        .from(this.tables.questions)
        .select('*');
      
      if (fetchError) throw fetchError;
      
      // Znajdź różnice
      const toUpload = [];
      const toUpdate = [];
      const localIds = new Set(localQuestions.map(q => q.id));
      const remoteIds = new Set(remoteQuestions?.map(q => q.id) || []);
      
      // Zadania do wgrania
      for (const question of localQuestions) {
        if (!remoteIds.has(question.id)) {
          toUpload.push(this.prepareQuestionForUpload(question));
        } else {
          // Sprawdź czy trzeba zaktualizować
          const remoteQuestion = remoteQuestions.find(q => q.id === question.id);
          if (this.hasQuestionChanged(question, remoteQuestion)) {
            toUpdate.push(this.prepareQuestionForUpload(question));
          }
        }
      }
      
      // Wgraj nowe zadania
      if (toUpload.length > 0) {
        const { error: uploadError } = await this.supabase
          .from(this.tables.questions)
          .insert(toUpload);
        
        if (uploadError) throw uploadError;
      }
      
      // Zaktualizuj istniejące
      if (toUpdate.length > 0) {
        for (const question of toUpdate) {
          const { error: updateError } = await this.supabase
            .from(this.tables.questions)
            .update(question)
            .eq('id', question.id);
          
          if (updateError) throw updateError;
        }
      }
      
      // Pobierz zadania, których nie ma lokalnie
      const toDownload = remoteQuestions?.filter(q => !localIds.has(q.id)) || [];
      
      return {
        success: true,
        uploaded: toUpload.length,
        updated: toUpdate.length,
        downloaded: toDownload.length,
        newQuestions: toDownload.map(q => this.parseQuestionFromDatabase(q))
      };
      
    } catch (error) {
      console.error('Błąd synchronizacji zadań:', error);
      
      // Dodaj do kolejki offline jeśli brak połączenia
      if (!navigator.onLine) {
        this.addToOfflineQueue('syncQuestions', localQuestions);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Przygotowuje zadanie do wgrania do bazy
   */
  prepareQuestionForUpload(question) {
    return {
      id: question.id,
      content: question.tresc,
      type: question.typ,
      answers: question.odpowiedzi,
      correct_answer: question.poprawna,
      points: question.punkty,
      level: question.poziom,
      subject: question.przedmiot,
      topic: question.temat,
      image: question.obrazek,
      additional_images: question.dodatkoweObrazki,
      subtasks: question.podpunkty,
      metadata: {
        created_at: question.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        variants: question.warianty,
        solution: question.rozwiazanie
      }
    };
  }

  /**
   * Parsuje zadanie z bazy danych do formatu lokalnego
   */
  parseQuestionFromDatabase(dbQuestion) {
    return {
      id: dbQuestion.id,
      tresc: dbQuestion.content,
      typ: dbQuestion.type,
      odpowiedzi: dbQuestion.answers || [],
      poprawna: dbQuestion.correct_answer,
      punkty: dbQuestion.points,
      poziom: dbQuestion.level,
      przedmiot: dbQuestion.subject,
      temat: dbQuestion.topic,
      obrazek: dbQuestion.image,
      dodatkoweObrazki: dbQuestion.additional_images,
      podpunkty: dbQuestion.subtasks,
      warianty: dbQuestion.metadata?.variants,
      rozwiazanie: dbQuestion.metadata?.solution,
      createdAt: dbQuestion.metadata?.created_at,
      updatedAt: dbQuestion.metadata?.updated_at
    };
  }

  /**
   * Sprawdza czy zadanie się zmieniło
   */
  hasQuestionChanged(local, remote) {
    const localHash = this.generateQuestionHash(local);
    const remoteHash = this.generateQuestionHash(this.parseQuestionFromDatabase(remote));
    return localHash !== remoteHash;
  }

  /**
   * Generuje hash zadania do porównania
   */
  generateQuestionHash(question) {
    const str = JSON.stringify({
      tresc: question.tresc,
      odpowiedzi: question.odpowiedzi,
      poprawna: question.poprawna,
      punkty: question.punkty
    });
    
    // Prosty hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Synchronizuje wyniki egzaminów
   */
  async syncResults(localResults) {
    if (!this.syncEnabled) return { success: false };
    
    try {
      const toUpload = localResults.map(result => ({
        id: result.id,
        exam_id: result.examId,
        user_id: result.userId,
        score: result.score,
        correct_answers: result.correctAnswers,
        total_questions: result.totalQuestions,
        completed_at: result.completedAt,
        duration: result.duration,
        answers: result.answers,
        metadata: {
          exam_title: result.examTitle,
          subject: result.subject
        }
      }));
      
      const { error } = await this.supabase
        .from(this.tables.results)
        .upsert(toUpload, { onConflict: 'id' });
      
      if (error) throw error;
      
      return { success: true, synced: toUpload.length };
      
    } catch (error) {
      console.error('Błąd synchronizacji wyników:', error);
      
      if (!navigator.onLine) {
        this.addToOfflineQueue('syncResults', localResults);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronizuje egzaminy
   */
  async syncExams(localExams) {
    if (!this.syncEnabled) return { success: false };
    
    try {
      const toUpload = localExams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        questions: exam.questions,
        time_limit: exam.timeLimit,
        created_by: exam.createdBy,
        created_at: exam.createdAt,
        subject: exam.subject,
        level: exam.level,
        groups: exam.groups,
        active: exam.active,
        scheduled_at: exam.scheduledAt,
        metadata: {
          attempts_allowed: exam.attemptsAllowed,
          show_results: exam.showResults,
          randomize: exam.randomize
        }
      }));
      
      const { error } = await this.supabase
        .from(this.tables.exams)
        .upsert(toUpload, { onConflict: 'id' });
      
      if (error) throw error;
      
      return { success: true, synced: toUpload.length };
      
    } catch (error) {
      console.error('Błąd synchronizacji egzaminów:', error);
      
      if (!navigator.onLine) {
        this.addToOfflineQueue('syncExams', localExams);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Pobiera wszystkie dane z bazy online
   */
  async fetchAllData() {
    if (!this.syncEnabled) return null;
    
    try {
      const [questions, exams, results, users] = await Promise.all([
        this.supabase.from(this.tables.questions).select('*'),
        this.supabase.from(this.tables.exams).select('*'),
        this.supabase.from(this.tables.results).select('*'),
        this.supabase.from(this.tables.users).select('*')
      ]);
      
      return {
        questions: questions.data?.map(q => this.parseQuestionFromDatabase(q)) || [],
        exams: exams.data || [],
        results: results.data || [],
        users: users.data || []
      };
      
    } catch (error) {
      console.error('Błąd pobierania danych:', error);
      return null;
    }
  }

  /**
   * Automatyczna synchronizacja
   */
  async autoSync() {
    if (!this.syncEnabled || !navigator.onLine) return;
    
    console.log('Rozpoczynam automatyczną synchronizację...');
    
    try {
      // Synchronizuj wszystkie dane lokalne
      const localData = {
        questions: JSON.parse(localStorage.getItem('zadaniaDB') || '[]'),
        exams: JSON.parse(localStorage.getItem('exams') || '[]'),
        results: JSON.parse(localStorage.getItem('examResults') || '[]')
      };
      
      const results = await Promise.all([
        this.syncQuestions(localData.questions),
        this.syncExams(localData.exams),
        this.syncResults(localData.results)
      ]);
      
      console.log('Synchronizacja zakończona:', results);
      
      return results;
      
    } catch (error) {
      console.error('Błąd automatycznej synchronizacji:', error);
      return null;
    }
  }

  /**
   * Dodaje zadanie do kolejki offline
   */
  addToOfflineQueue(action, data) {
    this.offlineQueue.push({
      action,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Zapisz kolejkę w localStorage
    localStorage.setItem('offlineSyncQueue', JSON.stringify(this.offlineQueue));
  }

  /**
   * Przetwarza kolejkę offline
   */
  async processOfflineQueue() {
    if (!navigator.onLine || this.offlineQueue.length === 0) return;
    
    console.log('Przetwarzam kolejkę offline...');
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      try {
        switch (item.action) {
          case 'syncQuestions':
            await this.syncQuestions(item.data);
            break;
          case 'syncExams':
            await this.syncExams(item.data);
            break;
          case 'syncResults':
            await this.syncResults(item.data);
            break;
        }
      } catch (error) {
        console.error('Błąd przetwarzania elementu kolejki:', error);
        // Dodaj z powrotem do kolejki
        this.offlineQueue.push(item);
      }
    }
    
    // Zapisz zaktualizowaną kolejkę
    localStorage.setItem('offlineSyncQueue', JSON.stringify(this.offlineQueue));
  }

  /**
   * Obsługa powrotu online
   */
  async handleOnline() {
    console.log('Połączenie przywrócone - synchronizuję dane...');
    this.syncEnabled = true;
    await this.processOfflineQueue();
    await this.autoSync();
  }

  /**
   * Obsługa przejścia offline
   */
  handleOffline() {
    console.log('Brak połączenia - przełączam na tryb offline');
    this.syncEnabled = false;
  }

  /**
   * Eksportuje konfigurację do użycia w środowisku produkcyjnym
   */
  generateProductionConfig() {
    return {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_ANON_KEY || '',
      autoSync: true,
      syncInterval: 300000, // 5 minut
      offlineMode: true
    };
  }

  /**
   * Tworzy schemat bazy danych (SQL dla Supabase)
   */
  getDatabaseSchema() {
    return `
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

-- Tabela użytkowników
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  groups JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_level ON questions(level);
CREATE INDEX idx_exams_subject ON exams(subject);
CREATE INDEX idx_exams_active ON exams(active);
CREATE INDEX idx_results_user ON results(user_id);
CREATE INDEX idx_results_exam ON results(exam_id);

-- Row Level Security (RLS)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Polityki dostępu (przykładowe)
CREATE POLICY "Wszyscy mogą czytać pytania" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Nauczyciele mogą modyfikować pytania" ON questions
  FOR ALL USING (auth.jwt() ->> 'role' = 'teacher');
    `;
  }
}

// Eksportuj moduł
window.DatabaseSync = DatabaseSync;

// Automatyczna inicjalizacja jeśli są dane konfiguracyjne
if (window.SUPABASE_CONFIG) {
  const dbSync = new DatabaseSync();
  dbSync.initialize(window.SUPABASE_CONFIG).then(success => {
    if (success) {
      console.log('Synchronizacja bazy danych włączona');
      // Ustaw automatyczną synchronizację co 5 minut
      setInterval(() => dbSync.autoSync(), 300000);
    }
  });
}