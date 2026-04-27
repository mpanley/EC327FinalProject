/* =============================================================================
   App.jsx — C++ Quest Academy
   =============================================================================

   ROOT PROBLEMS FIXED vs. previous version:
   ------------------------------------------
   1. STALE CLOSURE BUG (E key did nothing):
      The keydown handler closed over a stale `triggerBattle` reference
      because useEffect deps were incomplete.  Fix: store triggerBattle in a
      ref (triggerBattleRef) so the keydown handler always calls the latest
      version without needing to be re-registered.

   2. WRONG API FIELD NAME:
      submitAnswer was reading `data.correct` (undefined).
      The backend returns `data.feedback.correct`.  Fixed throughout.

   3. STORY MODE ORDER:
      Monsters now spawn along a lit-up path in sequential order (0→4).
      Non-next monsters are dimmed and cannot be interacted with.
      A glowing arrow/marker hovers over the next target.

   4. QUESTION COUNT:
      Changed from 3 → 5 questions per battle to match new backend.

   SCREENS:
     'menu'          → title / mode select
     'world'         → 3D dungeon, WASD to move, E/Space to interact
     'battle'        → Pokémon-style battle overlay
     'gameover-win'  → victory screen
     'gameover-lose' → defeat screen

   STORY MODE WORLD:
     • Monsters are placed along a winding lit path.
     • The current target glows and has a pulsing "!" marker above it.
     • All other undefeated monsters are dimmed (grey) and cannot be fought.
     • Defeated monsters sink into the floor.

   ADVENTURE MODE WORLD:
     • All monsters are active and can be fought in any order.
   ============================================================================= */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './App.css';

/* =============================================================================
   CONSTANTS
   ============================================================================= */

// Monster spawn positions — laid out as a winding path so story mode
// has a natural left-to-right / forward progression the player follows.
const SPAWN_POS = [
  { x: -14, z:  12 },   // 0 Goblin Coder    — start (near player spawn)
  { x:  -6, z:   4 },   // 1 Bug Beast
  { x:   4, z:  -2 },   // 2 Syntax Snake
  { x:  12, z: -10 },   // 3 Pointer Phantom
  { x:  18, z: -18 },   // 4 Segmentation Ogre — end
];

// Player starting position (near monster 0 but not on top of it)
const PLAYER_START = { x: -14, z: 18 };

// One colour per monster, used for both the 3D mesh and UI accents
const MONSTER_COLORS = [0x44ff88, 0xff9944, 0x44aaff, 0xbb44ff, 0xff4466];

const WALK_SPEED    = 0.13;   // units per frame
const INTERACT_DIST = 5.0;    // units — proximity trigger distance

// Difficulty string → CSS colour class
const DIFF_CLASS = {
  'Easy':        'diff-easy',
  'Easy Medium': 'diff-easy-medium',
  'Medium':      'diff-medium',
  'Medium Hard': 'diff-medium-hard',
  'Hard':        'diff-hard',
};

/* =============================================================================
   THREE.JS BUILDER FUNCTIONS
   Defined outside React so they are never re-created on re-renders.
   ============================================================================= */

/**
 * buildPlayerMesh()
 * Simple humanoid from primitive boxes.
 * Legs named 'leg_0' / 'leg_1' so the walk loop can rotate them.
 */
function buildPlayerMesh() {
  const g        = new THREE.Group();
  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
  const skinMat  = new THREE.MeshLambertMaterial({ color: 0xfbbf7a });
  const swordMat = new THREE.MeshLambertMaterial({ color: 0xbfdbfe, emissive: 0x1e3a8a });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), skinMat);
  head.position.y = 1.88;
  g.add(head);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.38), bodyMat);
  body.position.y = 1.12;
  g.add(body);

  [-0.52, 0.52].forEach(x => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.65, 0.20), bodyMat);
    arm.position.set(x, 1.05, 0);
    g.add(arm);
  });

  [-0.17, 0.17].forEach((x, i) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.26), bodyMat);
    leg.position.set(x, 0.38, 0);
    leg.name = `leg_${i}`;
    g.add(leg);
  });

  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), swordMat);
  sword.position.set(0.70, 1.42, 0);
  g.add(sword);

  return g;
}

/**
 * buildMonsterMesh(idx, dimmed)
 * Each monster has a distinct body shape.
 * dimmed = true makes the mesh grey (used for locked story-mode monsters).
 */
function buildMonsterMesh(idx, dimmed = false) {
  const g     = new THREE.Group();
  const color = dimmed ? 0x334433 : (MONSTER_COLORS[idx] ?? MONSTER_COLORS[0]);
  const mat   = new THREE.MeshLambertMaterial({
    color,
    emissive: dimmed ? 0x000000 : new THREE.Color(color).multiplyScalar(0.12),
  });
  const eyeColor = dimmed ? 0x223322 : 0xff2020;
  const eyeMat   = new THREE.MeshLambertMaterial({ color: eyeColor, emissive: dimmed ? 0x000000 : 0x990000 });

  const bodies = [
    new THREE.BoxGeometry(0.80, 0.95, 0.55),
    new THREE.BoxGeometry(1.00, 1.10, 0.65),
    new THREE.SphereGeometry(0.52, 8, 6),
    new THREE.ConeGeometry(0.50, 1.20, 6),
    new THREE.BoxGeometry(1.15, 1.40, 0.80),
  ];
  const body = new THREE.Mesh(bodies[idx] ?? bodies[0], mat);
  body.position.y = 1.15;
  g.add(body);

  const headMat = new THREE.MeshLambertMaterial({
    color,
    emissive: dimmed ? 0x000000 : new THREE.Color(color).multiplyScalar(0.25),
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), headMat);
  head.position.y = 2.05;
  g.add(head);

  [-0.13, 0.13].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), eyeMat);
    eye.position.set(x, 2.10, 0.31);
    g.add(eye);
  });

  if (idx >= 3 && !dimmed) {
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
 * buildExclamationMarker()
 * Creates a glowing "!" marker that floats above the next story target.
 * Returns a THREE.Group.
 */
function buildExclamationMarker() {
  const g   = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0x888800 });

  // Vertical bar of the "!"
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.18), mat);
  bar.position.y = 0.35;
  g.add(bar);

  // Dot of the "!"
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
  dot.position.y = -0.1;
  g.add(dot);

  return g;
}

/**
 * buildStoryPath(scene)
 * Draws a glowing path on the floor connecting the spawn positions in order.
 * Uses thin box segments between each consecutive pair of points.
 */
function buildStoryPath(scene) {
  const pathMat = new THREE.MeshLambertMaterial({
    color:    0x00ff88,
    emissive: 0x003311,
    transparent: true,
    opacity:  0.45,
  });

  // Also place small circular "stepping stones" every 1 unit along each segment
  const stoneMat = new THREE.MeshLambertMaterial({
    color:    0x00cc66,
    emissive: 0x002211,
    transparent: true,
    opacity: 0.6,
  });

  const pathObjects = [];

  // Start point — a circle under the player spawn
  const startCircle = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16), stoneMat);
  startCircle.position.set(PLAYER_START.x, 0.04, PLAYER_START.z);
  scene.add(startCircle);
  pathObjects.push(startCircle);

  // Draw segments between each consecutive monster spawn point
  // and also include a segment from player start to monster 0
  const pathPoints = [
    { x: PLAYER_START.x, z: PLAYER_START.z },
    ...SPAWN_POS,
  ];

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i];
    const b = pathPoints[i + 1];

    const dx     = b.x - a.x;
    const dz     = b.z - a.z;
    const len    = Math.sqrt(dx * dx + dz * dz);
    const midX   = (a.x + b.x) / 2;
    const midZ   = (a.z + b.z) / 2;
    const angle  = Math.atan2(dx, dz);

    // Thin flat box for the path segment
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, len), pathMat);
    seg.position.set(midX, 0.03, midZ);
    seg.rotation.y = angle;
    scene.add(seg);
    pathObjects.push(seg);

    // Stepping stones every 2 units along the segment
    const steps = Math.floor(len / 2);
    for (let s = 1; s <= steps; s++) {
      const t     = s / (steps + 1);
      const sx    = a.x + dx * t;
      const sz    = a.z + dz * t;
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 8), stoneMat);
      stone.position.set(sx, 0.035, sz);
      scene.add(stone);
      pathObjects.push(stone);
    }
  }

  // Circle under each monster spawn point
  SPAWN_POS.forEach((pos, i) => {
    const color   = MONSTER_COLORS[i];
    const circMat = new THREE.MeshLambertMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.3),
      transparent: true,
      opacity: 0.5,
    });
    const circ = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 16), circMat);
    circ.position.set(pos.x, 0.04, pos.z);
    scene.add(circ);
    pathObjects.push(circ);
  });

  // Return all path objects so they can be removed on returnToMenu
  return pathObjects;
}

/**
 * addPillars(scene)
 * Decorative stone pillars with glowing gem tops.
 */
function addPillars(scene) {
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0x0e1f10 });
  const gemMat    = new THREE.MeshLambertMaterial({ color: 0x00ff88, emissive: 0x003322 });

  [[-18,-18],[18,-18],[-18,18],[18,18],
   [-8,-8],[8,-8],[-8,8],[8,8],
   [0,-20],[0,20],[-20,0],[20,0]]
    .forEach(([x, z]) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 5, 8), pillarMat);
      pillar.position.set(x, 2.5, z);
      scene.add(pillar);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), gemMat);
      gem.position.set(x, 5.5, z);
      scene.add(gem);
    });
}

/* =============================================================================
   API HELPER
   Vite proxies /api/* → Flask on port 5000 (configured in vite.config.js).
   ============================================================================= */

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

  /* ── React state ─────────────────────────────────────────────────────────── */

  const [screen,      setScreen]      = useState('menu');
  const [playerName,  setPlayerName]  = useState('');
  const [playerHP,    setPlayerHP]    = useState(100);
  const [mode,        setMode]        = useState('story');
  const [monsters,    setMonsters]    = useState([]);
  const [defeatedIds, setDefeatedIds] = useState(new Set());
  const [nextStoryId, setNextStoryId] = useState(0);

  // Which monster the player is standing next to (object | null)
  const [nearbyMonster, setNearbyMonster] = useState(null);

  // Battle state
  const [battleMonster, setBattleMonster] = useState(null);
  const [question,      setQuestion]      = useState(null);
  const [correctCount,  setCorrectCount]  = useState(0);
  const [answerValue,   setAnswerValue]   = useState('');
  const [answerLocked,  setAnswerLocked]  = useState(false);
  const [feedback,      setFeedback]      = useState({ msg: '', type: 'correct', show: false });

  /* ── Three.js refs ───────────────────────────────────────────────────────── */

  const canvasRef        = useRef(null);
  const rendererRef      = useRef(null);
  const sceneRef         = useRef(null);
  const cameraRef        = useRef(null);
  const playerMeshRef    = useRef(null);
  const monsterMeshesRef = useRef([]);    // THREE.Group per monster
  const markerRef        = useRef(null);  // "!" exclamation marker group
  const pathObjectsRef   = useRef([]);    // story path objects for cleanup
  const walkTimerRef     = useRef(0);
  const rafIdRef         = useRef(null);

  // Portrait renderer (battle screen)
  const portraitCanvasRef = useRef(null);
  const portraitRef       = useRef({
    renderer: null, scene: null, camera: null, mesh: null, animId: null,
  });

  /* ── Mirror of state in refs so event handlers always see current values ─── */
  // The key insight: a keydown handler registered in useEffect closes over
  // the values at registration time.  Storing them in refs lets the handler
  // read the LIVE value without needing to be re-registered every render.

  const keysRef         = useRef({});
  const screenRef       = useRef('menu');
  const nearbyRef       = useRef(null);
  const defeatedRef     = useRef(new Set());
  const nextStoryRef    = useRef(0);
  const monstersRef     = useRef([]);
  const modeRef         = useRef('story');
  const lastNearbyIdRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  // THE FIX: store triggerBattle in a ref so the keydown handler (registered
  // once) always calls the latest version without stale closure issues.
  const triggerBattleRef = useRef(null);

  // Keep all refs in sync with their corresponding state
  useEffect(() => { screenRef.current    = screen;        }, [screen]);
  useEffect(() => { nearbyRef.current    = nearbyMonster; }, [nearbyMonster]);
  useEffect(() => { defeatedRef.current  = defeatedIds;   }, [defeatedIds]);
  useEffect(() => { nextStoryRef.current = nextStoryId;   }, [nextStoryId]);
  useEffect(() => { monstersRef.current  = monsters;      }, [monsters]);
  useEffect(() => { modeRef.current      = mode;          }, [mode]);

  /* ── Three.js world setup ─────────────────────────────────────────────────── */

  /**
   * initWorld()
   * Called once on mount.  Builds the full 3D scene and starts the render loop.
   */
  const initWorld = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x050a0e);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog   = new THREE.Fog(0x050a0e, 30, 60);
    sceneRef.current = scene;

    // Camera — angled top-down
    const camera = new THREE.PerspectiveCamera(
      58, window.innerWidth / window.innerHeight, 0.1, 200
    );
    camera.position.set(0, 18, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0x00ff44, 0.22));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 20, 8);
    sun.castShadow = true;
    scene.add(sun);
    const glow = new THREE.PointLight(0x00ff88, 1.1, 22);
    glow.position.set(0, 4, 0);
    scene.add(glow);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80, 40, 40),
      new THREE.MeshLambertMaterial({ color: 0x061408 })
    );
    floor.rotation.x    = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    scene.add(new THREE.GridHelper(80, 40, 0x003311, 0x001d09));

    // Boundary walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x0a2010 });
    [[40,0,0.5,80],[-40,0,0.5,80],[0,40,80,0.5],[0,-40,80,0.5]]
      .forEach(([x,z,w,d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w,3,d), wallMat);
        m.position.set(x,1.5,z);
        scene.add(m);
      });

    addPillars(scene);

    // Player
    const player = buildPlayerMesh();
    player.position.set(PLAYER_START.x, 0, PLAYER_START.z);
    scene.add(player);
    playerMeshRef.current = player;

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    runLoop();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafIdRef.current);
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * runLoop()
   * The main rAF loop.  Handles movement, camera, monster animation,
   * exclamation marker animation, and proximity detection every frame.
   */
  const runLoop = useCallback(() => {
    const loop = () => {
      rafIdRef.current = requestAnimationFrame(loop);

      const renderer = rendererRef.current;
      const scene    = sceneRef.current;
      const camera   = cameraRef.current;
      const player   = playerMeshRef.current;
      if (!renderer || !scene || !camera || !player) return;

      const currentScreen = screenRef.current;

      // ── Player movement (world screen only) ──
      if (currentScreen === 'world') {
        const k = keysRef.current;
        let dx = 0, dz = 0;
        if (k['KeyW'] || k['ArrowUp'])    dz -= WALK_SPEED;
        if (k['KeyS'] || k['ArrowDown'])  dz += WALK_SPEED;
        if (k['KeyA'] || k['ArrowLeft'])  dx -= WALK_SPEED;
        if (k['KeyD'] || k['ArrowRight']) dx += WALK_SPEED;

        if (dx !== 0 || dz !== 0) {
          const BOUND = 37;
          player.position.x = Math.max(-BOUND, Math.min(BOUND, player.position.x + dx));
          player.position.z = Math.max(-BOUND, Math.min(BOUND, player.position.z + dz));
          player.rotation.y = Math.atan2(dx, dz);

          // Walk cycle: sine wave swings the legs back and forth
          walkTimerRef.current += 0.12;
          player.children.forEach(c => {
            if (c.name === 'leg_0') c.rotation.x =  Math.sin(walkTimerRef.current) * 0.55;
            if (c.name === 'leg_1') c.rotation.x = -Math.sin(walkTimerRef.current) * 0.55;
          });
        }

        // Proximity detection — updates nearbyMonster state
        checkProximity(player);
      }

      // ── Camera: smoothly follows the player ──
      if (currentScreen === 'world' || currentScreen === 'battle') {
        const tx = player.position.x * 0.28;
        const tz = player.position.z * 0.28 + 15;
        camera.position.x += (tx - camera.position.x) * 0.06;
        camera.position.z += (tz - camera.position.z) * 0.06;
        camera.lookAt(player.position.x * 0.1, 0, player.position.z * 0.1);
      }

      // ── Monster idle animations ──
      monsterMeshesRef.current.forEach(mesh => {
        if (!mesh || mesh.userData.defeated) return;
        mesh.userData.bobTime = (mesh.userData.bobTime || 0) + 0.025;
        mesh.position.y = Math.sin(mesh.userData.bobTime) * 0.14;
        mesh.rotation.y += 0.012;
        const orb = mesh.children.find(c => c.name === 'orb');
        if (orb) orb.rotation.y += 0.055;
      });

      // ── Exclamation marker: bob above the next story target ──
      if (markerRef.current) {
        markerRef.current.userData.t = (markerRef.current.userData.t || 0) + 0.05;
        const t  = markerRef.current.userData.t;
        const id = nextStoryRef.current;
        const mesh = monsterMeshesRef.current[id];
        if (mesh && !mesh.userData.defeated) {
          markerRef.current.position.set(
            mesh.position.x,
            3.6 + Math.sin(t) * 0.2,
            mesh.position.z
          );
        }
      }

      renderer.render(scene, camera);
    };
    loop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * checkProximity(playerMesh)
   * Measures XZ distance to every active monster.  Updates nearbyMonster state
   * only when the result changes to avoid flooding React with re-renders.
   */
  const checkProximity = useCallback((player) => {
    const px = player.position.x;
    const pz = player.position.z;
    let foundId = null;

    monsterMeshesRef.current.forEach((mesh, i) => {
      if (!mesh || mesh.userData.defeated) return;
      if (defeatedRef.current.has(i))      return;
      const dx = mesh.position.x - px;
      const dz = mesh.position.z - pz;
      if (Math.sqrt(dx*dx + dz*dz) < INTERACT_DIST) foundId = i;
    });

    // Only call setState when the result changes
    if (foundId === lastNearbyIdRef.current) return;
    lastNearbyIdRef.current = foundId;
    setNearbyMonster(foundId !== null ? (monstersRef.current[foundId] ?? null) : null);
  }, []);

  /* ── Monster management ─────────────────────────────────────────────────── */

  /**
   * spawnMonsters(monsterList, gameMode)
   * Creates 3D monster meshes positioned at their spawn points.
   * In story mode, all monsters except index 0 start dimmed (grey).
   * Also builds the story path and the "!" marker for story mode.
   */
  const spawnMonsters = useCallback((monsterList, gameMode) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old meshes
    monsterMeshesRef.current.forEach(m => m && scene.remove(m));
    monsterMeshesRef.current = [];

    // Remove old path objects
    pathObjectsRef.current.forEach(o => scene.remove(o));
    pathObjectsRef.current = [];

    // Remove old marker
    if (markerRef.current) { scene.remove(markerRef.current); markerRef.current = null; }

    // Build story path in story mode
    if (gameMode === 'story') {
      const pathObjs = buildStoryPath(scene);
      pathObjectsRef.current = pathObjs;
    }

    monsterList.forEach((_, i) => {
      // In story mode, all monsters except the first start dimmed
      const isDimmed = gameMode === 'story' && i > 0;
      const mesh = buildMonsterMesh(i, isDimmed);
      mesh.position.set(SPAWN_POS[i].x, 0, SPAWN_POS[i].z);
      mesh.userData.bobTime  = Math.random() * Math.PI * 2;
      mesh.userData.defeated = false;
      mesh.userData.dimmed   = isDimmed;
      scene.add(mesh);
      monsterMeshesRef.current.push(mesh);
    });

    // Story mode: create the "!" marker above monster 0
    if (gameMode === 'story') {
      const marker = buildExclamationMarker();
      marker.position.set(SPAWN_POS[0].x, 3.6, SPAWN_POS[0].z);
      marker.userData.t = 0;
      scene.add(marker);
      markerRef.current = marker;
    }
  }, []);

  /**
   * activateNextMonster(id)
   * After a story-mode victory, un-dims the next monster (replaces grey mesh
   * with a full-colour one) and moves the "!" marker to it.
   */
  const activateNextMonster = useCallback((id) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const oldMesh = monsterMeshesRef.current[id];
    if (!oldMesh) return;

    // Remove the dim mesh and replace with a full-colour one
    scene.remove(oldMesh);
    const newMesh = buildMonsterMesh(id, false);
    newMesh.position.set(SPAWN_POS[id].x, 0, SPAWN_POS[id].z);
    newMesh.userData.bobTime  = 0;
    newMesh.userData.defeated = false;
    newMesh.userData.dimmed   = false;
    scene.add(newMesh);
    monsterMeshesRef.current[id] = newMesh;

    // Move the "!" marker
    if (markerRef.current) {
      markerRef.current.position.set(SPAWN_POS[id].x, 3.6, SPAWN_POS[id].z);
      markerRef.current.userData.t = 0;
    }
  }, []);

  /**
   * sinkMonster(id)
   * Defeat animation: monster sinks below the floor then is removed.
   */
  const sinkMonster = useCallback((id) => {
    const mesh = monsterMeshesRef.current[id];
    if (!mesh) return;
    mesh.userData.defeated = true;

    let y = mesh.position.y;
    const t = setInterval(() => {
      y -= 0.07;
      mesh.position.y = y;
      if (y <= -4) { clearInterval(t); sceneRef.current?.remove(mesh); }
    }, 20);
  }, []);

  /* ── Portrait mini-renderer ─────────────────────────────────────────────── */

  /**
   * initPortrait(monsterId)
   * Sets up (or reuses) a tiny Three.js scene inside the battle portrait canvas.
   * Shows a spinning version of the monster being fought.
   */
  const initPortrait = useCallback((monsterId) => {
    const p      = portraitRef.current;
    const canvas = portraitCanvasRef.current;
    if (!canvas) return;

    if (!p.renderer) {
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      r.setSize(160, 160);
      r.setClearColor(0x000000, 0);
      p.renderer = r;

      const s = new THREE.Scene();
      s.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dir = new THREE.DirectionalLight(0x00ff88, 1.3);
      dir.position.set(2, 5, 3);
      s.add(dir);
      p.scene = s;

      const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
      cam.position.set(0, 1.8, 4.5);
      cam.lookAt(0, 1.3, 0);
      p.camera = cam;
    }

    // Swap in the new monster model
    if (p.mesh) p.scene.remove(p.mesh);
    const mesh = buildMonsterMesh(monsterId, false);
    p.mesh = mesh;
    p.scene.add(mesh);

    stopPortrait();
    let t = 0;
    const loop = () => {
      p.animId = requestAnimationFrame(loop);
      t += 0.04;
      mesh.rotation.y = Math.PI + Math.sin(t) * 0.4;
      mesh.position.y = Math.sin(t * 1.2) * 0.1;
      p.renderer.render(p.scene, p.camera);
    };
    loop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPortrait = useCallback(() => {
    const p = portraitRef.current;
    if (p.animId !== null) { cancelAnimationFrame(p.animId); p.animId = null; }
  }, []);

  /* ── Lifecycle ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const cleanup = initWorld();
    return cleanup;
  }, [initWorld]);

  /* ── Keyboard input ─────────────────────────────────────────────────────── */
  // Registered ONCE.  Reads values from refs (not state/props) so it never
  // goes stale and never needs to be re-registered.

  useEffect(() => {
    const onDown = (e) => {
      keysRef.current[e.code] = true;

      if (e.code === 'Space') e.preventDefault(); // prevent page scroll

      // E or Space in the world → try to start a battle
      if ((e.code === 'KeyE' || e.code === 'Space') && screenRef.current === 'world') {
        const nearby = nearbyRef.current;
        if (!nearby) return;
        if (defeatedRef.current.has(nearby.id)) return;

        // Story mode: only allowed to fight the next monster in sequence
        if (modeRef.current === 'story' && nearby.id !== nextStoryRef.current) return;

        // Call the LATEST version of triggerBattle via the ref
        triggerBattleRef.current?.(nearby.id);
      }
    };

    const onUp = (e) => { keysRef.current[e.code] = false; };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup',   onUp);
    };
  }, []); // Empty deps — uses refs only, never needs re-registration

  /* ── Feedback helper ────────────────────────────────────────────────────── */

  const showFeedback = useCallback((msg, type) => {
    clearTimeout(feedbackTimerRef.current);
    setFeedback({ msg, type, show: true });
    feedbackTimerRef.current = setTimeout(
      () => setFeedback(f => ({ ...f, show: false })),
      1800
    );
  }, []);

  /* ── Game flow ──────────────────────────────────────────────────────────── */

  /**
   * startGame(chosenMode)
   * Sends setup to the backend, spawns monsters, enters the world.
   */
  const startGame = useCallback(async (chosenMode) => {
    const name = playerName.trim() || 'Hero';
    setMode(chosenMode);
    setPlayerHP(100);
    setDefeatedIds(new Set());
    setNextStoryId(0);
    setNearbyMonster(null);
    lastNearbyIdRef.current = null;

    const data = await apiPost('/start', { name, mode: chosenMode });
    if (!data.ok) {
      alert('Cannot reach Flask. Is it running on port 5000?');
      return;
    }

    setMonsters(data.monsters);

    // Reset player to start position
    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(PLAYER_START.x, 0, PLAYER_START.z);
    }

    spawnMonsters(data.monsters, chosenMode);
    setScreen('world');
  }, [playerName, spawnMonsters]);

  /**
   * triggerBattle(monsterId)
   * Called when the player presses E/Space or clicks "Fight".
   * Contacts the backend, sets battle state, switches to battle screen.
   * Also stored in triggerBattleRef so the keydown handler can call it.
   */
  const triggerBattle = useCallback(async (monsterId) => {
    const data = await apiPost('/battle/start', { monster_id: monsterId });
    if (!data.ok) {
      alert(data.error || 'Could not start battle.');
      return;
    }

    setBattleMonster(data.monster);
    setQuestion(data.question);
    setCorrectCount(data.correct_count);
    setAnswerValue('');
    setAnswerLocked(false);
    setFeedback({ msg: '', type: 'correct', show: false });
    setNearbyMonster(null);
    lastNearbyIdRef.current = null;

    setScreen('battle');

    // Portrait canvas is only in the DOM after the battle screen renders
    requestAnimationFrame(() => {
      initPortrait(monsterId);
      document.getElementById('answer-input')?.focus();
    });
  }, [initPortrait]);

  // Keep triggerBattleRef in sync with the latest triggerBattle
  // This is the core fix for the stale-closure / E-key-not-working bug.
  useEffect(() => {
    triggerBattleRef.current = triggerBattle;
  }, [triggerBattle]);

  /**
   * submitAnswer()
   * Reads the answer input, posts to /api/battle/answer, handles result.
   *
   * Key fix vs. previous version:
   *   Old code read `data.correct` (undefined).
   *   New code reads `data.feedback.correct` (correct field).
   */
  const submitAnswer = useCallback(async () => {
    const answer = answerValue.trim();
    if (!answer || answerLocked) return;

    setAnswerLocked(true);
    setAnswerValue('');

    const data = await apiPost('/battle/answer', { answer });
    if (!data.ok) { setAnswerLocked(false); return; }

    // Update HP and correct counter immediately
    setPlayerHP(data.player_health);
    setCorrectCount(data.correct_count);

    // Show feedback — READ FROM data.feedback.correct, NOT data.correct
    const isCorrect = data.feedback.correct;
    showFeedback(data.feedback.message, isCorrect ? 'correct' : 'wrong');

    if (data.battle_over) {
      stopPortrait();

      if (data.battle_won) {
        const id = battleMonster?.id;

        // Mark as defeated in React state
        setDefeatedIds(prev => { const n = new Set(prev); n.add(id); return n; });

        // Sink the defeated monster
        sinkMonster(id);

        // Story mode: activate the next monster in the sequence
        if (modeRef.current === 'story') {
          const nextId = nextStoryRef.current + 1;
          setNextStoryId(nextId);
          // Activate (un-dim) the next monster if one exists
          if (nextId < SPAWN_POS.length) {
            setTimeout(() => activateNextMonster(nextId), 400);
          } else {
            // All monsters beaten — remove the "!" marker
            if (markerRef.current) {
              sceneRef.current?.remove(markerRef.current);
              markerRef.current = null;
            }
          }
        }
      }

      // Wait for feedback to be readable, then navigate
      setTimeout(() => {
        if (data.game_over) {
          setScreen(data.game_won ? 'gameover-win' : 'gameover-lose');
        } else {
          setScreen('world');
        }
      }, 1600);

    } else if (data.next_question) {
      // Correct → next question after feedback pause
      setTimeout(() => {
        setQuestion(data.next_question);
        setAnswerLocked(false);
        document.getElementById('answer-input')?.focus();
      }, 900);
    } else {
      // Wrong → same question, just re-enable input
      setTimeout(() => {
        setAnswerLocked(false);
        document.getElementById('answer-input')?.focus();
      }, 900);
    }
  }, [answerValue, answerLocked, battleMonster, showFeedback,
      sinkMonster, stopPortrait, activateNextMonster]);

  /**
   * fleeBattle()
   * Exit a battle without penalty.
   */
  const fleeBattle = useCallback(async () => {
    await apiPost('/battle/flee');
    stopPortrait();
    setScreen('world');
    setFeedback({ msg: '', type: 'correct', show: false });
  }, [stopPortrait]);

  /**
   * returnToMenu()
   * Reset all state and go back to the title screen.
   */
  const returnToMenu = useCallback(() => {
    stopPortrait();

    // Clean up story path and marker from the scene
    pathObjectsRef.current.forEach(o => sceneRef.current?.remove(o));
    pathObjectsRef.current = [];
    if (markerRef.current) { sceneRef.current?.remove(markerRef.current); markerRef.current = null; }
    monsterMeshesRef.current.forEach(m => m && sceneRef.current?.remove(m));
    monsterMeshesRef.current = [];

    setScreen('menu');
    setMonsters([]);
    setDefeatedIds(new Set());
    setNextStoryId(0);
    setPlayerHP(100);
    setNearbyMonster(null);
    lastNearbyIdRef.current = null;
  }, [stopPortrait]);

  /* ── Derived values ─────────────────────────────────────────────────────── */

  const isMenu   = screen === 'menu';
  const isWorld  = screen === 'world';
  const isBattle = screen === 'battle';
  const isOver   = screen === 'gameover-win' || screen === 'gameover-lose';
  const gameWon  = screen === 'gameover-win';
  const showHUD  = isWorld || isBattle;

  // Can the player fight the nearby monster?
  const canFight = nearbyMonster &&
    !defeatedIds.has(nearbyMonster.id) &&
    (mode !== 'story' || nearbyMonster.id === nextStoryId);

  // Is the nearby monster locked (story mode, wrong order)?
  const isNearLocked = nearbyMonster &&
    !defeatedIds.has(nearbyMonster.id) &&
    mode === 'story' &&
    nearbyMonster.id !== nextStoryId;

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Three.js canvas — always present, renders the 3D world ── */}
      <canvas ref={canvasRef} className="game-canvas" />

      {/* ── CRT scanline overlay ── */}
      <div className="scanlines" />

      {/* ══════════════════════════════════════════════════════════════════════
          HUD — player name + HP bar, visible during world and battle
          ══════════════════════════════════════════════════════════════════════ */}
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

      {/* ── Monster progress dots (top-right) ── */}
      {(isWorld || isBattle) && monsters.length > 0 && (
        <div className="monster-progress">
          {monsters.map((m, i) => {
            const beaten = defeatedIds.has(m.id);
            const isNext = mode === 'story' && i === nextStoryId && !beaten;
            const locked = mode === 'story' && i > nextStoryId && !beaten;
            return (
              <div
                key={m.id}
                className={
                  `prog-item` +
                  (beaten  ? ' defeated'    : '') +
                  (locked  ? ' locked'      : '') +
                  (isNext  ? ' next-target' : '')
                }
              >
                <span>{m.name}{isNext ? ' ◀' : ''}</span>
                <span className="prog-dot" />
              </div>
            );
          })}
        </div>
      )}

      {/* ── WASD controls hint ── */}
      {isWorld && (
        <div className="controls-hint">
          WASD / ARROWS — move &nbsp;|&nbsp; E or SPACE — interact with monster
        </div>
      )}

      {/* ── Proximity prompt ── */}
      {isWorld && (
        <div className={`proximity-prompt${(canFight || isNearLocked) ? ' visible' : ''}`}>
          {nearbyMonster && (
            <>
              <div className="prox-name">{nearbyMonster.name.toUpperCase()}</div>
              <div className="prox-info">
                Difficulty:{' '}
                <span className={DIFF_CLASS[nearbyMonster.difficulty] || ''}>
                  {nearbyMonster.difficulty}
                </span>
                <br />
                Wrong answers deal 5–15 random damage
              </div>

              {isNearLocked ? (
                // Story mode — wrong monster
                <div className="prox-locked">
                  ✗ Defeat {monsters[nextStoryId]?.name ?? 'the previous monster'} first!
                </div>
              ) : (
                <div className="prox-actions">
                  <button
                    className="btn yellow"
                    onClick={() => triggerBattle(nearbyMonster.id)}
                  >
                    <span>⚔ Fight!</span>
                  </button>
                  <button
                    className="btn red"
                    onClick={() => {
                      setNearbyMonster(null);
                      lastNearbyIdRef.current = null;
                    }}
                  >
                    <span>✗ Walk away</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MENU SCREEN
          ══════════════════════════════════════════════════════════════════════ */}
      <div className={`screen menu-screen${isMenu ? '' : ' hidden'}`}>
        <div className="menu-title">C++ QUEST<br />ACADEMY</div>
        <div className="menu-sub">The Dungeon of Code</div>

        <input
          className="name-input"
          type="text"
          placeholder="Enter your name…"
          maxLength={20}
          autoComplete="off"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
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
          STORY — follow the lit path, defeat all 5 monsters in order.<br />
          ADVENTURE — explore freely, fight any monster you choose.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BATTLE SCREEN — Pokémon-style overlay on top of the 3D world
          ══════════════════════════════════════════════════════════════════════ */}
      <div className={`screen battle-screen${isBattle ? '' : ' hidden'}`}>

        {/* ── Top half: monster info card (left) + monster sprite (right) ── */}
        <div className="battle-top">

          {/* Monster info card — shows name, difficulty, progress bar */}
          {battleMonster && (
            <div className="battle-monster-info">
              <div className="bmi-name">{battleMonster.name.toUpperCase()}</div>
              <div className={`bmi-diff ${DIFF_CLASS[battleMonster.difficulty] || ''}`}>
                {battleMonster.difficulty}
              </div>
              {/* Progress bar fills as the player gets correct answers */}
              <div className="bmi-bar-wrap">
                <span className="bmi-bar-label">Progress</span>
                <div className="bmi-bar">
                  <div
                    className="bmi-bar-fill"
                    style={{ width: `${(correctCount / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bmi-progress">{correctCount} / 5 correct</div>
            </div>
          )}

          {/* Monster sprite area — speech bubble + spinning 3D portrait */}
          <div className="battle-monster-area">
            {/* Speech bubble shows the current question */}
            {question && (
              <div className="speech-bubble">
                <div className="bubble-q-number">
                  QUESTION {question.number} OF {question.total}
                </div>
                <div className="bubble-q-text">{question.prompt}</div>
              </div>
            )}

            {/* Three.js renders the spinning monster model into this canvas */}
            <canvas
              ref={portraitCanvasRef}
              className="battle-portrait-canvas"
              width={160}
              height={160}
            />
          </div>
        </div>

        {/* ── Bottom half: player HP card + answer dialog ── */}
        <div className="battle-bottom">

          {/* Player HP card */}
          <div className="battle-player-card">
            <div className="bpc-name">{(playerName || 'HERO').toUpperCase()}</div>
            <div className="bpc-hp-wrap">
              <span className="bpc-hp-label">HP</span>
              <div className="bpc-hp-bar">
                <div
                  className="bpc-hp-fill"
                  style={{ width: `${Math.max(0, playerHP)}%` }}
                />
              </div>
              <span className="hp-text">{playerHP} / 100</span>
            </div>
          </div>

          {/* Dialog / answer input panel */}
          <div className="battle-dialog">
            <div className="battle-dialog-top">
              <span className="dialog-hint">Type your answer below:</span>
              {/* Feedback message (correct / wrong) — auto-hides after 1.8s */}
              <div
                className={`dialog-feedback ${feedback.type}${feedback.show ? ' show' : ''}`}
              >
                {feedback.msg}
              </div>
            </div>

            <div className="dialog-row">
              <input
                id="answer-input"
                className="answer-input"
                type="text"
                placeholder="Answer… then press Enter"
                autoComplete="off"
                value={answerValue}
                disabled={answerLocked}
                onChange={e => setAnswerValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              />
              <button className="btn" onClick={submitAnswer} disabled={answerLocked}>
                <span>Submit</span>
              </button>
              <button className="btn red" onClick={fleeBattle}>
                <span>Flee</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          GAME OVER SCREEN
          ══════════════════════════════════════════════════════════════════════ */}
      <div className={`screen gameover-screen${isOver ? '' : ' hidden'}`}>
        <div className={`go-title ${gameWon ? 'win' : 'lose'}`}>
          {gameWon ? 'VICTORY!' : 'GAME OVER'}
        </div>
        <div className="go-sub">
          {gameWon
            ? `${playerName || 'Hero'} conquered the C++ dungeon!`
            : `${playerName || 'Hero'} was defeated…`}
        </div>
        <div className="go-buttons">
          <button className="btn" onClick={returnToMenu}>
            <span>↩ Return to Menu</span>
          </button>
          <button className="btn red" onClick={() => window.close()}>
            <span>✗ Quit Game</span>
          </button>
        </div>
      </div>
    </>
  );
}
