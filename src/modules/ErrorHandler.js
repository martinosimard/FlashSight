/**
 * Gestionnaire d'erreurs robuste pour FlashSight
 * Gère les erreurs avec fallbacks et notifications utilisateur
 */
class ErrorHandler {
    constructor(stateManager, accessibilityManager) {
        this.stateManager = stateManager;
        this.accessibilityManager = accessibilityManager;
        this.errorLog = [];
        this.maxLogSize = 100;
        this.errorCounts = new Map(); // Compteur d'erreurs par type
        this.degradedModeActive = false;
        this.degradedModeTimeout = null;
        
        this.setupGlobalErrorHandling();
        this.setupFallbacks();
    }

    /**
     * Configure la gestion globale des erreurs
     */
    setupGlobalErrorHandling() {
        // Erreurs JavaScript non gérées
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: Date.now()
            });
        });

        // Promesses rejetées non gérées
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || 'Promise rejected',
                reason: event.reason,
                timestamp: Date.now()
            });
        });

        // Erreurs de ressources (images, scripts, etc.)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError({
                    type: 'resource',
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    message: 'Failed to load resource',
                    timestamp: Date.now()
                });
            }
        }, true);
    }

    /**
     * Gère une erreur générique
     */
    handleError(errorInfo) {
        // Ajouter au log
        this.addToLog(errorInfo);
        
        // Déterminer la gravité
        const severity = this.determineSeverity(errorInfo);
        
        // Actions selon la gravité
        switch (severity) {
            case 'critical':
                this.handleCriticalError(errorInfo);
                break;
            case 'warning':
                this.handleWarning(errorInfo);
                break;
            case 'info':
                this.handleInfo(errorInfo);
                break;
        }
        
        // Notifier si nécessaire
        if (severity !== 'info') {
            this.notifyUser(errorInfo, severity);
        }
        
        console.error('FlashSight Error:', errorInfo);
    }

    /**
     * Gère les erreurs de WebView
     */
    handleWebViewError(error, webview, tabId) {
        const errorInfo = {
            type: 'webview',
            message: error.message || 'WebView error',
            tabId: tabId,
            url: webview?.src || 'unknown',
            timestamp: Date.now()
        };

        this.handleError(errorInfo);
        
        // Fallback vers mode lecture simple
        this.fallbackToSimpleMode(tabId);
        
        // Suggestions alternatives
        this.suggestAlternatives(errorInfo);
    }

    /**
     * Gère les erreurs de ressources
     */
    handleResourceError(errorInfo) {
        this.addToLog(errorInfo);
        
        // Tentative de rechargement pour les ressources critiques
        if (this.isCriticalResource(errorInfo.source)) {
            this.attemptResourceReload(errorInfo);
        }
        
        console.warn('Resource error:', errorInfo);
    }

    /**
     * Détermine la gravité d'une erreur
     */
    determineSeverity(errorInfo) {
        const criticalKeywords = ['crash', 'fatal', 'memory', 'security', 'SECURITY_ERR'];
        const warningKeywords = ['network', 'timeout', 'permission'];
        
        const message = (errorInfo.message || '').toLowerCase();
        
        // Les erreurs de WebView ne sont critiques que dans certains cas
        if (errorInfo.type === 'webview') {
            // Ne considérer comme warning que les erreurs répétées ou spécifiques
            if (this.isRepeatedError(errorInfo) || 
                criticalKeywords.some(keyword => message.includes(keyword))) {
                return 'warning';
            }
            return 'info'; // La plupart des erreurs webview sont mineures
        }
        
        if (criticalKeywords.some(keyword => message.includes(keyword))) {
            return 'critical';
        }
        
        if (warningKeywords.some(keyword => message.includes(keyword))) {
            return 'warning';
        }
        
        return 'info';
    }

    /**
     * Gère les erreurs critiques
     */
    handleCriticalError(errorInfo) {
        // Sauvegarder l'état actuel
        this.stateManager.saveState();
        
        // Désactiver les fonctionnalités non essentielles
        this.disableNonEssentialFeatures();
        
        // Proposer de redémarrer l'application
        this.showRestartDialog(errorInfo);
    }

    /**
     * Gère les avertissements
     */
    handleWarning(errorInfo) {
        // Activer le mode dégradé seulement pour des erreurs spécifiques et répétées
        if (errorInfo.type === 'webview' && this.shouldActivateDegradedMode(errorInfo)) {
            this.enableDegradedMode();
        }
        
        // Log pour diagnostic
        console.warn('Warning handled:', errorInfo);
    }

    /**
     * Gère les informations
     */
    handleInfo(errorInfo) {
        // Simple logging pour les erreurs mineures
        console.info('Info logged:', errorInfo);
    }

    /**
     * Vérifie si une erreur est répétée
     */
    isRepeatedError(errorInfo) {
        const errorKey = `${errorInfo.type}-${errorInfo.message}`;
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);
        
        // Considérer comme répétée si plus de 3 occurrences
        return count >= 3;
    }

    /**
     * Détermine si le mode dégradé doit être activé
     */
    shouldActivateDegradedMode(errorInfo) {
        // Ne pas activer si déjà actif
        if (this.degradedModeActive) return false;
        
        // Critères plus stricts pour l'activation
        const criticalErrors = [
            'Script error',
            'Permission denied',
            'CORS',
            'Cross-origin',
            'Network request failed'
        ];
        
        const message = (errorInfo.message || '').toLowerCase();
        const hasCriticalKeyword = criticalErrors.some(keyword => 
            message.includes(keyword.toLowerCase())
        );
        
        // Activer seulement si erreur critique ou répétée plus de 5 fois
        const errorKey = `${errorInfo.type}-${errorInfo.message}`;
        const errorCount = this.errorCounts.get(errorKey) || 0;
        
        return hasCriticalKeyword || errorCount > 5;
    }

    /**
     * Fallback vers le mode simple
     */
    fallbackToSimpleMode(tabId) {
        const tab = window.app?.tabManager?.tabs?.get(tabId);
        if (tab && tab.webview) {
            // Injecter une version simplifiée de FlashSight
            const fallbackScript = `
                try {
                    // Version de fallback ultra-simple
                    window.flashSightFallback = {
                        transform: function() {
                            const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
                            elements.forEach(el => {
                                if (!el.dataset.transformed) {
                                    const text = el.textContent;
                                    const words = text.split(' ');
                                    const newText = words.map(word => {
                                        if (word.length > 2) {
                                            const mid = Math.ceil(word.length / 2);
                                            return '<b>' + word.slice(0, mid) + '</b>' + word.slice(mid);
                                        }
                                        return word;
                                    }).join(' ');
                                    el.innerHTML = newText;
                                    el.dataset.transformed = 'true';
                                }
                            });
                        }
                    };
                    window.flashSightFallback.transform();
                } catch (e) {
                    console.error('Fallback failed:', e);
                }
            `;
            
            tab.webview.executeJavaScript(fallbackScript).catch(console.error);
        }
    }

    /**
     * Suggère des alternatives
     */
    suggestAlternatives(errorInfo) {
        const suggestions = [];
        
        if (errorInfo.type === 'webview') {
            suggestions.push('Essayez de recharger la page');
            suggestions.push('Vérifiez votre connexion internet');
            suggestions.push('Utilisez le mode PDF si possible');
        }
        
        if (errorInfo.type === 'javascript') {
            suggestions.push('Redémarrez l\'application');
            suggestions.push('Vérifiez les mises à jour');
        }
        
        return suggestions;
    }

    /**
     * Désactive les fonctionnalités non essentielles
     */
    disableNonEssentialFeatures() {
        this.stateManager.setState({
            performance: {
                ...this.stateManager.getState('performance'),
                webWorkers: false,
                lazyLoading: false
            },
            analytics: {
                ...this.stateManager.getState('analytics'),
                enabled: false
            }
        });
        
        console.log('🛡️ Mode sécurisé activé - Fonctionnalités avancées désactivées');
    }

    /**
     * Active le mode dégradé
     */
    enableDegradedMode() {
        if (this.degradedModeActive) return;
        
        this.degradedModeActive = true;
        document.body.classList.add('degraded-mode');
        
        // Ajouter des styles pour le mode dégradé
        if (!document.getElementById('degraded-mode-styles')) {
            const style = document.createElement('style');
            style.id = 'degraded-mode-styles';
            style.textContent = `
                .degraded-mode {
                    filter: grayscale(10%);
                }
                .degraded-mode::before {
                    content: "Mode dégradé actif - Cliquez pour désactiver";
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: #ff9800;
                    color: white;
                    text-align: center;
                    padding: 6px;
                    font-size: 12px;
                    z-index: 9999;
                    cursor: pointer;
                    transition: opacity 0.3s ease;
                }
                .degraded-mode::before:hover {
                    background: #f57c00;
                }
            `;
            document.head.appendChild(style);
            
            // Permettre de désactiver en cliquant sur la barre
            document.addEventListener('click', (e) => {
                if (e.target === document.body && document.body.classList.contains('degraded-mode')) {
                    this.disableDegradedMode();
                }
            });
        }
        
        console.log('⚠️ Mode dégradé activé - Désactivation automatique dans 60 secondes');
        
        // Auto-désactivation après 60 secondes
        this.degradedModeTimeout = setTimeout(() => {
            this.disableDegradedMode();
        }, 60000);
    }

    /**
     * Désactive le mode dégradé
     */
    disableDegradedMode() {
        if (!this.degradedModeActive) return;
        
        this.degradedModeActive = false;
        document.body.classList.remove('degraded-mode');
        
        // Supprimer les styles
        const styles = document.getElementById('degraded-mode-styles');
        if (styles) {
            styles.remove();
        }
        
        // Annuler le timeout d'auto-désactivation
        if (this.degradedModeTimeout) {
            clearTimeout(this.degradedModeTimeout);
            this.degradedModeTimeout = null;
        }
        
        // Réinitialiser les compteurs d'erreurs
        this.errorCounts.clear();
        
        console.log('✅ Mode dégradé désactivé');
        
        // Notification de rétablissement
        if (this.accessibilityManager) {
            this.accessibilityManager.announce('Mode dégradé désactivé - Fonctionnalités rétablies');
        }
    }

    /**
     * Affiche un dialogue de redémarrage
     */
    showRestartDialog(errorInfo) {
        const dialog = document.createElement('div');
        dialog.className = 'error-dialog';
        dialog.innerHTML = `
            <div class="error-dialog-content">
                <h3>⚠️ Erreur Critique Détectée</h3>
                <p>Une erreur critique s'est produite. Il est recommandé de redémarrer l'application.</p>
                <p><strong>Détails:</strong> ${errorInfo.message}</p>
                <div class="error-dialog-actions">
                    <button id="restart-app">Redémarrer</button>
                    <button id="continue-anyway">Continuer</button>
                    <button id="export-logs">Exporter les logs</button>
                </div>
            </div>
        `;
        
        // Styles pour le dialogue
        const style = document.createElement('style');
        style.textContent = `
            .error-dialog {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            .error-dialog-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                margin: 20px;
            }
            .error-dialog-actions {
                margin-top: 15px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .error-dialog button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            #restart-app {
                background: #f44336;
                color: white;
            }
            #continue-anyway {
                background: #9e9e9e;
                color: white;
            }
            #export-logs {
                background: #2196f3;
                color: white;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(dialog);
        
        // Event listeners
        dialog.querySelector('#restart-app').addEventListener('click', () => {
            this.restartApplication();
        });
        
        dialog.querySelector('#continue-anyway').addEventListener('click', () => {
            dialog.remove();
            this.enableDegradedMode();
        });
        
        dialog.querySelector('#export-logs').addEventListener('click', () => {
            this.exportErrorLogs();
        });
    }

    /**
     * Notifie l'utilisateur d'une erreur
     */
    notifyUser(errorInfo, severity) {
        const messages = {
            critical: '🚨 Erreur critique - Fonctionnalités limitées',
            warning: '⚠️ Problème détecté - Fonctionnement réduit temporaire',
            info: 'ℹ️ Information - Erreur mineure corrigée'
        };
        
        // Ne notifier visuellement que les erreurs critiques et warnings importantes
        if (severity === 'critical' || (severity === 'warning' && this.degradedModeActive)) {
            if (this.accessibilityManager) {
                this.accessibilityManager.announce(messages[severity], severity === 'critical' ? 'assertive' : 'polite');
            }
            
            // Notification visuelle moins intrusive pour les warnings
            if (severity === 'warning') {
                // Log simplifié pour les warnings
                console.warn('⚠️ FlashSight:', errorInfo.message);
            } else {
                this.showToast(messages[severity], severity);
            }
        }
    }

    /**
     * Affiche une notification toast
     */
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 9999;
                animation: slideIn 0.3s ease;
            }
            .toast-critical { background: #f44336; }
            .toast-warning { background: #ff9800; }
            .toast-info { background: #2196f3; }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Vérifie si une ressource est critique
     */
    isCriticalResource(source) {
        const criticalPatterns = [
            'flash-sight-engine.js',
            'app.js',
            'styles.css'
        ];
        
        return criticalPatterns.some(pattern => source?.includes(pattern));
    }

    /**
     * Tente de recharger une ressource
     */
    attemptResourceReload(errorInfo) {
        // Implémenter la logique de rechargement si nécessaire
        console.log('Attempting to reload resource:', errorInfo.source);
    }

    /**
     * Redémarre l'application
     */
    restartApplication() {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('restart-app');
        } else {
            window.location.reload();
        }
    }

    /**
     * Exporte les logs d'erreur
     */
    exportErrorLogs() {
        const logData = {
            timestamp: new Date().toISOString(),
            errors: this.errorLog,
            state: this.stateManager.getState(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashsight-error-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Ajoute une erreur au log
     */
    addToLog(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Limiter la taille du log
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
    }

    /**
     * Configure les fallbacks
     */
    setupFallbacks() {
        // Fallback pour localStorage
        if (!window.localStorage) {
            window.localStorage = {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {}
            };
        }
        
        // Fallback pour IntersectionObserver
        if (!window.IntersectionObserver) {
            window.IntersectionObserver = class {
                constructor() {}
                observe() {}
                unobserve() {}
                disconnect() {}
            };
        }
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        // Désactiver le mode dégradé si actif
        this.disableDegradedMode();
        
        // Exporter les logs finaux
        if (this.errorLog.length > 0) {
            console.log('Final error log:', this.errorLog);
        }
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
} else {
    window.ErrorHandler = ErrorHandler;
}
