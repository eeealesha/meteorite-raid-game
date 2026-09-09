// ==============================================================
//  Частицы взрывов (порт из game.py)
// ==============================================================
class Particle {
    constructor(x, y, color, count = 18, speed = 6) {
        this.parts = [];
        for (let i = 0; i < count; i++) {
            const a = Math.random() * TAU;
            const sp = Star.randFloat(1, speed);
            const life = Star.randFloat(0.3, 0.6);
            this.parts.push([x, y, Math.cos(a) * sp, Math.sin(a) * sp, life, life, color]);
        }
    }

    // возвращает true, пока живы частицы
    update(dt) {
        const alive = [];
        for (const p of this.parts) {
            p[0] += p[2] * dt * 60;
            p[1] += p[3] * dt * 60;
            p[2] *= 0.97;
            p[3] *= 0.97;
            p[4] -= dt;
            if (p[4] > 0) alive.push(p);
        }
        this.parts = alive;
        return this.parts.length > 0;
    }

    draw(ctx) {
        for (const p of this.parts) {
            const alpha = Math.round(255 * (p[4] / p[5]));
            const cCol = p[6];
            const cr = Math.min(255, cCol[0] + alpha / 3);
            const cg = Math.min(255, cCol[1] + alpha / 3);
            const cb = Math.min(255, cCol[2] + alpha / 3);
            ctx.fillStyle = `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`;
            ctx.beginPath();
            ctx.arc(p[0], p[1], 2, 0, TAU);
            ctx.fill();
        }
    }
}