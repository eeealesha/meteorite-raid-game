// ==============================================================
//  Финальный босс: большой корабль, полоса здоровья, две фазы.
// ==============================================================

// ---------- пуля босса ----------
class BossBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.r = 5;
        this.die = false;
    }

    update(dt) {
        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;
        if (this.y > CFG.HEIGHT + 20) this.die = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r + 7);
        const col = this.r === 7 ? "255,80,120" : "255,140,90";
        glow.addColorStop(0, `rgba(${col},0.9)`);
        glow.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 7, 0, TAU);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#ffe8d6";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, TAU);
        ctx.fill();
    }
}

// ---------- сам босс ----------
class Boss {
    constructor(game) {
        this.game = game;
        this.w = CFG.BOSS.width;
        this.h = CFG.BOSS.height;
        this.maxHp = DEBUG.bossHp > 0 ? DEBUG.bossHp : CFG.BOSS.hp;
        this.hp = this.maxHp;
        this.phase = 1;
        this.x = CFG.WIDTH / 2;
        this.targetY = CFG.BOSS.y;
        this.y = -140;             // влетает сверху
        this.dir = 1;
        this.fireTimer = 0.8;
        this.flash = 0;
        this.entering = true;
        this.wobble = 0;
    }

    get phase2() { return this.phase === 2; }

    update(dt) {
        this.flash = Math.max(0, this.flash - dt);
        this.wobble += dt;

        if (this.entering) {
            this.y += 1.7 * dt * 60;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.entering = false;
                Sound.play("boss_alert");
            }
            return;
        }

        const spd = this.phase2 ? CFG.BOSS.speedPhase2 : CFG.BOSS.speed;
        this.x += this.dir * spd * dt * 60;
        const margin = this.w / 2 + 24;
        if (this.x < margin) { this.x = margin; this.dir = 1; }
        else if (this.x > CFG.WIDTH - margin) { this.x = CFG.WIDTH - margin; this.dir = -1; }

        const interval = this.phase2 ? CFG.BOSS.fireIntervalP2 : CFG.BOSS.fireInterval;
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = interval;
            this.fire();
        }
    }

    damage() {
        this.hp -= 1;
        this.flash = 0.15;
        if (!this.phase2 && this.hp <= this.maxHp * CFG.BOSS.phase2HpRatio) {
            this.enterPhase2();
        }
        return this.hp <= 0;
    }

    enterPhase2() {
        this.phase = 2;
        this.flash = 0.6;
        this.fireTimer = Math.min(this.fireTimer, 0.3);
        Sound.play("boss_alert");
    }

    hitbox() {
        return { x: this.x, y: this.y, r: 50 };
    }

    bottomGuns() {
        // пушки внизу корпуса
        return [
            { x: this.x - 24, y: this.y + 14 },
            { x: this.x + 24, y: this.y + 14 },
        ];
    }

    fire() {
        const ship = this.game.ship;
        const spd = CFG.BOSS.bulletSpeed;
        if (this.phase === 1) {
            // одиночный выстрел вниз (с лёгким дрейфом к игроку)
            const from = this.x < ship.x ? this.bottomGuns()[1] : this.bottomGuns()[0];
            this.game.bossBullets.push(new BossBullet(from.x, from.y, 0, spd));
        } else {
            // фаза 2: веер из трёх пуль, прицельно к кораблю
            const tx = ship.x, ty = ship.y;
            const dx = tx - this.x, dy = ty - this.y;
            const ang = Math.atan2(dy, dx);
            for (const off of [-0.22, -0.02, 0.18]) {
                const a = ang + off;
                this.game.bossBullets.push(new BossBullet(this.x, this.y + 14, Math.cos(a) * spd * 0.6, Math.sin(a) * spd));
            }
        }
    }

    draw(ctx) {
        const x = this.x, y = this.y;
        const shake = this.phase2 ? Math.sin(this.wobble * 30) * 2 : 0;
        const sx = x + shake;
        const bodyColor = this.phase2 ? [170, 60, 90] : [92, 110, 150];
        const trimColor = this.phase2 ? [255, 120, 150] : [200, 220, 255];
        const cockCol = this.phase2 ? [60, 10, 20] : [40, 70, 120];

        // свечение двигателей
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const gr = ctx.createRadialGradient(sx, y + 30, 4, sx, y + 30, 34);
        const engCol = this.phase2 ? "255,80,110" : "80,170,255";
        gr.addColorStop(0, `rgba(${engCol},0.5)`);
        gr.addColorStop(1, `rgba(${engCol},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(sx, y + 30, 34, 0, TAU);
        ctx.fill();
        ctx.restore();

        // корпус: широкий крейсер
        const body = [
            [sx - 60, y + 12], [sx - 46, y - 16], [sx - 14, y - 22],
            [sx, y - 16], [sx + 14, y - 22], [sx + 46, y - 16], [sx + 60, y + 12],
            [sx + 34, y + 26], [sx - 34, y + 26],
        ];
        ctx.fillStyle = `rgb(${bodyColor[0]},${bodyColor[1]},${bodyColor[2]})`;
        ctx.beginPath();
        ctx.moveTo(body[0][0], body[0][1]);
        for (let i = 1; i < body.length; i++) ctx.lineTo(body[i][0], body[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgb(${trimColor[0]},${trimColor[1]},${trimColor[2]})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // носовая броня
        ctx.fillStyle = this.phase2 ? "rgba(255,120,150,0.35)" : "rgba(160,190,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(sx - 14, y - 16);
        ctx.lineTo(sx, y - 16);
        ctx.lineTo(sx + 14, y - 22);
        ctx.lineTo(sx + 30, y);
        ctx.lineTo(sx - 30, y);
        ctx.closePath();
        ctx.fill();

        // кабина
        ctx.fillStyle = `rgb(${cockCol[0]},${cockCol[1]},${cockCol[2]})`;
        ctx.beginPath();
        ctx.ellipse(sx, y - 8, 12, 7, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgb(${trimColor[0]},${trimColor[1]},${trimColor[2]})`;
        ctx.stroke();

        // реактор по центру
        const reactorCol = this.phase2 ? "rgba(255,80,110,0.9)" : "rgba(120,220,255,0.9)";
        ctx.fillStyle = reactorCol;
        ctx.beginPath();
        ctx.arc(sx, y + 6, 8, 0, TAU);
        ctx.fill();

        // пушки
        for (const g of this.bottomGuns()) {
            ctx.fillStyle = "rgb(30,34,46)";
            ctx.beginPath();
            ctx.arc(g.x, g.y, 6, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // вспышка при получении урона
        if (this.flash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${0.35 * this.flash / 0.6})`;
            ctx.beginPath();
            ctx.ellipse(sx, y, this.w * 0.55, this.h, 0, 0, TAU);
            ctx.fill();
        }

        // пламя при фазе 2 (учащённая пульсация)
        if (this.phase2) {
            ctx.fillStyle = `rgba(255,120,60,${0.5 + 0.4 * Math.sin(this.wobble * 14)})`;
            ctx.beginPath();
            ctx.moveTo(sx - 12, y + 26);
            ctx.lineTo(sx, y + 40 + 4 * Math.sin(this.wobble * 14));
            ctx.lineTo(sx + 12, y + 26);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawHpBar(ctx) {
        const w = 320;
        const h = 10;
        const x = (CFG.WIDTH - w) / 2;
        const y = 56;
        const ratio = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
        const color = this.phase2 ? "rgb(255,90,110)" : "rgb(110,220,140)";
        if (ratio > 0) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, w * ratio, h);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.phase2 ? "БОСС — АВАРИЙНАЯ ФАЗА" : "БОСС", CFG.WIDTH / 2, y - 8);
    }
}