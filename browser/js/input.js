// ==============================================================
//  Ввод с клавиатуры. Игровые клавиши не прокручивают страницу.
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

    function attach() {
        if (attached) return;
        attached = true;
        window.addEventListener("keydown", (e) => {
            if (GAME_KEYS.has(e.code)) e.preventDefault();
            if (!e.repeat) {
                pressed.add(e.code);
                handlers.forEach((fn) => fn(e.code));
                Sound.unlock();
            }
        });
        window.addEventListener("keyup", (e) => { pressed.delete(e.code); });
    }

    function isDown(code) { return pressed.has(code); }
    function clear() { pressed.clear(); }

    return { attach, isDown, clear, onAnyKey };
})();