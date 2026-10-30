// ==============================================================
//  Константы и настройки игры
// ==============================================================
const CFG = {
    WIDTH: 800,
    HEIGHT: 600,
    LIVES: 3,

    SECTOR_COUNT: 3,
    SECTOR_TIME: 30,            // секунд активной игры на сектор
    TRANSITION_TIME: 2,         // секунд показа плашки перехода
    BOSS_TRANSITION_TIME: 2.5,  // плашка перед боссом
    BOSS_ENTER_TIME: 2.0,       // вылет босса

    POWERUP_DROP_CHANCE: 0.2,   // шанс выпадения бонуса из астероида
    DOUBLE_SHOT_TIME: 10,       // секунд действия двойного выстрела
    POWERUP_FALL_SPEED: 2.2,

    // Параметры секторов (массив по порядку прохождения)
    SECTORS: [
        // обычные астероиды
        { name: "Сектор 1", baseSpeed: 3.0, spawnInterval: 1.4, spawnCount: 1, bigHp: 1, speedBoost: 0.03 },
        // больше быстрых
        { name: "Сектор 2", baseSpeed: 4.2, spawnInterval: 1.0, spawnCount: 2, bigHp: 1, speedBoost: 0.05 },
        // быстрые и крупные, несколько попаданий
        { name: "Сектор 3", baseSpeed: 5.0, spawnInterval: 0.8, spawnCount: 2, bigHp: 2, speedBoost: 0.06 },
    ],

    BOSS: {
        width: 120,
        height: 56,
        hp: 60,
        y: 110,
        speed: 1.4,           // горизонтальная скорость фазы 1
        speedPhase2: 2.3,     // фаза 2
        fireInterval: 1.4,    // фаза 1: сек между выстрелами
        fireIntervalP2: 0.65, // фаза 2
        bulletSpeed: 4.5,
        phase2HpRatio: 0.5,   // порог фазы 2 (от полного HP)
    },
};

// Режим проверки (debug). ВЫКЛЮЧЕН по умолчанию.
// Включается только для проверки поздних этапов игры.
const DEBUG = {
    enabled: false,
    skipToSector: 0,        // 0 = обычная игра; 1/2/3 = начать с сектора; 4 = сразу босс
    sectorTimeOverride: 0,  // 0 = нормальные 30 секунд, иначе — своё значение
    godMode: false,         // неуязвимость
    instantPowerups: false, // бонус при каждом уничтожении астероида
    bossHp: 0,              // 0 = обычное HP босса (60), иначе — своё значение
    forceTouch: false,      // показывать тач-кнопки на устройстве с мышью (только для проверки)
};

const STORAGE_KEY = "meteoriteRaidBestScore";