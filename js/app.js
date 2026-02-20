/* ========================================
   Aura Score Test - App Logic
   12 scenario-based questions
   Aura points per choice, tier by total
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

    // --- Questions data ---
    // Each question: scenario emoji, i18n key prefix, 4 options with aura points
    var questions = [
        {
            key: 'q1',
            emoji: '\uD83D\uDE05',
            options: [
                { key: 'a', points: 500 },
                { key: 'b', points: 200 },
                { key: 'c', points: -300 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q2',
            emoji: '\uD83D\uDE24',
            options: [
                { key: 'a', points: 400 },
                { key: 'b', points: 100 },
                { key: 'c', points: -100 },
                { key: 'd', points: -400 }
            ]
        },
        {
            key: 'q3',
            emoji: '\uD83D\uDCF1',
            options: [
                { key: 'a', points: 500 },
                { key: 'b', points: 100 },
                { key: 'c', points: -200 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q4',
            emoji: '\uD83E\uDD3E',
            options: [
                { key: 'a', points: 600 },
                { key: 'b', points: 300 },
                { key: 'c', points: -200 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q5',
            emoji: '\uD83D\uDD25',
            options: [
                { key: 'a', points: 500 },
                { key: 'b', points: 300 },
                { key: 'c', points: -200 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q6',
            emoji: '\uD83D\uDEAA',
            options: [
                { key: 'a', points: 400 },
                { key: 'b', points: 600 },
                { key: 'c', points: -100 },
                { key: 'd', points: -300 }
            ]
        },
        {
            key: 'q7',
            emoji: '\uD83C\uDFC0',
            options: [
                { key: 'a', points: 500 },
                { key: 'b', points: 200 },
                { key: 'c', points: -300 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q8',
            emoji: '\uD83D\uDCDE',
            options: [
                { key: 'a', points: 300 },
                { key: 'b', points: 100 },
                { key: 'c', points: -300 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q9',
            emoji: '\uD83D\uDC4B',
            options: [
                { key: 'a', points: 400 },
                { key: 'b', points: 600 },
                { key: 'c', points: -200 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q10',
            emoji: '\uD83D\uDE0F',
            options: [
                { key: 'a', points: 300 },
                { key: 'b', points: 400 },
                { key: 'c', points: -200 },
                { key: 'd', points: -100 }
            ]
        },
        {
            key: 'q11',
            emoji: '\u2764\uFE0F',
            options: [
                { key: 'a', points: 200 },
                { key: 'b', points: 600 },
                { key: 'c', points: -300 },
                { key: 'd', points: -500 }
            ]
        },
        {
            key: 'q12',
            emoji: '\uD83C\uDF99\uFE0F',
            options: [
                { key: 'a', points: 600 },
                { key: 'b', points: 400 },
                { key: 'c', points: -200 },
                { key: 'd', points: -500 }
            ]
        }
    ];

    // --- Tier definitions ---
    var tiers = [
        { key: 'npc',        emoji: '\uD83E\uDD16', color: '#888888', min: -Infinity, max: -1001 },
        { key: 'background',  emoji: '\uD83D\uDC64', color: '#d4a017', min: -1000,    max: 999 },
        { key: 'side',        emoji: '\u26A1',       color: '#4a90d9', min: 1000,     max: 2999 },
        { key: 'main',        emoji: '\uD83D\uDC51', color: '#9b59b6', min: 3000,     max: 4999 },
        { key: 'god',         emoji: '\uD83C\uDF1F', color: '#ffd700', min: 5000,     max: Infinity }
    ];

    // --- State ---
    var currentQuestion = 0;
    var totalScore = 0;
    var answers = [];
    var isTransitioning = false;

    // --- DOM caching ---
    var startScreen = $('startScreen');
    var quizScreen = $('quizScreen');
    var resultScreen = $('resultScreen');
    var startBtn = $('startBtn');
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    var auraValue = $('auraValue');
    var scenarioEmoji = $('scenarioEmoji');
    var questionText = $('questionText');
    var optionsContainer = $('optionsContainer');
    var questionCard = $('questionCard');
    var tierBadge = $('tierBadge');
    var auraMeterFill = $('auraMeterFill');
    var auraMeterGlow = $('auraMeterGlow');
    var auraScoreDisplay = $('auraScoreDisplay');
    var tierName = $('tierName');
    var tierDesc = $('tierDesc');
    var breakdownList = $('breakdownList');
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

    // --- Get tier from score ---
    function getTier(score) {
        for (var i = tiers.length - 1; i >= 0; i--) {
            if (score >= tiers[i].min) return tiers[i];
        }
        return tiers[0];
    }

    // --- Format score with + sign and commas ---
    function formatScore(score) {
        var prefix = score >= 0 ? '+' : '';
        return prefix + score.toLocaleString();
    }

    // --- Screen management ---
    function showScreen(screen) {
        startScreen.style.display = 'none';
        quizScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        startScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        screen.style.display = '';
        screen.classList.add('active');
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
                        refreshCurrentView();
                    }).catch(function() {});
                }
            });
        });

        // Set initial label
        var inst = getI18n();
        if (inst && currentLangLabel) {
            currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
        }
    }

    // --- Refresh current view after language change ---
    function refreshCurrentView() {
        if (quizScreen.classList.contains('active')) {
            renderQuestion();
            auraValue.textContent = formatScore(totalScore);
        } else if (resultScreen.classList.contains('active')) {
            renderResult();
        }
    }

    // --- Start quiz ---
    function startQuiz() {
        currentQuestion = 0;
        totalScore = 0;
        answers = [];
        isTransitioning = false;
        auraValue.textContent = '0';
        showScreen(quizScreen);
        renderQuestion();

        if (typeof gtag === 'function') {
            gtag('event', 'quiz_start', { event_category: 'aura-score' });
        }
    }

    // --- Render question ---
    function renderQuestion() {
        var q = questions[currentQuestion];
        var qNum = currentQuestion + 1;
        var total = questions.length;

        // Update progress
        var pct = (currentQuestion / total) * 100;
        progressFill.style.width = pct + '%';
        progressText.textContent = qNum + ' / ' + total;

        // Scenario emoji
        scenarioEmoji.textContent = q.emoji;

        // Question text via i18n
        questionText.textContent = t('questions.' + q.key + '.text', 'Question ' + qNum);

        // Render options
        optionsContainer.innerHTML = '';
        q.options.forEach(function(opt, idx) {
            var btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = t('questions.' + q.key + '.' + opt.key, 'Option ' + (idx + 1));
            btn.addEventListener('click', function() {
                if (!isTransitioning) {
                    selectOption(idx);
                }
            });
            optionsContainer.appendChild(btn);
        });
    }

    // --- Select option ---
    function selectOption(index) {
        if (isTransitioning) return;
        isTransitioning = true;

        var q = questions[currentQuestion];
        var opt = q.options[index];
        var points = opt.points;
        var prevScore = totalScore;

        // Store answer
        answers.push({
            questionIndex: currentQuestion,
            optionIndex: index,
            points: points
        });

        // Update total
        totalScore += points;

        // Visual feedback on selected button
        var buttons = optionsContainer.querySelectorAll('.option-btn');
        buttons.forEach(function(btn, i) {
            btn.disabled = true;
            if (i === index) {
                btn.classList.add(points >= 0 ? 'selected-positive' : 'selected-negative');
            }
        });

        // Show floating points indicator
        showFloatingPoints(points, buttons[index]);

        // Animate aura counter
        animateScore(auraValue, prevScore, totalScore);

        // Advance after delay
        setTimeout(function() {
            if (currentQuestion < questions.length - 1) {
                currentQuestion++;
                // Slide transition on question card
                if (questionCard) {
                    questionCard.classList.add('slide-out');
                    setTimeout(function() {
                        renderQuestion();
                        questionCard.classList.remove('slide-out');
                        questionCard.classList.add('slide-in');
                        setTimeout(function() {
                            questionCard.classList.remove('slide-in');
                            isTransitioning = false;
                        }, 300);
                    }, 300);
                } else {
                    renderQuestion();
                    isTransitioning = false;
                }
            } else {
                // Quiz complete
                progressFill.style.width = '100%';
                showScreen(resultScreen);
                renderResult();
                isTransitioning = false;
            }
        }, 800);
    }

    // --- Floating points indicator ---
    function showFloatingPoints(points, targetBtn) {
        var floater = document.createElement('div');
        floater.className = 'floating-points';
        floater.classList.add(points >= 0 ? 'positive' : 'negative');
        floater.textContent = formatScore(points);

        if (targetBtn && targetBtn.parentNode) {
            targetBtn.style.position = 'relative';
            floater.style.position = 'absolute';
            floater.style.top = '-10px';
            floater.style.right = '10px';
            floater.style.pointerEvents = 'none';
            targetBtn.appendChild(floater);
        } else {
            document.body.appendChild(floater);
        }

        requestAnimationFrame(function() {
            floater.classList.add('animate');
        });

        setTimeout(function() {
            if (floater.parentNode) {
                floater.parentNode.removeChild(floater);
            }
        }, 1000);
    }

    // --- Aura counter animation (count up/down) ---
    function animateScore(element, from, to) {
        var duration = 600;
        var startTime = null;
        var diff = to - from;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + diff * eased);
            element.textContent = formatScore(current);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // --- Render result ---
    function renderResult() {
        var tier = getTier(totalScore);

        // Tier badge
        tierBadge.textContent = tier.emoji;
        tierBadge.style.borderColor = tier.color;

        // Score display with animation
        auraScoreDisplay.textContent = '+0';
        setTimeout(function() {
            animateScore(auraScoreDisplay, 0, totalScore);
        }, 300);

        // Aura meter fill animation
        // Map score from possible range (-6000 to +7200) into 0-100%
        var minPossible = -6000;
        var maxPossible = 7200;
        var normalized = ((totalScore - minPossible) / (maxPossible - minPossible)) * 100;
        normalized = Math.max(0, Math.min(100, normalized));

        if (auraMeterFill) {
            auraMeterFill.style.width = '0%';
            auraMeterFill.style.backgroundColor = tier.color;
        }
        if (auraMeterGlow) {
            auraMeterGlow.style.boxShadow = '0 0 20px ' + tier.color;
        }

        setTimeout(function() {
            if (auraMeterFill) {
                auraMeterFill.style.width = normalized + '%';
            }
        }, 500);

        // Tier name
        tierName.textContent = t('tiers.' + tier.key + '.name', tier.key);
        tierName.style.color = tier.color;

        // Tier description
        tierDesc.textContent = t('tiers.' + tier.key + '.desc', '');

        // Breakdown list
        renderBreakdown();

        // GA4 event
        if (typeof gtag === 'function') {
            gtag('event', 'quiz_complete', {
                event_category: 'aura-score',
                event_label: tier.key,
                value: totalScore
            });
        }
    }

    // --- Render breakdown ---
    function renderBreakdown() {
        breakdownList.innerHTML = '';

        answers.forEach(function(answer) {
            var q = questions[answer.questionIndex];
            var qNum = answer.questionIndex + 1;
            var row = document.createElement('div');
            row.className = 'breakdown-row';

            var label = document.createElement('span');
            label.className = 'breakdown-label';
            label.textContent = q.emoji + ' ' + t('questions.' + q.key + '.text', 'Q' + qNum);

            var pts = document.createElement('span');
            pts.className = 'breakdown-points';
            pts.classList.add(answer.points >= 0 ? 'positive' : 'negative');
            pts.textContent = formatScore(answer.points);

            row.appendChild(label);
            row.appendChild(pts);
            breakdownList.appendChild(row);
        });

        // Total row
        var totalRow = document.createElement('div');
        totalRow.className = 'breakdown-row breakdown-total';

        var totalLabel = document.createElement('span');
        totalLabel.className = 'breakdown-label';
        totalLabel.textContent = t('result.total', 'Total');

        var totalPts = document.createElement('span');
        totalPts.className = 'breakdown-points total-score';
        var tier = getTier(totalScore);
        totalPts.style.color = tier.color;
        totalPts.textContent = formatScore(totalScore);

        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalPts);
        breakdownList.appendChild(totalRow);
    }

    // --- Share: Twitter ---
    function shareTwitter() {
        var tier = getTier(totalScore);
        var tierLabel = t('tiers.' + tier.key + '.name', tier.key);
        var text = fmt(t('share.text', 'My aura score is {score}! I\'m {tier}!'), {
            score: formatScore(totalScore),
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

    // --- Toast notification ---
    function showToast(msg) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('show');
        });

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    }

    // --- Hide loader ---
    function hideLoader() {
        var loader = $('app-loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    // --- Bind events ---
    function bindEvents() {
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }

        if (retakeBtn) {
            retakeBtn.addEventListener('click', function() {
                showScreen(startScreen);
                // Reset meter
                if (auraMeterFill) auraMeterFill.style.width = '0%';
                if (auraScoreDisplay) auraScoreDisplay.textContent = '+0';
            });
        }

        if (shareTwitterBtn) {
            shareTwitterBtn.addEventListener('click', shareTwitter);
        }

        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', copyUrl);
        }
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
                // Update lang label
                if (currentLangLabel) {
                    currentLangLabel.textContent = langNames[inst.currentLang] || inst.currentLang;
                }
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
