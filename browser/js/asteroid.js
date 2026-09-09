// ==============================================================
//  Астероид (порт из game.py) + поддержка прочности (hp)
// ==============================================================
class Asteroid {
    constructor(x, y, size, speed, angle = 0, vyFactor = 1, hp = 1) {
        this.size = size; // "big" | "small"
        this.r = size === "big" ? Math.floor(Star.randFloat(26, 36)) : Math.floor(Star.randFloat(12, 18));
        this.x = x;
        this.y = y;
        this.speed = speed * Star.randFloat(0.9, 1.2);
        this.angle = angle === 0 ? Math.radians(Star.randFloat(-28, 28)) : angle;
        this.vx = Math.sin(this.angle) * this.speed * 0.5;
        this.vy = Math.cos(this.angle) * this.speed * vyFactor;
        this.rot = Math.random() * TAU;
        this.rotSpeed = Star.randFloat(-1.5, 1.5);
        this.color = Star.randChoice([
            [168, 156, 140], [150, 140, 126], [176, 164, 148], [140, 132, 120],
        ]);
        this.points = this._shape();
        // прочность: hp ударов, показываем трещины при повреждении
        this.hp = Math.max(1, hp);
        this.maxHp = this.hp;
    }

    _shape() {
        const count = Math.floor(Star.randFloat(9, 13));
        const pts = [];
        for (let i = 0; i < count; i++) {
            const a = i / count * TAU;
            const rr = this.r * Star.randFloat(0.7, 1.15);
            pts.push([a, rr]);
        }
        return pts;
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        this.rot += this.rotSpeed * dt;
        if (this.x < -this.r * 2) this.x = CFG.WIDTH + this.r * 2;
        else if (this.x > CFG.WIDTH + this.r * 2) this.x = -this.r * 2;
    }

    bottom() { return this.y - this.r >= CFG.HEIGHT; }

    // true — астероид уничтожен
    damage() {
        this.hp -= 1;
        return this.hp <= 0;
    }

    damaged() { return this.hp < this.maxHp; }

    collide(x, y, radius) {
        const dx = this.x - x, dy = this.y - y;
        return Math.hypot(dx, dy) < this.r + radius;
    }

    _pts() {
        const pts = [];
        for (const [a, rr] of this.points) {
            const c = Math.cos(a + this.rot), s = Math.sin(a + this.rot);
            pts.push([this.x + rr * c, this.y + rr * s]);
        }
        return pts;
    }

    draw(ctx) {
        const pts = this._pts();
        ctx.fillStyle = `rgb(${this.color[0]},${this.color[1]},${this.color[2]})`;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgb(85,78,70)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // кратер (как в оригинале)
        if (this.size === "big") {
            ctx.fillStyle = "rgb(120,112,100)";
            ctx.beginPath();
            ctx.arc(this.x - this.r * 0.2, this.y + this.r * 0.2, Math.max(2, Math.floor(this.r / 4)), 0, TAU);
            ctx.fill();
        }

        // трещины при повреждении (прочные астероиды)
        if (this.damaged()) {
            ctx.strokeStyle = "rgba(235,255,250,0.55)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x - this.r * 0.5, this.y + this.r * 0.1);
            ctx.lineTo(this.x, this.y - this.r * 0.2);
            ctx.lineTo(this.x + this.r * 0.4, this.y + this.r * 0.3);
            ctx.stroke();
        }
    }
}

// маленький хелпер (аналог math.radians из Python)
Math.radians = Math.radians || ((deg) => deg * Math.PI / 180);