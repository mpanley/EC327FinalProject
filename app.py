# app.py - Flask backend for C++ Quest Academy

from flask import Flask, jsonify, request, session, render_template
import random
import os

from player import Player
from monsters import create_monsters
from questions import create_questions

app = Flask(__name__)
app.secret_key = "cpp_quest_secret_2024"

# In-memory game sessions (keyed by session id)
game_sessions = {}

def get_session_id():
    if 'sid' not in session:
        session['sid'] = os.urandom(16).hex()
    return session['sid']

def get_game(sid):
    return game_sessions.get(sid)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/start', methods=['POST'])
def start_game():
    data = request.json
    player_name = data.get('name', 'Hero').strip() or 'Hero'
    mode = data.get('mode', 'story')  # 'story' or 'adventure'

    sid = get_session_id()
    monsters = create_monsters()
    questions = create_questions()
    player = Player(player_name)

    game_sessions[sid] = {
        'player': player,
        'monsters': monsters,
        'questions': questions,
        'mode': mode,
        'current_monster_index': 0,
        'defeated_monsters': [],
        'game_over': False,
        'won': False,
    }

    return jsonify({
        'ok': True,
        'player': {'name': player.name, 'health': player.health},
        'monsters': [
            {
                'id': i,
                'name': m.name,
                'attack': m.attack,
                'difficulty': m.difficulty,
                'defeated': False,
            }
            for i, m in enumerate(monsters)
        ],
        'mode': mode
    })

@app.route('/api/state', methods=['GET'])
def get_state():
    sid = get_session_id()
    game = get_game(sid)
    if not game:
        return jsonify({'ok': False, 'error': 'No active game'})

    player = game['player']
    return jsonify({
        'ok': True,
        'player': {'name': player.name, 'health': player.health},
        'defeated_monsters': game['defeated_monsters'],
        'game_over': game['game_over'],
        'won': game['won'],
    })

@app.route('/api/battle/start', methods=['POST'])
def battle_start():
    """Start a battle with a specific monster."""
    data = request.json
    monster_id = data.get('monster_id')

    sid = get_session_id()
    game = get_game(sid)
    if not game:
        return jsonify({'ok': False, 'error': 'No active game'})

    if monster_id in game['defeated_monsters']:
        return jsonify({'ok': False, 'error': 'Monster already defeated'})

    monster = game['monsters'][monster_id]
    question_pool = game['questions'][monster.difficulty]

    # Pick 5 random questions for this battle
    battle_questions = random.sample(question_pool, min(5, len(question_pool)))

    # Store battle state
    game['battle'] = {
        'monster_id': monster_id,
        'questions': [{'prompt': q.prompt, 'answer': q.answer} for q in battle_questions],
        'current_q': 0,
        'correct_answers': 0,
        'required_correct': 5,
        'player_hp_snapshot': game['player'].health,
    }

    first_q = battle_questions[0]
    return jsonify({
        'ok': True,
        'monster': {
            'id': monster_id,
            'name': monster.name,
            'attack': monster.attack,
            'difficulty': monster.difficulty,
        },
        'question': {
            'prompt': first_q.prompt,
            'index': 0,
            'total': len(battle_questions),
        },
        'player_health': game['player'].health,
        'correct_answers': 0,
        'required_correct': 5,
    })

@app.route('/api/battle/answer', methods=['POST'])
def battle_answer():
    """Submit an answer during battle."""
    data = request.json
    user_answer = data.get('answer', '').strip().lower()

    sid = get_session_id()
    game = get_game(sid)
    if not game or 'battle' not in game:
        return jsonify({'ok': False, 'error': 'No active battle'})

    battle = game['battle']
    player = game['player']
    monster = game['monsters'][battle['monster_id']]

    current_q_data = battle['questions'][battle['current_q']]
    correct = user_answer == current_q_data['answer']

    feedback = {}
    if correct:
        battle['correct_answers'] += 1
        feedback = {'correct': True, 'message': 'Correct! You dodged the attack!'}
    else:
        damage = monster.attack
        player.take_damage(damage)
        feedback = {
            'correct': False,
            'message': f'Wrong! The answer was "{current_q_data["answer"]}". {monster.name} hits you for {damage} damage!',
            'correct_answer': current_q_data['answer'],
            'damage': damage,
        }

    battle['current_q'] += 1

    # Check win/loss conditions
    battle_over = False
    battle_won = False
    next_question = None

    if battle['correct_answers'] >= battle['required_correct']:
        # Player won the battle
        battle_over = True
        battle_won = True
        game['defeated_monsters'].append(battle['monster_id'])

        # Check story mode win condition
        if game['mode'] == 'story' and len(game['defeated_monsters']) == len(game['monsters']):
            game['won'] = True
            game['game_over'] = True
        elif game['mode'] == 'adventure':
            game['won'] = True
            game['game_over'] = True

    elif not player.is_alive():
        battle_over = True
        battle_won = False
        game['game_over'] = True
        game['won'] = False
    elif battle['current_q'] >= len(battle['questions']):
        # Ran out of questions — refill from pool
        question_pool = game['questions'][monster.difficulty]
        extra = random.sample(question_pool, min(5, len(question_pool)))
        battle['questions'].extend([{'prompt': q.prompt, 'answer': q.answer} for q in extra])

    if not battle_over and battle['current_q'] < len(battle['questions']):
        nq = battle['questions'][battle['current_q']]
        next_question = {
            'prompt': nq['prompt'],
            'index': battle['current_q'],
            'total': battle['required_correct'],
        }

    return jsonify({
        'ok': True,
        'feedback': feedback,
        'player_health': player.health,
        'correct_answers': battle['correct_answers'],
        'required_correct': battle['required_correct'],
        'battle_over': battle_over,
        'battle_won': battle_won,
        'next_question': next_question,
        'game_over': game['game_over'],
        'game_won': game['won'],
    })

@app.route('/api/battle/flee', methods=['POST'])
def flee():
    """Player flees the battle."""
    sid = get_session_id()
    game = get_game(sid)
    if not game:
        return jsonify({'ok': False})
    if 'battle' in game:
        del game['battle']
    return jsonify({'ok': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
