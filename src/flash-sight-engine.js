
/**
 * LRU Cache simple pour les transformations de mots
 */
class LRUCache {
    /**
     * @param {number} maxSize - Nombre maximum d'entrées dans le cache
     */
    constructor(maxSize = 5000) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    clear() {
        this.cache.clear();
    }

    stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
}

class FlashSightEngine {
    constructor() {
        this.intensity = 0.5; // Intensité par défaut (50%)
        this.isEnabled = true;
        this.minWordLength = 1; // Longueur minimale des mots à traiter
        this.wordCache = new LRUCache(5000);
        
        // Configuration par défaut selon les spécifications
        this.algorithmConfig = "- 0 1 1 2 0.4";
        this.parsedConfig = this.parseAlgorithmConfig(this.algorithmConfig);
        
        // Mots communs anglais à ignorer quand le mode est '-'
        this.commonWords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'or', 'but', 'if', 'you', 'we', 'i'
        ]);
    }

    /**
     * Parse la configuration de l'algorithme selon les spécifications
     * Format: "- 0 1 1 2 0.4" ou "+ 0 1 1 2 0.4"
     * @param {string} config - La chaîne de configuration
     * @returns {Object} - Configuration parsée
     */
    parseAlgorithmConfig(config) {
        const parts = config.trim().split(/\s+/);
        if (parts.length < 6) {
            throw new Error('Configuration invalide. Format attendu: "- 0 1 1 2 0.4"');
        }
        
        return {
            highlightCommonWords: parts[0] === '+', // '+' = highlight common words, '-' = skip them
            length1: parseInt(parts[1]), // Nombre de caractères à surligner pour les mots de 1 caractère
            length2: parseInt(parts[2]), // Nombre de caractères à surligner pour les mots de 2 caractères
            length3: parseInt(parts[3]), // Nombre de caractères à surligner pour les mots de 3 caractères
            length4: parseInt(parts[4]), // Nombre de caractères à surligner pour les mots de 4 caractères
            fractionLonger: parseFloat(parts[5]) // Fraction pour les mots de 5+ caractères
        };
    }

    /**
     * Met à jour la configuration de l'algorithme
     * @param {string} config - Nouvelle configuration
     */
    setAlgorithmConfig(config) {
        this.algorithmConfig = config;
        this.parsedConfig = this.parseAlgorithmConfig(config);
        this.resetCache(); // Vider le cache car l'algorithme a changé
    }

    /**
     * Définit l'intensité du Flash Sight
     * @param {number} intensity - Valeur entre 0.1 et 0.8
     */
    setIntensity(intensity) {
        this.intensity = Math.max(0.1, Math.min(0.8, intensity));
    }

    /**
     * Active ou désactive le Flash Sight
     * @param {boolean} enabled 
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Calcule le nombre de caractères à mettre en gras selon les spécifications
     * @param {string} word - Le mot à analyser
     * @returns {number} - Nombre de caractères à mettre en gras
     */
    calculateBoldLength(word) {
        const config = this.parsedConfig;
        const cleanWord = word.toLowerCase();
        
        // Vérifier si c'est un mot commun et si on doit l'ignorer
        if (!config.highlightCommonWords && this.commonWords.has(cleanWord)) {
            return 0;
        }
        
        const length = word.length;
        
        // Appliquer les règles selon la longueur du mot
        switch (length) {
            case 1:
                return config.length1;
            case 2:
                return config.length2;
            case 3:
                return config.length3;
            case 4:
                return config.length4;
            default:
                // Pour les mots de 5+ caractères, utiliser la fraction
                if (length >= 5) {
                    return Math.ceil(length * config.fractionLonger);
                }
                return 0;
        }
    }

    /**
     * Transforme un mot en appliquant le Flash Sight
     * @param {string} word - Le mot à transformer
     * @returns {string} - Le mot transformé
     */
    transformWord(word) {
        if (!this.isEnabled) {
            return word;
        }

        // Regex améliorée pour extraire le mot principal en gérant mieux la ponctuation
        const wordMatch = word.match(/^(\W*)([\w']+)(\W*)$/);
        if (!wordMatch) {
            return word; // Pas un mot valide, retourner tel quel
        }

        const [, prefix, cleanWord, suffix] = wordMatch;
        // Vérifier la longueur minimale
        if (cleanWord.length < this.minWordLength) {
            return word;
        }

        // Clé de cache = mot + configuration
        const cacheKey = `${cleanWord}|${this.algorithmConfig}`;
        const cached = this.wordCache.get(cacheKey);
        if (cached !== undefined) {
            // On recompose avec la ponctuation d'origine
            return `${prefix}${cached}${suffix}`;
        }

        const boldLength = this.calculateBoldLength(cleanWord);
        if (boldLength === 0 || boldLength >= cleanWord.length) {
            return word;
        }

        const boldPart = cleanWord.substring(0, boldLength);
        const normalPart = cleanWord.substring(boldLength);
        const result = `<span class=\"flashsight-word\"><span class=\"flashsight-bold\">${boldPart}</span><span class=\"flashsight-normal\">${normalPart}</span></span>`;
        this.wordCache.set(cacheKey, result);
        // On recompose avec la ponctuation d'origine
        return `${prefix}${result}${suffix}`;
    }

    /**
     * Nettoie les transformations Flash Sight d'un élément
     * @param {HTMLElement} element - L'élément à nettoyer
     */
    cleanElement(element) {
        // Supprimer les spans Flash Sight
        const flashsightWords = element.querySelectorAll('.flashsight-word');
        flashsightWords.forEach(word => {
            const textContent = word.textContent;
            word.parentNode.replaceChild(document.createTextNode(textContent), word);
        });
        
        // Supprimer les marqueurs de transformation
        element.removeAttribute('data-flashsight-transformed');
        const processedElements = element.querySelectorAll('[data-flashsight-processed]');
        processedElements.forEach(el => {
            el.removeAttribute('data-flashsight-processed');
        });
    }

    /**
     * Obtient la configuration actuelle de l'algorithme
     * @returns {string} - Configuration actuelle
     */
    getAlgorithmConfig() {
        return this.algorithmConfig;
    }

    /**
     * Réinitialise le cache des transformations de mots
     */
    resetCache() {
        this.wordCache.clear();
    }

    /**
     * Statistiques du cache
     * @returns {Object}
     */
    getCacheStats() {
        return this.wordCache.stats();
    }

    /**
     * Transforme le contenu d'une page web
     * @param {Document} doc - Le document à transformer
     */
    transformWebpage(doc) {
        if (!this.isEnabled) return;

        // Vérifier si la page a déjà été transformée
        if (doc.body.hasAttribute('data-flashsight-transformed')) {
            return; // Page already transformed, skipping
        }

        // Nettoyer les transformations précédentes
        this.cleanElement(doc.body);

        // Marquer la page comme transformée
        doc.body.setAttribute('data-flashsight-transformed', 'true');

        // Sélecteurs des éléments de contenu principal
        var contentSelectors = [
            'article', 'main', '.content', '.post', '.article',
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'li', 'td', 'th', 'blockquote', 'div'
        ];

        contentSelectors.forEach(function(selector) {
            var elements = doc.querySelectorAll(selector);
            elements.forEach(function(element) {
                if (!element.hasAttribute('data-flashsight-processed') &&
                    ((element.children.length === 0) ||
                    (element.children.length > 0 && element.textContent.trim().length > 0))) {
                    this.transformElement(element, false);
                    element.setAttribute('data-flashsight-processed', 'true');
                }
            }.bind(this));
        }.bind(this));
    }

    /**
     * Transforme le contenu d'un PDF (texte extrait)
     * @param {string} text - Le texte du PDF
     * @returns {string} - Le texte transformé en HTML
     */
    transformPdfText(text) {
        if (!this.isEnabled) return text;

        // Diviser le texte en paragraphes
        const paragraphs = text.split(/\n\s*\n/);
        
        return paragraphs.map(paragraph => {
            if (paragraph.trim()) {
                const transformedParagraph = this.transformParagraph(paragraph.trim());
                return `<p class=\"flashsight-text\">${transformedParagraph}</p>`;
            }
            return '';
        }).join('\n');
    }

    /**
     * Applique ou retire la transformation Flash Sight sur un élément
     * @param {HTMLElement} element - L'élément cible
     */
    toggle(element) {
        if (this.isEnabled) {
            this.cleanElement(element);
            this.transformElement(element);
        } else {
            this.cleanElement(element);
        }
    }

    /**
     * Obtient les statistiques de transformation
     * @param {HTMLElement} element - L'élément à analyser
     * @returns {Object} - Statistiques
     */
    getStats(element) {
        const flashsightWords = element.querySelectorAll('.flashsight-word');
        const totalWords = element.textContent.split(/\s+/).filter(word => word.length > 0).length;
        
        return {
            totalWords,
            transformedWords: flashsightWords.length,
            transformationRate: totalWords > 0 ? (flashsightWords.length / totalWords * 100).toFixed(1) : 0,
            intensity: (this.intensity * 100).toFixed(0)
        };
    }

    /**
     * Fonction de debug pour tester l'algorithme selon les spécifications
     * @param {string} text - Texte à tester
     * @returns {Array} - Résultats du test
     */
    debugTransform(text) {
        const words = text.split(/\s+/);
        return words.map(word => {
            const wordMatch = word.match(/^(\W*)([\w']+)(\W*)$/);
            if (!wordMatch) {
                return {
                    original: word,
                    clean: word,
                    length: 0,
                    boldLength: 0,
                    bold: '',
                    normal: word,
                    ratio: '0%',
                    isCommonWord: false,
                    skipped: true
                };
            }

            const [, prefix, cleanWord, suffix] = wordMatch;
            const boldLength = this.calculateBoldLength(cleanWord);
            const boldPart = cleanWord.substring(0, boldLength);
            const normalPart = cleanWord.substring(boldLength);
            const isCommonWord = this.commonWords.has(cleanWord.toLowerCase());
            
            return {
                original: word,
                clean: cleanWord,
                length: cleanWord.length,
                boldLength: boldLength,
                bold: boldPart,
                normal: normalPart,
                ratio: cleanWord.length > 0 ? (boldLength / cleanWord.length * 100).toFixed(1) + '%' : '0%',
                isCommonWord: isCommonWord,
                skipped: isCommonWord && !this.parsedConfig.highlightCommonWords
            };
        });
    }

    /**
     * Teste l'algorithme avec différentes configurations
     * @param {string} text - Texte à tester
     * @param {string} config - Configuration à utiliser (optionnel)
     * @returns {Object} - Résultats du test avec la configuration
     */
    testAlgorithm(text, config = null) {
        if (config) {
            const originalConfig = this.algorithmConfig;
            this.setAlgorithmConfig(config);
            const results = this.debugTransform(text);
            this.setAlgorithmConfig(originalConfig);
            return {
                config: config,
                results: results
            };
        }
        return {
            config: this.algorithmConfig,
            results: this.debugTransform(text)
        };
    }
}

// Instance globale du moteur Flash Sight
window.flashSightEngine = new FlashSightEngine();
