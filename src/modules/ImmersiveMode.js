/**
 * Mode lecture immersive
 * Masque les éléments de l'interface pour se concentrer sur le contenu
 */
class ImmersiveMode {
    constructor(stateManager, accessibilityManager) {
        this.stateManager = stateManager;
        this.accessibilityManager = accessibilityManager;
        this.isActive = false;
        this.originalStyles = new Map();
        
        this.setupEventListeners();
        
        // Note: L'initialisation depuis l'état se fait maintenant dans app.js
        // après que tous les éléments DOM soient prêts
    }

    /**
     * Synchronise l'état interne avec le StateManager (peut être appelé manuellement)
     */
    syncWithStateManager() {
        const savedState = this.stateManager.getState('accessibility.immersiveMode');
        
        if (savedState === true && !this.isActive) {
            // Activer le mode immersif sans déclencher la mise à jour d'état
            this.isActive = true;
            this.hideUIElements();
            this.showImmersiveControls();
            this.optimizeForReading();
        } else if (savedState === false && this.isActive) {
            // S'assurer que le mode est désactivé
            this.isActive = false;
            this.showUIElements();
            this.hideImmersiveControls();
            this.restoreNormalStyles();
        }
    }

    /**
     * Active le mode immersif
     */
    enable(updateState = true) {
        if (this.isActive) return;

        this.isActive = true;
        
        // Masquer les éléments de l'UI (utilise CSS)
        this.hideUIElements();
        
        // Configurer les contrôles immersifs
        this.showImmersiveControls();
        
        // Optimiser pour la lecture
        this.optimizeForReading();
        
        // Notifier l'état seulement si demandé (éviter les boucles)
        if (updateState) {
            this.stateManager.setState({
                accessibility: {
                    ...this.stateManager.getState('accessibility'),
                    immersiveMode: true
                }
            });
        }

        // Annoncer aux lecteurs d'écran
        if (this.accessibilityManager) {
            this.accessibilityManager.announce('Mode immersif activé. Appuyez sur Échap pour sortir.');
        }
    }

    /**
     * Désactive le mode immersif
     */
    disable(updateState = true) {
        if (!this.isActive) return;

        this.isActive = false;
        
        // Restaurer les éléments de l'UI (supprime la classe CSS)
        this.showUIElements();
        
        // Masquer les contrôles immersifs
        this.hideImmersiveControls();
        
        // Restaurer les styles normaux
        this.restoreNormalStyles();
        
        // Notifier l'état seulement si demandé (éviter les boucles)
        if (updateState) {
            this.stateManager.setState({
                accessibility: {
                    ...this.stateManager.getState('accessibility'),
                    immersiveMode: false
                }
            });
        }

        // Annoncer aux lecteurs d'écran
        if (this.accessibilityManager) {
            this.accessibilityManager.announce('Mode immersif désactivé.');
        }
    }

    /**
     * Bascule le mode immersif
     */
    toggle() {
        if (this.isActive) {
            this.disable();
        } else {
            this.enable();
        }
    }

    /**
     * Masque les éléments de l'interface
     */
    hideUIElements() {
        // Simple ajout de la classe CSS - les styles CSS s'occupent du reste
        document.body.classList.add('immersive-mode');
    }

    /**
     * Affiche les éléments de l'interface
     */
    showUIElements() {
        // Simple suppression de la classe CSS
        document.body.classList.remove('immersive-mode');
    }

    /**
     * Affiche les contrôles immersifs
     */
    showImmersiveControls() {
        if (document.getElementById('immersive-controls')) return;

        const controls = document.createElement('div');
        controls.id = 'immersive-controls';
        controls.className = 'immersive-controls';
        controls.innerHTML = `
            <div class="immersive-toolbar">
                <button id="immersive-exit" class="immersive-btn" aria-label="Sortir du mode immersif (Échap)" title="Sortir du mode immersif">
                    ✕
                </button>
                <button id="immersive-toggle-flashsight" class="immersive-btn" aria-label="Activer/Désactiver FlashSight" title="Toggle FlashSight">
                    🧠
                </button>
                <div class="immersive-intensity">
                    <label for="immersive-intensity-slider" class="sr-only">Intensité FlashSight</label>
                    <input 
                        type="range" 
                        id="immersive-intensity-slider" 
                        min="0.1" 
                        max="0.8" 
                        step="0.1" 
                        value="${this.stateManager.getState('intensity')}"
                        aria-label="Intensité FlashSight"
                        title="Intensité FlashSight"
                    >
                    <span id="immersive-intensity-value">${Math.round(this.stateManager.getState('intensity') * 100)}%</span>
                </div>
                <button id="immersive-font-size-up" class="immersive-btn" aria-label="Augmenter la taille de police" title="Taille +">
                    A+
                </button>
                <button id="immersive-font-size-down" class="immersive-btn" aria-label="Diminuer la taille de police" title="Taille -">
                    A-
                </button>
            </div>
        `;

        document.body.appendChild(controls);
        this.setupImmersiveControlsListeners();
    }

    /**
     * Masque les contrôles immersifs
     */
    hideImmersiveControls() {
        const controls = document.getElementById('immersive-controls');
        if (controls) {
            controls.remove();
        }
    }

    /**
     * Configure les listeners pour les contrôles immersifs
     */
    setupImmersiveControlsListeners() {
        const exitBtn = document.getElementById('immersive-exit');
        const toggleBtn = document.getElementById('immersive-toggle-flashsight');
        const intensitySlider = document.getElementById('immersive-intensity-slider');
        const intensityValue = document.getElementById('immersive-intensity-value');
        const fontSizeUpBtn = document.getElementById('immersive-font-size-up');
        const fontSizeDownBtn = document.getElementById('immersive-font-size-down');

        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.disable());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const enabled = this.stateManager.getState('enabled');
                this.stateManager.setState({ enabled: !enabled });
                
                // Mettre à jour visuellement le bouton
                toggleBtn.style.opacity = enabled ? '0.5' : '1';
            });
        }

        if (intensitySlider && intensityValue) {
            intensitySlider.addEventListener('input', () => {
                const intensity = parseFloat(intensitySlider.value);
                intensityValue.textContent = Math.round(intensity * 100) + '%';
                this.stateManager.setState({ intensity });
            });
        }

        if (fontSizeUpBtn) {
            fontSizeUpBtn.addEventListener('click', () => {
                const currentSize = this.stateManager.getState('font.size');
                const newSize = Math.min(24, currentSize + 2);
                this.stateManager.setState({
                    font: { ...this.stateManager.getState('font'), size: newSize }
                });
                this.applyFontSize(newSize);
            });
        }

        if (fontSizeDownBtn) {
            fontSizeDownBtn.addEventListener('click', () => {
                const currentSize = this.stateManager.getState('font.size');
                const newSize = Math.max(12, currentSize - 2);
                this.stateManager.setState({
                    font: { ...this.stateManager.getState('font'), size: newSize }
                });
                this.applyFontSize(newSize);
            });
        }
    }

    /**
     * Optimise l'affichage pour la lecture
     */
    optimizeForReading() {
        // Augmenter l'espacement des lignes
        const style = document.createElement('style');
        style.id = 'immersive-reading-styles';
        style.textContent = `
            .immersive-mode p,
            .immersive-mode li,
            .immersive-mode blockquote {
                line-height: 1.8 !important;
                margin-bottom: 1.2em !important;
            }
            
            .immersive-mode h1,
            .immersive-mode h2,
            .immersive-mode h3,
            .immersive-mode h4,
            .immersive-mode h5,
            .immersive-mode h6 {
                margin-top: 2em !important;
                margin-bottom: 1em !important;
            }
        `;
        document.head.appendChild(style);

        // Centrer le contenu
        this.centerContent();
    }

    /**
     * Centre le contenu pour une meilleure lecture
     */
    centerContent() {
        const mainContent = document.querySelector('main, .main-content, webview');
        if (mainContent) {
            mainContent.style.maxWidth = '800px';
            mainContent.style.margin = '0 auto';
            mainContent.style.padding = '2rem';
        }
    }

    /**
     * Restaure les styles normaux
     */
    restoreNormalStyles() {
        // Restaurer les styles du body
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.willChange = '';
        
        // Supprimer les styles immersifs
        const immersiveStyles = document.getElementById('immersive-reading-styles');
        if (immersiveStyles) {
            immersiveStyles.remove();
        }

        const fontSizeStyles = document.getElementById('immersive-font-size');
        if (fontSizeStyles) {
            fontSizeStyles.remove();
        }

        // Restaurer le contenu principal
        const mainContent = document.querySelector('main, .main-content, webview');
        if (mainContent) {
            mainContent.style.maxWidth = '';
            mainContent.style.margin = '';
            mainContent.style.padding = '';
        }
    }

    /**
     * Applique une taille de police
     */
    applyFontSize(size) {
        const style = document.getElementById('immersive-font-size') || document.createElement('style');
        style.id = 'immersive-font-size';
        style.textContent = `
            .immersive-mode body,
            .immersive-mode p,
            .immersive-mode li,
            .immersive-mode td,
            .immersive-mode th {
                font-size: ${size}px !important;
            }
        `;
        
        if (!style.parentNode) {
            document.head.appendChild(style);
        }
    }

    /**
     * Configure les listeners d'événements
     */
    setupEventListeners() {
        // Sortir du mode immersif avec Échap
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isActive) {
                this.disable();
                event.preventDefault();
            }
        });

        // Auto-masquer les contrôles après inactivité
        let hideControlsTimeout;
        document.addEventListener('mousemove', () => {
            const controls = document.getElementById('immersive-controls');
            if (controls && this.isActive) {
                controls.style.opacity = '1';
                clearTimeout(hideControlsTimeout);
                hideControlsTimeout = setTimeout(() => {
                    if (this.isActive) {
                        controls.style.opacity = '0.7';
                    }
                }, 3000);
            }
        });
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImmersiveMode;
} else {
    window.ImmersiveMode = ImmersiveMode;
}
