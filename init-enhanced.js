// Ulepszona inicjalizacja aplikacji QuizMaster
// Ten plik zapewnia prawidłową inicjalizację wszystkich modułów

document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== QuizMaster - Inicjalizacja aplikacji ===');
    
    // Obiekt do przechowywania statusu inicjalizacji
    const initStatus = {
        modules: {},
        errors: [],
        warnings: []
    };
    
    try {
        // 1. Inicjalizacja podstawowych modułów
        console.log('1. Inicjalizacja podstawowych modułów...');
        
        // Sprawdź czy wymagane biblioteki są załadowane
        if (typeof CryptoJS === 'undefined') {
            throw new Error('CryptoJS nie jest załadowany');
        }
        
        // 2. Inicjalizacja systemu autoryzacji
        console.log('2. Inicjalizacja systemu autoryzacji...');
        if (typeof AuthManager !== 'undefined') {
            AuthManager.initDefaultUsers();
            initStatus.modules.auth = 'OK';
        } else {
            initStatus.errors.push('AuthManager nie jest zdefiniowany');
        }
        
        // 3. Inicjalizacja bazy zadań
        console.log('3. Sprawdzanie bazy zadań...');
        const zadaniaCount = JSON.parse(localStorage.getItem('zadaniaDB') || '[]').length;
        console.log(`  - Liczba zadań w bazie: ${zadaniaCount}`);
        initStatus.modules.zadaniaDB = `OK (${zadaniaCount} zadań)`;
        
        // 4. Inicjalizacja systemu nawigacji i integracji
        console.log('4. Inicjalizacja systemu nawigacji...');
        if (typeof NavigationIntegration !== 'undefined') {
            window.navigationIntegration = new NavigationIntegration();
            await window.navigationIntegration.init();
            initStatus.modules.navigation = 'OK';
        } else {
            initStatus.warnings.push('NavigationIntegration nie jest załadowany');
        }
        
        // 5. Inicjalizacja systemu AI Grader
        console.log('5. Inicjalizacja AI Grader...');
        if (typeof AIGrader !== 'undefined') {
            window.aiGrader = new AIGrader();
            // Nie inicjalizuj async tutaj - zrób to na żądanie
            initStatus.modules.aiGrader = 'OK (lazy load)';
        } else {
            initStatus.warnings.push('AIGrader nie jest załadowany');
        }
        
        // 6. Inicjalizacja systemu osiągnięć
        console.log('6. Inicjalizacja systemu osiągnięć...');
        if (typeof AchievementsSystem !== 'undefined') {
            window.achievementsSystem = new AchievementsSystem();
            initStatus.modules.achievements = 'OK';
        } else {
            initStatus.warnings.push('AchievementsSystem nie jest załadowany');
        }
        
        // 7. Inicjalizacja systemu rekomendacji
        console.log('7. Inicjalizacja systemu rekomendacji...');
        if (typeof RecommendationSystem !== 'undefined') {
            window.recommendationSystem = new RecommendationSystem();
            initStatus.modules.recommendations = 'OK';
        } else {
            initStatus.warnings.push('RecommendationSystem nie jest załadowany');
        }
        
        // 8. Inicjalizacja parsera CKE
        console.log('8. Inicjalizacja parsera CKE...');
        if (typeof CKEParserSystem !== 'undefined') {
            window.ckeParser = new CKEParserSystem();
            initStatus.modules.ckeParser = 'OK';
        } else {
            initStatus.warnings.push('CKEParserSystem nie jest załadowany');
        }
        
        // 9. Inicjalizacja systemu oceniania krokowego
        console.log('9. Inicjalizacja systemu oceniania krokowego...');
        if (typeof StepGradingSystem !== 'undefined') {
            window.stepGrading = new StepGradingSystem();
            initStatus.modules.stepGrading = 'OK';
        } else {
            initStatus.warnings.push('StepGradingSystem nie jest załadowany');
        }
        
        // 10. Inicjalizacja UI importu CKE
        console.log('10. Inicjalizacja UI importu CKE...');
        if (typeof CKEImportUI !== 'undefined') {
            window.ckeImportUI = new CKEImportUI();
            initStatus.modules.ckeImportUI = 'OK';
        } else {
            initStatus.warnings.push('CKEImportUI nie jest załadowany');
        }
        
        // 11. Inicjalizacja usprawnień dla nauczyciela
        console.log('11. Inicjalizacja usprawnień dla nauczyciela...');
        if (typeof TeacherEnhancements !== 'undefined') {
            window.teacherEnhancements = new TeacherEnhancements();
            window.teacherEnhancements.init();
            initStatus.modules.teacherEnhancements = 'OK';
        } else {
            initStatus.warnings.push('TeacherEnhancements nie jest załadowany');
        }
        
        // 12. Inicjalizacja systemu konkursów
        console.log('12. Inicjalizacja systemu konkursów...');
        if (typeof CompetitionSystem !== 'undefined') {
            window.competitionSystem = new CompetitionSystem();
            initStatus.modules.competitions = 'OK';
        } else {
            initStatus.warnings.push('CompetitionSystem nie jest załadowany');
        }
        
        // 13. Inicjalizacja zaawansowanego modułu matematycznego
        console.log('13. Inicjalizacja modułu matematycznego...');
        if (typeof AdvancedMathModule !== 'undefined') {
            window.advancedMath = new AdvancedMathModule();
            initStatus.modules.advancedMath = 'OK';
        } else {
            initStatus.warnings.push('AdvancedMathModule nie jest załadowany');
        }
        
        // 14. Inicjalizacja synchronizacji bazy danych
        console.log('14. Inicjalizacja synchronizacji bazy danych...');
        if (typeof DatabaseSync !== 'undefined') {
            window.databaseSync = new DatabaseSync();
            // Nie startuj auto-sync tutaj
            initStatus.modules.databaseSync = 'OK (manual sync)';
        } else {
            initStatus.warnings.push('DatabaseSync nie jest załadowany');
        }
        
        // 15. Inicjalizacja rozszerzonej gamifikacji
        console.log('15. Inicjalizacja rozszerzonej gamifikacji...');
        if (typeof ExtendedGamificationSystem !== 'undefined') {
            window.extendedGamification = new ExtendedGamificationSystem();
            window.extendedGamification.initializeSystem();
            initStatus.modules.extendedGamification = 'OK';
        } else {
            initStatus.warnings.push('ExtendedGamificationSystem nie jest załadowany');
        }
        
        // 16. Inicjalizacja UI improvements
        console.log('16. Inicjalizacja UI improvements...');
        if (typeof UIImprovements !== 'undefined') {
            window.uiImprovements = new UIImprovements();
            window.uiImprovements.init();
            initStatus.modules.uiImprovements = 'OK';
        } else {
            initStatus.warnings.push('UIImprovements nie jest załadowany');
        }
        
        // 17. Dodaj globalną funkcję pomocniczą do sprawdzania modułów
        window.QuizMaster = {
            modules: {
                navigation: window.navigationIntegration,
                aiGrader: window.aiGrader,
                achievements: window.achievementsSystem,
                recommendations: window.recommendationSystem,
                ckeParser: window.ckeParser,
                stepGrading: window.stepGrading,
                ckeImportUI: window.ckeImportUI,
                teacherEnhancements: window.teacherEnhancements,
                competitions: window.competitionSystem,
                advancedMath: window.advancedMath,
                databaseSync: window.databaseSync,
                extendedGamification: window.extendedGamification,
                uiImprovements: window.uiImprovements
            },
            isModuleLoaded: function(moduleName) {
                return this.modules[moduleName] !== undefined;
            },
            getInitStatus: function() {
                return initStatus;
            }
        };
        
        // Podsumowanie inicjalizacji
        console.log('\n=== Podsumowanie inicjalizacji ===');
        console.log('Moduły zainicjalizowane:', Object.keys(initStatus.modules).filter(m => initStatus.modules[m].includes('OK')).length);
        console.log('Ostrzeżenia:', initStatus.warnings.length);
        console.log('Błędy:', initStatus.errors.length);
        
        if (initStatus.warnings.length > 0) {
            console.warn('Ostrzeżenia:', initStatus.warnings);
        }
        
        if (initStatus.errors.length > 0) {
            console.error('Błędy:', initStatus.errors);
        }
        
        console.log('\nAby sprawdzić status inicjalizacji, użyj: QuizMaster.getInitStatus()');
        console.log('Aby sprawdzić czy moduł jest załadowany, użyj: QuizMaster.isModuleLoaded("nazwa")');
        
    } catch (error) {
        console.error('Krytyczny błąd podczas inicjalizacji aplikacji:', error);
        initStatus.errors.push(error.message);
    }
});

// Funkcja pomocnicza do bezpiecznego wywołania metod modułów
window.safeModuleCall = function(moduleName, methodName, ...args) {
    try {
        if (window.QuizMaster && window.QuizMaster.isModuleLoaded(moduleName)) {
            const module = window.QuizMaster.modules[moduleName];
            if (module && typeof module[methodName] === 'function') {
                return module[methodName](...args);
            } else {
                console.warn(`Metoda ${methodName} nie istnieje w module ${moduleName}`);
            }
        } else {
            console.warn(`Moduł ${moduleName} nie jest załadowany`);
        }
    } catch (error) {
        console.error(`Błąd wywołania ${moduleName}.${methodName}:`, error);
    }
    return null;
};