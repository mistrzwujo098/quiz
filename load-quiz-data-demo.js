// Node.js - Demonstracja ładowania quiz_data.json

const fs = require('fs');

// Załaduj dane z pliku
const quizData = JSON.parse(fs.readFileSync('quiz_data.json', 'utf8'));

// Wyświetl metadane
console.log("=== METADANE QUIZU ===");
console.log(`Tytuł: ${quizData.metadata.title}`);
console.log(`Opis: ${quizData.metadata.description}`);
console.log(`Liczba pytań: ${quizData.metadata.totalQuestions}`);
console.log(`Maksymalna liczba punktów: ${quizData.metadata.maxPoints}`);
console.log(`Rok: ${quizData.metadata.year}`);

// Wyświetl pierwsze 3 pytania
console.log("\n=== PRZYKŁADOWE PYTANIA ===");
quizData.questions.slice(0, 3).forEach((question, index) => {
    console.log(`\nPytanie ${index + 1}:`);
    console.log(`  Dział: ${question.department}`);
    console.log(`  Typ: ${question.type}`);
    console.log(`  Treść: ${question.question}`);
    console.log(`  Odpowiedzi:`);
    Object.entries(question.options).forEach(([key, value]) => {
        console.log(`    ${key}) ${value}`);
    });
    console.log(`  Poprawna odpowiedź: ${question.correctAnswer}`);
    console.log(`  Wyjaśnienie: ${question.explanation}`);
});

// Statystyki
console.log("\n=== STATYSTYKI ===");
const departments = {};
quizData.questions.forEach(question => {
    const dept = question.department;
    departments[dept] = (departments[dept] || 0) + 1;
});

console.log("Pytania według działów:");
Object.entries(departments)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dept, count]) => {
        console.log(`  ${dept}: ${count} pytań`);
    });

// Zlicz pytania z obrazkami
const withImages = quizData.questions.filter(q => q.hasImage).length;
console.log(`\nPytania z obrazkami: ${withImages}/${quizData.questions.length}`);

// Eksportuj do użycia w innych modułach
module.exports = quizData;