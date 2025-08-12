/**
 * Gestionnaire d'état centralisé pour FlashSight
 * Gère la persistance et la synchronisation des préférences
 */
class FlashSightStateManager {
    constructor() {
        this.state = {
            intensity: 0.5,
            enabled: true,
            theme: 'auto',
            zoom: 1.0,
            font: {
                family: 'inherit',
                size: 16,
                optimize: false
            },
            accessibility: {
                highContrast: false,
                reducedMotion: false,
                immersiveMode: false
            },
            performance: {
                lazyLoading: true,
                webWorkers: true,
                cacheSize: 1000
            },
            analytics: {
                enabled: true,
                readingTime: 0,
                wordsRead: 0,
                sessionsCount: 0
            }
        };
        
        this.subscribers = new Set();
        this.storageKey = 'flashsight-state';
        
        this.loadState();
        this.setupAutoSave();
    }

    /**
     * Met à jour l'état et notifie les abonnés
     */
    setState(newState, merge = true) {
        const oldState = { ...this.state };
        
        if (merge) {
            this.state = this.deepMerge(this.state, newState);
        } else {
            this.state = { ...newState };
        }
        
        this.saveState();
        this.notifySubscribers(this.state, oldState);
    }

    /**
     * Récupère une valeur de l'état
     */
    getState(path = null) {
        if (!path) return { ...this.state };
        
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * S'abonne aux changements d'état
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notifie tous les abonnés
     */
    notifySubscribers(newState, oldState) {
        this.subscribers.forEach(callback => {
            try {
                callback(newState, oldState);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }

    /**
     * Sauvegarde l'état dans localStorage
     */
    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.error('Error saving state:', error);
        }
    }

    /**
     * Charge l'état depuis localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsedState = JSON.parse(saved);
                this.state = this.deepMerge(this.state, parsedState);
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }

    /**
     * Configuration de la sauvegarde automatique
     */
    setupAutoSave() {
        // Sauvegarder automatiquement toutes les 5 secondes
        setInterval(() => {
            this.saveState();
        }, 5000);

        // Sauvegarder avant fermeture
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
    }

    /**
     * Fusion profonde d'objets
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Réinitialise l'état aux valeurs par défaut
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        this.state = this.getDefaultState();
        this.notifySubscribers(this.state, {});
    }

    getDefaultState() {
        return {
            intensity: 0.5,
            enabled: true,
            theme: 'auto',
            zoom: 1.0,
            font: {
                family: 'inherit',
                size: 16,
                optimize: false
            },
            accessibility: {
                highContrast: false,
                reducedMotion: false,
                immersiveMode: false
            },
            performance: {
                lazyLoading: true,
                webWorkers: true,
                cacheSize: 1000
            },
            analytics: {
                enabled: true,
                readingTime: 0,
                wordsRead: 0,
                sessionsCount: 0
            }
        };
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlashSightStateManager;
} else {
    window.FlashSightStateManager = FlashSightStateManager;
}
