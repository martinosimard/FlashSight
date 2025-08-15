/**
 * Menu contextuel pour FlashSight Reader
 * Fournit des actions rapides via clic droit
 */
class ContextMenu {
    constructor(flashSightApp) {
        console.log('ContextMenu: Initialisation du menu contextuel');
        this.app = flashSightApp;
        this.contextMenu = null;
        this.isVisible = false;
        this.selectedText = '';
        this.targetElement = null;
        
        this.setupStyles();
        this.createContextMenu();
        this.setupEventListeners();
        
        // Test temporaire - ajouter un bouton pour vérifier le menu
        this.addTestButton();
        
        console.log('ContextMenu: Menu contextuel initialisé avec succès');
    }

    /**
     * Ajoute un bouton de test temporaire
     */
    addTestButton() {
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Menu Contextuel';
        testBtn.style.position = 'fixed';
        testBtn.style.top = '10px';
        testBtn.style.right = '10px';
        testBtn.style.zIndex = '9999';
        testBtn.style.background = '#007acc';
        testBtn.style.color = 'white';
        testBtn.style.border = 'none';
        testBtn.style.padding = '5px 10px';
        testBtn.style.borderRadius = '3px';
        testBtn.style.cursor = 'pointer';
        
        testBtn.onclick = () => {
            console.log('Test: Affichage du menu contextuel');
            this.showMenu(200, 200);
        };
        
        document.body.appendChild(testBtn);
    }

    /**
     * Ajoute les styles CSS pour le menu contextuel
     */
    setupStyles() {
        console.log('ContextMenu: Ajout des styles CSS');
        const style = document.createElement('style');
        style.id = 'flashsight-context-menu-styles';
        style.textContent = `
            .flashsight-context-menu {
                position: fixed !important;
                background: #ffffff !important;
                border: 1px solid #e0e0e0 !important;
                border-radius: 6px !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
                padding: 4px 0 !important;
                min-width: 200px !important;
                z-index: 99999 !important;
                display: none !important;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                font-size: 13px !important;
            }
            
            .flashsight-context-menu.visible {
                display: block !important;
            }
            
            .context-menu-item {
                padding: 8px 16px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                transition: background-color 0.2s !important;
                color: #333 !important;
            }
            }
            
            .context-menu-item:hover {
                background: var(--bg-hover, #f5f5f5);
            }
            
            .context-menu-item.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .context-menu-item.disabled:hover {
                background: transparent;
            }
            
            .context-menu-separator {
                height: 1px;
                background: var(--border-light, #e8e8e8);
                margin: 4px 0;
            }
            
            .context-menu-icon {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
                opacity: 0.7;
            }
            
            .context-menu-label {
                flex: 1;
            }
            
            .context-menu-shortcut {
                font-size: 11px;
                opacity: 0.6;
                margin-left: auto;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Crée la structure du menu contextuel
     */
    createContextMenu() {
        console.log('ContextMenu: Création du menu contextuel DOM');
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'flashsight-context-menu';
        this.contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="copy">
                <span class="context-menu-icon">📋</span>
                <span class="context-menu-label">Copier</span>
                <span class="context-menu-shortcut">Ctrl+C</span>
            </div>
            <div class="context-menu-item" data-action="select-all">
                <span class="context-menu-icon">🔘</span>
                <span class="context-menu-label">Tout sélectionner</span>
                <span class="context-menu-shortcut">Ctrl+A</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="toggle-flashsight">
                <span class="context-menu-icon">⚡</span>
                <span class="context-menu-label">Activer/Désactiver FlashSight</span>
                <span class="context-menu-shortcut">Ctrl+F</span>
            </div>
            <div class="context-menu-item" data-action="increase-intensity">
                <span class="context-menu-icon">➕</span>
                <span class="context-menu-label">Augmenter l'intensité</span>
                <span class="context-menu-shortcut">Ctrl++</span>
            </div>
            <div class="context-menu-item" data-action="decrease-intensity">
                <span class="context-menu-icon">➖</span>
                <span class="context-menu-label">Diminuer l'intensité</span>
                <span class="context-menu-shortcut">Ctrl+-</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="zoom-in">
                <span class="context-menu-icon">🔍</span>
                <span class="context-menu-label">Zoom avant</span>
                <span class="context-menu-shortcut">Ctrl+Scroll</span>
            </div>
            <div class="context-menu-item" data-action="zoom-out">
                <span class="context-menu-icon">🔎</span>
                <span class="context-menu-label">Zoom arrière</span>
                <span class="context-menu-shortcut">Ctrl+Scroll</span>
            </div>
            <div class="context-menu-item" data-action="reset-zoom">
                <span class="context-menu-icon">↻</span>
                <span class="context-menu-label">Réinitialiser le zoom</span>
                <span class="context-menu-shortcut">Ctrl+0</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="immersive-mode">
                <span class="context-menu-icon">🎯</span>
                <span class="context-menu-label">Mode immersif</span>
                <span class="context-menu-shortcut">Ctrl+Alt+I</span>
            </div>
            <div class="context-menu-item" data-action="toggle-theme">
                <span class="context-menu-icon">🌓</span>
                <span class="context-menu-label">Basculer le thème</span>
                <span class="context-menu-shortcut">Ctrl+Shift+T</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="inspect-element">
                <span class="context-menu-icon">🔧</span>
                <span class="context-menu-label">Inspecter l'élément</span>
                <span class="context-menu-shortcut">F12</span>
            </div>
        `;
        
        document.body.appendChild(this.contextMenu);
        console.log('ContextMenu: Menu ajouté au DOM, élément:', this.contextMenu);
        console.log('ContextMenu: Classes CSS:', this.contextMenu.className);
    }

    /**
     * Configure les event listeners
     */
    setupEventListeners() {
        console.log('ContextMenu: Configuration des event listeners');
        
        // S'assurer que le document est prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.attachEventListeners();
            });
        } else {
            this.attachEventListeners();
        }
    }

    /**
     * Attache les event listeners
     */
    attachEventListeners() {
        console.log('ContextMenu: Attachement des event listeners au document');
        
        // Clic droit pour afficher le menu
        document.addEventListener('contextmenu', (e) => {
            console.log('ContextMenu: Event contextmenu reçu', e.target);
            // Ne pas intercepter sur les WebViews (elles ont leur propre gestion)
            if (!e.target.closest('webview')) {
                this.handleContextMenu(e);
            }
        });

        // Clic gauche pour masquer le menu
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideMenu();
            }
        });

        // Échap pour masquer le menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideMenu();
            }
        });

        // Clics sur les éléments du menu
        this.contextMenu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem && !menuItem.classList.contains('disabled')) {
                const action = menuItem.dataset.action;
                this.executeAction(action);
                this.hideMenu();
            }
        });

        // Scroll pour masquer le menu
        window.addEventListener('scroll', () => {
            this.hideMenu();
        });
    }

    /**
     * Gère l'événement de clic droit
     */
    handleContextMenu(e) {
        console.log('ContextMenu: Clic droit détecté', e);
        e.preventDefault();
        
        this.targetElement = e.target;
        this.selectedText = window.getSelection().toString();
        
        // Mettre à jour l'état des éléments du menu
        this.updateMenuState();
        
        // Positionner et afficher le menu
        this.showMenu(e.clientX, e.clientY);
    }

    /**
     * Met à jour l'état des éléments du menu selon le contexte
     */
    updateMenuState() {
        const items = this.contextMenu.querySelectorAll('.context-menu-item');
        
        items.forEach(item => {
            const action = item.dataset.action;
            
            // Désactiver "Copier" s'il n'y a pas de texte sélectionné
            if (action === 'copy') {
                item.classList.toggle('disabled', !this.selectedText);
            }
            
            // Mettre à jour le libellé de FlashSight selon l'état actuel
            if (action === 'toggle-flashsight') {
                const isEnabled = this.app.bionicToggle?.checked;
                const label = item.querySelector('.context-menu-label');
                if (label) {
                    label.textContent = isEnabled ? 'Désactiver FlashSight' : 'Activer FlashSight';
                }
            }
            
            // Mettre à jour le libellé du mode immersif
            if (action === 'immersive-mode') {
                const isImmersive = this.app.immersiveMode?.isActive;
                const label = item.querySelector('.context-menu-label');
                if (label) {
                    label.textContent = isImmersive ? 'Quitter le mode immersif' : 'Mode immersif';
                }
            }
            
            // Mettre à jour le libellé du thème
            if (action === 'toggle-theme') {
                const isDark = document.body.getAttribute('data-theme') === 'dark';
                const label = item.querySelector('.context-menu-label');
                if (label) {
                    label.textContent = isDark ? 'Thème clair' : 'Thème sombre';
                }
            }
        });
    }

    /**
     * Affiche le menu à la position spécifiée
     */
    showMenu(x, y) {
        console.log('ContextMenu: showMenu appelé avec position:', x, y);
        console.log('ContextMenu: contextMenu element:', this.contextMenu);
        
        if (!this.contextMenu) {
            console.error('ContextMenu: Élément contextMenu non trouvé!');
            return;
        }
        
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.classList.add('visible');
        this.isVisible = true;
        
        console.log('ContextMenu: Menu positionné et rendu visible');
        
        // Ajuster la position si le menu dépasse de l'écran
        const rect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (rect.right > viewportWidth) {
            this.contextMenu.style.left = (x - rect.width) + 'px';
        }
        
        if (rect.bottom > viewportHeight) {
            this.contextMenu.style.top = (y - rect.height) + 'px';
        }
        
        console.log('ContextMenu: Position finale:', this.contextMenu.style.left, this.contextMenu.style.top);
    }

    /**
     * Masque le menu
     */
    hideMenu() {
        this.contextMenu.classList.remove('visible');
        this.isVisible = false;
        this.selectedText = '';
        this.targetElement = null;
    }

    /**
     * Exécute l'action correspondant à l'élément du menu cliqué
     */
    executeAction(action) {
        switch (action) {
            case 'copy':
                if (this.selectedText) {
                    navigator.clipboard.writeText(this.selectedText).then(() => {
                        this.app.showNotification('Texte copié dans le presse-papiers', 'success');
                    }).catch(() => {
                        // Fallback pour les anciens navigateurs
                        document.execCommand('copy');
                        this.app.showNotification('Texte copié', 'success');
                    });
                }
                break;
                
            case 'select-all':
                document.execCommand('selectAll');
                break;
                
            case 'toggle-flashsight':
                if (this.app.bionicToggle) {
                    this.app.bionicToggle.click();
                }
                break;
                
            case 'increase-intensity':
                if (this.app.intensitySlider) {
                    const currentValue = parseFloat(this.app.intensitySlider.value);
                    const newValue = Math.min(0.8, currentValue + 0.1);
                    this.app.intensitySlider.value = newValue;
                    this.app.intensitySlider.dispatchEvent(new Event('input'));
                }
                break;
                
            case 'decrease-intensity':
                if (this.app.intensitySlider) {
                    const currentValue = parseFloat(this.app.intensitySlider.value);
                    const newValue = Math.max(0.1, currentValue - 0.1);
                    this.app.intensitySlider.value = newValue;
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
                
            case 'reset-zoom':
                if (this.app.updateZoom) {
                    this.app.updateZoom(0, true);
                }
                break;
                
            case 'immersive-mode':
                if (this.app.immersiveModeToggle) {
                    this.app.immersiveModeToggle.click();
                }
                break;
                
            case 'toggle-theme':
                if (this.app.themeManager) {
                    this.app.themeManager.toggleTheme();
                }
                break;
                
            case 'inspect-element':
                if (this.targetElement && window.require) {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.invoke('inspect-element', {
                        x: this.targetElement.getBoundingClientRect().left,
                        y: this.targetElement.getBoundingClientRect().top
                    });
                }
                break;
                
            default:
                console.warn('Action de menu contextuel non reconnue:', action);
        }
    }

    /**
     * Ajoute le menu contextuel aux WebViews
     */
    attachToWebView(webview) {
        if (!webview) return;
        
        // Ajouter un gestionnaire de clic droit directement sur la WebView
        webview.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Obtenir la position relative à la fenêtre
            const rect = webview.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            // Afficher le menu contextuel
            this.showMenu(x, y);
        });
        
        // Optionnel: injecter du script pour désactiver le menu par défaut dans le contenu
        const script = `
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
        `;
        
        webview.executeJavaScript(script).catch(error => {
            console.warn('Erreur lors de l\'injection du script:', error);
        });
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        if (this.contextMenu) {
            this.contextMenu.remove();
        }
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextMenu;
} else {
    window.ContextMenu = ContextMenu;
}
