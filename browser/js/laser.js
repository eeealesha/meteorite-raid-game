// ==============================================================
//  Лазер игрока (порт из game.py)
// ==============================================================
class Laser {
    constructor(x, y, big = false) {
        this.x = x;
        this.y = y;
        this.speed = 13;
        this.die = false;
        this.big = big;
    }

    update(dt) {
        this.y -= this.speed * dt * 60;
        if (this.y < -20) this.die = true;
    }

    draw(ctx) {
        // свечение (аддитивно)
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(0,255,180,0.35)";
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 6, 13, 0, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "rgb(200,255,230)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - 8);
        ctx.lineTo(this.x, this.y + 6);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(this.x, this.y - 8, 2, 0, TAU);
        ctx.fill();
    }

    hitbox() {
        return { x: this.x, y: this.y, r: 8 };
    }
}