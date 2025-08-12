/**
 * Lazy FlashSight Transform avec Intersection Observer
 * Optimise les performances pour les gros documents
 */
class LazyFlashSightTransform {
    constructor(engine) {
        this.engine = engine;
        this.intersectionObserver = null;
        this.processedElements = new WeakSet();
        this.pendingElements = new Set();
        this.isProcessing = false;
        
        this.initIntersectionObserver();
    }

    initIntersectionObserver() {
        if (!window.IntersectionObserver) {
            console.warn('IntersectionObserver not supported, using fallback');
            return false;
        }

        const options = {
            root: null,
            rootMargin: '100px', // Précharger 100px avant l'apparition
            threshold: 0.1
        };

        this.intersectionObserver = new IntersectionObserver(
            this.handleIntersection.bind(this),
            options
        );

        return true;
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.processedElements.has(entry.target)) {
                this.pendingElements.add(entry.target);
                this.processedElements.add(entry.target);
                this.intersectionObserver.unobserve(entry.target);
            }
        });

        this.processPendingElements();
    }

    async processPendingElements() {
        if (this.isProcessing || this.pendingElements.size === 0) return;
        
        this.isProcessing = true;
        const elements = Array.from(this.pendingElements);
        this.pendingElements.clear();

        // Traitement par lots pour éviter de bloquer l'UI
        const batchSize = 5;
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    batch.forEach(element => {
                        if (this.engine && this.engine.transformElement) {
                            this.engine.transformElement(element);
                        }
                    });
                    resolve();
                });
            });
        }

        this.isProcessing = false;
    }

    observeElement(element) {
        if (this.intersectionObserver && !this.processedElements.has(element)) {
            this.intersectionObserver.observe(element);
        }
    }

    observeElements(selector = 'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote') {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => this.observeElement(el));
    }

    disconnect() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this.pendingElements.clear();
    }
}

// Export pour utilisation globale
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LazyFlashSightTransform;
} else {
    window.LazyFlashSightTransform = LazyFlashSightTransform;
}
