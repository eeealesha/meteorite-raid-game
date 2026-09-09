// ==============================================================
//  Звёздный фон с параллаксом и мерцанием (порт из game.py)
// ==============================================================
const TAU = Math.PI * 2;

class Star {
    constructor(layer) {
        this.layer = layer;
        this.reset(true);
    }

    reset(initial = false) {
        this.size = this.layer > 0 ? 1 : 2;
        this.r = this.layer < 2 ? this.size : Star.randChoice([1, 2, 3]);
        this.x = Math.floor(Math.random() * CFG.WIDTH);
        this.y = initial ? Math.floor(Math.random() * CFG.HEIGHT) : -5;
        this.speed = (this.layer + 1) * Star.randFloat(0.3, 0.8);
        this.color = Star.randChoice([[200, 205, 220], [170, 175, 200], [230, 235, 250]]);
        this.twinkle = Math.random() * TAU;
        this.twSpeed = Star.randFloat(1, 3);
    }

    static randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    static randFloat(a, b) { return a + Math.random() * (b - a); }

    update(dt) {
        this.y += this.speed * dt * 60;
        if (this.y > CFG.HEIGHT + 5) this.reset();
        this.twinkle += this.twSpeed * 0.02 * dt * 60;
    }

    draw(ctx) {
        const bright = Math.round(140 + 100 * (0.5 + 0.5 * Math.sin(this.twinkle)));
        const c = this.color.map((v) => Math.min(255, Math.floor(v * bright / 200)));
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, TAU);
        ctx.fill();
        if (this.r === 3) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, 1, 0, TAU);
            ctx.fill();
        }
    }
}