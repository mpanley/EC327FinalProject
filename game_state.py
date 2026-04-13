# add a new game_state.py module for save/load logic, will update player.py and ProjectMain.py to hook into it 

import json 
import os 
from datatime import datetime

#default filename for the save file 

SAVE_FILE = "save_game.json"

def save_game(player, defeated_monsters, mode, stats):
    # Create a dictionary to hold the game state
    # this will serve as the single source of truth for what gets saved 
    # for firebase, we can send this same dictionary to the database instead of writing to a file

    #Players: the player object 
    #defeated_monsters: list of monster names the player has beaten
    #mode: "story" or "adventure"
    #stats: dictionary of gameplay statitics 

    # Return: 
    # A dictionary with all game state infomation 

    return { 
        "player" : {
            "name": player.name,
            "health": player.health,
            "attack_modifier": player.attack_modifier,
        },
        "progress": {
            "mode": mode, 
            "defeated_monsters": defeated_monsters,
        }, 
        "stats": stats,
        "saved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        } 



def load_game(filename=SAVE_FILE):

    # loads a saved game from the save_data.json file 
    #returns: the save dictionary if successful or none if the file does not exist/corrupt 

    #checks if the save file exists 
    if not os.path.exists(filename):
        print("No save file found.")
        return None
    
    try: 
        with open(filename, "r") as f:
            save_data = json.load(f)
        
        print()
        retrun save_data
    
    except json.JsonDecodeError:
        print("Save file is corrupted.")
        return None
    
    expect Exception as e:
        print(f"An error occurred while loading the save file: {e}")
        return None


def delete_save(filename=SAVE_FILE): 
# delete the save file when new game starts 
# returns boolean values, true if deleted, false if file does not exists 

    if os.path.exists(filename):
        try: 
            os.remove(filename)
            print("Save file deleted.")
            return True
        except Exception as e:
            print(f"Error deleting save file: {e}")
            return False
    return False




# def display_save_info(save_data):