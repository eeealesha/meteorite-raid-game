// ==============================================================
//  Ввод. Общий путь для клавиатуры и экранных тач-кнопок:
//  игровые клавиши не прокручивают страницу, состояние кнопок
//  живёт в одном наборе, поэтому остальной код о вводе
//  ничего не знает.
// ==============================================================
const Input = (() => {
    const pressed = new Set();
    const GAME_KEYS = new Set([
        "ArrowLeft", "ArrowRight", "Space", "KeyP", "KeyR", "Escape", "Enter",
    ]);
    const handlers = [];
    let attached = false;

    // onKey(code) вызывается при НАЖАТИИ (keydown) любой клавиши
    function onAnyKey(fn) { handlers.push(fn); }

    // Нажатие/отпускание клавиши — одинаково для клавиатуры и тач-кнопок
    function press(code) {
        if (pressed.has(code)) return;
        pressed.add(code);
        handlers.forEach((fn) => fn(code));
        // сбой звука (лимит AudioContext на iOS и т.п.) не должен
        // отменять нажатие и ломать управление
        try { Sound.unlock(); } catch (e) { /* управление важнее */ }
    }

    function release(code) { pressed.delete(code); }

    function attach() {
        if (attached) return;
        attached = true;
        window.addEventListener("keydown", (e) => {
            if (GAME_KEYS.has(e.code)) e.preventDefault();
            if (!e.repeat) press(e.code);
        });
        window.addEventListener("keyup", (e) => { release(e.code); });
    }

    function isDown(code) { return pressed.has(code); }
    function clear() { pressed.clear(); }

    return { attach, isDown, clear, onAnyKey, press, release };
})();
