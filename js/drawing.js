class DrawingModule {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.color = '#000000';
        this.brushSize = 3;
        this.lastX = 0;
        this.lastY = 0;
        this.pressure = 1;
    }

    initialize() {
        this.setupCanvas();
        this.setupToolbar();
        this.setupTouchEvents();
        this.setupPointerEvents();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // Fondo blanco
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Configuración de dibujo
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    resizeCanvas() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.ctx.putImageData(imageData, 0, 0);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    setupToolbar() {
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTool = e.target.dataset.tool;
                document.querySelectorAll('[data-tool]').forEach(b => b.style.background = '');
                e.target.style.background = 'var(--accent)';
            });
        });

        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.color = e.target.value;
        });

        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = e.target.value;
        });

        document.getElementById('clearCanvas').addEventListener('click', () => {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        });

        document.getElementById('saveDrawing').addEventListener('click', () => {
            this.saveDrawing();
        });
    }

    setupTouchEvents() {
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch.clientX, touch.clientY, e.touches[0].force || 1);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.draw(touch.clientX, touch.clientY, e.touches[0].force || 1);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
        });
    }

    setupPointerEvents() {
        // Para Apple Pencil y otros stylus
        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'pen') {
                e.preventDefault();
                this.startDrawing(e.clientX, e.clientY, e.pressure);
            }
        });

        this.canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'pen' && this.isDrawing) {
                e.preventDefault();
                this.draw(e.clientX, e.clientY, e.pressure);
            }
        });

        this.canvas.addEventListener('pointerup', (e) => {
            if (e.pointerType === 'pen') {
                e.preventDefault();
                this.stopDrawing();
            }
        });
    }

    startDrawing(x, y, pressure) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = x - rect.left;
        this.lastY = y - rect.top;
        this.pressure = pressure;

        // Feedback visual
        this.canvas.style.cursor = 'crosshair';
    }

    draw(x, y, pressure) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const currentX = x - rect.left;
        const currentY = y - rect.top;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);

        if (this.currentTool === 'pen') {
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.brushSize * (pressure || 1);
        } else if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = this.brushSize * 2;
        }

        this.ctx.stroke();

        this.lastX = currentX;
        this.lastY = currentY;
    }

    stopDrawing() {
        this.isDrawing = false;
        this.canvas.style.cursor = 'default';
    }

    saveDrawing() {
        const imageData = this.canvas.toDataURL('image/png');
        
        // Guardar como entrada en el journal
        const date = document.getElementById('dailyDate').value;
        app.storage.addDailyEntry(date, {
            text: '🎨 Dibujo',
            type: 'note',
            bullet: '—',
            attachment: imageData,
            drawing: true
        });
        
        app.loadDailyLog();
        
        // Cerrar modal de dibujo
        document.getElementById('drawingModal').classList.remove('open');
        
        // Notificar
        if (window.tabletFeatures) {
            window.tabletFeatures.showToast('Dibujo guardado');
        }
    }
}

// Inicializar módulo de dibujo
document.addEventListener('DOMContentLoaded', () => {
    window.drawingModule = new DrawingModule();
    window.drawingModule.initialize();
});