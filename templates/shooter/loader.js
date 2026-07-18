

async function requestAsset(role, name) {
    const res  = await fetch("/generate_asset", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role, name })
    });
    const data = await res.json();
    return data.url || data.asset_path;
}

async function loadAssets(rawSchema) {
    const schema = normalizeSchema(rawSchema);
    console.log("LOADER SCHEMA:", schema);
    const assets = await loadImages(schema);
    return { schemaUsed: schema, assets };
}

function normalizeSchema(raw) {
    return {
        ...raw,
        player_mode:     raw.player_mode     || "bottom_fixed",
        camera_mode:     raw.camera_mode     || "static",
        core_loop:       raw.core_loop       || "arcade_wave",
        objective_hint:  raw.objective_hint  || "score_target",
        difficulty_hint: raw.difficulty_hint || "medium",
        control_hint:    raw.control_hint    || "keyboard",
        player:          raw.player          || "soldier",
        weapon:          raw.weapon          || "gun",
        bullet:          raw.bullet          || "bullet_small",
        enemy:           raw.enemy           || "bird",
        environment:     raw.environment || raw.environment_hint || "forest",
    };
}

function tryLoad(src) {
    return new Promise(resolve => {
        const img   = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src     = src;
    });
}

// Animated roles use _sheet suffix
function sheetName(name) { return `${name}_sheet`; }

async function loadOneAsset({ key, role, name, paths }) {
    for (const path of paths) {
        const img = await tryLoad(path);
        if (img) {
            console.log(` [${key}] Library: ${path}`);
            return img;
        }
    }
    console.log(` [${key}] Generating: ${role}:${name}`);
    try {
        const url = await requestAsset(role, name);
        if (!url) { console.warn(`✗ No URL for ${role}:${name}`); return null; }
        const img = await tryLoad(url);
        if (img) { console.log(` [${key}] Generated: ${url}`); return img; }
        console.warn(`✗ Failed to load generated: ${url}`);
    } catch(e) {
        console.error(`✗ Error ${role}:${name}:`, e);
    }
    return null;
}

async function loadImages(schema) {
    const assets = {};
    const en  = schema.enemy;
    const pl  = schema.player;
    const env = schema.environment;

    const targets = [
        // Enemies → sprite sheet (2 frames)
        {
            key:  "enemySheet",
            role: "enemy",
            name: en,
            paths: [`assets/enemies/${sheetName(en)}.png`]
        },
        // Player → sprite sheet (2 frames)
        {
            key:  "playerSheet",
            role: "player",
            name: pl,
            paths: [`assets/player/${sheetName(pl)}.png`]
        },
        // Weapon → single image
        {
            key:  "weaponImg",
            role: "weapon",
            name: schema.weapon,
            paths: [`assets/player/${schema.weapon}.png`]
        },
        // Bullet → single image
        {
            key:  "bulletImg",
            role: "bullet",
            name: schema.bullet,
            paths: [
                `assets/bullets/${schema.bullet}.png`,
                `assets/bullets/bullet_small.png`
            ]
        },
        // Background → single image
        {
            key:  "backgroundImg",
            role: "background",
            name: env,
            paths: [
                `assets/backgrounds/${env}.jpg`,
                `assets/backgrounds/${env}.png`,
            ]
        },
    ];

    const results = await Promise.all(
        targets.map(async t => ({ key: t.key, img: await loadOneAsset(t) }))
    );
    results.forEach(({ key, img }) => { if (img) assets[key] = img; });

    // Also expose single-frame aliases so engine can use either
    if (assets.enemySheet)  assets.enemyImg  = assets.enemySheet;
    if (assets.playerSheet) assets.playerImg = assets.playerSheet;

    console.log(` Assets ready: [${Object.keys(assets).join(", ")}]`);
    return assets;
}