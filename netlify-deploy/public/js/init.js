// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', function() {
    console.log('QuizMaster - Aplikacja załadowana');
    
    // Sprawdź czy są zadania w bazie
    const zadaniaCount = JSON.parse(localStorage.getItem('zadaniaDB') || '[]').length;
    console.log(`Liczba zadań w bazie: ${zadaniaCount}`);
});