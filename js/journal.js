class BulletJournal {
    constructor(storage) {
        this.storage = storage;
        this.currentView = 'daily';
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentMonth = new Date();
        this.selectedType = 'task';
    }

    initialize() {
        this.setupEventListeners();
        this.loadView(this.currentView);
        this.loadTheme();
        this.checkForMigration();
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.collection-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        document.getElementById('closeSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Date picker
        document.getElementById('dailyDate').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.loadDailyLog();
        });

        // Entry type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedType = e.target.dataset.type;
            });
        });

        // Add daily entry
        document.getElementById('addDailyEntry').addEventListener('click', () => {
            this.addDailyEntry();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        document.getElementById('dailyEntry').focus();
                        break;
                    case 's':
                        e.preventDefault();
                        this.storage.exportData();
                        break;
                }
            }
        });

        // Modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // New collection
        document.getElementById('newCollection').addEventListener('click', () => {
            this.openModal('Nueva Colección', 'text');
        });
    }

    switchView(view) {
        // Update active state
        document.querySelectorAll('.collection-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Show selected view
        const viewElement = document.getElementById(view + 'View');
        if (viewElement) {
            viewElement.classList.add('active');
            this.currentView = view;
        }

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');

        // Load view content
        this.loadView(view);
    }

    loadView(view) {
        switch(view) {
            case 'daily':
                this.loadDailyLog();
                break;
            case 'monthly':
                this.loadMonthlyLog();
                break;
            case 'future':
                this.loadFutureLog();
                break;
            case 'collections':
                this.loadCollections();
                break;
            case 'habits':
                this.loadHabits();
                break;
        }
    }

    // Daily Log Methods
    loadDailyLog() {
        document.getElementById('dailyDate').value = this.currentDate;
        const entries = this.storage.getDailyEntries(this.currentDate);
        this.renderEntries('dailyEntries', entries, this.currentDate);
    }

    addDailyEntry() {
        const textarea = document.getElementById('dailyEntry');
        const text = textarea.value.trim();
        
        if (!text) return;

        const entry = {
            text: text,
            type: this.selectedType,
            bullet: this.getBulletSymbol(this.selectedType)
        };

        this.storage.addDailyEntry(this.currentDate, entry);
        textarea.value = '';
        this.loadDailyLog();
    }

    getBulletSymbol(type) {
        const symbols = {
            task: '•',
            event: '○',
            note: '—',
            priority: '★',
            completed: '✓'
        };
        return symbols[type] || '•';
    }

    renderEntries(containerId, entries, date) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay entradas para esta fecha</p>';
            return;
        }

        entries.forEach(entry => {
            const entryElement = this.createEntryElement(entry, date);
            container.appendChild(entryElement);
        });
    }

    createEntryElement(entry, date) {
        const div = document.createElement('div');
        div.className = `entry-item ${entry.completed ? 'completed' : ''}`;
        div.dataset.id = entry.id;

        // Bullet symbol based on type
        const bulletSpan = document.createElement('span');
        bulletSpan.className = 'entry-bullet';
        
        if (entry.type === 'task') {
            const checkbox = document.createElement('div');
            checkbox.className = `entry-check ${entry.completed ? 'checked' : ''}`;
            checkbox.innerHTML = entry.completed ? '✓' : '';
            checkbox.addEventListener('click', () => this.toggleTaskComplete(date, entry.id));
            div.appendChild(checkbox);
        } else {
            bulletSpan.textContent = entry.bullet || this.getBulletSymbol(entry.type);
            div.appendChild(bulletSpan);
        }

        // Entry text
        const textSpan = document.createElement('span');
        textSpan.className = 'entry-text';
        textSpan.textContent = entry.text;
        div.appendChild(textSpan);

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'entry-actions';

        // Migrate button (for tasks)
        if (entry.type === 'task' && !entry.completed) {
            const migrateBtn = document.createElement('button');
            migrateBtn.className = 'icon-btn';
            migrateBtn.innerHTML = '➡️';
            migrateBtn.title = 'Migrar tarea';
            migrateBtn.addEventListener('click', () => {
                const newDate = prompt('Migrar a fecha (YYYY-MM-DD):', '');
                if (newDate) {
                    this.storage.migrateTask(date, entry.id, newDate);
                    this.loadDailyLog();
                }
            });
            actions.appendChild(migrateBtn);
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Eliminar';
        deleteBtn.addEventListener('click', () => {
            if (confirm('¿Eliminar esta entrada?')) {
                this.storage.deleteDailyEntry(date, entry.id);
                this.loadDailyLog();
            }
        });
        actions.appendChild(deleteBtn);

        div.appendChild(actions);
        return div;
    }

    toggleTaskComplete(date, entryId) {
        const entries = this.storage.getDailyEntries(date);
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            this.storage.updateDailyEntry(date, entryId, { 
                completed: !entry.completed,
                bullet: !entry.completed ? '✓' : '•'
            });
            this.loadDailyLog();
        }
    }

    // Monthly Log Methods
    loadMonthlyLog() {
        this.renderCalendar();
        this.loadMonthlyTasks();
    }

    renderCalendar() {
        const calendar = document.getElementById('monthlyCalendar');
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleDateString('es', { month: 'long', year: 'numeric' });

        calendar.innerHTML = '';

        // Day headers
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        // Calendar days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date().toISOString().split('T')[0];

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            calendar.appendChild(document.createElement('div'));
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            if (dateStr === today) {
                dayElement.classList.add('today');
            }

            // Check if there are entries for this date
            const entries = this.storage.getDailyEntries(dateStr);
            if (entries.length > 0) {
                dayElement.style.background = 'var(--accent-light)';
            }

            dayElement.addEventListener('click', () => {
                this.currentDate = dateStr;
                this.switchView('daily');
            });

            calendar.appendChild(dayElement);
        }
    }

    loadMonthlyTasks() {
        const container = document.getElementById('monthlyTasks');
        container.innerHTML = '';
        
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Recopilar todas las tareas del mes
        const monthlyTasks = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entries = this.storage.getDailyEntries(dateStr);
            entries.forEach(entry => {
                monthlyTasks.push({
                    ...entry,
                    date: dateStr
                });
            });
        }

        if (monthlyTasks.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay tareas este mes</p>';
            return;
        }

        monthlyTasks.forEach(entry => {
            const taskElement = document.createElement('div');
            taskElement.className = 'entry-item';
            taskElement.innerHTML = `
                <span class="entry-bullet">${entry.bullet}</span>
                <span>${entry.text}</span>
                <small>${entry.date}</small>
            `;
            container.appendChild(taskElement);
        });
    }

    // Future Log Methods
    loadFutureLog() {
        const entries = this.storage.getFutureLog();
        this.renderEntries('futureEntries', entries);
    }

    // Collections Methods
    loadCollections() {
        const collections = this.storage.getCollections();
        const container = document.getElementById('collectionsGrid');
        container.innerHTML = '';

        if (collections.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay colecciones. ¡Crea una nueva!</p>';
            return;
        }

        collections.forEach(collection => {
            const card = document.createElement('div');
            card.className = 'collection-card';
            card.innerHTML = `
                <h3>${collection.name}</h3>
                <p>${collection.description || ''}</p>
                <small>${collection.entries.length} entradas</small>
            `;
            card.addEventListener('click', () => this.openCollection(collection.id));
            container.appendChild(card);
        });
    }

    openCollection(collectionId) {
        // Implementar vista detallada de colección
        alert('Función de colección detallada en desarrollo');
    }

    // Habits Methods
    loadHabits() {
        const habits = this.storage.getHabits();
        const container = document.getElementById('habitsTracker');
        container.innerHTML = '';

        if (habits.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay hábitos configurados</p>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        habits.forEach(habit => {
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            
            const isTrackedToday = habit.tracker[today];
            
            habitElement.innerHTML = `
                <div class="habit-check ${isTrackedToday ? 'checked' : ''}" 
                     onclick="app.toggleHabit(${habit.id}, '${today}')">
                    ${isTrackedToday ? '✓' : ''}
                </div>
                <span class="habit-name">${habit.name}</span>
            `;
            
            container.appendChild(habitElement);
        });
    }

    // Theme Methods
    loadTheme() {
        const theme = this.storage.getTheme();
        document.body.dataset.theme = theme;
    }

    toggleTheme() {
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        this.storage.setTheme(newTheme);
    }

    // Migration check
    checkForMigration() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const entries = this.storage.getDailyEntries(yesterdayStr);
        const uncompletedTasks = entries.filter(e => e.type === 'task' && !e.completed && !e.migrated);

        if (uncompletedTasks.length > 0) {
            const migrate = confirm(`Hay ${uncompletedTasks.length} tareas sin completar de ayer. ¿Deseas migrarlas a hoy?`);
            if (migrate) {
                uncompletedTasks.forEach(task => {
                    this.storage.migrateTask(yesterdayStr, task.id, this.currentDate);
                });
                this.loadDailyLog();
            }
        }
    }

    // Modal Methods
    openModal(title, type) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modal').classList.add('open');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('open');
    }

    // Utility Methods
    toggleHabit(habitId, date) {
        this.storage.toggleHabit(habitId, date);
        this.loadHabits();
    }
}

// Initialize app
const storage = new BulletJournalStorage();
const app = new BulletJournal(storage);

document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});