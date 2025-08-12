/**
 * Gestionnaire d'accessibilité avancé
 * Support des préférences système et navigation clavier
 */
class AccessibilityManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.mediaQueries = new Map();
        this.keyboardNavigation = null;
        this.screenReaderSupport = null;
        
        this.init();
    }

    init() {
        this.detectSystemPreferences();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupMediaQueryListeners();
    }

    /**
     * Détecte les préférences système d'accessibilité
     */
    detectSystemPreferences() {
        const preferences = {
            darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            reducedData: window.matchMedia('(prefers-reduced-data: reduce)').matches
        };

        this.applySystemPreferences(preferences);
        return preferences;
    }

    /**
     * Applique les préférences système
     */
    applySystemPreferences(preferences) {
        const body = document.body;

        // Mode sombre
        body.classList.toggle('theme-dark', preferences.darkMode);
        
        // Contraste élevé
        body.classList.toggle('theme-high-contrast', preferences.highContrast);
        
        // Mouvement réduit
        body.classList.toggle('theme-reduced-motion', preferences.reducedMotion);
        
        // Données réduites (désactiver certaines fonctionnalités)
        if (preferences.reducedData) {
            this.stateManager.setState({
                performance: {
                    ...this.stateManager.getState('performance'),
                    webWorkers: false,
                    lazyLoading: true
                }
            });
        }

        // Mettre à jour l'état
        this.stateManager.setState({
            accessibility: {
                ...this.stateManager.getState('accessibility'),
                highContrast: preferences.highContrast,
                reducedMotion: preferences.reducedMotion
            }
        });
    }

    /**
     * Configure la navigation clavier
     */
    setupKeyboardNavigation() {
        this.keyboardNavigation = {
            focusableElements: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            currentFocusIndex: -1,
            focusRing: true
        };

        // Améliorer la visibilité du focus
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible,
            *:focus-visible {
                outline: 2px solid #007acc !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 4px rgba(0, 122, 204, 0.3) !important;
            }
            
            .theme-high-contrast .focus-visible,
            .theme-high-contrast *:focus-visible {
                outline: 3px solid #ffff00 !important;
                background-color: #000000 !important;
                color: #ffffff !important;
            }
        `;
        document.head.appendChild(style);

        // Gestion des événements clavier
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    }

    /**
     * Gère la navigation clavier
     */
    handleKeyboardNavigation(event) {
        const { key, ctrlKey, altKey, shiftKey } = event;

        // Navigation par Tab améliorée
        if (key === 'Tab') {
            this.enhanceTabNavigation(event);
        }

        // Raccourcis d'accessibilité
        if (ctrlKey && altKey) {
            switch (key) {
                case 'h': // Aller au titre suivant
                    this.navigateToNextHeading();
                    event.preventDefault();
                    break;
                case 'l': // Aller au lien suivant
                    this.navigateToNextLink();
                    event.preventDefault();
                    break;
                case 'i': // Mode immersif
                    this.toggleImmersiveMode();
                    event.preventDefault();
                    break;
            }
        }

        // Échap pour sortir du mode immersif
        if (key === 'Escape') {
            const immersiveMode = this.stateManager.getState('accessibility.immersiveMode');
            if (immersiveMode) {
                this.toggleImmersiveMode();
                event.preventDefault();
            }
        }
    }

    /**
     * Améliore la navigation par Tab
     */
    enhanceTabNavigation(event) {
        const focusableElements = document.querySelectorAll(this.keyboardNavigation.focusableElements);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Cycle de focus dans les modales
        const modal = document.querySelector('.modal:not([hidden])');
        if (modal) {
            const modalFocusable = modal.querySelectorAll(this.keyboardNavigation.focusableElements);
            if (modalFocusable.length > 0) {
                const firstModal = modalFocusable[0];
                const lastModal = modalFocusable[modalFocusable.length - 1];

                if (event.shiftKey && document.activeElement === firstModal) {
                    lastModal.focus();
                    event.preventDefault();
                } else if (!event.shiftKey && document.activeElement === lastModal) {
                    firstModal.focus();
                    event.preventDefault();
                }
            }
        }
    }

    /**
     * Navigue vers le titre suivant
     */
    navigateToNextHeading() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const currentFocus = document.activeElement;
        
        let nextHeading = null;
        let found = false;
        
        for (const heading of headings) {
            if (found) {
                nextHeading = heading;
                break;
            }
            if (heading === currentFocus) {
                found = true;
            }
        }
        
        if (!nextHeading && headings.length > 0) {
            nextHeading = headings[0];
        }
        
        if (nextHeading) {
            nextHeading.focus();
            nextHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Navigue vers le lien suivant
     */
    navigateToNextLink() {
        const links = document.querySelectorAll('a[href]');
        const currentFocus = document.activeElement;
        
        let nextLink = null;
        let found = false;
        
        for (const link of links) {
            if (found) {
                nextLink = link;
                break;
            }
            if (link === currentFocus) {
                found = true;
            }
        }
        
        if (!nextLink && links.length > 0) {
            nextLink = links[0];
        }
        
        if (nextLink) {
            nextLink.focus();
            nextLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Configure le support des lecteurs d'écran
     */
    setupScreenReaderSupport() {
        // Ajouter des régions ARIA
        this.addAriaLandmarks();
        
        // Annoncer les changements dynamiques
        this.setupLiveRegions();
        
        // Améliorer les descriptions
        this.enhanceAriaDescriptions();
    }

    /**
     * Ajoute des points de repère ARIA
     */
    addAriaLandmarks() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.getAttribute('role')) {
            sidebar.setAttribute('role', 'complementary');
            sidebar.setAttribute('aria-label', 'Panneau de contrôles FlashSight');
        }

        const tabBar = document.getElementById('tab-bar');
        if (tabBar && !tabBar.getAttribute('role')) {
            tabBar.setAttribute('role', 'tablist');
            tabBar.setAttribute('aria-label', 'Onglets de navigation');
        }

        const main = document.querySelector('main') || document.querySelector('.main-content');
        if (main && !main.getAttribute('role')) {
            main.setAttribute('role', 'main');
            main.setAttribute('aria-label', 'Contenu principal');
        }
    }

    /**
     * Configure les régions live pour les annonces
     */
    setupLiveRegions() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(liveRegion);

        this.liveRegion = liveRegion;
    }

    /**
     * Annonce un message aux lecteurs d'écran
     */
    announce(message, priority = 'polite') {
        if (!this.liveRegion) return;

        this.liveRegion.setAttribute('aria-live', priority);
        this.liveRegion.textContent = message;

        // Nettoyer après 5 secondes
        setTimeout(() => {
            if (this.liveRegion.textContent === message) {
                this.liveRegion.textContent = '';
            }
        }, 5000);
    }

    /**
     * Améliore les descriptions ARIA
     */
    enhanceAriaDescriptions() {
        // Ajouter des descriptions aux contrôles
        const intensitySlider = document.getElementById('intensitySlider');
        if (intensitySlider) {
            intensitySlider.setAttribute('aria-describedby', 'intensity-description');
            
            if (!document.getElementById('intensity-description')) {
                const description = document.createElement('div');
                description.id = 'intensity-description';
                description.className = 'sr-only';
                description.textContent = 'Contrôle l\'intensité de la transformation FlashSight. Plus la valeur est élevée, plus de caractères seront mis en gras.';
                intensitySlider.parentNode.appendChild(description);
            }
        }

        // Ajouter des descriptions aux boutons
        const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-describedby])');
        buttons.forEach(button => {
            const text = button.textContent.trim();
            if (text) {
                button.setAttribute('aria-label', text);
            }
        });
    }

    /**
     * Active/désactive le mode immersif
     */
    toggleImmersiveMode() {
        const currentMode = this.stateManager.getState('accessibility.immersiveMode');
        const newMode = !currentMode;

        this.stateManager.setState({
            accessibility: {
                ...this.stateManager.getState('accessibility'),
                immersiveMode: newMode
            }
        });

        document.body.classList.toggle('immersive-mode', newMode);
        
        if (newMode) {
            this.announce('Mode immersif activé. Appuyez sur Échap pour sortir.');
        } else {
            this.announce('Mode immersif désactivé.');
        }
    }

    /**
     * Configure les listeners pour les media queries
     */
    setupMediaQueryListeners() {
        const queries = {
            darkMode: '(prefers-color-scheme: dark)',
            highContrast: '(prefers-contrast: high)',
            reducedMotion: '(prefers-reduced-motion: reduce)',
            reducedData: '(prefers-reduced-data: reduce)'
        };

        Object.entries(queries).forEach(([key, query]) => {
            const mq = window.matchMedia(query);
            this.mediaQueries.set(key, mq);
            
            mq.addEventListener('change', () => {
                this.detectSystemPreferences();
            });
        });
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        this.mediaQueries.forEach(mq => {
            mq.removeEventListener('change', this.detectSystemPreferences);
        });
        
        document.removeEventListener('keydown', this.handleKeyboardNavigation);
        
        if (this.liveRegion) {
            this.liveRegion.remove();
        }
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
} else {
    window.AccessibilityManager = AccessibilityManager;
}
