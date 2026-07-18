from flask import Flask, request, jsonify, send_from_directory

from flask_cors import CORS
from classifier import classify_prompt
from assets_manager import generate_asset_if_missing
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
TEMPLATES_DIR = os.path.join(BASE_DIR, "..", "templates")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

@app.route("/generate_asset", methods=["POST"])
def generate_asset():

    data = request.json

    role = data.get("role")
    name = data.get("name")

    asset_path = generate_asset_if_missing(role, name)

    if asset_path is None:
        
        return {"asset_path": None, "url": None, "error": "generation_failed"}

    # Convert filesystem path → browser path
    public_path = asset_path.replace("templates/shooter/", "")
    full_url    = f"/templates/shooter/{asset_path}"

    return {
        "asset_path": public_path,
        "url":        full_url
    }

# Home route — test if backend is working
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": " Backend is running!",
        "usage": "POST /generate_game with JSON: {'prompt': '<your text>'}"
    })

# Main route for generating schema
@app.route("/generate_game", methods=["POST"])
def generate_game():
    data = request.get_json()
    if not data or "prompt" not in data:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = data["prompt"]
    schema = classify_prompt(prompt)

    engine_map = {
        "shooter": "shooter",
        "racing": "racing",
        "runner": "runner",
        "quiz": "quiz",
        "puzzle": "puzzle",
        "platformer": "platformer",
        "strategy": "strategy",
        "arcade": "arcade",
        "survival": "survival"
    }

    engine_template = engine_map.get(schema.get("game_type"))

    if not engine_template:
        return jsonify({
            "error": f"Engine for '{schema.get('game_type')}' not implemented yet."
        }), 400

    return jsonify({
        "engine": engine_template,
        "schema": schema
    })



@app.route("/templates/<path:filename>")
def serve_templates(filename):
    return send_from_directory(TEMPLATES_DIR, filename)

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(
        os.path.join(TEMPLATES_DIR, "shooter", "assets"),
        filename
    )

@app.route("/ui")
def serve_frontend():
    return app.send_static_file("index.html")



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)