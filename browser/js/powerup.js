// ==============================================================
//  Бонусы: щит (одно попадание) и двойной выстрел (10 секунд)
// ==============================================================
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // "shield" | "double"
        this.r = 14;
        this.speed = CFG.POWERUP_FALL_SPEED;
        this.die = false;
        this.t = Math.random() * TAU; // фаза мерцания/вращения
    }

    update(dt) {
        this.y += this.speed * dt * 60;
        this.t += dt;
        if (this.y > CFG.HEIGHT + 24) this.die = true;
    }

    collide(x, y, radius) {
        const dx = this.x - x, dy = this.y - y;
        return Math.hypot(dx, dy) < this.r + radius;
    }

    draw(ctx) {
        const pulse = 0.6 + 0.4 * Math.sin(this.t * 4);

        // свечение
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const base = this.type === "shield" ? [90, 180, 255] : [255, 190, 80];
        const glow = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.r + 8);
        glow.addColorStop(0, `rgba(${base[0]},${base[1]},${base[2]},${0.35 * pulse})`);
        glow.addColorStop(1, `rgba(${base[0]},${base[1]},${base[2]},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 8, 0, TAU);
        ctx.fill();
        ctx.restore();

        if (this.type === "shield") {
            // щит: шестиугольник с бликом
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * TAU;
                const px = Math.cos(a) * this.r * 0.8;
                const py = Math.sin(a) * this.r * 0.8;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(90,180,255,0.85)";
            ctx.fill();
            ctx.strokeStyle = "#dff1ff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-3, -4, 3, 0, TAU);
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fill();
            ctx.restore();
        } else {
            // двойной выстрел: две параллельные линии-ломаные
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = "rgba(255,200,90,0.95)";
            ctx.lineWidth = 3;
            const off = 5;
            for (const s of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(s * off - 2, -7);
                ctx.lineTo(s * off - 2, 7);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(s * off - 2, -7);
                ctx.lineTo(s * off + 3, -3);
                ctx.lineTo(s * off + 3, -1);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
}