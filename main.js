// Mandala Unfolding Application
// ── Guide caption data ────────────────────────────────────────────────────────
// Add entries here once you have the transcript. Format: { start, end, text }
// Times are in seconds, matching guide-audio.aac playback position.
const GUIDE_CAPTIONS = [
    // { start: 0,   end: 4.5,  text: 'find a comfortable position and close your eyes.' },
    // { start: 4.5, end: 9.0,  text: 'take a slow breath in...' },
    // Add your full transcript here
];
// ─────────────────────────────────────────────────────────────────────────────

let canvas, ctx, coinCanvas, coinCtx;
let mandalaGenerator, coinSystem, liquidEffect, cursorSystem, soundSystem;
let foldCount = 0;
let centerX = 0, centerY = 0;
let mouseX = 0, mouseY = 0;
let time = 0;
let currentStyle = 0;
let styleNames = ['Geometric', 'Thread Lines', 'Interwoven', 'Ocean Depths', 'Emerald Forest', 'Pixel Art', '≋ Water', '✦ Cosmos', '◎ Watercolor', '✧ Aurora', '❧ Words', '♫ Garden'];
let activeMode = null; // null = mandala; 'water'/'cosmos'/'watercolor'/'aurora'/'quotes'/'garden'
let waterMode, cosmosMode, watercolorMode, auroraMode, quoteMode, soundGardenMode, videoRoomMode, breathMode;
let distractionSystem;

// ── Background void dust ──────────────────────────────────────────────────────
let bgDust = [];
function initBgDust() {
    bgDust = [];
    for (let i = 0; i < 80; i++) {
        bgDust.push({
            x:  Math.random() * window.innerWidth,
            y:  Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.10,
            vy: (Math.random() - 0.5) * 0.10,
            r:  0.25 + Math.random() * 0.85,
            a:  0.018 + Math.random() * 0.048,
            ph: Math.random() * Math.PI * 2,
            ps: 0.004 + Math.random() * 0.010,
        });
    }
}
function drawBgDust() {
    for (const p of bgDust) {
        p.x += p.vx; p.y += p.vy; p.ph += p.ps;
        if (p.x < -2)               p.x += canvas.width  + 4;
        else if (p.x > canvas.width  + 2) p.x -= canvas.width  + 4;
        if (p.y < -2)               p.y += canvas.height + 4;
        else if (p.y > canvas.height + 2) p.y -= canvas.height + 4;
        const tw = 0.5 + 0.5 * Math.sin(p.ph);
        coinCtx.beginPath();
        coinCtx.arc(p.x, p.y, p.r * (0.6 + tw * 0.4), 0, Math.PI * 2);
        coinCtx.fillStyle = `rgba(255,255,255,${p.a * tw})`;
        coinCtx.fill();
    }
}
let handTracker = null;
let handInitialized = false;
let cosmicSpiral = null;
let session = null;

// Camera nucleus radius — shared between draw and donut clip
const NUCLEUS_R = 68;

// Scene 1: calligraphic spiral + paint blob system
let spiralBlobs = [];
let spiralTheta  = 0;

// Scene transition fade overlay
let sceneTransAlpha = 0;

// Scene transition (fade-to-black)
let _exitProgress = 0;
let _exitActive   = false;
let _exitCallback = null;

// Flame bloom transition (when candle reaches centre)
let _flameBloom     = null; // { progress, onComplete }
let _skipExitAnim   = false; // set before flame-triggered onStageChange

// Haiku-first: block scene rendering until haiku is shown
let _sceneHaikuShowing = false;

// Canvas snapshot (captured after enough mandala layers built)
let _experienceSnapshot = null;

// Head-shake gaze detection → prev/next scene
let _gazeLeft = 0, _gazeRight = 0, _gazeXLastTime = null;

// Mandala bloom rings — radiate from center on each blink/click
let bloomRings = [];

// Video nucleus — circular live webcam preview at mandala center
let videoNucleusAlpha  = 0;
let videoNucleusVisible = false;
let nucleusLifetime = 0;
let audioInitialized = false;
let blinkInitialized = false;
let hintVisible = true;
let blinkDetector = null;
let blinkActive = false;

// ── Study data endpoint — set to your Formspree URL after deploying ──────────
const FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/yourFormId'

// Initialise a mood range slider with a live track-fill gradient
function _initMoodSlider(id) {
    const slider = document.getElementById(id);
    if (!slider) return;
    const update = () => {
        const pct = (slider.value - 1) / 9 * 100;
        slider.style.background =
            `linear-gradient(to right, rgba(165,178,240,0.42) ${pct}%, rgba(90,100,155,0.14) ${pct}%)`;
    };
    slider.addEventListener('input', update);
    update();
}

// Wire pill-button groups: single-select within each group
function _initPillButtons() {
    document.querySelectorAll('.rqPills').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    });
}

// Collect form values, save to localStorage, optionally POST to Formspree
function _submitReflection() {
    window._studyData = window._studyData || {};
    const data = { ...window._studyData, timestamp: new Date().toISOString() };

    // Collect pill selections
    document.querySelectorAll('.rqPills').forEach(group => {
        const name = group.dataset.name;
        const sel  = group.querySelector('button.selected');
        if (name) data[name] = sel ? sel.dataset.val : '';
    });

    // Collect text inputs
    const meditateHow = document.getElementById('meditateHowInput');
    if (meditateHow) data.meditateHow = meditateHow.value.trim();
    const openEnded = document.getElementById('openEndedInput');
    if (openEnded) data.openEnded = openEnded.value.trim();

    // Save to localStorage (accumulates across participants on same device)
    const stored = JSON.parse(localStorage.getItem('fluxResponses') || '[]');
    stored.push(data);
    localStorage.setItem('fluxResponses', JSON.stringify(stored));

    // Optional: POST to Formspree if endpoint is configured
    if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
        }).catch(() => {});
    }

    // Show confirmation then transition to final card
    const submitBtn = document.getElementById('reflectionSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;
    let msg = document.getElementById('submittedMsg');
    if (!msg) {
        msg = document.createElement('p');
        msg.id = 'submittedMsg';
        msg.textContent = 'responses saved — thank you';
        submitBtn?.parentNode.appendChild(msg);
    }
    msg.style.opacity = '0';
    msg.style.animation = '';
    void msg.offsetWidth;
    msg.style.animation = 'gentleFade 1s ease forwards';

    setTimeout(() => {
        document.getElementById('reflectionOverlay').classList.add('hidden');
        const endOverlay = document.getElementById('endOverlay');
        endOverlay.classList.remove('hidden');
        _populateEndCard();
    }, 2200);
}

// Show mandala snapshot + download/email in end card
function _populateEndCard() {
    const wrap = document.getElementById('endMandalaWrap');
    const actions = document.getElementById('endMandalaActions');
    if (!wrap) return;

    if (_experienceSnapshot) {
        // Show the circular snapshot
        const img = document.createElement('img');
        img.id  = 'endMandala';
        img.src = _experienceSnapshot;
        img.alt = 'your mandala';
        wrap.appendChild(img);

        // Show download + email section
        if (actions) actions.style.display = 'block';

        // Wire download button
        const saveBtn = document.getElementById('saveMandalaBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const emailEl = document.getElementById('endEmailInput');
                const email   = emailEl?.value.trim() || '';

                // Always record email in localStorage (even without Formspree)
                if (email) {
                    const stored = JSON.parse(localStorage.getItem('fluxResponses') || '[]');
                    if (stored.length) {
                        stored[stored.length - 1].emailForMandala = email;
                        localStorage.setItem('fluxResponses', JSON.stringify(stored));
                    }
                }

                // POST to Formspree if configured
                if (email && FORM_ENDPOINT) {
                    fetch(FORM_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify({ ...window._studyData, emailForMandala: email }),
                    }).catch(() => {});
                }

                // Download
                const a = document.createElement('a');
                a.href     = _experienceSnapshot;
                a.download = 'your-mandala.jpg';
                a.click();

                // Visual feedback on button
                saveBtn.textContent = 'saved ✓';
                setTimeout(() => { saveBtn.textContent = 'save your mandala  ↓'; }, 2000);
            });
        }
    } else {
        // No snapshot yet — show a gentle placeholder
        const ph = document.createElement('div');
        ph.id = 'endMandalaPlaceholder';
        ph.textContent = 'your mandala lives in you';
        wrap.appendChild(ph);
    }
}

// Initialize
function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    coinCanvas = document.getElementById('coinCanvas');
    coinCtx = coinCanvas.getContext('2d');

    // Hide canvases during intro overlays — prevents visual artifacts while brand screen fades
    canvas.classList.add('intro-hidden');
    coinCanvas.classList.add('intro-hidden');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize systems
    mandalaGenerator = new MandalaGenerator(ctx);
    coinSystem = new CoinSystem(coinCtx, coinCanvas);
    liquidEffect = new LiquidEffect(ctx, canvas);
    cursorSystem = new CursorSystem(coinCtx, coinCanvas);
    soundSystem = new SoundSystem();
    cosmicSpiral = new CosmicSpiral(ctx, canvas);

    // Session manager — controls 10-min guided experience
    session = new SessionManager(canvas, coinCanvas, coinCtx, (stage) => {
        if (_skipExitAnim) {
            _skipExitAnim = false;
            _setupNewScene(stage);
        } else {
            _startExitAnimation(() => _setupNewScene(stage));
        }
    });

    // Flame triggers the light-bloom → TV collapse instead of plain fade
    session.onFlameTrigger = (proceed) => {
        _skipExitAnim = true;
        _playFlameBloom(proceed);
    };

    // ── Brand screen → intro description ────────────────────────────────────
    document.getElementById('brandContinueBtn').addEventListener('click', () => {
        const brand = document.getElementById('brandScreen');
        brand.classList.add('fading');
        setTimeout(() => {
            brand.classList.add('hidden');
            document.getElementById('introOverlay').classList.remove('hidden');
        }, 1100);
    });

    // ── Intro description → rules screen ────────────────────────────────────
    document.getElementById('introNextBtn').addEventListener('click', () => {
        const intro = document.getElementById('introOverlay');
        intro.classList.add('fading');
        setTimeout(() => {
            intro.classList.add('hidden');
            intro.classList.remove('fading');
            document.getElementById('rulesOverlay').classList.remove('hidden');
        }, 900);
    });

    // ── Rules → pre-experience mood slider ──────────────────────────────────
    document.getElementById('beginBtn').addEventListener('click', () => {
        const rules = document.getElementById('rulesOverlay');
        rules.classList.add('fading');
        setTimeout(() => {
            rules.classList.add('hidden');
            rules.classList.remove('fading');
            document.getElementById('moodOverlay').classList.remove('hidden');
            _initMoodSlider('preMoodSlider');
        }, 900);
    });

    // ── Pre-mood → video intro (actual begin) ────────────────────────────────
    document.getElementById('moodStartBtn').addEventListener('click', () => {
        window._studyData = window._studyData || {};
        window._studyData.preMood = +document.getElementById('preMoodSlider').value;

        const mood = document.getElementById('moodOverlay');
        mood.classList.add('fading');
        setTimeout(() => {
            mood.classList.add('hidden');
            mood.classList.remove('fading');
            initAudio();
            initBlink();
            const bw = document.getElementById('blinkWrap');
            if (bw) bw.style.display = 'none';
            _startVideoIntro();
        }, 900);
    });

    // ── Session end → post-mood → reflection → end card ─────────────────────
    document.addEventListener('experienceEnd', () => {
        document.getElementById('endMoodOverlay').classList.remove('hidden');
        _initMoodSlider('postMoodSlider');
    });

    document.getElementById('postMoodNextBtn').addEventListener('click', () => {
        window._studyData = window._studyData || {};
        window._studyData.postMood = +document.getElementById('postMoodSlider').value;

        const el = document.getElementById('endMoodOverlay');
        el.classList.add('fading');
        setTimeout(() => {
            el.classList.add('hidden');
            el.classList.remove('fading');
            document.getElementById('reflectionOverlay').classList.remove('hidden');
            _initPillButtons();
        }, 900);
    });

    document.getElementById('reflectionSubmitBtn').addEventListener('click', () => {
        _submitReflection();
    });

    // ── Video skip button ─────────────────────────────────────────────────────
    document.getElementById('videoSkipBtn').addEventListener('click', () => {
        _finishVideoIntro();
    });

    // Restart button
    document.getElementById('restartBtn').addEventListener('click', () => {
        document.getElementById('endOverlay').classList.add('hidden');
        document.getElementById('introOverlay').classList.remove('hidden');

        // Reset all session state for a clean second run
        window._studyData       = {};
        _experienceSnapshot     = null;
        _sceneHaikuShowing      = false;
        _exitActive             = false;
        _flameBloom             = null;
        _skipExitAnim           = false;
        _pendingDistractionScene = null;
        sceneTransAlpha         = 0;

        clearCanvas();
        activeMode = null;
        mandalaGenerator.setStyle(0);
        foldCount = 0;

        // Stop ambient sound
        soundSystem.startModeAmbient('__none__'); // hits default: break, stops nodes
        if (soundGardenMode) soundGardenMode._stopLoop();
        if (distractionSystem) distractionSystem.stop();

        // Re-hide canvases so brand/intro screens are clean
        canvas.classList.add('intro-hidden');
        coinCanvas.classList.add('intro-hidden');

        // Clear mandala photo from previous run
        const mw = document.getElementById('endMandalaWrap');
        if (mw) mw.innerHTML = '';
        const ma = document.getElementById('endMandalaActions');
        if (ma) ma.style.display = 'none';

        // Re-enable and clean up reflection form for next participant
        const submitBtn = document.getElementById('reflectionSubmitBtn');
        if (submitBtn) submitBtn.disabled = false;
        const msg = document.getElementById('submittedMsg');
        if (msg) msg.remove();
        document.querySelectorAll('.rqPills button').forEach(b => b.classList.remove('selected'));
        const meditateHow = document.getElementById('meditateHowInput');
        if (meditateHow) meditateHow.value = '';
        const openEnded = document.getElementById('openEndedInput');
        if (openEnded) openEnded.value = '';
        const emailInput = document.getElementById('endEmailInput');
        if (emailInput) emailInput.value = '';
        const preMood = document.getElementById('preMoodSlider');
        if (preMood) { preMood.value = 5; preMood.dispatchEvent(new Event('input')); }
        const postMood = document.getElementById('postMoodSlider');
        if (postMood) { postMood.value = 5; postMood.dispatchEvent(new Event('input')); }
    });
    waterMode     = new WaterMode(ctx, canvas);
    cosmosMode    = new CosmosMode(ctx, canvas);
    watercolorMode = new WatercolorMode(ctx, canvas);
    auroraMode       = new AuroraMode(ctx, canvas);
    quoteMode        = new QuoteMode(ctx, canvas);
    soundGardenMode  = new SoundGardenMode(ctx, canvas);
    videoRoomMode    = new VideoRoomMode(ctx, canvas);
    breathMode       = new BreathMode(ctx, canvas);
    distractionSystem = new DistractionSystem();
    initBgDust();

    // Style toggle
    document.getElementById('prevStyle').addEventListener('click', () => {
        currentStyle = (currentStyle - 1 + styleNames.length) % styleNames.length;
        updateStyleName();
        initAudio();
        clearCanvas();
        updateModeHint();
    });
    document.getElementById('nextStyle').addEventListener('click', () => {
        currentStyle = (currentStyle + 1) % styleNames.length;
        updateStyleName();
        initAudio();
        clearCanvas();
        updateModeHint();
    });
    updateStyleName();

    // Mouse tracking for liquid effect and cursor
    canvas.addEventListener('mousemove', (e) => {
        initAudio();
        initBlink(); // Auto-start blink detection on first interaction
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

        // Calculate actual outermost mandala radius
        // Petals are drawn in local coords: x goes from baseOffset to baseOffset+petalLength
        // so the farthest point from center is layerRadius * (baseOffset + petalLength)
        let actualRadius = 0;
        if (foldCount > 0) {
            const maxRadius = Math.min(canvas.width, canvas.height) * 0.5;
            const styleConfig = mandalaGenerator.getStyleConfig();
            const layers = Math.min(foldCount, styleConfig.maxLayers);

            if (layers > 0) {
                const layerProgress = (layers - 1) / Math.max(layers, 1);
                const layerRadius = maxRadius * (styleConfig.radiusStart + layerProgress * styleConfig.radiusRange);
                // +0.15 margin covers the time-varying wave extension in drawPetal
                actualRadius = layerRadius * (styleConfig.baseOffset + styleConfig.petalLength + 0.15);
            }
        }

        liquidEffect.setMousePosition(mouseX, mouseY, centerX, centerY, actualRadius);
        cursorSystem.setPosition(e.clientX, e.clientY);

        // Check if we're actually liquifying (cursor affecting geometry)
        const isLiquifying = liquidEffect.isLiquifying() && foldCount > 0;
        soundSystem.updateLiquifyState(isLiquifying);
    });

    canvas.addEventListener('mouseleave', () => {
        liquidEffect.setMousePosition(-1000, -1000);
        cursorSystem.setPosition(-1000, -1000);
        soundSystem.updateLiquifyState(false);
    });

    // Click to add fold
    canvas.addEventListener('click', (e) => {
        initAudio();
        addFold();
        if (cosmicSpiral && !activeMode) cosmicSpiral.onBlink();
        // Hide hint on first click
        if (hintVisible) {
            hintVisible = false;
            const hint = document.getElementById('hint');
            if (hint) hint.classList.add('hidden');
        }
    });

    // Clear button (eraser)
    document.getElementById('clearBtn').addEventListener('click', () => {
        clearCanvas();
    });

    // Blink button — tap to toggle off/on after auto-start
    const blinkBtn = document.getElementById('blinkBtn');
    blinkBtn.addEventListener('click', async () => {
        initAudio();
        if (!blinkInitialized) {
            // First tap: same as auto-start
            initBlink();
        } else if (blinkActive) {
            blinkDetector.stop();
            blinkDetector = null;
            blinkActive = false;
            blinkBtn.classList.remove('active');
            document.getElementById('blinkWrap')?.classList.remove('active');
        } else {
            await startBlinkDetection();
        }
    });

    // Set initial center
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    // Initial black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);

    // Hide default cursor
    document.body.style.cursor = 'none';

    animate();
}

function initAudio() {
    if (!audioInitialized) {
        audioInitialized = true;
        soundSystem.initializeAudio();
    }
}

function clearCanvas() {
    foldCount = 0;
    bloomRings = [];
    spiralBlobs = [];
    spiralTheta  = 0;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
    soundSystem.updateLiquifyState(false);
    // Show hint again after clearing — but not during the guided session
    if (!hintVisible && !(session && session.active)) {
        hintVisible = true;
        const hint = document.getElementById('hint');
        if (hint) hint.classList.remove('hidden');
    }
}

function addFold() {
    const maxFolds = mandalaGenerator.getStyleConfig().maxLayers;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    const clipR = Math.min(canvas.width, canvas.height) * 0.50;

    if (foldCount >= maxFolds) {
        // Mandala complete — pulse a wide completion ring, no new layer
        bloomRings.push({ r: clipR * 0.3, maxR: clipR * 0.96, alpha: 0.30, hue: (time * 22 + 180) % 360 });
        soundSystem.playFoldTone(foldCount % 9);
        return;
    }
    foldCount++;
    // Bloom: inner ring + outer ring radiating from center
    const hue = (time * 22 + foldCount * 31) % 360;
    bloomRings.push({ r: 0,            maxR: clipR * 0.92, alpha: 0.55, hue });
    bloomRings.push({ r: clipR * 0.08, maxR: clipR * 0.55, alpha: 0.30, hue: (hue + 40) % 360 });
    soundSystem.playFoldTone(foldCount - 1);
    // Capture mandala snapshot when enough layers have built
    if (foldCount === 5) _maybeCaptureSnapshot();
}

function updateModeHint() {
    // Hints are handled by pre-scene cards during session
}

// ── Per-scene haiku ───────────────────────────────────────────────────────────
const SCENE_HAIKUS = {
    stillness: 'still water reflects\nwhat the wandering mind hides —\nlook without blinking',
    depth:     'deeper than language\nthe ocean holds no questions —\nonly what is here',
    form:      'from point to pattern\nform emerges from the void —\nas thought from silence',
    woven:     "threads the eye can't trace\nweave the cloth you sit upon —\nwhich thread are you now",
    forest:    'the forest forgets\nthe name you came here with — so\nperhaps you can too',
    pixel:     'zoom out far enough\nand every face is pixels —\nzoom in: you are here',
    sound:     'silence is a sound\nthe body does not forget —\nlet it remember',
    breath:    'one breath in, one out —\nthe universe exhales you\nthen breathes you back in',
};

function _showSceneCard(sceneName) {
    const card = document.getElementById('sceneCard');
    if (!card) return;
    card.querySelector('.sceneCardName').textContent = sceneName;

    const haikuEl = card.querySelector('.sceneCardHaiku');
    if (haikuEl) {
        const h = SCENE_HAIKUS[sceneName] || '';
        haikuEl.innerHTML = h.replace(/\n/g, '<br>');
    }

    // Canvas stays black while haiku is shown
    _sceneHaikuShowing = true;

    card.classList.remove('hidden', 'fade-out');
    card.classList.add('fade-in');
    clearTimeout(_sceneCardTimer);
    _sceneCardTimer = setTimeout(() => {
        card.classList.remove('fade-in');
        card.classList.add('fade-out');
        // Scene can now reveal; spawn distraction as scene becomes visible
        _sceneHaikuShowing = false;
        if (_pendingDistractionScene && distractionSystem) {
            distractionSystem.startScene(_pendingDistractionScene);
            _pendingDistractionScene = null;
        }
        setTimeout(() => card.classList.add('hidden'), 1100);
    }, 6000); // 6s to read haiku comfortably
}
let _sceneCardTimer = null;

// ── Scene exit: simple fade-to-black (replaces zoom-shrink) ─────────────────
function _startExitAnimation(onComplete) {
    _exitActive   = true;
    _exitProgress = 0;
    _exitCallback = onComplete;
}

// ── Flame bloom: light explosion + TV collapse before scene change ────────────
function _playFlameBloom(proceed) {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    _flameBloom = {
        progress: 0,
        proceed,
        cx, cy,
        maxR: Math.hypot(cx, cy) * 1.35,
    };
}

// ── Extract scene setup so both normal and flame paths share it ───────────────
function _setupNewScene(stage) {
    sceneTransAlpha = 1.0;
    nucleusLifetime = 0;
    clearCanvas();
    if (stage.mode === null) {
        activeMode = null;
        mandalaGenerator.setStyle(stage.style || 0);
    } else {
        activeMode = stage.mode;
    }
    if (soundGardenMode) soundGardenMode._stopLoop();
    if (stage.mode === 'sound'  && soundGardenMode) soundGardenMode.startScene();
    if (stage.mode === 'breath' && breathMode)      breathMode.startScene();
    soundSystem.startModeAmbient(stage.mode || stage.name);
    // Distraction queued here; fires after haiku timer (so it doesn't appear on black screen)
    _pendingDistractionScene = stage.name;
    _showSceneCard(stage.name);
}
let _pendingDistractionScene = null;

// ── Canvas snapshot when mandala is developed enough ─────────────────────────
function _maybeCaptureSnapshot() {
    if (_experienceSnapshot) return;
    const sz = 600;
    const snap = document.createElement('canvas');
    snap.width = snap.height = sz;
    const sCtx = snap.getContext('2d');
    const src = Math.min(canvas.width, canvas.height) * 0.88;
    const ox  = (canvas.width  - src) / 2;
    const oy  = (canvas.height - src) / 2;
    sCtx.drawImage(canvas, ox, oy, src, src, 0, 0, sz, sz);
    _experienceSnapshot = snap.toDataURL('image/jpeg', 0.88);
}

// Per-scene clip shapes for the camera nucleus preview
function _drawClipPath(targetCtx, cx, cy, R, shape) {
    targetCtx.beginPath();
    switch (shape) {
        case 'circle':
            targetCtx.arc(cx, cy, R, 0, Math.PI * 2);
            break;
        case 'hexagon': {
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
                const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
                if (i === 0) targetCtx.moveTo(x, y); else targetCtx.lineTo(x, y);
            }
            targetCtx.closePath();
            break;
        }
        case 'star': {
            const inner = R * 0.46;
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? R : inner;
                const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
                if (i === 0) targetCtx.moveTo(x, y); else targetCtx.lineTo(x, y);
            }
            targetCtx.closePath();
            break;
        }
        case 'leaf': {
            targetCtx.moveTo(cx, cy - R);
            targetCtx.bezierCurveTo(cx + R*0.72, cy - R*0.35, cx + R*0.72, cy + R*0.45, cx, cy + R*0.72);
            targetCtx.bezierCurveTo(cx - R*0.72, cy + R*0.45, cx - R*0.72, cy - R*0.35, cx, cy - R);
            targetCtx.closePath();
            break;
        }
        case 'octagon': {
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
                const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
                if (i === 0) targetCtx.moveTo(x, y); else targetCtx.lineTo(x, y);
            }
            targetCtx.closePath();
            break;
        }
        case 'petal':
        default: {
            const steps = 120;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
                const r = R * Math.pow(Math.abs(Math.cos(4 * angle)), 0.7);
                const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
                if (i === 0) targetCtx.moveTo(x, y); else targetCtx.lineTo(x, y);
            }
            targetCtx.closePath();
            break;
        }
    }
}

function _getSceneClipShape() {
    if (!session || !session.active) return 'petal';
    const shapes = {
        stillness: 'petal',
        depth:     'circle',
        form:      'hexagon',
        woven:     'star',
        forest:    'leaf',
        pixel:     'octagon',
    };
    return shapes[session.getCurrentStage().name] || 'circle';
}

function _drawVideoNucleus() {
    const video = blinkDetector.video;
    const vr    = NUCLEUS_R;
    const cx    = canvas.width  / 2;
    const cy    = canvas.height / 2;
    const shape = _getSceneClipShape();

    const vw = video.videoWidth  || 320;
    const vh = video.videoHeight || 240;
    const scale = (vr * 2.2) / Math.min(vw, vh);
    const dw = vw * scale;
    const dh = vh * scale;

    // Draw video clipped to scene-specific shape
    ctx.save();
    ctx.globalAlpha = 0.90;
    ctx.translate(cx, cy);
    _drawClipPath(ctx, 0, 0, vr, shape);
    ctx.clip();
    ctx.scale(-1, 1);  // mirror for selfie feel
    ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // Soft vignette using same shape at 1.18× radius
    ctx.save();
    ctx.globalAlpha = 1.0;
    _drawClipPath(ctx, cx, cy, vr * 1.18, shape);
    ctx.clip();
    const vgrd = ctx.createRadialGradient(cx, cy, vr * 0.42, cx, cy, vr * 1.18);
    vgrd.addColorStop(0, 'rgba(0,0,0,0)');
    vgrd.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vgrd;
    ctx.fillRect(cx - vr * 1.3, cy - vr * 1.3, vr * 2.6, vr * 2.6);
    ctx.restore();
}

// ── Video intro ───────────────────────────────────────────────────────────────
let _captionInterval = null;

function _startVideoIntro() {
    const overlay   = document.getElementById('videoIntroOverlay');
    const irisEl    = document.getElementById('irisCanvas');
    const videoEl   = document.getElementById('guideVideo');
    const audioEl   = document.getElementById('guideAudio');

    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';

    // Size iris canvas to full screen
    irisEl.width  = window.innerWidth;
    irisEl.height = window.innerHeight;
    const iCtx = irisEl.getContext('2d');

    // Draw iris, then start playback
    _animateIris(iCtx, 2.0, () => {
        videoEl.play().catch(() => {});
        audioEl.play().catch(() => {});
        _runCaptions(audioEl);
    });

    // End when audio finishes (or video, whichever is shorter)
    const done = () => _finishVideoIntro();
    audioEl.addEventListener('ended', done, { once: true });
    videoEl.addEventListener('ended', done, { once: true });
}

function _finishVideoIntro() {
    clearInterval(_captionInterval);
    _captionInterval = null;

    const videoEl   = document.getElementById('guideVideo');
    const audioEl   = document.getElementById('guideAudio');
    const captEl    = document.getElementById('videoCaptions');
    const overlay   = document.getElementById('videoIntroOverlay');

    // Remove any stale ended listeners before pausing
    videoEl.pause();
    audioEl.pause();
    if (captEl) { captEl.textContent = ''; captEl.classList.remove('visible'); }

    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.opacity = '';
        _beginSession();
    }, 900);
}

function _beginSession() {
    // Reveal canvas (was hidden during intro overlays)
    canvas.classList.remove('intro-hidden');
    coinCanvas.classList.remove('intro-hidden');

    session.start();
    const firstStage = session.getCurrentStage();
    activeMode = firstStage.mode;
    if (firstStage.mode === null) mandalaGenerator.setStyle(firstStage.style || 0);

    // sceneTransAlpha will gently fade in the scene after the haiku card dismisses
    sceneTransAlpha = 1.0;

    // Distraction will start after haiku fades (via _pendingDistractionScene)
    _pendingDistractionScene = firstStage.name;
    _showSceneCard(firstStage.name);
    soundSystem.startModeAmbient(firstStage.mode || firstStage.name);
}

function _runCaptions(audioEl) {
    if (!GUIDE_CAPTIONS.length) return;
    const captEl = document.getElementById('videoCaptions');
    if (!captEl) return;
    _captionInterval = setInterval(() => {
        const t   = audioEl.currentTime;
        const cap = GUIDE_CAPTIONS.find(c => t >= c.start && t < c.end);
        if (cap && cap.text) {
            captEl.textContent = cap.text;
            captEl.classList.add('visible');
        } else {
            captEl.classList.remove('visible');
        }
    }, 80);
}

function _animateIris(iCtx, duration, onComplete) {
    const w = iCtx.canvas.width, h = iCtx.canvas.height;
    const cx = w / 2, cy = h / 2;
    // Radius large enough to clear all screen corners
    const maxR = Math.hypot(cx, cy) * 1.28;
    let startTs = null;

    function frame(ts) {
        if (!startTs) startTs = ts;
        const t      = Math.min(1, (ts - startTs) / (duration * 1000));
        const eased  = 1 - Math.pow(1 - t, 3);   // ease-out cubic
        const R      = maxR * eased;

        // Black mask fill
        iCtx.globalCompositeOperation = 'source-over';
        iCtx.fillStyle = '#000';
        iCtx.fillRect(0, 0, w, h);

        if (R > 1) {
            // Cut petal-shaped hole — video shows through
            _drawClipPath(iCtx, cx, cy, R, 'petal');
            iCtx.globalCompositeOperation = 'destination-out';
            iCtx.fillStyle = '#fff';
            iCtx.fill();

            // Decorative golden ring at iris edge
            iCtx.globalCompositeOperation = 'source-over';
            const ringA = 0.6 * (1 - eased);
            iCtx.strokeStyle = `rgba(220, 185, 100, ${ringA})`;
            iCtx.lineWidth   = 1.8;
            _drawClipPath(iCtx, cx, cy, R, 'petal');
            iCtx.stroke();
        }

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            iCtx.clearRect(0, 0, w, h);   // fully open — remove overlay
            if (onComplete) onComplete();
        }
    }
    requestAnimationFrame(frame);
}
// ─────────────────────────────────────────────────────────────────────────────

function initBlink() {
    if (blinkInitialized) return;
    blinkInitialized = true;
    startBlinkDetection();
}

async function startBlinkDetection() {
    const blinkBtn = document.getElementById('blinkBtn');
    const eyeSVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    blinkBtn.innerHTML = '…';
    blinkBtn.style.pointerEvents = 'none';
    try {
        blinkDetector = new BlinkDetector(
            // onBlink
            () => {
                if (activeMode === 'sound') {
                    soundGardenMode.onBlink();
                } else if (activeMode === 'breath') {
                    breathMode.onBlink();
                } else {
                    addFold();
                    if (cosmicSpiral) cosmicSpiral.onBlink();
                }
                if (hintVisible) {
                    hintVisible = false;
                    const hint = document.getElementById('hint');
                    if (hint) hint.classList.add('hidden');
                }
                blinkBtn.classList.remove('pulse');
                void blinkBtn.offsetWidth;
                blinkBtn.classList.add('pulse');
            },
            // onGaze — routes to session centre tracker + head-shake detection
            (normX, normY) => {
                if (session && session.active) session.onGaze(normX, normY);
                _updateGazeX(normX);
            }
        );
        await blinkDetector.start();
        blinkActive = true;
        blinkBtn.innerHTML = eyeSVG;
        blinkBtn.classList.add('active');
        document.getElementById('blinkWrap')?.classList.add('active');
        // Show video nucleus once camera is live
        videoNucleusAlpha   = 1.0;
        videoNucleusVisible = true;
    } catch (err) {
        console.log('Blink detection failed:', err);
        blinkBtn.innerHTML = eyeSVG;
    }
    blinkBtn.style.pointerEvents = '';
}

function updateStyleName() {
    document.getElementById('styleName').textContent = styleNames[currentStyle];
    if      (currentStyle === 6)  { activeMode = 'water'; }
    else if (currentStyle === 7)  { activeMode = 'cosmos'; }
    else if (currentStyle === 8)  { activeMode = 'watercolor'; initHandTracking(); }
    else if (currentStyle === 9)  { activeMode = 'aurora'; }
    else if (currentStyle === 10) { activeMode = 'quotes'; }
    else if (currentStyle === 11) { activeMode = 'garden'; }
    else {
        activeMode = null;
        mandalaGenerator.setStyle(currentStyle);
    }
    // Route mode-specific ambient sound
    if (audioInitialized) {
        soundSystem.startModeAmbient(activeMode || 'mandala');
    }
}

function initHandTracking() {
    if (handInitialized) return;
    handInitialized = true;
    startHandTracking();
}

async function startHandTracking() {
    try {
        handTracker = new HandTracker(
            // onHandMove
            (normX, normY) => {
                if (activeMode === 'watercolor') watercolorMode.onHandMove(normX, normY);
            },
            // onPinch
            (label, normX, normY) => {
                if (activeMode === 'watercolor') watercolorMode.onPinch(label, normX, normY);
            }
        );
        await handTracker.start();
    } catch (err) {
        console.log('Hand tracking failed:', err);
        handTracker = null;
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    coinCanvas.width = window.innerWidth;
    coinCanvas.height = window.innerHeight;

    if (coinSystem) coinSystem.resize();
    if (liquidEffect) liquidEffect.resize();
    if (cursorSystem && typeof cursorSystem.resize === 'function') cursorSystem.resize();
    if (waterMode) waterMode.resize();
    if (cosmosMode) cosmosMode.resize();
    if (watercolorMode) watercolorMode.resize();
    if (auroraMode) auroraMode.resize();
    if (quoteMode) quoteMode.resize();
    if (soundGardenMode) soundGardenMode.resize();
    if (videoRoomMode)   videoRoomMode.resize();
    if (breathMode)      breathMode.resize();
    if (cosmicSpiral)    cosmicSpiral.resize();

    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
}

// ── Head-shake detection: sustained far-left/right gaze → prev/next scene ─────
function _updateGazeX(normX) {
    if (!session || !session.active) return;
    const now = performance.now();
    const dt  = _gazeXLastTime ? Math.min(0.12, (now - _gazeXLastTime) / 1000) : 0;
    _gazeXLastTime = now;
    if (normX < 0.28) {
        _gazeLeft  += dt;
        _gazeRight  = 0;
        if (_gazeLeft >= 1.8) { _gazeLeft = 0; session._prevStage(); }
    } else if (normX > 0.72) {
        _gazeRight += dt;
        _gazeLeft   = 0;
        if (_gazeRight >= 1.8) { _gazeRight = 0; session._nextStage(); }
    } else {
        _gazeLeft  = Math.max(0, _gazeLeft  - dt * 2);
        _gazeRight = Math.max(0, _gazeRight - dt * 2);
    }
}

// ── Scene 1: spiral + paint blobs ─────────────────────────────────────────────
function _addStillnessBlobs() {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const hues = [20, 45, 60, 90, 150, 195, 230, 270, 310, 340];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const hue   = hues[Math.floor(Math.random() * hues.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist  = Math.random() * Math.min(canvas.width, canvas.height) * 0.30;
        spiralBlobs.push({
            x:       cx + Math.cos(angle) * dist,
            y:       cy + Math.sin(angle) * dist,
            hue,
            r:       0,
            targetR: 55 + Math.random() * 90,
            alpha:   0.25 + Math.random() * 0.20,
            speed:   0.7 + Math.random() * 0.7,
        });
    }
}

function _drawStillnessSpiral(cx, cy) {
    const maxTheta  = 14 * Math.PI;   // 7 turns when full
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.42;
    const b = maxRadius / maxTheta;

    spiralTheta = Math.min(maxTheta, spiralTheta + 0.010);
    if (spiralTheta < 0.05) return;

    const steps = Math.max(60, Math.floor(spiralTheta * 28));

    ctx.save();
    ctx.lineWidth = 0.9;
    ctx.lineCap   = 'round';

    for (let seg = 0; seg < steps - 1; seg++) {
        const t0 = (seg / steps) * spiralTheta;
        const t1 = ((seg + 1) / steps) * spiralTheta;
        const r0 = b * t0, r1 = b * t1;
        const x0 = cx + Math.cos(t0) * r0, y0 = cy + Math.sin(t0) * r0;
        const x1 = cx + Math.cos(t1) * r1, y1 = cy + Math.sin(t1) * r1;

        const hue   = ((t0 / maxTheta) * 280 + time * 6) % 360;
        const alpha = 0.10 + 0.07 * Math.sin(time * 1.1 + t0 * 0.4);

        ctx.strokeStyle = `hsla(${hue}, 60%, 76%, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    // Glowing growing tip
    const tipR = b * spiralTheta;
    const tipX = cx + Math.cos(spiralTheta) * tipR;
    const tipY = cy + Math.sin(spiralTheta) * tipR;
    const tipHue = ((spiralTheta / maxTheta) * 280 + time * 6) % 360;
    const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 9);
    glow.addColorStop(0,   `hsla(${tipHue}, 85%, 92%, 0.55)`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function _drawStillnessScene() {
    // Soft background fade — slower than mandala mode
    ctx.fillStyle = 'rgba(2, 3, 14, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;

    // Calligraphic Archimedean spiral (clean — no colour blobs over the face)
    _drawStillnessSpiral(cx, cy);
}

// ─────────────────────────────────────────────────────────────────────────────

function animate() {
    // Always re-queue first so a mid-frame error never kills the loop
    requestAnimationFrame(animate);

    try {
    time += 0.016;

    // ── Flame bloom transition (candle dragged to centre) ─────────────────────
    if (_flameBloom) {
        const fb = _flameBloom;
        fb.progress = Math.min(1, fb.progress + 0.016 / 2.8);
        const p = fb.progress;
        const { cx, cy, maxR } = fb;

        if (p < 0.50) {
            // Phase 1: golden-white light expands from centre
            const ep  = p / 0.50;
            const eR  = maxR * Math.pow(ep, 0.6);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, eR);
            grd.addColorStop(0,   `rgba(255,255,240,${0.92 * ep})`);
            grd.addColorStop(0.25,`rgba(255,230,140,${0.75 * ep})`);
            grd.addColorStop(0.60,`rgba(255,160, 40,${0.38 * ep})`);
            grd.addColorStop(1,   'rgba(0,0,0,0)');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Radiating rays
            const rays = 18, brightness = ep * 0.22;
            ctx.save();
            ctx.translate(cx, cy);
            for (let i = 0; i < rays; i++) {
                const a = (i / rays) * Math.PI * 2 + time * 0.18;
                const rLen = eR * (0.7 + 0.3 * Math.sin(time * 2 + i));
                const g2 = ctx.createLinearGradient(0,0,Math.cos(a)*rLen,Math.sin(a)*rLen);
                g2.addColorStop(0, `rgba(255,245,200,${brightness})`);
                g2.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.strokeStyle = g2; ctx.lineWidth = 1.8;
                ctx.beginPath(); ctx.moveTo(0,0);
                ctx.lineTo(Math.cos(a)*rLen, Math.sin(a)*rLen);
                ctx.stroke();
            }
            ctx.restore();
        } else if (p < 0.70) {
            // Phase 2: peak brightness — full white glow
            const ep = (p - 0.50) / 0.20;
            const alpha = 0.92 + ep * 0.08;
            ctx.fillStyle = `rgba(255,252,240,${Math.min(1, alpha)})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            // Phase 3: TV collapse — squish to horizontal line then vanish
            const ep = (p - 0.70) / 0.30; // 0→1
            const ease = Math.pow(ep, 1.8);
            const scaleY = Math.max(0, 1 - ease);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (scaleY > 0.002) {
                const lineH = Math.max(2, canvas.height * scaleY);
                const brightness2 = 1 - Math.pow(ep, 0.5);
                ctx.save();
                ctx.translate(cx, cy);
                const lg = ctx.createLinearGradient(-cx, 0, cx, 0);
                lg.addColorStop(0,   'rgba(0,0,0,0)');
                lg.addColorStop(0.25,`rgba(255,240,200,${brightness2 * 0.7})`);
                lg.addColorStop(0.5, `rgba(255,255,255,${brightness2})`);
                lg.addColorStop(0.75,`rgba(255,240,200,${brightness2 * 0.7})`);
                lg.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = lg;
                ctx.fillRect(-cx, -lineH / 2, canvas.width, lineH);
                ctx.restore();
            }
        }

        coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
        if (fb.progress >= 1) {
            _flameBloom = null;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            fb.proceed(); // → session._nextStage() → onStageChange → _setupNewScene
        }
        return;
    }

    // ── Scene exit: fade to black ─────────────────────────────────────────────
    if (_exitActive) {
        _exitProgress = Math.min(1, _exitProgress + 0.016 / 0.85);
        if (_exitProgress >= 1) {
            _exitActive = false;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (_exitCallback) { _exitCallback(); _exitCallback = null; }
        }
        // Overlay fades in on top of current scene
        coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
        coinCtx.fillStyle = `rgba(2, 3, 14, ${_exitProgress})`;
        coinCtx.fillRect(0, 0, coinCanvas.width, coinCanvas.height);
        return;
    }

    // ── Haiku hold: canvas stays black while scene card is showing ────────────
    if (_sceneHaikuShowing) {
        coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
        coinCtx.fillStyle = 'rgba(2, 3, 14, 1)';
        coinCtx.fillRect(0, 0, coinCanvas.width, coinCanvas.height);
        return;
    }

    // ── Session tick ─────────────────────────────────────────────────────────
    if (session && session.active) {
        session.update(performance.now(), mouseX, mouseY);
        const flameOn = session.isFlameActive();
        document.body.classList.toggle('flame-cursor', flameOn);
        cursorSystem.setAlpha(1.0);
    } else {
        document.body.classList.remove('flame-cursor');
        cursorSystem.setAlpha(1.0);
        if (distractionSystem && distractionSystem.active) distractionSystem.stop();
    }

    // Distraction sprites drift + fade each frame
    if (distractionSystem) distractionSystem.update(0.016);

    // Camera preview — face always rendered FIRST (behind all patterns)
    const showNucleus = blinkActive;
    const videoReady  = showNucleus && blinkDetector?.video?.readyState >= 2;

    if (activeMode === 'sound') {
        // Face first, sound garden on top
        if (videoReady) _drawVideoNucleus();
        soundGardenMode.setCursor(mouseX, mouseY);
        soundGardenMode.draw(time);
    } else if (activeMode === 'video') {
        videoRoomMode.draw(time);
    } else if (activeMode === 'breath') {
        // Face first, breath mode on top
        if (videoReady) _drawVideoNucleus();
        breathMode.draw(time);
    } else {
        const isStillness = session && session.active && session.stageIndex === 0;
        const clipR       = Math.min(canvas.width, canvas.height) * 0.50;

        if (isStillness) {
            // Face first, spiral on top
            if (videoReady) _drawVideoNucleus();
            _drawStillnessScene();
        } else {
            const isCurrentlyWarping = liquidEffect.isLiquifying() && foldCount > 0;
            const fadeAlpha = isCurrentlyWarping ? 0.018 : 0.05;
            ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Face FIRST — mandala accumulates on top
            if (videoReady) _drawVideoNucleus();

            if (foldCount > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, clipR, 0, Math.PI * 2);
                ctx.clip();
                const styleArg = (session && session.active) ? null : currentStyle;
                mandalaGenerator.nucleusAlpha = 1.0;
                mandalaGenerator.drawMandala(centerX, centerY, foldCount, time, styleArg, liquidEffect);
                ctx.restore();

                const vig = ctx.createRadialGradient(centerX, centerY, clipR * 0.62, centerX, centerY, clipR);
                vig.addColorStop(0, 'rgba(0,0,0,0)');
                vig.addColorStop(1, 'rgba(0,0,0,0.78)');
                ctx.fillStyle = vig;
                ctx.beginPath();
                ctx.arc(centerX, centerY, clipR, 0, Math.PI * 2);
                ctx.fill();
            } else if (videoReady) {
                _drawVideoNucleus(); // refresh face when no mandala yet
            }
        }
    }

    // Always clear overlay canvas every frame (no cursor trail)
    coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
    if (activeMode || (session && session.active)) {
        drawBgDust();
    }

    // Cosmos sparkles drawn on overlay (no permanent residue on main canvas)
    if (activeMode === 'cosmos') {
        cosmosMode.drawOverlay(coinCtx);
    }

    // Update and draw coins (only in mandala mode)
    if (!activeMode) {
        coinSystem.update(time);
        coinSystem.draw();
    }

    // ── Mandala overlay: bloom rings + breathing boundary + layer dots ───
    if (!activeMode && foldCount > 0) {
        const clipR  = Math.min(canvas.width, canvas.height) * 0.50;
        const breath = 1.0 + 0.006 * Math.sin(time * 0.55);  // ~11s breathing cycle

        // Breathing sacred-circle boundary
        coinCtx.save();
        coinCtx.beginPath();
        coinCtx.arc(centerX, centerY, clipR * breath, 0, Math.PI * 2);
        const glowA = 0.035 + 0.018 * Math.sin(time * 0.55);
        coinCtx.strokeStyle = `rgba(130, 170, 255, ${glowA})`;
        coinCtx.lineWidth = 0.8;
        coinCtx.stroke();
        coinCtx.restore();

        // Bloom rings (blink / click feedback)
        for (let i = bloomRings.length - 1; i >= 0; i--) {
            const ring = bloomRings[i];
            ring.r    += (ring.maxR - ring.r) * 0.048;
            ring.alpha -= 0.010;
            if (ring.alpha <= 0) { bloomRings.splice(i, 1); continue; }
            coinCtx.save();
            coinCtx.beginPath();
            coinCtx.arc(centerX, centerY, ring.r, 0, Math.PI * 2);
            coinCtx.strokeStyle = `hsla(${ring.hue}, 65%, 78%, ${ring.alpha})`;
            coinCtx.lineWidth = 1.2;
            coinCtx.stroke();
            coinCtx.restore();
        }

        // Layer progress dots — arc of small dots at boundary edge
        const maxFolds   = mandalaGenerator.getStyleConfig().maxLayers;
        const dotRadius  = clipR + 16;
        const startAngle = -Math.PI / 2;
        for (let i = 0; i < maxFolds; i++) {
            const ang    = startAngle + (i / maxFolds) * Math.PI * 2;
            const x      = centerX + Math.cos(ang) * dotRadius;
            const y      = centerY + Math.sin(ang) * dotRadius;
            const filled = i < foldCount;
            const isLast = i === foldCount - 1;
            coinCtx.beginPath();
            coinCtx.arc(x, y, isLast ? 2.8 : 1.8, 0, Math.PI * 2);
            coinCtx.fillStyle = filled
                ? (isLast ? `rgba(180, 215, 255, 0.75)` : `rgba(110, 155, 220, 0.40)`)
                : `rgba(45,  70,  110, 0.15)`;
            coinCtx.fill();
        }
    }

    // Hand cursor for watercolor mode — drawn on coinCtx (cleared each frame)
    if (activeMode === 'watercolor') {
        coinCtx.clearRect(0, 0, coinCanvas.width, coinCanvas.height);
        if (watercolorMode.handX !== null) {
            const hx = watercolorMode.handX;
            const hy = watercolorMode.handY;
            coinCtx.save();
            const ca = 0.18 + 0.08 * Math.sin(time * 3);
            coinCtx.strokeStyle = `rgba(255, 255, 255, ${ca})`;
            coinCtx.lineWidth = 0.8;
            coinCtx.beginPath();
            coinCtx.moveTo(hx - 14, hy); coinCtx.lineTo(hx + 14, hy);
            coinCtx.moveTo(hx, hy - 14); coinCtx.lineTo(hx, hy + 14);
            coinCtx.stroke();
            // Small circle around crosshair
            coinCtx.beginPath();
            coinCtx.arc(hx, hy, 10, 0, Math.PI * 2);
            coinCtx.stroke();
            coinCtx.restore();
        }
    }

    // Eye cursor — hidden when flame takes over
    if (!session || !session.isFlameActive()) {
        cursorSystem.draw();
    }

    // ── Countdown arc around cursor + fixed bottom-bar timer ─────────────────
    if (session && session.active && !activeMode && !session.isFlameActive()) {
        const elapsed   = session.stageElapsed;
        const total     = session.FLAME_APPEAR_TIME;
        const remaining = Math.max(0, 1 - elapsed / total);

        // Arc around cursor
        const cx = cursorSystem.x, cy = cursorSystem.y;
        if (cx > -100 && remaining > 0) {
            coinCtx.save();
            coinCtx.strokeStyle = `rgba(190, 200, 248, ${0.55 * remaining + 0.12})`;
            coinCtx.lineWidth   = 1.1;
            coinCtx.lineCap     = 'round';
            coinCtx.beginPath();
            coinCtx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
            coinCtx.stroke();
            coinCtx.restore();
        }

        // Thin progress line at very bottom of screen
        const bw = coinCanvas.width, bh = coinCanvas.height;
        const lineW = bw * remaining;
        coinCtx.save();
        coinCtx.strokeStyle = `rgba(160, 172, 230, ${0.22 * remaining + 0.06})`;
        coinCtx.lineWidth   = 1;
        coinCtx.beginPath();
        coinCtx.moveTo(0, bh - 2);
        coinCtx.lineTo(lineW, bh - 2);
        coinCtx.stroke();
        coinCtx.restore();
    }

    // ── Session overlays: coin glints (scene 1 only) + flame cursor ─────────
    if (session && session.active) {
        if (session.isFlameActive()) {
            session.drawFlameCursor(coinCtx, mouseX, mouseY, time);
        } else if (session.stageIndex === 0) {
            // Coin glints only in the first scene — that's the coin cursor experience
            if (cursorSystem && cursorSystem.x > 0) {
                session.drawCoinGlints(coinCtx, cursorSystem.x, cursorSystem.y, time);
            }
        }
    }

    // ── Scene 1 text overlays ────────────────────────────────────────────────
    if (session && session.active && session.stageIndex === 0) {
        const el = session.stageElapsed;

        // "are you getting bored" — fades in 15→17s, holds 17→28s, fades out 28→32s
        let boredA = 0;
        if (el >= 15 && el < 32) {
            if      (el < 17) boredA = (el - 15) / 2;
            else if (el < 28) boredA = 1.0;
            else              boredA = 1 - (el - 28) / 4;
        }
        boredA = Math.max(0, Math.min(1, boredA)) * 0.42;
        if (boredA > 0.01) {
            coinCtx.save();
            coinCtx.font          = '200 12px Helvetica Neue, Helvetica, Arial, sans-serif';
            coinCtx.textAlign     = 'center';
            coinCtx.letterSpacing = '0.30em';
            coinCtx.fillStyle     = `rgba(180, 175, 210, ${boredA})`;
            coinCtx.fillText('are you getting bored', canvas.width / 2, canvas.height - 52);
            coinCtx.restore();
        }

        // "drag to centre" — appears when flame is visible (scene 1 only)
        if (session.tipAlpha > 0.01) {
            coinCtx.save();
            coinCtx.font          = '200 12px Helvetica Neue, Helvetica, Arial, sans-serif';
            coinCtx.textAlign     = 'center';
            coinCtx.letterSpacing = '0.30em';
            coinCtx.fillStyle     = `rgba(220, 200, 160, ${session.tipAlpha * 0.55})`;
            coinCtx.fillText('drag to centre', canvas.width / 2, canvas.height - 34);
            coinCtx.restore();
        }
    }

    // ── Scene fade-in overlay (fades away after haiku, revealing the scene) ────
    if (sceneTransAlpha > 0 && !_sceneHaikuShowing) {
        sceneTransAlpha = Math.max(0, sceneTransAlpha - 0.018);
        coinCtx.fillStyle = `rgba(2, 3, 14, ${sceneTransAlpha})`;
        coinCtx.fillRect(0, 0, coinCanvas.width, coinCanvas.height);
    }

    } catch (err) { console.warn('animate error:', err); }
}

// Start when page loads
window.addEventListener('DOMContentLoaded', init);
