# questions.py
# This file defines the Question class and creates question sets by difficulty.


class Question:
    def __init__(self, prompt, answer, time_limit=15):
        # Save the question text that will be shown to the player
        self.prompt = prompt

        # Save the correct answer
        # .strip() removes extra spaces
        # .lower() makes the answer case-insensitive
        self.answer = str(answer).strip().lower()

        # How many seconds the player has to answer this question
        self.time_limit = time_limit
    
    # this will have to be handed with javascript later on, but for now we can just see 
    def timed_input(self, prompt_text = "Your answer: "):
        # going to use threading to enforce a time limit on input 
        result = [None]  # Use a list to allow modification inside the thread

        def get_input():
            try: 
                result[0] = input(prompt_text).strip().lower()
            except EOFError:
                result[0] = None  # Handle EOFError gracefully
        input_thread = threading.Thread(target=get_input)

        # start threat player can now type 
        input_thread.start()

        input_thread.join(timeout=self.time_limit)  # Wait for input for time_limit seconds

        if input_thread.is_alive():
            print(f"\nTime's up! You had {self.time_limit} seconds.")
            return "TIMEOUT"  # Return timeout if time runs out

    def ask(self):
        # Display the question to the player
        print(self.prompt)

        # Get the player's answer
        # .strip() removes spaces before/after the input
        # .lower() makes answers like "Class", "CLASS", and "class" all count the same
        user_input = input().strip().lower()

        # Allow the player to quit at any time
        if user_input in ["q", "quit", "exit"]:
            print("Quitting game...")
            return None

        # Return True if the answer is correct
        if user_input == self.answer:
            print("Correct!")
            return True

        # Return False if the answer is wrong
        else:
            print(f"Wrong! Correct answer: {self.answer}")
            return False


def create_questions():
    # Return a dictionary where:
    # - each key is a difficulty level
    # - each value is a list of Question objects for that difficulty
    return {
        "Easy": [
            Question("What symbol is used to end a statement in C++?", ";"),
            Question("What keyword is used to define a class in C++?", "class"),
            Question("What is the entry point function of every C++ program?", "main"),
            Question("What keyword is used to create a constant variable?", "const"),
            Question("What function is commonly used to print text in C++?", "cout"),
            Question("What header file is used for cout and cin?", "iostream"),
            Question("What keyword is used to get input from the keyboard in C++ streams?", "cin"),
            Question("What type is used to store whole numbers in C++?", "int"),
            Question("What symbol is used to assign a value to a variable?", "="),
            Question("What keyword is used to write the alternative branch of an if statement?", "else"),
        ],

        "Easy Medium": [
            Question("What keyword is used to dynamically allocate memory in C++?", "new"),
            Question("What keyword is used to free dynamically allocated memory?", "delete"),
            Question("What operator is used to access members of an object (not a pointer)?", "."),
            Question("What operator is used to access members of an object using a pointer?", "->"),
            Question("What type is used to store decimal numbers in C++?", "double"),
            Question("What type is used to store true or false values?", "bool"),
            Question("What keyword is used before a condition in a branch statement?", "if"),
            Question("What loop is commonly used when you know how many times to repeat?", "for"),
            Question("What loop continues while a condition is true?", "while"),
            Question("What header is commonly used for strings in C++?", "string"),
        ],

        "Medium": [
            Question("What keyword makes a function belong to a class but callable without an object?", "static"),
            Question("What C++ feature allows one function name to have multiple definitions with different parameters?", "overloading"),
            Question("What special function has the same name as the class?", "constructor"),
            Question("What is the name of the function automatically called when an object is destroyed?", "destructor"),
            Question("What access specifier makes class members available only inside the class?", "private"),
            Question("What access specifier makes class members available everywhere?", "public"),
            Question("What access specifier allows derived classes to access a member?", "protected"),
            Question("What is a function called when it belongs to a class?", "member function"),
            Question("What do you call a variable that belongs to an object?", "member variable"),
            Question("What symbol is used in inheritance syntax, as in class Dog : public Animal?", ":"),
        ],

        "Medium Hard": [
            Question("What keyword is used in inheritance to allow a derived class to replace a base class function?", "virtual"),
            Question("What keyword prevents a derived class function from overriding a base class function?", "final"),
            Question("What type of constructor makes a copy of another object of the same class?", "copy constructor"),
            Question("What operator is commonly overloaded for output streams?", "<<"),
            Question("What operator is commonly overloaded for input streams?", ">>"),
            Question("What keyword is used to refer to the current object inside a class?", "this"),
            Question("What symbol is used to define a scope in C++ like std::cout?", "::"),
            Question("What do you call a class that is inherited from?", "base class"),
            Question("What do you call a class that inherits from another class?", "derived class"),
            Question("What concept allows the same interface to behave differently in different classes?", "polymorphism"),
        ],

        "Hard": [
            Question("What is the term for a class function declared with '= 0'?", "pure virtual"),
            Question("What kind of class contains at least one pure virtual function?", "abstract class"),
            Question("What memory area stores dynamically allocated variables?", "heap"),
            Question("What mechanism lets one class use code from another class?", "inheritance"),
            Question("What mechanism lets you hide implementation details inside a class?", "encapsulation"),
            Question("What mechanism lets you create many forms of the same function behavior?", "polymorphism"),
            Question("What keyword creates a nickname for an existing type in modern C++?", "using"),
            Question("What container from the standard library stores elements in a dynamic array?", "vector"),
            Question("What namespace is commonly used for cout, cin, and string?", "std"),
            Question("What kind of function can be overridden in a derived class to support runtime polymorphism?", "virtual function"),
        ]
    }