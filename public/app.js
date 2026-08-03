// ------------------------------------------------------------------------------
// app.js
// Client-side logic for the Game Thumbs URL builder.
// Mirrors the unified v2 API: each image type (thumb/cover/logo) supports a
// league, single-team, or matchup subject with its own set of query params.
// ------------------------------------------------------------------------------

(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);

    const previewImg = $('previewImg');
    const previewStatus = $('previewStatus');
    const previewStatusText = $('previewStatusText');
    const typeSelector = $('typeSelector');
    const subjectSelector = $('subjectSelector');
    const leagueSelect = $('leagueSelect');
    const team1Input = $('team1Input');
    const team2Input = $('team2Input');
    const team1Label = $('team1Label');
    const styleSelect = $('styleSelect');
    const styleDescription = $('styleDescription');
    const aspectSelect = $('aspectSelect');
    const logoToggle = $('logoToggle');
    const styledCardToggle = $('styledCardToggle');
    const variantSelect = $('variantSelect');
    const sizeSelect = $('sizeSelect');
    const trimToggle = $('trimToggle');
    const useLightToggle = $('useLightToggle');
    const badgeSelect = $('badgeSelect');
    const winnerInput = $('winnerInput');
    const fallbackToggle = $('fallbackToggle');
    const extToggle = $('extToggle');
    const urlText = $('urlText');
    const copyBtn = $('copyBtn');
    const openLink = $('openLink');

    // Matchup style options per image type (matches the API docs)
    const STYLE_OPTIONS = {
        thumb: [
            [1, 'Diagonal split with team colors'],
            [2, 'Gradient blend between team colors'],
            [3, 'Minimalist badge (light background)'],
            [4, 'Minimalist badge (dark background)'],
            [5, 'Grid background'],
            [6, 'Grid with team colors'],
            [98, '3D embossed with league logo'],
            [99, '3D embossed']
        ],
        cover: [
            [1, 'Horizontal split with team colors'],
            [2, 'Gradient blend between team colors'],
            [3, 'Minimalist badge (light background)'],
            [4, 'Minimalist badge (dark background)'],
            [5, 'Grid background'],
            [6, 'Grid with team colors'],
            [98, '3D embossed with league logo'],
            [99, '3D embossed']
        ],
        logo: [
            [1, 'Compact diagonal split'],
            [2, 'Side by side'],
            [3, 'Circle badges with team colors'],
            [4, 'Square badges with team colors'],
            [5, 'Circle badges, league logo on left'],
            [6, 'Square badges, league logo on left']
        ]
    };

    const ASPECT_OPTIONS = {
        thumb: [
            ['4-3', '4:3 — 1440×1080 (default)'],
            ['16-9', '16:9 — 1920×1080'],
            ['1-1', '1:1 — 1080×1080']
        ],
        cover: [
            ['3-4', '3:4 — 1080×1440 (default)'],
            ['9-16', '9:16 — 1080×1920'],
            ['1-1', '1:1 — 1080×1080']
        ]
    };

    const DEFAULT_ASPECT = { thumb: '4-3', cover: '3-4' };

    // Logo matchup styles 1, 5, and 6 include the league logo by default
    const logoDefaultOn = (style) => style === 1 || style === 5 || style === 6;

    const state = {
        type: 'thumb',
        subject: 'matchup',
        league: 'nba',
        team1: 'lakers',
        team2: 'celtics',
        style: 1,
        aspect: '4-3',
        showLogo: true,
        styledCard: false,
        variant: 'light',
        size: 'default',
        trim: true,
        useLight: false,
        badge: '',
        winner: '',
        fallback: false,
        pngExt: false
    };

    // ------------------------------------------------------------------------------
    // League dropdown

    function populateLeagues(leagues) {
        const isNcaa = (l) => l.name.startsWith('NCAA') || l.code.startsWith('ncaa');
        const byName = (a, b) => a.name.localeCompare(b.name);
        const pro = leagues.filter((l) => !isNcaa(l)).sort(byName);
        const ncaa = leagues.filter(isNcaa).sort(byName);

        leagueSelect.innerHTML = '';
        const addGroup = (label, items) => {
            if (!items.length) return;
            const group = document.createElement('optgroup');
            group.label = label;
            for (const l of items) {
                const opt = document.createElement('option');
                opt.value = l.code;
                opt.textContent = l.name + (l.shortName ? ' (' + l.shortName.toUpperCase() + ')' : '');
                group.appendChild(opt);
            }
            leagueSelect.appendChild(group);
        };
        addGroup('Professional & International', pro);
        addGroup('College (NCAA)', ncaa);
        leagueSelect.value = state.league;
        if (!leagueSelect.value && leagues.length) {
            state.league = leagues[0].code;
            leagueSelect.value = state.league;
        }
    }

    fetch('/leagues')
        .then((r) => r.json())
        .then(populateLeagues)
        .catch(() => {
            // Fallback if the endpoint is unreachable
            populateLeagues([
                { code: 'nba', shortName: 'NBA', name: 'National Basketball Association' },
                { code: 'nfl', shortName: 'NFL', name: 'National Football League' },
                { code: 'mlb', shortName: 'MLB', name: 'Major League Baseball' },
                { code: 'nhl', shortName: 'NHL', name: 'National Hockey League' }
            ]);
        })
        .finally(update);

    // ------------------------------------------------------------------------------
    // URL building — only non-default params are included

    function buildPath() {
        const ext = state.pngExt ? '.png' : '';
        const league = encodeURIComponent(state.league);
        const team1 = encodeURIComponent(state.team1.trim());
        const team2 = encodeURIComponent(state.team2.trim());

        let path = '/' + league;
        if (state.subject === 'team') path += '/' + team1;
        if (state.subject === 'matchup') path += '/' + team1 + '/' + team2;
        path += '/' + state.type + ext;

        const params = new URLSearchParams();
        const isMatchup = state.subject === 'matchup';

        if (state.type === 'thumb' || state.type === 'cover') {
            if (state.aspect !== DEFAULT_ASPECT[state.type]) params.set('aspect', state.aspect);
            if (isMatchup) {
                if (state.style !== 1) params.set('style', state.style);
                if (!state.showLogo) params.set('logo', 'false');
            }
        } else {
            // logo
            if (isMatchup) {
                if (state.style !== 1) params.set('style', state.style);
                if (state.showLogo !== logoDefaultOn(state.style)) {
                    params.set('logo', state.showLogo ? 'true' : 'false');
                }
                if (state.size !== 'default') params.set('size', state.size);
                if (!state.trim) params.set('trim', 'false');
                if (state.useLight) params.set('useLight', 'true');
            } else if (state.styledCard) {
                // League/team logo rendered as a generated color card
                params.set('style', '1');
                if (state.size !== 'default') params.set('size', state.size);
                if (!state.trim) params.set('trim', 'false');
            } else if (state.variant === 'dark') {
                params.set('variant', 'dark');
            }
        }

        if (isMatchup && state.winner.trim()) params.set('winner', state.winner.trim());
        if (state.subject !== 'league' && state.fallback) params.set('fallback', 'true');
        if (state.badge) params.set('badge', state.badge);

        const query = params.toString();
        return query ? path + '?' + query : path;
    }

    function isReady() {
        if (state.subject === 'league') return true;
        if (state.subject === 'team') return state.team1.trim().length > 0;
        return state.team1.trim().length > 0 && state.team2.trim().length > 0;
    }

    // ------------------------------------------------------------------------------
    // Preview loading (debounced; keeps the old image until the new one is ready)

    let debounceTimer = null;
    let loadToken = 0;

    function schedulePreview(path) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadPreview(path), 500);
    }

    function loadPreview(path) {
        const token = ++loadToken;
        previewStatus.classList.remove('error');
        previewStatus.classList.add('visible');
        previewStatusText.textContent = 'Generating…';

        const img = new Image();
        img.onload = () => {
            if (token !== loadToken) return;
            previewImg.src = img.src;
            previewImg.classList.add('visible');
            previewStatus.classList.remove('visible');
        };
        img.onerror = () => {
            if (token !== loadToken) return;
            previewStatus.classList.add('visible', 'error');
            previewStatusText.textContent = 'Could not generate image — check the league and team names.';
        };
        img.src = path;
    }

    // ------------------------------------------------------------------------------
    // UI sync

    function syncStyleOptions() {
        const options = STYLE_OPTIONS[state.type];
        styleSelect.innerHTML = '';
        for (const [value, label] of options) {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = value + ' — ' + label;
            styleSelect.appendChild(opt);
        }
        if (!options.some(([value]) => value === state.style)) {
            state.style = 1;
        }
        styleSelect.value = state.style;

        const selected = options.find(([value]) => value === state.style);
        styleDescription.textContent = selected ? selected[1] : '';
    }

    function syncAspectOptions() {
        const options = ASPECT_OPTIONS[state.type];
        if (!options) return;
        aspectSelect.innerHTML = '';
        for (const [value, label] of options) {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            aspectSelect.appendChild(opt);
        }
        if (!options.some(([value]) => value === state.aspect)) {
            state.aspect = DEFAULT_ASPECT[state.type];
        }
        aspectSelect.value = state.aspect;
    }

    function syncVisibility() {
        const isMatchup = state.subject === 'matchup';
        const isThumbCover = state.type === 'thumb' || state.type === 'cover';
        const isLogo = state.type === 'logo';
        const rawLogoMode = isLogo && !isMatchup && !state.styledCard;

        const show = {
            team1: state.subject !== 'league',
            team2: isMatchup,
            style: isMatchup,
            aspect: isThumbCover,
            logo: isMatchup, // league logo toggle is matchup-only
            styledCard: isLogo && !isMatchup,
            variant: rawLogoMode,
            size: isLogo && (isMatchup || state.styledCard),
            trim: isLogo && (isMatchup || state.styledCard),
            useLight: isLogo && isMatchup,
            winner: isMatchup,
            fallback: state.subject !== 'league'
        };

        $('team1Card').classList.toggle('hidden', !show.team1);
        $('team2Card').classList.toggle('hidden', !show.team2);
        $('styleCard').classList.toggle('hidden', !show.style);
        $('aspectCard').classList.toggle('hidden', !show.aspect);
        $('logoCard').classList.toggle('hidden', !show.logo);
        $('styledCardCard').classList.toggle('hidden', !show.styledCard);
        $('variantCard').classList.toggle('hidden', !show.variant);
        $('sizeCard').classList.toggle('hidden', !show.size);
        $('trimCard').classList.toggle('hidden', !show.trim);
        $('useLightCard').classList.toggle('hidden', !show.useLight);
        $('winnerCard').classList.toggle('hidden', !show.winner);
        $('fallbackCard').classList.toggle('hidden', !show.fallback);

        team1Label.textContent = state.subject === 'team' ? 'Team' : 'Team 1';
    }

    function update() {
        syncStyleOptions();
        syncAspectOptions();
        syncVisibility();

        const path = buildPath();
        const fullUrl = window.location.origin + path;
        urlText.textContent = fullUrl;
        openLink.href = path;

        if (isReady()) {
            schedulePreview(path);
        } else {
            loadToken++;
            clearTimeout(debounceTimer);
            previewImg.classList.remove('visible');
            previewStatus.classList.add('visible', 'error');
            previewStatusText.textContent = 'Enter team name(s) to generate a preview.';
        }
    }

    // ------------------------------------------------------------------------------
    // Event wiring

    function wireSegmented(container, dataKey, onChange) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg-btn');
            if (!btn) return;
            for (const b of container.querySelectorAll('.seg-btn')) {
                b.classList.toggle('active', b === btn);
            }
            onChange(btn.dataset[dataKey]);
            update();
        });
    }

    wireSegmented(typeSelector, 'type', (value) => {
        state.type = value;
        state.aspect = DEFAULT_ASPECT[value] || state.aspect;
        // Clamp the style to the new type's list, then reset the league-logo
        // toggle to that style's default
        if (!STYLE_OPTIONS[value].some(([v]) => v === state.style)) {
            state.style = 1;
        }
        state.showLogo = value === 'logo' ? logoDefaultOn(state.style) : true;
        logoToggle.checked = state.showLogo;
    });

    wireSegmented(subjectSelector, 'subject', (value) => {
        state.subject = value;
    });

    leagueSelect.addEventListener('change', () => { state.league = leagueSelect.value; update(); });
    team1Input.addEventListener('input', () => { state.team1 = team1Input.value; update(); });
    team2Input.addEventListener('input', () => { state.team2 = team2Input.value; update(); });
    styleSelect.addEventListener('change', () => {
        state.style = parseInt(styleSelect.value, 10);
        if (state.type === 'logo') {
            state.showLogo = logoDefaultOn(state.style);
            logoToggle.checked = state.showLogo;
        }
        update();
    });
    aspectSelect.addEventListener('change', () => { state.aspect = aspectSelect.value; update(); });
    logoToggle.addEventListener('change', () => { state.showLogo = logoToggle.checked; update(); });
    styledCardToggle.addEventListener('change', () => { state.styledCard = styledCardToggle.checked; update(); });
    variantSelect.addEventListener('change', () => { state.variant = variantSelect.value; update(); });
    sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; update(); });
    trimToggle.addEventListener('change', () => { state.trim = trimToggle.checked; update(); });
    useLightToggle.addEventListener('change', () => { state.useLight = useLightToggle.checked; update(); });
    badgeSelect.addEventListener('change', () => { state.badge = badgeSelect.value; update(); });
    winnerInput.addEventListener('input', () => { state.winner = winnerInput.value; update(); });
    fallbackToggle.addEventListener('change', () => { state.fallback = fallbackToggle.checked; update(); });
    extToggle.addEventListener('change', () => { state.pngExt = extToggle.checked; update(); });

    copyBtn.addEventListener('click', () => {
        const url = urlText.textContent;
        const done = () => {
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'Copy URL';
                copyBtn.classList.remove('copied');
            }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
        } else {
            fallbackCopy(url, done);
        }
    });

    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            done();
        } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    update();
})();
