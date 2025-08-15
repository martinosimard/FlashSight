/**
 * Menu contextuel simplifié pour FlashSight Reader
 */
class ContextMenu {
    constructor(flashSightApp) {
        console.log('ContextMenu: Initialisation');
        this.app = flashSightApp;
        this.contextMenu = null;
        this.isVisible = false;
        
        // FORCER l'utilisation du menu HTML pour test
        this.useNativeMenu = false;
        
        if (this.useNativeMenu) {
            this.setupNativeMenu();
        } else {
            this.createMenu();
        }
        
        this.setupEventListeners();
        
        console.log('ContextMenu: Initialisé avec succès');
    }

    setupNativeMenu() {
        console.log('ContextMenu: Configuration menu natif Electron');
        
        // Gestionnaire pour les actions du menu natif
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            
            ipcRenderer.on('context-menu-action', (event, action) => {
                console.log('ContextMenu: Action reçue du menu natif:', action);
                this.executeAction(action);
            });
        }
    }

    createMenu() {
        // Supprimer tout menu existant
        const existing = document.getElementById('flashsight-context-menu');
        if (existing) existing.remove();
        
        // Créer le menu
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'flashsight-context-menu';
        this.contextMenu.className = 'flashsight-context-menu';
        
        // Styles inline pour éviter les conflits
        this.contextMenu.style.cssText = `
            position: fixed !important;
            background: white !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
            padding: 4px 0 !important;
            min-width: 180px !important;
            z-index: 999999 !important;
            display: none !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-size: 13px !important;
        `;
        
        this.contextMenu.innerHTML = `
            <div class="menu-item" data-action="copy" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>📋</span> Copier
            </div>
            <div class="menu-item" data-action="select-all" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>🔘</span> Tout sélectionner
            </div>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #eee;">
            <div class="menu-item" data-action="toggle-flashsight" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>⚡</span> Toggle FlashSight
            </div>
            <div class="menu-item" data-action="increase-intensity" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>➕</span> Augmenter intensité
            </div>
            <div class="menu-item" data-action="decrease-intensity" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>➖</span> Diminuer intensité
            </div>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #eee;">
            <div class="menu-item" data-action="zoom-in" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>🔍</span> Zoom +
            </div>
            <div class="menu-item" data-action="zoom-out" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>🔎</span> Zoom -
            </div>
            <div class="menu-item" data-action="immersive-mode" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span>🎯</span> Mode immersif
            </div>
        `;
        
        // Ajouter les styles hover
        const style = document.createElement('style');
        style.textContent = `
            .menu-item:hover { background: #f0f0f0 !important; }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.contextMenu);
        console.log('ContextMenu: Menu créé et ajouté au DOM');
    }

    setupEventListeners() {
        // Gestionnaire global - partout sauf dans la sidebar
        document.addEventListener('contextmenu', (e) => {
            // Ignorer si dans sidebar ou contrôles
            const isInControls = e.target.closest('.sidebar, #sidebar');
            
            if (isInControls) {
                return; // Laisser le menu natif
            }
            
            // Afficher le menu contextuel
            e.preventDefault();
            this.showMenu(e.clientX, e.clientY);
        });

        // Masquer le menu en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                this.hideMenu();
            }
        });

        // Actions du menu
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', (e) => {
                const menuItem = e.target.closest('.menu-item');
                if (menuItem) {
                    const action = menuItem.dataset.action;
                    this.executeAction(action);
                    this.hideMenu();
                }
            });
        }

        // Échap pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideMenu();
            }
        });
    }

    showMenu(x, y) {
        if (this.useNativeMenu && typeof require !== 'undefined') {
            // Utiliser le menu natif Electron
            const { ipcRenderer } = require('electron');
            ipcRenderer.invoke('show-context-menu', { x, y }).catch(err => {
                console.error('ContextMenu: Erreur menu natif:', err);
            });
        } else {
            // Fallback vers le menu HTML
            this.showHTMLMenu(x, y);
        }
    }

    showHTMLMenu(x, y) {
        if (!this.contextMenu) return;
        
        // Masquer d'abord
        this.hideMenu();
        
        // Positionner et afficher
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.style.display = 'block';
        this.isVisible = true;
        
        // Ajuster si hors écran
        setTimeout(() => {
            const rect = this.contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                this.contextMenu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                this.contextMenu.style.top = (y - rect.height) + 'px';
            }
        }, 0);
    }

    hideMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
            this.isVisible = false;
        }
    }

    executeAction(action) {
        console.log('ContextMenu: Exécution action:', action);
        
        switch (action) {
            case 'copy':
                document.execCommand('copy');
                break;
                
            case 'select-all':
                document.execCommand('selectAll');
                break;
                
            case 'toggle-flashsight':
                if (this.app.bionicToggle) {
                    this.app.bionicToggle.click();
                }
                break;
                
            case 'intensity-up':
            case 'increase-intensity':
                if (this.app.intensitySlider) {
                    const current = parseFloat(this.app.intensitySlider.value);
                    this.app.intensitySlider.value = Math.min(0.8, current + 0.1);
                    this.app.intensitySlider.dispatchEvent(new Event('input'));
                }
                break;
                
            case 'intensity-down':
            case 'decrease-intensity':
                if (this.app.intensitySlider) {
                    const current = parseFloat(this.app.intensitySlider.value);
                    this.app.intensitySlider.value = Math.max(0.1, current - 0.1);
                    this.app.intensitySlider.dispatchEvent(new Event('input'));
                }
                break;
                
            case 'zoom-in':
                if (this.app.updateZoom) {
                    this.app.updateZoom(0.2);
                }
                break;
                
            case 'zoom-out':
                if (this.app.updateZoom) {
                    this.app.updateZoom(-0.2);
                }
                break;
                
            case 'immersive-mode':
                if (this.app.immersiveMode) {
                    this.app.immersiveMode.toggle();
                }
                break;
        }
    }

    // Pour les WebViews, approche directe et simple
    attachToWebView(webview) {
        if (!webview) return;
        
        console.log('ContextMenu: Configuration WebView pour menu contextuel');
        
        // Méthode 1: Gestionnaire sur la WebView elle-même
        webview.addEventListener('contextmenu', (e) => {
            console.log('ContextMenu: Clic droit détecté sur WebView, coordonnées:', e.clientX, e.clientY);
            e.preventDefault();
            e.stopPropagation();
            this.showMenu(e.clientX, e.clientY);
        });
        
        // Méthode 2: Utiliser l'API Electron WebView pour intercepter les menus contextuels
        if (webview.addEventListener) {
            // Intercepter le menu contextuel natif de la WebView
            webview.addEventListener('context-menu', (e) => {
                console.log('ContextMenu: Context-menu natif WebView intercepté:', e.params);
                const params = e.params;
                this.showMenu(params.x, params.y);
            });
        }
        
        // Méthode 3: Injecter un script pour capturer les clics droits dans le contenu
        const injectScript = () => {
            try {
                const script = `
                    document.addEventListener('contextmenu', function(e) {
                        console.log('WebView content: Clic droit détecté');
                        e.preventDefault();
                        
                        // Utiliser l'API Electron pour communiquer avec le parent
                        if (typeof require !== 'undefined') {
                            const { ipcRenderer } = require('electron');
                            ipcRenderer.sendToHost('show-context-menu', {
                                x: e.clientX,
                                y: e.clientY
                            });
                        }
                    }, true);
                `;
                
                if (webview.executeJavaScript) {
                    webview.executeJavaScript(script);
                    console.log('ContextMenu: Script injecté dans WebView');
                }
            } catch (error) {
                console.warn('ContextMenu: Erreur injection script:', error);
            }
        };
        
        // Gestionnaire pour les messages du contenu WebView
        if (webview.addEventListener) {
            webview.addEventListener('ipc-message', (event) => {
                if (event.channel === 'show-context-menu') {
                    console.log('ContextMenu: Message IPC reçu:', event.args[0]);
                    const coords = event.args[0];
                    // Ajuster les coordonnées relatives à la position de la WebView
                    const webviewRect = webview.getBoundingClientRect();
                    this.showMenu(coords.x + webviewRect.left, coords.y + webviewRect.top);
                }
            });
        }
        
        // Injecter le script quand la WebView est prête
        webview.addEventListener('dom-ready', injectScript);
        webview.addEventListener('did-finish-load', injectScript);
        
        console.log('ContextMenu: Event listener WebView configuré');
    }

    destroy() {
        if (this.contextMenu) {
            this.contextMenu.remove();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextMenu;
} else {
    window.ContextMenu = ContextMenu;
}
