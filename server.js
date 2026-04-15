// Journey server — proxies Anthropic API, serves static files,
// and provides collective consciousness + analytics endpoints
// ────────────────────────────────────────────────────────────────
// Usage:
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node server.js
//
// Then open http://localhost:3000/complete.html (full experience)
//            http://localhost:3000/journey.html  (AI journey)

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT    = 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const WORDS_FILE    = path.join(DATA_DIR, 'words.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// ── Data helpers ───────────────────────────────────────────────
function readJSON(file, defaults) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { /* fall through */ }
    return defaults;
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', c => raw += c);
        req.on('end', () => {
            try { resolve(JSON.parse(raw)); }
            catch (e) { resolve({}); }
        });
        req.on('error', reject);
    });
}

// ── Anthropic API proxy ────────────────────────────────────────
function callAnthropic(payload, key) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const opts  = {
            hostname: 'api.anthropic.com',
            path:     '/v1/messages',
            method:   'POST',
            headers: {
                'x-api-key':         key,
                'anthropic-version': '2023-06-01',
                'content-type':      'application/json',
                'content-length':    Buffer.byteLength(body),
            },
        };
        const req = https.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Bad JSON from API: ' + data.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.wav':  'audio/wav',
    '.mp4':  'video/mp4',
    '.mov':  'video/quicktime',
    '.aac':  'audio/aac',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.gif':  'image/gif',
    '.ico':  'image/x-icon',
};

// ── HTTP server ────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url);

    // CORS (for local dev)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Key');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── POST /api/journey  (Anthropic proxy) ──────────────────
    if (parsed.pathname === '/api/journey' && req.method === 'POST') {
        const key = API_KEY || req.headers['x-client-key'] || '';
        if (!key) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'no_api_key' }));
            return;
        }
        const body = await readBody(req);
        try {
            const result = await callAnthropic(body, key);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (e) {
            console.error('API error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // ── POST /api/words  (submit one word to collective pool) ─
    if (parsed.pathname === '/api/words' && req.method === 'POST') {
        const body  = await readBody(req);
        const word  = (body.word || '').trim().toLowerCase().slice(0, 32);
        const store = readJSON(WORDS_FILE, { words: [], total: 0 });
        if (word) {
            store.words.push({
                word,
                anchor:    body.anchor || null,
                timestamp: new Date().toISOString(),
            });
            store.total = store.words.length;
            writeJSON(WORDS_FILE, store);
        }
        // Return frequency map for word cloud
        const freq = {};
        for (const entry of store.words) {
            if (entry.word) freq[entry.word] = (freq[entry.word] || 0) + 1;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ total: store.total, words: freq }));
        return;
    }

    // ── GET /api/words  (read collective word pool) ───────────
    if (parsed.pathname === '/api/words' && req.method === 'GET') {
        const store = readJSON(WORDS_FILE, { words: [], total: 0 });
        const freq  = {};
        for (const entry of store.words) {
            if (entry.word) freq[entry.word] = (freq[entry.word] || 0) + 1;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ total: store.total, words: freq }));
        return;
    }

    // ── POST /api/session  (submit session analytics) ─────────
    if (parsed.pathname === '/api/session' && req.method === 'POST') {
        const body     = await readBody(req);
        const sessions = readJSON(SESSIONS_FILE, { sessions: [] });
        sessions.sessions.push({
            id:         Math.random().toString(36).slice(2, 10),
            timestamp:  new Date().toISOString(),
            word:       (body.word  || '').slice(0, 32),
            anchor:     body.anchor || null,
            duration:   body.duration  || 0,   // seconds
            scenes:     body.scenes    || 0,
            blinks:     body.blinks    || 0,
        });
        writeJSON(SESSIONS_FILE, sessions);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // ── GET /api/analytics  (aggregate stats) ─────────────────
    if (parsed.pathname === '/api/analytics' && req.method === 'GET') {
        const wStore   = readJSON(WORDS_FILE,    { words: [], total: 0 });
        const sStore   = readJSON(SESSIONS_FILE, { sessions: [] });
        const sessions = sStore.sessions;

        const freq = {};
        for (const e of wStore.words) {
            if (e.word) freq[e.word] = (freq[e.word] || 0) + 1;
        }

        let topWord = null, topCount = 0;
        for (const [w, c] of Object.entries(freq)) {
            if (c > topCount) { topCount = c; topWord = w; }
        }

        const N         = sessions.length;
        const avgDur    = N ? Math.round(sessions.reduce((s, x) => s + (x.duration || 0), 0) / N) : 0;
        const avgBlinks = N ? Math.round(sessions.reduce((s, x) => s + (x.blinks   || 0), 0) / N) : 0;
        const totalBlinks = sessions.reduce((s, x) => s + (x.blinks || 0), 0);

        // Anchor distribution
        const anchors = { breath: 0, form: 0, sound: 0, none: 0 };
        for (const s of sessions) {
            const a = s.anchor || 'none';
            if (anchors[a] !== undefined) anchors[a]++;
            else anchors.none++;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            participants:  N,
            words:         freq,
            topWord,
            topCount,
            avgDuration:   avgDur,
            avgBlinks,
            totalBlinks,
            anchors,
        }));
        return;
    }

    // ── Static files ───────────────────────────────────────────
    const filePath = path.join(
        __dirname,
        parsed.pathname === '/' ? 'complete.html' : parsed.pathname
    );
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('\n  ┌──────────────────────────────────────────────────┐');
    console.log(`  │   zentangle server  →  http://localhost:${PORT}        │`);
    console.log('  │                                                  │');
    console.log('  │   /complete.html   full experience + analytics  │');
    console.log('  │   /journey.html    AI-guided journey            │');
    console.log('  │   /scenes.html     scene browser                │');
    console.log('  └──────────────────────────────────────────────────┘');
    if (!API_KEY) {
        console.log('\n  ⚠  ANTHROPIC_API_KEY not set (journey.html will use local generation)\n');
    } else {
        console.log('\n  ✓  Claude API ready.\n');
    }
    console.log(`  Data stored in: ${DATA_DIR}\n`);
});
