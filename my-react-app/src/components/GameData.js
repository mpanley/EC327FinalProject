export const MONSTERS = [
  {
    id: 1,
    name: "Goblin Coder",
    type: "Easy",
    emoji: "🧌",
    color: "#2fff00",
    bgColor: "#c8ffbc",
    borderColor: "#2fff00",
    health: 100,
    questions: [
      { q: "What symbol is used to end a statement in C++?", a: ";", hint: ""},
      { q: "What keyword is used to define a class in C++?", a: "class", hint: ""},
      { q: "What is the entry point funciton of every C++ program?", a: "main", hint: ""},
      { q: "What keyword is used to create a constant variable?", a: "const", hint: ""},
      { q: "What function is commonly used to pring text in C++?", a: "cout", hint : ""},
      { q: "What header file is used for cout and cin?", a: "iostream", hint : ""},
      { q: "What keyword is used to get input from the keyboard in C++ streams?", a: "cin", hint: ""},
      { q: "What type is used to store whole numbers in C++?", a: "int", hint: ""},
      { q: "What symbol is used to assign a value to a variable?", a: "=" , hint: ""},
      { q: "What keyword is used to write the alternative branch of an if statement?", a: "else", hint: ""},
    ],
  },
  {
    id: 2,
    name: "Bug Beast",
    type: "Easy Medium",
    emoji: "🪲",
    color: "#ffea00",
    bgColor: "#fff7a4",
    borderColor: "#ffea00",
    health: 120,
    questions: [
      { q: "What keyword is used to dynamically allocate memory in C++?", a: "new", hint: ""},
      { q: "What keyword is used to free dynamically allocated memory?", a: "delete", hint: ""},
      { q: "What operator is used to access members of an object (not a pointer)?", a: ".", hint: ""},
      { q: "What operator is used to access members of an object using a pointer?", a: "->", hint: ""},
      { q: "What type is used to store decimal numbers in C++?", a: "double", hint: ""},
      { q: "What type is used to store true or false values?", a: "bool", hint: ""},
      { q: "What keyword is used before a condition in a branch statement?", a: "if", hint: ""},
      { q: "What loop is commonly used when you know how many times to repeat?", a: "for", hint: ""},
      { q: "What loop continues while a condition is true?", a: "while", hint: ""},
      { q: "What header is commonly used for strings in C++?",a: "string", hint: ""},
    ],
  },
  {
    id: 3,
    name: "Syntax Snake",
    type: "Medium",
    emoji: "🐍",
    color: "#ffa200",
    bgColor: "#fdc159",
    borderColor: "#ffa200",
    health: 150,
    questions: [
      { q: "What keyword makes a function belong to a class but callable without an object?", a: "static"},
      { q: "What C++ feature allows one function name to have multiple definitions with different parameters?", a: "overloading"},
      { q: "What special function has the same name as the class?", a: "constructor"},
      { q: "What is the name of the function automatically called when an object is destroyed?", a: "destructor"},
      { q: "What access specifier makes class members available only inside the class?", a: "private"},
      { q: "What access specifier makes class members available everywhere?", a: "public"},
      { q: "What access specifier allows derived classes to access a member?", a: "protected"},
      { q: "What is a function called when it belongs to a class?", a: "member function"},
      { q: "What do you call a variable that belongs to an object?", a: "member variable"},
      { q: "What symbol is used in inheritance syntax, as in class Dog : public Animal?", a: ":"},
    ],
  },
  {
    id: 4,
    name: "Pointer Phantom",
    type: "Medium Hard",
    emoji: "👻",
    color: "#ff7300",
    bgColor: "#ff9640",
    borderColor: "#ff7300",
    health: 150,
    questions: [
      { q: "What keyword is used in inheritance to allow a derived class to replace a base class function?", a: "virtual", hint: ""},
      { q: "What keyword prevents a derived class function from overriding a base class function?", a: "final", hint: ""},
      { q: "What type of constructor makes a copy of another object of the same class?", a: "copy constructor", hint: ""},
      { q: "What operator is commonly overloaded for output streams?", a: "<<", hint: ""},
      { q: "What operator is commonly overloaded for input streams?", a: ">>", hint: ""},
      { q: "What keyword is used to refer to the current object inside a class?", a: "this", hint: ""},
      { q: "What symbol is used to define a scope in C++ like std::cout?", a: "::", hint: ""},
      { q: "What do you call a class that is inherited from?", a: "base class", hint: ""},
      { q: "What do you call a class that inherits from another class?", a: "derived class", hint: ""},
      { q: "What concept allows the same interface to behave differently in different classes?", a: "polymorphism", hint: ""},
    ],
  },
  {
    id: 5,
    name: "Segmentation Ogre",
    type: "Hard",
    emoji: "👹",
    color: "#ff0000",
    bgColor: "#ff502d",
    borderColor: "#ff0000",
    health: 150,
    questions: [
      { q: "What is the term for a class function declared with '= 0'?", a: "pure virtual", hint: ""},
      { q: "What kind of class contains at least one pure virtual function?", a: "abstract class", hint: ""},
      { q: "What memory area stores dynamically allocated variables?", a: "heap", hint: ""},
      { q: "What mechanism lets one class use code from another class?", a: "inheritance", hint: ""},
      { q: "What mechanism lets you hide implementation details inside a class?", a: "encapsulation", hint: ""},
      { q: "What mechanism lets you create many forms of the same function behavior?", a: "polymorphism", hint: ""},
      { q: "What keyword creates a nickname for an existing type in modern C++?", a: "using", hint: ""},
      { q: "What container from the standard library stores elements in a dynamic array?", a: "vector", hint: ""},
      { q: "What namespace is commonly used for cout, cin, and string?", a: "std", hint: ""},
      { q: "What kind of function can be overridden in a derived class to support runtime polymorphism?", a: "virtual function", hint: ""},
    ],
  },
];

export const TOTAL_HEALTH = MONSTERS.reduce((sum, m) => sum + m.health, 0);

// ---------------------------------------------------------------------------
// Backend Command Protocol
// ---------------------------------------------------------------------------
// The backend sends commands via postMessage to window with the shape:
//   { type: "GAME_COMMAND", command: <CommandName>, payload: { ... } }
//
// Supported commands:
//
//   SHOW_COMPONENT   — payload: { component: "GameScreen" | "QuestionBox" | "StatBar" | "MonsterCard" | "GameOver" }
//   SET_ACTIVE_MONSTER — payload: { monsterIndex: number }
//   UPDATE_SCORE     — payload: { score: number }
//   UPDATE_PLAYER_HP — payload: { hp: number }
//   UPDATE_MONSTER_HP — payload: { monsterIndex: number, hp: number }
//   SHOW_FEEDBACK    — payload: { correct: boolean, message: string }
//   CLEAR_FEEDBACK   — payload: {}
//   SET_STREAK       — payload: { streak: number }
//   TRIGGER_SHAKE    — payload: {}
//   TRIGGER_DAMAGE_FLASH — payload: { monsterIndex: number }
//   END_GAME         — payload: { result: "win" | "lose" }
//   RESET_GAME       — payload: {}
//   ADD_LOG          — payload: { message: string }
//
// The frontend emits back via postMessage to window.parent:
//   { type: "GAME_EVENT", event: <EventName>, payload: { ... } }
//
// Emitted events:
//   ANSWER_SUBMITTED — payload: { answer: string, monsterIndex: number, questionIndex: number }
//   HINT_REQUESTED   — payload: { monsterIndex: number, questionIndex: number }
//   MONSTER_SELECTED — payload: { monsterIndex: number }
//   RESET_REQUESTED  — payload: {}
// ---------------------------------------------------------------------------