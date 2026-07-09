// JS/seminario.js — landing del seminario: contador, fases de precio,
// barra flotante y evento Contact del pixel. Solo corre en seminario.html.
(function () {
    'use strict';

    // 2026-07-20 23:59:59 CDMX (UTC-6 fija, sin horario de verano)
    var PRICE_DEADLINE_MS = Date.UTC(2026, 6, 21, 5, 59, 59);
    // 2026-08-06 20:00 CDMX
    var EVENT_START_MS = Date.UTC(2026, 7, 7, 2, 0, 0);

    function getPhase(nowMs) {
        if (nowMs < PRICE_DEADLINE_MS) return 1;
        if (nowMs < EVENT_START_MS) return 2;
        return 3;
    }

    function formatRemaining(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;
        return d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
    }

    function formatRemainingShort(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400);
        var h = Math.floor((s - d * 86400) / 3600);
        if (d > 0) return d + 'd ' + h + 'h';
        var m = Math.floor((s - d * 86400 - h * 3600) / 60);
        return h + 'h ' + m + 'm';
    }

    // Node (tests): exportar la lógica pura y no tocar el DOM.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getPhase: getPhase,
            formatRemaining: formatRemaining,
            formatRemainingShort: formatRemainingShort,
            PRICE_DEADLINE_MS: PRICE_DEADLINE_MS,
            EVENT_START_MS: EVENT_START_MS,
        };
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Override de prueba: ?fase=2 / ?fase=3 desplaza el reloj (solo visual;
        // el precio cobrado siempre lo decide el backend).
        var offset = 0;
        try {
            var forced = new URLSearchParams(window.location.search).get('fase');
            if (forced === '2') offset = PRICE_DEADLINE_MS - Date.now() + 1000;
            if (forced === '3') offset = EVENT_START_MS - Date.now() + 1000;
        } catch (e) {}
        function now() { return Date.now() + offset; }

        var body = document.body;
        var countdownEls = document.querySelectorAll('[data-countdown]');
        var countdownShortEls = document.querySelectorAll('[data-countdown-corto]');
        var currentPhase = 0;

        function applyPhase(phase) {
            body.classList.remove('fase-1', 'fase-2', 'fase-3');
            body.classList.add('fase-' + phase);
            currentPhase = phase;
        }

        function tick() {
            var n = now();
            var phase = getPhase(n);
            if (phase !== currentPhase) applyPhase(phase);
            if (phase === 3) return; // se acabó: contador y compra ocultos vía CSS
            var target = (phase === 1) ? PRICE_DEADLINE_MS : EVENT_START_MS;
            var remaining = target - n;
            countdownEls.forEach(function (el) { el.textContent = formatRemaining(remaining); });
            countdownShortEls.forEach(function (el) { el.textContent = formatRemainingShort(remaining); });
            setTimeout(tick, 1000);
        }
        tick();

        // Barra flotante: visible cuando el CTA del hero sale del viewport.
        var heroCta = document.getElementById('hero-cta');
        var bar = document.getElementById('barra-flotante');
        if (bar && heroCta && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                bar.classList.toggle('visible', !entries[0].isIntersecting);
            }, { threshold: 0 }).observe(heroCta);
        } else if (bar) {
            bar.classList.add('visible');
        }

        // Pixel: Contact en clicks de WhatsApp (guardado por si fbq no cargó).
        document.querySelectorAll('.js-whatsapp').forEach(function (el) {
            el.addEventListener('click', function () {
                if (typeof fbq === 'function') fbq('track', 'Contact');
            });
        });
    });
})();
