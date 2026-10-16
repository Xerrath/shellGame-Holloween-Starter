
const GAME = {
    duration: 30,
    playerSpeed: 260,
    spellSpeed: 440,
    spellCooldown: 280,
    enemySpeed: 55,
    enemyDrop: 18,
    enemyRows: 3,
    enemyColumns: 7,
    enemySpacingX: 54,
    enemySpacingY: 48,
    startingHealth: 3,
    pointsPerEnemy: 100
};

const SPRITE_SIZE = 32;

// Configure 32x32 sprite sheet frames and animation speeds.
const SPRITES = {
    wizard: {
        path: "./assets/sprites/wizard.png",
        animations: {
            idle: { row: 0, frames: 4, fps: 6 },
            walk: { row: 1, frames: 6, fps: 10 },
            cast: { row: 2, frames: 4, fps: 12 }
        }
    },
    enemy: {
        path: "./assets/sprites/enemies.png",
        animations: {
            move: { row: 0, frames: 4, fps: 5 }
        }
    },
    spell: {
        path: "./assets/sprites/spells.png",
        animations: {
            fly: { row: 0, frames: 4, fps: 12 }
        }
    },
    effect: {
        path: "./assets/sprites/effects.png",
        animations: {
            explode: { row: 0, frames: 6, fps: 15 }
        }
    }
};

// Handle sprite sheet animations and CSS placeholders.
class Sprite {
    constructor(element, config, animation = null) {
        this.element = element;
        this.config = config;
        this.animation = null;
        this.frame = 0;
        this.elapsed = 0;
        this.loop = true;
        this.finished = false;

        this.element.style.width = `${SPRITE_SIZE}px`;
        this.element.style.height = `${SPRITE_SIZE}px`;
        this.element.classList.add("placeholder");
        this.element.style.backgroundImage = "none";

        const image = new Image();

        image.onload = () => {
            this.element.classList.remove("placeholder");
            this.element.style.backgroundImage = `url("${config.path}")`;
            this.render();
        };

        image.onerror = () => {
            this.element.classList.add("placeholder");
            this.element.style.backgroundImage = "none";
        };

        image.src = config.path;

        if (animation) this.play(animation);
    }

    play(name, loop = true) {
        if (this.animation === name && !this.finished) return;

        this.animation = name;
        this.frame = 0;
        this.elapsed = 0;
        this.loop = loop;
        this.finished = false;

        this.render();
    }

    update(deltaTime) {
        if (this.finished || !this.animation) return;

        const animation = this.config.animations[this.animation];
        const frameDuration = 1000 / animation.fps;

        this.elapsed += deltaTime;

        while (this.elapsed >= frameDuration) {
            this.elapsed -= frameDuration;
            this.frame++;

            if (this.frame >= animation.frames) {
                if (this.loop) {
                    this.frame = 0;
                } else {
                    this.frame = animation.frames - 1;
                    this.finished = true;
                    break;
                }
            }
        }

        this.render();
    }

    render() {
        if (!this.animation) return;

        const animation = this.config.animations[this.animation];

        this.element.style.backgroundPosition =
            `${-this.frame * SPRITE_SIZE}px ${-animation.row * SPRITE_SIZE}px`;
    }
}

// Get the game elements from the HTML.
const board = document.querySelector("#game-board");
const wizardElement = document.querySelector("#wizard");
const enemyContainer = document.querySelector("#enemy-container");
const spellContainer = document.querySelector("#spell-container");
const effectContainer = document.querySelector("#effect-container");
const scoreDisplay = document.querySelector("#score");
const timerDisplay = document.querySelector("#timer");
const healthDisplay = document.querySelector("#health");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const startButton = document.querySelector("#start-button");

// Store the current game state.
const keys = new Set();

let enemies = [];
let spells = [];
let effects = [];
let score = 0;
let health = GAME.startingHealth;
let running = false;
let lastTime = 0;
let lastCast = -Infinity;
let enemyDirection = 1;
let roundEndTime = 0;
let wave = 1;
let animationFrameId = null;
let roundTimeoutId = null;

const wizard = {
    x: 0,
    y: 0,
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
    sprite: new Sprite(wizardElement, SPRITES.wizard, "idle")
};

// Position an element inside the game board.
function place(element, x, y) {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
}

// Create a new game element.
function createElement(className, container) {
    const element = document.createElement("div");
    element.className = `sprite ${className} placeholder`;
    container.append(element);
    return element;
}

// Check whether two objects overlap.
function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// Create a formation of enemies.
function createEnemies() {
    const columns = Math.min(
        GAME.enemyColumns,
        Math.max(1, Math.floor((board.clientWidth - SPRITE_SIZE) / GAME.enemySpacingX) + 1)
    );

    const formationWidth = (columns - 1) * GAME.enemySpacingX + SPRITE_SIZE;
    const startX = Math.max(0, (board.clientWidth - formationWidth) / 2);

    for (let row = 0; row < GAME.enemyRows; row++) {
        for (let col = 0; col < columns; col++) {
            const element = createElement("enemy", enemyContainer);

            const enemy = {
                x: startX + col * GAME.enemySpacingX,
                y: 35 + row * GAME.enemySpacingY,
                width: SPRITE_SIZE,
                height: SPRITE_SIZE,
                element,
                sprite: new Sprite(element, SPRITES.enemy, "move")
            };

            enemies.push(enemy);
            place(element, enemy.x, enemy.y);
        }
    }
}

// Cast a spell when the cooldown has finished.
function castSpell(now) {
    if (!running || now >= roundEndTime) return;
    if (now - lastCast < GAME.spellCooldown) return;

    lastCast = now;
    wizard.sprite.play("cast", false);

    const element = createElement("spell", spellContainer);

    const spell = {
        x: wizard.x,
        y: wizard.y - 28,
        width: SPRITE_SIZE,
        height: SPRITE_SIZE,
        element,
        sprite: new Sprite(element, SPRITES.spell, "fly")
    };

    spells.push(spell);
    place(element, spell.x, spell.y);
}

// Create an explosion when an enemy is destroyed.
function createExplosion(x, y) {
    const element = createElement("effect", effectContainer);

    const effect = {
        x,
        y,
        element,
        sprite: new Sprite(element, SPRITES.effect, "explode")
    };

    effects.push(effect);
    place(element, x, y);
}

// Move the wizard and update its animation.
function updateWizard(dt, now) {
    let direction = 0;

    if (keys.has("arrowleft") || keys.has("a")) direction--;
    if (keys.has("arrowright") || keys.has("d")) direction++;

    wizard.x += direction * GAME.playerSpeed * dt;
    wizard.x = Math.max(0, Math.min(board.clientWidth - wizard.width, wizard.x));

    if (keys.has("space")) castSpell(now);

    if (wizard.sprite.animation !== "cast" || wizard.sprite.finished) {
        wizard.sprite.play(direction !== 0 ? "walk" : "idle");
    }

    wizard.sprite.update(dt * 1000);

    if (wizard.sprite.animation === "cast" && wizard.sprite.finished) {
        wizard.sprite.play(direction !== 0 ? "walk" : "idle");
    }

    place(wizardElement, wizard.x, wizard.y);
}

// Move enemies horizontally and descend when they reach an edge.
function updateEnemies(dt) {
    if (enemies.length === 0) return;

    const speed = GAME.enemySpeed + (wave - 1) * 8;
    const movement = speed * enemyDirection * dt;

    const leftEdge = Math.min(...enemies.map(enemy => enemy.x));
    const rightEdge = Math.max(...enemies.map(enemy => enemy.x + enemy.width));

    const hitEdge =
        leftEdge + movement <= 0 ||
        rightEdge + movement >= board.clientWidth;

    if (hitEdge) {
        enemyDirection *= -1;
    }

    for (const enemy of enemies) {
        enemy.x += hitEdge ? 0 : movement;

        if (hitEdge) enemy.y += GAME.enemyDrop;

        enemy.sprite.update(dt * 1000);
        place(enemy.element, enemy.x, enemy.y);
    }

    if (enemies.some(enemy => enemy.y + enemy.height >= wizard.y)) {
        health = Math.max(0, health - 1);
        healthDisplay.textContent = health;
        resetWave();
    }
}

// Move spells and check for enemy collisions.
function updateSpells(dt) {
    for (let i = spells.length - 1; i >= 0; i--) {
        const spell = spells[i];

        spell.y -= GAME.spellSpeed * dt;
        spell.sprite.update(dt * 1000);
        place(spell.element, spell.x, spell.y);

        let removeSpell = spell.y + spell.height < 0;

        if (!removeSpell) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];

                if (!intersects(spell, enemy)) continue;

                createExplosion(enemy.x, enemy.y);

                enemy.element.remove();
                enemies.splice(j, 1);

                score += GAME.pointsPerEnemy;
                scoreDisplay.textContent = score;

                removeSpell = true;
                break;
            }
        }

        if (removeSpell) {
            spell.element.remove();
            spells.splice(i, 1);
        }
    }

    if (enemies.length === 0) {
        wave++;
        enemyDirection = 1;
        createEnemies();
    }
}

// Remove explosions when their animations finish.
function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];

        effect.sprite.update(dt * 1000);

        if (effect.sprite.finished) {
            effect.element.remove();
            effects.splice(i, 1);
        }
    }
}

// Reset enemies when they reach the wizard's defensive line.
function resetWave() {
    enemyContainer.replaceChildren();
    spellContainer.replaceChildren();

    enemies = [];
    spells = [];
    enemyDirection = 1;

    createEnemies();
}

// Run the game until the 30-second deadline.
function gameLoop(now) {
    if (!running) return;

    const remaining = Math.max(0, roundEndTime - now);
    timerDisplay.textContent = Math.ceil(remaining / 1000);

    if (remaining <= 0) {
        endGame();
        return;
    }

    const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
    lastTime = now;

    updateWizard(dt, now);
    updateEnemies(dt);
    updateSpells(dt);
    updateEffects(dt);

    if (running) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Stop gameplay and display the final score.
function endGame() {
    if (!running) return;

    running = false;
    keys.clear();

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (roundTimeoutId !== null) {
        clearTimeout(roundTimeoutId);
        roundTimeoutId = null;
    }

    timerDisplay.textContent = 0;
    overlayTitle.textContent = "Time's Up!";
    overlayMessage.textContent = `Final Score: ${score}`;
    startButton.textContent = "Play Again";

    overlay.classList.remove("hidden");
}

// Reset the game and start a new 30-second round.
function startGame() {
    if (running) return;

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (roundTimeoutId !== null) {
        clearTimeout(roundTimeoutId);
        roundTimeoutId = null;
    }

    enemyContainer.replaceChildren();
    spellContainer.replaceChildren();
    effectContainer.replaceChildren();

    enemies = [];
    spells = [];
    effects = [];

    keys.clear();

    score = 0;
    health = GAME.startingHealth;
    enemyDirection = 1;
    wave = 1;
    lastCast = -Infinity;

    scoreDisplay.textContent = score;
    healthDisplay.textContent = health;
    timerDisplay.textContent = GAME.duration;

    wizard.x = Math.max(0, (board.clientWidth - wizard.width) / 2);
    wizard.y = board.clientHeight - wizard.height - 20;

    wizard.sprite.play("idle");
    place(wizardElement, wizard.x, wizard.y);

    createEnemies();
    overlay.classList.add("hidden");

    lastTime = performance.now();
    roundEndTime = lastTime + GAME.duration * 1000;
    running = true;

    roundTimeoutId = setTimeout(endGame, GAME.duration * 1000);
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Handle movement and casting keys.
window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (["arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
    }

    if (!running) return;

    keys.add(key === " " ? "space" : key);
});

window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    keys.delete(key === " " ? "space" : key);
});

// Clear held keys when the browser loses focus.
window.addEventListener("blur", () => keys.clear());

// Start the game when the button is clicked.
startButton.addEventListener("click", startGame);