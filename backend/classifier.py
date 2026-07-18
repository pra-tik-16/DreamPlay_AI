import joblib
import pandas as pd
import os
import re
import random
from variation_composer import compose_variation

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models",  "text_classifier.pkl")
VEC_PATH   = os.path.join(BASE_DIR, "..", "models",  "vectorizer.pkl")
CSV_PATH   = os.path.join(BASE_DIR, "..", "dataset", "training_data.csv")

model      = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VEC_PATH)
df         = pd.read_csv(CSV_PATH)


#  ENTITY FAMILY POOLS
  

ENTITY_FAMILIES = {
    "bird_family": [
        "parrot","dove","eagle","crow","pigeon","hawk",
        "flamingo","penguin","owl","hummingbird","pelican",
        "toucan","seagull","vulture","bat"
    ],
    "character_family": [
        "soldier","ninja","knight","pirate","viking","cowboy",
        "astronaut","archer","hunter","warrior","thief",
        "bandit","police","assassin","samurai"
    ],
    "monster_family": [
        "zombie","dragon","alien","werewolf","vampire","skeleton",
        "ghost","witch","golem","troll","ogre","demon",
        "spider","scorpion","dinosaur"
    ],
    "vehicle_family": [
        "spaceship","jet","helicopter","tank","ufo","rocket",
        "drone","bomber","submarine","hovercraft","fighter_jet"
    ],
    "object_family": [
        "bottle","can","balloon","target","barrel",
        "crate","vase","coin","crystal","bomb"
    ],
    "boss_family": [
        "dragon","titan","overlord","golem","demon_king",
        "alien_queen","cyborg","kraken","hydra","colossus"
    ],
    "army_family": [
        "soldier","tank","jet","helicopter","sniper",
        "commando","gunship","turret","drone","rocket_trooper"
    ],
    "structure_family": [
        "tower","castle","bunker","fortress","base",
        "wall","gate","cannon_tower","obelisk"
    ],
    "weapon_family": [
        "gun","rifle","pistol","sniper","shotgun",
        "laser","bow","cannon","crossbow","flamethrower"
    ],
    "environment_family": [
        "forest","space","desert","city","ocean","jungle",
        "snow","volcano","cave","sky","mountain","swamp",
        "ruins","beach","arctic"
    ],
    "player_family": [
        "soldier","ninja","astronaut","knight","viking","hunter",
        "archer","pirate","warrior","cowboy","robot","wizard",
        "ranger","scout","sniper"
    ],
}

WEAPON_BULLETS = {
    "pistol":       "bullet_small",
    "gun":          "bullet_small",
    "rifle":        "bullet_rifle",
    "sniper":       "bullet_sniper",
    "bow":          "arrow",
    "crossbow":     "arrow",
    "laser":        "laser",
    "cannon":       "bullet_small",
    "shotgun":      "pellet",
    "flamethrower": "bullet_small",
    "missile":      "bullet_small",
    "torpedo":      "bullet_small",
}


# 2. CONTEXT THEMES  ← THE KEY FIX


CONTEXT_THEMES = {
    "space": {
        "keywords":    ["space","galaxy","cosmos","star","planet","alien","ufo","meteor","asteroid"],
        "player":      ["spaceship","fighter_jet","rocket","astronaut"],
        "enemy":       ["alien_ship","ufo","meteor","satellite","alien","asteroid"],
        "environment": ["space"],
        "weapon":      ["laser","cannon","missile"],
    },
    "bird": {
        "keywords":    ["bird","birds","flying","wings","feather","avian"],
        "player":      ["soldier","hunter","archer","ranger","cowboy"],
        "enemy":       ["parrot","dove","eagle","crow","owl","flamingo","hawk","hummingbird","pelican"],
        "environment": ["forest","sky","jungle","mountain","beach"],
        "weapon":      ["gun","rifle","bow","pistol","shotgun"],
    },
    "penguin": {
        "keywords":    ["penguin","penguins"],
        "player":      ["soldier","hunter","ranger","archer"],
        "enemy":       ["penguin"],
        "environment": ["arctic","snow","ice","mountain"],
        "weapon":      ["gun","rifle","pistol"],
    },
    "zombie": {
        "keywords":    ["zombie","zombies","undead","apocalypse","outbreak"],
        "player":      ["soldier","survivor","hunter","warrior","cowboy"],
        "enemy":       ["zombie","skeleton","ghost","vampire","werewolf"],
        "environment": ["city","ruins","swamp","forest","desert"],
        "weapon":      ["rifle","shotgun","pistol","gun"],
    },
    "ocean": {
        "keywords":    ["ocean","sea","water","underwater","marine","aqua","fish","pirate"],
        "player":      ["submarine","diver","pirate","sailor"],
        "enemy":       ["shark","jellyfish","crab","kraken","octopus","piranha"],
        "environment": ["ocean","beach"],
        "weapon":      ["cannon","gun","harpoon"],
    },
    "dragon": {
        "keywords":    ["dragon","dragons","fantasy","medieval","castle"],
        "player":      ["knight","warrior","archer","wizard","viking"],
        "enemy":       ["dragon","hydra","demon","ogre","troll"],
        "environment": ["volcano","cave","mountain","ruins","forest"],
        "weapon":      ["bow","cannon","laser","sword"],
    },
    "bottle": {
        "keywords":    ["bottle","bottles","can","target","shooting range","practice"],
        "player":      ["soldier","hunter","sniper","cowboy","ranger"],
        "enemy":       ["bottle","can","barrel","crate","vase","balloon"],
        "environment": ["desert","city","forest","mountain","ruins"],
        "weapon":      ["sniper","rifle","gun","pistol"],
    },
    "military": {
        "keywords":    ["military","war","army","combat","soldier","battlefield","tactical"],
        "player":      ["soldier","commando","sniper","warrior"],
        "enemy":       ["soldier","tank","jet","drone","helicopter"],
        "environment": ["desert","city","jungle","mountain"],
        "weapon":      ["rifle","sniper","gun","shotgun"],
    },
    "robot": {
        "keywords":    ["robot","robots","mech","machine","cyborg","android","future","sci-fi"],
        "player":      ["robot","soldier","astronaut","ninja"],
        "enemy":       ["robot","drone","cyborg","turret","golem"],
        "environment": ["city","ruins","space","desert"],
        "weapon":      ["laser","rifle","cannon","gun"],
    },
    "jungle": {
        "keywords":    ["jungle","tropical","rainforest","safari","wild","wildlife"],
        "player":      ["hunter","soldier","archer","ranger","warrior"],
        "enemy":       ["tiger","snake","spider","crocodile","dinosaur","gorilla"],
        "environment": ["jungle","forest","swamp"],
        "weapon":      ["rifle","bow","gun","shotgun"],
    },
    "snow": {
        "keywords":    ["snow","ice","winter","frozen","arctic","tundra","blizzard"],
        "player":      ["soldier","viking","hunter","ranger","archer"],
        "enemy":       ["penguin","wolf","bear","yeti","skeleton"],
        "environment": ["snow","arctic","mountain"],
        "weapon":      ["rifle","gun","bow","sniper"],
    },
    "western": {
        "keywords":    ["western","cowboy","wild west","desert","outlaw","bandit"],
        "player":      ["cowboy","sheriff","ranger","hunter"],
        "enemy":       ["bandit","outlaw","cowboy","bottle","can"],
        "environment": ["desert","ruins","mountain"],
        "weapon":      ["pistol","rifle","sniper","shotgun"],
    },
}

# Build keyword → theme lookup
KEYWORD_THEME_MAP = {}
for theme_name, theme_data in CONTEXT_THEMES.items():
    for kw in theme_data["keywords"]:
        KEYWORD_THEME_MAP[kw] = theme_name



#  EXPLICIT ENTITY WORDS
#    Used to detect when user names a SPECIFIC entity.


ALL_EXPLICIT_ENEMIES = (
    ENTITY_FAMILIES["bird_family"] +
    ENTITY_FAMILIES["monster_family"] +
    ENTITY_FAMILIES["vehicle_family"] +
    ENTITY_FAMILIES["object_family"] +
    ENTITY_FAMILIES["army_family"] +
    ENTITY_FAMILIES["character_family"] +
    ["bird","monster","alien","boss","robot","spaceship","ufo"]
)

ALL_EXPLICIT_PLAYERS = ENTITY_FAMILIES["player_family"] + [
    "spaceship","rocket","submarine","tank"
]

EXPLICIT_WEAPON_WORDS = list(ENTITY_FAMILIES["weapon_family"])
EXPLICIT_ENV_WORDS    = list(ENTITY_FAMILIES["environment_family"]) + [
    "underwater","galaxy","cosmos","tundra","grassland"
]


# 4. INTENT EXTRACTION  (ML)


def extract_intent(prompt):
    X = vectorizer.transform([prompt.lower()])
    return model.predict(X)[0]


# 5. BEST CSV ROW


def find_best_row(prompt, game_type):
    rows = df[df["game_type"] == game_type]
    if rows.empty:
        return None
    prompt_lower = prompt.lower()
    best_score, best_row = -1, None
    for _, row in rows.iterrows():
        score = sum(
            1 for tag in str(row["intent_tags"]).split("|")
            if tag.lower() in prompt_lower
        )
        if score > best_score:
            best_score, best_row = score, row
    return best_row if best_row is not None else rows.sample(1).iloc[0]



#  DETECT CONTEXT THEME from prompt
#    Returns the best-matching theme or None.


def detect_theme(prompt):
    words = re.findall(r'\b[a-z]+\b', prompt.lower())
    # Count keyword hits per theme
    theme_scores = {}
    for w in words:
        theme = KEYWORD_THEME_MAP.get(w)
        if theme:
            theme_scores[theme] = theme_scores.get(theme, 0) + 1
    if not theme_scores:
        return None
    return max(theme_scores, key=theme_scores.get)


#  EXPLICIT ROLE EXTRACTION


def extract_explicit_roles(prompt):
    words   = re.findall(r'\b[a-z_]+\b', prompt.lower())
    roles   = {"player": None, "weapon": None, "enemy": None, "environment": None}

    for w in words:
        if not roles["enemy"] and w in ALL_EXPLICIT_ENEMIES:
            roles["enemy"] = w
    for w in words:
        if not roles["player"] and w in ALL_EXPLICIT_PLAYERS:
            roles["player"] = w
    for w in words:
        if not roles["weapon"] and w in EXPLICIT_WEAPON_WORDS:
            roles["weapon"] = w
    for w in words:
        if not roles["environment"] and w in EXPLICIT_ENV_WORDS:
            roles["environment"] = w

    return roles



#  FAMILY RESOLVER
#    Reads entity_roles from CSV row, picks random members.


def resolve_families(entity_roles_str):
    resolved = {}
    if not entity_roles_str or pd.isna(entity_roles_str):
        return resolved
    for part in str(entity_roles_str).split(";"):
        if ":" not in part:
            continue
        role, family = part.strip().split(":", 1)
        pool = ENTITY_FAMILIES.get(family.strip(), [])
        if pool:
            resolved[role.strip()] = random.choice(pool)
    return resolved


# MAIN CLASSIFIER


def classify_prompt(prompt):

    game_type   = extract_intent(prompt)
    matched_row = find_best_row(prompt, game_type)

    if matched_row is None:
        return {"game_type": game_type, "clarification_needed": True, "missing": ["game_description"]}

    # Base schema from variation composer (handles core_loop, player_mode etc.)
    final_schema = compose_variation(matched_row.to_dict())

    # ── Step 1: Detect context theme ──────────────────
    theme_name = detect_theme(prompt)
    theme      = CONTEXT_THEMES.get(theme_name, {})

    if theme:
        print(f"  Theme detected: {theme_name}")
        # Apply theme defaults — ALL entities fit the theme
        env_pool = theme.get("environment", [])
        final_schema["environment"] = (
            random.choice(env_pool) if isinstance(env_pool, list) else env_pool
        )
        final_schema["environment_hint"] = final_schema["environment"]
        final_schema["enemy"]  = random.choice(theme["enemy"])
        final_schema["player"] = random.choice(theme["player"])
        w = random.choice(theme["weapon"])
        final_schema["weapon"] = w
        final_schema["bullet"] = WEAPON_BULLETS.get(w, "bullet_small")
    else:
        #  No theme — use family randomization ──
        print(f"   No theme — using family randomization")
        family_resolved = resolve_families(matched_row.get("entity_roles", ""))
        if family_resolved.get("player"):
            final_schema["player"] = family_resolved["player"]
        if family_resolved.get("weapon"):
            w = family_resolved["weapon"]
            final_schema["weapon"] = w
            final_schema["bullet"] = WEAPON_BULLETS.get(w, "bullet_small")
        if family_resolved.get("enemy"):
            final_schema["enemy"] = family_resolved["enemy"]
        # Random environment
        final_schema["environment"] = random.choice(ENTITY_FAMILIES["environment_family"])
        final_schema["environment_hint"] = final_schema["environment"]

    #  Explicit overrides 
    explicit = extract_explicit_roles(prompt)

    if explicit["player"]:
        final_schema["player"] = explicit["player"]
        print(f"   Explicit player: {explicit['player']}")
    if explicit["weapon"]:
        w = explicit["weapon"]
        final_schema["weapon"] = w
        final_schema["bullet"] = WEAPON_BULLETS.get(w, "bullet_small")
        print(f"   Explicit weapon: {w}")
    if explicit["enemy"]:
        final_schema["enemy"] = explicit["enemy"]
        print(f"   Explicit enemy: {explicit['enemy']}")
    if explicit["environment"]:
        final_schema["environment"] = explicit["environment"]
        final_schema["environment_hint"] = explicit["environment"]
        print(f"   Explicit environment: {explicit['environment']}")

    #  Safety defaults (should rarely trigger) ──
    if not final_schema.get("player"):
        final_schema["player"] = random.choice(ENTITY_FAMILIES["player_family"])
    if not final_schema.get("weapon"):
        w = random.choice(ENTITY_FAMILIES["weapon_family"])
        final_schema["weapon"] = w
        final_schema["bullet"] = WEAPON_BULLETS.get(w, "bullet_small")
    if not final_schema.get("bullet"):
        final_schema["bullet"] = WEAPON_BULLETS.get(final_schema.get("weapon","gun"), "bullet_small")
    if not final_schema.get("enemy"):
        final_schema["enemy"] = random.choice(
            ENTITY_FAMILIES["bird_family"] + ENTITY_FAMILIES["monster_family"]
        )
    if not final_schema.get("environment"):
        final_schema["environment"] = random.choice(ENTITY_FAMILIES["environment_family"])
        final_schema["environment_hint"] = final_schema["environment"]

    final_schema["clarification_needed"] = False

    print(f"   Schema: player={final_schema.get('player')} "
          f"enemy={final_schema.get('enemy')} "
          f"env={final_schema.get('environment')} "
          f"weapon={final_schema.get('weapon')}")

    return final_schema