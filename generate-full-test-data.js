// Skrypt do generowania pełnych danych testowych dla QuizMaster
// Uruchom go w konsoli przeglądarki na https://quiz.paulinaodmatematyki.com

function generateFullTestData() {
  console.log('🚀 Generowanie kompletnych danych testowych...\n');
  
  // KROK 1: Wyczyść stare dane
  console.log('🧹 Czyszczenie starych danych...');
  localStorage.clear();
  sessionStorage.clear();
  
  // KROK 2: Inicjalizuj system
  console.log('📦 Inicjalizacja systemu...');
  AuthManager.initDefaultUsers();
  
  // KROK 3: Stwórz nauczycieli
  console.log('👩‍🏫 Tworzenie nauczycieli...');
  const teachers = [
    { username: 'paulinaodmatematyki', password: 'paulina#314159265', name: 'Paulina Kowalska' },
    { username: 'jan.nowak', password: 'nauczyciel123', name: 'Jan Nowak' },
    { username: 'maria.wisniewski', password: 'nauczyciel123', name: 'Maria Wiśniewska' }
  ];
  
  teachers.forEach(teacher => {
    try {
      AuthManager.createUser(teacher.username, teacher.password, 'teacher');
      console.log(`✅ Nauczyciel: ${teacher.username}`);
    } catch (e) {
      console.log(`ℹ️ Nauczyciel ${teacher.username} już istnieje`);
    }
  });
  
  // KROK 4: Stwórz uczniów z różnymi poziomami
  console.log('\n👨‍🎓 Tworzenie uczniów...');
  const studentsData = [
    // Uczniowie egzaminu ósmoklasisty (różne poziomy)
    { name: 'Anna Kowalska', category: 'egzamin ósmoklasisty', level: 'excellent' },
    { name: 'Piotr Nowak', category: 'egzamin ósmoklasisty', level: 'good' },
    { name: 'Katarzyna Wiśniewska', category: 'egzamin ósmoklasisty', level: 'average' },
    { name: 'Michał Wójcik', category: 'egzamin ósmoklasisty', level: 'weak' },
    { name: 'Magdalena Kamińska', category: 'egzamin ósmoklasisty', level: 'excellent' },
    { name: 'Jakub Lewandowski', category: 'egzamin ósmoklasisty', level: 'good' },
    { name: 'Natalia Dąbrowska', category: 'egzamin ósmoklasisty', level: 'average' },
    
    // Uczniowie matury podstawowej
    { name: 'Tomasz Zieliński', category: 'matura podstawowa', level: 'excellent' },
    { name: 'Aleksandra Szymańska', category: 'matura podstawowa', level: 'good' },
    { name: 'Adam Woźniak', category: 'matura podstawowa', level: 'average' },
    { name: 'Monika Kozłowska', category: 'matura podstawowa', level: 'weak' },
    { name: 'Paweł Jankowski', category: 'matura podstawowa', level: 'excellent' },
    { name: 'Karolina Mazur', category: 'matura podstawowa', level: 'good' },
    { name: 'Mateusz Krawczyk', category: 'matura podstawowa', level: 'average' },
    
    // Uczniowie matury rozszerzonej
    { name: 'Ewa Piotrowska', category: 'matura rozszerzona', level: 'excellent' },
    { name: 'Bartosz Grabowski', category: 'matura rozszerzona', level: 'good' },
    { name: 'Joanna Pawłowska', category: 'matura rozszerzona', level: 'average' },
    { name: 'Krzysztof Michalski', category: 'matura rozszerzona', level: 'weak' },
    { name: 'Agnieszka Król', category: 'matura rozszerzona', level: 'excellent' },
    { name: 'Rafał Wieczorek', category: 'matura rozszerzona', level: 'good' }
  ];
  
  const students = [];
  studentsData.forEach((student, index) => {
    const username = student.name.toLowerCase().replace(' ', '.');
    const userId = 1000 + index;
    try {
      AuthManager.createUser(username, 'haslo123', 'student', student.category);
      students.push({
        id: userId,
        username: username,
        name: student.name,
        category: student.category,
        level: student.level
      });
      console.log(`✅ Uczeń: ${username} (${student.category}) - poziom: ${student.level}`);
    } catch (e) {
      console.log(`ℹ️ Uczeń ${username} już istnieje`);
    }
  });
  
  // KROK 5: Stwórz grupy uczniów
  console.log('\n👥 Tworzenie grup...');
  const groups = [
    { id: 1, name: 'Klasa 8A', teacherId: 'paulinaodmatematyki', students: [] },
    { id: 2, name: 'Klasa 8B', teacherId: 'paulinaodmatematyki', students: [] },
    { id: 3, name: 'Grupa maturalna podstawowa', teacherId: 'jan.nowak', students: [] },
    { id: 4, name: 'Grupa maturalna rozszerzona', teacherId: 'maria.wisniewski', students: [] },
    { id: 5, name: 'Koło olimpijskie', teacherId: 'paulinaodmatematyki', students: [] }
  ];
  
  // Przypisz uczniów do grup
  students.forEach((student, index) => {
    if (student.category === 'egzamin ósmoklasisty') {
      groups[index % 2].students.push(student.username);
      if (student.level === 'excellent') {
        groups[4].students.push(student.username); // Koło olimpijskie
      }
    } else if (student.category === 'matura podstawowa') {
      groups[2].students.push(student.username);
    } else if (student.category === 'matura rozszerzona') {
      groups[3].students.push(student.username);
      if (student.level === 'excellent') {
        groups[4].students.push(student.username); // Koło olimpijskie
      }
    }
  });
  
  localStorage.setItem('studentGroups', JSON.stringify(groups));
  console.log('✅ Utworzono 5 grup uczniów');
  
  // KROK 6: Generuj historię wyników egzaminów
  console.log('\n📊 Generowanie historii wyników...');
  const examResults = [];
  const subjects = ['Geometria', 'Algebra', 'Procenty', 'Funkcje', 'Statystyka'];
  
  students.forEach(student => {
    // Generuj 5-10 wyników dla każdego ucznia
    const numResults = 5 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numResults; i++) {
      const daysAgo = Math.floor(Math.random() * 60); // Ostatnie 60 dni
      const examDate = new Date();
      examDate.setDate(examDate.getDate() - daysAgo);
      
      // Wyniki zależne od poziomu ucznia
      let scoreRange = { min: 40, max: 60 }; // weak
      if (student.level === 'average') scoreRange = { min: 60, max: 75 };
      if (student.level === 'good') scoreRange = { min: 75, max: 90 };
      if (student.level === 'excellent') scoreRange = { min: 85, max: 100 };
      
      const score = scoreRange.min + Math.floor(Math.random() * (scoreRange.max - scoreRange.min + 1));
      const totalQuestions = 10 + Math.floor(Math.random() * 11); // 10-20 pytań
      const correctAnswers = Math.floor((score / 100) * totalQuestions);
      
      // Symuluj odpowiedzi
      const answers = {};
      const questions = [];
      for (let q = 0; q < totalQuestions; q++) {
        const questionId = Math.floor(Math.random() * 53) + 1; // ID z bazy zadań
        const task = window.zadania.find(z => z.id === questionId);
        if (task) {
          questions.push(task);
          // Symuluj odpowiedź
          const isCorrect = q < correctAnswers;
          answers[questionId] = isCorrect ? task.poprawna : task.odpowiedzi[0];
        }
      }
      
      examResults.push({
        examId: Date.now() + Math.random(),
        examTitle: `Test z ${subjects[i % subjects.length]} - ${student.category}`,
        studentName: student.name,
        studentId: student.username,
        category: student.category,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        earnedPoints: correctAnswers,
        totalPoints: totalQuestions,
        percentage: score,
        completedAt: examDate.toISOString(),
        timeSpent: 600 + Math.floor(Math.random() * 1800), // 10-40 minut
        answers: answers,
        questions: questions,
        subject: subjects[i % subjects.length]
      });
    }
  });
  
  localStorage.setItem('examResults', JSON.stringify(examResults));
  console.log(`✅ Wygenerowano ${examResults.length} wyników egzaminów`);
  
  // KROK 7: Generuj osiągnięcia
  console.log('\n🏆 Generowanie osiągnięć...');
  const achievements = [];
  
  students.forEach(student => {
    // Przyznaj osiągnięcia na podstawie poziomu
    if (student.level === 'excellent') {
      achievements.push({
        userId: student.username,
        achievementId: 'first_perfect',
        unlockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      achievements.push({
        userId: student.username,
        achievementId: 'streak_7',
        unlockedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (student.level === 'good' || student.level === 'excellent') {
      achievements.push({
        userId: student.username,
        achievementId: 'geometry_master',
        unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Każdy ma pierwsze logowanie
    achievements.push({
      userId: student.username,
      achievementId: 'first_login',
      unlockedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    });
  });
  
  localStorage.setItem('userAchievements', JSON.stringify(achievements));
  console.log(`✅ Przyznano ${achievements.length} osiągnięć`);
  
  // KROK 8: Stwórz wyzwania konkursowe
  console.log('\n🎯 Tworzenie wyzwań konkursowych...');
  const competitions = [
    {
      id: 1,
      name: 'Mistrzostwa Geometrii',
      description: 'Sprawdź swoją wiedzę z geometrii!',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'all',
      topic: 'Geometria',
      participants: [],
      leaderboard: []
    },
    {
      id: 2,
      name: 'Liga Algebraiczna',
      description: 'Rozwiąż jak najwięcej zadań z algebry!',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'matura rozszerzona',
      topic: 'Algebra',
      participants: [],
      leaderboard: []
    },
    {
      id: 3,
      name: 'Wyzwanie Procentowe',
      description: 'Kto najlepiej radzi sobie z procentami?',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'egzamin ósmoklasisty',
      topic: 'Procenty',
      participants: [],
      leaderboard: []
    }
  ];
  
  // Dodaj uczestników i wyniki
  competitions.forEach(comp => {
    students.forEach(student => {
      if (comp.category === 'all' || comp.category === student.category) {
        // Dodaj do uczestników
        comp.participants.push({
          userId: student.username,
          joinedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Dodaj wynik do rankingu
        let points = 0;
        if (student.level === 'excellent') points = 80 + Math.floor(Math.random() * 20);
        else if (student.level === 'good') points = 60 + Math.floor(Math.random() * 20);
        else if (student.level === 'average') points = 40 + Math.floor(Math.random() * 20);
        else points = 20 + Math.floor(Math.random() * 20);
        
        comp.leaderboard.push({
          userId: student.username,
          studentName: student.name,
          points: points,
          tasksCompleted: Math.floor(points / 5),
          lastActivity: new Date().toISOString()
        });
      }
    });
    
    // Posortuj ranking
    comp.leaderboard.sort((a, b) => b.points - a.points);
  });
  
  localStorage.setItem('competitions', JSON.stringify(competitions));
  console.log('✅ Utworzono 3 aktywne wyzwania');
  
  // KROK 9: Generuj rekomendacje
  console.log('\n💡 Generowanie rekomendacji...');
  const recommendations = [];
  
  students.forEach(student => {
    // Rekomendacje na podstawie wyników
    const studentResults = examResults.filter(r => r.studentId === student.username);
    const avgScore = studentResults.reduce((sum, r) => sum + r.percentage, 0) / studentResults.length;
    
    if (avgScore < 50) {
      recommendations.push({
        userId: student.username,
        type: 'difficulty',
        title: 'Zacznij od podstaw',
        description: 'Zalecamy rozwiązywanie zadań o niższym poziomie trudności',
        topics: ['Procenty', 'Geometria'],
        createdAt: new Date().toISOString()
      });
    } else if (avgScore > 85) {
      recommendations.push({
        userId: student.username,
        type: 'challenge',
        title: 'Czas na wyzwanie!',
        description: 'Spróbuj zadań z poziomu rozszerzonego',
        topics: ['Funkcje', 'Algebra'],
        createdAt: new Date().toISOString()
      });
    }
    
    // Rekomendacje tematyczne
    const weakTopics = ['Statystyka', 'Funkcje'];
    recommendations.push({
      userId: student.username,
      type: 'topic',
      title: 'Poćwicz słabsze tematy',
      description: `Zauważyliśmy, że masz trudności z: ${weakTopics.join(', ')}`,
      topics: weakTopics,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });
  });
  
  localStorage.setItem('recommendations', JSON.stringify(recommendations));
  console.log(`✅ Wygenerowano ${recommendations.length} rekomendacji`);
  
  // KROK 10: Harmonogram egzaminów
  console.log('\n📅 Tworzenie harmonogramu...');
  const scheduledExams = [
    {
      id: 1,
      title: 'Egzamin próbny - Geometria',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'egzamin ósmoklasisty',
      groupId: 1,
      duration: 45,
      status: 'scheduled'
    },
    {
      id: 2,
      title: 'Test z algebry',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'matura podstawowa',
      groupId: 3,
      duration: 90,
      status: 'scheduled'
    },
    {
      id: 3,
      title: 'Olimpiada matematyczna - eliminacje',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'all',
      groupId: 5,
      duration: 120,
      status: 'scheduled'
    }
  ];
  
  localStorage.setItem('scheduledExams', JSON.stringify(scheduledExams));
  console.log('✅ Zaplanowano 3 egzaminy');
  
  // KROK 11: Powiadomienia
  console.log('\n🔔 Generowanie powiadomień...');
  const notifications = [];
  
  students.slice(0, 5).forEach(student => {
    notifications.push({
      id: Date.now() + Math.random(),
      userId: student.username,
      type: 'exam',
      message: 'Nowy egzamin dostępny: Test z geometrii',
      read: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });
  });
  
  localStorage.setItem('notifications', JSON.stringify(notifications));
  console.log('✅ Utworzono powiadomienia');
  
  // KROK 12: Statystyki globalne
  console.log('\n📈 Generowanie statystyk globalnych...');
  const globalStats = {
    totalUsers: students.length + teachers.length,
    totalExams: examResults.length,
    totalAchievements: achievements.length,
    averageScore: Math.round(examResults.reduce((sum, r) => sum + r.percentage, 0) / examResults.length),
    mostDifficultTopic: 'Funkcje',
    easiestTopic: 'Procenty',
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem('globalStats', JSON.stringify(globalStats));
  console.log('✅ Wygenerowano statystyki globalne');
  
  // PODSUMOWANIE
  console.log('\n✨ ZAKOŃCZONO GENEROWANIE DANYCH! ✨\n');
  console.log('📊 Podsumowanie:');
  console.log(`- Nauczyciele: ${teachers.length}`);
  console.log(`- Uczniowie: ${students.length}`);
  console.log(`- Grupy: ${groups.length}`);
  console.log(`- Wyniki egzaminów: ${examResults.length}`);
  console.log(`- Osiągnięcia: ${achievements.length}`);
  console.log(`- Wyzwania: ${competitions.length}`);
  console.log(`- Rekomendacje: ${recommendations.length}`);
  console.log(`- Zaplanowane egzaminy: ${scheduledExams.length}`);
  
  console.log('\n🔑 Dane logowania:');
  console.log('NAUCZYCIELE:');
  teachers.forEach(t => {
    console.log(`- ${t.username} / ${t.password}`);
  });
  console.log('\nUCZNIOWIE (wszyscy mają hasło: haslo123):');
  students.slice(0, 5).forEach(s => {
    console.log(`- ${s.username} (${s.category}, poziom: ${s.level})`);
  });
  console.log('... i ' + (students.length - 5) + ' więcej');
  
  console.log('\n🎉 Możesz teraz przetestować wszystkie funkcje aplikacji!');
  console.log('💡 Wskazówka: Zaloguj się jako paulinaodmatematyki / paulina#314159265');
  
  return {
    teachers,
    students,
    groups,
    examResults,
    competitions,
    achievements,
    recommendations
  };
}

// Uruchom generator
generateFullTestData();