
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
        this.minWordLength = 2; // Longueur minimale des mots à traiter
        this.wordCache = new LRUCache(5000);
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
     * Calcule le nombre de caractères à mettre en gras selon l'intensité
     * @param {string} word - Le mot à analyser
     * @returns {number} - Nombre de caractères à mettre en gras
     */
    calculateBoldLength(word) {
        if (word.length < this.minWordLength) return 0;
        // Règles Flash Sight optimisées et plus cohérentes
        if (word.length === 1) {
            return 0;
        } else if (word.length === 2) {
            return 1;
        } else if (word.length === 3) {
            return Math.ceil(word.length * 0.4);
        } else if (word.length <= 5) {
            return Math.ceil(word.length * 0.5);
        } else if (word.length <= 8) {
            return Math.ceil(word.length * 0.4);
        } else if (word.length <= 12) {
            return Math.ceil(word.length * 0.35);
        } else {
            return Math.ceil(word.length * this.intensity);
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

        // Clé de cache = mot + intensité
        const cacheKey = `${cleanWord}|${this.intensity}`;
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
            console.log('Page already transformed, skipping...');
            return;
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
     * Fonction de debug pour tester l'algorithme
     * @param {string} text - Texte à tester
     * @returns {Array} - Résultats du test
     */
    debugTransform(text) {
        const words = text.split(/\s+/);
        return words.map(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            const boldLength = this.calculateBoldLength(cleanWord);
            const boldPart = cleanWord.substring(0, boldLength);
            const normalPart = cleanWord.substring(boldLength);
            
            return {
                original: word,
                clean: cleanWord,
                length: cleanWord.length,
                boldLength: boldLength,
                bold: boldPart,
                normal: normalPart,
                ratio: (boldLength / cleanWord.length * 100).toFixed(1) + '%'
            };
        });
    }
}

// Instance globale du moteur Flash Sight
window.flashSightEngine = new FlashSightEngine();
