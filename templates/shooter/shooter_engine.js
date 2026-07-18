

let schema, player;
let enemies = [], bullets = [], enemyBullets = [];
let score = 0, isGameOver = false, timeElapsed = 0;
let missedEnemies = 0;
const MAX_MISSED = 5;

// Mouse aim (used in survival / stationary_sniper)
let mouseX = 0, mouseY = 0;

const canvas = document.getElementById("shooterCanvas");
const ctx    = canvas.getContext("2d");

/* ─── RESIZE ─── */
function resizeCanvas() {
    const W = canvas.parentElement.clientWidth  || window.innerWidth  || 900;
    const H = canvas.parentElement.clientHeight || window.innerHeight || 600;
    if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
    }
}
resizeCanvas();
window.addEventListener("resize", () => { resizeCanvas(); if (player) repositionPlayer(); });

if (typeof ASSETS === "undefined") var ASSETS = {};
let spawnTimer, keys = {};

/* ─── VARIATION HELPERS ─── */
function getVariation() {
    // core_loop drives gameplay variation
    return (schema && schema.core_loop) || "arcade_wave";
}
function isSurvival()   { const v = getVariation(); return v === "survival"; }
function isSniper()     { const v = getVariation(); return v === "stationary_sniper" || (schema && schema.player_mode === "stationary_sniper"); }
function isBossArena()  { return getVariation() === "boss_arena"; }
function isFreeMove()   { const v = getVariation(); return v === "free_move_arena" || isSurvival(); }
function hasBottomPenalty() { return !isSurvival() && !isSniper() && !isBossArena(); }
function uses360Aim()   { return isSurvival() || isSniper(); }

/* ─── DAMAGE / BEHAVIOR / ATTACK MAPS ─── */
const DAMAGE_MAP = {
    zombie:15, monster:20, thief:12, bandit:12, soldier:15,
    robot:18, drone:14, dragon:35, boss:40,
    bird:10, pigeon:8, duck:8
};
const BEHAVIOR_MAP = {
    bird:"flying", pigeon:"flying", duck:"flying",
    zombie:"slow_chase", monster:"slow_chase",
    robot:"dodge", drone:"zigzag",
    bottle:"static", target:"static",
    boss:"boss_pattern", dragon:"swoop"
};
const ATTACK_MAP = {
    bird:"none", pigeon:"none", duck:"none",
    zombie:"melee", monster:"melee",
    thief:"gun", bandit:"gun", soldier:"gun",
    robot:"laser", drone:"laser",
    boss:"boss_attack", dragon:"fireball"
};
const BULLET_SIZES = {
    bullet_small:{w:6,h:14}, bullet_rifle:{w:5,h:20},
    bullet_sniper:{w:4,h:28}, laser:{w:3,h:24},
    pellet:{w:5,h:8}, arrow:{w:4,h:18}, default:{w:6,h:14}
};
function bSize(t) { return BULLET_SIZES[t] || BULLET_SIZES.default; }

/* ─── START ─── */
async function startGame(schemaInput) {
    resizeCanvas();

    // Show loading status
    if (window.setLoadingStatus) window.setLoadingStatus("Generating AI assets... please wait", 20);

    const res = await loadAssets(schemaInput);
    schema = res.schemaUsed || schemaInput;
    ASSETS = res.assets;

    if (window.setLoadingStatus) window.setLoadingStatus("Starting game...", 95);
    await new Promise(r => setTimeout(r, 200)); // brief pause for status to show

    if (window.hideLoadingScreen) window.hideLoadingScreen();

    resetGame();
    repositionPlayer();
    configureGameplay();
    canvas.focus();
    gameLoop();
}
window.startGame = startGame;

/* ─── RESET ─── */
function resetGame() {
    enemies=[]; bullets=[]; enemyBullets=[];
    score=0; timeElapsed=0; isGameOver=false; missedEnemies=0;
    clearInterval(spawnTimer);
    player = {
        x: canvas.width/2 - 30, y: canvas.height - 90,
        width:60, height:60, speed:5,
        maxHealth:100, health:100,
        angle: -Math.PI/2   // default aim = up
    };
}

function repositionPlayer() {
    if (!player) return;
    if (isSniper()) {
        // Sniper: center of canvas
        player.x = canvas.width/2 - player.width/2;
        player.y = canvas.height/2 - player.height/2;
        player.speed = 0;
    } else if (isSurvival()) {
        // Survival: center, can move
        player.x = canvas.width/2 - player.width/2;
        player.y = canvas.height/2 - player.height/2;
        player.speed = 4;
    } else {
        // Default: bottom center
        player.x = canvas.width/2 - player.width/2;
        player.y = canvas.height - 90;
        player.speed = isFreeMove() ? 4 : 5;
    }
}

/* ─── GAMEPLAY CONFIG ─── */
function configureGameplay() {
    clearInterval(spawnTimer);
    if (isBossArena()) { spawnEnemy(true); return; }
    const interval = isSurvival() ? 800 : 1200;
    spawnTimer = setInterval(() => spawnEnemy(false), interval);
}

/* ─── SPAWN ENEMY ─── */
function spawnEnemy(isBoss) {
    if (isGameOver) return;
    const etype = (schema && schema.enemy) || "bird";
    const behavior = isSurvival() ? "slow_chase"
                   : (BEHAVIOR_MAP[etype] || "flying");
    const healthScale = 1 + score/200;

    let x, y;
    if (isSurvival() || isSniper()) {
        // Enemies spawn from ALL 4 edges randomly
        const side = Math.floor(Math.random()*4);
        if (side===0) { x=Math.random()*canvas.width;  y=-60; }           // top
        else if (side===1) { x=canvas.width+20;         y=Math.random()*canvas.height; } // right
        else if (side===2) { x=Math.random()*canvas.width;  y=canvas.height+20; }        // bottom
        else               { x=-60;                     y=Math.random()*canvas.height; } // left
    } else {
        x = Math.random() * Math.max(10, canvas.width-60);
        y = isBoss ? 50 : -70;
    }

    enemies.push({
        x, y,
        width:  isBoss ? 200 : 60,
        height: isBoss ? 200 : 60,
        enemyType: etype, behavior,
        speed: isBoss ? 1 : (isSurvival() ? 1.2+Math.random()*0.8 : 1.5+Math.random()),
        health: isBoss ? 300 : 20*healthScale,
        phase: 1
    });
}

/* ─── UPDATE ─── */
function update() {
    if (isGameOver) return;
    timeElapsed += 1/60;

    // Update aim angle from mouse in 360° modes
    if (uses360Aim()) {
        const cx = player.x + player.width/2;
        const cy = player.y + player.height/2;
        player.angle = Math.atan2(mouseY - cy, mouseX - cx);
    } else {
        player.angle = -Math.PI/2; // always aim up
    }

    if (!isSniper()) updatePlayerMovement();
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    checkObjectives();
}

/* ─── PLAYER MOVEMENT ─── */
function updatePlayerMovement() {
    const spd = player.speed;
    if (isFreeMove() || isSurvival()) {
        // All 4 directions
        if (keys["ArrowLeft"]  || keys["KeyA"]) player.x -= spd;
        if (keys["ArrowRight"] || keys["KeyD"]) player.x += spd;
        if (keys["ArrowUp"]    || keys["KeyW"]) player.y -= spd;
        if (keys["ArrowDown"]  || keys["KeyS"]) player.y += spd;
    } else {
        // Bottom fixed: left/right only
        if (keys["ArrowLeft"]  || keys["KeyA"]) player.x -= spd;
        if (keys["ArrowRight"] || keys["KeyD"]) player.x += spd;
    }
    // Clamp to canvas
    player.x = Math.max(0, Math.min(canvas.width  - player.width,  player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

/* ─── BULLETS ─── */
function updateBullets() {
    for (let i = bullets.length-1; i >= 0; i--) {
        const b = bullets[i];
        if (uses360Aim()) {
            // Directional bullets
            b.x += Math.cos(b.angle) * b.speed;
            b.y += Math.sin(b.angle) * b.speed;
        } else {
            // Upward bullets only
            const speeds = {laser:25,bullet_sniper:32,bullet_rifle:26,bullet_small:18,pellet:16,arrow:12};
            const spd = speeds[b.type] || 15;
            if (b.type==="pellet") { b.y -= spd; b.x += b.spread; }
            else if (b.type==="arrow") { b.velocityY = (b.velocityY||12)-0.3; b.y -= b.velocityY; b.x += (b.curve||0); }
            else b.y -= spd;
        }
        // Remove if off screen
        if (b.x < -50 || b.x > canvas.width+50 || b.y < -50 || b.y > canvas.height+50)
            bullets.splice(i, 1);
    }
}

/* ─── ENEMIES ─── */
function updateEnemies() {
    for (let i = enemies.length-1; i >= 0; i--) {
        const e = enemies[i];
        moveEnemy(e);
        enemyAttack(e);

        // Skip dying enemies (let death animation finish)
        if (e.dying) {
            if (Date.now() - e.dieTime > 500) enemies.splice(i, 1);
            continue;
        }

        // Bullet hits enemy
        for (let j = bullets.length-1; j >= 0; j--) {
            if (isColliding(bullets[j], e)) {
                e.health -= 10;
                e.hitTime = Date.now();  // trigger hit flash
                bullets.splice(j, 1);
            }
        }

        // Boss phase
        if (e.enemyType==="boss" && e.health<150 && e.phase===1) { e.phase=2; e.speed=2; }

        // Enemy dead → start death animation
        if (e.health <= 0) {
            score += 20;
            e.dying  = true;
            e.dieTime = Date.now();
            continue;
        }

        // Enemy touches player → damage
        if (isColliding(player, e)) {
            player.health -= (DAMAGE_MAP[e.enemyType] || 10);
            enemies.splice(i, 1);
            if (player.health <= 0) { triggerGameOver(); return; }
            continue;
        }

        // Bottom exit penalty — ONLY for non-survival/non-sniper modes
        if (hasBottomPenalty() && e.y > canvas.height + 20) {
            enemies.splice(i, 1);
            missedEnemies++;
            player.health -= 15;
            if (player.health <= 0 || missedEnemies >= MAX_MISSED) { triggerGameOver(); return; }
            continue;
        }

        // Survival/sniper: just remove enemies that go far off screen
        if (!hasBottomPenalty()) {
            const pad = 150;
            if (e.x < -pad || e.x > canvas.width+pad || e.y < -pad || e.y > canvas.height+pad)
                enemies.splice(i, 1);
        }
    }
}

/* ─── ENEMY MOVEMENT ─── */
function moveEnemy(e) {
    switch (e.behavior) {
        case "slow_chase": {
            // Chase player directly — used in survival
            const cx = player.x + player.width/2;
            const cy = player.y + player.height/2;
            const dx = cx - (e.x + e.width/2);
            const dy = cy - (e.y + e.height/2);
            const d  = Math.sqrt(dx*dx + dy*dy);
            if (d > 0) { e.x += (dx/d)*e.speed; e.y += (dy/d)*e.speed; }
            break;
        }
        case "flying":
            e.y += e.speed;
            e.x += Math.sin(e.y*0.05)*4;
            break;
        case "zigzag":  e.y += e.speed; e.x += Math.sin(timeElapsed*6)*8; break;
        case "dodge":   e.y += e.speed; e.x += Math.cos(timeElapsed*4)*6; break;
        case "swoop":   e.y += 3;       e.x += Math.sin(timeElapsed*3)*10; break;
        case "boss_pattern": e.x += Math.sin(timeElapsed)*4; break;
        case "static":  break;
        default:        e.y += e.speed;
    }
}

/* ─── ENEMY ATTACK ─── */
function enemyAttack(e) {
    const at = ATTACK_MAP[e.enemyType];
    if (!at || at==="none" || at==="melee") return;
    if (Math.random() > 0.97) {
        // Aim bullet toward player
        const dx = (player.x+player.width/2) - (e.x+e.width/2);
        const dy = (player.y+player.height/2) - (e.y+e.height/2);
        const ang = Math.atan2(dy, dx);
        enemyBullets.push({
            x: e.x+e.width/2, y: e.y+e.height,
            width:8, height:8,
            angle: ang, speed: 8,
            type: at, sourceType: e.enemyType
        });
    }
}

/* ─── ENEMY BULLETS ─── */
function updateEnemyBullets() {
    for (let i = enemyBullets.length-1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += Math.cos(b.angle) * b.speed;
        b.y += Math.sin(b.angle) * b.speed;
        if (isColliding(b, player)) {
            player.health -= (DAMAGE_MAP[b.sourceType] || 10);
            enemyBullets.splice(i, 1);
            if (player.health <= 0) { triggerGameOver(); return; }
            continue;
        }
        if (b.x<-50||b.x>canvas.width+50||b.y<-50||b.y>canvas.height+50)
            enemyBullets.splice(i, 1);
    }
}

/* ─── OBJECTIVES ─── */
function checkObjectives() {
    if (schema && schema.objective_hint==="survive_time" && timeElapsed > 60)
        triggerGameOver();
    // Boss arena win condition
    if (isBossArena() && enemies.length===0 && score > 0) triggerWin();
}

/* ─── DRAW ─── */
// ── Sprite Animation System ──────────────────────────────────────────────────

// Cache for white-bg removed sprites
const spriteCache = new Map();

// Removes white background from AI sprites (offscreen canvas pixel scan)
function getCleanSprite(img) {
    if (!img) return null;
    const key = img.src || img;
    if (spriteCache.has(key)) return spriteCache.get(key);

    const oc  = document.createElement("canvas");
    oc.width  = img.naturalWidth  || img.width;
    oc.height = img.naturalHeight || img.height;
    const ox  = oc.getContext("2d");
    ox.drawImage(img, 0, 0);

    const id = ox.getImageData(0, 0, oc.width, oc.height);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 220 && d[i+1] > 220 && d[i+2] > 220)
            d[i+3] = 0;
    }
    ox.putImageData(id, 0, 0);
    spriteCache.set(key, oc);
    return oc;
}

// Draw one frame from a sprite sheet
// sheet: image, frameIndex: 0 or 1, frames: total frames in sheet
function drawSheetFrame(sheet, frameIndex, frames, dx, dy, dw, dh) {
    if (!sheet) return false;
    const clean   = getCleanSprite(sheet);
    const src     = clean || sheet;
    const frameW  = src.width / frames;
    const frameH  = src.height;
    const sx      = frameIndex * frameW;
    ctx.drawImage(src, sx, 0, frameW, frameH, dx, dy, dw, dh);
    return true;
}

// Current animation frames
function getEnemyFrame()  { return Math.floor(Date.now() / 200) % 2; }  // 5fps flap
function getPlayerFrame() { return player.isShooting ? 1 : 0; }         // idle/shoot


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    if (ASSETS.backgroundImg)
        ctx.drawImage(ASSETS.backgroundImg, 0, 0, canvas.width, canvas.height);
    else { ctx.fillStyle="#1a3a5c"; ctx.fillRect(0,0,canvas.width,canvas.height); }

    // Enemies — animated sprite sheet + hit flash + death animation
    enemies.forEach(e => {
        ctx.save();

        // Death animation: spin + shrink + fade
        if (e.dying) {
            const t = (Date.now() - e.dieTime) / 500; // 0→1 over 500ms
            const scale = 1 - t;
            const alpha = 1 - t;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.translate(e.x + e.width/2, e.y + e.height/2);
            ctx.rotate(t * Math.PI * 2);
            ctx.scale(scale, scale);
            ctx.translate(-e.width/2, -e.height/2);
            if (ASSETS.enemySheet) {
                drawSheetFrame(ASSETS.enemySheet, 0, 2, 0, 0, e.width, e.height);
            } else {
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(0, 0, e.width, e.height);
            }
            ctx.restore();
            return;
        }

        // Hit flash: red overlay for 150ms
        if (e.hitTime && Date.now() - e.hitTime < 150) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(e.x, e.y, e.width, e.height);
            ctx.globalAlpha = 1;
        }

        // Normal animated draw: flap wings
        const frame = getEnemyFrame();
        if (ASSETS.enemySheet) {
            drawSheetFrame(ASSETS.enemySheet, frame, 2, e.x, e.y, e.width, e.height);
        } else {
            ctx.fillStyle = "#e74c3c";
            ctx.beginPath();
            ctx.arc(e.x+e.width/2, e.y+e.height/2, e.width/2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.beginPath(); ctx.arc(e.x+e.width*0.35, e.y+e.height*0.4, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x+e.width*0.65, e.y+e.height*0.4, 4, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    });

    // Player — multiply blend removes white background
    ctx.save();
    const pcx = player.x + player.width/2;
    const pcy = player.y + player.height/2;
    ctx.translate(pcx, pcy);
    if (uses360Aim()) ctx.rotate(player.angle + Math.PI/2);
    if (ASSETS.playerSheet) {
        // frame 0 = idle, frame 1 = shooting
        drawSheetFrame(ASSETS.playerSheet, getPlayerFrame(), 2,
            -player.width/2, -player.height/2, player.width, player.height);
    } else {
        ctx.fillStyle="#4a9eff";
        ctx.beginPath();
        ctx.moveTo(0, -player.height/2);
        ctx.lineTo(player.width/2, player.height/2);
        ctx.lineTo(-player.width/2, player.height/2);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // Aim line in 360° mode (helpful visual guide)
    if (uses360Aim()) {
        ctx.strokeStyle = "rgba(255,255,100,0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pcx, pcy);
        ctx.lineTo(pcx + Math.cos(player.angle)*80, pcy + Math.sin(player.angle)*80);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Player bullets
    bullets.forEach(b => {
        const sz = bSize(b.type);
        ctx.save();
        ctx.translate(b.x, b.y);
        if (uses360Aim()) ctx.rotate(b.angle + Math.PI/2);
        if (ASSETS.bulletImg) {
            const clean = getCleanSprite(ASSETS.bulletImg);
            ctx.drawImage(clean || ASSETS.bulletImg, -sz.w/2, -sz.h/2, sz.w, sz.h);
        } else {
            ctx.fillStyle = b.type==="laser" ? "#00ffff" : "#ffe033";
            ctx.fillRect(-sz.w/2, -sz.h/2, sz.w, sz.h);
        }
        ctx.restore();
    });

    // Enemy bullets
    enemyBullets.forEach(b => {
        ctx.fillStyle="#ff6600";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI*2);
        ctx.fill();
    });

    drawHUD();
}

/* ─── HUD ─── */
function drawHUD() {
    ctx.font="bold 20px Arial"; ctx.fillStyle="white";
    ctx.shadowColor="black"; ctx.shadowBlur=4;
    ctx.textAlign="left";
    ctx.fillText("Score: "+score, 20, 35);
    ctx.textAlign="right";
    ctx.fillText("Time: "+Math.floor(timeElapsed)+"s", canvas.width-20, 35);
    ctx.textAlign="left"; ctx.shadowBlur=0;

    // Mode label
    ctx.font="12px Arial"; ctx.fillStyle="#ffd700";
    ctx.fillText(getVariation().toUpperCase().replace("_"," "), 20, 55);

    if (hasBottomPenalty()) {
        ctx.fillStyle = missedEnemies>2?"#ff4444":"#ffcc00";
        ctx.fillText("Missed: "+missedEnemies+"/"+MAX_MISSED, 20, 72);
    }

    // Survival: show survive timer
    if (isSurvival() && schema && schema.objective_hint==="survive_time") {
        ctx.font="16px Arial"; ctx.fillStyle="#00ff99";
        ctx.textAlign="center";
        ctx.fillText("Survive: "+Math.max(0,60-Math.floor(timeElapsed))+"s left", canvas.width/2, 35);
        ctx.textAlign="left";
    }

    // Health bar
    const barY = hasBottomPenalty() ? 80 : 60;
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(18, barY-2, 204, 19);
    ctx.fillStyle="#880000"; ctx.fillRect(20, barY, 200, 15);
    const ratio = Math.max(0, player.health/player.maxHealth);
    ctx.fillStyle = ratio>0.5?"#00cc44":ratio>0.25?"#ffaa00":"#ff2200";
    ctx.fillRect(20, barY, 200*ratio, 15);
    ctx.font="12px Arial"; ctx.fillStyle="white";
    ctx.fillText("HP: "+Math.max(0,Math.floor(player.health)), 226, barY+12);

    // 360° mode: show aim hint
    if (uses360Aim()) {
        ctx.font="13px Arial"; ctx.fillStyle="rgba(255,255,255,0.6)";
        ctx.textAlign="center";
        ctx.fillText("Move mouse to aim | CLICK or SPACE to shoot", canvas.width/2, canvas.height-10);
        ctx.textAlign="left";
    }
}

/* ─── GAME OVER / WIN ─── */
function drawGameOver() {
    ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign="center";
    ctx.font="bold 58px Arial"; ctx.fillStyle="#ff3333";
    ctx.shadowColor="#000"; ctx.shadowBlur=12;
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2-40);
    ctx.font="bold 28px Arial"; ctx.fillStyle="#ffd700";
    ctx.fillText("Score: "+score, canvas.width/2, canvas.height/2+10);
    ctx.font="18px Arial"; ctx.fillStyle="#aaa";
    ctx.fillText("Press R to play again", canvas.width/2, canvas.height/2+55);
    ctx.shadowBlur=0; ctx.textAlign="left";
}

function drawWin() {
    ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign="center";
    ctx.font="bold 52px Arial"; ctx.fillStyle="#ffd700";
    ctx.shadowColor="#000"; ctx.shadowBlur=12;
    ctx.fillText("YOU WIN!", canvas.width/2, canvas.height/2-40);
    ctx.font="bold 28px Arial"; ctx.fillStyle="white";
    ctx.fillText("Score: "+score, canvas.width/2, canvas.height/2+10);
    ctx.font="18px Arial"; ctx.fillStyle="#aaa";
    ctx.fillText("Press R to play again", canvas.width/2, canvas.height/2+55);
    ctx.shadowBlur=0; ctx.textAlign="left";
}

/* ─── GAME LOOP ─── */
let wonGame = false;
function gameLoop() {
    update(); draw();
    if (isGameOver) drawGameOver();
    else if (wonGame) drawWin();
    else requestAnimationFrame(gameLoop);
}

/* ─── SHOOT ─── */
function shootBullet() {
    player.isShooting = true;
    setTimeout(() => { player.isShooting = false; }, 250);
    if (isGameOver || wonGame) return;
    const bulletType = (schema && schema.bullet) || "bullet_small";
    const sz = bSize(bulletType);
    const cx = player.x + player.width/2;
    const cy = player.y + player.height/2;
    const angle = uses360Aim() ? player.angle : -Math.PI/2;
    const speed = 18;

    if (schema && schema.weapon==="shotgun") {
        for (let i=0; i<5; i++) {
            const spread = (Math.random()-0.5)*0.4;
            const s = bSize("pellet");
            bullets.push({ x:cx, y:cy, width:s.w, height:s.h,
                           type:"pellet", angle:angle+spread, speed, spread:0 });
        }
        return;
    }
    bullets.push({ x:cx, y:cy, width:sz.w, height:sz.h,
                   type:bulletType, angle, speed,
                   curve:Math.random()*2-1, velocityY:bulletType==="arrow"?12:0 });
}

/* ─── INPUT ─── */
function handleKeyDown(e) {
    if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) {
        e.preventDefault(); e.stopPropagation();
    }
    if (e.code==="Space") shootBullet();
    if (e.code==="KeyR" && (isGameOver||wonGame)) {
        wonGame=false; resetGame(); repositionPlayer(); configureGameplay();
        canvas.focus(); gameLoop();
    }
    keys[e.code]=true;
}
function handleKeyUp(e) { keys[e.code]=false; }

document.addEventListener("keydown", handleKeyDown, {capture:true});
document.addEventListener("keyup",   handleKeyUp);
canvas.addEventListener("keydown",   handleKeyDown, {capture:true});
canvas.addEventListener("keyup",     handleKeyUp);
canvas.addEventListener("click",     () => { canvas.focus(); shootBullet(); });

// Mouse tracking for 360° aim
canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
// Click to shoot in 360° mode
canvas.addEventListener("mousedown", e => {
    if (e.button===0) { canvas.focus(); shootBullet(); }
});

/* ─── COLLISION ─── */
function isColliding(a, b) {
    if (!a||!b||!a.width||!a.height||!b.width||!b.height) return false;
    return a.x < b.x+b.width && a.x+a.width > b.x &&
           a.y < b.y+b.height && a.y+a.height > b.y;
}

/* ─── GAME OVER / WIN ─── */
function triggerGameOver() { isGameOver=true; clearInterval(spawnTimer); }
function triggerWin()      { wonGame=true;    clearInterval(spawnTimer); }
function gameOver()        { triggerGameOver(); }