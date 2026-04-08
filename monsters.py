# monsters.py

class Monster:
    def __init__(self, name, attack):
        # Store monster attributes
        self.name = name
        self.attack = attack

    def attack_player(self, player):
        # Monster attacks the player
        print(f"{self.name} attacks!")
        player.take_damage(self.attack)


def create_monsters():
    # No health needed anymore
    return [
        Monster("Goblin Coder", 8),
        Monster("Bug Beast", 10),
        Monster("Syntax Snake", 12),
    ]