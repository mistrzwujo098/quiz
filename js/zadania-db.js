// Baza zadań - przechowywanie w localStorage
window.zadania = JSON.parse(localStorage.getItem('zadaniaDB') || '[]');

// Inicjalizacja przykładowych zadań
if (window.zadania.length === 0) {
    window.zadania = [
        {
            id: 'demo_1',
            przedmiot: 'Matematyka',
            temat: 'Geometria',
            poziom: 'podstawowy',
            typ: 'zamkniete',
            tresc: 'Oblicz pole prostokąta o bokach 5 cm i 8 cm.',
            odpowiedzi: ['40 cm²', '13 cm²', '35 cm²', '45 cm²'],
            poprawna: '40 cm²',
            punkty: 1,
            rozwiazanie: 'Pole prostokąta = długość × szerokość = 5 cm × 8 cm = 40 cm²',
            podpowiedzi: [
                { tresc: 'Przypomnij sobie wzór na pole prostokąta.', koszt: 10 },
                { tresc: 'Pole prostokąta = długość × szerokość', koszt: 20 },
                { tresc: 'Musisz pomnożyć 5 cm przez 8 cm', koszt: 30 }
            ]
        },
        {
            id: 'demo_2',
            przedmiot: 'Matematyka',
            temat: 'Procenty',
            poziom: 'podstawowy',
            typ: 'zamkniete',
            tresc: 'Oblicz 20% z liczby 150.',
            odpowiedzi: ['30', '25', '35', '40'],
            poprawna: '30',
            punkty: 1,
            rozwiazanie: '20% z 150 = 0,20 × 150 = 30',
            podpowiedzi: [
                { tresc: 'Procent to część setna całości.', koszt: 10 },
                { tresc: '20% = 20/100 = 0,20', koszt: 20 },
                { tresc: 'Aby obliczyć 20% ze 150, pomnóż 150 przez 0,20', koszt: 30 }
            ]
        },
        {
            id: 'demo_3',
            przedmiot: 'Fizyka',
            temat: 'Ruch jednostajny',
            poziom: 'podstawowy',
            typ: 'zamkniete',
            tresc: 'Samochód jedzie z prędkością 60 km/h. Jaką drogę pokona w czasie 2 godzin?',
            odpowiedzi: ['120 km', '100 km', '140 km', '80 km'],
            poprawna: '120 km',
            punkty: 1,
            rozwiazanie: 'Droga = prędkość × czas = 60 km/h × 2 h = 120 km',
            podpowiedzi: [
                { tresc: 'W ruchu jednostajnym prędkość jest stała.', koszt: 10 },
                { tresc: 'Wzór na drogę: s = v × t', koszt: 20 },
                { tresc: 'Podstaw dane: v = 60 km/h, t = 2 h', koszt: 30 }
            ]
        }
    ];
    localStorage.setItem('zadaniaDB', JSON.stringify(window.zadania));
}