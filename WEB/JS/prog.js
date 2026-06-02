// js/prog.js
document.addEventListener('DOMContentLoaded', function () {

    // ===== HEADER: scroll shadow =====
    const headerEl = document.querySelector('.header');
    if (headerEl) {
        window.addEventListener('scroll', function () {
            headerEl.classList.toggle('scrolled', window.scrollY > 8);
        }, { passive: true });
    }

    // ===== MOBILE NAV TOGGLE =====
    const navToggle = document.querySelector('.nav-toggle');
    if (navToggle && headerEl) {
        navToggle.addEventListener('click', function () {
            const isOpen = headerEl.classList.toggle('nav-open');
            navToggle.setAttribute('aria-expanded', isOpen);
        });
        document.querySelectorAll('.nav a').forEach(function (link) {
            link.addEventListener('click', function () {
                headerEl.classList.remove('nav-open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }


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
        sr.reveal('.curso-hero-content, .hero-content, .foto-pareja', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px', duration: 1400 }));

        // h2
        sr.reveal('h2', Object.assign({}, baseConfig, { origin: 'bottom', distance: '30px', interval: 120 }));

        // Obstaculos grid items
        sr.reveal('.obstaculo-item, .obstaculo-card', Object.assign({}, baseConfig, { origin: 'right', interval: 120 }));

        // Modules / cards / instructors / tables etc.
        sr.reveal('.curriculum-card, .card, .mision-vision .card, .modulo-card, .resultado, .instructor-card, .tabla-inversion, .promocion', Object.assign({}, baseConfig, { origin: 'bottom', interval: 140 }));

        // Contact form
        sr.reveal('.form-contacto, .btn-whatsapp', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px' }));

        console.log('ScrollReveal: animaciones activadas.');
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

    // ===== ENROLLMENT FORM (course pages only) =====
    // Update BACKEND_URL after deploying the backend to Railway/Render
    var BACKEND_URL = ''; // Netlify proxies /api/* to Railway — no CORS needed

    (function initInscripcionForm() {
        var btnAbrir  = document.getElementById('btn-abrir-form');
        if (!btnAbrir) return; // not on a course page

        var form      = document.getElementById('form-inscripcion');
        var errorDiv  = document.getElementById('form-error');
        var btnSubmit = document.getElementById('btn-submit-inscripcion');

        // Toggle form visibility
        btnAbrir.addEventListener('click', function () {
            var isOpen = form.classList.toggle('form-abierto');
            btnAbrir.textContent = isOpen ? 'Cancelar' : 'Inscríbete ahora';
            if (isOpen) {
                form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Clear previous errors
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
            document.querySelectorAll('.form-grupo input').forEach(function (el) {
                el.classList.remove('input-error');
            });

            // Read values
            var nombre   = document.getElementById('ins-nombre').value.trim();
            var email    = document.getElementById('ins-email').value.trim();
            var telefono = document.getElementById('ins-telefono').value.trim();
            var curso    = form.querySelector('input[name="curso"]').value;

            // Client-side validation
            if (!nombre) {
                return showError('El nombre completo es obligatorio.', 'ins-nombre');
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return showError('Ingresa un correo electrónico válido.', 'ins-email');
            }
            if (!telefono || telefono.replace(/\D/g, '').length < 8) {
                return showError('Ingresa un número de teléfono válido (mínimo 8 dígitos).', 'ins-telefono');
            }

            // Disable button and show loading state
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Procesando…';

            try {
                var res = await fetch(BACKEND_URL + '/api/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: nombre, email: email, telefono: telefono, curso: curso }),
                });
                var data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Error del servidor.');
                }

                // Redirect to Mercado Pago checkout
                window.location.href = data.init_point;

            } catch (err) {
                var msg = err.message && err.message !== 'Failed to fetch'
                    ? err.message
                    : 'Ocurrió un error de conexión. Por favor intenta de nuevo o contáctanos.';
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Continuar al pago';
            }
        });

        function showError(message, fieldId) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            if (fieldId) {
                var field = document.getElementById(fieldId);
                if (field) {
                    field.classList.add('input-error');
                    field.focus();
                }
            }
        }
    })();

});
