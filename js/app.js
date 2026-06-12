// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado:', registration.scope);
            })
            .catch(error => {
                console.log('Error en ServiceWorker:', error);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    const installBtn = document.createElement('button');
    installBtn.textContent = '📱 Instalar App';
    installBtn.className = 'install-btn';
    installBtn.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó instalar');
            }
            deferredPrompt = null;
            installBtn.remove();
        });
    };
    document.querySelector('.header').appendChild(installBtn);
});

// File import handler
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        app.storage.importData(file)
            .then(() => {
                alert('Datos importados exitosamente');
                location.reload();
            })
            .catch(() => {
                alert('Error al importar el archivo');
            });
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    showNotification('Conexión restaurada');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    showNotification('Modo sin conexión - los cambios se guardarán localmente');
});

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Share functionality
if (navigator.share) {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'icon-btn';
    shareBtn.innerHTML = '📤';
    shareBtn.title = 'Compartir';
    shareBtn.onclick = async () => {
        try {
            const data = app.storage.getData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const file = new File([blob], 'bullet-journal.json', { type: 'application/json' });
            
            await navigator.share({
                title: 'Mi Bullet Journal',
                text: 'Aquí está mi Bullet Journal',
                files: [file]
            });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };
    document.querySelector('.header').appendChild(shareBtn);
}