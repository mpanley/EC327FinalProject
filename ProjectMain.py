import random
from player import Player
from monsters import create_monsters
from questions import create_questions


def battle(player, monster, questions):
    print("\n---------------------------------")
    print(f"You encounter {monster.name}!")
    print("---------------------------------")

    while player.is_alive():
        print(f"\n{player.name}: {player.health} HP")

        question = random.choice(questions)
        result = question.ask()

        # Quit handling
        if result is None:
            return False

        if result:
            # Correct → buff only
            player.apply_buff()
        else:
            # Wrong → monster attacks
            monster.attack_player(player)

        # Optional: break after some turns (since no monster health)
        # Otherwise this loop is infinite unless player dies
        if player.health <= 0:
            break

    if player.is_alive():
        print(f"\nYou survived {monster.name}!")
    else:
        print("\nYou were defeated...")

    return True


def main():
    print("Welcome to Python Battle Game!")
    print("(Type 'q' at any time to quit)\n")

    player_name = input("Enter your player name: ").strip()

    if player_name.lower() in ["q", "quit", "exit"]:
        print("Quitting game...")
        return

    player = Player(player_name)

    questions = create_questions()
    monsters = create_monsters()

    for monster in monsters:
        if player.is_alive():
            continue_game = battle(player, monster, questions)
            if not continue_game:
                print("Game exited early.")
                return
        else:
            break

    print("\n========== GAME OVER ==========")
    if player.is_alive():
        print(f"{player.name} survived all encounters!")
    else:
        print(f"{player.name} was defeated.")


if __name__ == "__main__":
    main()