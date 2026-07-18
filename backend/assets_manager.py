
import os
from assets_generator import ASSETS_ROOT, ASSET_SPECS, get_sheet_filename, generate_asset

def _cache_path(role, name):
    filename, subfolder = get_sheet_filename(role, name)
    return os.path.join(ASSETS_ROOT, subfolder, filename)

def _browser_path(role, name):
    filename, subfolder = get_sheet_filename(role, name)
    return f"assets/{subfolder}/{filename}"

def _is_real_asset(path):
    return os.path.isfile(path) and os.path.getsize(path) > 8000

def generate_asset_if_missing(role, name):
    # 1. Already cached on disk?
    cache = _cache_path(role, name)
    if _is_real_asset(cache):
        print(f"   Cache: {role}:{name}")
        return _browser_path(role, name)

    # Stale/corrupt file — delete it so HF regenerates
    if os.path.isfile(cache):
        os.remove(cache)
        print(f"    Removed corrupt cache: {os.path.basename(cache)}")

    #  Generate → saved to cache
    print(f"   Generating: {role}:{name}")
    result = generate_asset(role, name)
    if result is None:
        print(f"   Failed: {role}:{name}")
        return None
    return result