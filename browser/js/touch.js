// ==============================================================
//  Тач-управление для телефонов и планшетов:
//  ◀ ▶ — движение, ❚❚ — пауза, ОГОНЬ — стрельба.
//  Кнопки выставляют те же коды клавиш, что и клавиатура,
//  поэтому игровая логика о них ничего не знает.
//  На устройствах с мышью модуль не активируется.
// ==============================================================
const Touch = (() => {
    const BUTTONS = [
        { id: "btn-left", code: "ArrowLeft" },
        { id: "btn-right", code: "ArrowRight" },
        { id: "btn-fire", code: "Space" },
        { id: "btn-pause", tap: "KeyP" },
    ];
    const OVERLAYS = ["overlay-menu", "overlay-pause", "overlay-results"];
    const active = [];          // удерживаемые кнопки: { el, code }
    let container = null;
    let attached = false;

    function isTouchDevice() {
        if (typeof DEBUG !== "undefined" && DEBUG.enabled && DEBUG.forceTouch) return true;
        if ("ontouchstart" in window) return true;
        return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    }

    function releaseButton(el) {
        const i = active.findIndex((b) => b.el === el);
        if (i < 0) return;
        const b = active.splice(i, 1)[0];
        b.el.classList.remove("active");
        Input.release(b.code);
    }

    function releaseAll() {
        while (active.length) {
            const b = active.pop();
            b.el.classList.remove("active");
            Input.release(b.code);
        }
    }

    function bindButton(el, code, tap) {
        el.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
            Sound.unlock();
            if (tap) {
                // мгновенное нажатие: пауза/продолжить
                Input.press(tap);
                Input.release(tap);
                return;
            }
            if (el.classList.contains("active")) return;
            el.classList.add("active");
            active.push({ el, code });
            Input.press(code);
        });

        const up = (e) => {
            if (tap) return;
            if (e) e.preventDefault();
            releaseButton(el);
        };
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        el.addEventListener("lostpointercapture", up);
        el.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    // Кнопки нужны только в игре: на оверлеях меню/паузы/результатов они скрыты
    function syncVisibility() {
        if (!container) return;
        const overlayOpen = OVERLAYS.some((id) => {
            const el = document.getElementById(id);
            return !!el && !el.classList.contains("hidden");
        });
        container.classList.toggle("hidden", overlayOpen);
        if (overlayOpen) releaseAll();
    }

    function attach() {
        if (attached || !isTouchDevice()) return;
        attached = true;
        container = document.getElementById("touch-controls");
        if (!container) return;

        for (const cfg of BUTTONS) {
            const el = document.getElementById(cfg.id);
            if (el) bindButton(el, cfg.code, cfg.tap);
        }

        if (typeof MutationObserver === "function") {
            const observer = new MutationObserver(syncVisibility);
            for (const id of OVERLAYS) {
                const el = document.getElementById(id);
                if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
            }
        }

        // потеря фокуса и уход со страницы не должны оставлять кнопку «зажатой»
        window.addEventListener("blur", releaseAll);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) releaseAll();
        });

        // первый жест разблокирует звук на iOS
        document.addEventListener("pointerdown", () => Sound.unlock(), { once: true, passive: true });

        syncVisibility();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attach);
    } else {
        attach();
    }

    return { attach, releaseAll, syncVisibility, isTouchDevice };
})();
