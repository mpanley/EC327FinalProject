// GameScreen.jsx
// Root game orchestrator. Manages all game state locally AND responds to
// backend commands received via postMessage (see gameData.js for protocol).

import { useState, useEffect, useCallback, useRef } from "react";
import { MONSTERS, TOTAL_HEALTH } from "./GameData.js";
import StatBar from "./StatBar.jsx";
import MonsterCard from "./MonsterCard.jsx";
import QuestionBox from "./QuestionBox.jsx";

// ---------------------------------------------------------------------------
// THEMES — each preset changes the whole vibe of the game
// ---------------------------------------------------------------------------
const THEMES = {
  classic: {
    label: "📜 Classic",
    bg: "#F1EFE8",
    cardBg: "#ffffff",
    text: "#2C2C2A",
    textMuted: "#888780",
    border: "#D3D1C7",
    logBg: "#2C2C2A",
    logText: "#fff",
    accent: "#258e26",
    cardRadius: 14,
    cardBorderWidth: "1.5px",
    fontFamily: "'Courier New', monospace",
    titleColor: "#2C2C2A",
    panelShadow: "none",
  },
  cyberpunk: {
    label: "🌃 Cyberpunk",
    bg: "linear-gradient(135deg, #0a0e27 0%, #1a0a2e 100%)",
    cardBg: "#15172b",
    text: "#00f0ff",
    textMuted: "#7a7a9d",
    border: "#ff006e",
    logBg: "#000",
    logText: "#00f0ff",
    accent: "#ff006e",
    cardRadius: 4,
    cardBorderWidth: "2px",
    fontFamily: "'Courier New', monospace",
    titleColor: "#ff006e",
    panelShadow: "0 0 20px rgba(255, 0, 110, 0.3)",
  },
  fantasy: {
    label: "🏰 Fantasy",
    bg: "linear-gradient(135deg, #2c1810 0%, #1a0f2e 100%)",
    cardBg: "#3d2817",
    text: "#f4d35e",
    textMuted: "#a8896c",
    border: "#d4af37",
    logBg: "#1a0f06",
    logText: "#f4d35e",
    accent: "#d4af37",
    cardRadius: 20,
    cardBorderWidth: "2px",
    fontFamily: "'Georgia', serif",
    titleColor: "#f4d35e",
    panelShadow: "0 4px 20px rgba(212, 175, 55, 0.2)",
  },
  arcade: {
    label: "🕹️ Arcade",
    bg: "#1a1a2e",
    cardBg: "#16213e",
    text: "#ffeb3b",
    textMuted: "#7986cb",
    border: "#ff5722",
    logBg: "#0a0a1a",
    logText: "#4caf50",
    accent: "#ff5722",
    cardRadius: 0,
    cardBorderWidth: "3px",
    fontFamily: "'Courier New', monospace",
    titleColor: "#ffeb3b",
    panelShadow: "4px 4px 0 #ff5722",
  },
};

const THEME_NAMES = Object.keys(THEMES);

// ---------------------------------------------------------------------------
// Helper — emit an event to the parent/backend
// ---------------------------------------------------------------------------
function emit(event, payload = {}) {
  window.parent?.postMessage({ type: "GAME_EVENT", event, payload }, "*");
}

// ---------------------------------------------------------------------------
// Helper — play a sound effect (silently fails if file missing)
// ---------------------------------------------------------------------------
function playSound(name) {
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
}

// ---------------------------------------------------------------------------
// GameScreen
// ---------------------------------------------------------------------------
export default function GameScreen() {
  const [monsters, setMonsters] = useState(
    MONSTERS.map((m) => ({ ...m, currentHealth: m.health, questionIdx: 0 }))
  );
  const [activeIdx, setActiveIdx]     = useState(0);
  const [score, setScore]             = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [streak, setStreak]           = useState(0);
  const [feedback, setFeedback]       = useState(null);
  const [isShaking, setIsShaking]     = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [gameOver, setGameOver]       = useState(null);
  const [log, setLog]                 = useState([]);
  const [visibleComponents, setVisibleComponents] = useState(
    new Set(["GameScreen", "StatBar", "MonsterCard", "QuestionBox"])
  );

  // Theme + music state, persisted to localStorage
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem("theme");
    return THEMES[saved] ? saved : "classic";
  });
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef(null);

  const t = THEMES[themeName];

  useEffect(() => {
    localStorage.setItem("theme", themeName);
  }, [themeName]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/background.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.15;
    }
    if (musicOn) {
    audioRef.current.play().catch((err) => {
      console.error("Music play failed:", err);
    });
  } else {
    audioRef.current.pause();
  }
}, [musicOn]);
  // Cycle to next theme
  const nextTheme = () => {
    const idx = THEME_NAMES.indexOf(themeName);
    setThemeName(THEME_NAMES[(idx + 1) % THEME_NAMES.length]);
  };

  const addLog = (msg) => setLog((prev) => [msg, ...prev].slice(0, 5));

  // -------------------------------------------------------------------------
  // Backend command handler
  // -------------------------------------------------------------------------
  const handleCommand = useCallback((command, payload) => {
    switch (command) {
      case "SHOW_COMPONENT": {
        const names = Array.isArray(payload.component) ? payload.component : [payload.component];
        setVisibleComponents(new Set(names));
        break;
      }
      case "SET_ACTIVE_MONSTER":
        if (payload.monsterIndex >= 0 && payload.monsterIndex < monsters.length)
          setActiveIdx(payload.monsterIndex);
        break;
      case "UPDATE_SCORE":
        setScore(payload.score);
        break;
      case "UPDATE_PLAYER_Health":
        setPlayerHealth(Math.max(0, payload.health));
        break;
      case "UPDATE_MONSTER_Health":
        setMonsters((prev) =>
          prev.map((m, i) =>
            i === payload.monsterIndex ? { ...m, currentHealth: Math.max(0, payload.health) } : m
          )
        );
        break;
      case "SHOW_FEEDBACK":
        setFeedback({ correct: payload.correct, message: payload.message });
        break;
      case "CLEAR_FEEDBACK":
        setFeedback(null);
        break;
      case "SET_STREAK":
        setStreak(payload.streak);
        break;
      case "TRIGGER_SHAKE":
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
        break;
      case "TRIGGER_DAMAGE_FLASH":
        setDamageFlash(true);
        setTimeout(() => setDamageFlash(false), 300);
        break;
      case "END_GAME":
        setGameOver(payload.result);
        break;
      case "RESET_GAME":
        resetGame();
        break;
      case "ADD_LOG":
        addLog(payload.message);
        break;
      default:
        console.warn("[GameScreen] Unknown command:", command);
    }
  }, [monsters.length]);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type === "GAME_COMMAND") {
        handleCommand(e.data.command, e.data.payload ?? {});
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleCommand]);

  // -------------------------------------------------------------------------
  // Local game logic
  // -------------------------------------------------------------------------
  const activeMonster   = monsters[activeIdx];
  const currentQuestion = activeMonster?.questions[activeMonster.questionIdx % activeMonster.questions.length];

  const handleAnswer = (answer) => {
    if (feedback) return;
    const qIdx = activeMonster.questionIdx;

    emit("ANSWER_SUBMITTED", { answer, monsterIndex: activeIdx, questionIndex: qIdx });

    const isCorrect =
      answer.toLowerCase().replace(/[^a-z0-9]/g, "") ===
      currentQuestion.a.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (isCorrect) {
      playSound("correct");
      const bonus  = streak >= 2 ? Math.round(15 * (1 + streak * 0.2)) : 15;
      const damage = 25 + streak * 5;

      setScore((s) => s + bonus);
      setStreak((s) => s + 1);
      addLog(`✓ Correct! +${bonus} pts${streak >= 2 ? ` (${streak + 1}x streak!)` : ""}`);

      const updated = monsters.map((m, i) =>
        i !== activeIdx ? m : { ...m, currentHealth: Math.max(0, m.currentHealth - damage), questionIdx: m.questionIdx + 1 }
      );
      setMonsters(updated);
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 300);
      setFeedback({ correct: true, message: `Correct! Dealt ${damage} damage. +${bonus} pts` });

      if (updated[activeIdx].currentHealth <= 0) {
        playSound("defeat");
        addLog(`💀 ${updated[activeIdx].name} defeated!`);
        const allDefeated = updated.every((m) => m.currentHealth <= 0);
        if (allDefeated) {
          setTimeout(() => setGameOver("win"), 1500);
        } else {
          const next = updated.findIndex((m, i) => i !== activeIdx && m.currentHealth > 0);
          setTimeout(() => { setFeedback(null); if (next !== -1) setActiveIdx(next); }, 1500);
          return;
        }
      }
      setTimeout(() => setFeedback(null), 1500);

    } else {
      playSound("wrong");
      setStreak(0);
      setPlayerHealth((h) => {
        const next = Math.max(0, h - 10);
        if (next <= 0) setTimeout(() => setGameOver("lose"), 800);
        return next;
      });
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      addLog(`✗ Wrong! -10 HEALTH. Answer: ${currentQuestion.a}`);
      setFeedback({ correct: false, message: `Wrong! The answer was: ${currentQuestion.a}` });
      setMonsters((prev) =>
        prev.map((m, i) => (i === activeIdx ? { ...m, questionIdx: m.questionIdx + 1 } : m))
      );
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const handleMonsterSelect = (i) => {
    setActiveIdx(i);
    emit("MONSTER_SELECTED", { monsterIndex: i });
  };

  const resetGame = () => {
    setMonsters(MONSTERS.map((m) => ({ ...m, currentHealth: m.health, questionIdx: 0 })));
    setActiveIdx(0);
    setScore(0);
    setPlayerHealth(100);
    setStreak(0);
    setFeedback(null);
    setGameOver(null);
    setLog([]);
    emit("RESET_REQUESTED", {});
  };

  const monstersRemaining = monsters.filter(m => m.currentHealth > 0).length;
  const show = (name) => visibleComponents.has(name);

  const toggleBtnStyle = {
    background: "transparent",
    border: `${t.cardBorderWidth} solid ${t.border}`,
    borderRadius: t.cardRadius / 2,
    padding: "6px 12px",
    color: t.text,
    cursor: "pointer",
    fontFamily: t.fontFamily,
    fontSize: 12,
    fontWeight: 700,
  };

  // -------------------------------------------------------------------------
  // Game-over screen (themed)
  // -------------------------------------------------------------------------
  if (gameOver) {
    return (
      <div style={{
        minHeight: "100vh", background: t.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: t.fontFamily,
      }}>
        <div style={{
          textAlign: "center", background: t.cardBg,
          border: `${t.cardBorderWidth} solid ${t.border}`,
          borderRadius: t.cardRadius * 1.5,
          padding: "48px 56px", maxWidth: 420,
          boxShadow: t.panelShadow,
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{gameOver === "win" ? "🏆" : "💀"}</div>
          <h2 style={{
            fontSize: 28, fontWeight: 800,
            color: gameOver === "win" ? t.titleColor : "#A32D2D", marginBottom: 8,
          }}>
            {gameOver === "win" ? "YOU WIN!" : "GAME OVER: YOU LOSE"}
          </h2>
          <p style={{ color: t.textMuted, marginBottom: 6, fontSize: 15 }}>
            {gameOver === "win" ? "All monsters defeated!" : "You ran out of health!"}
          </p>
          <div style={{ fontSize: 32, fontWeight: 800, color: t.text, margin: "18px 0 28px" }}>
            {score}{" "}
            <span style={{ fontSize: 14, fontWeight: 400, color: t.textMuted }}>points</span>
          </div>
          <button
            onClick={resetGame}
            style={{
              background: t.accent, color: "#fff", border: "none",
              borderRadius: t.cardRadius / 2, padding: "12px 36px", fontSize: 16,
              fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
              fontFamily: t.fontFamily,
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main game layout — original single-column
  // -------------------------------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh", background: t.bg,
      fontFamily: t.fontFamily, padding: "16px 12px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: t.titleColor, margin: 0, letterSpacing: "0.05em" }}>
              ⚔ C++ QUEST ACADEMY
            </h1>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
              Answer questions to defeat the monsters!
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={nextTheme} style={toggleBtnStyle} title="Switch theme">
              {t.label}
            </button>
            <button onClick={() => setMusicOn(!musicOn)} style={toggleBtnStyle} title="Toggle music">
              {musicOn ? "🔊" : "🔇"}
            </button>
            <div style={{ textAlign: "right", marginLeft: 4 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: t.titleColor }}>{score}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>SCORE</div>
            </div>
          </div>
        </div>

        {/* ── StatBar section ── */}
        {show("StatBar") && (
          <div style={{
            background: t.cardBg, border: `${t.cardBorderWidth} solid ${t.border}`,
            borderRadius: t.cardRadius, padding: "14px 18px", marginBottom: 16,
            boxShadow: t.panelShadow,
          }}>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8, letterSpacing: "0.08em" }}>
              PLAYER STATUS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <StatBar label="Health" value={playerHealth} max={100} color="#E24B4A" icon="❤️" />
              <StatBar label="Monsters Remaining" value={monstersRemaining} max={MONSTERS.length} color="#a23ada" icon="👾" />
            </div>
            {streak >= 2 && (
              <div style={{
                marginTop: 6, background: "#FAEEDA",
                border: "1px solid #FAC775", borderRadius: 8,
                padding: "6px 12px", fontSize: 12, color: "#854F0B", fontWeight: 700,
              }}>
                🔥 {streak}x STREAK! Bonus damage active!
              </div>
            )}
          </div>
        )}

        {/* ── MonsterCard row ── */}
        {show("MonsterCard") && (
          <div style={{ display: "flex", gap: 12, marginBottom: 18, overflowX: "auto", paddingBottom: 20 }}>
            {monsters.map((m, i) => (
              <MonsterCard
                key={m.id}
                monster={m}
                isActive={i === activeIdx}
                isDefeated={m.currentHealth <= 0}
                damageFlash={damageFlash && i === activeIdx}
                onClick={() => m.currentHealth > 0 && handleMonsterSelect(i)}
              />
            ))}
          </div>
        )}

        {/* ── QuestionBox ── */}
        {show("QuestionBox") && activeMonster && activeMonster.currentHealth > 0 && (
          <QuestionBox
            monster={activeMonster}
            question={currentQuestion}
            onAnswer={handleAnswer}
            feedback={feedback}
            isShaking={isShaking}
          />
        )}

        {/* ── Battle log ── */}
        {log.length > 0 && (
          <div style={{
            marginTop: 14, background: t.logBg, borderRadius: t.cardRadius,
            padding: "12px 16px", boxShadow: t.panelShadow,
          }}>
            <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, letterSpacing: "0.1em" }}>
              BATTLE LOG
            </div>
            {log.map((entry, i) => (
              <div key={i} style={{
                fontSize: 12, color: i === 0 ? t.logText : t.textMuted,
                marginBottom: 3, opacity: 1 - i * 0.18,
              }}>
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* ── Monster-select buttons ── */}
        {show("MonsterCard") && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: t.textMuted, alignSelf: "center" }}>Challenge:</span>
            {monsters.map((m, i) => (
              <button
                key={m.id}
                onClick={() => m.currentHealth > 0 && handleMonsterSelect(i)}
                disabled={m.currentHealth <= 0}
                style={{
                  background: i === activeIdx ? m.color : t.cardBg,
                  color: i === activeIdx ? "#fff" : m.currentHealth <= 0 ? "#B4B2A9" : m.color,
                  border: `1.5px solid ${m.color}`,
                  borderRadius: t.cardRadius / 2, padding: "5px 14px",
                  fontSize: 12, fontWeight: 700,
                  cursor: m.currentHealth <= 0 ? "not-allowed" : "pointer",
                  opacity: m.currentHealth <= 0 ? 0.4 : 1,
                  fontFamily: t.fontFamily,
                }}
              >
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}