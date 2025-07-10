-- Skrypt naprawczy dla istniejącej bazy danych
-- Usuwa rekurencyjne polityki i tworzy poprawne

-- 1. Usuń wszystkie istniejące polityki dla profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view children profiles" ON public.profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Utwórz pomocniczą funkcję jeśli nie istnieje
CREATE OR REPLACE FUNCTION public.user_role(user_id UUID)
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Utwórz nowe, poprawne polityki
-- Każdy może widzieć swój profil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Nauczyciele mogą widzieć wszystkie profile (bez rekurencji)
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

-- Użytkownicy mogą aktualizować swój profil
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Nadaj uprawnienia
GRANT EXECUTE ON FUNCTION public.user_role TO authenticated;

-- 5. Opcjonalnie: Tymczasowo wyłącz RLS dla debugowania
-- (odkomentuj jeśli potrzebujesz)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 6. Test - sprawdź czy można odczytać profiles
-- SELECT COUNT(*) FROM public.profiles;