# zentangle

An open-eye meditation experience built in the browser.  
Generative visuals that respond to your presence — blinks bloom the scene, stillness reveals structure.

Built as a design thesis exploring mindfulness, collective data, and the meditative potential of generative art.

---

## experiences

### `complete.html` — the full guided journey
The unified experience. Onboarding → curated visual journey → collective analytics.

Three depths:
- **quick** — 5 scenes, ~5 min
- **standard** — 9 scenes, ~11 min  
- **full** — 15 scenes spanning all original mandalas, ~18 min

At the end, your word joins a shared field. The analytics screen shows how your session compares to everyone who sat before you.

### `scenes.html` — the mode browser
All 70+ generative modes in a sidebar. Arrow keys or click to switch. Good for exploring or projecting.

### `journey.html` — AI-guided journey
Five questions → Claude API → a personalised 3-5 scene journey with a poetic reflection written just for you.

### `index.html` — the original study
The research prototype. 18-scene guided session with blink detection, mood check, and reflection form.

---

## running locally

```bash
# No npm required. Node stdlib only.
node server.js
```

Then open `http://localhost:3000`

Server defaults to `complete.html`. Other routes:
- `http://localhost:3000/scenes.html`
- `http://localhost:3000/journey.html`
- `http://localhost:3000/index.html`

### AI journeys (optional)
```bash
export ANTHROPIC_API_KEY=sk-ant-...
node server.js
```
Or paste your key directly in the journey.html UI (top-right `ai` button). Key is stored in `localStorage`.

---

## interaction

| action | effect |
|---|---|
| **blink** (real, via camera) | blooms the current scene |
| **double-click** | triggers blink |
| **space** | advances to next scene |
| **`B` key** | manual blink trigger |
| **mouse move** | interactive in marble, nacre, wax, patina, membrane, jelly, caustic, lava, and others |

---

## collective consciousness

When you set a word down during onboarding, it is submitted to `data/words.json`.  
On the analytics screen you see the full word field — every word anyone has ever set down here, sized by frequency, yours highlighted in gold.

**Backend endpoints** (all served by `server.js`):

| endpoint | method | description |
|---|---|---|
| `/api/words` | `GET` | Returns word frequencies |
| `/api/words` | `POST` | Adds a word, returns updated frequencies |
| `/api/session` | `POST` | Saves session analytics |
| `/api/analytics` | `GET` | Returns aggregate stats: participants, top word, avg time, total blinks |

Data lives in `data/words.json` and `data/sessions.json` (auto-created, gitignored).

---

## visual modes

### original study mandalas (7 styles, cycle on blink)
`Geometric` · `Thread Lines` · `Interwoven` · `Ocean Depths` · `Emerald Forest` · `Pixel Art` · `Luminary`

### sacred geometry & fractals
| mode | description |
|---|---|
| **Golden** | Fibonacci phyllotaxis · sunflower seed packing · golden angle · logarithmic spiral arms |
| **Julia** | Animated Julia set · 8 c-parameter waypoints · smooth continuous colouring |
| **Psychedelic** | N-fold kaleidoscope + log-spiral tunnel + domain warp + full spectral HSL cycling |
| **Newton** | Newton basin fractal for z^n−1 · five symmetry roots · blink cycles order |

### cosmos & nature
| mode | description |
|---|---|
| **Nebula** | Stellar nursery · H-alpha crimson + O-III teal + dust lanes · stars accumulate on blink |
| **Abyss** | Hadal zone · organic bioluminescent forms · marine snow · mass event on blink |
| **Nacre** | Thin-film iridescence · Newton's rings colour ramp · mouse sends ripples |
| **Aurora** | Northern lights above a frozen forest |
| **Terrain** | Topographic geology from orbit · tectonic drift |
| **Vortex** | 5-arm logarithmic spiral galaxy · blink reverses spin |
| **Tide** | Deep wave interference field |
| **Mycelium** | Organic fractal thread growth |

### texture & material
| mode | description |
|---|---|
| **Marble** | Geological veins · 3 variants · raking specular light · mouse steers light |
| **Wax** | Encaustic beeswax · hexagonal crystal · subsurface glow · mouse melts nearby wax |
| **Patina** | Oxidised copper · verdigris spreading from corrosion centres · mouse polishes |
| **Ink** | Inks bleeding on warm paper |
| **Frost** | Ice crystal branching · hexagonal geometry |
| **Iris** | Dark oiled silk iridescence |

### human & life
| mode | description |
|---|---|
| **Humans** | 44 lives arranged as a mandala · every window a story happening right now |
| **Meridian** | Seated meditating figure · 7 chakra points · aura rings |
| **Heart** | Heartbeat slowing from 80 to 48 bpm |
| **Breath** | Guided breathing · hue drifts across spectrum per cycle |
| **Gaze** | Watching eyes |

### abstract & mathematics
| mode | description |
|---|---|
| **Attractor** | Strange attractor density fields |
| **Reaction** | Gray-Scott reaction-diffusion chemistry |
| **Cymatics** | Chladni wave interference |
| **Harmonograph** | Four damped pendulums drawing one decaying line |
| **Gravity** | Spacetime fabric deformed by masses |
| **Neurogenesis** | Neurons growing and wiring up |
| **Swarm** | Murmuration · collective intelligence |

### interactive painting
`Brush` · `Plasma` · `Stardust` · `Draw` · `Sand` · `Watercolor`

### camera modes *(require camera permission)*
`You` (living mandala) · `Kaleid` · `Portal` · `Liquid` · `Drift`

---

## architecture

```
Browser canvas (z:0)   — all generative visuals render here
Overlay divs (z:10+)   — onboarding / HUD / analytics
server.js              — Node.js, no npm; static files + API proxy + data storage
data/                  — gitignored; auto-created on first POST
```

All modes follow one interface:
```js
class SomeMode {
    constructor(ctx, canvas) { ... }
    startScene()             { ... }   // reset state
    onBlink()                { ... }   // blink event
    onMouseMove(x, y)        { ... }   // optional
    draw(timestamp)          { ... }   // called every frame
}
```

Pixel-buffer modes (nebula, julia, abyss, nacre, etc.) render into an offscreen canvas at low resolution, then upscale with `imageSmoothingQuality: 'high'` — smooth image but fast pixel math.

---

## tech

Pure browser APIs. No build step. No npm. No framework.  
`Canvas 2D API` · `requestAnimationFrame` · `MediaPipe FaceMesh + Hands` (blink/hand detection) · `Node.js http` (server)

---

*design thesis — open-eye mindfulness research study*  
*built to run as a fullscreen projection installation or on a participant's own device*
