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

    // Componentes d/h/m/s para el contador grande de cajas (clamp a 0).
    function remainingParts(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;
        return { d: d, h: h, m: m, s: s };
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    // Node (tests): exportar la lógica pura y no tocar el DOM.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getPhase: getPhase,
            formatRemaining: formatRemaining,
            formatRemainingShort: formatRemainingShort,
            remainingParts: remainingParts,
            pad2: pad2,
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
        var cdDays = document.querySelectorAll('[data-cd="days"]');
        var cdHours = document.querySelectorAll('[data-cd="hours"]');
        var cdMins = document.querySelectorAll('[data-cd="mins"]');
        var cdSecs = document.querySelectorAll('[data-cd="secs"]');
        var currentPhase = 0;

        function setAll(list, value) {
            for (var i = 0; i < list.length; i++) list[i].textContent = value;
        }

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
            var p = remainingParts(remaining);
            setAll(cdDays, p.d);
            setAll(cdHours, pad2(p.h));
            setAll(cdMins, pad2(p.m));
            setAll(cdSecs, pad2(p.s));
            setTimeout(tick, 1000);
        }
        tick();

        // Barra flotante: visible cuando el CTA del hero sale del viewport.
        var heroCta = document.getElementById('hero-cta');
        var bar = document.getElementById('barra-flotante');
        if (bar && heroCta && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                bar.classList.toggle('visible', !entries[0].isIntersecting);
                bar.setAttribute('aria-hidden', entries[0].isIntersecting ? 'true' : 'false');
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

        // Popup de salida (exit-intent): una sola vez por navegador, solo mientras
        // la compra está abierta (no en fase 3). Presión honesta con el contador real.
        var popup = document.getElementById('exit-popup');
        if (popup) {
            var SHOWN_KEY = 'ipf_exit_shown';
            var shown = false;
            try { shown = localStorage.getItem(SHOWN_KEY) === '1'; } catch (e) {}

            function openPopup() {
                if (shown || currentPhase === 3) return;
                shown = true;
                try { localStorage.setItem(SHOWN_KEY, '1'); } catch (e) {}
                popup.classList.add('visible');
                popup.setAttribute('aria-hidden', 'false');
                if (typeof fbq === 'function') fbq('trackCustom', 'ExitIntent');
            }
            function closePopup() {
                popup.classList.remove('visible');
                popup.setAttribute('aria-hidden', 'true');
            }

            popup.querySelectorAll('[data-cerrar-popup]').forEach(function (el) {
                el.addEventListener('click', closePopup);
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && popup.classList.contains('visible')) closePopup();
            });

            // Escritorio: el cursor sale por el borde superior (hacia cerrar/URL).
            document.addEventListener('mouseout', function (e) {
                if (e.clientY <= 0 && !e.relatedTarget && !e.toElement) openPopup();
            });

            // Móvil/táctil (sin mouseout): el usuario exploró y volvió al inicio.
            var scrolledDeep = false;
            window.addEventListener('scroll', function () {
                var y = window.pageYOffset || document.documentElement.scrollTop;
                if (y > 800) scrolledDeep = true;
                else if (scrolledDeep && y < 60) openPopup();
            }, { passive: true });
        }
    });
})();
