/* ========================================
   Aura Score - Aura Field Scanner
   7 chakra zones, 2 binary questions each
   Tap zones on body silhouette
   ======================================== */

(function() {
    'use strict';

    // --- i18n helpers (try-catch) ---
    function getI18n() {
        try {
            if (typeof i18n !== 'undefined' && i18n) return i18n;
        } catch (e) { /* ignore */ }
        return null;
    }

    function t(key, fallback) {
        try {
            var inst = getI18n();
            if (inst && typeof inst.t === 'function') {
                var val = inst.t(key);
                if (val && val !== key) return val;
            }
        } catch (e) { /* ignore */ }
        return fallback || key;
    }

    function fmt(template, values) {
        var result = template;
        for (var k in values) {
            if (values.hasOwnProperty(k)) {
                result = result.replace(new RegExp('\\{' + k + '\\}', 'g'), values[k]);
            }
        }
        return result;
    }

    function $(id) { return document.getElementById(id); }

    // --- Chakra zone definitions ---
    var ZONES = [
        { id: 'crown',    color: '#9b59b6', glowColor: 'rgba(155, 89, 182, 0.6)' },
        { id: 'thirdEye', color: '#6c5ce7', glowColor: 'rgba(108, 92, 231, 0.6)' },
        { id: 'throat',   color: '#0984e3', glowColor: 'rgba(9, 132, 227, 0.6)' },
        { id: 'heart',    color: '#00b894', glowColor: 'rgba(0, 184, 148, 0.6)' },
        { id: 'solar',    color: '#fdcb6e', glowColor: 'rgba(253, 203, 110, 0.6)' },
        { id: 'sacral',   color: '#e17055', glowColor: 'rgba(225, 112, 85, 0.6)' },
        { id: 'root',     color: '#d63031', glowColor: 'rgba(214, 48, 49, 0.6)' }
    ];

    // Each zone has 2 binary questions; each answer = 0 or 1
    // Max per zone = 2 (both positive), total max = 14
    // Score mapped to 0-1000

    // --- State ---
    var zoneScores = {};      // zoneId -> [q1answer, q2answer]  (0 or 1 each)
    var completedZones = {};  // zoneId -> true
    var activeZone = null;
    var activeQuestionIndex = 0;
    var zonesCompleted = 0;

    // --- DOM caching ---
    var startScreen = $('startScreen');
    var scannerScreen = $('scannerScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var questionPanel = $('questionPanel');
    var qpZoneDot = $('qpZoneDot');
    var qpZoneName = $('qpZoneName');
    var qpQuestionNum = $('qpQuestionNum');
    var qpQuestionText = $('qpQuestionText');
    var qpOptions = $('qpOptions');
    var zoneProgressText = $('zoneProgressText');
    var resultScoreLabel = $('resultScoreLabel');
    var resultTierDesc = $('resultTierDesc');
    var resultStrongest = $('resultStrongest');
    var resultWeakest = $('resultWeakest');
    var chakraBars = $('chakraBars');
    var retakeBtn = $('retakeBtn');
    var shareTwitterBtn = $('shareTwitter');
    var shareCopyBtn = $('shareCopy');
    var themeToggle = $('themeToggle');
    var themeIcon = $('themeIcon');
    var langBtn = $('langBtn');
    var langDropdown = $('langDropdown');
    var currentLangLabel = $('currentLang');

    // --- Language name map ---
    var langNames = {
        ko: '\uD55C\uAD6D\uC5B4', en: 'English', zh: '\u4E2D\u6587',
        hi: '\u0939\u093F\u0928\u094D\u0926\u0940', ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
        ja: '\u65E5\u672C\u8A9E', es: 'Espa\u00F1ol', pt: 'Portugu\u00EAs',
        id: 'Indonesia', tr: 'T\u00FCrk\u00E7e', de: 'Deutsch', fr: 'Fran\u00E7ais'
    };

    // --- Helpers ---
    function getZoneDef(zoneId) {
        for (var i = 0; i < ZONES.length; i++) {
            if (ZONES[i].id === zoneId) return ZONES[i];
        }
        return ZONES[0];
    }

    function calculateTotalScore() {
        var raw = 0;
        for (var i = 0; i < ZONES.length; i++) {
            var scores = zoneScores[ZONES[i].id] || [0, 0];
            raw += scores[0] + scores[1];
        }
        // raw: 0-14, map to 0-1000
        return Math.round((raw / 14) * 1000);
    }

    function getZoneScore(zoneId) {
        var scores = zoneScores[zoneId] || [0, 0];
        return scores[0] + scores[1]; // 0, 1, or 2
    }

    function getTier(score) {
        if (score >= 800) return 'legendary';
        if (score >= 600) return 'radiant';
        if (score >= 400) return 'awakened';
        if (score >= 200) return 'dormant';
        return 'blocked';
    }

    // --- Screen management ---
    function showScreen(screen) {
        startScreen.style.display = 'none';
        scannerScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        screen.style.display = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- Theme toggle ---
    function initTheme() {
        var saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
        updateThemeIcon();
    }

    function updateThemeIcon() {
        var current = document.documentElement.getAttribute('data-theme');
        if (themeIcon) {
            themeIcon.textContent = current === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            var current = document.documentElement.getAttribute('data-theme');
            var next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateThemeIcon();
        });
    }

    // --- Language selector ---
    function initLangSelector() {
        if (!langBtn || !langDropdown) return;

        langBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            langDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!langDropdown.contains(e.target) && e.target !== langBtn) {
                langDropdown.classList.remove('active');
            }
        });

        var langOptions = langDropdown.querySelectorAll('.lang-option');
        langOptions.forEach(function(option) {
            option.addEventListener('click', function() {
                var lang = this.getAttribute('data-lang');
                langDropdown.classList.remove('active');

                var inst = getI18n();
                if (inst && typeof inst.setLanguage === 'function') {
                    inst.setLanguage(lang).then(function() {
                        if (currentLangLabel) {
                            currentLangLabel.textContent = langNames[lang] || lang;
                        }
                        refreshLabels();
                    }).catch(function() {});
                }
            });
        });

        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    // --- Refresh SVG labels after lang change ---
    function refreshLabels() {
        var labels = document.querySelectorAll('.chakra-label');
        labels.forEach(function(lbl) {
            var zone = lbl.getAttribute('data-zone');
            if (zone) {
                lbl.textContent = t('zones.' + zone + '.name', zone);
            }
        });
        if (zoneProgressText) {
            zoneProgressText.textContent = zonesCompleted + ' / 7';
        }
        // If question panel is open, refresh it
        if (activeZone && questionPanel && questionPanel.classList.contains('open')) {
            renderQuestion();
        }
    }

    // --- Start scanner ---
    function startScanner() {
        zoneScores = {};
        completedZones = {};
        activeZone = null;
        activeQuestionIndex = 0;
        zonesCompleted = 0;

        // Reset zone visuals
        ZONES.forEach(function(z) {
            var el = document.getElementById('zone-' + z.id.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (!el) {
                // Try direct ID
                el = document.querySelector('[data-zone="' + z.id + '"]');
            }
            if (el) {
                el.classList.remove('completed', 'active');
                el.style.fill = '';
                el.style.filter = '';
            }
        });

        // Reset aura glows
        var glows = document.querySelectorAll('.aura-field-glow');
        glows.forEach(function(g) {
            g.style.opacity = '0';
        });

        if (questionPanel) questionPanel.classList.remove('open');
        if (zoneProgressText) zoneProgressText.textContent = '0 / 7';

        showScreen(scannerScreen);

        if (typeof gtag === 'function') {
            gtag('event', 'quiz_start', { event_category: 'aura-score' });
        }
    }

    // --- Handle zone tap ---
    function onZoneTap(zoneId) {
        if (completedZones[zoneId]) return;

        activeZone = zoneId;
        activeQuestionIndex = 0;
        zoneScores[zoneId] = [];

        // Highlight active zone
        ZONES.forEach(function(z) {
            var circles = document.querySelectorAll('.chakra-zone[data-zone="' + z.id + '"]');
            circles.forEach(function(c) {
                c.classList.remove('active');
            });
        });

        var activeCircles = document.querySelectorAll('.chakra-zone[data-zone="' + zoneId + '"]');
        activeCircles.forEach(function(c) {
            c.classList.add('active');
        });

        renderQuestion();

        if (questionPanel) {
            questionPanel.classList.add('open');
        }
    }

    // --- Render current question ---
    function renderQuestion() {
        if (!activeZone) return;

        var zoneDef = getZoneDef(activeZone);
        var qIdx = activeQuestionIndex + 1;

        if (qpZoneDot) {
            qpZoneDot.style.backgroundColor = zoneDef.color;
            qpZoneDot.style.boxShadow = '0 0 8px ' + zoneDef.glowColor;
        }

        if (qpZoneName) {
            qpZoneName.textContent = t('zones.' + activeZone + '.name', activeZone);
        }

        if (qpQuestionNum) {
            qpQuestionNum.textContent = qIdx + ' / 2';
        }

        if (qpQuestionText) {
            qpQuestionText.textContent = t('zones.' + activeZone + '.q' + qIdx + '.text', 'Question ' + qIdx);
        }

        if (qpOptions) {
            qpOptions.innerHTML = '';

            var optA = document.createElement('button');
            optA.className = 'qp-option-btn';
            optA.textContent = t('zones.' + activeZone + '.q' + qIdx + '.a', 'Yes');
            optA.style.borderColor = zoneDef.color;
            optA.addEventListener('click', function() { answerQuestion(1); });

            var optB = document.createElement('button');
            optB.className = 'qp-option-btn';
            optB.textContent = t('zones.' + activeZone + '.q' + qIdx + '.b', 'No');
            optB.style.borderColor = zoneDef.color;
            optB.addEventListener('click', function() { answerQuestion(0); });

            qpOptions.appendChild(optA);
            qpOptions.appendChild(optB);
        }
    }

    // --- Answer a question ---
    function answerQuestion(value) {
        if (!activeZone) return;

        zoneScores[activeZone].push(value);

        var zoneDef = getZoneDef(activeZone);

        if (activeQuestionIndex < 1) {
            // Next question
            activeQuestionIndex = 1;
            // Quick fade transition
            if (qpOptions) {
                var inner = $('questionPanelInner');
                if (inner) {
                    inner.classList.add('qp-fade');
                    setTimeout(function() {
                        renderQuestion();
                        inner.classList.remove('qp-fade');
                    }, 200);
                } else {
                    renderQuestion();
                }
            }
        } else {
            // Zone complete
            completedZones[activeZone] = true;
            zonesCompleted++;

            // Fill the zone with its color
            var circles = document.querySelectorAll('.chakra-zone[data-zone="' + activeZone + '"]');
            var score = getZoneScore(activeZone);
            var intensity = score === 2 ? 1 : (score === 1 ? 0.5 : 0.15);

            circles.forEach(function(c) {
                c.classList.remove('active');
                c.classList.add('completed');
                c.style.fill = zoneDef.color;
                c.style.opacity = intensity;
                c.style.filter = 'drop-shadow(0 0 ' + (score * 6 + 4) + 'px ' + zoneDef.glowColor + ')';
            });

            // Update aura glow based on completion
            updateAuraGlow();

            if (zoneProgressText) {
                zoneProgressText.textContent = zonesCompleted + ' / 7';
            }

            // Close panel
            if (questionPanel) {
                questionPanel.classList.remove('open');
            }

            activeZone = null;

            // Check if all zones done
            if (zonesCompleted >= 7) {
                setTimeout(function() {
                    showResults();
                }, 600);
            }
        }
    }

    // --- Update aura glow around body ---
    function updateAuraGlow() {
        var totalRaw = 0;
        var count = 0;
        for (var i = 0; i < ZONES.length; i++) {
            if (completedZones[ZONES[i].id]) {
                totalRaw += getZoneScore(ZONES[i].id);
                count++;
            }
        }
        var maxPossible = count * 2;
        var pct = maxPossible > 0 ? totalRaw / maxPossible : 0;

        var outerGlow = document.querySelector('.aura-glow-outer');
        var innerGlow = document.querySelector('.aura-glow-inner');

        // Determine dominant color from completed zones
        var dominantColor = getDominantAuraColor();

        if (outerGlow) {
            outerGlow.style.opacity = (0.05 + pct * 0.2).toString();
            outerGlow.style.fill = dominantColor;
        }
        if (innerGlow) {
            innerGlow.style.opacity = (0.08 + pct * 0.25).toString();
            innerGlow.style.fill = dominantColor;
        }
    }

    function getDominantAuraColor() {
        var bestZone = null;
        var bestScore = -1;
        for (var i = 0; i < ZONES.length; i++) {
            if (completedZones[ZONES[i].id]) {
                var s = getZoneScore(ZONES[i].id);
                if (s > bestScore) {
                    bestScore = s;
                    bestZone = ZONES[i];
                }
            }
        }
        return bestZone ? bestZone.color : '#7B2FBE';
    }

    // --- Show results ---
    function showResults() {
        var totalScore = calculateTotalScore();
        var tier = getTier(totalScore);

        showScreen(resultScreen);

        // Animate score in SVG
        var scoreSvg = $('resultScoreSvg');
        if (scoreSvg) {
            animateScoreText(scoreSvg, 0, totalScore, 1500);
        }

        // Score label
        if (resultScoreLabel) {
            resultScoreLabel.textContent = t('tiers.' + tier + '.name', tier);
            resultScoreLabel.style.color = getTierColor(tier);
        }

        // Tier description
        if (resultTierDesc) {
            resultTierDesc.textContent = t('tiers.' + tier + '.desc', '');
        }

        // Result glow colors
        var tierColor = getTierColor(tier);
        var glow1 = $('resultGlow1');
        var glow2 = $('resultGlow2');
        var glow3 = $('resultGlow3');
        if (glow1) { glow1.style.fill = tierColor; glow1.style.opacity = '0.4'; }
        if (glow2) { glow2.style.fill = tierColor; glow2.style.opacity = '0.2'; }
        if (glow3) { glow3.style.fill = tierColor; glow3.style.opacity = '0.1'; }

        // Chakra breakdown bars
        renderChakraBars();

        // Strongest & weakest
        renderStrongestWeakest();

        // GA4 event
        if (typeof gtag === 'function') {
            gtag('event', 'quiz_complete', {
                event_category: 'aura-score',
                event_label: tier,
                value: totalScore
            });
        }
    }

    function getTierColor(tier) {
        switch (tier) {
            case 'legendary': return '#ffd700';
            case 'radiant':   return '#9b59b6';
            case 'awakened':  return '#0984e3';
            case 'dormant':   return '#e17055';
            case 'blocked':   return '#636e72';
            default:          return '#7B2FBE';
        }
    }

    function animateScoreText(element, from, to, duration) {
        var startTime = null;
        var diff = to - from;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + diff * eased);
            element.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    function renderChakraBars() {
        if (!chakraBars) return;
        chakraBars.innerHTML = '';

        ZONES.forEach(function(z) {
            var score = getZoneScore(z.id);
            var pct = (score / 2) * 100;

            var row = document.createElement('div');
            row.className = 'chakra-bar-row';

            var label = document.createElement('span');
            label.className = 'chakra-bar-label';
            label.textContent = t('zones.' + z.id + '.name', z.id);

            var barWrap = document.createElement('div');
            barWrap.className = 'chakra-bar-wrap';

            var barFill = document.createElement('div');
            barFill.className = 'chakra-bar-fill';
            barFill.style.backgroundColor = z.color;
            barFill.style.boxShadow = '0 0 8px ' + z.glowColor;

            var scoreLabel = document.createElement('span');
            scoreLabel.className = 'chakra-bar-score';
            scoreLabel.textContent = score + '/2';
            scoreLabel.style.color = z.color;

            barWrap.appendChild(barFill);
            row.appendChild(label);
            row.appendChild(barWrap);
            row.appendChild(scoreLabel);
            chakraBars.appendChild(row);

            // Animate fill
            setTimeout(function() {
                barFill.style.width = pct + '%';
            }, 100);
        });
    }

    function renderStrongestWeakest() {
        var strongest = null;
        var weakest = null;
        var maxScore = -1;
        var minScore = 3;

        ZONES.forEach(function(z) {
            var s = getZoneScore(z.id);
            if (s > maxScore) { maxScore = s; strongest = z; }
            if (s < minScore) { minScore = s; weakest = z; }
        });

        if (resultStrongest && strongest) {
            resultStrongest.innerHTML = '<span class="result-label">' + t('result.strongest', 'Strongest Chakra') + '</span>' +
                '<span class="result-value" style="color:' + strongest.color + '">' + t('zones.' + strongest.id + '.name', strongest.id) + '</span>';
        }

        if (resultWeakest && weakest) {
            resultWeakest.innerHTML = '<span class="result-label">' + t('result.weakest', 'Weakest Chakra') + '</span>' +
                '<span class="result-value" style="color:' + weakest.color + '">' + t('zones.' + weakest.id + '.name', weakest.id) + '</span>';
        }
    }

    // --- Share: Twitter ---
    function shareTwitter() {
        var totalScore = calculateTotalScore();
        var tier = getTier(totalScore);
        var tierLabel = t('tiers.' + tier + '.name', tier);
        var text = fmt(t('share.text', 'My aura score is {score}! I\'m \"{tier}\"'), {
            score: totalScore,
            tier: tierLabel
        });
        var url = 'https://dopabrain.com/aura-score/';
        window.open(
            'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
            '_blank',
            'noopener'
        );
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'twitter', content_type: 'quiz_result' });
        }
    }

    // --- Share: Copy URL ---
    function copyUrl() {
        var url = 'https://dopabrain.com/aura-score/';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                showCopiedFeedback();
            }).catch(function() {
                fallbackCopy(url);
            });
        } else {
            fallbackCopy(url);
        }
        if (typeof gtag === 'function') {
            gtag('event', 'share', { method: 'copy', content_type: 'quiz_result' });
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopiedFeedback(); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    function showCopiedFeedback() {
        if (!shareCopyBtn) return;
        var original = shareCopyBtn.textContent;
        shareCopyBtn.textContent = t('share.copied', 'Copied!');
        setTimeout(function() {
            shareCopyBtn.textContent = t('share.copyUrl', 'Copy Link');
        }, 2000);
    }

    // --- Hide loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // --- Bind zone click events ---
    function bindZoneEvents() {
        var zones = document.querySelectorAll('.chakra-zone');
        zones.forEach(function(zone) {
            zone.addEventListener('click', function() {
                var zoneId = this.getAttribute('data-zone');
                if (zoneId) onZoneTap(zoneId);
            });
            // Touch support
            zone.style.cursor = 'pointer';
        });

        // Also bind labels as clickable
        var labels = document.querySelectorAll('.chakra-label');
        labels.forEach(function(lbl) {
            lbl.addEventListener('click', function() {
                var zoneId = this.getAttribute('data-zone');
                if (zoneId) onZoneTap(zoneId);
            });
            lbl.style.cursor = 'pointer';
        });
    }

    // --- Bind events ---
    function bindEvents() {
        if (startBtn) {
            startBtn.addEventListener('click', startScanner);
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
            });
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareTwitter);
        }

        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', copyUrl);
        }

        bindZoneEvents();
    }

    // --- Init ---
    function init() {
        initTheme();
        initLangSelector();
        bindEvents();

        var inst = getI18n();
        if (inst && typeof inst.loadTranslations === 'function') {
            inst.loadTranslations(inst.currentLang).then(function() {
                if (typeof inst.updateUI === 'function') {
                    inst.updateUI();
                }
                if (currentLangLabel) {
                    currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
                }
                refreshLabels();
                hideLoader();
            }).catch(function() {
                hideLoader();
            });
        } else {
            hideLoader();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
