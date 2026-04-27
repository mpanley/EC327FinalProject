// QuestionBox.jsx
// Props:
//   monster    {object}   — active monster data (for theming)
//   question   {object}   — { q: string, a: string, hint: string }
//   onAnswer   {fn}       — called with the player's answer string, or "__hint__" for a hint
//   feedback   {object|null} — { correct: boolean, message: string } or null
//   isShaking  {boolean}  — triggers wrong-answer shake animation

import { useState, useEffect, useRef } from "react";

export default function QuestionBox({ monster, question, onAnswer, feedback, isShaking }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  // Clear input and refocus whenever the question changes
  useEffect(() => {
    setInput("");
    if (inputRef.current) inputRef.current.focus();
  }, [question]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    onAnswer(input.trim());
  };

  return (
    <div style={{
      background: "#fff",
      border: `2px solid ${monster.borderColor}`,
      borderRadius: 20,
      padding: "28px 28px 22px",
      transform: isShaking ? "translateX(-6px)" : "translateX(0)",
      transition: "transform 0.08s ease",
      boxShadow: `0 4px 24px ${monster.color}22`,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Colour accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${monster.color}, ${monster.borderColor})`,
      }} />

      {/* Monster avatar + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: monster.bgColor, border: `2px solid ${monster.borderColor}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {monster.emoji}
        </div>
        <div style={{ fontSize: 13, color: "#888780", fontFamily: "'Courier New', monospace" }}>
          {monster.name} asks:
        </div>
      </div>

      {/* Question text */}
      <p style={{
        fontSize: 18, fontWeight: 600, color: "#2C2C2A",
        lineHeight: 1.5, marginBottom: 22, fontFamily: "'Georgia', serif",
      }}>
        "{question.q}"
      </p>

      {/* Feedback banner */}
      {feedback && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 14,
          fontSize: 14, fontWeight: 600,
          background: feedback.correct ? "#EAF3DE" : "#FCEBEB",
          color: feedback.correct ? "#3B6D11" : "#A32D2D",
          border: `1px solid ${feedback.correct ? "#97C459" : "#F09595"}`,
          fontFamily: "'Courier New', monospace",
        }}>
          {feedback.correct ? "✓ " : "✗ "}{feedback.message}
        </div>
      )}

      {/* Answer input */}
      {!feedback && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type your answer..."
            style={{
              flex: 1, padding: "10px 14px", fontSize: 15,
              border: `1.5px solid ${monster.borderColor}`,
              borderRadius: 10, outline: "none",
              fontFamily: "'Courier New', monospace",
              background: monster.bgColor, color: "#2C2C2A",
            }}
          />
          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 22px", background: monster.color,
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Courier New', monospace", letterSpacing: "0.05em",
            }}
          >
            ANSWER
          </button>
        </div>
      )}
    </div>
  );
}

/*{ Hint button }
{!feedback && (
        <button
          onClick={() => onAnswer("__hint__")}
          style={{
            marginTop: 10, background: "none", border: "none",
            color: "#B4B2A9", fontSize: 12, cursor: "pointer",
            fontFamily: "'Courier New', monospace", padding: 0,
          }}
        >
          💡 Use a hint (–5 pts)
        </button>
      )}
        */