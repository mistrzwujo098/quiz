// System harmonogramu egzaminów
class ExamScheduler {
    constructor() {
        this.events = this.loadEvents();
        this.reminders = this.loadReminders();
    }

    // Załaduj wydarzenia
    loadEvents() {
        return JSON.parse(localStorage.getItem('examScheduleEvents') || '[]');
    }

    // Załaduj przypomnienia
    loadReminders() {
        return JSON.parse(localStorage.getItem('examScheduleReminders') || '[]');
    }

    // Zapisz wydarzenia
    saveEvents() {
        localStorage.setItem('examScheduleEvents', JSON.stringify(this.events));
    }

    // Zapisz przypomnienia
    saveReminders() {
        localStorage.setItem('examScheduleReminders', JSON.stringify(this.reminders));
    }

    // Dodaj wydarzenie
    addEvent(eventData) {
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: eventData.title,
            description: eventData.description || '',
            date: eventData.date,
            time: eventData.time || '09:00',
            duration: eventData.duration || 60, // minuty
            type: eventData.type || 'exam', // exam, quiz, homework, other
            subject: eventData.subject,
            targetGroups: eventData.targetGroups || [],
            targetStudents: eventData.targetStudents || [],
            examId: eventData.examId || null,
            location: eventData.location || '',
            createdBy: eventData.createdBy,
            createdAt: new Date().toISOString(),
            status: 'scheduled', // scheduled, ongoing, completed, cancelled
            color: eventData.color || this.getDefaultColor(eventData.type),
            reminders: eventData.reminders || [24, 1] // godziny przed wydarzeniem
        };

        this.events.push(event);
        this.saveEvents();

        // Ustaw przypomnienia
        this.scheduleReminders(event);

        return event;
    }

    // Zaktualizuj wydarzenie
    updateEvent(eventId, updates) {
        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return false;

        this.events[eventIndex] = {
            ...this.events[eventIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveEvents();

        // Zaktualizuj przypomnienia
        this.cancelReminders(eventId);
        this.scheduleReminders(this.events[eventIndex]);

        return true;
    }

    // Usuń wydarzenie
    deleteEvent(eventId) {
        this.events = this.events.filter(e => e.id !== eventId);
        this.saveEvents();

        // Anuluj przypomnienia
        this.cancelReminders(eventId);

        return true;
    }

    // Anuluj wydarzenie
    cancelEvent(eventId, reason) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return false;

        event.status = 'cancelled';
        event.cancelledAt = new Date().toISOString();
        event.cancelReason = reason;

        this.saveEvents();
        this.cancelReminders(eventId);

        return true;
    }

    // Oznacz jako ukończone
    completeEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return false;

        event.status = 'completed';
        event.completedAt = new Date().toISOString();

        this.saveEvents();
        return true;
    }

    // Pobierz wydarzenia dla zakresu dat
    getEvents(startDate, endDate, filters = {}) {
        let filteredEvents = this.events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate >= startDate && eventDate <= endDate;
        });

        // Filtruj po typie
        if (filters.type) {
            filteredEvents = filteredEvents.filter(e => e.type === filters.type);
        }

        // Filtruj po przedmiocie
        if (filters.subject) {
            filteredEvents = filteredEvents.filter(e => e.subject === filters.subject);
        }

        // Filtruj po grupie
        if (filters.groupId) {
            filteredEvents = filteredEvents.filter(e => 
                e.targetGroups.includes(filters.groupId)
            );
        }

        // Filtruj po uczniu
        if (filters.studentId) {
            filteredEvents = filteredEvents.filter(e => 
                e.targetStudents.includes(filters.studentId) ||
                e.targetGroups.length === 0 // wydarzenia dla wszystkich
            );
        }

        // Filtruj po statusie
        if (filters.status) {
            filteredEvents = filteredEvents.filter(e => e.status === filters.status);
        }

        return filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Pobierz nadchodzące wydarzenia
    getUpcomingEvents(days = 7, filters = {}) {
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        return this.getEvents(now, endDate, filters);
    }

    // Pobierz wydarzenia na dziś
    getTodayEvents(filters = {}) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.getEvents(today, tomorrow, filters);
    }

    // Zaplanuj przypomnienia
    scheduleReminders(event) {
        if (!event.reminders || event.reminders.length === 0) return;

        const eventDateTime = new Date(`${event.date}T${event.time}`);
        
        event.reminders.forEach(hoursBeforeMs => {
            const reminderTime = new Date(eventDateTime.getTime() - hoursBeforeMs * 60 * 60 * 1000);
            
            // Tylko jeśli przypomnienie jest w przyszłości
            if (reminderTime > new Date()) {
                const reminder = {
                    id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventTime: event.time,
                    reminderTime: reminderTime.toISOString(),
                    hoursBeforeMs,
                    sent: false,
                    createdAt: new Date().toISOString()
                };

                this.reminders.push(reminder);
            }
        });

        this.saveReminders();
    }

    // Anuluj przypomnienia
    cancelReminders(eventId) {
        this.reminders = this.reminders.filter(r => r.eventId !== eventId);
        this.saveReminders();
    }

    // Sprawdź i wyślij przypomnienia
    checkReminders() {
        const now = new Date();
        const pendingReminders = this.reminders.filter(r => 
            !r.sent && new Date(r.reminderTime) <= now
        );

        const notifications = [];

        pendingReminders.forEach(reminder => {
            // Oznacz jako wysłane
            reminder.sent = true;
            reminder.sentAt = now.toISOString();

            // Przygotuj powiadomienie
            notifications.push({
                id: reminder.id,
                type: 'reminder',
                title: 'Przypomnienie o egzaminie',
                message: `${reminder.eventTitle} - ${this.formatDateTime(reminder.eventDate, reminder.eventTime)}`,
                eventId: reminder.eventId,
                timestamp: now.toISOString()
            });
        });

        if (pendingReminders.length > 0) {
            this.saveReminders();
        }

        return notifications;
    }

    // Pobierz wydarzenia dla widoku kalendarza
    getCalendarEvents(year, month) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        return this.getEvents(startDate, endDate);
    }

    // Sprawdź konflikty
    checkConflicts(date, time, duration, excludeEventId = null) {
        const eventStart = new Date(`${date}T${time}`);
        const eventEnd = new Date(eventStart.getTime() + duration * 60 * 1000);

        const conflicts = this.events.filter(e => {
            if (e.id === excludeEventId || e.status === 'cancelled') return false;

            const existingStart = new Date(`${e.date}T${e.time}`);
            const existingEnd = new Date(existingStart.getTime() + e.duration * 60 * 1000);

            return (eventStart < existingEnd && eventEnd > existingStart);
        });

        return conflicts;
    }

    // Eksportuj do formatu iCal
    exportToICal(events) {
        let icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//QuizMaster//Exam Schedule//PL',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        events.forEach(event => {
            const startDate = new Date(`${event.date}T${event.time}`);
            const endDate = new Date(startDate.getTime() + event.duration * 60 * 1000);

            icalContent.push(
                'BEGIN:VEVENT',
                `UID:${event.id}@quizmaster.local`,
                `DTSTAMP:${this.formatICalDate(new Date())}`,
                `DTSTART:${this.formatICalDate(startDate)}`,
                `DTEND:${this.formatICalDate(endDate)}`,
                `SUMMARY:${event.title}`,
                `DESCRIPTION:${event.description || ''}`,
                `LOCATION:${event.location || ''}`,
                `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
                'END:VEVENT'
            );
        });

        icalContent.push('END:VCALENDAR');
        return icalContent.join('\r\n');
    }

    // Pomocnicze funkcje
    getDefaultColor(type) {
        const colors = {
            exam: '#dc2626',      // czerwony
            quiz: '#f59e0b',      // pomarańczowy
            homework: '#3b82f6',  // niebieski
            other: '#6b7280'      // szary
        };
        return colors[type] || colors.other;
    }

    formatDateTime(date, time) {
        const d = new Date(date);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return `${d.toLocaleDateString('pl-PL', options)}, ${time}`;
    }

    formatICalDate(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    // Pobierz statystyki
    getStatistics() {
        const now = new Date();
        const completed = this.events.filter(e => e.status === 'completed').length;
        const cancelled = this.events.filter(e => e.status === 'cancelled').length;
        const upcoming = this.events.filter(e => new Date(e.date) > now && e.status === 'scheduled').length;

        return {
            total: this.events.length,
            completed,
            cancelled,
            upcoming,
            byType: this.events.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {}),
            bySubject: this.events.reduce((acc, e) => {
                if (e.subject) {
                    acc[e.subject] = (acc[e.subject] || 0) + 1;
                }
                return acc;
            }, {})
        };
    }
}

// Eksportuj jako globalną
window.ExamScheduler = ExamScheduler;