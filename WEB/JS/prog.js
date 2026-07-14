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

    // ===== SCROLL REVEAL (with IntersectionObserver fallback) =====
    try {
        const hasScrollReveal = (typeof ScrollReveal !== 'undefined' && typeof ScrollReveal === 'function');

        const baseConfig = {
            distance: '40px',
            duration: 1000,
            easing: 'ease-in-out',
            reset: true
        };

        if (hasScrollReveal) {
            const sr = ScrollReveal();

            // Hero and headers
            sr.reveal('.curso-hero-content, .hero-content, .foto-pareja', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px', duration: 1400 }));

            // Section titles
            sr.reveal('h2', Object.assign({}, baseConfig, { origin: 'bottom', distance: '30px', interval: 120 }));

            // Obstáculos
            sr.reveal('.obstaculo-item, .obstaculo-card', Object.assign({}, baseConfig, { origin: 'right', interval: 120 }));

            // Cards, modules, instructors, price card, etc.
            sr.reveal('.curriculum-card, .card, .mision-vision .card, .actividad, .curso-card, .modulo-card, .acordeon-item, .resultado, .instructor-card, .precio-card', Object.assign({}, baseConfig, { origin: 'bottom', interval: 120 }));

            // Contact / WhatsApp
            sr.reveal('.form-contacto, .btn-whatsapp', Object.assign({}, baseConfig, { origin: 'bottom', distance: '50px' }));

            console.log('ScrollReveal: animaciones activadas.');
        } else {
            // Fallback: reveal on intersection (no-op visually if no matching CSS)
            console.warn('ScrollReveal no está disponible — usando fallback con IntersectionObserver.');

            const VISIBLE_CLASS = 'is-visible';
            const io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    entry.target.classList.toggle(VISIBLE_CLASS, entry.isIntersecting);
                });
            }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

            const selectors = [
                '.curso-hero-content', '.hero-content',
                'h2',
                '.obstaculo-item', '.obstaculo-card',
                '.modulo-card', '.acordeon-item', '.resultado', '.instructor-card',
                '.precio-card', '.btn-whatsapp'
            ];
            selectors.forEach(function (sel) {
                document.querySelectorAll(sel).forEach(function (el) {
                    el.classList.add('will-animate');
                    io.observe(el);
                });
            });
        }
    } catch (err) {
        console.error('Error en animaciones (prog.js):', err);
    }

    // ===== MÓDULOS ACCORDION (curso-desarrollo) =====
    document.querySelectorAll('.acordeon-trigger').forEach(function (trigger) {
        trigger.addEventListener('click', function () {
            const item = trigger.closest('.acordeon-item');
            if (!item) return;
            const isOpen = item.classList.toggle('abierto');
            trigger.setAttribute('aria-expanded', isOpen);
        });
    });

    // ===== ENROLLMENT FORM (course pages only) =====
    var BACKEND_URL = '/api'; // Vercel Serverless Function proxies to Railway

    (function initInscripcionForm() {
        var form = document.getElementById('form-inscripcion');
        if (!form) return; // not on a course page

        var errorDiv  = document.getElementById('form-error');
        var btnSubmit = document.getElementById('btn-submit-inscripcion');

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
            var emailConfirmEl = document.getElementById('ins-email-confirm');
            var emailConfirm   = emailConfirmEl ? emailConfirmEl.value.trim() : email;
            var telefono = document.getElementById('ins-telefono').value.trim();
            var curso    = form.querySelector('input[name="curso"]').value;

            // Client-side validation
            if (!nombre) {
                return showError('El nombre completo es obligatorio.', 'ins-nombre');
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return showError('Ingresa un correo electrónico válido.', 'ins-email');
            }
            if (emailConfirm.toLowerCase() !== email.toLowerCase()) {
                return showError('Los correos electrónicos no coinciden.', 'ins-email-confirm');
            }
            if (!telefono || telefono.replace(/\D/g, '').length < 8) {
                return showError('Ingresa un número de teléfono válido (mínimo 8 dígitos).', 'ins-telefono');
            }

            // Disable button and show loading state
            if (!btnSubmit.dataset.originalText) {
                btnSubmit.dataset.originalText = btnSubmit.textContent.trim();
            }
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Procesando…';

            try {
                var res = await fetch(BACKEND_URL + '/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: nombre, email: email, telefono: telefono, curso: curso }),
                });
                var data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Error del servidor.');
                }

                // ── Meta Pixel ──
                // Values are display/pixel approximations of the server-side price.
                var PIXEL_INFO = {
                    pareja:     { value: 4500, name: 'Diplomado en Desarrollo de Habilidades en Pareja' },
                    desarrollo: { value: 4500, name: 'Diplomado en Desarrollo Humano' },
                };
                var pinfo = PIXEL_INFO[curso];
                if (pinfo) {
                    // Stash for the thank-you page so Purchase carries the right course + value.
                    try {
                        localStorage.setItem('ipf_checkout', JSON.stringify({ curso: curso, value: pinfo.value, name: pinfo.name }));
                    } catch (e) {}
                    // Strong purchase intent (no-op on pages without the pixel).
                    if (typeof fbq === 'function') {
                        fbq('track', 'InitiateCheckout', { value: pinfo.value, currency: 'MXN', content_name: pinfo.name });
                    }
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
                btnSubmit.textContent = btnSubmit.dataset.originalText || 'Continuar al pago';
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

    // ===== TESTIMONIOS: click-to-play YouTube (lite embed) =====
    // Each .testimonio-video has data-youtube="". Paste an unlisted video's
    // ID there (the part after v= or youtu.be/) and the card turns live:
    // real thumbnail as poster, "Próximamente" hidden, plays on click.
    // Empty data-youtube stays in the placeholder state. No JS edits needed.
    document.querySelectorAll('.testimonio-video[data-youtube]').forEach(function (el) {
        var id = (el.getAttribute('data-youtube') || '').trim();
        if (!id) return; // placeholder: leave "Próximamente" state untouched

        el.classList.add('has-video');
        el.style.backgroundImage =
            "linear-gradient(180deg, rgba(61,43,31,0.10) 0%, rgba(61,43,31,0.55) 100%)," +
            " url('https://i.ytimg.com/vi/" + id + "/hqdefault.jpg')";
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', 'Reproducir testimonio en video');

        function play() {
            var iframe = document.createElement('iframe');
            iframe.className = 'testimonio-iframe';
            iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
            iframe.title = 'Testimonio en video';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.setAttribute('allowfullscreen', '');
            el.innerHTML = '';
            el.appendChild(iframe);
        }

        el.addEventListener('click', play);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
        });
    });

});
