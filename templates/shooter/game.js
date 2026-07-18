/* ==========================================
   DreamPlay AI - Universal Engine Core
   ========================================== */

let schema = {};
let ENTITIES = [];
let score = 0;
let isGameOver = false;
let difficultyMultiplier = 1;

const canvas = document.getElementById("shooterCanvas");
const ctx = canvas.getContext("2d");

/* ======================
   Canvas Resize
====================== */
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ======================
   Entity Factory
====================== */
function createEntity(role, type) {

    return {
        role,
        type,
        x: Math.random() * (canvas.width - 60),
        y: role === "player" ? canvas.height - 100 : -60,
        width: 60,
        height: 60,
        speed: 2 * difficultyMultiplier,
        hp: 1
    };
}

/* ======================
   Difficulty Scaling
====================== */
function updateDifficulty() {
    difficultyMultiplier = 1 + Math.floor(score / 10) * 0.2;
}

/* ======================
   Spawn System
====================== */
function spawnFromSchema() {

    if (!schema.entities) return;

    for (const role in schema.entities) {
        if (role === "target" || role === "enemy" || role === "obstacle") {
            ENTITIES.push(createEntity(role, schema.entities[role]));
        }
    }
}

/* ======================
   Movement Engine
====================== */
function applyMovement(entity) {

    if (!schema.mechanics) return;

    if (schema.mechanics.includes("horizontal_spawn")) {
        entity.y += entity.speed;
    }

    if (schema.mechanics.includes("zigzag")) {
        entity.y += entity.speed;
        entity.x += Math.sin(Date.now() * 0.01) * 3;
    }

    if (schema.mechanics.includes("vertical_fall")) {
        entity.y += entity.speed * 1.5;
    }
}

/* ======================
   Rule Engine
====================== */
function applyRules(entity) {

    if (!schema.rules) return;

    if (schema.rules.includes("enemy_bottom=game_over")) {
        if (entity.y + entity.height >= canvas.height) {
            gameOver();
        }
    }
}

/* ======================
   Update Loop
====================== */
function update() {

    if (isGameOver) return;

    updateDifficulty();

    ENTITIES.forEach((entity, index) => {

        if (entity.role !== "player") {
            applyMovement(entity);
            applyRules(entity);
        }

        // Remove off screen
        if (entity.y > canvas.height + 100) {
            ENTITIES.splice(index, 1);
        }
    });
}

/* ======================
   Draw Engine
====================== */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ENTITIES.forEach(entity => {

        if (entity.role === "player") {
            ctx.fillStyle = "lime";
        } else if (entity.role === "enemy" || entity.role === "target") {
            ctx.fillStyle = "red";
        } else {
            ctx.fillStyle = "yellow";
        }

        ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
    });

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 20, 30);

    if (isGameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "left";
    }
}

/* ======================
   Game Loop
====================== */
function gameLoop() {
    update();
    draw();
    if (!isGameOver) requestAnimationFrame(gameLoop);
}

/* ======================
   Controls
====================== */
document.addEventListener("keydown", e => {

    if (!schema.entities || !schema.entities.player) return;

    const player = ENTITIES.find(e => e.role === "player");
    if (!player) return;

    if (e.key === "ArrowLeft") player.x -= 15;
    if (e.key === "ArrowRight") player.x += 15;
});

/* ======================
   Game Over
====================== */
function gameOver() {
    isGameOver = true;
}

/* ======================
   Start Game
====================== */
function startGame(newSchema) {

    schema = newSchema;
    ENTITIES = [];
    score = 0;
    isGameOver = false;
    difficultyMultiplier = 1;

    if (schema.entities && schema.entities.player) {
        ENTITIES.push(createEntity("player", schema.entities.player));
    }

    setInterval(spawnFromSchema, 1500);

    gameLoop();
}

window.startGame = startGame;

console.log(" Universal Engine Loaded");
