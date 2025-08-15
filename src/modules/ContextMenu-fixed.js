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
        
        // Supprimer le style existant s'il existe
        const existingStyle = document.getElementById('flashsight-context-menu-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
        
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
            
            .context-menu-item:hover {
                background: #f5f5f5 !important;
            }
            
            .context-menu-item.disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
            }
            
            .context-menu-item.disabled:hover {
                background: transparent !important;
            }
            
            .context-menu-separator {
                height: 1px !important;
                background: #e8e8e8 !important;
                margin: 4px 0 !important;
            }
            
            .context-menu-icon {
                width: 16px !important;
                height: 16px !important;
                flex-shrink: 0 !important;
                opacity: 0.7 !important;
            }
            
            .context-menu-label {
                flex: 1 !important;
            }
            
            .context-menu-shortcut {
                font-size: 11px !important;
                opacity: 0.6 !important;
                margin-left: auto !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('ContextMenu: Styles CSS ajoutés au document head avec ID:', style.id);
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
        
        // S'assurer que le menu est ajouté directement dans body pour éviter overflow: hidden
        document.body.appendChild(this.contextMenu);
        console.log('ContextMenu: Menu ajouté au DOM directement dans body, élément:', this.contextMenu);
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
        
        // Empêcher l'affichage multiple du même menu
        if (this.isVisible) {
            console.log('ContextMenu: Menu déjà visible, ignorer');
            return;
        }
        
        // Masquer tout menu existant d'abord
        this.hideMenu();
        
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.classList.add('visible');
        this.isVisible = true;
        
        console.log('ContextMenu: Menu positionné et rendu visible');
        console.log('ContextMenu: Classes actuelles:', this.contextMenu.className);
        console.log('ContextMenu: Styles appliqués:', {
            display: window.getComputedStyle(this.contextMenu).display,
            position: window.getComputedStyle(this.contextMenu).position,
            left: this.contextMenu.style.left,
            top: this.contextMenu.style.top,
            zIndex: window.getComputedStyle(this.contextMenu).zIndex
        });
        
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
        
        // Vérifications supplémentaires pour le debug
        setTimeout(() => {
            const rect = this.contextMenu.getBoundingClientRect();
            const computed = window.getComputedStyle(this.contextMenu);
            console.log('ContextMenu: Dimensions et position finales:', {
                rect: rect,
                width: computed.width,
                height: computed.height,
                visibility: computed.visibility,
                opacity: computed.opacity,
                transform: computed.transform,
                overflow: computed.overflow
            });
            
            // Test : forcer la visibilité avec des styles inline
            this.contextMenu.style.backgroundColor = 'red';
            this.contextMenu.style.width = '200px';
            this.contextMenu.style.height = '300px';
            this.contextMenu.style.border = '3px solid blue';
            this.contextMenu.style.position = 'fixed';
            this.contextMenu.style.zIndex = '999999';
            this.contextMenu.style.top = '50px';
            this.contextMenu.style.left = '50px';
            this.contextMenu.style.display = 'block';
            this.contextMenu.style.visibility = 'visible';
            this.contextMenu.style.opacity = '1';
            this.contextMenu.style.pointerEvents = 'auto';
            
            // Vérifier si l'élément parent a des propriétés qui peuvent masquer le menu
            let parent = this.contextMenu.parentElement;
            console.log('ContextMenu: Élément parent:', parent);
            console.log('ContextMenu: Style du parent:', {
                overflow: window.getComputedStyle(parent).overflow,
                position: window.getComputedStyle(parent).position,
                zIndex: window.getComputedStyle(parent).zIndex,
                transform: window.getComputedStyle(parent).transform
            });
            
            // SOLUTION: Forcer le parent à ne pas cacher les éléments
            if (parent && parent !== document.body) {
                console.log('ContextMenu: Parent détecté avec overflow hidden, correction...');
                parent.style.overflow = 'visible';
                
                // Ou mieux : déplacer directement dans body
                console.log('ContextMenu: Déplacement du menu dans document.body');
                document.body.appendChild(this.contextMenu);
            }
            
            // Test : déplacer le menu directement dans body
            document.body.appendChild(this.contextMenu);
            
            console.log('ContextMenu: Menu repositionné dans body et styles forcés appliqués pour test de visibilité');
        }, 100);
    }

    /**
     * Masque le menu
     */
    hideMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.remove('visible');
            this.isVisible = false;
        }
    }

    /**
     * Empêche la duplication en vérifiant si le menu est déjà visible
     */
    isMenuVisible() {
        return this.isVisible;
    }

    /**
     * Exécute l'action sélectionnée
     */
    executeAction(action) {
        console.log('ContextMenu: Exécution de l\'action:', action);
        
        switch (action) {
            case 'copy':
                if (this.selectedText) {
                    navigator.clipboard.writeText(this.selectedText).then(() => {
                        console.log('Texte copié dans le presse-papiers');
                    }).catch(() => {
                        // Fallback pour les anciens navigateurs
                        document.execCommand('copy');
                        console.log('Texte copié (fallback)');
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
                if (this.app.resetZoom) {
                    this.app.resetZoom();
                }
                break;
                
            case 'immersive-mode':
                if (this.app.immersiveMode) {
                    this.app.immersiveMode.toggle();
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
        
        console.log('ContextMenu: Attachement du menu à la WebView:', webview);
        
        // Supprimer les listeners existants pour éviter la duplication
        webview.removeEventListener('contextmenu', webview._contextMenuHandler);
        
        // Nouveau gestionnaire de clic droit
        webview._contextMenuHandler = (e) => {
            console.log('ContextMenu: Clic droit sur WebView détecté');
            e.preventDefault();
            e.stopPropagation();
            
            // Position absolue dans la fenêtre
            const x = e.clientX;
            const y = e.clientY;
            
            console.log('ContextMenu: Position WebView:', x, y);
            this.showMenu(x, y);
        };
        
        webview.addEventListener('contextmenu', webview._contextMenuHandler);
        
        // Script simplifié pour désactiver le menu par défaut du contenu
        const script = `
            (function() {
                console.log('ContextMenu: Script simple injecté dans WebView');
                
                // Supprimer tous les event listeners existants
                document.removeEventListener('contextmenu', document._webviewContextHandler);
                
                // Nouveau gestionnaire simple
                document._webviewContextHandler = function(e) {
                    console.log('ContextMenu: Clic droit dans contenu WebView détecté');
                    e.preventDefault();
                    e.stopPropagation();
                };
                
                document.addEventListener('contextmenu', document._webviewContextHandler, true);
            })();
        `;
        
        // Injecter le script quand la WebView est prête
        const injectScript = () => {
            console.log('ContextMenu: Injection du script dans WebView');
            webview.executeJavaScript(script).catch(error => {
                console.warn('ContextMenu: Erreur lors de l\'injection:', error);
            });
        };
        
        webview.addEventListener('dom-ready', injectScript);
        
        // Si déjà chargée, injecter immédiatement
        if (webview.src && !webview.src.includes('about:blank')) {
            setTimeout(injectScript, 100);
        }
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
