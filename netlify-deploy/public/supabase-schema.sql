-- Schemat bazy danych QuizMaster dla Supabase

-- Enum dla ról użytkowników
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'parent');

-- Tabela użytkowników (rozszerza auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    full_name TEXT,
    imie TEXT,
    nazwisko TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela uczniów (dodatkowe dane)
CREATE TABLE public.students (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    klasa TEXT NOT NULL,
    numer_dziennika INTEGER,
    data_urodzenia DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela nauczycieli (dodatkowe dane)
CREATE TABLE public.teachers (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    przedmioty TEXT[] DEFAULT '{}',
    klasy TEXT[] DEFAULT '{}',
    tytul TEXT,
    telefon TEXT,
    gabinet_numer TEXT,
    godziny_konsultacji TEXT,
    wychowawca_klasy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela rodziców (dodatkowe dane)
CREATE TABLE public.parents (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    telefon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela relacji rodzic-dziecko
CREATE TABLE public.parent_child_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
);

-- Tabela quizów
CREATE TABLE public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nazwa TEXT NOT NULL,
    przedmiot TEXT NOT NULL,
    klasa TEXT,
    nauczyciel_id UUID REFERENCES public.profiles(id),
    czas_trwania INTEGER DEFAULT 45,
    punkty INTEGER DEFAULT 0,
    aktywny BOOLEAN DEFAULT true,
    data_utworzenia TIMESTAMPTZ DEFAULT NOW(),
    data_aktywacji TIMESTAMPTZ,
    data_zakonczenia TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela pytań
CREATE TABLE public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    tresc TEXT NOT NULL,
    typ TEXT CHECK (typ IN ('otwarte', 'jednokrotny', 'wielokrotny')),
    punkty INTEGER DEFAULT 1,
    odpowiedz_wzorcowa TEXT,
    kryteria_oceniania TEXT[],
    wskazowki_ai TEXT,
    kolejnosc INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela odpowiedzi do pytań zamkniętych
CREATE TABLE public.question_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    tresc TEXT NOT NULL,
    poprawna BOOLEAN DEFAULT false,
    kolejnosc INTEGER DEFAULT 0
);

-- Tabela wyników quizów
CREATE TABLE public.quiz_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id),
    quiz_id UUID REFERENCES public.quizzes(id),
    data_rozpoczecia TIMESTAMPTZ DEFAULT NOW(),
    data_zakonczenia TIMESTAMPTZ,
    czas_trwania INTEGER,
    punkty_zdobyte NUMERIC(5,2),
    punkty_max INTEGER,
    procent NUMERIC(5,2),
    ocena NUMERIC(2,1),
    status TEXT DEFAULT 'w_trakcie',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela odpowiedzi uczniów
CREATE TABLE public.student_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    result_id UUID REFERENCES public.quiz_results(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id),
    odpowiedz_ucznia TEXT,
    punkty_otrzymane NUMERIC(5,2),
    feedback_ai TEXT,
    ocenione_przez_ai BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela wiadomości
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nadawca_id UUID REFERENCES public.profiles(id),
    odbiorca_id UUID REFERENCES public.profiles(id),
    temat TEXT,
    tresc TEXT NOT NULL,
    przeczytana BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela powiadomień
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    typ TEXT NOT NULL,
    tytul TEXT NOT NULL,
    tresc TEXT,
    przeczytane BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela osiągnięć
CREATE TABLE public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    typ TEXT NOT NULL,
    nazwa TEXT NOT NULL,
    opis TEXT,
    punkty INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla wydajności
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_students_klasa ON public.students(klasa);
CREATE INDEX idx_quizzes_przedmiot ON public.quizzes(przedmiot);
CREATE INDEX idx_quizzes_nauczyciel ON public.quizzes(nauczyciel_id);
CREATE INDEX idx_quiz_results_student ON public.quiz_results(student_id);
CREATE INDEX idx_quiz_results_quiz ON public.quiz_results(quiz_id);
CREATE INDEX idx_messages_odbiorca ON public.messages(odbiorca_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- RLS (Row Level Security) - Bezpieczeństwo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Polityki RLS - Podstawowe
-- Użytkownicy mogą widzieć swój profil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Nauczyciele mogą widzieć wszystkich
CREATE POLICY "Teachers can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- Uczniowie mogą widzieć swoje wyniki
CREATE POLICY "Students can view own results" ON public.quiz_results
    FOR SELECT USING (student_id = auth.uid());

-- Nauczyciele mogą tworzyć quizy
CREATE POLICY "Teachers can create quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- Funkcje pomocnicze
-- Automatyczne tworzenie profilu po rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, role, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger dla nowych użytkowników
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funkcja do aktualizacji updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggery dla updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();