-- Schemat bazy danych QuizMaster dla Supabase (POPRAWIONY)
-- Naprawia problem nieskończonej rekurencji w politykach RLS

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

-- POPRAWIONE POLITYKI RLS (bez rekurencji)

-- Tymczasowa funkcja pomocnicza do sprawdzania roli użytkownika
CREATE OR REPLACE FUNCTION public.user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Polityki dla tabeli profiles
-- Każdy może widzieć swój profil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Nauczyciele mogą widzieć wszystkie profile
CREATE POLICY "Teachers can view all profiles" ON public.profiles
    FOR SELECT USING (
        public.user_role(auth.uid()) = 'teacher'
    );

-- Rodzice mogą widzieć profile swoich dzieci
CREATE POLICY "Parents can view children profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.parent_child_relations
            WHERE parent_id = auth.uid() AND child_id = profiles.id
        )
    );

-- Tylko system może tworzyć profile (przez trigger)
CREATE POLICY "System can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (false);

-- Użytkownicy mogą aktualizować swój profil
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Polityki dla tabeli students
CREATE POLICY "Students can view own data" ON public.students
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Teachers can view all students" ON public.students
    FOR SELECT USING (
        public.user_role(auth.uid()) = 'teacher'
    );

-- Polityki dla tabeli teachers
CREATE POLICY "Anyone can view teachers" ON public.teachers
    FOR SELECT USING (true);

-- Polityki dla tabeli quizzes
CREATE POLICY "Teachers can manage own quizzes" ON public.quizzes
    FOR ALL USING (nauczyciel_id = auth.uid());

CREATE POLICY "Students can view active quizzes" ON public.quizzes
    FOR SELECT USING (
        aktywny = true AND
        (klasa IS NULL OR klasa IN (
            SELECT klasa FROM public.students WHERE id = auth.uid()
        ))
    );

-- Polityki dla wyników
CREATE POLICY "Students can view own results" ON public.quiz_results
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view all results" ON public.quiz_results
    FOR SELECT USING (
        public.user_role(auth.uid()) = 'teacher'
    );

CREATE POLICY "Students can create own results" ON public.quiz_results
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Polityki dla wiadomości
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (
        nadawca_id = auth.uid() OR odbiorca_id = auth.uid()
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (nadawca_id = auth.uid());

-- Polityki dla powiadomień
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Trigger do automatycznego tworzenia profilu po rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, role, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', new.email),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    
    -- Dodaj do odpowiedniej tabeli szczegółowej
    IF (new.raw_user_meta_data->>'role') = 'student' THEN
        INSERT INTO public.students (id, klasa) 
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'klasa', '8'));
    ELSIF (new.raw_user_meta_data->>'role') = 'teacher' THEN
        INSERT INTO public.teachers (id) VALUES (new.id);
    ELSIF (new.raw_user_meta_data->>'role') = 'parent' THEN
        INSERT INTO public.parents (id) VALUES (new.id);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aktywuj trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Funkcja do obliczania wyników quizu
CREATE OR REPLACE FUNCTION public.calculate_quiz_score(result_id UUID)
RETURNS TABLE(punkty_zdobyte NUMERIC, punkty_max INTEGER, procent NUMERIC, ocena NUMERIC) AS $$
DECLARE
    v_punkty_zdobyte NUMERIC;
    v_punkty_max INTEGER;
    v_procent NUMERIC;
    v_ocena NUMERIC;
BEGIN
    -- Oblicz sumę punktów
    SELECT 
        COALESCE(SUM(sa.punkty_otrzymane), 0),
        COALESCE(SUM(q.punkty), 0)
    INTO v_punkty_zdobyte, v_punkty_max
    FROM public.student_answers sa
    JOIN public.questions q ON sa.question_id = q.id
    WHERE sa.result_id = calculate_quiz_score.result_id;
    
    -- Oblicz procent
    IF v_punkty_max > 0 THEN
        v_procent := ROUND((v_punkty_zdobyte / v_punkty_max) * 100, 2);
    ELSE
        v_procent := 0;
    END IF;
    
    -- Oblicz ocenę
    v_ocena := CASE
        WHEN v_procent >= 95 THEN 6
        WHEN v_procent >= 85 THEN 5
        WHEN v_procent >= 70 THEN 4
        WHEN v_procent >= 50 THEN 3
        WHEN v_procent >= 30 THEN 2
        ELSE 1
    END;
    
    -- Zaktualizuj wynik
    UPDATE public.quiz_results
    SET 
        punkty_zdobyte = v_punkty_zdobyte,
        punkty_max = v_punkty_max,
        procent = v_procent,
        ocena = v_ocena
    WHERE id = calculate_quiz_score.result_id;
    
    RETURN QUERY SELECT v_punkty_zdobyte, v_punkty_max, v_procent, v_ocena;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Uprawnienia dla funkcji
GRANT EXECUTE ON FUNCTION public.user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_quiz_score TO authenticated;

-- Uprawnienia dla tabel (dla authenticated users)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;