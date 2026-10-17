const GAME = {
    playerSpeed: 280,
    spellSpeed: 680,
    spellCooldown: 95,
    enemySpeed: 45,
    enemySpeedPerLevel: 12,
    enemyDrop: 18,
    enemyRows: 3,
    enemyColumns: 7,
    enemyGapX: 14,
    enemyGapY: 12,
    enemyFireInterval: 1400,
    enemyFireIntervalMin: 450,
    enemyFireStepPerLevel: 150,
    seedSpeed: 220,
    startingHealth: 3,
    pointsPerHit: 50,

    // Timer: start with 15 seconds. Clearing a level adds bonus time.
    // Levels 1-9 add 5s, levels 10-19 add 8s, levels 20-29 add 11s, and so on.
    startTime: 15,
    timeBonus: 5,
    timeBonusPerTen: 3,

    // Every 10th level (10, 20, 30...) is a boss: one giant pumpkin.
    bossEvery: 10,
    bossHeight: 144,
    bossHitsPerLevel: 8,
    bossSpeed: 110,
    bossFireInterval: 900,
    bossSpread: 90
};

/*
    =============================================================
     HOW TO ADD YOUR OWN PICTURES (wizard, enemies, candy, boss)
    =============================================================

    1. Put your image in the Images/sheets folder.
           Example: Images/sheets/wizard.png

    2. Find the line below marked "ADD YOUR ... HERE" and change
       "path" to your file. The path starts with ./Images/ and must
       match the file name EXACTLY (capital letters count, and so
       does .png vs .gif).

    3. Set "frames" to how many pictures are in your sprite sheet.
       A sprite sheet is ONE ROW of pictures, left to right.
           Count them! A wizard with 4 poses = frames: 4
           Tip: if each picture is square, frames = width / height.
           (A 1664 x 416 image has 1664 / 416 = 4 frames.)

    4. Set "height" to how tall it should be in the game, in pixels.
       You do NOT need to resize your image. The code shrinks it.

    5. "fps" means frames per second (how fast it animates).
       Bigger number = faster animation.

    Using a GIF instead of a sprite sheet? Set frames: 1.
    A GIF animates by itself. (Sprite sheets are better because
    you control the speed.)

    Do NOT put image paths in global.css. This file sends the
    picture and its size to the CSS for you.

    If a picture is missing or the path is wrong, the game still
    works and shows a plain CSS shape instead. Check the browser
    console (F12) for a red "404" error to find the bad path.
*/
const SPRITES = {
    // ADD YOUR WIZARD HERE (player 1).
    // Save a 4-frame sheet as Images/sheets/wizard.png, or change the path.
    wizard: { path: "./Images/sheets/wizard.png", frames: 4, height: 48, fps: 8 },

    // ADD PLAYER 2's WIZARD HERE (2 player mode).
    // path: null means player 2 uses player 1's picture with a color tint.
    // Example: { path: "./Images/sheets/wizard-two.png", frames: 4, height: 48, fps: 8 }
    wizardTwo: { path: null, frames: 4, height: 48, fps: 8 },

    // ADD YOUR SPELL / AMMO HERE.
    // These are single pictures (frames: 1). A random one is picked each shot.
    // Add more by adding another path to the list (don't forget the comma).
    spell: {
        paths: [
            "./Images/1000003099.png", // pink candy
            "./Images/1000003100.png", // green candy
            "./Images/1000003103.png"  // orange candy
        ],
        frames: 1,
        height: 24,
        fps: 1
    },

    // ADD YOUR EXPLOSION HERE.
    // Right now it's null (no picture), so a yellow CSS burst is used.
    // Example: { path: "./Images/sheets/explosion.png", frames: 6, height: 48, fps: 15 }
    effect: { path: null, frames: 6, height: 48, fps: 15 }
};

/*
    ADD YOUR ENEMIES HERE.
    One line per level. Level 1 uses the first line, level 2 the
    second, and so on. After the last line, the list starts over,
    but the enemies keep getting tougher.

    color = the boss's glow and health bar color (hex code).

    boss: null means the boss is a GIANT version of this level's
    enemy. To use a different picture for the boss, change null to:
        boss: { path: "./Images/sheets/my-boss.png", frames: 4 }
*/
const LEVELS = [
    { name: "Purple Pumpkins", path: "./Images/1000003110.png", frames: 6, fps: 4, color: "#a64dff", boss: null },
    { name: "Red Pumpkins", path: "./Images/sheets/pumpkin-red.png", frames: 6, fps: 5, color: "#ff3333", boss: null },
    { name: "Orange Pumpkins", path: "./Images/sheets/pumpkin-orange.png", frames: 6, fps: 6, color: "#ff8c1a", boss: null },
    { name: "Green Pumpkins", path: "./Images/sheets/pumpkin-green.png", frames: 6, fps: 7, color: "#33e033", boss: null }
];

// How tall regular enemies are drawn, in pixels.
const ENEMY_HEIGHT = 48;

// The pumpkins have empty space around them, so collisions use a smaller box.
const ENEMY_HITBOX = 0.7;
const BOSS_HITBOX = 0.65;

/*
    CONTROLS
    Keyboard:
        Player 1 = A / D to move, Space to cast.
        Player 2 = Left / Right arrows to move, Numpad 0 to cast.
        (1 player mode uses Player 1's keys only.)

    The keyboard names below are "codes" (the key's spot on the
    keyboard), so Numpad 0 works with Num Lock on or off.

    Controllers (PS4, PS5, Xbox, and most USB / Bluetooth pads):
    the first controller is Player 1, the second is Player 2.
    The button numbers below are the browser's "standard" layout:
        0 = Cross / A        1 = Circle / B
        2 = Square / X       3 = Triangle / Y
        5 = R1 / RB          7 = R2 / RT
        9 = Options / Menu   14 = D-pad left   15 = D-pad right
    Tip: if a controller doesn't show up, press any button on it.
    Browsers hide controllers until a button is pressed.
*/
const KEYS = {
    playerOne: { left: "KeyA", right: "KeyD", fire: "Space" },
    playerTwo: { left: "ArrowLeft", right: "ArrowRight", fire: "Numpad0" }
};

const PAD = {
    fireButtons: [0, 1, 2, 5, 7],
    startOnePlayer: [0, 9],
    startTwoPlayers: [3],
    left: 14,
    right: 15,
    deadZone: 0.3
};

/* ----- You don't need to change anything below to add pictures. ----- */

const root = document.documentElement;

// Load an image and measure one frame of it.
function loadSheet(path, frames) {
    return new Promise((resolve) => {
        if (!path) {
            resolve({ path, frames, loaded: false });
            return;
        }

        const image = new Image();

        image.onload = () => resolve({
            path,
            frames,
            loaded: true,
            frameWidth: image.naturalWidth / frames,
            frameHeight: image.naturalHeight
        });

        image.onerror = () => resolve({ path, frames, loaded: false });
        image.src = path;
    });
}

// Scale a sheet to the wanted height and set its :root variables.
// The CSS keyframes use these to step through the frames.
function applySheet(type, sheet, height, fps) {
    const scale = sheet.loaded ? height / sheet.frameHeight : 1;
    const width = sheet.loaded ? Math.round(sheet.frameWidth * scale) : height;

    root.style.setProperty(`--${type}-width`, `${width}px`);
    root.style.setProperty(`--${type}-height`, `${height}px`);
    root.style.setProperty(`--${type}-frames`, sheet.frames);
    root.style.setProperty(`--${type}-duration`, `${sheet.frames / fps}s`);
    root.style.setProperty(
        `--${type}-sheet`,
        sheet.loaded ? `url("${sheet.path}")` : "none"
    );

    return { width, height, loaded: sheet.loaded };
}

const sheets = {};
const sizes = {};

// Load every sheet once before the first game.
const spritesReady = Promise.all([
    loadSheet(SPRITES.wizard.path, SPRITES.wizard.frames),
    loadSheet(SPRITES.wizardTwo.path, SPRITES.wizardTwo.frames),
    Promise.all(SPRITES.spell.paths.map(path => loadSheet(path, SPRITES.spell.frames))),
    loadSheet(SPRITES.effect.path, SPRITES.effect.frames),
    Promise.all(LEVELS.map(level => loadSheet(level.path, level.frames))),
    Promise.all(LEVELS.map(level => (level.boss ? loadSheet(level.boss.path, level.boss.frames) : null)))
]).then(([wizardSheet, wizardTwoSheet, spellSheets, effectSheet, levelSheets, bossSheets]) => {
    sheets.spells = spellSheets.filter(sheet => sheet.loaded);
    sheets.levels = levelSheets;
    sheets.bosses = bossSheets.map((sheet, i) => (sheet && sheet.loaded ? sheet : levelSheets[i]));

    sizes.wizard = applySheet("wizard", wizardSheet, SPRITES.wizard.height, SPRITES.wizard.fps);

    // Player 2 falls back to player 1's picture (tinted in CSS).
    const twoHasOwnSheet = wizardTwoSheet.loaded;
    const twoConfig = twoHasOwnSheet ? SPRITES.wizardTwo : SPRITES.wizard;
    sizes.wizardTwo = applySheet(
        "wizard-two",
        twoHasOwnSheet ? wizardTwoSheet : wizardSheet,
        twoConfig.height,
        twoConfig.fps
    );
    players[1].element.classList.toggle("own-sheet", twoHasOwnSheet);

    sizes.spell = applySheet(
        "spell",
        sheets.spells[0] || { frames: 1, loaded: false },
        SPRITES.spell.height,
        SPRITES.spell.fps
    );
    sizes.effect = applySheet("effect", effectSheet, SPRITES.effect.height, SPRITES.effect.fps);
});

// Get the game elements from the HTML.
const board = document.querySelector("#game-board");
const enemyContainer = document.querySelector("#enemy-container");
const spellContainer = document.querySelector("#spell-container");
const effectContainer = document.querySelector("#effect-container");
const scoreDisplay = document.querySelector("#score");
const levelDisplay = document.querySelector("#level");
const timerDisplay = document.querySelector("#timer");
const healthDisplay = document.querySelector("#health");
const levelBanner = document.querySelector("#level-banner");
const bossBar = document.querySelector("#boss-bar");
const bossBarFill = document.querySelector("#boss-bar-fill");
const bossBarName = document.querySelector("#boss-bar-name");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");
const startTwoButton = document.querySelector("#start-two-button");
const scoreForm = document.querySelector("#score-form");
const playerNameLabel = document.querySelector("#player-name-label");
const playerNameInput = document.querySelector("#player-name");
const highScoreList = document.querySelector("#high-score-list");
const noScoresMessage = document.querySelector("#no-scores");
const controllerHint = document.querySelector("#controller-hint");
const controllerStatus = document.querySelector("#controller-status");

// High scores are saved in this browser (localStorage), Top 10 only.
const HIGH_SCORE_KEY = "wizardInvadersHighScores";
const MAX_HIGH_SCORES = 10;

// Store the current game state.
const keys = new Set();

let enemies = [];
let spells = [];
let seeds = [];
let score = 0;
let health = GAME.startingHealth;
let running = false;
let lastTime = 0;
let nextEnemyShot = 0;
let enemyDirection = 1;
let level = 1;
let timeLeft = 0;
let playerCount = 1;
let menuReadyAt = 0;
let animationFrameId = null;

// Both wizards. Player 2 only plays in 2 player mode.
const players = [
    { number: 1, element: document.querySelector("#wizard"), sizeKey: "wizard" },
    { number: 2, element: document.querySelector("#wizard-two"), sizeKey: "wizardTwo" }
].map(player => ({ ...player, x: 0, y: 0, width: 0, height: 0, lastCast: -Infinity }));

function activePlayers() {
    return players.slice(0, playerCount);
}

// Position an element inside the game board.
function place(element, x, y) {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
}

// Create a new game element. Missing sheets fall back to a CSS shape.
function createElement(className, container, loaded) {
    const element = document.createElement("div");
    element.className = `sprite ${className}`;
    if (!loaded) element.classList.add("placeholder");
    container.append(element);
    return element;
}

// Shrink a box around its center (used for padded sprites).
function hitbox(object, scale = 1) {
    const width = object.width * scale;
    const height = object.height * scale;

    return {
        x: object.x + (object.width - width) / 2,
        y: object.y + (object.height - height) / 2,
        width,
        height
    };
}

// Check whether two boxes overlap.
function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/* ---------- Controllers (Gamepad API) ---------- */

// Connected controllers, in the order they were plugged in.
function connectedPads() {
    return [...navigator.getGamepads()].filter(pad => pad && pad.connected);
}

function isPressed(pad, index) {
    return Boolean(pad.buttons[index] && pad.buttons[index].pressed);
}

// Remember last frame's buttons so a press only counts once.
const previousButtons = new Map();

function justPressed(pad, indexes) {
    const before = previousButtons.get(pad.index) || [];
    return indexes.some(i => isPressed(pad, i) && !before[i]);
}

function rememberButtons(pads) {
    for (const pad of pads) {
        previousButtons.set(pad.index, pad.buttons.map(button => button.pressed));
    }
}

function updateControllerStatus(pads) {
    const count = pads.length;

    controllerStatus.textContent =
        count === 0 ? "No controllers connected"
            : count === 1 ? "1 controller connected"
                : `${count} controllers connected`;

    controllerStatus.classList.toggle("connected", count > 0);
    controllerHint.hidden = count === 0;
}

// Which controllers belong to a player.
// 1 player: any controller works. 2 players: 1st pad = P1, 2nd pad = P2.
function padsFor(player, pads) {
    if (playerCount === 1) return pads;
    return pads[player.number - 1] ? [pads[player.number - 1]] : [];
}

// Combine keyboard and controller into one direction (-1, 0, 1) and a fire flag.
function readInput(player, pads) {
    let direction = 0;
    let fire = false;

    // Each player only listens to their own keys (in 1 player mode too).
    const set = player.number === 1 ? KEYS.playerOne : KEYS.playerTwo;

    if (keys.has(set.left)) direction--;
    if (keys.has(set.right)) direction++;
    if (keys.has(set.fire)) fire = true;

    for (const pad of padsFor(player, pads)) {
        const stickX = pad.axes[0] || 0;

        if (stickX < -PAD.deadZone || isPressed(pad, PAD.left)) direction--;
        if (stickX > PAD.deadZone || isPressed(pad, PAD.right)) direction++;
        if (PAD.fireButtons.some(i => isPressed(pad, i))) fire = true;
    }

    return { direction: Math.sign(direction), fire };
}

// On the menu / game over screen, controller buttons start or save.
function handleMenuButtons(pads, now) {
    if (running || overlay.classList.contains("hidden") || now < menuReadyAt) return;

    for (const pad of pads) {
        // Name box open: Cross / A saves (type the name on the keyboard first).
        if (!scoreForm.classList.contains("hidden")) {
            if (justPressed(pad, PAD.startOnePlayer)) scoreForm.requestSubmit();
            return;
        }

        if (justPressed(pad, PAD.startTwoPlayers)) {
            startGame(2);
            return;
        }

        if (justPressed(pad, PAD.startOnePlayer)) {
            startGame(1);
            return;
        }
    }
}

// Check controllers every frame, even on the menu.
function pollControllers(now) {
    const pads = connectedPads();

    updateControllerStatus(pads);
    handleMenuButtons(pads, now);
    rememberButtons(pads);

    requestAnimationFrame(pollControllers);
}

window.addEventListener("gamepadconnected", () => updateControllerStatus(connectedPads()));
window.addEventListener("gamepaddisconnected", () => updateControllerStatus(connectedPads()));

/* ---------- Levels ---------- */

// Level settings: which sheet, how many hits, how fast.
function levelInfo() {
    const index = (level - 1) % LEVELS.length;
    const isBoss = level % GAME.bossEvery === 0;

    return {
        ...LEVELS[index],
        sheet: isBoss ? sheets.bosses[index] : sheets.levels[index],
        isBoss,
        hits: isBoss ? level * GAME.bossHitsPerLevel : level,
        speed: isBoss
            ? GAME.bossSpeed + level * 2
            : GAME.enemySpeed + (level - 1) * GAME.enemySpeedPerLevel,
        fireInterval: isBoss
            ? GAME.bossFireInterval
            : Math.max(
                GAME.enemyFireIntervalMin,
                GAME.enemyFireInterval - (level - 1) * GAME.enemyFireStepPerLevel
            )
    };
}

// Bonus seconds for clearing a level: 5 for 1-9, 8 for 10-19, 11 for 20-29...
function timeBonusFor(clearedLevel) {
    return GAME.timeBonus + Math.floor(clearedLevel / 10) * GAME.timeBonusPerTen;
}

// Show a short message over the board.
function showBanner(text, boss = false) {
    levelBanner.textContent = text;
    levelBanner.classList.toggle("boss", boss);
    levelBanner.classList.remove("show");
    void levelBanner.offsetWidth; // restart the CSS animation
    levelBanner.classList.add("show");
}

// Create the enemies for the current level.
function createEnemies() {
    const info = levelInfo();

    if (info.isBoss) {
        createBoss(info);
        return;
    }

    bossBar.classList.add("hidden");
    sizes.enemy = applySheet("enemy", info.sheet, ENEMY_HEIGHT, info.fps);

    const { width, height, loaded } = sizes.enemy;
    const spacingX = width + GAME.enemyGapX;
    const spacingY = height + GAME.enemyGapY;

    const columns = Math.min(
        GAME.enemyColumns,
        Math.max(1, Math.floor((board.clientWidth - width) / spacingX) + 1)
    );

    const formationWidth = (columns - 1) * spacingX + width;
    const startX = Math.max(0, (board.clientWidth - formationWidth) / 2);

    for (let row = 0; row < GAME.enemyRows; row++) {
        for (let col = 0; col < columns; col++) {
            const element = createElement("enemy", enemyContainer, loaded);

            // Start each enemy on a different frame so they don't bob in sync.
            element.style.animationDelay = `${-Math.random() * info.frames / info.fps}s`;

            const enemy = {
                x: startX + col * spacingX,
                y: 30 + row * spacingY,
                width,
                height,
                hits: info.hits,
                maxHits: info.hits,
                hitScale: ENEMY_HITBOX,
                element
            };

            enemies.push(enemy);
            place(element, enemy.x, enemy.y);
        }
    }
}

// Boss level: one giant pumpkin with a health bar and a 3-way shot.
function createBoss(info) {
    sizes.boss = applySheet("boss", info.sheet, GAME.bossHeight, info.fps);
    root.style.setProperty("--boss-color", info.color);

    const { width, height, loaded } = sizes.boss;
    const element = createElement("boss", enemyContainer, loaded);

    const boss = {
        x: (board.clientWidth - width) / 2,
        y: 44, // below the health bar
        width,
        height,
        hits: info.hits,
        maxHits: info.hits,
        hitScale: BOSS_HITBOX,
        isBoss: true,
        element
    };

    enemies.push(boss);
    place(element, boss.x, boss.y);

    bossBarName.textContent = `Giant ${info.name.replace(/s$/, "")}`;
    bossBarFill.style.width = "100%";
    bossBar.classList.remove("hidden");
}

/* ---------- Shooting ---------- */

// A player casts a spell when their cooldown has finished.
function castSpell(player, now) {
    if (now - player.lastCast < GAME.spellCooldown) return;
    player.lastCast = now;

    const { width, height, loaded } = sizes.spell;
    const element = createElement("spell", spellContainer, loaded);

    if (loaded) {
        const candy = sheets.spells[Math.floor(Math.random() * sheets.spells.length)];
        element.style.setProperty("--sheet", `url("${candy.path}")`);
    }

    const spell = {
        x: player.x + (player.width - width) / 2,
        y: player.y - height,
        width,
        height,
        element
    };

    spells.push(spell);
    place(element, spell.x, spell.y);
}

// Drop one enemy seed. vx makes it fly at an angle (used by the boss).
function dropSeed(x, y, vx = 0, big = false) {
    const element = document.createElement("div");
    element.className = big ? "seed big" : "seed";
    spellContainer.append(element);

    const size = big ? 1.6 : 1;

    const seed = {
        x: x - 4 * size,
        y,
        vx,
        width: 8 * size,
        height: 14 * size,
        element
    };

    seeds.push(seed);
    place(element, seed.x, seed.y);
}

// The lowest enemy in a random column shoots. The boss fires a spread.
function enemyShoot() {
    if (enemies.length === 0) return;

    if (enemies[0].isBoss) {
        const boss = enemies[0];
        const x = boss.x + boss.width / 2;
        const y = boss.y + boss.height * 0.8;

        dropSeed(x, y, -GAME.bossSpread, true);
        dropSeed(x, y, 0, true);
        dropSeed(x, y, GAME.bossSpread, true);
        return;
    }

    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    const column = enemies.filter(enemy => Math.abs(enemy.x - shooter.x) < 1);
    const lowest = column.reduce((a, b) => (b.y > a.y ? b : a));

    dropSeed(lowest.x + lowest.width / 2, lowest.y + lowest.height * 0.8);
}

// Create an explosion centered on a spot.
function createExplosion(centerX, centerY) {
    const { width, height, loaded } = sizes.effect;
    const element = createElement("effect", effectContainer, loaded);

    place(element, centerX - width / 2, centerY - height / 2);
    element.addEventListener("animationend", () => element.remove());
}

// The boss goes out with a bunch of explosions.
function bossExplosion(boss) {
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            createExplosion(
                boss.x + Math.random() * boss.width,
                boss.y + Math.random() * boss.height
            );
        }, i * 90);
    }
}

// Briefly flash an element (enemy hit, wizard hit).
function flash(element) {
    element.classList.add("hit");
    clearTimeout(element.flashTimeout);
    element.flashTimeout = setTimeout(() => element.classList.remove("hit"), 120);
}

// Lose a life (health is shared in 2 player mode). Returns true if the game ended.
function loseHealth(player) {
    health = Math.max(0, health - 1);
    healthDisplay.textContent = health;
    if (player) flash(player.element);

    if (health === 0) {
        endGame("Game Over");
        return true;
    }

    return false;
}

/* ---------- Game loop ---------- */

// Count down the level timer.
function updateTimer(dt) {
    timeLeft = Math.max(0, timeLeft - dt * 1000);

    const seconds = Math.ceil(timeLeft / 1000);
    timerDisplay.textContent = seconds;
    timerDisplay.classList.toggle("low", seconds <= 5);

    if (timeLeft <= 0) endGame("Time's Up!");
}

// Move each wizard and fire while their button is held.
function updatePlayers(dt, now) {
    const pads = connectedPads();

    for (const player of activePlayers()) {
        const input = readInput(player, pads);

        player.x += input.direction * GAME.playerSpeed * dt;
        player.x = Math.max(0, Math.min(board.clientWidth - player.width, player.x));

        if (input.fire) castSpell(player, now);

        place(player.element, player.x, player.y);
    }
}

// Move enemies horizontally and descend when they reach an edge.
function updateEnemies(dt, now) {
    if (enemies.length === 0) return;

    const info = levelInfo();
    const movement = info.speed * enemyDirection * dt;

    const leftEdge = Math.min(...enemies.map(enemy => enemy.x));
    const rightEdge = Math.max(...enemies.map(enemy => enemy.x + enemy.width));

    const hitEdge =
        leftEdge + movement <= 0 ||
        rightEdge + movement >= board.clientWidth;

    if (hitEdge) enemyDirection *= -1;

    for (const enemy of enemies) {
        if (hitEdge) enemy.y += GAME.enemyDrop;
        else enemy.x += movement;

        place(enemy.element, enemy.x, enemy.y);
    }

    if (now >= nextEnemyShot) {
        enemyShoot();
        nextEnemyShot = now + info.fireInterval * (0.6 + Math.random() * 0.8);
    }

    // The defensive line is the top of the wizards.
    const lineY = Math.min(...activePlayers().map(player => player.y));

    if (enemies.some(enemy => enemy.y + enemy.height * 0.85 >= lineY)) {
        if (!loseHealth(null)) resetWave();
    }
}

// Move spells and check for enemy hits.
function updateSpells(dt) {
    for (let i = spells.length - 1; i >= 0; i--) {
        const spell = spells[i];

        spell.y -= GAME.spellSpeed * dt;
        place(spell.element, spell.x, spell.y);

        let removeSpell = spell.y + spell.height < 0;

        if (!removeSpell) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];

                if (!intersects(spell, hitbox(enemy, enemy.hitScale))) continue;

                enemy.hits--;
                score += GAME.pointsPerHit;
                removeSpell = true;

                if (enemy.hits <= 0) {
                    score += GAME.pointsPerHit * level * (enemy.isBoss ? 20 : 1);

                    if (enemy.isBoss) bossExplosion(enemy);
                    else createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

                    enemy.element.remove();
                    enemies.splice(j, 1);
                } else {
                    flash(enemy.element);

                    if (enemy.isBoss) {
                        bossBarFill.style.width = `${(enemy.hits / enemy.maxHits) * 100}%`;
                    } else {
                        enemy.element.style.opacity = 0.45 + 0.55 * (enemy.hits / enemy.maxHits);
                    }
                }

                scoreDisplay.textContent = score;
                break;
            }
        }

        if (removeSpell) {
            spell.element.remove();
            spells.splice(i, 1);
        }
    }

    if (enemies.length === 0) nextLevel();
}

// Move enemy seeds and check for wizard hits.
function updateSeeds(dt) {
    const targets = activePlayers().map(player => ({ player, box: hitbox(player, 0.75) }));

    for (let i = seeds.length - 1; i >= 0; i--) {
        const seed = seeds[i];

        seed.x += seed.vx * dt;
        seed.y += GAME.seedSpeed * dt;
        place(seed.element, seed.x, seed.y);

        const hitTarget = targets.find(target => intersects(seed, target.box));
        const offBoard =
            seed.y > board.clientHeight ||
            seed.x + seed.width < 0 ||
            seed.x > board.clientWidth;

        if (hitTarget || offBoard) {
            seed.element.remove();
            seeds.splice(i, 1);
        }

        if (hitTarget && loseHealth(hitTarget.player)) return;
    }
}

function clearShots() {
    spellContainer.replaceChildren();
    spells = [];
    seeds = [];
}

// Level cleared: add bonus time, then start the next, tougher level.
function nextLevel() {
    const bonus = timeBonusFor(level);
    timeLeft += bonus * 1000;

    level++;
    levelDisplay.textContent = level;
    enemyDirection = 1;
    clearShots();
    createEnemies();

    const info = levelInfo();

    if (info.isBoss) {
        showBanner(`Boss! Giant ${info.name.replace(/s$/, "")} (+${bonus}s)`, true);
    } else {
        showBanner(`Level ${level}: ${info.name} take ${info.hits} hits (+${bonus}s)`);
    }
}

// Reset enemies when they reach the wizards' defensive line.
function resetWave() {
    enemyContainer.replaceChildren();
    enemies = [];
    enemyDirection = 1;
    clearShots();
    createEnemies();
}

function gameLoop(now) {
    if (!running) return;

    const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
    lastTime = now;

    updateTimer(dt);
    if (running) updatePlayers(dt, now);
    if (running) updateEnemies(dt, now);
    if (running) updateSpells(dt);
    if (running) updateSeeds(dt);

    if (running) animationFrameId = requestAnimationFrame(gameLoop);
}

/* ---------- High scores ---------- */

// Read the saved high scores (an empty list if there are none yet).
function loadHighScores() {
    try {
        const saved = JSON.parse(localStorage.getItem(HIGH_SCORE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveHighScores(highScores) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
    } catch {
        // Storage can be blocked (private window). The list just won't persist.
    }
}

// Does this score make the Top 10?
function isHighScore(newScore) {
    const highScores = loadHighScores();

    return (
        newScore > 0 &&
        (highScores.length < MAX_HIGH_SCORES ||
            newScore > highScores[highScores.length - 1].score)
    );
}

// Show the Top 10. "newEntry" gets highlighted right after it's saved.
function renderHighScores(newEntry = null) {
    const highScores = loadHighScores();

    highScoreList.replaceChildren();
    noScoresMessage.classList.toggle("hidden", highScores.length > 0);

    for (const entry of highScores) {
        const item = document.createElement("li");
        if (newEntry && entry.id === newEntry.id) item.classList.add("new");

        const name = document.createElement("span");
        name.className = "score-name";
        name.textContent = entry.name; // textContent, so names can't inject HTML

        const details = document.createElement("span");
        details.className = "score-points";
        details.textContent = `${entry.score} (Lv ${entry.level}${entry.players === 2 ? ", 2P" : ""})`;

        item.append(name, details);
        highScoreList.append(item);
    }
}

// Save the player's (or team's) name and score, then show the updated list.
scoreForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const entry = {
        id: Date.now(),
        name: playerNameInput.value.trim() || "Anonymous",
        score,
        level,
        players: playerCount
    };

    const highScores = loadHighScores();
    highScores.push(entry);
    highScores.sort((a, b) => b.score - a.score);
    saveHighScores(highScores.slice(0, MAX_HIGH_SCORES));

    scoreForm.classList.add("hidden");
    renderHighScores(entry);
    startButton.focus();
});

/* ---------- Start / end ---------- */

// Stop gameplay and display the final score.
function endGame(title) {
    if (!running) return;

    running = false;
    keys.clear();

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    overlayTitle.textContent = title;
    overlayMessage.textContent = `You reached level ${level}. Final Score: ${score}`;
    startButton.textContent = "1 Player";
    startTwoButton.textContent = "2 Players";

    overlay.classList.remove("hidden");
    renderHighScores();

    // Ignore controller buttons for a moment so a held fire button
    // doesn't skip the name box or start a new game by accident.
    menuReadyAt = performance.now() + 1000;

    if (isHighScore(score)) {
        playerNameLabel.textContent = playerCount === 2
            ? "New high score! Enter your team name:"
            : "New high score! Enter your name:";
        playerNameInput.value = "";
        scoreForm.classList.remove("hidden");
        playerNameInput.focus();
    }
}

// Reset the game and start at level 1 with 1 or 2 players.
async function startGame(count = 1) {
    if (running) return;

    await spritesReady;

    playerCount = count;
    scoreForm.classList.add("hidden");
    enemyContainer.replaceChildren();
    effectContainer.replaceChildren();
    clearShots();

    enemies = [];
    keys.clear();

    score = 0;
    health = GAME.startingHealth;
    enemyDirection = 1;
    level = 1;
    timeLeft = GAME.startTime * 1000;

    scoreDisplay.textContent = score;
    healthDisplay.textContent = health;
    levelDisplay.textContent = level;
    timerDisplay.textContent = GAME.startTime;
    timerDisplay.classList.remove("low");

    // 1 player starts in the middle. 2 players start at 1/3 and 2/3.
    players.forEach((player, i) => {
        const size = sizes[player.sizeKey];
        const active = i < playerCount;

        player.width = size.width;
        player.height = size.height;
        player.lastCast = -Infinity;
        player.x = playerCount === 1
            ? (board.clientWidth - player.width) / 2
            : (board.clientWidth * (i + 1)) / 3 - player.width / 2;
        player.y = board.clientHeight - player.height - 10;

        player.element.hidden = !active;
        player.element.classList.toggle("placeholder", !size.loaded);
        place(player.element, player.x, player.y);
    });

    createEnemies();
    overlay.classList.add("hidden");
    showBanner(`Level 1: ${levelInfo().name}`);

    lastTime = performance.now();
    nextEnemyShot = lastTime + 1500;
    running = true;

    animationFrameId = requestAnimationFrame(gameLoop);
}

/* ---------- Keyboard ---------- */

// Every key the game uses (so the page doesn't scroll when they're pressed).
const GAME_KEYS = Object.values(KEYS).flatMap(set => Object.values(set));

window.addEventListener("keydown", (event) => {
    // Let people type (including spaces) in the name box.
    if (event.target === playerNameInput) return;
    if (!running) return;

    if (GAME_KEYS.includes(event.code)) event.preventDefault();

    keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
});

// Clear held keys when the browser loses focus.
window.addEventListener("blur", () => keys.clear());

startButton.addEventListener("click", () => startGame(1));
startTwoButton.addEventListener("click", () => startGame(2));

// Show the saved scores on the start screen and start watching for controllers.
renderHighScores();
requestAnimationFrame(pollControllers);
