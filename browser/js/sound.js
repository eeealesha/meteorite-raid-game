// ==============================================================
//  Процедурный звук: полный аналог синтеза из game.py (numpy/pygame)
//  Всё генерируется в AudioBuffer на лету, внешних файлов нет.
// ==============================================================
const Sound = (() => {
    let ctx = null;
    let master = null;
    let muted = false;
    let buffers = {};
    let ambientNode = null;

    // Пилы/синусы, как в make_sound() из game.py
    function sampleWave(wave, phase) {
        if (wave === "square") return Math.sin(phase) >= 0 ? 1 : -1;
        if (wave === "sine") return Math.sin(phase);
        return Math.sin(phase) + 0.5 * Math.sin(2 * phase); // "soft"
    }

    function makeBuffer({ f0, f1, dur, vol, wave, noise }) {
        const sr = ctx.sampleRate;
        const n = Math.max(2, Math.floor(sr * dur));
        const buf = ctx.createBuffer(1, n, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            const frac = i / (n - 1);
            const freq = f0 + (f1 - f0) * frac;
            const phase = 2 * Math.PI * freq * t;
            let v = sampleWave(wave, phase);
            v += (Math.random() * 2 - 1) * noise;
            // fade-in 5ms, fade-out 10ms
            const fade = Math.min(1, i / (sr * 0.005), (n - i) / (sr * 0.01));
            data[i] = v * fade * vol;
        }
        // нормализация к пику 1.0
        let peak = 0;
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
        if (peak > 0) for (let i = 0; i < n; i++) data[i] /= peak;
        return buf;
    }

    // Атмосферный эмбиент: 8с, аккорд 55/82.5/110 Гц + покачивание + шум
    function makeAmbient() {
        const sr = ctx.sampleRate;
        const dur = 8.0;
        const n = Math.floor(sr * dur);
        const buf = ctx.createBuffer(1, n, sr);
        const data = buf.getChannelData(0);
        const chord = [55.0, 82.5, 110.0];
        let seed = 7;
        const rnd = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed / 2147483647) * 2 - 1;
        };
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            let chordSum = 0;
            for (const f of chord) chordSum += Math.sin(2 * Math.PI * f * t);
            const wob = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t);
            const amp = 0.08 * wob;
            const signal = (chordSum / 3.0 + rnd() * 0.02) * amp;
            const fade = Math.min(1, t / 1.0, (dur - t) / 1.0);
            data[i] = signal * fade;
        }
        let peak = 0;
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(data[i]));
        if (peak > 0) for (let i = 0; i < n; i++) data[i] = (data[i] / peak) * 0.5;
        return buf;
    }

    // Параметры идентичны build_sounds() из game.py
    function buildAll() {
        buffers = {
            shoot: makeBuffer({ f0: 880, f1: 240, dur: 0.09, vol: 0.22, wave: "square", noise: 0.2 }),
            shoot_big: makeBuffer({ f0: 520, f1: 140, dur: 0.12, vol: 0.26, wave: "square", noise: 0.25 }),
            explode: makeBuffer({ f0: 220, f1: 40, dur: 0.4, vol: 0.5, wave: "sine", noise: 0.8 }),
            explode_small: makeBuffer({ f0: 260, f1: 50, dur: 0.25, vol: 0.4, wave: "sine", noise: 0.7 }),
            hit: makeBuffer({ f0: 160, f1: 35, dur: 0.7, vol: 0.6, wave: "sine", noise: 0.9 }),
            life: makeBuffer({ f0: 300, f1: 60, dur: 0.8, vol: 0.5, wave: "sine", noise: 0.8 }),
            boss_alert: makeBuffer({ f0: 90, f1: 200, dur: 0.6, vol: 0.5, wave: "soft", noise: 0.2 }),
            powerup: makeBuffer({ f0: 500, f1: 900, dur: 0.25, vol: 0.4, wave: "sine", noise: 0.1 }),
            shield_hit: makeBuffer({ f0: 700, f1: 250, dur: 0.3, vol: 0.5, wave: "square", noise: 0.3 }),
        };
    }

    function ensureCtx() {
        if (ctx) return true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ctx.destination);
        buildAll();
        return true;
    }

    function resume() {
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
    }

    function play(name) {
        if (!ctx || muted) return;
        if (ctx.state === "suspended") ctx.resume();
        const src = ctx.createBufferSource();
        src.buffer = buffers[name];
        src.connect(master);
        src.start();
    }

    function startAmbient() {
        if (!ctx || muted) return;
        stopAmbient();
        ambientNode = ctx.createBufferSource();
        ambientNode.buffer = makeAmbient();
        ambientNode.loop = true;
        ambientNode.connect(master);
        ambientNode.start();
    }

    function stopAmbient() {
        if (ambientNode) {
            try { ambientNode.stop(); } catch (e) { /* уже остановлен */ }
            ambientNode.disconnect();
            ambientNode = null;
        }
    }

    function toggleMute() {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 1;
        if (muted) stopAmbient();
        else if (ctx) startAmbient();
        return muted;
    }

    function isMuted() { return muted; }

    // audioUnlocked: вызвать из обработчика первого жеста игрока
    function unlock() {
        if (!ensureCtx()) return;
        resume();
        if (ambientNode === null && !muted) startAmbient();
    }

    return { unlock, play, toggleMute, isMuted };
})();