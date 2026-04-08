# player.py

class Player:
    def __init__(self, name):
        # Store player name
        self.name = name

        # Starting health
        self.health = 100

        # Keep modifier (for future use)
        self.attack_modifier = 1.0

    def take_damage(self, amount):
        # Reduce health when hit
        self.health -= amount

        # Prevent negative health
        if self.health < 0:
            self.health = 0

        print(f"{self.name} takes {amount} damage! Health is now {self.health}.")
        
    def is_alive(self):
        # Check if player is alive
        return self.health > 0