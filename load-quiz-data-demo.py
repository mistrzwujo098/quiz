# Python - Demonstracja ładowania quiz_data.json
import json

# Załaduj dane z pliku
with open('quiz_data.json', 'r', encoding='utf-8') as f:
    quiz_data = json.load(f)

# Wyświetl metadane
print("=== METADANE QUIZU ===")
print(f"Tytuł: {quiz_data['metadata']['title']}")
print(f"Opis: {quiz_data['metadata']['description']}")
print(f"Liczba pytań: {quiz_data['metadata']['totalQuestions']}")
print(f"Maksymalna liczba punktów: {quiz_data['metadata']['maxPoints']}")
print(f"Rok: {quiz_data['metadata']['year']}")

# Wyświetl pierwsze 3 pytania
print("\n=== PRZYKŁADOWE PYTANIA ===")
for i, question in enumerate(quiz_data['questions'][:3], 1):
    print(f"\nPytanie {i}:")
    print(f"  Dział: {question['department']}")
    print(f"  Typ: {question['type']}")
    print(f"  Treść: {question['question']}")
    print(f"  Odpowiedzi:")
    for key, value in question['options'].items():
        print(f"    {key}) {value}")
    print(f"  Poprawna odpowiedź: {question['correctAnswer']}")
    print(f"  Wyjaśnienie: {question['explanation']}")

# Statystyki
print("\n=== STATYSTYKI ===")
departments = {}
for question in quiz_data['questions']:
    dept = question['department']
    departments[dept] = departments.get(dept, 0) + 1

print("Pytania według działów:")
for dept, count in sorted(departments.items()):
    print(f"  {dept}: {count} pytań")

# Zlicz pytania z obrazkami
with_images = sum(1 for q in quiz_data['questions'] if q['hasImage'])
print(f"\nPytania z obrazkami: {with_images}/{len(quiz_data['questions'])}")