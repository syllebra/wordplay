import pickle
import json
import os
from unidecode import unidecode

def update_games():
    common = set()
    try:
        with open('tools/frequency.txt', 'r', encoding='utf-8') as f:
            for line in f:
                # Assuming frequency.txt has one word per line or semicolon separated
                parts = line.strip().split(';')
                if parts:
                    common.add(unidecode(parts[0].lower()))
        print(f"Loaded {len(common)} common words.")
    except Exception as e:
        print(f"Error loading frequency.txt: {e}")

    with open('backend/app/full.games', 'rb') as f:
        games = pickle.load(f)

    common_count = 0
    total_count = 0
    for length in games:
        for key in games[length]:
            for game in games[length][key]:
                total_count += 1
                norm_R = unidecode(game['R'].lower())
                game['is_common'] = norm_R in common
                if game['is_common']:
                    common_count += 1

    print(f"Flagged {common_count} out of {total_count} games as common.")

    with open('web/games.json', 'w', encoding='utf-8') as f:
        json.dump(games, f)

if __name__ == "__main__":
    update_games()
