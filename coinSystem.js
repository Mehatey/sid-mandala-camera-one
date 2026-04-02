// Coin System - Falling coins from top using coin.gif
class CoinSystem {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.coins = [];
        this.lastCoinTime = 0;
        this.coinInterval = 2000; // Spawn every 2 seconds
        this.coinImage = null;
        this.imageLoaded = false;
        this.loadCoinImage();
        this.resize();
    }

    loadCoinImage() {
        this.coinImage = new Image();
        this.coinImage.onload = () => {
            this.imageLoaded = true;
        };
        this.coinImage.onerror = () => {
            console.error('Failed to load coin.gif');
            this.imageLoaded = false;
        };
        this.coinImage.src = 'coin.gif';
    }

    resize() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    update(time) {
        // Spawn new coins
        if (time - this.lastCoinTime > this.coinInterval) {
            this.spawnCoin();
            this.lastCoinTime = time;
            this.coinInterval = 1500 + Math.random() * 2000; // Random interval
        }

        // Update coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            
            // Gravity
            coin.vy += 0.3;
            
            // Update position
            coin.x += coin.vx;
            coin.y += coin.vy;
            
            // Rotation
            coin.rotation += coin.rotationSpeed;
            
            // Remove if off screen
            if (coin.y > this.height + 50) {
                this.coins.splice(i, 1);
            }
        }
    }

    spawnCoin() {
        const x = Math.random() * this.width;
        const size = 30 + Math.random() * 20;
        this.coins.push({
            x: x,
            y: -50,
            vx: (Math.random() - 0.5) * 2,
            vy: 0,
            size: size,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.15,
            opacity: 0.9
        });
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (!this.imageLoaded) {
            return; // Don't draw if image isn't loaded
        }

        for (const coin of this.coins) {
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.rotate(coin.rotation);
            
            // Draw coin image
            const size = coin.size;
            ctx.globalAlpha = coin.opacity;
            ctx.drawImage(
                this.coinImage,
                -size / 2,
                -size / 2,
                size,
                size
            );
            ctx.globalAlpha = 1.0;
            
            ctx.restore();
        }
    }
}
