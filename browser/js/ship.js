// ==============================================================
//  Корабль игрока (порт из game.py)
// ==============================================================
class Ship {
    constructor() {
        this.x = CFG.WIDTH / 2;
        this.y = CFG.HEIGHT - 70;
        this.speed = 8;
        this.fireTimer = 0;
        this.thrust = 0;
        this.bodyColor = [90, 160, 255];
    }

    update(dt) {
        if (Input.isDown("ArrowLeft")) this.x -= this.speed * dt * 60;
        if (Input.isDown("ArrowRight")) this.x += this.speed * dt * 60;
        this.x = Math.max(20, Math.min(CFG.WIDTH - 20, this.x));
        this.thrust = (this.thrust + 0.08) % TAU;
        this.fireTimer = Math.max(0, this.fireTimer - dt);
    }

    canFire() { return this.fireTimer <= 0; }
    resetFire() { this.fireTimer = 0.15; }
    nose() { return [this.x, this.y - 22]; }

    // Позиции для выстрела (double-shot даёт две колонки)
    gunPoints(doubleShot) {
        if (doubleShot > 0) return [[this.x - 7, this.y - 24], [this.x + 7, this.y - 24]];
        return [[this.x, this.y - 24]];
    }

    draw(ctx) {
        const x = this.x, y = this.y;
        // свечение двигателя (аддитивно)
        const glowR = Math.round(14 + 5 * Math.sin(this.thrust * 4));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(x, y + 6, 0, x, y + 6, glowR);
        g.addColorStop(0, "rgba(60,140,255,0.45)");
        g.addColorStop(1, "rgba(60,140,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y + 6, glowR, 0, TAU);
        ctx.fill();
        ctx.restore();

        // пламя двигателя
        const flLen = 14 + Math.round(6 * Math.sin(this.thrust * 6));
        const flame = [
            [x, y + 6],
            [x - 5, y + 8],
            [x, y + 8 + flLen],
            [x + 5, y + 8],
        ];
        ctx.fillStyle = "rgb(100,190,255)";
        ctx.beginPath();
        ctx.moveTo(flame[0][0], flame[0][1]);
        for (let i = 1; i < flame.length; i++) ctx.lineTo(flame[i][0], flame[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgb(255,190,80)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // корпус
        const body = [
            [x, y - 22],
            [x - 12, y - 4],
            [x - 9, y + 6],
            [x + 9, y + 6],
            [x + 12, y - 4],
        ];
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(body[0][0], body[0][1]);
        for (let i = 1; i < body.length; i++) ctx.lineTo(body[i][0], body[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgb(210,235,255)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // кабина
        ctx.fillStyle = "rgb(40,70,120)";
        ctx.beginPath();
        ctx.arc(x, y - 8, 4, 0, TAU);
        ctx.fill();
    }

    hitbox() {
        return { x: this.x, y: this.y, r: 14 };
    }
}