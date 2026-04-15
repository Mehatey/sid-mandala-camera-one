// Mandala Generator - Creates flowy, organic mandala patterns
class MandalaGenerator {
    constructor(ctx) {
        this.ctx = ctx;
        this.currentStyle = 0;
        this.nucleusAlpha = 1.0;  // set from main.js; hides center orbs when 0
    }

    setStyle(styleIndex) {
        this.currentStyle = styleIndex % 7;
    }

    drawMandala(centerX, centerY, foldCount, time, styleIndex = null, liquidEffect = null) {
        if (styleIndex !== null) {
            this.currentStyle = styleIndex % 7;
        }
        this.liquidEffect = liquidEffect; // Store for use in drawing methods
        
        const maxRadius = Math.min(this.ctx.canvas.width, this.ctx.canvas.height) * 0.5;
        const styleConfig = this.getStyleConfig();
        const layers = Math.min(foldCount, styleConfig.maxLayers);

        // Draw center core first (style-specific)
        if (this.currentStyle === 1) {
            this.drawThreadCenter(centerX, centerY, maxRadius * styleConfig.coreSize, time);
        } else if (this.currentStyle === 2) {
            this.drawInterwovenCenter(centerX, centerY, maxRadius * styleConfig.coreSize, time);
        } else if (this.currentStyle === 5) {
            this.drawPixelCenter(centerX, centerY, maxRadius * styleConfig.coreSize, time);
        } else {
            this.drawCenterCore(centerX, centerY, maxRadius * styleConfig.coreSize, time);
        }

        // Draw each layer from center outward
        for (let layer = 0; layer < layers; layer++) {
            const layerProgress = layer / Math.max(layers, 1);
            // Style-specific radius progression
            const radius = maxRadius * (styleConfig.radiusStart + layerProgress * styleConfig.radiusRange);
            const petalCount = this.getPetalCount(layer);
            const rotation = time * styleConfig.rotationSpeed * (layer % 2 === 0 ? 1 : -1) * (1 + layer * styleConfig.rotationVariation);

            // Draw layer
            this.drawMandalaLayer(
                centerX, 
                centerY, 
                radius, 
                petalCount, 
                layer, 
                layers,
                rotation,
                time
            );
        }
    }

    getStyleConfig() {
        // Different configurations for each style
        const configs = [
            { // Style 0: Geometric - Polygonal, faceted
                maxLayers: 10,
                coreSize: 0.12,
                radiusStart: 0.2,
                radiusRange: 0.8,
                rotationSpeed: 0.02,
                rotationVariation: 0.12,
                petalWidth: 0.42,
                petalLength: 0.78,
                baseOffset: 0.28,
                waveIntensity: 0.08,
                innerRingRatio: 0.62,
                sides: 20
            },
            { // Style 1: Thread Lines - fine geometric string-art, 8-fold symmetry
                maxLayers: 10,
                coreSize: 0.07,
                radiusStart: 0.12,
                radiusRange: 0.88,
                rotationSpeed: 0.006,
                rotationVariation: 0.18,
                petalWidth: 0.0,
                petalLength: 1.0,
                baseOffset: 0.0,
                waveIntensity: 0.0,
                innerRingRatio: 0.5,
                sides: 8,
                threads: 42
            },
            { // Style 2: Interwoven - Black and white ribbons
                maxLayers: 12,
                coreSize: 0.1,
                radiusStart: 0.18,
                radiusRange: 0.82,
                rotationSpeed: 0.015,
                rotationVariation: 0.2,
                petalWidth: 0.38,
                petalLength: 0.85,
                baseOffset: 0.22,
                waveIntensity: 0.25,
                innerRingRatio: 0.58,
                sides: 12
            },
            { // Style 3: Ocean Depths - Deep, layered petals
                maxLayers: 12,
                coreSize: 0.12,
                radiusStart: 0.2,
                radiusRange: 0.8,
                rotationSpeed: 0.02,
                rotationVariation: 0.15,
                petalWidth: 0.35,
                petalLength: 0.85,
                baseOffset: 0.25,
                waveIntensity: 0.2,
                innerRingRatio: 0.55,
                sides: 16
            },
            { // Style 4: Emerald Forest - Organic, twisting petals
                maxLayers: 11,
                coreSize: 0.14,
                radiusStart: 0.22,
                radiusRange: 0.78,
                rotationSpeed: 0.035,
                rotationVariation: 0.18,
                petalWidth: 0.38,
                petalLength: 0.82,
                baseOffset: 0.28,
                waveIntensity: 0.18,
                innerRingRatio: 0.57,
                sides: 14
            },
            { // Style 5: Pixel Art - Blocky, retro pixel style
                maxLayers: 8,
                coreSize: 0.12,
                radiusStart: 0.25,
                radiusRange: 0.75,
                rotationSpeed: 0.02,
                rotationVariation: 0.1,
                petalWidth: 0.4,
                petalLength: 0.75,
                baseOffset: 0.3,
                waveIntensity: 0.05,
                innerRingRatio: 0.65,
                sides: 8,
                pixelSize: 4
            },
            { // Style 6: Luminary — sparse concentric rings, barely-there radials
                maxLayers: 8,
                coreSize: 0.09,
                radiusStart: 0.12,
                radiusRange: 0.34,
                petalCount: 6,
                rotationSpeed: 0.004,
                rotationVariation: 0.015,
                petalWidth: 0.28,
                petalLength: 0.55,
                baseOffset: 0.18,
                waveIntensity: 0.10,
                innerRingRatio: 0.55,
            },
        ];
        return configs[this.currentStyle] || configs[0];
    }

    getPetalCount(layer) {
        // Different petal counts per style
        const baseCounts = [
            8 + layer * 2,      // Style 0: Geometric - Polygonal
            8,                  // Style 1: Thread Lines - constant 8-fold symmetry
            12 + layer * 1,     // Style 2: Interwoven - Many segments
            8 + layer * 2,      // Style 3: Ocean Depths - More petals
            4 + layer * 5,      // Style 4: Emerald Forest - Spiral-like
            8 + layer * 2       // Style 5: Pixel Art - Blocky
        ];
        return baseCounts[this.currentStyle] || baseCounts[0];
    }

    getControlPoints() {
        // Different curve resolutions per style
        const points = [16, 20, 24, 24, 18, 12]; // Pixel Art uses fewer for blocky look
        return points[this.currentStyle] || 20;
    }

    getPetalCurve(t, petalWidth, layerIndex, time, config) {
        // Base curve shape
        const baseCurve = Math.sin(t * Math.PI) * petalWidth;
        
        // Style-specific wave patterns
        switch (this.currentStyle) {
            case 0: // Geometric - Polygonal, faceted edges
                // Create polygonal faceting
                const facets = config.sides;
                const facetAngle = Math.floor(t * facets) / facets * Math.PI * 2;
                return baseCurve * 0.9 + 
                    Math.sin(facetAngle) * (petalWidth * 0.1) +
                    Math.sin(t * Math.PI * 2 + time * 0.2) * (petalWidth * config.waveIntensity * 0.3);
            
            case 1: // Vibrant Glow - Smooth, flowing with intense glow
                return baseCurve + 
                    Math.sin(t * Math.PI * 3 + time * 0.4 + layerIndex) * (petalWidth * config.waveIntensity) +
                    Math.cos(t * Math.PI * 5 + time * 0.6 + layerIndex * 0.5) * (petalWidth * config.waveIntensity * 0.6);
            
            case 5: // Pixel Art - Blocky, stepped curves
                // Create pixelated/stepped effect
                const pixelSteps = 8;
                const steppedT = Math.floor(t * pixelSteps) / pixelSteps;
                return Math.sin(steppedT * Math.PI) * petalWidth;
            
            case 2: // Interwoven - Wavy, ribbon-like
                // Strong waves for interwoven effect
                return baseCurve + 
                    Math.sin(t * Math.PI * 6 + time * 0.4 + layerIndex) * (petalWidth * config.waveIntensity) +
                    Math.cos(t * Math.PI * 8 + time * 0.6 + layerIndex * 0.7) * (petalWidth * config.waveIntensity * 0.7) +
                    Math.sin(t * Math.PI * 12 + time * 0.8) * (petalWidth * config.waveIntensity * 0.5);
            
            case 3: // Ocean Depths - Deep, rhythmic waves
                return baseCurve + 
                    Math.sin(t * Math.PI * 4 + time * 0.3 + layerIndex) * (petalWidth * config.waveIntensity * 1.2) +
                    Math.cos(t * Math.PI * 6 + time * 0.5) * (petalWidth * config.waveIntensity * 0.8) +
                    Math.sin(t * Math.PI * 10 + time * 0.7 + layerIndex * 0.3) * (petalWidth * config.waveIntensity * 0.4);
            
            case 4: // Emerald Forest - Organic, twisting
                return baseCurve + 
                    Math.sin(t * Math.PI * 3.5 + time * 0.45 + layerIndex * 1.2) * (petalWidth * config.waveIntensity * 1.1) +
                    Math.cos(t * Math.PI * 5.5 + time * 0.65 + layerIndex * 0.8) * (petalWidth * config.waveIntensity * 0.7) +
                    Math.sin(t * Math.PI * 7 + time * 0.85) * (petalWidth * config.waveIntensity * 0.5) +
                    Math.cos(t * Math.PI * 9 + time * 1.05) * (petalWidth * config.waveIntensity * 0.3);
            
            default:
                return baseCurve;
        }
    }

    drawMandalaLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time) {
        const angleStep = (Math.PI * 2) / petalCount;
        const layerProgress = layerIndex / totalLayers;

        // Get colors for this layer
        const colors = this.getLayerColors(layerIndex, totalLayers, time);

        // Style 1 (Thread Lines), Style 2 (Interwoven) and Style 5 (Pixel Art) use different drawing methods
        if (this.currentStyle === 1) {
            this.drawThreadLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time);
            return;
        }
        if (this.currentStyle === 2) {
            this.drawInterwovenLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time);
            return;
        }
        if (this.currentStyle === 5) {
            this.drawPixelLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time);
            return;
        }

        // Draw accent dots FIRST so petals render on top of them
        if (this.currentStyle !== 2 && this.currentStyle !== 5) {
            this.drawGoldenDots(centerX, centerY, radius, petalCount, rotation, layerIndex);
        }

        // Draw inner ring before petals too
        const config = this.getStyleConfig();
        if (layerIndex > 0 && this.currentStyle !== 2 && this.currentStyle !== 5) {
            const innerRadius = radius * (config.innerRingRatio || 0.6);
            this.drawInnerRing(centerX, centerY, innerRadius, layerIndex, colors, time);
        }

        // Draw petals last so they sit on top of all decorative elements
        for (let i = 0; i < petalCount; i++) {
            const angle = i * angleStep + rotation;
            this.drawPetal(
                centerX,
                centerY,
                radius,
                angle,
                petalCount,
                layerIndex,
                colors,
                time
            );
        }
    }

    drawInterwovenLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time) {
        const ctx = this.ctx;
        const angleStep = (Math.PI * 2) / petalCount;
        const ribbonCount = 2; // Two interwoven ribbons per layer
        
        // Draw interwoven black and white ribbons
        for (let ribbon = 0; ribbon < ribbonCount; ribbon++) {
            for (let i = 0; i < petalCount; i++) {
                const angle = i * angleStep + rotation + (ribbon * Math.PI / petalCount);
                const isWhite = (ribbon + layerIndex) % 2 === 0;
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(angle);
                
                // Create wavy, interwoven ribbon
                const segments = 40;
                const ribbonWidth = radius * 0.12;
                const waveFrequency = 6 + layerIndex * 0.5;
                
                // Top edge of ribbon with liquid distortion
                const topPoints = [];
                for (let j = 0; j <= segments; j++) {
                    const t = j / segments;
                    let x = radius * 0.25 + t * radius * 0.75;
                    // Create interweaving wave pattern
                    const wave = Math.sin(t * Math.PI * waveFrequency + time * 0.4 + layerIndex * 0.3) * ribbonWidth;
                    let y = wave;
                    
                    // Apply localized liquid distortion if available
                    if (this.liquidEffect) {
                        const worldX = centerX + Math.cos(angle) * x - Math.sin(angle) * y;
                        const worldY = centerY + Math.sin(angle) * x + Math.cos(angle) * y;
                        const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                        const localDx = displaced.x - worldX;
                        const localDy = displaced.y - worldY;
                        x = x + (Math.cos(angle) * localDx + Math.sin(angle) * localDy);
                        y = y + (-Math.sin(angle) * localDx + Math.cos(angle) * localDy);
                    }
                    
                    topPoints.push({ x, y });
                }
                
                // Bottom edge of ribbon (inverted wave) with liquid distortion
                const bottomPoints = [];
                for (let j = segments; j >= 0; j--) {
                    const t = j / segments;
                    let x = radius * 0.25 + t * radius * 0.75;
                    const wave = Math.sin(t * Math.PI * waveFrequency + time * 0.4 + layerIndex * 0.3) * ribbonWidth;
                    let y = -wave;
                    
                    // Apply localized liquid distortion if available
                    if (this.liquidEffect) {
                        const worldX = centerX + Math.cos(angle) * x - Math.sin(angle) * y;
                        const worldY = centerY + Math.sin(angle) * x + Math.cos(angle) * y;
                        const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                        const localDx = displaced.x - worldX;
                        const localDy = displaced.y - worldY;
                        x = x + (Math.cos(angle) * localDx + Math.sin(angle) * localDy);
                        y = y + (-Math.sin(angle) * localDx + Math.cos(angle) * localDy);
                    }
                    
                    bottomPoints.push({ x, y });
                }
                
                // Draw ribbon path
                ctx.beginPath();
                ctx.moveTo(topPoints[0].x, topPoints[0].y);
                for (let j = 1; j < topPoints.length; j++) {
                    ctx.lineTo(topPoints[j].x, topPoints[j].y);
                }
                for (let j = 0; j < bottomPoints.length; j++) {
                    ctx.lineTo(bottomPoints[j].x, bottomPoints[j].y);
                }
                
                ctx.closePath();
                
                // Fill with black or white
                ctx.fillStyle = isWhite ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)';
                ctx.fill();
                
                ctx.restore();
            }
        }
    }

    drawPixelLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time) {
        const ctx = this.ctx;
        const angleStep = (Math.PI * 2) / petalCount;
        const config = this.getStyleConfig();
        const pixelSize = config.pixelSize || 4;
        const colors = this.getLayerColors(layerIndex, totalLayers, time);
        
        // Draw pixelated petals
        for (let i = 0; i < petalCount; i++) {
            const angle = i * angleStep + rotation;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);

            // Liquid warp displacement at petal midpoint
            if (this.liquidEffect) {
                const pmx = centerX + Math.cos(angle) * radius * 0.55;
                const pmy = centerY + Math.sin(angle) * radius * 0.55;
                const dp  = this.liquidEffect.displacePoint(pmx, pmy);
                const wdx = dp.x - pmx, wdy = dp.y - pmy;
                ctx.translate(
                    Math.cos(-angle) * wdx - Math.sin(-angle) * wdy,
                    Math.sin(-angle) * wdx + Math.cos(-angle) * wdy
                );
            }

            const petalLength = radius * config.petalLength;
            const petalWidth = radius * config.petalWidth;
            const baseOffset = radius * config.baseOffset;
            
            // Draw pixelated petal using blocks
            for (let x = baseOffset; x < baseOffset + petalLength; x += pixelSize) {
                for (let y = -petalWidth; y < petalWidth; y += pixelSize) {
                    const t = (x - baseOffset) / petalLength;
                    const curve = Math.sin(t * Math.PI) * petalWidth;
                    
                    if (Math.abs(y) < curve) {
                        // Draw pixel block
                        ctx.fillStyle = colors.mid;
                        ctx.fillRect(x, y, pixelSize, pixelSize);
                    }
                }
            }
            
            ctx.restore();
        }
    }

    drawPixelCenter(centerX, centerY, radius, time) {
        const ctx = this.ctx;
        const pixelSize = 4;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Draw pixelated center
        for (let x = -radius; x < radius; x += pixelSize) {
            for (let y = -radius; y < radius; y += pixelSize) {
                const dist = Math.sqrt(x * x + y * y);
                if (dist < radius) {
                    ctx.fillStyle = `rgba(255, ${200 + Math.sin(time + dist * 0.1) * 55}, 100, 0.9)`;
                    ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }
        
        ctx.restore();
    }

    drawThreadLayer(centerX, centerY, radius, petalCount, layerIndex, totalLayers, rotation, time) {
        const ctx = this.ctx;
        // Deterministic noise — smooth, no Random() so lines stay stable each frame
        const nx = (a, b) => Math.sin(a * 127.1 + b * 311.7) * 0.5 + 0.5;

        const lp        = layerIndex / Math.max(totalLayers - 1, 1); // 0..1
        const baseAlpha = 0.05 + lp * 0.09;   // outer layers slightly brighter

        ctx.save();
        ctx.translate(centerX, centerY);

        // ── 1. Concentric ring — noise-perturbed ─────────────────────────────
        const ringSegs = 240;
        ctx.beginPath();
        for (let i = 0; i <= ringSegs; i++) {
            const ang = (i / ringSegs) * Math.PI * 2;
            // Two sine frequencies give organic wobble
            const nr = radius
                + Math.sin(ang * (5 + layerIndex % 3) + time * 0.18 + layerIndex) * radius * 0.007
                + Math.sin(ang * (9 + layerIndex % 5) - time * 0.11 + layerIndex * 1.4) * radius * 0.003;
            const x = Math.cos(ang) * nr;
            const y = Math.sin(ang) * nr;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(228, 238, 255, ${baseAlpha + 0.05})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // ── 2. Radial lines (inner fraction → ring) ──────────────────────────
        const radials = petalCount;
        const innerFrac = layerIndex === 0 ? 0.0 : 0.55; // first layer reaches center
        for (let i = 0; i < radials; i++) {
            const ang = (i / radials) * Math.PI * 2 + rotation;
            // Slight angular jitter per layer via noise
            const jitter = (nx(i, layerIndex) - 0.5) * 0.018;
            const a2 = ang + jitter;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang)  * radius * innerFrac,
                       Math.sin(ang)  * radius * innerFrac);
            ctx.lineTo(Math.cos(a2)   * radius,
                       Math.sin(a2)   * radius);
            ctx.strokeStyle = `rgba(210, 225, 255, ${baseAlpha * 0.65})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
        }

        // ── 3. Sub-division ticks at double frequency ─────────────────────────
        const ticks = radials * 2;
        for (let i = 0; i < ticks; i++) {
            const ang     = (i / ticks) * Math.PI * 2 + rotation;
            const isPrimary = i % 2 === 0;
            const inner   = radius * (isPrimary ? 0.88 : 0.93);
            const outer   = radius * 1.0;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
            ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
            ctx.strokeStyle = `rgba(235, 242, 255, ${isPrimary ? baseAlpha + 0.05 : baseAlpha * 0.4})`;
            ctx.lineWidth   = isPrimary ? 0.9 : 0.55;
            ctx.stroke();
        }

        // ── 4. Inner web arc — connects adjacent radials at 0.7× radius ──────
        if (layerIndex > 0) {
            const webR = radius * 0.72;
            ctx.beginPath();
            for (let i = 0; i <= ringSegs; i++) {
                const ang = (i / ringSegs) * Math.PI * 2;
                const nr  = webR + Math.sin(ang * (7 + layerIndex % 4) + time * 0.14) * webR * 0.005;
                const x = Math.cos(ang) * nr;
                const y = Math.sin(ang) * nr;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(200, 218, 255, ${baseAlpha * 0.55})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }

        // ── 5. Intersection dots (where radials meet the ring) ────────────────
        for (let i = 0; i < radials; i++) {
            const ang  = (i / radials) * Math.PI * 2 + rotation;
            const jitter = (nx(i, layerIndex) - 0.5) * 0.018;
            const a2 = ang + jitter;
            const dotAlpha = baseAlpha + 0.04 + nx(i, layerIndex + 7) * 0.06;
            ctx.beginPath();
            ctx.arc(Math.cos(a2) * radius, Math.sin(a2) * radius, 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 250, 255, ${dotAlpha})`;
            ctx.fill();
        }

        // ── 6. Noise grain — fine texture dots near the ring ─────────────────
        const grainCount = 12 + layerIndex * 4;
        for (let i = 0; i < grainCount; i++) {
            const ang  = (i / grainCount) * Math.PI * 2 + rotation + time * 0.004;
            const r    = radius * (0.82 + nx(i, layerIndex + 3) * 0.28);
            const ga   = 0.025 + nx(i, layerIndex + 11) * 0.055;
            const gs   = 0.3   + nx(i, layerIndex + 23) * 0.65;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, gs, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(215, 232, 255, ${ga})`;
            ctx.fill();
        }

        ctx.restore();
    }

    drawThreadCenter(centerX, centerY, radius, time) {
        const ctx  = this.ctx;
        const nx   = (a, b) => Math.sin(a * 127.1 + b * 311.7) * 0.5 + 0.5;
        const maxR = radius * 5.5;  // center zone covers ~5× the coreSize radius

        ctx.save();
        ctx.translate(centerX, centerY);

        // ── Concentric rings getting tighter toward center ────────────────────
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
            const f     = (i + 1) / ringCount;          // 0.125 .. 1.0
            const r     = maxR * f * f;                 // quadratic — denser near center
            const alpha = 0.055 + (1 - f) * 0.10;      // inner rings slightly brighter
            const segs  = 120;
            ctx.beginPath();
            for (let s = 0; s <= segs; s++) {
                const ang = (s / segs) * Math.PI * 2;
                const nr  = r + Math.sin(ang * (4 + i) + time * 0.12 + i) * r * 0.008;
                const x = Math.cos(ang) * nr;
                const y = Math.sin(ang) * nr;
                if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(225, 236, 255, ${alpha})`;
            ctx.lineWidth = 0.7 + (1 - f) * 0.25;
            ctx.stroke();
        }

        // ── Radial lines in center zone ───────────────────────────────────────
        const radials = 16;
        for (let i = 0; i < radials; i++) {
            const ang   = (i / radials) * Math.PI * 2;
            const rot   = time * 0.008 * (i % 2 === 0 ? 1 : -1);
            const a     = ang + rot;
            const jitter = (nx(i, 5) - 0.5) * 0.025;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a + jitter) * maxR, Math.sin(a + jitter) * maxR);
            ctx.strokeStyle = `rgba(210, 228, 255, ${0.04 + nx(i, 2) * 0.05})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
        }

        // ── Central point — single bright dot, no fill ────────────────────────
        const pulse = 0.75 + 0.25 * Math.sin(time * 1.8);
        ctx.beginPath();
        ctx.arc(0, 0, 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 248, 255, ${0.65 * pulse})`;
        ctx.fill();

        // ── Noise grain scattered in center zone ──────────────────────────────
        const grainCount = 24;
        for (let i = 0; i < grainCount; i++) {
            const ang = (i / grainCount) * Math.PI * 2 + time * 0.003;
            const r   = maxR * (0.15 + nx(i, 9) * 0.8);
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r,
                    0.4 + nx(i, 17) * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 235, 255, ${0.02 + nx(i, 31) * 0.05})`;
            ctx.fill();
        }

        ctx.restore();
    }

    drawPetal(centerX, centerY, radius, angle, petalCount, layerIndex, colors, time) {
        const ctx = this.ctx;
        const config = this.getStyleConfig();
        
        // Style-specific petal dimensions
        const petalWidth = radius * config.petalWidth;
        const petalLength = radius * (config.petalLength + Math.sin(time * 0.2 + layerIndex) * 0.1);
        const baseOffset = radius * config.baseOffset;

        // Create flowy, organic petal shape
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        // Petal path with style-specific curves
        ctx.beginPath();
        
        // Style-specific curve generation
        const controlPoints = this.getControlPoints();
        const points = [];
        
        // Generate points for outer curve with style-specific wave patterns
        for (let i = 0; i <= controlPoints; i++) {
            const t = i / controlPoints;
            const x = baseOffset + t * petalLength;
            
            // Style-specific curve calculations
            const curve = this.getPetalCurve(t, petalWidth, layerIndex, time, config);
            
            // Apply localized liquid distortion if available
            let finalX = x;
            let finalY = curve;
            if (this.liquidEffect) {
                // Transform point to world coordinates
                const worldX = centerX + Math.cos(angle) * x - Math.sin(angle) * curve;
                const worldY = centerY + Math.sin(angle) * x + Math.cos(angle) * curve;
                
                // Get displacement from liquid effect
                const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                
                // Transform back to local coordinates
                const localDx = displaced.x - worldX;
                const localDy = displaced.y - worldY;
                finalX = x + (Math.cos(angle) * localDx + Math.sin(angle) * localDy);
                finalY = curve + (-Math.sin(angle) * localDx + Math.cos(angle) * localDy);
            }
            
            points.push({ x: finalX, y: finalY });
        }
        
        // Generate points for inner curve (mirror)
        const innerPoints = [];
        for (let i = controlPoints; i >= 0; i--) {
            const t = i / controlPoints;
            const x = baseOffset + t * petalLength;
            const curve = this.getPetalCurve(t, petalWidth, layerIndex, time, config);
            
            // Apply localized liquid distortion if available
            let finalX = x;
            let finalY = -curve;
            if (this.liquidEffect) {
                // Transform point to world coordinates
                const worldX = centerX + Math.cos(angle) * x - Math.sin(angle) * (-curve);
                const worldY = centerY + Math.sin(angle) * x + Math.cos(angle) * (-curve);
                
                // Get displacement from liquid effect
                const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                
                // Transform back to local coordinates
                const localDx = displaced.x - worldX;
                const localDy = displaced.y - worldY;
                finalX = x + (Math.cos(angle) * localDx + Math.sin(angle) * localDy);
                finalY = -curve + (-Math.sin(angle) * localDx + Math.cos(angle) * localDy);
            }
            
            innerPoints.push({ x: finalX, y: finalY });
        }
        
        // Draw smooth curve through points
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[Math.min(i + 1, points.length - 1)];
            
            const cp1x = prev.x + (curr.x - prev.x) * 0.5;
            const cp1y = prev.y + (curr.y - prev.y) * 0.5;
            const cp2x = curr.x - (next.x - curr.x) * 0.5;
            const cp2y = curr.y - (next.y - curr.y) * 0.5;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }
        
        // Draw inner curve
        for (let i = 0; i < innerPoints.length; i++) {
            const prev = i > 0 ? innerPoints[i - 1] : innerPoints[i];
            const curr = innerPoints[i];
            const next = i < innerPoints.length - 1 ? innerPoints[i + 1] : innerPoints[i];
            
            const cp1x = prev.x + (curr.x - prev.x) * 0.5;
            const cp1y = prev.y + (curr.y - prev.y) * 0.5;
            const cp2x = curr.x - (next.x - curr.x) * 0.5;
            const cp2y = curr.y - (next.y - curr.y) * 0.5;
            
            if (i === 0) {
                ctx.lineTo(curr.x, curr.y);
            } else {
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
            }
        }
        
        ctx.closePath();

        // Fill petal with rich gradient
        const gradient = ctx.createRadialGradient(
            baseOffset + petalLength * 0.4, 0,
            0,
            baseOffset + petalLength * 0.8, 0,
            petalLength * 0.6
        );

        gradient.addColorStop(0, colors.inner);
        gradient.addColorStop(0.4, colors.mid);
        gradient.addColorStop(1, colors.outer);

        ctx.fillStyle = gradient;
        
        ctx.fill();
        ctx.shadowBlur = 0;

        // Thin outline — use outer fill color so it blends rather than overrides
        ctx.strokeStyle = colors.outer;
        ctx.lineWidth = 1 + layerIndex * 0.15;
        ctx.shadowBlur = 6;
        ctx.shadowColor = colors.outer;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Small accent dot at tip
        let tipX = baseOffset + petalLength * 0.98;
        let tipY = 0;

        if (this.liquidEffect) {
            const worldX = centerX + Math.cos(angle) * tipX - Math.sin(angle) * tipY;
            const worldY = centerY + Math.sin(angle) * tipX + Math.cos(angle) * tipY;
            const displaced = this.liquidEffect.displacePoint(worldX, worldY);
            const localDx = displaced.x - worldX;
            const localDy = displaced.y - worldY;
            tipX = tipX + (Math.cos(angle) * localDx + Math.sin(angle) * localDy);
            tipY = tipY + (-Math.sin(angle) * localDx + Math.cos(angle) * localDy);
        }

        ctx.fillStyle = colors.gold;
        ctx.shadowBlur = 5;
        ctx.shadowColor = colors.gold;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 2 + layerIndex * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    drawCenterCore(centerX, centerY, radius, time) {
        if (this.nucleusAlpha <= 0.05) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(centerX, centerY);

        // Simple radial glow at centre — no moving dots
        const hue = [0,210,295,208,138,315,258][this.currentStyle] || 210;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0,   `hsla(${hue}, 85%, 70%, 0.50)`);
        glow.addColorStop(0.5, `hsla(${hue}, 70%, 50%, 0.15)`);
        glow.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawInterwovenCenter(centerX, centerY, radius, time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // White center for interwoven
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Black border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }

    drawInnerRing(centerX, centerY, radius, layerIndex, colors, time) {
        const ctx = this.ctx;
        const segments = 12 + layerIndex * 3;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Draw inner decorative ring with smaller petal-like shapes
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 / segments) * i + time * 0.03;
            const segmentRadius = radius * (0.75 + Math.sin(time * 0.3 + i * 0.5) * 0.25);
            let x = Math.cos(angle) * segmentRadius;
            let y = Math.sin(angle) * segmentRadius;
            
            // Apply localized liquid distortion if available
            if (this.liquidEffect) {
                const worldX = centerX + x;
                const worldY = centerY + y;
                const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                x = displaced.x - centerX;
                y = displaced.y - centerY;
            }
            
            const size = 3 + Math.sin(time * 0.8 + i) * 2;

            // Draw small petal shape
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);

            ctx.fillStyle = colors.mid;
            ctx.shadowBlur = 6;
            ctx.shadowColor = colors.mid;
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawGoldenDots(centerX, centerY, radius, petalCount, rotation, layerIndex) {
        const ctx = this.ctx;
        const dotRadius = radius * 1.2;
        const dotCount = petalCount * 2;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Draw continuous ring of golden dots
        for (let i = 0; i < dotCount; i++) {
            const angle = (Math.PI * 2 / dotCount) * i + rotation;
            let x = Math.cos(angle) * dotRadius;
            let y = Math.sin(angle) * dotRadius;
            
            // Apply localized liquid distortion if available
            if (this.liquidEffect) {
                const worldX = centerX + x;
                const worldY = centerY + y;
                const displaced = this.liquidEffect.displacePoint(worldX, worldY);
                x = displaced.x - centerX;
                y = displaced.y - centerY;
            }
            
            const size = 2.5 + Math.sin(rotation * 2 + i) * 0.5;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);

            const gold = this.getGoldColor(layerIndex);
            ctx.fillStyle = gold;
            ctx.shadowBlur = 5;
            ctx.shadowColor = gold;
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    getLayerColors(layerIndex, totalLayers, time) {
        const progress = layerIndex / totalLayers;
        const timeOffset = time * 0.1;

        // Vary opacity and color mixing based on layer to avoid repetitive yellow
        // Use layer index to cycle through different color variations
        const layerVariation = (layerIndex % 3) / 3;
        const opacityFactor = layerIndex >= 4 ? (0.7 - layerVariation * 0.2) : 1.0;

        // 6 different color schemes
        switch (this.currentStyle) {
            case 0: // Geometric
                return this.getGeometricColors(progress, timeOffset, opacityFactor, layerIndex);
            case 1: // Thread Lines
                return this.getThreadColors(progress, timeOffset, opacityFactor, layerIndex);
            case 2: // Interwoven
                return this.getInterwovenColors(progress, timeOffset, opacityFactor);
            case 3: // Ocean Depths
                return this.getOceanColors(progress, timeOffset, opacityFactor, layerIndex);
            case 4: // Emerald Forest
                return this.getForestColors(progress, timeOffset, opacityFactor, layerIndex);
            case 5: // Pixel Art
                return this.getPixelColors(progress, timeOffset, opacityFactor, layerIndex);
            case 6: return this.getLuminaryColors(progress, timeOffset, opacityFactor, layerIndex);
            default:
                return this.getGeometricColors(progress, timeOffset, opacityFactor, layerIndex);
        }
    }

    getGeometricColors(progress, timeOffset, opacityFactor, layerIndex) {
        // Blue / navy / turquoise / cyan palette
        if (progress < 0.2) {
            const b = 120 + Math.sin(timeOffset) * 25;
            return {
                inner: `rgba(8,  18, ${b},      ${0.88 * opacityFactor})`,
                mid:   `rgba(12, 35, ${b + 45}, ${0.82 * opacityFactor})`,
                outer: `rgba(18, 55, ${b + 85}, ${0.76 * opacityFactor})`,
                gold:  `rgba(0, 180, 255, ${0.90 * opacityFactor})`
            };
        } else if (progress < 0.5) {
            const b = 160 + Math.sin(timeOffset) * 28;
            return {
                inner: `rgba(10,  50, ${b},      ${0.85 * opacityFactor})`,
                mid:   `rgba(15,  88, ${b + 38}, ${0.80 * opacityFactor})`,
                outer: `rgba(20, 118, ${b + 68}, ${0.75 * opacityFactor})`,
                gold:  `rgba(0, 210, 255, ${0.90 * opacityFactor})`
            };
        } else {
            const cv = layerIndex % 5;
            if (cv === 0) {
                const b = 165 + Math.sin(timeOffset) * 38;
                return {
                    inner: `rgba(5,  12, ${b - 55}, ${0.72 * opacityFactor})`,
                    mid:   `rgba(10, 28, ${b},      ${0.68 * opacityFactor})`,
                    outer: `rgba(18, 48, ${b + 32}, ${0.62 * opacityFactor})`,
                    gold:  `rgba(45, 125, 255, ${0.76 * opacityFactor})`
                };
            } else if (cv === 1) {
                const b = 210 + Math.sin(timeOffset) * 35;
                return {
                    inner: `rgba(28,  58, ${Math.max(0,b - 38)}, ${0.72 * opacityFactor})`,
                    mid:   `rgba(48,  92, ${b},                  ${0.68 * opacityFactor})`,
                    outer: `rgba(68, 125, ${Math.min(255,b + 22)}, ${0.62 * opacityFactor})`,
                    gold:  `rgba(85, 165, 255, ${0.76 * opacityFactor})`
                };
            } else if (cv === 2) {
                const c = 200 + Math.sin(timeOffset) * 38;
                return {
                    inner: `rgba(0, ${Math.max(0,c - 48)}, ${Math.min(255,c + 32)}, ${0.72 * opacityFactor})`,
                    mid:   `rgba(0, ${c},                  ${Math.min(255,c + 42)}, ${0.68 * opacityFactor})`,
                    outer: `rgba(0, ${Math.min(255,c + 32)}, 255,                   ${0.62 * opacityFactor})`,
                    gold:  `rgba(0, 225, 255, ${0.76 * opacityFactor})`
                };
            } else if (cv === 3) {
                const t = 165 + Math.sin(timeOffset) * 38;
                return {
                    inner: `rgba(0, ${t},       ${t + 22}, ${0.72 * opacityFactor})`,
                    mid:   `rgba(0, ${t + 32},  ${t + 42}, ${0.68 * opacityFactor})`,
                    outer: `rgba(0, ${Math.min(255,t + 62)}, ${Math.min(255,t + 52)}, ${0.62 * opacityFactor})`,
                    gold:  `rgba(0, 235, 218, ${0.76 * opacityFactor})`
                };
            } else {
                const a = 145 + Math.sin(timeOffset) * 38;
                return {
                    inner: `rgba(0,  ${a + 22}, ${Math.min(255,a + 62)}, ${0.72 * opacityFactor})`,
                    mid:   `rgba(18, ${a + 52}, ${Math.min(255,a + 82)}, ${0.68 * opacityFactor})`,
                    outer: `rgba(38, ${Math.min(255,a + 82)}, ${Math.min(255,a + 102)}, ${0.62 * opacityFactor})`,
                    gold:  `rgba(100, 242, 228, ${0.76 * opacityFactor})`
                };
            }
        }
    }

    getThreadColors(progress, timeOffset, opacityFactor, layerIndex) {
        // Thread Lines — near-white / silver-blue, subtle pulse per layer
        const pulse = 0.85 + Math.sin(timeOffset * 0.4 + layerIndex * 0.6) * 0.1;
        const blue  = Math.round(212 + Math.sin(timeOffset + layerIndex) * 20);
        return {
            inner: `rgba(240, 245, ${blue}, ${0.68 * opacityFactor * pulse})`,
            mid:   `rgba(215, 225, ${Math.max(0, blue - 10)}, ${0.52 * opacityFactor * pulse})`,
            outer: `rgba(190, 205, ${Math.max(0, blue - 22)}, ${0.38 * opacityFactor * pulse})`,
            gold:  `rgba(218, 232, 255, ${0.78 * opacityFactor * pulse})`
        };
    }

    getVibrantGlowColors(progress, timeOffset, opacityFactor, layerIndex) {
        // Vibrant Glow - Intense blues, purples, pinks, yellow-orange with glow
        // Core: bright blue, inner: purples/pinks, outer: yellow-orange
        if (progress < 0.2) {
            // Core - bright blue
            const blue = 50 + Math.sin(timeOffset) * 50;
            return {
                inner: `rgba(${blue}, ${100 + Math.sin(timeOffset + 1) * 50}, 255, ${0.95 * opacityFactor})`,
                mid: `rgba(${blue + 30}, ${150 + Math.sin(timeOffset + 1.5) * 50}, 255, ${0.9 * opacityFactor})`,
                outer: `rgba(${blue + 60}, ${200 + Math.sin(timeOffset + 2) * 55}, 255, ${0.85 * opacityFactor})`,
                gold: `rgba(${blue + 100}, ${220 + Math.sin(timeOffset) * 35}, 255, ${0.95 * opacityFactor})`
            };
        } else if (progress < 0.5) {
            // Middle - purples and pinks
            const purple = 150 + Math.sin(timeOffset) * 50;
            const pink = 200 + Math.sin(timeOffset + 1) * 55;
            return {
                inner: `rgba(${purple}, ${50 + Math.sin(timeOffset) * 30}, ${purple + 50}, ${0.9 * opacityFactor})`,
                mid: `rgba(${purple + 30}, ${80 + Math.sin(timeOffset + 0.5) * 40}, ${purple + 80}, ${0.85 * opacityFactor})`,
                outer: `rgba(${pink}, ${120 + Math.sin(timeOffset + 1) * 50}, ${pink + 30}, ${0.8 * opacityFactor})`,
                gold: `rgba(255, ${150 + Math.sin(timeOffset) * 105}, ${255}, ${0.9 * opacityFactor})`
            };
        } else {
            // Outer — hot pink / coral / magenta, no yellow
            const pink = 60 + Math.sin(timeOffset) * 40;        // 20–100
            const magenta = 170 + Math.sin(timeOffset + 1) * 60; // 110–230
            return {
                inner: `rgba(255, ${pink}, ${magenta}, ${0.85 * opacityFactor})`,
                mid: `rgba(245, ${pink + 15}, ${magenta + 15}, ${0.8 * opacityFactor})`,
                outer: `rgba(230, ${pink + 30}, ${magenta + 30}, ${0.75 * opacityFactor})`,
                gold: `rgba(255, ${pink}, ${magenta + 40}, ${0.9 * opacityFactor})`
            };
        }
    }

    getInterwovenColors(progress, timeOffset, opacityFactor) {
        // Interwoven - Not used, handled in drawInterwovenLayer
        // But we need to return something for compatibility
        return {
            inner: 'rgba(255, 255, 255, 0.9)',
            mid: 'rgba(255, 255, 255, 0.85)',
            outer: 'rgba(255, 255, 255, 0.8)',
            gold: 'rgba(255, 255, 255, 0.95)'
        };
    }

    getOceanColors(progress, timeOffset, opacityFactor, layerIndex) {
        const t = timeOffset;
        const w = (v, amp, phase) => Math.round(v + Math.sin(t + phase) * amp);
        switch (layerIndex % 6) {
            case 0: // Deep navy
                return {
                    inner: `rgba(5, ${w(12,5,0)}, ${w(88,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(12, ${w(28,8,0.5)}, ${w(135,12,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(22, ${w(48,10,1)}, ${w(172,15,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(55, 162, 255, ${0.9*opacityFactor})`
                };
            case 1: // Royal blue
                return {
                    inner: `rgba(18, ${w(48,10,0)}, ${w(168,12,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(30, ${w(75,12,0.5)}, ${w(208,10,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(48, ${w(102,15,1)}, ${w(240,8,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(88, 188, 255, ${0.9*opacityFactor})`
                };
            case 2: // Cerulean
                return {
                    inner: `rgba(22, ${w(90,12,0)}, ${w(190,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(40, ${w(125,15,0.5)}, ${w(225,8,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(58, ${w(155,18,1)}, ${w(248,5,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(108, 218, 255, ${0.9*opacityFactor})`
                };
            case 3: // Teal
                return {
                    inner: `rgba(0, ${w(118,12,0)}, ${w(135,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(0, ${w(150,15,0.5)}, ${w(165,12,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(8, ${w(182,18,1)}, ${w(195,15,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(42, 238, 238, ${0.9*opacityFactor})`
                };
            case 4: // Turquoise
                return {
                    inner: `rgba(0, ${w(165,12,0)}, ${w(180,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(18, ${w(195,12,0.5)}, ${w(205,10,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(38, ${w(220,10,1)}, ${w(225,8,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(88, 250, 245, ${0.9*opacityFactor})`
                };
            default: // Seafoam
                return {
                    inner: `rgba(35, ${w(180,12,0)}, ${w(160,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(60, ${w(205,12,0.5)}, ${w(185,10,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(90, ${w(225,10,1)}, ${w(205,8,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(148, 250, 230, ${0.9*opacityFactor})`
                };
        }
    }

    getForestColors(progress, timeOffset, opacityFactor, layerIndex) {
        const t = timeOffset;
        const w = (v, amp, phase) => Math.round(v + Math.sin(t + phase) * amp);
        switch (layerIndex % 6) {
            case 0: // Dark forest
                return {
                    inner: `rgba(0, ${w(55,8,0)}, ${w(25,5,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(5, ${w(82,10,0.5)}, ${w(38,8,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(12, ${w(110,12,1)}, ${w(52,10,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(52, 162, 72, ${0.9*opacityFactor})`
                };
            case 1: // Deep emerald
                return {
                    inner: `rgba(0, ${w(105,10,0)}, ${w(55,8,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(5, ${w(135,12,0.5)}, ${w(72,10,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(15, ${w(162,15,1)}, ${w(90,12,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(62, 205, 102, ${0.9*opacityFactor})`
                };
            case 2: // Jade
                return {
                    inner: `rgba(0, ${w(150,12,0)}, ${w(85,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(10, ${w(180,12,0.5)}, ${w(105,12,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(22, ${w(202,10,1)}, ${w(122,15,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(82, 232, 130, ${0.9*opacityFactor})`
                };
            case 3: // Vivid emerald
                return {
                    inner: `rgba(22, ${w(185,10,0)}, ${w(95,12,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(38, ${w(212,10,0.5)}, ${w(115,12,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(52, ${w(230,8,1)}, ${w(132,15,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(102, 248, 150, ${0.9*opacityFactor})`
                };
            case 4: // Lime
                return {
                    inner: `rgba(${w(82,12,0)}, ${w(200,10,0.5)}, ${w(35,8,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(${w(102,15,0)}, ${w(225,8,0.5)}, ${w(52,10,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(${w(120,18,0)}, ${w(240,5,1)}, ${w(65,12,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(168, 255, 82, ${0.9*opacityFactor})`
                };
            default: // Sage / mint
                return {
                    inner: `rgba(${w(98,10,0)}, ${w(180,12,0.5)}, ${w(140,10,1)}, ${0.88*opacityFactor})`,
                    mid:   `rgba(${w(120,12,0)}, ${w(202,10,0.5)}, ${w(162,12,1.5)}, ${0.82*opacityFactor})`,
                    outer: `rgba(${w(140,15,0)}, ${w(220,8,1)}, ${w(178,15,2)}, ${0.76*opacityFactor})`,
                    gold:  `rgba(188, 248, 218, ${0.9*opacityFactor})`
                };
        }
    }

    getPixelColors(progress, timeOffset, opacityFactor, layerIndex) {
        // Pixel Art - Retro color palette with limited colors
        const colors = [
            { r: 255, g: 100, b: 100 }, // Red
            { r: 100, g: 255, b: 100 }, // Green
            { r: 100, g: 100, b: 255 }, // Blue
            { r: 255, g: 140, b:  50 }, // Orange
            { r: 255, g: 100, b: 255 }, // Magenta
            { r: 100, g: 255, b: 255 }  // Cyan
        ];
        const colorIndex = layerIndex % colors.length;
        const color = colors[colorIndex];
        return {
            inner: `rgba(${color.r}, ${color.g}, ${color.b}, ${0.9 * opacityFactor})`,
            mid: `rgba(${color.r * 0.8}, ${color.g * 0.8}, ${color.b * 0.8}, ${0.85 * opacityFactor})`,
            outer: `rgba(${color.r * 0.6}, ${color.g * 0.6}, ${color.b * 0.6}, ${0.8 * opacityFactor})`,
            gold: `rgba(${color.r}, ${color.g}, ${color.b}, ${0.95 * opacityFactor})`
        };
    }

    getLuminaryColors(progress, timeOffset, opacityFactor, layerIndex) {
        const pulse = 0.80 + Math.sin(timeOffset * 0.3 + layerIndex * 0.5) * 0.08;
        const b = Math.round(200 + Math.sin(timeOffset + layerIndex) * 28);
        const a = (0.22 + progress * 0.18) * opacityFactor * pulse;
        return {
            inner: `rgba(130, 160, ${b}, ${a})`,
            mid:   `rgba(100, 135, ${b - 15}, ${a * 0.8})`,
            outer: `rgba( 80, 110, ${b - 30}, ${a * 0.55})`,
            gold:  `rgba(160, 195, 255, ${a * 0.9})`,
        };
    }

    getGoldColor(layerIndex) {
        // Style-specific accent dot colors — no universal yellow
        const styleAccents = [
            // Style 0 Geometric — silver / icy blue
            ['rgba(200, 220, 255, 0.9)', 'rgba(170, 195, 255, 0.88)', 'rgba(140, 170, 255, 0.85)', 'rgba(210, 228, 255, 0.9)'],
            // Style 1 Vibrant Glow — hot pink / magenta
            ['rgba(255, 50, 190, 0.9)', 'rgba(255, 80, 210, 0.9)', 'rgba(210, 40, 255, 0.9)', 'rgba(255, 110, 230, 0.9)'],
            // Style 2 Interwoven — white / light grey
            ['rgba(255, 255, 255, 0.9)', 'rgba(235, 235, 235, 0.88)', 'rgba(210, 210, 210, 0.85)', 'rgba(245, 245, 245, 0.9)'],
            // Style 3 Ocean Depths — cyan / aqua
            ['rgba(40, 220, 255, 0.9)', 'rgba(70, 235, 255, 0.9)', 'rgba(100, 245, 255, 0.9)', 'rgba(140, 250, 255, 0.9)'],
            // Style 4 Emerald Forest — bright lime
            ['rgba(90, 255, 70, 0.9)', 'rgba(115, 255, 95, 0.9)', 'rgba(75, 230, 55, 0.88)', 'rgba(135, 255, 115, 0.9)'],
            // Style 5 Pixel Art — yellow/gold
            ['rgba(255, 210, 0, 0.9)', 'rgba(255, 220, 20, 0.9)', 'rgba(240, 195, 0, 0.9)', 'rgba(255, 230, 40, 0.9)'],
            // Style 6 Luminary — soft blue
            ['rgba(140, 175, 255, 0.85)', 'rgba(120, 155, 240, 0.82)', 'rgba(100, 135, 220, 0.80)', 'rgba(160, 195, 255, 0.85)'],
        ];
        const accents = styleAccents[this.currentStyle] || styleAccents[0];
        return accents[layerIndex % accents.length];
    }
}

