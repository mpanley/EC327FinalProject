# player.py
# This file defines the Player class used in the game.


class Player:
    def __init__(self, name):
        # Store the player's chosen name
        self.name = name

        # Starting health for every new player
        self.health = 100

        # This variable is not being used right now,
        # but it could be useful later if you add power-ups or buffs
        self.attack_modifier = 1.0

    def take_damage(self, amount):
        # Subtract the incoming damage from the player's health
        self.health -= amount

        # Prevent health from going below 0
        if self.health < 0:
            self.health = 0

        # Show the updated health after taking damage
        print(f"{self.name} takes {amount} damage! Health is now {self.health}.")

    def is_alive(self):
        # Return True if the player still has health left
        # Return False if health is 0
        return self.health > 0