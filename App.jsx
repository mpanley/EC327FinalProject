/* =============================================================================
   App.jsx
   The entire C++ Quest Academy React application.

   STRUCTURE:
     Hooks & state  — all game state lives in the top-level <App> component
     Three.js setup — world scene, player mesh, monster meshes, portraits
     API helpers    — thin fetch() wrappers that talk to the Flask backend
     Game flow      — startGame, enterBattle, submitAnswer, flee, gameOver
     Components     — MenuScreen, HUD, ProximityPrompt, AdventureScreen,
                      CombatScreen, FeedbackToast, GameOverScreen

   HOW SCREENS WORK:
     A single `screen` state string controls what's visible:
       'menu'      → MenuScreen overlay + Three.js background
       'world'     → HUD + ProximityPrompt + Three.js (no overlay)
       'adventure' → AdventureScreen overlay (no Three.js world needed)
       'combat'    → CombatScreen overlay + portrait mini-renderers
       'gameover'  → GameOverScreen overlay
   ============================================================================= */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './App.css';

/* =============================================================================
   CONSTANTS
   ============================================================================= */

// Fixed spawn positions for the 5 monsters in the 3D world
const SPAWN_POS = [
  { x: -12, z: -10 },
  { x:  11, z: -14 },
  { x:  14, z:   5 },
  { x:  -5, z:  13 },
  { x: -14, z:   3 },
];

// One colour per monster (indexed 0–4)
const MONSTER_COLORS = [0x44ff88, 0xff6644, 0x44aaff, 0xbb44ff, 0xff4466];

// Player walk speed (units per frame)
const WALK_SPEED = 0.13;

// Distance at which the proximity prompt appears
const INTERACT_DIST = 5;

// Maps difficulty string → CSS class for colour coding
const DIFF_CLASS = {
  'Easy':        'diff-easy',
  'Easy Medium': 'diff-easy-medium',
  'Medium':      'diff-medium',
  'Medium Hard': 'diff-medium-hard',
  'Hard':        'diff-hard',
};


/* =============================================================================
   THREE.JS BUILDER FUNCTIONS
   These live outside React components so they don't get re-created on
   every render. They return THREE.js objects that we store in refs.
   ============================================================================= */

/**
 * buildPlayerMesh()
 * Assembles the player character from primitive boxes:
 *   head, body, two arms, two legs (animated), sword
 * Returns a THREE.Group.
 */
function buildPlayerMesh() {
  const g        = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xfbbf7a });
  const swordMat = new THREE.MeshLambertMaterial({ color: 0xbfdbfe, emissive: 0x1e3a8a });

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skinMat);
  head.position.y = 1.88;
  g.add(head);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.38), bodyMat);
  body.position.y = 1.12;
  g.add(body);

  // Arms (left and right)
  [-0.52, 0.52].forEach(x => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.65, 0.20), bodyMat);
    arm.position.set(x, 1.05, 0);
    g.add(arm);
  });

  // Legs — named so the walk loop can find and rotate them
  [-0.17, 0.17].forEach((x, i) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.26), bodyMat);
    leg.position.set(x, 0.38, 0);
    leg.name = `leg_${i}`;
    g.add(leg);
  });

  // Sword
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), swordMat);
  sword.position.set(0.70, 1.42, 0);
  g.add(sword);

  return g;
}

/**
 * buildMonsterMesh(idx)
 * Each monster has a distinct body shape based on its tier (0–4).
 * All share the same glowing-red-eyes detail.
 */
function buildMonsterMesh(idx) {
  const g      = new THREE.Group();
  const color  = MONSTER_COLORS[idx];
  const mat    = new THREE.MeshLambertMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.12),
  });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0x990000 });

  // Body shape varies by monster tier
  const bodyShapes = [
    new THREE.BoxGeometry(0.80, 0.95, 0.55),   // 0 Goblin
    new THREE.BoxGeometry(1.00, 1.10, 0.65),   // 1 Bug Beast
    new THREE.SphereGeometry(0.52, 8, 6),       // 2 Syntax Snake
    new THREE.ConeGeometry(0.50, 1.20, 6),      // 3 Pointer Phantom
    new THREE.BoxGeometry(1.15, 1.40, 0.80),   // 4 Seg Ogre
  ];

  const body = new THREE.Mesh(bodyShapes[idx] || bodyShapes[0], mat);
  body.position.y = 1.15;
  g.add(body);

  // Sphere head
  const headMat = new THREE.MeshLambertMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.25),
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), headMat);
  head.position.y = 2.05;
  g.add(head);

  // Two glowing red eyes
  [-0.13, 0.13].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), eyeMat);
    eye.position.set(x, 2.10, 0.31);
    g.add(eye);
  });

  // Tier 3+ monsters get a floating orb above them
  if (idx >= 3) {
    const orbMat = new THREE.MeshLambertMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.45),
    });
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), orbMat);
    orb.position.y = 3.1;
    orb.name = 'orb';
    g.add(orb);
  }

  return g;
}

/**
 * buildPillars(scene)
 * Adds decorative stone pillars with glowing gem tops to the scene.
 */
function buildPillars(scene) {
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0e1f10 });
  const gemMat    = new THREE.MeshLambertMaterial({ color: 0x00ff88, emissive: 0x003322 });

  const positions = [
    [-18,-18],[18,-18],[-18,18],[18,18],
    [ -8, -8],[ 8, -8],[-8,  8],[ 8,  8],
    [  0,-18],[ 0, 18],[-18,  0],[18,  0],
  ];

  positions.forEach(([x, z]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 5, 8), pillarMat);
    pillar.position.set(x, 2.5, z);
    pillar.castShadow = true;
    scene.add(pillar);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), gemMat);
    gem.position.set(x, 5.5, z);
    scene.add(gem);
  });
}


/* =============================================================================
   API HELPERS
   ============================================================================= */

/**
 * apiPost(path, body)
 * POST JSON to /api<path> on the Flask backend and return parsed response.
 * The Flask server runs on the same host (localhost:5000 in dev) so no
 * CORS issues — Vite proxies /api/* to Flask (configured in vite.config.js).
 */
async function apiPost(path, body = {}) {
  const res = await fetch(`/api${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}


/* =============================================================================
   ROOT APP COMPONENT
   ============================================================================= */

export default function App() {

  /* ── Game state ──────────────────────────────────────────────────────────── */
  const [screen,      setScreen]      = useState('menu');   // current screen
  const [playerName,  setPlayerName]  = useState('Hero');   // from menu input
  const [playerHP,    setPlayerHP]    = useState(100);      // live HP value
  const [mode,        setMode]        = useState('story');  // 'story'|'adventure'
  const [monsters,    setMonsters]    = useState([]);       // from API
  const [defeatedIds, setDefeatedIds] = useState(new Set());

  // Combat-specific state
  const [battleMonster,   setBattleMonster]   = useState(null);  // monster object
  const [question,        setQuestion]        = useState(null);  // { prompt, number, total }
  const [correctAnswers,  setCorrectAnswers]  = useState(0);
  const [requiredCorrect, setRequiredCorrect] = useState(5);
  const [answerValue,     setAnswerValue]     = useState('');
  const [answerDisabled,  setAnswerDisabled]  = useState(false);

  // Proximity prompt state
  const [nearbyMonster, setNearbyMonster] = useState(null); // monster object or null

  // Feedback toast state
  const [toast, setToast] = useState({ visible: false, message: '', correct: true });

  /* ── Refs — values that must persist across renders without causing re-renders ── */

  // Three.js world objects
  const canvasRef      = useRef(null);  // the <canvas> element
  const rendererRef    = useRef(null);
  const sceneRef       = useRef(null);
  const cameraRef      = useRef(null);
  const playerMeshRef  = useRef(null);
  const monsterMeshesRef = useRef([]);
  const walkTimerRef   = useRef(0);
  const worldLoopIdRef = useRef(null);

  // Portrait mini-renderer refs (combat screen)
  const playerPortraitRef  = useRef(null); // <canvas> DOM node
  const monsterPortraitRef = useRef(null); // <canvas> DOM node
  const portraitStateRef   = useRef({
    player:  { renderer: null, scene: null, camera: null, mesh: null },
    monster: { renderer: null, scene: null, camera: null, mesh: null },
    animId:  null,
  });

  // Keyboard state — stored in a ref so the animation loop can read it
  // without needing a re-render every frame
  const heldKeysRef = useRef({});

  // Keep a ref to the latest nearbyMonster so the keydown handler (which
  // closes over the initial value) can still read the current one
  const nearbyMonsterRef = useRef(null);
  useEffect(() => { nearbyMonsterRef.current = nearbyMonster; }, [nearbyMonster]);

  // Same for screen — keydown needs the current screen
  const screenRef = useRef('menu');
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Same for defeatedIds
  const defeatedIdsRef = useRef(new Set());
  useEffect(() => { defeatedIdsRef.current = defeatedIds; }, [defeatedIds]);

  // Toast auto-hide timer
  const toastTimerRef = useRef(null);

  /* ── Three.js world initialisation ──────────────────────────────────────── */

  /**
   * initWorld()
   * Creates the Three.js scene, renderer, camera, lighting, floor, walls,
   * pillars, and player mesh. Called once after the component mounts.
   */
  const initWorld = useCallback(() => {
    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x050a0e);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog   = new THREE.Fog(0x050a0e, 28, 55);
    sceneRef.current = scene;

    // Camera — angled top-down
    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 18, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0x00ff44, 0.22));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 20, 8);
    sun.castShadow = true;
    scene.add(sun);
    const dungeonGlow = new THREE.PointLight(0x00ff88, 1.1, 22);
    dungeonGlow.position.set(0, 4, 0);
    scene.add(dungeonGlow);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80, 40, 40),
      new THREE.MeshLambertMaterial({ color: 0x061408 })
    );
    floor.rotation.x    = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.GridHelper(80, 40, 0x003311, 0x001d09));

    // Boundary walls (cosmetic)
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x0a2010 });
    [[40, 0, 0.5, 80], [-40, 0, 0.5, 80], [0, 40, 80, 0.5], [0, -40, 80, 0.5]]
      .forEach(([x, z, w, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat);
        m.position.set(x, 1.5, z);
        scene.add(m);
      });

    // Pillars
    buildPillars(scene);

    // Player
    const playerMesh = buildPlayerMesh();
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    // Window resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Start the render loop
    startWorldLoop();

    // Cleanup when the component unmounts
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(worldLoopIdRef.current);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * startWorldLoop()
   * The main Three.js animation loop. Handles player movement, camera follow,
   * monster animations, and proximity detection every frame.
   */
  const startWorldLoop = useCallback(() => {
    const loop = () => {
      worldLoopIdRef.current = requestAnimationFrame(loop);

      const scene    = sceneRef.current;
      const camera   = cameraRef.current;
      const renderer = rendererRef.current;
      const player   = playerMeshRef.current;
      if (!scene || !camera || !renderer || !player) return;

      // Only move the player when exploring the world
      if (screenRef.current === 'world') {
        const keys = heldKeysRef.current;
        let dx = 0, dz = 0;
        if (keys['KeyW'] || keys['ArrowUp'])    dz -= WALK_SPEED;
        if (keys['KeyS'] || keys['ArrowDown'])  dz += WALK_SPEED;
        if (keys['KeyA'] || keys['ArrowLeft'])  dx -= WALK_SPEED;
        if (keys['KeyD'] || keys['ArrowRight']) dx += WALK_SPEED;

        const moving = dx !== 0 || dz !== 0;
        if (moving) {
          const BOUND = 37;
          player.position.x = Math.max(-BOUND, Math.min(BOUND, player.position.x + dx));
          player.position.z = Math.max(-BOUND, Math.min(BOUND, player.position.z + dz));
          player.rotation.y = Math.atan2(dx, dz);

          // Animate legs with a sine wave walk cycle
          walkTimerRef.current += 0.12;
          player.children.forEach(child => {
            if (child.name === 'leg_0') child.rotation.x =  Math.sin(walkTimerRef.current) * 0.55;
            if (child.name === 'leg_1') child.rotation.x = -Math.sin(walkTimerRef.current) * 0.55;
          });
        }

        // Camera smoothly follows the player
        const targetX = player.position.x * 0.28;
        const targetZ = player.position.z * 0.28 + 15;
        camera.position.x += (targetX - camera.position.x) * 0.06;
        camera.position.z += (targetZ - camera.position.z) * 0.06;
        camera.lookAt(player.position.x * 0.1, 0, player.position.z * 0.1);

        // Monster idle animations
        monsterMeshesRef.current.forEach(mesh => {
          if (!mesh || mesh.userData.defeated) return;
          mesh.userData.bobTime = (mesh.userData.bobTime || 0) + 0.025;
          mesh.position.y = Math.sin(mesh.userData.bobTime) * 0.14;
          mesh.rotation.y += 0.012;
          const orb = mesh.children.find(c => c.name === 'orb');
          if (orb) orb.rotation.y += 0.055;
        });

        // Proximity detection — updates nearbyMonster state
        detectProximity(player);
      }

      renderer.render(scene, camera);
    };

    loop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * detectProximity(playerMesh)
   * Checks XZ distance from the player to every living monster.
   * If one is close enough, updates nearbyMonster state to show the prompt.
   * Uses a ref comparison to avoid unnecessary React re-renders every frame.
   */
  const lastNearbyRef = useRef(null); // track last found to avoid spam setState

  const detectProximity = useCallback((player) => {
    const px = player.position.x;
    const pz = player.position.z;
    let found = null;

    monsterMeshesRef.current.forEach((mesh, i) => {
      if (!mesh || mesh.userData.defeated) return;
      if (defeatedIdsRef.current.has(i))   return;
      const dx   = mesh.position.x - px;
      const dz   = mesh.position.z - pz;
      if (Math.sqrt(dx * dx + dz * dz) < INTERACT_DIST) found = i;
    });

    // Only call setState if the nearby monster actually changed
    if (found !== lastNearbyRef.current) {
      lastNearbyRef.current = found;
      setNearbyMonster(found !== null ? monsters[found] ?? null : null);
    }
  }, [monsters]);

  // Re-run proximity when the monsters list changes (after startGame)
  useEffect(() => {
    lastNearbyRef.current = null;
  }, [monsters]);

  /**
   * spawnMonsters(monsterList)
   * Removes old monster meshes from the scene and creates new ones.
   * Called after the API returns the monster list.
   */
  const spawnMonsters = useCallback((monsterList) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous meshes
    monsterMeshesRef.current.forEach(m => m && scene.remove(m));
    monsterMeshesRef.current = [];

    monsterList.forEach((monster, i) => {
      const mesh = buildMonsterMesh(i);
      const pos  = SPAWN_POS[i];
      mesh.position.set(pos.x, 0, pos.z);
      mesh.userData.bobTime  = Math.random() * Math.PI * 2;
      mesh.userData.defeated = false;
      scene.add(mesh);
      monsterMeshesRef.current.push(mesh);
    });
  }, []);

  /**
   * sinkMonster(id)
   * Plays the defeat animation: the monster sinks below the floor, then
   * is removed from the scene.
   */
  const sinkMonster = useCallback((id) => {
    const mesh = monsterMeshesRef.current[id];
    if (!mesh) return;
    mesh.userData.defeated = true;

    let y = mesh.position.y;
    const timer = setInterval(() => {
      y -= 0.07;
      mesh.position.y = y;
      if (y <= -4) {
        clearInterval(timer);
        sceneRef.current?.remove(mesh);
      }
    }, 20);
  }, []);

  /* ── Portrait mini-renderers ─────────────────────────────────────────────── */

  /**
   * initPortraits()
   * Creates two tiny Three.js scenes that render into the combat-screen
   * portrait <canvas> elements. Called when the combat screen mounts.
   */
  const initPortraits = useCallback(() => {
    const ps = portraitStateRef.current;

    ['player', 'monster'].forEach(side => {
      const canvas   = side === 'player' ? playerPortraitRef.current : monsterPortraitRef.current;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(130, 130);
      renderer.setClearColor(0x000000, 0);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
      camera.position.set(0, 1.8, 4.2);
      camera.lookAt(0, 1.2, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const dir = new THREE.DirectionalLight(0x00ff88, 1.3);
      dir.position.set(2, 5, 3);
      scene.add(dir);

      ps[side].renderer = renderer;
      ps[side].scene    = scene;
      ps[side].camera   = camera;
    });

    // Always show the player model in the player portrait
    const pm = buildPlayerMesh();
    ps.player.mesh = pm;
    ps.player.scene?.add(pm);
  }, []);

  /**
   * setMonsterPortrait(monsterId)
   * Swaps the monster model in the portrait mini-scene when combat starts.
   */
  const setMonsterPortrait = useCallback((id) => {
    const ps = portraitStateRef.current;
    if (ps.monster.mesh) ps.monster.scene?.remove(ps.monster.mesh);
    const mesh = buildMonsterMesh(id);
    ps.monster.mesh = mesh;
    ps.monster.scene?.add(mesh);
  }, []);

  /**
   * startPortraitAnimation() / stopPortraitAnimation()
   * Run/stop the animation loop for the two portrait renderers.
   */
  const startPortraitAnimation = useCallback(() => {
    stopPortraitAnimation();
    const ps = portraitStateRef.current;
    let t    = 0;

    const loop = () => {
      ps.animId = requestAnimationFrame(loop);
      t += 0.035;

      if (ps.player.mesh)  ps.player.mesh.rotation.y  = Math.sin(t) * 0.3;
      if (ps.monster.mesh) {
        ps.monster.mesh.rotation.y  = Math.PI + Math.sin(t + 1) * 0.35;
        ps.monster.mesh.position.y  = Math.sin(t * 1.3) * 0.08;
      }

      if (ps.player.renderer && ps.player.scene && ps.player.camera)
        ps.player.renderer.render(ps.player.scene, ps.player.camera);
      if (ps.monster.renderer && ps.monster.scene && ps.monster.camera)
        ps.monster.renderer.render(ps.monster.scene, ps.monster.camera);
    };

    loop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPortraitAnimation = useCallback(() => {
    const ps = portraitStateRef.current;
    if (ps.animId !== null) {
      cancelAnimationFrame(ps.animId);
      ps.animId = null;
    }
  }, []);

  /* ── Lifecycle: mount / unmount ──────────────────────────────────────────── */

  useEffect(() => {
    // Init the Three.js world as soon as the canvas element exists
    const cleanup = initWorld();
    return cleanup;
  }, [initWorld]);

  // Init portrait renderers when canvas refs are available
  // We do this lazily inside enterBattle() instead since the canvases
  // are only in the DOM when the combat screen is visible.

  /* ── Keyboard input ──────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (e) => {
      heldKeysRef.current[e.code] = true;

      // E or Space — interact with nearby monster in world view
      if ((e.code === 'KeyE' || e.code === 'Space') && screenRef.current === 'world') {
        const nearby = nearbyMonsterRef.current;
        if (nearby && !defeatedIdsRef.current.has(nearby.id)) {
          enterBattle(nearby.id);
        }
        if (e.code === 'Space') e.preventDefault();
      }
    };

    const onKeyUp = (e) => {
      heldKeysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Toast helper ────────────────────────────────────────────────────────── */

  const showToast = useCallback((message, correct) => {
    clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, correct });
    toastTimerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 1500);
  }, []);

  /* ── Game flow functions ─────────────────────────────────────────────────── */

  /**
   * startGame(mode)
   * Sends setup info to the backend, stores the returned monster list,
   * and transitions to either the world (story) or the monster list (adventure).
   */
  const startGame = useCallback(async (chosenMode) => {
    const name = playerName.trim() || 'Hero';
    setMode(chosenMode);

    const data = await apiPost('/start', { name, mode: chosenMode });
    if (!data.ok) { alert('Could not reach the Flask server. Is it running on port 5000?'); return; }

    setMonsters(data.monsters);
    setDefeatedIds(new Set());
    setPlayerHP(100);

    if (chosenMode === 'story') {
      // Reset player position in the world
      if (playerMeshRef.current) playerMeshRef.current.position.set(0, 0, 0);
      spawnMonsters(data.monsters);
      setScreen('world');
    } else {
      setScreen('adventure');
    }
  }, [playerName, spawnMonsters]);

  /**
   * enterBattle(monsterId)
   * Tells the backend to start a battle, then transitions to the combat screen.
   */
  const enterBattle = useCallback(async (monsterId) => {
    const data = await apiPost('/battle/start', { monster_id: monsterId });
    if (!data.ok) { alert(data.error || 'Could not start battle.'); return; }

    setBattleMonster(data.monster);
    setQuestion(data.question);
    setCorrectAnswers(data.correct_answers);
    setRequiredCorrect(data.required_correct);
    setAnswerValue('');
    setAnswerDisabled(false);
    setNearbyMonster(null);

    setScreen('combat');

    // Portrait renderers need the canvas elements to be in the DOM first.
    // requestAnimationFrame defers until after React has painted the combat screen.
    requestAnimationFrame(() => {
      initPortraits();
      setMonsterPortrait(monsterId);
      startPortraitAnimation();

      // Auto-focus the answer input
      document.getElementById('answer-input')?.focus();
    });
  }, [initPortraits, setMonsterPortrait, startPortraitAnimation]);

  /**
   * submitAnswer()
   * Reads the answer input, posts to the backend, handles the response.
   */
  const submitAnswer = useCallback(async () => {
    if (!answerValue.trim() || answerDisabled) return;

    setAnswerDisabled(true);
    const answer = answerValue.trim();
    setAnswerValue('');

    const data = await apiPost('/battle/answer', { answer });
    if (!data.ok) { setAnswerDisabled(false); return; }

    // Update counters and bars
    setPlayerHP(data.player_health);
    setCorrectAnswers(data.correct_answers);
    showToast(data.feedback.message, data.feedback.correct);

    if (data.battle_over) {
      stopPortraitAnimation();

      if (data.battle_won) {
        // Mark monster as defeated
        setDefeatedIds(prev => {
          const next = new Set(prev);
          next.add(battleMonster.id);
          return next;
        });
        if (mode === 'story') sinkMonster(battleMonster.id);
      }

      // Wait for toast to be readable, then navigate
      setTimeout(() => {
        if (data.game_over) {
          setScreen(data.game_won ? 'gameover-win' : 'gameover-lose');
        } else if (mode === 'adventure') {
          setScreen('adventure');
        } else {
          setScreen('world');
          setNearbyMonster(null);
        }
      }, 1800);

    } else if (data.next_question) {
      // Show next question after a brief pause
      setTimeout(() => {
        setQuestion(data.next_question);
        setAnswerDisabled(false);
        document.getElementById('answer-input')?.focus();
      }, 1100);
    } else {
      setAnswerDisabled(false);
      document.getElementById('answer-input')?.focus();
    }
  }, [answerValue, answerDisabled, battleMonster, mode, showToast, sinkMonster, stopPortraitAnimation]);

  /**
   * fleeBattle()
   * Cancels the current battle with no penalty.
   */
  const fleeBattle = useCallback(async () => {
    await apiPost('/battle/flee');
    stopPortraitAnimation();
    setScreen(mode === 'adventure' ? 'adventure' : 'world');
    setNearbyMonster(null);
  }, [mode, stopPortraitAnimation]);

  /**
   * returnToMenu()
   * Resets everything and goes back to the menu.
   */
  const returnToMenu = useCallback(() => {
    stopPortraitAnimation();
    setScreen('menu');
    setNearbyMonster(null);
    setMonsters([]);
    setDefeatedIds(new Set());
    setPlayerHP(100);
  }, [stopPortraitAnimation]);

  /* ── Derived values ──────────────────────────────────────────────────────── */

  // Which screens are active (used to apply/remove .hidden class)
  const isMenu      = screen === 'menu';
  const isWorld     = screen === 'world';
  const isAdventure = screen === 'adventure';
  const isCombat    = screen === 'combat';
  const isGameOver  = screen === 'gameover-win' || screen === 'gameover-lose';
  const gameWon     = screen === 'gameover-win';

  const showHUD      = isWorld || isAdventure || isCombat;
  const showProgress = isWorld || isAdventure || isCombat;
  const showHint     = isWorld;
  const showProximity = isWorld && nearbyMonster !== null;

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Three.js canvas (always present, always rendering) ── */}
      <canvas ref={canvasRef} className="game-canvas" />

      {/* ── Scanline overlay ── */}
      <div className="scanlines" />

      {/* ── HUD (health bar) ── */}
      {showHUD && (
        <div className="hud">
          <div className="hud-left">
            <div className="hud-name">{(playerName || 'HERO').toUpperCase()}</div>
            <div className="hud-mode">{mode === 'story' ? 'STORY MODE' : 'ADVENTURE MODE'}</div>
          </div>
          <div className="hp-wrap">
            <span className="hp-label">HP</span>
            <div className="hp-bar">
              <div className="hp-fill" style={{ width: `${Math.max(0, playerHP)}%` }} />
            </div>
            <span className="hp-text">{playerHP} / 100</span>
          </div>
        </div>
      )}

      {/* ── Monster progress (top-right dots) ── */}
      {showProgress && monsters.length > 0 && (
        <div className="monster-progress">
          {monsters.map(m => (
            <div key={m.id} className={`prog-item${defeatedIds.has(m.id) ? ' defeated' : ''}`}>
              <span>{m.name}</span>
              <span className="prog-dot" />
            </div>
          ))}
        </div>
      )}

      {/* ── Controls hint ── */}
      {showHint && (
        <div className="controls-hint">
          WASD / ARROW KEYS — move &nbsp;|&nbsp; E or SPACE — interact
        </div>
      )}

      {/* ── Proximity prompt ── */}
      <div className={`proximity-prompt${showProximity ? ' visible' : ''}`}>
        {nearbyMonster && (
          <>
            <div className="prox-name">{nearbyMonster.name.toUpperCase()}</div>
            <div className="prox-info">
              Difficulty:{' '}
              <span className={DIFF_CLASS[nearbyMonster.difficulty] || ''}>
                {nearbyMonster.difficulty}
              </span>
              &nbsp;|&nbsp; Attack: {nearbyMonster.attack} dmg / wrong answer
            </div>
            <div className="prox-actions">
              <button className="btn yellow" onClick={() => enterBattle(nearbyMonster.id)}>
                <span>⚔ Fight</span>
              </button>
              <button className="btn red" onClick={() => setNearbyMonster(null)}>
                <span>✗ Retreat</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── MENU SCREEN ── */}
      <div className={`screen menu-screen${isMenu ? '' : ' hidden'}`}>
        <div className="menu-title">C++ QUEST<br />ACADEMY</div>
        <div className="menu-sub">The Dungeon of Code</div>

        <input
          className="name-input"
          type="text"
          placeholder="Enter your name…"
          maxLength={20}
          autoComplete="off"
          value={playerName === 'Hero' ? '' : playerName}
          onChange={e => setPlayerName(e.target.value || 'Hero')}
          onKeyDown={e => e.key === 'Enter' && startGame('story')}
        />

        <div className="mode-buttons">
          <button className="btn" onClick={() => startGame('story')}>
            <span>▶ Story Mode</span>
          </button>
          <button className="btn blue" onClick={() => startGame('adventure')}>
            <span>⚔ Adventure</span>
          </button>
        </div>

        <div className="mode-desc">
          STORY MODE — defeat all 5 monsters in order, from Goblin to Ogre.<br />
          ADVENTURE MODE — pick any one monster and prove your C++ knowledge.
        </div>
      </div>

      {/* ── ADVENTURE MODE SCREEN ── */}
      <div className={`screen adventure-screen${isAdventure ? '' : ' hidden'}`}>
        <div className="adv-heading">CHOOSE YOUR OPPONENT</div>
        <div className="adventure-list">
          {monsters.map(m => (
            <div
              key={m.id}
              className={`adv-item${defeatedIds.has(m.id) ? ' defeated' : ''}`}
              onClick={() => !defeatedIds.has(m.id) && enterBattle(m.id)}
            >
              <div className="adv-name">{m.name}</div>
              <div className="adv-meta">
                <span className={DIFF_CLASS[m.difficulty] || ''}>{m.difficulty}</span>
                <br />
                {m.attack} dmg / wrong
              </div>
            </div>
          ))}
        </div>
        <button className="btn red" onClick={returnToMenu}>
          <span>↩ Back to Menu</span>
        </button>
      </div>

      {/* ── COMBAT SCREEN ── */}
      <div className={`screen combat-screen${isCombat ? '' : ' hidden'}`}>
        <div className="combat-grid">

          {/* Player combatant */}
          <div className="combatant">
            <div className="combatant-label">PLAYER</div>
            {/* Three.js portrait renders into this canvas */}
            <canvas ref={playerPortraitRef} className="portrait-canvas" width={130} height={130} />
            <div className="combatant-name">{(playerName || 'Hero').toUpperCase()}</div>
            <div className="c-hp-bar">
              <div className="c-hp-fill player" style={{ width: `${Math.max(0, playerHP)}%` }} />
            </div>
          </div>

          {/* VS + correct answers counter */}
          <div className="vs-col">
            <div className="vs-text">VS</div>
            <div className="correct-display">
              {correctAnswers} / {requiredCorrect}<br />correct
            </div>
          </div>

          {/* Monster combatant */}
          <div className="combatant">
            <div className="combatant-label">ENEMY</div>
            <canvas ref={monsterPortraitRef} className="portrait-canvas" width={130} height={130} />
            <div className="combatant-name">
              {battleMonster ? battleMonster.name.toUpperCase() : ''}
            </div>
            <div className="c-hp-bar">
              <div
                className="c-hp-fill monster"
                style={{
                  width: `${Math.max(0, ((requiredCorrect - correctAnswers) / requiredCorrect) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Question panel — spans all 3 columns via CSS grid-column: 1 / -1 */}
          <div className="question-panel">
            <div className="q-meta">
              <span>
                {battleMonster ? `DIFFICULTY: ${battleMonster.difficulty.toUpperCase()}` : ''}
              </span>
              <span>
                {question ? `Question ${question.number} of ${question.total}` : ''}
              </span>
            </div>
            <div className="q-text">
              {question ? question.prompt : 'Loading question…'}
            </div>
            <div className="answer-row">
              <input
                id="answer-input"
                className="answer-input"
                type="text"
                placeholder="Type your answer and press Enter…"
                autoComplete="off"
                value={answerValue}
                disabled={answerDisabled}
                onChange={e => setAnswerValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              />
              <button className="btn" onClick={submitAnswer}>
                <span>Submit</span>
              </button>
              <button className="btn red" onClick={fleeBattle}>
                <span>Flee</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── FEEDBACK TOAST ── */}
      <div
        className={`feedback-toast${toast.visible ? ' show' : ''}${toast.correct ? ' correct' : ' wrong'}`}
      >
        {toast.message}
      </div>

      {/* ── GAME OVER SCREEN ── */}
      <div className={`screen gameover-screen${isGameOver ? '' : ' hidden'}`}>
        <div className={`go-title ${gameWon ? 'win' : 'lose'}`}>
          {gameWon ? 'VICTORY!' : 'DEFEATED'}
        </div>
        <div className="go-sub">
          {gameWon
            ? `${playerName} mastered the C++ dungeon!`
            : `${playerName} was defeated. Better luck next time.`}
        </div>
        <button className="btn" onClick={returnToMenu}>
          <span>↩ Play Again</span>
        </button>
      </div>
    </>
  );
}
