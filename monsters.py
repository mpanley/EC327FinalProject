# monsters.py
# This file defines the Monster class and creates the monsters used in the game.

class Monster:
    def __init__(self, name, attack, difficulty):
        # Save the monster's name (what gets printed to the player)
        self.name = name

        # Save how much damage this monster deals on a wrong answer
        self.attack = attack

        # Save this monster's difficulty level
        # This is used to match the monster with the correct question set
        self.difficulty = difficulty

    def attack_player(self, player):
        # Print an attack message so the player knows they were hit
        print(f"{self.name} attacks!")

        # Tell the Player object to lose health
        player.take_damage(self.attack)


def create_monsters():
    # Return a list of all monsters in the game
    # Each monster has:
    # (name, damage dealt, question difficulty)
    return [
        Monster("Goblin Coder", 5, "Easy"),
        Monster("Bug Beast", 8, "Easy Medium"),
        Monster("Syntax Snake", 12, "Medium"),
        Monster("Pointer Phantom", 15, "Medium Hard"),
        Monster("Segmentation Ogre", 20, "Hard"),
    ]