// ==============================================================
//  «Метеоритный рейс» — браузерный порт «Космической астероидной
//  обороны» из game.py + сектора, босс, бонусы, пауза, рекорд.
//  Один игровой цикл (requestAnimationFrame), обработчики вешаются
//  один раз, перезапуск полностью сбрасывает состояние.
// ==============================================================
(() => {
    "use strict";

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const UI = {
        menu: document.getElementById("overlay-menu"),
        pause: document.getElementById("overlay-pause"),
        results: document.getElementById("overlay-results"),
        resultsTitle: document.getElementById("results-title"),
        resultsScore: document.getElementById("results-score"),
        resultsRecord: document.getElementById("results-record"),
        menuRecord: document.getElementById("menu-record"),
        transition: document.getElementById("transition"),
        transitionText: document.getElementById("transition-text"),
        btnPlay: document.getElementById("btn-play"),
        btnResume: document.getElementById("btn-resume"),
        btnMenu: document.getElementById("btn-menu"),
        btnRestart: document.getElementById("btn-restart"),
        btnResultsMenu: document.getElementById("btn-results-menu"),
        btnSound: document.getElementById("btn-sound"),
        hud: document.getElementById("hud"),
        hudScore: document.getElementById("hud-score"),
        hudSector: document.getElementById("hud-sector"),
        hudTime: document.getElementById("hud-time"),
        hudPowerups: document.getElementById("hud-powerups"),
        hudLives: document.getElementById("hud-lives"),
    };

    // ---------------------------------------------------------- рекорд
    const Best = {
        get() {
            try { return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; }
            catch (e) { return 0; }
        },
        set(v) {
            try { localStorage.setItem(STORAGE_KEY, String(v)); } catch (e) { /* хранилище недоступно */ }
        },
    };

    // ---------------------------------------------------------- канвас
    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CFG.WIDTH * dpr;
        canvas.height = CFG.HEIGHT * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---------------------------------------------------------- состояние
    const game = {
        state: "menu",        // menu | playing | paused | gameover
        phase: "sector",      // playing: sector | transition | boss
        ship: null,
        stars: [],
        asteroids: [],
        lasers: [],
        bossBullets: [],
        powerups: [],
        particles: [],
        score: 0,
        lives: CFG.LIVES,
        spawnCounter: 0,
        baseSpeed: 0,
        hitFlash: 0,
        sectorIndex: 0,       // 0..2
        sectorTime: CFG.SECTOR_TIME,
        transitionTimer: 0,
        nextTarget: null,     // null | {type:'sector', index} | {type:'boss'}
        boss: null,
        doubleShot: 0,
        shield: false,
    };

    let last = 0;
    let rafId = 0;
    let running = false;

    // ---------------------------------------------------------- DOM-утилиты
    function show(el) { el.classList.remove("hidden"); }
    function hide(el) { el.classList.add("hidden"); }

    function hideAllOverlays() {
        hide(UI.menu);
        hide(UI.pause);
        hide(UI.results);
        hide(UI.transition);
    }

    function debugSkip() {
        if (!DEBUG.enabled) return 0;
        if (DEBUG.skipToSector > 4) return 4;
        return DEBUG.skipToSector;
    }

    function debugSectorTime() {
        return DEBUG.enabled && DEBUG.sectorTimeOverride > 0 ? DEBUG.sectorTimeOverride : CFG.SECTOR_TIME;
    }

    // ---------------------------------------------------------- экраны
    function toMenu() {
        Input.clear();
        game.state = "menu";
        hideAllOverlays();
        hide(UI.hud);
        show(UI.menu);
        UI.menuRecord.textContent = Best.get() > 0 ? `Рекорд: ${Best.get()}` : "";
        last = performance.now();
    }

    function startGame() {
        Sound.unlock();
        resetGame();
        game.state = "playing";
        hideAllOverlays();
        show(UI.hud);

        const skip = debugSkip();
        if (skip === 4) {
            // сразу босс
            game.sectorIndex = CFG.SECTORS.length;
            startBossPreparation();
        } else {
            const idx = skip > 0 ? skip - 1 : 0;
            game.sectorIndex = idx;
            game.sectorTime = debugSectorTime();
            beginSectorTransition(true);
        }
        last = performance.now();
    }

    function endGame(win) {
        game.state = "gameover";
        hide(UI.hud);
        hide(UI.transition);
        const prev = Best.get();
        if (game.score > prev) Best.set(game.score);
        UI.resultsTitle.textContent = win ? "ПОБЕДА!" : "ИГРА ОКОНЧЕНА";
        UI.resultsTitle.classList.toggle("win", !!win);
        UI.resultsScore.textContent = `Очки: ${game.score}`;
        const best = Best.get();
        UI.resultsRecord.textContent = best > 0 ? `Рекорд: ${best}` : "Нет рекорда";
        hideAllOverlays();
        show(UI.results);
        Sound.play(win ? "powerup" : "life");
        last = performance.now();
    }

    function pauseGame() {
        if (game.state !== "playing") return;
        game.state = "paused";
        show(UI.pause);
    }

    function resumeGame() {
        if (game.state !== "paused") return;
        game.state = "playing";
        hide(UI.pause);
        last = performance.now();
    }

    // ---------------------------------------------------------- этапы игры
    function beginSectorTransition(first) {
        game.phase = "transition";
        game.nextTarget = { type: "sector", index: game.sectorIndex };
        game.transitionTimer = CFG.TRANSITION_TIME;
        const sec = CFG.SECTORS[game.sectorIndex];
        UI.transitionText.textContent = first ? sec.name : sec.name;
        show(UI.transition);
        // переход: убираем астероиды и пули для чистого старта
        game.asteroids = [];
        game.bossBullets = [];
    }

    function startBossPreparation() {
        game.phase = "transition";
        game.nextTarget = { type: "boss" };
        game.transitionTimer = CFG.BOSS_TRANSITION_TIME;
        game.asteroids = [];
        game.bossBullets = [];
        // босс появляется сразу за плашкой
        game.boss = new Boss(game);
        UI.transitionText.textContent = "БОСС НА ПОДХОДЕ";
        show(UI.transition);
        Sound.play("boss_alert");
    }

    function endTransition() {
        hide(UI.transition);
        if (game.nextTarget && game.nextTarget.type === "sector") {
            game.phase = "sector";
            game.spawnCounter = 0;
            game.sectorTime = debugSectorTime();
        } else {
            game.phase = "boss";
            if (!game.boss) game.boss = new Boss(game);
        }
        game.nextTarget = null;
    }

    // конец сектора -> переход к следующему или к боссу
    function nextSector() {
        if (game.sectorIndex < CFG.SECTORS.length - 1) {
            game.sectorIndex += 1;
            beginSectorTransition(false);
        } else {
            startBossPreparation();
        }
    }

    function bossDefeated() {
        game.score += 20;
        game.particles.push(new Particle(game.boss.x, game.boss.y, [255, 190, 80], 60, 12));
        game.particles.push(new Particle(game.boss.x, game.boss.y, [255, 90, 110], 50, 10));
        game.boss = null;
        endGame(true);
    }

    // ---------------------------------------------------------- сброс состояния
    function setupStars() {
        game.stars = [];
        for (const layer of [0, 0, 0, 1, 1, 1, 2, 2]) game.stars.push(new Star(layer));
    }

    function resetGame() {
        game.ship = new Ship();
        setupStars();
        game.asteroids = [];
        game.lasers = [];
        game.bossBullets = [];
        game.powerups = [];
        game.particles = [];
        game.score = 0;
        game.lives = CFG.LIVES;
        game.spawnCounter = 0;
        game.baseSpeed = 0;
        game.hitFlash = 0;
        game.sectorIndex = 0;
        game.sectorTime = CFG.SECTOR_TIME;
        game.transitionTimer = 0;
        game.nextTarget = null;
        game.boss = null;
        game.doubleShot = 0;
        game.shield = false;
    }

    // ---------------------------------------------------------- игровая логика
    function update(dt) {
        for (const star of game.stars) star.update(dt);
        game.hitFlash = Math.max(0, game.hitFlash - dt);
        if (game.state !== "playing") {
            if (game.state === "gameover") game.particles = game.particles.filter((p) => p.update(dt));
            return;
        }

        const ship = game.ship;
        ship.update(dt);

        // таймеры бонусов идут только во время активной игры
        if (game.doubleShot > 0) game.doubleShot = Math.max(0, game.doubleShot - dt);

        if (game.phase === "transition") {
            game.transitionTimer -= dt;
            if (game.transitionTimer <= 0) endTransition();
            finishFrame(dt);
            return;
        }

        if (game.phase === "sector") {
            updateSector(dt);
        } else {
            updateBoss(dt);
        }

        // выстрелы игрока
        if (Input.isDown("Space") && ship.canFire()) {
            ship.resetFire();
            for (const [gx, gy] of ship.gunPoints(game.doubleShot)) {
                game.lasers.push(new Laser(gx, gy, true));
            }
            Sound.play("shoot");
        }

        // лазеры игрока
        for (const laser of game.lasers) laser.update(dt);
        game.lasers = game.lasers.filter((l) => !l.die);

        // астероиды в секторе
        updateAsteroids(dt);

        // бонусы
        updatePowerups(dt);

        // пули босса
        for (const b of game.bossBullets) b.update(dt);
        game.bossBullets = game.bossBullets.filter((b) => !b.die);

        finishFrame(dt);
    }

    function updateSector(dt) {
        const sec = CFG.SECTORS[game.sectorIndex];
        // спавн астероидов
        game.spawnCounter += dt;
        if (game.spawnCounter >= sec.spawnInterval) {
            game.spawnCounter = 0;
            const n = Math.max(1, Math.floor(sec.spawnCount));
            for (let i = 0; i < n; i++) {
                const speed = sec.baseSpeed + game.baseSpeed;
                const x = Star.randFloat(40, CFG.WIDTH - 40);
                game.asteroids.push(new Asteroid(x, -40, "big", speed, 0, 1, sec.bigHp));
            }
            game.baseSpeed += sec.speedBoost;
        }

        // таймер сектора
        game.sectorTime -= dt;
        if (game.sectorTime <= 0) {
            game.sectorTime = 0;
            nextSector();
        }
    }

    function updateBoss(dt) {
        if (!game.boss) return;
        game.boss.update(dt);

        // столкновения лазеры-босс
        for (const laser of game.lasers) {
            if (laser.die) continue;
            const hb = game.boss.hitbox();
            if (game.boss.entering) continue;
            if (Math.hypot(laser.x - hb.x, laser.y - hb.y) < hb.r + 8) {
                laser.die = true;
                game.score += 1;
                if (game.boss.damage()) {
                    bossDefeated();
                    return;
                }
            }
        }

        // пули босса против корабля
        for (const b of game.bossBullets) {
            if (b.die) continue;
            if (Math.hypot(b.x - ship().x, b.y - ship().y) < b.r + 14) {
                b.die = true;
                hurtShip(b.x, b.y);
                if (game.state !== "playing") return;
            }
        }
        game.bossBullets = game.bossBullets.filter((b) => !b.die);
    }

    function updateAsteroids(dt) {
        // движение
        for (const a of game.asteroids) a.update(dt);

        // лазеры против астероидов
        const survivors = [];
        for (const a of game.asteroids) {
            let destroyed = false;
            for (const laser of game.lasers) {
                if (laser.die) continue;
                if (!a.collide(laser.x, laser.y, 8)) continue;
                laser.die = true;
                if (a.damage()) {
                    destroyed = true;
                    if (a.size === "big") {
                        Sound.play("shoot_big");
                        const ang = Star.randFloat(-0.6, 0.6);
                        const spd = (CFG.SECTORS[game.sectorIndex].baseSpeed + game.baseSpeed) * 1.3;
                        survivors.push(new Asteroid(a.x, a.y, "small", spd, ang));
                        survivors.push(new Asteroid(a.x, a.y, "small", spd, ang + 0.4));
                        game.particles.push(new Particle(a.x, a.y, [200, 180, 160], 22, 7));
                    } else {
                        Sound.play("explode_small");
                        game.particles.push(new Particle(a.x, a.y, [220, 200, 170], 16, 5));
                    }
                    game.score += 1;
                    maybeDropPowerup(a.x, a.y);
                } else {
                    // прочный астероид выдержал попадание (сектор 3)
                    Sound.play("shoot_big");
                    game.particles.push(new Particle(a.x, a.y, [255, 240, 200], 6, 4));
                }
                break;
            }
            if (!destroyed) survivors.push(a);
        }
        game.asteroids = survivors;

        // столкновения с кораблём
        for (const a of [...game.asteroids]) {
            if (a.collide(ship().x, ship().y, 14)) {
                game.asteroids.splice(game.asteroids.indexOf(a), 1);
                hurtShip(a.x, a.y);
            } else if (a.bottom()) {
                game.asteroids.splice(game.asteroids.indexOf(a), 1);
            }
        }
    }

    function updatePowerups(dt) {
        for (const p of game.powerups) p.update(dt);
        game.powerups = game.powerups.filter((p) => !p.die);

        const sh = ship();
        for (const p of game.powerups) {
            if (p.collide(sh.x, sh.y, 14)) {
                applyPowerup(p.type);
                p.die = true;
            }
        }
        game.powerups = game.powerups.filter((p) => !p.die);
    }

    function applyPowerup(type) {
        Sound.play("powerup");
        if (type === "shield") {
            if (!game.shield) {
                game.shield = true;
                game.particles.push(new Particle(ship().x, ship().y, [90, 180, 255], 24, 5));
            }
        } else {
            game.doubleShot = CFG.DOUBLE_SHOT_TIME; // обновляет длительность
            game.particles.push(new Particle(ship().x, ship().y, [255, 190, 80], 20, 5));
        }
    }

    function maybeDropPowerup(x, y) {
        let chance = CFG.POWERUP_DROP_CHANCE;
        if (DEBUG.enabled && DEBUG.instantPowerups) chance = 1;
        if (Math.random() > chance) return;
        const type = Math.random() < 0.5 ? "shield" : "double";
        game.powerups.push(new PowerUp(x, y, type));
    }

    function ship() { return game.ship; }

    function hurtShip(x, y) {
        if (DEBUG.enabled && DEBUG.godMode) return;
        if (game.shield) {
            // щит поглощает одно попадание и исчезает
            game.shield = false;
            Sound.play("shield_hit");
            game.particles.push(new Particle(ship().x, ship().y, [120, 210, 255], 30, 7));
            return;
        }
        game.lives -= 1;
        Sound.play("life");
        game.particles.push(new Particle(x, y, [255, 120, 120], 26, 8));
        game.doubleShot = 0;
        game.hitFlash = 0.4;
        if (game.lives <= 0) endGame(false);
    }

    function finishFrame(dt) {
        game.particles = game.particles.filter((p) => p.update(dt));
    }

    // ---------------------------------------------------------- рендер
    function render() {
        ctx.fillStyle = "#04040a";
        ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

        for (const star of game.stars) star.draw(ctx);

        const inPlay = game.state === "playing";

        if (inPlay || game.state === "gameover") {
            for (const l of game.lasers) l.draw(ctx);
            for (const a of game.asteroids) a.draw(ctx);
            for (const b of game.bossBullets) b.draw(ctx);
            for (const p of game.powerups) p.draw(ctx);
            if (game.boss) {
                game.boss.draw(ctx);
                game.boss.drawHpBar(ctx);
            }
            for (const p of game.particles) p.draw(ctx);
            if (inPlay) {
                game.ship.draw(ctx);
                if (game.shield) drawShieldBubble();
                updateHUD();
            }
        }

        if (game.hitFlash > 0) {
            const a = Math.round(60 * (game.hitFlash / 0.4));
            ctx.fillStyle = `rgba(255,0,0,${a / 255})`;
            ctx.fillRect(0, 0, CFG.WIDTH, CFG.HEIGHT);
        }
    }

    function drawShieldBubble() {
        const s = game.ship;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 150);
        ctx.strokeStyle = `rgba(120,210,255,${0.6 + pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 4, 26, 0, TAU);
        ctx.stroke();
        const glow = ctx.createRadialGradient(s.x, s.y, 14, s.x, s.y, 30);
        glow.addColorStop(0, "rgba(120,210,255,0.15)");
        glow.addColorStop(1, "rgba(120,210,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y - 4, 30, 0, TAU);
        ctx.fill();
        ctx.restore();
    }

    function updateHUD() {
        UI.hudScore.textContent = `Очки: ${game.score}`;
        UI.hudLives.textContent = `Жизни: ${game.lives}`;
        UI.hudLives.style.color = game.lives <= 1 ? "#c87878" : "#78dca0";

        if (game.phase === "boss") {
            const sec = CFG.SECTORS[CFG.SECTORS.length - 1];
            UI.hudSector.textContent = "БОСС";
            UI.hudTime.textContent = "";
        } else {
            const sec = CFG.SECTORS[game.sectorIndex] || CFG.SECTORS[0];
            UI.hudSector.textContent = sec.name;
            UI.hudTime.textContent = Math.ceil(game.sectorTime);
        }

        if (game.shield && game.doubleShot > 0) {
            UI.hudPowerups.textContent = `ЩИТ  ·  ×2 ${game.doubleShot.toFixed(1)}с`;
        } else if (game.shield) {
            UI.hudPowerups.textContent = "ЩИТ";
        } else if (game.doubleShot > 0) {
            UI.hudPowerups.textContent = `×2 ${game.doubleShot.toFixed(1)}с`;
        } else {
            UI.hudPowerups.textContent = "";
        }
    }

    // ---------------------------------------------------------- главный цикл
    function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        update(dt);
        render();
        if (running) rafId = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (running) return; // защита от параллельных циклов
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(loop);
    }

    // ---------------------------------------------------------- события (один раз)
    function bindUI() {
        UI.btnPlay.addEventListener("click", () => startGame());
        UI.btnResume.addEventListener("click", resumeGame);
        UI.btnMenu.addEventListener("click", toMenu);
        UI.btnRestart.addEventListener("click", () => startGame());
        UI.btnResultsMenu.addEventListener("click", toMenu);
        UI.btnSound.addEventListener("click", () => {
            Sound.unlock();
            const muted = Sound.toggleMute();
            UI.btnSound.textContent = muted ? "Звук: выкл" : "Звук: вкл";
        });

        Input.onAnyKey((code) => {
            if (code === "KeyP") {
                if (game.state === "playing") pauseGame();
                else if (game.state === "paused") resumeGame();
            } else if (game.state === "menu" && (code === "Enter" || code === "Space")) {
                startGame();
            } else if (game.state === "playing" && code === "Escape") {
                toMenu();
            } else if (game.state === "gameover" && code === "KeyR") {
                startGame();
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden && game.state === "playing") pauseGame();
        });

        window.addEventListener("resize", setupCanvas);
    }

    // ---------------------------------------------------------- старт
    function init() {
        setupCanvas();
        Input.attach();
        bindUI();
        resetGame();
        toMenu();
        startLoop();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Служебный хук для тестов: доступен только в режиме проверки (DEBUG.enabled).
    // В обычной игре (enabled=false) окно чистое.
    if (DEBUG.enabled) {
        window.__gameTest = game;
    }
})();