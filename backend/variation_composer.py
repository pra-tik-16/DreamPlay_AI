import random
import pandas as pd


# ============================
# PIPE OPTION SELECTOR
# ============================

def select_option(value):

    if pd.isna(value):
        return None

    value = str(value)

    if "|" in value:

        options = value.split("|")

        return random.choice(options)

    return value



# ============================
# VARIATION COMPOSER
# ============================

def compose_variation(row_data, extracted_intent=None):

    final_schema = {}


    # ============================
    # BASE DATA FROM CSV
    # ============================

    final_schema["game_type"] = row_data.get("game_type")

    final_schema["entity_roles"] = row_data.get("entity_roles")

    final_schema["behavior_hints"] = row_data.get("behavior_hints")


    final_schema["environment_family"] = row_data.get("environment_family")

    final_schema["difficulty_hint"] = select_option(
        row_data.get("difficulty_hint")
    )

    final_schema["control_hint"] = select_option(
        row_data.get("control_hint")
    )


    # ============================
    # GAMEPLAY VARIATIONS
    # ============================

    game_type = row_data.get("game_type")


    if game_type == "shooter":

        final_schema["player_mode"] = select_option(
            row_data.get("allowed_player_modes")
        )

        final_schema["camera_mode"] = select_option(
            row_data.get("allowed_camera_modes")
        )

        final_schema["core_loop"] = select_option(
            row_data.get("allowed_core_loops")
        )

        final_schema["objective_hint"] = select_option(
            row_data.get("objective_hint")
        )


    elif game_type == "racing":

        final_schema["race_mode"] = select_option(
            row_data.get("allowed_core_loops")
        )

        final_schema["camera_mode"] = select_option(
            row_data.get("allowed_camera_modes")
        )


    elif game_type == "runner":

        final_schema["runner_mode"] = select_option(
            row_data.get("allowed_core_loops")
        )

        final_schema["camera_mode"] = select_option(
            row_data.get("allowed_camera_modes")
        )


    elif game_type == "quiz":

        final_schema["quiz_mode"] = select_option(
            row_data.get("allowed_core_loops")
        )


    elif game_type == "puzzle":

        final_schema["puzzle_mode"] = select_option(
            row_data.get("allowed_core_loops")
        )


    else:

        final_schema["core_loop"] = select_option(
            row_data.get("allowed_core_loops")
        )


    # ============================
    # DEBUG PRINT
    # ============================

    print(
        "VARIATION:",
        final_schema.get("player_mode"),
        final_schema.get("camera_mode"),
        final_schema.get("core_loop")
    )


    return final_schema