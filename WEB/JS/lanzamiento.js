// JS/lanzamiento.js — motor de contador + fases de precio para landings de
// lanzamiento (diplomados). Lee las fechas de data-* en <body>:
//   data-price-deadline  → fin del precio de lanzamiento
//   data-event-start     → inicio del diplomado
// Lógica pura testeable + wiring DOM. NO incluye popup de salida.
(function () {
    'use strict';

    // "1690000000000" (epoch ms) o ISO → ms. NaN si vacío/ inválido.
    function parseDate(raw) {
        if (raw == null || raw === '') return NaN;
        if (/^\d+$/.test(raw)) return parseInt(raw, 10);
        return Date.parse(raw);
    }

    function getPhase(nowMs, deadlineMs, eventMs) {
        if (nowMs < deadlineMs) return 1;
        if (nowMs < eventMs) return 2;
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

    function remainingParts(ms) {
        if (ms < 0) ms = 0;
        var s = Math.floor(ms / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600);  s -= h * 3600;
        var m = Math.floor(s / 60);    s -= m * 60;
        return { d: d, h: h, m: m, s: s };
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            parseDate: parseDate,
            getPhase: getPhase,
            formatRemaining: formatRemaining,
            formatRemainingShort: formatRemainingShort,
            remainingParts: remainingParts,
            pad2: pad2,
        };
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var body = document.body;
        var deadline = parseDate(body.getAttribute('data-price-deadline'));
        var eventStart = parseDate(body.getAttribute('data-event-start'));
        if (isNaN(deadline) || isNaN(eventStart)) return; // sin fechas → sin motor

        // Override de prueba: ?fase=2 / ?fase=3 (solo visual; el cobro lo decide el backend).
        var offset = 0;
        try {
            var forced = new URLSearchParams(window.location.search).get('fase');
            if (forced === '2') offset = deadline - Date.now() + 1000;
            if (forced === '3') offset = eventStart - Date.now() + 1000;
        } catch (e) {}
        function now() { return Date.now() + offset; }

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
            var phase = getPhase(n, deadline, eventStart);
            if (phase !== currentPhase) applyPhase(phase);
            if (phase === 3) return; // terminó: compra oculta vía CSS
            var target = (phase === 1) ? deadline : eventStart;
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

        // Pixel (no-op hasta que el dueño añada un pixel por campaña): Contact en WhatsApp.
        document.querySelectorAll('.js-whatsapp').forEach(function (el) {
            el.addEventListener('click', function () {
                if (typeof fbq === 'function') fbq('track', 'Contact');
            });
        });
    });
})();
