// ================================
// DREAMPLAY AI - RUNNER ENGINE
// ================================

let runner;
let obstacles = [];
let runnerScore = 0;
let runnerGameOver = false;
let gravity = 0.6;
let velocityY = 0;
let runnerSpeed = 4;

const canvas = document.getElementById("runnerCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function startGame(schemaInput) {

    runner = {
        x: 80,
        y: canvas.height - 100,
        width: 50,
        height: 50
    };

    obstacles = [];
    runnerScore = 0;
    runnerGameOver = false;
    velocityY = 0;
    runnerSpeed = 4;

    if (window.__spawnInterval) clearInterval(window.__spawnInterval);
    window.__spawnInterval = setInterval(spawnObstacle, 1500);

    runnerLoop();
}

function spawnObstacle() {

    obstacles.push({
        x: canvas.width,
        y: canvas.height - 80,
        width: 40,
        height: 40
    });
}

function update() {

    if (runnerGameOver) return;

    runnerScore++;

    runnerSpeed = 4 + Math.floor(runnerScore / 200);

    // Gravity
    velocityY += gravity;
    runner.y += velocityY;

    if (runner.y > canvas.height - 100) {
        runner.y = canvas.height - 100;
        velocityY = 0;
    }

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {

        obstacles[i].x -= runnerSpeed;

        if (isColliding(runner, obstacles[i])) {
            runnerGameOver = true;
        }

        if (obstacles[i].x < -50) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "cyan";
    ctx.fillRect(runner.x, runner.y, runner.width, runner.height);

    ctx.fillStyle = "red";
    obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.width, o.height));

    ctx.fillStyle = "white";
    ctx.fillText("Score: " + runnerScore, 20, 40);

    if (runnerGameOver) {
        ctx.fillStyle = "yellow";
        ctx.font = "40px Arial";
        ctx.fillText("GAME OVER", canvas.width / 2 - 120, canvas.height / 2);
    }
}

function runnerLoop() {
    update();
    draw();
    if (!runnerGameOver) requestAnimationFrame(runnerLoop);
}

document.addEventListener("keydown", e => {
    if (e.code === "Space" && velocityY === 0) {
        velocityY = -12;
    }
});

function isColliding(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

window.startGame = startGame;

console.log("Runner Engine Ready");
