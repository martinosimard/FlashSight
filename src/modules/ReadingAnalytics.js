/**
 * Analytics de lecture
 * Mesure et analyse les habitudes de lecture
 */
class ReadingAnalytics {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.metrics = {
            sessionStartTime: Date.now(),
            readingTime: 0,
            wordsRead: 0,
            averageSpeed: 0,
            scrollDistance: 0,
            pauseTime: 0,
            transformationsUsed: 0
        };
        
        this.isReading = false;
        this.readingTimer = null;
        this.lastScrollPosition = 0;
        this.wordsPerMinute = 0;
        
        this.init();
    }

    init() {
        this.setupVisibilityTracking();
        this.setupScrollTracking();
        this.setupReadingDetection();
        this.loadPreviousSession();
    }

    /**
     * Configure la détection de visibilité de la page
     */
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseReading();
            } else {
                this.resumeReading();
            }
        });

        // Pause/reprise sur focus/blur de la fenêtre
        window.addEventListener('blur', () => this.pauseReading());
        window.addEventListener('focus', () => this.resumeReading());
    }

    /**
     * Configure le suivi du défilement
     */
    setupScrollTracking() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            const currentPosition = window.scrollY;
            const scrollDelta = Math.abs(currentPosition - this.lastScrollPosition);
            
            // Détecter le défilement actif comme signe de lecture
            if (scrollDelta > 0) {
                this.metrics.scrollDistance += scrollDelta;
                this.lastScrollPosition = currentPosition;
                
                if (!this.isReading) {
                    this.startReading();
                }
                
                // Reset du timer d'inactivité
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.pauseReading();
                }, 3000); // Pause après 3 secondes d'inactivité
            }
        });
    }

    /**
     * Configure la détection de lecture
     */
    setupReadingDetection() {
        // Détecter les clics et interactions comme signes de lecture active
        ['click', 'keydown', 'mousemove'].forEach(event => {
            document.addEventListener(event, this.debounce(() => {
                if (!this.isReading) {
                    this.startReading();
                }
            }, 1000));
        });
    }

    /**
     * Démarre le suivi de lecture
     */
    startReading() {
        if (this.isReading) return;
        
        this.isReading = true;
        this.metrics.sessionStartTime = Date.now();
        
        this.readingTimer = setInterval(() => {
            if (this.isReading) {
                this.metrics.readingTime += 1000; // +1 seconde
                this.updateReadingSpeed();
                this.saveMetrics();
            }
        }, 1000);
    }

    /**
     * Met en pause le suivi de lecture
     */
    pauseReading() {
        if (!this.isReading) return;
        
        this.isReading = false;
        
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
            this.readingTimer = null;
        }
        
    }

    /**
     * Reprend le suivi de lecture
     */
    resumeReading() {
        if (this.isReading) return;
        
        this.startReading();
    }

    /**
     * Met à jour la vitesse de lecture
     */
    updateReadingSpeed() {
        const timeInMinutes = this.metrics.readingTime / 60000;
        if (timeInMinutes > 0) {
            this.wordsPerMinute = Math.round(this.metrics.wordsRead / timeInMinutes);
            this.metrics.averageSpeed = this.wordsPerMinute;
        }
    }

    /**
     * Compte les mots sur la page actuelle
     */
    countWordsOnPage() {
        const textContent = document.body.textContent || '';
        const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }

    /**
     * Enregistre qu'une transformation a été utilisée
     */
    recordTransformation() {
        this.metrics.transformationsUsed++;
        this.saveMetrics();
    }

    /**
     * Calcule des statistiques avancées
     */
    getDetailedStats() {
        const wordsOnPage = this.countWordsOnPage();
        const readingProgress = wordsOnPage > 0 ? (this.metrics.wordsRead / wordsOnPage) * 100 : 0;
        
        return {
            ...this.metrics,
            wordsOnCurrentPage: wordsOnPage,
            readingProgress: Math.min(100, readingProgress),
            estimatedTimeToFinish: this.wordsPerMinute > 0 ? 
                Math.round((wordsOnPage - this.metrics.wordsRead) / this.wordsPerMinute) : 0,
            efficiency: this.calculateReadingEfficiency(),
            recommendation: this.getReadingRecommendation()
        };
    }

    /**
     * Calcule l'efficacité de lecture
     */
    calculateReadingEfficiency() {
        const standardWPM = 200; // Vitesse de lecture moyenne
        const efficiency = (this.wordsPerMinute / standardWPM) * 100;
        return Math.round(Math.min(150, efficiency)); // Plafonner à 150%
    }

    /**
     * Génère des recommandations de lecture
     */
    getReadingRecommendation() {
        const efficiency = this.calculateReadingEfficiency();
        
        if (efficiency < 70) {
            return {
                type: 'improvement',
                message: 'Essayez d\'augmenter l\'intensité FlashSight pour améliorer votre vitesse de lecture.',
                suggestion: 'increase_intensity'
            };
        } else if (efficiency > 120) {
            return {
                type: 'optimization',
                message: 'Excellente vitesse ! Vous pourriez réduire l\'intensité pour plus de confort.',
                suggestion: 'decrease_intensity'
            };
        } else {
            return {
                type: 'maintain',
                message: 'Vitesse de lecture optimale. Continuez avec ces réglages.',
                suggestion: 'maintain'
            };
        }
    }

    /**
     * Sauvegarde les métriques dans l'état
     */
    saveMetrics() {
        this.stateManager.setState({
            analytics: {
                ...this.stateManager.getState('analytics'),
                readingTime: this.metrics.readingTime,
                wordsRead: this.metrics.wordsRead,
                averageSpeed: this.metrics.averageSpeed,
                sessionsCount: this.stateManager.getState('analytics.sessionsCount') + 1
            }
        });
    }

    /**
     * Charge la session précédente
     */
    loadPreviousSession() {
        const analytics = this.stateManager.getState('analytics');
        if (analytics) {
            this.metrics.readingTime = analytics.readingTime || 0;
            this.metrics.wordsRead = analytics.wordsRead || 0;
            this.metrics.averageSpeed = analytics.averageSpeed || 0;
        }
    }

    /**
     * Exporte les statistiques
     */
    exportStats() {
        const stats = this.getDetailedStats();
        const exportData = {
            timestamp: new Date().toISOString(),
            session: {
                duration: this.metrics.readingTime,
                wordsRead: this.metrics.wordsRead,
                averageSpeed: this.metrics.averageSpeed,
                scrollDistance: this.metrics.scrollDistance,
                transformationsUsed: this.metrics.transformationsUsed
            },
            analysis: {
                efficiency: stats.efficiency,
                recommendation: stats.recommendation,
                readingProgress: stats.readingProgress
            },
            device: {
                userAgent: navigator.userAgent,
                screenResolution: `${screen.width}x${screen.height}`,
                language: navigator.language
            }
        };

        return exportData;
    }

    /**
     * Réinitialise les métriques de session
     */
    resetSession() {
        this.pauseReading();
        this.metrics = {
            sessionStartTime: Date.now(),
            readingTime: 0,
            wordsRead: 0,
            averageSpeed: 0,
            scrollDistance: 0,
            pauseTime: 0,
            transformationsUsed: 0
        };
        this.wordsPerMinute = 0;
    }

    /**
     * Utilitaire de debounce
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        this.pauseReading();
        
        if (this.readingTimer) {
            clearInterval(this.readingTimer);
        }
        
        // Sauvegarder une dernière fois
        this.saveMetrics();
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingAnalytics;
} else {
    window.ReadingAnalytics = ReadingAnalytics;
}
