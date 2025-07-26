/**
 * Moteur de Flash Sight
 * Transforme le texte en appliquant la méthode de lecture Flash Sight
 */

class FlashSightEngine {
    constructor() {
        this.intensity = 0.5; // Intensité par défaut (50%)
        this.isEnabled = true;
        this.minWordLength = 2; // Longueur minimale des mots à traiter
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
        let boldLength;
        
        if (word.length === 1) {
            boldLength = 0; // Un seul caractère : pas de transformation
        } else if (word.length === 2) {
            boldLength = 1; // Deux caractères : premier en gras
        } else if (word.length === 3) {
            boldLength = Math.ceil(word.length * 0.4); // ~1-2 caractères
        } else if (word.length <= 5) {
            boldLength = Math.ceil(word.length * 0.5); // 50% pour les mots courts
        } else if (word.length <= 8) {
            boldLength = Math.ceil(word.length * 0.4); // 40% pour les mots moyens
        } else if (word.length <= 12) {
            boldLength = Math.ceil(word.length * 0.35); // 35% pour les mots longs
        } else {
            boldLength = Math.ceil(word.length * 0.3); // 30% pour les très longs mots
        }
        
        // Appliquer l'intensité utilisateur comme modificateur
        const intensityModifier = (this.intensity - 0.5) * 0.6; // Modificateur plus prononcé
        boldLength = Math.round(boldLength + (boldLength * intensityModifier));
        
        // Contraintes finales : au moins 1 caractère en gras, mais pas tout le mot
        boldLength = Math.max(1, Math.min(word.length - 1, boldLength));
        
        return boldLength;
    }

    /**
     * Transforme un mot en appliquant le Flash Sight
     * @param {string} word - Le mot à transformer
     * @returns {string} - Le mot transformé en HTML
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

        const boldLength = this.calculateBoldLength(cleanWord);
        
        if (boldLength === 0 || boldLength >= cleanWord.length) {
            return word;
        }

        const boldPart = cleanWord.substring(0, boldLength);
        const normalPart = cleanWord.substring(boldLength);

        // Retourner le mot transformé avec la ponctuation préservée
        return `${prefix}<span class="flashsight-word"><span class="flashsight-bold">${boldPart}</span><span class="flashsight-normal">${normalPart}</span></span>${suffix}`;
    }

    /**
     * Transforme un paragraphe en appliquant le Flash Sight
     * @param {string} text - Le texte à transformer
     * @returns {string} - Le texte transformé
     */
    transformParagraph(text) {
        if (!this.isEnabled) return text;

        // Utiliser une approche plus simple et fiable
        // Diviser le texte en préservant les espaces avec split et filter
        const words = text.split(/(\s+)/);
        
        return words.map(word => {
            // Si c'est un espace ou uniquement des espaces, le retourner tel quel
            if (/^\s+$/.test(word)) {
                return word;
            }
            
            // Si c'est un mot (contient des caractères non-espaces), le transformer
            if (word.trim().length > 0) {
                return this.transformWord(word);
            }
            
            return word;
        }).join('');
    }

    /**
     * Transforme un élément HTML en appliquant le Flash Sight
     * @param {HTMLElement} element - L'élément à transformer
     * @param {boolean} recursive - Si true, traite récursivement les enfants
     */
    transformElement(element, recursive = true) {
        if (!this.isEnabled) return;

        // Éléments à ignorer
        const ignoredTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'];
        if (ignoredTags.includes(element.tagName)) {
            return;
        }

        // Traiter les nœuds de texte
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Ignorer les nœuds de texte dans des éléments spéciaux
                    const parent = node.parentElement;
                    if (parent && ignoredTags.includes(parent.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Ignorer les nœuds de texte vides ou composés uniquement d'espaces
                    if (!node.textContent.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // Transformer chaque nœud de texte
        textNodes.forEach(textNode => {
            const originalText = textNode.textContent;
            const transformedText = this.transformParagraph(originalText);
            
            if (transformedText !== originalText) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = transformedText;
                
                // Remplacer le nœud de texte par les nouveaux éléments
                const parent = textNode.parentNode;
                while (tempDiv.firstChild) {
                    parent.insertBefore(tempDiv.firstChild, textNode);
                }
                parent.removeChild(textNode);
            }
        });
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
        const contentSelectors = [
            'article', 'main', '.content', '.post', '.article',
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'li', 'td', 'th', 'blockquote', 'div'
        ];

        contentSelectors.forEach(selector => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(element => {
                // Éviter de traiter les éléments qui contiennent d'autres éléments de contenu
                // et qui n'ont pas déjà été transformés
                if (!element.hasAttribute('data-flashsight-processed') && 
                    (element.children.length === 0 || 
                    (element.children.length > 0 && element.textContent.trim().length > 0))) {
                    this.transformElement(element, false);
                    element.setAttribute('data-flashsight-processed', 'true');
                }
            });
        });
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
                return `<p class="flashsight-text">${transformedParagraph}</p>`;
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
