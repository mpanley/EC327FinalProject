# questions.py

class Question:
    def __init__(self, prompt, answer):
        # Store question text and correct answer
        self.prompt = prompt
        self.answer = str(answer).strip().lower()

    def ask(self):
        # Display the question
        print(self.prompt)

        # Get user input (blank line, no ">")
        user_input = input().strip().lower()

        # Allow quitting anytime
        if user_input in ["q", "quit", "exit"]:
            print("Quitting game...")
            return None

        # Check correctness
        if user_input == self.answer:
            print("Correct!")
            return True
        else:
            print(f"Wrong! Correct answer: {self.answer}")
            return False


def create_questions():
    # List of C++ questions
    return [
        Question("What symbol is used to end a statement in C++?", ";"),
        Question("What keyword is used to define a class in C++?", "class"),
        Question("What function is used to output text in C++ (standard library)?", "cout"),
        Question("What operator is used to access members of an object using a pointer?", "->"),
        Question("What keyword is used to dynamically allocate memory in C++?", "new"),
        Question("What keyword is used to free dynamically allocated memory?", "delete"),
        Question("What header file is needed for input/output using cout and cin?", "iostream"),
        Question("What keyword is used to create a constant variable?", "const"),
        Question("What is the entry point function of every C++ program?", "main"),
        Question("What operator is used to access members of an object (not a pointer)?", "."),
    ]