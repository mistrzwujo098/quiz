// Bank gotowych arkuszy egzaminacyjnych
class ExamTemplatesBank {
    constructor() {
        this.templates = this.loadTemplates();
        this.sharedTemplates = this.loadSharedTemplates();
    }

    // Załaduj szablony użytkownika
    loadTemplates() {
        return JSON.parse(localStorage.getItem('examTemplates') || '[]');
    }

    // Załaduj szablony udostępnione
    loadSharedTemplates() {
        return JSON.parse(localStorage.getItem('sharedExamTemplates') || '[]');
    }

    // Zapisz szablony
    saveTemplates() {
        localStorage.setItem('examTemplates', JSON.stringify(this.templates));
    }

    // Zapisz udostępnione szablony
    saveSharedTemplates() {
        localStorage.setItem('sharedExamTemplates', JSON.stringify(this.sharedTemplates));
    }

    // Zapisz arkusz jako szablon
    saveAsTemplate(exam, metadata) {
        const template = {
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: metadata.name,
            description: metadata.description || '',
            subject: metadata.subject,
            level: metadata.level || 'podstawowy',
            tags: metadata.tags || [],
            createdBy: metadata.createdBy,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            useCount: 0,
            rating: 0,
            ratingCount: 0,
            isShared: false,
            exam: {
                title: exam.title,
                timeLimit: exam.timeLimit,
                questions: exam.questions,
                targetCategories: exam.targetCategories || []
            }
        };

        this.templates.push(template);
        this.saveTemplates();
        return template;
    }

    // Udostępnij szablon
    shareTemplate(templateId, teacherName) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return false;

        const sharedTemplate = {
            ...template,
            isShared: true,
            sharedBy: teacherName,
            sharedAt: new Date().toISOString(),
            downloads: 0,
            ratings: []
        };

        // Sprawdź czy nie jest już udostępniony
        const existingIndex = this.sharedTemplates.findIndex(t => t.id === templateId);
        if (existingIndex >= 0) {
            this.sharedTemplates[existingIndex] = sharedTemplate;
        } else {
            this.sharedTemplates.push(sharedTemplate);
        }

        // Oznacz lokalny szablon jako udostępniony
        template.isShared = true;
        
        this.saveTemplates();
        this.saveSharedTemplates();
        return true;
    }

    // Cofnij udostępnienie
    unshareTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            template.isShared = false;
            this.saveTemplates();
        }

        this.sharedTemplates = this.sharedTemplates.filter(t => t.id !== templateId);
        this.saveSharedTemplates();
        return true;
    }

    // Pobierz szablon z banku
    downloadTemplate(templateId, currentUser) {
        const sharedTemplate = this.sharedTemplates.find(t => t.id === templateId);
        if (!sharedTemplate) return null;

        // Zwiększ licznik pobrań
        sharedTemplate.downloads++;
        this.saveSharedTemplates();

        // Stwórz lokalną kopię
        const localCopy = {
            ...sharedTemplate,
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isShared: false,
            downloadedFrom: templateId,
            downloadedAt: new Date().toISOString(),
            createdBy: currentUser,
            useCount: 0
        };

        delete localCopy.sharedBy;
        delete localCopy.sharedAt;
        delete localCopy.downloads;
        delete localCopy.ratings;

        this.templates.push(localCopy);
        this.saveTemplates();
        return localCopy;
    }

    // Użyj szablonu do stworzenia nowego egzaminu
    useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId) || 
                        this.sharedTemplates.find(t => t.id === templateId);
        
        if (!template) return null;

        // Zwiększ licznik użyć
        if (this.templates.find(t => t.id === templateId)) {
            template.useCount++;
            this.saveTemplates();
        }

        // Zwróć kopię egzaminu
        return {
            ...template.exam,
            id: Date.now(),
            createdAt: new Date(),
            fromTemplate: templateId,
            templateName: template.name
        };
    }

    // Zaktualizuj szablon
    updateTemplate(templateId, updates) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return false;

        Object.assign(template, {
            ...updates,
            lastModified: new Date().toISOString()
        });

        // Jeśli szablon jest udostępniony, zaktualizuj też w shared
        if (template.isShared) {
            const sharedIndex = this.sharedTemplates.findIndex(t => t.id === templateId);
            if (sharedIndex >= 0) {
                this.sharedTemplates[sharedIndex] = { ...template };
                this.saveSharedTemplates();
            }
        }

        this.saveTemplates();
        return true;
    }

    // Usuń szablon
    deleteTemplate(templateId) {
        this.templates = this.templates.filter(t => t.id !== templateId);
        this.saveTemplates();

        // Usuń też z udostępnionych jeśli był udostępniony
        this.sharedTemplates = this.sharedTemplates.filter(t => t.id !== templateId);
        this.saveSharedTemplates();
        return true;
    }

    // Oceń szablon
    rateTemplate(templateId, rating, userId) {
        const template = this.sharedTemplates.find(t => t.id === templateId);
        if (!template) return false;

        if (!template.ratings) template.ratings = [];
        
        // Sprawdź czy użytkownik już oceniał
        const existingRatingIndex = template.ratings.findIndex(r => r.userId === userId);
        
        if (existingRatingIndex >= 0) {
            template.ratings[existingRatingIndex].rating = rating;
        } else {
            template.ratings.push({ userId, rating, date: new Date().toISOString() });
        }

        // Oblicz średnią ocenę
        const totalRating = template.ratings.reduce((sum, r) => sum + r.rating, 0);
        template.rating = totalRating / template.ratings.length;
        template.ratingCount = template.ratings.length;

        this.saveSharedTemplates();
        return true;
    }

    // Wyszukaj szablony
    searchTemplates(query, filters = {}) {
        let results = [...this.templates, ...this.sharedTemplates];

        // Filtruj po tekście
        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(t => 
                t.name.toLowerCase().includes(lowerQuery) ||
                t.description.toLowerCase().includes(lowerQuery) ||
                t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
        }

        // Filtruj po przedmiocie
        if (filters.subject) {
            results = results.filter(t => t.subject === filters.subject);
        }

        // Filtruj po poziomie
        if (filters.level) {
            results = results.filter(t => t.level === filters.level);
        }

        // Filtruj po tagach
        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(t => 
                filters.tags.some(tag => t.tags.includes(tag))
            );
        }

        // Filtruj tylko udostępnione
        if (filters.sharedOnly) {
            results = results.filter(t => t.isShared);
        }

        // Sortowanie
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'newest':
                    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'popular':
                    results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                    break;
                case 'rating':
                    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                case 'useCount':
                    results.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
                    break;
            }
        }

        return results;
    }

    // Pobierz statystyki
    getStatistics() {
        return {
            totalTemplates: this.templates.length,
            sharedTemplates: this.sharedTemplates.length,
            totalDownloads: this.sharedTemplates.reduce((sum, t) => sum + (t.downloads || 0), 0),
            totalUses: this.templates.reduce((sum, t) => sum + (t.useCount || 0), 0),
            averageRating: this.sharedTemplates.length > 0 
                ? this.sharedTemplates.reduce((sum, t) => sum + (t.rating || 0), 0) / this.sharedTemplates.filter(t => t.rating > 0).length
                : 0
        };
    }

    // Pobierz popularne tagi
    getPopularTags() {
        const tagCount = {};
        [...this.templates, ...this.sharedTemplates].forEach(t => {
            t.tags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });

        return Object.entries(tagCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));
    }
}

// Eksportuj jako globalną
window.ExamTemplatesBank = ExamTemplatesBank;