# =============================================================================
# app.py — Flask Backend for C++ Quest Academy
# =============================================================================
# HOW TO RUN:
#   pip install flask
#   python app.py
#   Open http://localhost:5173 (Vite) or http://localhost:5000 (Flask direct)
# =============================================================================

from flask import Flask, jsonify, request, session, render_template
import random
import os

# Your unchanged game classes
from player import Player
from monsters import create_monsters
from questions import create_questions

app = Flask(__name__)
app.secret_key = "cpp_quest_secret_key_change_in_production"

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------
# game_sessions[sid] = {
#   'player':            Player object,
#   'monsters':          [Monster, ...],
#   'questions':         {'Easy': [Question, ...], ...},
#   'mode':              'story' | 'adventure',
#   'defeated_monsters': [0, 2, ...],
#   'story_index':       int,   <- next monster index in story mode
#   'game_over':         bool,
#   'won':               bool,
#   'battle':            { ... } or absent
# }
game_sessions = {}


def get_sid():
    """Return (and create if needed) a unique session ID stored in a cookie."""
    if 'sid' not in session:
        session['sid'] = os.urandom(16).hex()
    return session['sid']


def get_game():
    """Return the current session's game dict, or None."""
    return game_sessions.get(get_sid())


# ---------------------------------------------------------------------------
# Page route
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


# ---------------------------------------------------------------------------
# API: start a new game
# ---------------------------------------------------------------------------

@app.route('/api/start', methods=['POST'])
def start_game():
    """
    POST { name, mode }
    Creates a fresh game and returns the monster list.
    """
    data        = request.get_json()
    player_name = (data.get('name') or 'Hero').strip() or 'Hero'
    mode        = data.get('mode', 'story')

    sid = get_sid()
    game_sessions[sid] = {
        'player':            Player(player_name),
        'monsters':          create_monsters(),
        'questions':         create_questions(),
        'mode':              mode,
        'defeated_monsters': [],
        'story_index':       0,
        'game_over':         False,
        'won':               False,
    }
    g = game_sessions[sid]

    return jsonify({
        'ok':     True,
        'player': {'name': g['player'].name, 'health': g['player'].health},
        'mode':   mode,
        'monsters': [
            {'id': i, 'name': m.name, 'attack': m.attack,
             'difficulty': m.difficulty, 'defeated': False}
            for i, m in enumerate(g['monsters'])
        ],
    })


# ---------------------------------------------------------------------------
# API: current state
# ---------------------------------------------------------------------------

@app.route('/api/state', methods=['GET'])
def get_state():
    g = get_game()
    if not g:
        return jsonify({'ok': False, 'error': 'No active game'})
    return jsonify({
        'ok':                True,
        'player':            {'name': g['player'].name, 'health': g['player'].health},
        'defeated_monsters': g['defeated_monsters'],
        'story_index':       g['story_index'],
        'game_over':         g['game_over'],
        'won':               g['won'],
    })


# ---------------------------------------------------------------------------
# API: start a battle
# ---------------------------------------------------------------------------

@app.route('/api/battle/start', methods=['POST'])
def battle_start():
    """
    POST { monster_id }
    Validates the request, selects 5 random questions, stores battle state.
    Story mode enforces sequential order (monster_id must equal story_index).
    """
    data       = request.get_json()
    monster_id = data.get('monster_id')

    g = get_game()
    if not g:
        return jsonify({'ok': False, 'error': 'No active game'})
    if monster_id in g['defeated_monsters']:
        return jsonify({'ok': False, 'error': 'Monster already defeated'})

    # Story mode: must fight monsters in order 0 -> 1 -> 2 -> 3 -> 4
    if g['mode'] == 'story' and monster_id != g['story_index']:
        return jsonify({
            'ok':    False,
            'error': f"Defeat monster #{g['story_index']} first!",
        })

    monster       = g['monsters'][monster_id]
    question_pool = g['questions'][monster.difficulty]

    # Pick 5 unique random questions. min() guards against small pools.
    selected = random.sample(question_pool, min(5, len(question_pool)))

    g['battle'] = {
        'monster_id':    monster_id,
        'questions':     [{'prompt': q.prompt, 'answer': q.answer} for q in selected],
        'current_q':     0,   # index of the active question
        'correct_count': 0,   # how many answered correctly so far
        'required':      5,   # need all 5 to win
    }

    first = selected[0]
    return jsonify({
        'ok':      True,
        'monster': {
            'id':         monster_id,
            'name':       monster.name,
            'attack':     monster.attack,
            'difficulty': monster.difficulty,
        },
        'question': {
            'prompt': first.prompt,
            'number': 1,
            'total':  5,
        },
        'player_health': g['player'].health,
        'correct_count': 0,
        'required':      5,
    })


# ---------------------------------------------------------------------------
# API: submit an answer
# ---------------------------------------------------------------------------

@app.route('/api/battle/answer', methods=['POST'])
def battle_answer():
    """
    POST { answer }

    Correct  -> correct_count += 1, advance to next question.
    Wrong    -> random 5-15 HP damage, SAME question repeated.
    5 correct -> battle won.
    HP = 0   -> game over.
    """
    data        = request.get_json()
    user_answer = (data.get('answer') or '').strip().lower()

    g = get_game()
    if not g or 'battle' not in g:
        return jsonify({'ok': False, 'error': 'No active battle'})

    b       = g['battle']
    player  = g['player']
    monster = g['monsters'][b['monster_id']]

    # Always check the current question (does not change on wrong answer)
    current_q  = b['questions'][b['current_q']]
    is_correct = (user_answer == current_q['answer'])

    if is_correct:
        b['correct_count'] += 1
        b['current_q']     += 1   # advance only on correct answer
        feedback = {'correct': True,  'message': 'Correct!', 'damage': 0}
    else:
        damage = random.randint(5, 15)
        player.take_damage(damage)
        feedback = {
            'correct': False,
            'message': f'Wrong! -{damage} HP. Try again!',
            'damage':  damage,
        }

    # ── Check end conditions ──────────────────────────────────────────────
    battle_over   = False
    battle_won    = False
    next_question = None

    if b['correct_count'] >= b['required']:
        # Win
        battle_over = True
        battle_won  = True
        g['defeated_monsters'].append(b['monster_id'])
        if g['mode'] == 'story':
            g['story_index'] += 1
            if len(g['defeated_monsters']) == len(g['monsters']):
                g['game_over'] = True
                g['won']       = True
        elif g['mode'] == 'adventure':
            g['game_over'] = True
            g['won']       = True

    elif not player.is_alive():
        # Lose
        battle_over    = True
        battle_won     = False
        g['game_over'] = True
        g['won']       = False

    else:
        # Continue — send the current question (same on wrong, next on correct)
        nq = b['questions'][b['current_q']]
        next_question = {
            'prompt': nq['prompt'],
            'number': b['current_q'] + 1,
            'total':  b['required'],
        }

    if battle_over:
        del g['battle']

    return jsonify({
        'ok':            True,
        'feedback':      feedback,
        'player_health': player.health,
        'correct_count': b['correct_count'],
        'required':      b['required'],
        'battle_over':   battle_over,
        'battle_won':    battle_won,
        'next_question': next_question,
        'game_over':     g['game_over'],
        'game_won':      g['won'],
    })


# ---------------------------------------------------------------------------
# API: flee
# ---------------------------------------------------------------------------

@app.route('/api/battle/flee', methods=['POST'])
def flee():
    """Exit a battle with no penalty."""
    g = get_game()
    if g and 'battle' in g:
        del g['battle']
    return jsonify({'ok': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
