# ProjectMain.py
# This is the main game file.
# It controls the game flow, battles, and game modes.

import random
from player import Player
from monsters import create_monsters
from questions import create_questions


def battle(player, monster, questions, required_correct=5):
    # Run one battle between the player and one monster.
    #
    # The player must answer a certain number of questions correctly
    # to defeat the monster.
    #
    # Returns:
    # True  -> player defeated the monster
    # False -> player was defeated
    # None  -> player chose to quit

    print("\n---------------------------------")
    print(f"You encounter {monster.name}!")
    print(f"Difficulty: {monster.difficulty}")
    print("---------------------------------")

    # Get the list of questions that matches this monster's difficulty
    monster_questions = questions[monster.difficulty]

    # Track how many correct answers the player has gotten in this fight
    correct_answers = 0

    # Keep battling until:
    # - the player dies, or
    # - the player gets enough correct answers to win
    while player.is_alive() and correct_answers < required_correct:
        # Show current player health
        print(f"\n{player.name}: {player.health} HP")

        # Show progress toward beating the monster
        print(f"Correct answers: {correct_answers}/{required_correct}")

        # Pick a random question from this monster's difficulty group
        question = random.choice(monster_questions)

        # Ask the question and store the result
        result = question.ask()

        # If result is None, the player chose to quit
        if result is None:
            return None

        # If the answer was correct, increase progress
        if result:
            correct_answers += 1
            print("You avoided the attack!")

        # If the answer was wrong, the monster attacks the player
        else:
            monster.attack_player(player)

    # If the player is still alive and reached the required number of correct answers,
    # they win the battle
    if player.is_alive() and correct_answers == required_correct:
        print(f"\nYou defeated {monster.name}!")
        return True

    # Otherwise, the player lost the fight
    else:
        print(f"\n{monster.name} defeated you...")
        return False


def story_mode(player, monsters, questions):
    # Story mode makes the player fight every monster in order.
    # The player wins only if they defeat all monsters.

    print("\n========== STORY MODE ==========")
    print("Defeat every monster in order.")
    print("You must get 5 correct answers to beat each monster.")

    # Go through the full monster list in order
    for monster in monsters:
        # If the player is dead before the next fight starts, they lose story mode
        if not player.is_alive():
            return False

        # Start a battle against the current monster
        result = battle(player, monster, questions, required_correct=5)

        # If result is None, the player quit
        if result is None:
            print("Game exited early.")
            return None

        # If result is False, the player lost this fight
        if result is False:
            return False

    # If the loop finishes, the player defeated every monster
    return True


def adventure_mode(player, monsters, questions):
    # Adventure mode lets the player choose one monster to fight.
    # If they beat that one monster, they win adventure mode.

    print("\n========== ADVENTURE MODE ==========")
    print("Choose one monster to fight.")
    print("You must get 5 correct answers to beat that monster.")

    # Make a copy of the monster list so the original list is not changed
    remaining_monsters = monsters.copy()

    # Keep asking for a choice while the player is alive
    while player.is_alive():
        print("\nChoose a monster to fight:")

        # Display each monster with a menu number
        for i, monster in enumerate(remaining_monsters, start=1):
            print(f"{i}. {monster.name} ({monster.difficulty}, {monster.attack} damage)")

        # Get the player's choice
        choice = input("Enter a number to choose your fight (or q to quit): ").strip().lower()

        # Allow quitting
        if choice in ["q", "quit", "exit"]:
            print("Game exited early.")
            return None

        # Make sure the input is a number
        if not choice.isdigit():
            print("Invalid choice. Enter a number.")
            continue

        # Convert the input into an integer
        choice_num = int(choice)

        # Make sure the number matches one of the menu options
        if choice_num < 1 or choice_num > len(remaining_monsters):
            print("Invalid choice. Pick one of the listed monsters.")
            continue

        # Get the selected monster
        selected_monster = remaining_monsters[choice_num - 1]

        # Start the battle and return the result immediately,
        # because adventure mode only requires one fight
        return battle(player, selected_monster, questions, required_correct=5)

    # If somehow the loop ends because the player is not alive, return False
    return False


def choose_mode():
    # Ask the player whether they want Story Mode or Adventure Mode.
    #
    # Returns:
    # "story"      -> if they chose Story Mode
    # "adventure"  -> if they chose Adventure Mode
    # None         -> if they chose to quit

    while True:
        print("\nChoose a game mode:")
        print("1. Story Mode")
        print("2. Adventure Mode")

        choice = input("Enter 1 or 2 (or q to quit): ").strip().lower()

        if choice in ["q", "quit", "exit"]:
            return None
        elif choice == "1":
            return "story"
        elif choice == "2":
            return "adventure"
        else:
            print("Invalid choice. Please enter 1 or 2.")


def main():
    # Main game setup:
    # - welcome the player
    # - get their name
    # - create the player, questions, and monsters
    # - ask which mode to play
    # - run the selected mode
    # - show the final game result

    print("Welcome to C++ Quest Academy!")
    print("(Type 'q' at any time to quit)\n")

    # Ask the player for their name
    player_name = input("Enter your player name: ").strip()

    # Allow quitting before the game starts
    if player_name.lower() in ["q", "quit", "exit"]:
        print("Quitting game...")
        return

    # Create the main game objects
    player = Player(player_name)
    questions = create_questions()
    monsters = create_monsters()

    # Let the player choose Story Mode or Adventure Mode
    mode = choose_mode()

    # If they quit during mode selection, stop the game
    if mode is None:
        print("Quitting game...")
        return

    # Run the mode they selected
    if mode == "story":
        result = story_mode(player, monsters, questions)
    else:
        result = adventure_mode(player, monsters, questions)

    # Final result screen
    print("\n========== GAME OVER ==========")

    if result is None:
        print("Game exited early.")
    elif result:
        if mode == "story":
            print(f"{player.name} defeated every monster and won Story Mode!")
        else:
            print(f"{player.name} defeated the monster and won Adventure Mode!")
    else:
        print(f"{player.name} was defeated.")


# This makes sure main() only runs when this file is executed directly
# and not when it is imported into another file
if __name__ == "__main__":
    main()