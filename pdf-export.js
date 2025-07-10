// ===== MODUŁ EKSPORTU DO PDF =====
// Generowanie raportów z wynikami ucznia

class PDFExporter {
  constructor() {
    this.jsPDFLoaded = false;
    this.autoTableLoaded = false;
  }

  /**
   * Ładuje bibliotekę jsPDF dynamicznie
   */
  async loadJsPDF() {
    if (this.jsPDFLoaded) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        // Ładuj też plugin do tabel
        const autoTableScript = document.createElement('script');
        autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
        autoTableScript.onload = () => {
          this.jsPDFLoaded = true;
          this.autoTableLoaded = true;
          resolve();
        };
        autoTableScript.onerror = reject;
        document.head.appendChild(autoTableScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Generuje raport PDF dla ucznia
   */
  async generateStudentReport(studentId, options = {}) {
    await this.loadJsPDF();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Pobierz dane
    const student = this.getStudentData(studentId);
    const results = this.getStudentResults(studentId);
    const achievements = this.getStudentAchievements(studentId);
    
    // Ustawienia
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Nagłówek
    this.addHeader(doc, student, yPosition);
    yPosition += 40;

    // Podsumowanie
    this.addSummary(doc, results, yPosition);
    yPosition += 60;

    // Tabela wyników
    if (results.length > 0) {
      this.addResultsTable(doc, results, yPosition);
      yPosition = doc.previousAutoTable.finalY + 10;
    }

    // Nowa strona dla osiągnięć
    if (achievements.length > 0 && yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    // Osiągnięcia
    if (achievements.length > 0) {
      this.addAchievements(doc, achievements, yPosition);
    }

    // Stopka
    this.addFooter(doc);

    // Zapisz lub wyświetl
    if (options.save) {
      doc.save(`raport_${student.username}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      return doc.output('blob');
    }
  }

  /**
   * Generuje raport dla nauczyciela
   */
  async generateTeacherReport(examId, options = {}) {
    await this.loadJsPDF();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: options.landscape ? 'landscape' : 'portrait'
    });
    
    // Pobierz dane
    const exam = this.getExamData(examId);
    const results = this.getExamResults(examId);
    const statistics = this.calculateStatistics(results);
    
    let yPosition = 20;

    // Nagłówek
    doc.setFontSize(20);
    doc.setTextColor(124, 58, 237);
    doc.text('Raport z egzaminu', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(exam.title, 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date(exam.createdAt).toLocaleDateString('pl-PL')}`, 20, yPosition);
    doc.text(`Liczba uczestników: ${results.length}`, 120, yPosition);
    
    yPosition += 20;

    // Statystyki
    this.addStatisticsSection(doc, statistics, yPosition);
    yPosition += 60;

    // Wykres rozkładu wyników
    if (options.includeChart) {
      this.addResultsChart(doc, results, yPosition);
      yPosition += 80;
    }

    // Tabela szczegółowych wyników
    this.addDetailedResultsTable(doc, results, exam, yPosition);

    // Analiza pytań
    if (options.includeQuestionAnalysis) {
      doc.addPage();
      this.addQuestionAnalysis(doc, exam, results);
    }

    // Stopka
    this.addFooter(doc);

    if (options.save) {
      doc.save(`raport_egzamin_${examId}_${new Date().toISOString().split('T')[0]}.pdf`);
    } else {
      return doc.output('blob');
    }
  }

  /**
   * Generuje certyfikat ukończenia
   */
  async generateCertificate(studentId, examId, options = {}) {
    await this.loadJsPDF();
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'landscape',
      format: 'a4'
    });
    
    const student = this.getStudentData(studentId);
    const exam = this.getExamData(examId);
    const result = this.getStudentResult(studentId, examId);
    
    if (result.score < (options.minScore || 80)) {
      throw new Error('Wynik za niski do certyfikatu');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Tło i ramka
    doc.setDrawColor(124, 58, 237);
    doc.setLineWidth(3);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
    
    doc.setLineWidth(1);
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

    // Nagłówek
    doc.setFontSize(36);
    doc.setTextColor(124, 58, 237);
    doc.text('CERTYFIKAT', pageWidth / 2, 50, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('potwierdzający ukończenie egzaminu', pageWidth / 2, 65, { align: 'center' });

    // Treść
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text(student.fullName || student.username, pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text('ukończył(a) z wynikiem', pageWidth / 2, 120, { align: 'center' });
    
    doc.setFontSize(32);
    doc.setTextColor(34, 197, 94);
    doc.text(`${result.score}%`, pageWidth / 2, 140, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text('egzamin', pageWidth / 2, 160, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(exam.title, pageWidth / 2, 175, { align: 'center' });
    
    // Data
    doc.setFontSize(12);
    doc.setTextColor(100);
    const date = new Date(result.completedAt).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(date, pageWidth / 2, 195, { align: 'center' });

    // Podpis
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, 220, pageWidth / 2 + 50, 220);
    doc.setFontSize(10);
    doc.text('Podpis', pageWidth / 2, 228, { align: 'center' });

    if (options.save) {
      doc.save(`certyfikat_${student.username}_${exam.id}.pdf`);
    } else {
      return doc.output('blob');
    }
  }

  /**
   * Pomocnicze metody
   */
  addHeader(doc, student, yPosition) {
    // Logo/Tytuł
    doc.setFontSize(24);
    doc.setTextColor(124, 58, 237);
    doc.text('QuizMaster', 20, yPosition);
    
    // Dane ucznia
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Raport dla: ${student.fullName || student.username}`, 20, yPosition + 15);
    doc.text(`Klasa: ${student.category}`, 20, yPosition + 22);
    doc.text(`Data: ${new Date().toLocaleDateString('pl-PL')}`, 20, yPosition + 29);
  }

  addSummary(doc, results, yPosition) {
    const totalExams = results.length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalExams || 0;
    const bestScore = Math.max(...results.map(r => r.score), 0);
    const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Podsumowanie', 20, yPosition);
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    
    const summaryData = [
      ['Liczba egzaminów:', totalExams.toString()],
      ['Średni wynik:', `${avgScore.toFixed(1)}%`],
      ['Najlepszy wynik:', `${bestScore}%`],
      ['Łączny czas:', `${Math.floor(totalTime / 60)} min`]
    ];

    summaryData.forEach((item, index) => {
      doc.text(item[0], 25, yPosition + 15 + (index * 7));
      doc.text(item[1], 80, yPosition + 15 + (index * 7));
    });
  }

  addResultsTable(doc, results, yPosition) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Historia wyników', 20, yPosition);
    
    const tableData = results
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10)
      .map(result => [
        new Date(result.completedAt).toLocaleDateString('pl-PL'),
        result.examTitle,
        `${result.score}%`,
        `${Math.floor((result.duration || 0) / 60)} min`,
        result.correctAnswers + '/' + result.totalQuestions
      ]);

    doc.autoTable({
      startY: yPosition + 10,
      head: [['Data', 'Egzamin', 'Wynik', 'Czas', 'Poprawne']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [124, 58, 237],
        textColor: 255,
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 }
      }
    });
  }

  addAchievements(doc, achievements, yPosition) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Osiągnięcia', 20, yPosition);
    
    let y = yPosition + 15;
    achievements.slice(0, 5).forEach(achievement => {
      doc.setFontSize(10);
      doc.setTextColor(124, 58, 237);
      doc.text('★', 25, y);
      
      doc.setTextColor(0);
      doc.text(achievement.name, 35, y);
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(achievement.description, 35, y + 5);
      
      y += 15;
    });
  }

  addStatisticsSection(doc, statistics, yPosition) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Statystyki', 20, yPosition);
    
    const stats = [
      ['Średnia:', `${statistics.average.toFixed(1)}%`],
      ['Mediana:', `${statistics.median.toFixed(1)}%`],
      ['Najwyższy wynik:', `${statistics.max}%`],
      ['Najniższy wynik:', `${statistics.min}%`],
      ['Odchylenie standardowe:', `${statistics.stdDev.toFixed(1)}%`],
      ['Współczynnik zaliczenia:', `${statistics.passRate.toFixed(1)}%`]
    ];

    doc.setFontSize(10);
    stats.forEach((stat, index) => {
      const x = index < 3 ? 25 : 120;
      const y = yPosition + 15 + ((index % 3) * 10);
      
      doc.setTextColor(60);
      doc.text(stat[0], x, y);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(stat[1], x + 50, y);
      doc.setFont(undefined, 'normal');
    });
  }

  addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.text(
        `Strona ${i} z ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      doc.text(
        'Wygenerowano przez QuizMaster',
        20,
        pageHeight - 10
      );
      
      doc.text(
        new Date().toLocaleString('pl-PL'),
        pageWidth - 20,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  // Metody pomocnicze do pobierania danych
  getStudentData(studentId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.userId === studentId) || { username: 'Nieznany' };
  }

  getStudentResults(studentId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    return results.filter(r => r.userId === studentId);
  }

  getStudentAchievements(studentId) {
    const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
    const userAchievements = achievements.find(a => a.userId === studentId);
    return userAchievements ? userAchievements.unlocked : [];
  }

  getExamData(examId) {
    const exams = JSON.parse(localStorage.getItem('exams') || '[]');
    return exams.find(e => e.id === examId) || {};
  }

  getExamResults(examId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    return results.filter(r => r.examId === examId);
  }

  getStudentResult(studentId, examId) {
    const results = JSON.parse(localStorage.getItem('examResults') || '[]');
    return results.find(r => r.userId === studentId && r.examId === examId) || {};
  }

  calculateStatistics(results) {
    const scores = results.map(r => r.score);
    const n = scores.length;
    
    if (n === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        passRate: 0
      };
    }

    const average = scores.reduce((sum, score) => sum + score, 0) / n;
    
    const sorted = scores.sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    const passRate = (scores.filter(s => s >= 50).length / n) * 100;

    return {
      average,
      median,
      min: Math.min(...scores),
      max: Math.max(...scores),
      stdDev,
      passRate
    };
  }
}

// Eksportuj moduł
window.PDFExporter = PDFExporter;