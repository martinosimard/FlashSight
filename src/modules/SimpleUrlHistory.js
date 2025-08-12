/**
 * Gestionnaire d'historique simple pour FlashSight Reader
 * Intégration directe dans les barres d'URL des onglets (style Chrome)
 */
class SimpleUrlHistory {
    constructor(maxHistory = 10) {
        this.maxHistory = maxHistory;
        this.historyKey = 'simpleUrlHistory';
        
        this.initializeHistory();
    }

    /**
     * Initialise l'historique vide si inexistant
     */
    initializeHistory() {
        const currentHistory = this.getStoredHistory();
        if (!currentHistory) {
            localStorage.setItem(this.historyKey, JSON.stringify([]));
        }
    }

    /**
     * Récupère l'historique stocké
     */
    getStoredHistory() {
        try {
            const stored = localStorage.getItem(this.historyKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Erreur lecture historique:', error);
            return [];
        }
    }

    /**
     * Sauvegarde l'historique
     */
    saveHistory(history) {
        try {
            localStorage.setItem(this.historyKey, JSON.stringify(history));
        } catch (error) {
            console.warn('Erreur sauvegarde historique:', error);
        }
    }

    /**
     * Valide une URL
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            return false;
        }

        const cleanUrl = url.trim();
        
        // URLs spéciales à ignorer
        if (cleanUrl === 'about:blank' || cleanUrl.startsWith('welcome.html')) {
            return false;
        }

        try {
            // Essayer de créer un objet URL
            let testUrl = cleanUrl;
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('file://')) {
                testUrl = 'https://' + cleanUrl;
            }
            
            const urlObj = new URL(testUrl);
            return urlObj.hostname.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Normalise une URL pour éviter les doublons
     */
    normalizeUrl(url) {
        try {
            let normalizedUrl = url.trim();
            
            // Ajouter https:// si nécessaire
            if (!normalizedUrl.startsWith('http://') && 
                !normalizedUrl.startsWith('https://') && 
                !normalizedUrl.startsWith('file://')) {
                normalizedUrl = 'https://' + normalizedUrl;
            }
            
            const urlObj = new URL(normalizedUrl);
            
            // Supprimer www. pour éviter les doublons
            if (urlObj.hostname.startsWith('www.')) {
                urlObj.hostname = urlObj.hostname.substring(4);
            }
            
            return urlObj.toString();
        } catch (error) {
            return url;
        }
    }

    /**
     * Extrait un titre simple à partir de l'URL
     */
    extractTitle(url) {
        try {
            const urlObj = new URL(url);
            let domain = urlObj.hostname.replace('www.', '');
            
            // Première lettre en majuscule
            if (domain.length > 0) {
                domain = domain.charAt(0).toUpperCase() + domain.slice(1);
            }
            
            return domain || 'Page Web';
        } catch (error) {
            // Extraction manuelle si URL malformée
            let clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
            const firstSlash = clean.indexOf('/');
            if (firstSlash !== -1) {
                clean = clean.substring(0, firstSlash);
            }
            
            return clean.charAt(0).toUpperCase() + clean.slice(1) || 'Page Web';
        }
    }

    /**
     * Ajoute une URL à l'historique
     */
    addUrl(url, title = null) {
        if (!this.isValidUrl(url)) {
            return false;
        }

        const normalizedUrl = this.normalizeUrl(url);
        const displayTitle = title || this.extractTitle(normalizedUrl);
        
        const history = this.getStoredHistory();
        
        // Supprimer l'URL existante pour éviter les doublons
        const filteredHistory = history.filter(item => item.url !== normalizedUrl);
        
        // Ajouter en première position
        const newEntry = {
            url: normalizedUrl,
            title: displayTitle,
            timestamp: Date.now()
        };
        
        filteredHistory.unshift(newEntry);
        
        // Limiter la taille
        if (filteredHistory.length > this.maxHistory) {
            filteredHistory.splice(this.maxHistory);
        }
        
        this.saveHistory(filteredHistory);
        return true;
    }

    /**
     * Récupère l'historique pour affichage
     */
    getHistory() {
        return this.getStoredHistory();
    }

    /**
     * Recherche dans l'historique
     */
    searchHistory(query) {
        if (!query || query.trim().length === 0) {
            return this.getHistory();
        }

        const searchTerm = query.toLowerCase().trim();
        const history = this.getStoredHistory();
        
        return history.filter(item => {
            return item.url.toLowerCase().includes(searchTerm) ||
                   item.title.toLowerCase().includes(searchTerm);
        });
    }

    /**
     * Supprime une URL de l'historique
     */
    removeUrl(url) {
        const history = this.getStoredHistory();
        const filteredHistory = history.filter(item => item.url !== url);
        this.saveHistory(filteredHistory);
    }

    /**
     * Vide complètement l'historique
     */
    clearHistory() {
        this.saveHistory([]);
    }

    /**
     * Met à jour la taille maximale de l'historique
     */
    setMaxHistory(max) {
        this.maxHistory = Math.max(5, Math.min(100, max));
        
        // Ajuster l'historique existant si nécessaire
        const history = this.getStoredHistory();
        if (history.length > this.maxHistory) {
            history.splice(this.maxHistory);
            this.saveHistory(history);
        }
    }

    /**
     * Obtient des statistiques simples
     */
    getStats() {
        const history = this.getStoredHistory();
        return {
            totalEntries: history.length,
            maxEntries: this.maxHistory
        };
    }
}

// Export pour utilisation dans Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleUrlHistory;
} else {
    window.SimpleUrlHistory = SimpleUrlHistory;
}
