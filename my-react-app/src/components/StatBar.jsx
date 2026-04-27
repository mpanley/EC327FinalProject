// StatBar.jsx
// Props:
//   label  {string}  — display label
//   value  {number}  — current value
//   max    {number}  — maximum value
//   color  {string}  — hex fill color (used when not low)
//   icon   {string}  — emoji / text icon shown before label

export default function StatBar({ label, value, max, color, icon }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const isLow = pct < 30;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
          color: "#888780",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          {icon} {label}
        </span>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: isLow ? "#E24B4A" : "#2C2C2A",
          fontFamily: "'Courier New', monospace",
        }}>
          {Math.round(value)}/{max}
        </span>
      </div>
      <div style={{
        height: 10,
        background: "#D3D1C7",
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid #B4B2A9",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: isLow ? "#E24B4A" : color,
          borderRadius: 6,
          transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}
