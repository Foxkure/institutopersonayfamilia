// js/prog.js
document.addEventListener('DOMContentLoaded', function () {
    try {
        // Helper: safe check
        function hasScrollReveal() {
        return (typeof ScrollReveal !== 'undefined' && typeof ScrollReveal === 'function');
        }

        // Common reveal config
        const baseConfig = {
        distance: '40px',
        duration: 1000,
        easing: 'ease-in-out',
        reset: true
        };

        if (hasScrollReveal()) {
        const sr = ScrollReveal();

        // Hero and headers
        sr.reveal('.curso-hero-content, .hero-content', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px', duration: 1400 }));

        // h2
        sr.reveal('h2', Object.assign({}, baseConfig, { origin: 'bottom', distance: '30px', interval: 120 }));

        // Obstaculos grid items
        sr.reveal('.obstaculo-item, .obstaculo-card', Object.assign({}, baseConfig, { origin: 'right', interval: 120 }));

        // Modules / cards / instructors / tables etc.
        sr.reveal('.modulo-card, .resultado, .instructor-card, .tabla-inversion, .promocion', Object.assign({}, baseConfig, { origin: 'bottom', interval: 140 }));

        // Contact form
        sr.reveal('.form-contacto, .btn-whatsapp', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px' }));

        console.log('ScrollReveal: animaciones activadas.');
        return;
        }

        // ===== FALLBACK using IntersectionObserver (if ScrollReveal is missing) =====
        console.warn('ScrollReveal no está disponible — usando fallback con IntersectionObserver.');

        // CSS class added when element becomes visible
        const VISIBLE_CLASS = 'is-visible';

        const observerOptions = {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.05
        };

        const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
            entry.target.classList.add(VISIBLE_CLASS);
            } else {
            entry.target.classList.remove(VISIBLE_CLASS);
            }
        });
        }, observerOptions);

        // Selectors we want animated (match those in ScrollReveal config)
        const selectors = [
        '.curso-hero-content', '.hero-content',
        'h2',
        '.obstaculo-item', '.obstaculo-card',
        '.modulo-card', '.resultado', '.instructor-card',
        '.tabla-inversion', '.promocion',
        '.form-contacto', '.btn-whatsapp'
        ];

        selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (!el.classList.contains('will-animate')) el.classList.add('will-animate');
            io.observe(el);
        });
        });

    } catch (err) {
        console.error('Error en prog.js:', err);
    }
});
