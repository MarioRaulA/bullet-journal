class TabletFeatures {
    constructor(journalApp) {
        this.app = journalApp;
        this.isTablet = this.detectTablet();
        this.currentOrientation = this.getOrientation();
        this.isSplitView = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    detectTablet() {
        // Detectar si es tablet
        const isIPad = navigator.maxTouchPoints > 1 && 
                      /Macintosh/.test(navigator.userAgent) && 
                      /iPad|Macintosh/.test(navigator.platform);
        
        const isAndroidTablet = /Android/.test(navigator.userAgent) && 
                               !/Mobile/.test(navigator.userAgent);
        
        const isWindowsTablet = /Windows/.test(navigator.userAgent) && 
                               navigator.maxTouchPoints > 1;
        
        // También por tamaño de pantalla
        const isLargeScreen = window.innerWidth >= 768;
        
        return isIPad || isAndroidTablet || isWindowsTablet || isLargeScreen;
    }

    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    initialize() {
        if (!this.isTablet) {
            // En teléfono, ocultar panel de detalles siempre
            document.querySelector('.detail-panel').style.display = 'none';
        }

        this.setupOrientationHandler();
        this.setupSplitViewDetection();
        this.setupSwipeGestures();
        this.setupDragAndDrop();
        this.setupKeyboardShortcuts();
        this.setupApplePencil();
        this.setupMultitaskingGestures();
        this.setupVoiceInput();
        this.setupPhotoAttachments();
        this.setupContextMenus();
        
        // Actualizar estadísticas
        this.updateQuickStats();
    }

    setupOrientationHandler() {
        const mediaQuery = window.matchMedia("(orientation: portrait)");
        
        mediaQuery.addListener((e) => {
            this.currentOrientation = e.matches ? 'portrait' : 'landscape';
            this.handleOrientationChange();
        });

        // También con resize
        window.addEventListener('resize', () => {
            const newOrientation = this.getOrientation();
            if (newOrientation !== this.currentOrientation) {
                this.currentOrientation = newOrientation;
                this.handleOrientationChange();
            }
        });
    }

    handleOrientationChange() {
        if (this.isTablet && this.currentOrientation === 'landscape') {
            // Mostrar panel de detalles
            const detailPanel = document.querySelector('.detail-panel');
            if (detailPanel) {
                detailPanel.style.display = 'block';
                detailPanel.style.width = '320px';
            }
            
            // Ajustar sidebar
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('open');
        } else if (this.isTablet && this.currentOrientation === 'portrait') {
            // Ocultar panel de detalles
            const detailPanel = document.querySelector('.detail-panel');
            if (detailPanel) {
                detailPanel.style.display = 'none';
            }
            
            // Sidebar opcional en vertical
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('open');
        }
    }

    setupSplitViewDetection() {
        // Detectar si la app está en Split View (iPadOS)
        const checkSplitView = () => {
            const width = window.innerWidth;
            this.isSplitView = width < 768 && this.isTablet;
            
            if (this.isSplitView) {
                document.body.classList.add('split-view');
                // Compactar UI
                document.querySelector('.detail-panel').style.display = 'none';
            } else {
                document.body.classList.remove('split-view');
            }
        };

        window.addEventListener('resize', checkSplitView);
        checkSplitView();
    }

    setupSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let currentEntry = null;

        document.addEventListener('touchstart', (e) => {
            const entry = e.target.closest('.entry-item');
            if (entry) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                currentEntry = entry;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!currentEntry) return;
            
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            
            // Solo swipe horizontal (evitar conflicto con scroll)
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0 && deltaX < 100) {
                currentEntry.style.transform = `translateX(${deltaX}px)`;
                currentEntry.style.opacity = 1 - (deltaX / 200);
                currentEntry.classList.add('swiping');
            }
        });

        document.addEventListener('touchend', (e) => {
            if (!currentEntry) return;
            
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            
            if (deltaX > 80) {
                // Swipe derecho: completar tarea
                const entryId = currentEntry.dataset.id;
                const date = document.getElementById('dailyDate').value;
                this.app.storage.updateDailyEntry(date, parseInt(entryId), { 
                    completed: true,
                    bullet: '✓'
                });
                this.app.loadDailyLog();
                
                // Feedback háptico
                if (window.navigator.vibrate) {
                    window.navigator.vibrate(50);
                }
            }
            
            // Reset
            currentEntry.style.transform = '';
            currentEntry.style.opacity = '';
            currentEntry.classList.remove('swiping');
            currentEntry = null;
        });
    }

    setupDragAndDrop() {
        const entriesList = document.getElementById('dailyEntries');
        
        if (!entriesList) return;

        let draggedItem = null;

        entriesList.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.entry-item');
            if (draggedItem) {
                draggedItem.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedItem.dataset.id);
            }
        });

        entriesList.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.style.opacity = '';
                draggedItem = null;
            }
        });

        entriesList.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        entriesList.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('.entry-item');
            
            if (draggedItem && targetItem && draggedItem !== targetItem) {
                // Reordenar visualmente
                const parent = entriesList;
                const allItems = [...parent.children];
                const fromIndex = allItems.indexOf(draggedItem);
                const toIndex = allItems.indexOf(targetItem);
                
                if (fromIndex < toIndex) {
                    parent.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    parent.insertBefore(draggedItem, targetItem);
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        // Útil para tablets con teclado físico (iPad con Magic Keyboard)
        document.addEventListener('keydown', (e) => {
            const isCmd = e.metaKey || e.ctrlKey;
            
            if (isCmd) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        document.getElementById('dailyEntry').focus();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('searchToggle').click();
                        break;
                    case 'd':
                        e.preventDefault();
                        document.getElementById('dailyDate').showPicker();
                        break;
                    case 's':
                        e.preventDefault();
                        this.app.storage.exportData();
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                        e.preventDefault();
                        const views = ['daily', 'monthly', 'future', 'collections', 'habits'];
                        const index = parseInt(e.key) - 1;
                        this.app.switchView(views[index]);
                        break;
                }
            }
            
            // Escape para cerrar modales
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.open').forEach(modal => {
                    modal.classList.remove('open');
                });
                document.querySelector('.search-bar.visible')?.classList.remove('visible');
            }
        });
    }

    setupApplePencil() {
        // Detectar Apple Pencil
        document.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'pen') {
                console.log('Apple Pencil detectado');
                document.body.classList.add('pencil-active');
                
                // Habilitar canvas de dibujo si está visible
                const canvas = document.getElementById('drawingCanvas');
                if (canvas && canvas.style.display !== 'none') {
                    this.startDrawing(e);
                }
            }
        });

        document.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'pen') {
                document.body.classList.remove('pencil-active');
            }
        });

        // Presión del lápiz
        document.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'pen' && e.pressure > 0) {
                const brushSize = document.getElementById('brushSize');
                if (brushSize) {
                    brushSize.value = Math.max(1, e.pressure * 10);
                }
            }
        });
    }

    setupMultitaskingGestures() {
        // Gestos de múltiples dedos para iPad
        let initialDistance = 0;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 3 && this.isTablet) {
                // Three finger swipe: cambiar de vista
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialDistance = 0;
            }
        });
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    setupVoiceInput() {
        const voiceBtn = document.querySelector('[data-action="voiceNote"]');
        
        if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = false;
            recognition.interimResults = false;

            voiceBtn.addEventListener('click', () => {
                voiceBtn.style.color = 'var(--accent)';
                recognition.start();
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const textarea = document.getElementById('dailyEntry');
                textarea.value = (textarea.value ? textarea.value + '\n' : '') + '• ' + transcript;
                voiceBtn.style.color = '';
            };

            recognition.onerror = () => {
                voiceBtn.style.color = '';
            };
        } else if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }

    setupPhotoAttachments() {
        const photoBtn = document.querySelector('[data-action="photo"]');
        
        if (photoBtn) {
            photoBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment'; // Cámara trasera en tablets
                
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const imageData = event.target.result;
                            // Guardar imagen en la entrada actual
                            const date = document.getElementById('dailyDate').value;
                            this.app.storage.addDailyEntry(date, {
                                text: `📷 Foto adjunta`,
                                type: 'note',
                                bullet: '—',
                                attachment: imageData
                            });
                            this.app.loadDailyLog();
                        };
                        reader.readAsDataURL(file);
                    }
                };
                
                input.click();
            });
        }
    }

    setupContextMenus() {
        // Menú contextual en presión larga (útil en tablet)
        document.addEventListener('contextmenu', (e) => {
            const entry = e.target.closest('.entry-item');
            if (entry) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, entry);
            }
        });
    }

    showContextMenu(x, y, entry) {
        // Crear menú contextual personalizado
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: var(--bg-secondary);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            padding: 8px;
            z-index: 300;
            min-width: 200px;
        `;

        const options = [
            { label: '✏️ Editar', action: () => this.editEntry(entry) },
            { label: '✓ Completar', action: () => this.toggleEntry(entry) },
            { label: '➡️ Migrar', action: () => this.migrateEntry(entry) },
            { label: '📋 Copiar', action: () => this.copyEntry(entry) },
            { label: '🗑️ Eliminar', action: () => this.deleteEntry(entry) },
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.textContent = opt.label;
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-radius: 8px;
                font-size: 0.95em;
            `;
            item.addEventListener('click', () => {
                opt.action();
                menu.remove();
            });
            item.addEventListener('mouseenter', () => {
                item.style.background = 'var(--bg-primary)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = '';
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // Cerrar al hacer clic fuera
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    editEntry(entryElement) {
        const entryId = entryElement.dataset.id;
        const date = document.getElementById('dailyDate').value;
        const entries = this.app.storage.getDailyEntries(date);
        const entry = entries.find(e => e.id === parseInt(entryId));
        
        if (entry) {
            const newText = prompt('Editar entrada:', entry.text);
            if (newText) {
                this.app.storage.updateDailyEntry(date, parseInt(entryId), { text: newText });
                this.app.loadDailyLog();
            }
        }
    }

    toggleEntry(entryElement) {
        const entryId = entryElement.dataset.id;
        const date = document.getElementById('dailyDate').value;
        const entries = this.app.storage.getDailyEntries(date);
        const entry = entries.find(e => e.id === parseInt(entryId));
        
        if (entry) {
            this.app.storage.updateDailyEntry(date, parseInt(entryId), { 
                completed: !entry.completed 
            });
            this.app.loadDailyLog();
        }
    }

    migrateEntry(entryElement) {
        const entryId = entryElement.dataset.id;
        const date = document.getElementById('dailyDate').value;
        const newDate = prompt('Migrar a fecha (YYYY-MM-DD):', '');
        
        if (newDate) {
            this.app.storage.migrateTask(date, parseInt(entryId), newDate);
            this.app.loadDailyLog();
        }
    }

    copyEntry(entryElement) {
        const entryId = entryElement.dataset.id;
        const date = document.getElementById('dailyDate').value;
        const entries = this.app.storage.getDailyEntries(date);
        const entry = entries.find(e => e.id === parseInt(entryId));
        
        if (entry) {
            navigator.clipboard.writeText(entry.text).then(() => {
                this.showToast('Texto copiado al portapapeles');
            });
        }
    }

    deleteEntry(entryElement) {
        if (confirm('¿Eliminar esta entrada?')) {
            const entryId = entryElement.dataset.id;
            const date = document.getElementById('dailyDate').value;
            this.app.storage.deleteDailyEntry(date, parseInt(entryId));
            this.app.loadDailyLog();
        }
    }

    updateQuickStats() {
        const data = this.app.storage.getData();
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = data.dailyLog[today] || [];
        const pendingTasks = todayEntries.filter(e => e.type === 'task' && !e.completed).length;

        document.getElementById('pendingTasks').textContent = `${pendingTasks} pendientes`;
        document.getElementById('todayEntries').textContent = `${todayEntries.length} hoy`;
        document.getElementById('dailyBadge').textContent = todayEntries.length;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--text-primary);
            color: var(--bg-primary);
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 0.9em;
            z-index: 400;
            animation: toastIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    startDrawing(e) {
        // Implementado en drawing.js
        if (window.drawingModule) {
            window.drawingModule.startDrawing(e);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.tabletFeatures = new TabletFeatures(app);
    window.tabletFeatures.initialize();
});