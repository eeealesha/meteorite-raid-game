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
    const active = [];          // удерживаемые кнопки: { el, code, pointerId }
    let container = null;
    let attached = false;

    function isTouchDevice() {
        if (typeof DEBUG !== "undefined" && DEBUG.enabled && DEBUG.forceTouch) return true;
        if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return true;
        if ("ontouchstart" in window) return true;
        return !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    }

    // Сбой звука (например, лимит AudioContext на iOS) не должен
    // отменять нажатие кнопки, поэтому звук всегда в try/catch
    function safeUnlock() {
        try { Sound.unlock(); } catch (err) { /* управление важнее звука */ }
    }

    function releaseEntry(i) {
        const b = active.splice(i, 1)[0];
        b.el.classList.remove("active");
        Input.release(b.code);
    }

    function releaseButton(el) {
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].el === el) releaseEntry(i);
        }
    }

    function releaseAll() {
        while (active.length) releaseEntry(active.length - 1);
    }

    // Отпускание по pointerId: работает и если палец ушёл за пределы кнопки
    function releaseByPointer(pointerId) {
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].pointerId === pointerId) releaseEntry(i);
        }
    }

    function bindHold(el, code) {
        const down = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (el.classList.contains("active")) return;
            const pointerId = e && e.pointerId !== undefined ? e.pointerId : null;
            el.classList.add("active");
            active.push({ el, code, pointerId });
            Input.press(code);   // сначала ввод...
            safeUnlock();        // ...потом звук
            if (pointerId !== null) {
                try { el.setPointerCapture(pointerId); } catch (err) { /* не критично */ }
            }
        };
        const up = (e) => {
            if (e && e.cancelable) e.preventDefault();
            releaseButton(el);
        };

        if (window.PointerEvent) {
            el.addEventListener("pointerdown", down);
            el.addEventListener("pointerup", up);
            el.addEventListener("pointercancel", up);
            el.addEventListener("lostpointercapture", up);
        } else {
            // старые Safari без Pointer Events
            el.addEventListener("touchstart", down, { passive: false });
            el.addEventListener("touchend", up);
            el.addEventListener("touchcancel", up);
            el.addEventListener("mousedown", down);
            el.addEventListener("mouseup", up);
            el.addEventListener("mouseleave", up);
        }
        el.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    function bindTap(el, code) {
        const fire = (e) => {
            if (e && e.cancelable) e.preventDefault();
            Input.press(code);
            Input.release(code);
            safeUnlock();
        };
        if (window.PointerEvent) {
            el.addEventListener("pointerdown", fire);
        } else {
            el.addEventListener("touchstart", fire, { passive: false });
            el.addEventListener("mousedown", fire);
        }
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
            if (!el) continue;
            if (cfg.tap) bindTap(el, cfg.tap);
            else bindHold(el, cfg.code);
        }

        // палец отпущен где угодно — снять удержание
        const pointerEnd = (e) => releaseByPointer(e.pointerId);
        if (window.PointerEvent) {
            document.addEventListener("pointerup", pointerEnd);
            document.addEventListener("pointercancel", pointerEnd);
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
        document.addEventListener("pointerdown", safeUnlock, { once: true, passive: true });

        syncVisibility();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attach);
    } else {
        attach();
    }

    return { attach, releaseAll, syncVisibility, isTouchDevice };
})();
