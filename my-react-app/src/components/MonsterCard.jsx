// MonsterCard.jsx
// Props:
//   monster      {object}  — monster data object from gameData.js (with currentHealth injected)
//   isActive     {boolean} — whether this monster is currently being challenged
//   isDefeated   {boolean} — whether this monster's health has reached 0
//   damageFlash  {boolean} — briefly true to trigger hit animation
//   onClick      {fn}      — called when card is clicked (for monster selection)

export default function MonsterCard({ monster, isActive, isDefeated, damageFlash, onClick }) {
  return (
    <div
      onClick={() => !isDefeated && onClick && onClick()}
      style={{
        background: isDefeated ? "#F1EFE8" : monster.bgColor,
        border: `2px solid ${isActive ? monster.color : monster.borderColor}`,
        borderRadius: 16,
        padding: "14px 16px",
        opacity: isDefeated ? 0.45 : 1,
        transform: damageFlash ? "scale(0.96)" : isActive ? "scale(1.03)" : "scale(1)",
        transition: "transform 0.2s ease, opacity 0.4s ease, border-color 0.3s ease",
        cursor: isDefeated ? "default" : "pointer",
        position: "relative",
        minWidth: 130,
        userSelect: "none",
      }}
    >
      {/* Active badge */}
      {isActive && !isDefeated && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          background: monster.color, color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "2px 10px", borderRadius: 20,
          fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap",
        }}>
          ◆ ACTIVE
        </div>
      )}

      {/* Defeated badge */}
      {isDefeated && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          background: "#888780", color: "#fff", fontSize: 10, fontWeight: 700,
          padding: "2px 10px", borderRadius: 20,
          fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap",
        }}>
          ✓ DEFEATED
        </div>
      )}

      {/* Sprite */}
      <div style={{
        textAlign: "center", fontSize: 32, marginBottom: 6,
        filter: isDefeated ? "grayscale(1)" : "none",
      }}>
        {monster.emoji}
      </div>

      {/* Name / type */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontWeight: 700, fontSize: 14,
          color: isDefeated ? "#888780" : monster.color,
          fontFamily: "'Courier New', monospace",
        }}>
          {monster.name}
        </div>
        <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{monster.type}</div>
      </div>

      {/* Health bar */}
      {!isDefeated && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 6, background: "#D3D1C7", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(monster.currentHealth / monster.health) * 100}%`,
              background: monster.color,
              borderRadius: 4,
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{
            textAlign: "right", fontSize: 10, color: "#888780",
            marginTop: 2, fontFamily: "monospace",
          }}>
            {Math.round(monster.currentHealth)}/{monster.health}
          </div>
        </div>
      )}
    </div>
  );
}


