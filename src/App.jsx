import { useState, useEffect, useRef } from "react";

const ROAST_SYSTEM = `You are a brutally honest, wickedly funny life coach who roasts people's life situations before giving them a real plan.

Your response MUST be a JSON object with exactly this structure:
{
  "roastTitle": "A savage 6-8 word title for their situation",
  "roastLines": ["line1", "line2", "line3", "line4"],
  "savageScore": 75,
  "savageScoreLabel": "Certified Disaster",
  "redFlags": ["flag1", "flag2", "flag3"],
  "plan": [
    {"day": "Days 1-7", "action": "specific action", "why": "reason"},
    {"day": "Days 8-30", "action": "specific action", "why": "reason"},
    {"day": "Days 31-90", "action": "specific action", "why": "reason"}
  ],
  "verdict": "A 1-sentence brutal but loving final verdict",
  "shareQuote": "The most quotable line from the roast"
}
Return ONLY the JSON object, no markdown, no preamble.`;

function PaywallModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#111", border: "1px solid rgba(255,45,85,0.3)", borderRadius: "20px", padding: "40px 36px", maxWidth: "420px", width: "100%", textAlign: "center", fontFamily: "Georgia, serif", color: "#f0ead6" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔥</div>
        <h2 style={{ fontSize: "26px", margin: "0 0 10px" }}>You used your free roast</h2>
        <p style={{ color: "rgba(240,234,214,0.55)", margin: "0 0 28px", fontSize: "15px" }}>Unlimited roasts for $4.99/month</p>
        <div style={{ fontSize: "36px", fontWeight: "bold", color: "#ff2d55", marginBottom: "4px" }}>$4.99/mo</div>
        <button onClick={handleSubscribe} disabled={loading} style={{ background: "#ff2d55", color: "#fff", border: "none", borderRadius: "10px", padding: "16px", width: "100%", fontSize: "16px", fontWeight: "bold", fontFamily: "Georgia, serif", cursor: "pointer", margin: "20px 0 12px" }}>
          {loading ? "Redirecting..." : "Subscribe now →"}
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(240,234,214,0.3)", fontSize: "13px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Maybe later</button>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState("intro");
  const [form, setForm] = useState({ job: "", relationship: "", finances: "", goals: "", wildcard: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      fetch(`/api/verify-session?session_id=${sessionId}`).then(r => r.json()).then(data => {
        if (data.unlocked) { localStorage.setItem("roast_unlocked", "true"); setUnlocked(true); window.history.replaceState({}, "", "/"); }
      });
    } else if (localStorage.getItem("roast_unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (step === "loading") { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000); }
    else { clearInterval(timerRef.current); setTimer(0); }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const submit = async () => {
    if (!form.job.trim() || !form.finances.trim() || !form.goals.trim()) return;
    if (localStorage.getItem("roast_used_free") === "true" && !unlocked) { setShowPaywall(true); return; }
    setStep("loading"); setError("");
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: ROAST_SYSTEM,
          messages: [{ role: "user", content: `JOB: ${form.job}\nRELATIONSHIP: ${form.relationship || "N/A"}\nFINANCES: ${form.finances}\nGOALS: ${form.goals}\n${form.wildcard ? "WILDCARD: " + form.wildcard : ""}\n\nRoast me. Then save me.` }]
        })
      });
      const data = await res.json();
      const text = data.content.map(b => b.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      localStorage.setItem("roast_used_free", "true");
      setResult(parsed); setStep("result");
    } catch (e) {
      setError("AI was too stunned. Try again."); setStep("form");
    }
  };

  const s = (v) => v >= 75 ? "#ff2d55" : v >= 45 ? "#ff9f0a" : "#30d158";

  const styles = {
    page: { minHeight: "100vh", background: "#0a0a0a", color: "#f0ead6", fontFamily: "Georgia, serif", padding: "0 24px 80px" },
    wrap: { maxWidth: "660px", margin: "0 auto" },
    btn: { background: "#ff2d55", color: "#fff", border: "none", borderRadius: "8px", padding: "16px 40px", fontFamily: "Georgia, serif", fontSize: "17px", fontWeight: "bold", cursor: "pointer" },
    field: { background: "rgba(240,234,214,0.05)", border: "1px solid rgba(240,234,214,0.12)", borderRadius: "8px", color: "#f0ead6", fontFamily: "Georgia, serif", fontSize: "15px", padding: "14px 16px", width: "100%", boxSizing: "border-box", resize: "vertical", outline: "none" },
    label: { display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(240,234,214,0.4)", marginBottom: "8px" },
    card: { borderRadius: "16px", padding: "28px", marginBottom: "20px" },
  };

  return (
    <div style={styles.page}>
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      <div style={styles.wrap}>

        {step === "intro" && (
          <div style={{ textAlign: "center", paddingTop: "80px" }}>
            <div style={{ fontSize: "60px", marginBottom: "8px" }}>🔥</div>
            <h1 style={{ fontSize: "48px", fontWeight: "bold", margin: "0 0 12px" }}>Roast My Life</h1>
            <p style={{ fontSize: "19px", color: "rgba(240,234,214,0.55)", margin: "0 0 6px", fontStyle: "italic" }}>AI roasts your choices. Then saves you from yourself.</p>
            <p style={{ fontSize: "13px", color: "rgba(240,234,214,0.3)", margin: "0 0 48px" }}>First roast free · Results in under 90 seconds</p>
            <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginBottom: "48px" }}>
              {[["💀", "Brutally honest"], ["📋", "Real 90-day plan"], ["📸", "Screenshot-worthy"]].map(([icon, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "26px", marginBottom: "4px" }}>{icon}</div>
                  <div style={{ fontSize: "12px", color: "rgba(240,234,214,0.4)" }}>{label}</div>
                </div>
              ))}
            </div>
            <button style={styles.btn} onClick={() => setStep("form")}>Roast me →</button>
          </div>
        )}

        {step === "form" && (
          <div style={{ paddingTop: "56px" }}>
            <button onClick={() => setStep("intro")} style={{ background: "none", border: "none", color: "rgba(240,234,214,0.35)", cursor: "pointer", fontSize: "13px", marginBottom: "28px", fontFamily: "Georgia, serif", padding: 0 }}>← back</button>
            <h2 style={{ fontSize: "26px", margin: "0 0 6px" }}>Tell me everything.</h2>
            <p style={{ color: "rgba(240,234,214,0.45)", margin: "0 0 36px", fontStyle: "italic" }}>The more honest you are, the harder the roast.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { key: "job", label: "Job / Career *", ph: "e.g. 28, same dead-end job for 3 years..." },
                { key: "relationship", label: "Relationship status", ph: "e.g. Single for 4 years..." },
                { key: "finances", label: "Finances *", ph: "e.g. $4k in credit card debt, no savings..." },
                { key: "goals", label: "Goals / Dreams *", ph: "e.g. Want to start a business, travel more..." },
                { key: "wildcard", label: "Wildcard (optional)", ph: "e.g. I still text my ex..." },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label style={styles.label}>{label}</label>
                  <textarea style={styles.field} rows={2} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              {error && <div style={{ color: "#ff6b80", fontSize: "14px" }}>{error}</div>}
              <button style={{ ...styles.btn, width: "100%", opacity: (!form.job.trim() || !form.finances.trim() || !form.goals.trim()) ? 0.4 : 1 }} onClick={submit} disabled={!form.job.trim() || !form.finances.trim() || !form.goals.trim()}>
                🔥 Roast me now
              </button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div style={{ paddingTop: "120px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "24px" }}>🔥</div>
            <h2 style={{ fontSize: "22px", margin: "0 0 10px" }}>Analyzing your choices...</h2>
            <p style={{ color: "rgba(240,234,214,0.4)", fontStyle: "italic" }}>
              {timer < 10 ? "Reading between the lines..." : timer < 25 ? "Counting the red flags..." : "Building your escape plan..."}
            </p>
            <p style={{ color: "rgba(240,234,214,0.25)", fontSize: "13px", marginTop: "16px" }}>{timer}s</p>
          </div>
        )}

        {step === "result" && result && (
          <div style={{ paddingTop: "48px" }}>
            <div style={{ ...styles.card, background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.2)", textAlign: "center" }}>
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(240,234,214,0.35)", margin: "0 0 12px" }}>Chaos Score</p>
              <div style={{ fontSize: "64px", fontWeight: "bold", color: s(result.savageScore) }}>{result.savageScore}</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: s(result.savageScore), marginBottom: "8px" }}>{result.savageScoreLabel}</div>
              <h2 style={{ fontSize: "20px", margin: 0, fontStyle: "italic" }}>"{result.roastTitle}"</h2>
            </div>

            <div style={{ ...styles.card, background: "rgba(240,234,214,0.03)", border: "1px solid rgba(240,234,214,0.08)" }}>
              <p style={styles.label}>🔥 The Roast</p>
              {result.roastLines.map((line, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0", fontSize: "15px", lineHeight: 1.6, paddingLeft: "14px", borderLeft: "2px solid rgba(255,45,85,0.3)" }}>{line}</p>
              ))}
            </div>

            <div style={{ ...styles.card, background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.15)" }}>
              <p style={{ ...styles.label, color: "rgba(255,159,10,0.55)" }}>🚩 Red Flags</p>
              {result.redFlags.map((flag, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginTop: i === 0 ? 0 : "10px" }}>
                  <span style={{ color: "#ff9f0a" }}>▸</span>
                  <span style={{ fontSize: "14px", lineHeight: 1.5 }}>{flag}</span>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, background: "rgba(48,209,88,0.04)", border: "1px solid rgba(48,209,88,0.15)" }}>
              <p style={{ ...styles.label, color: "rgba(48,209,88,0.55)" }}>📋 90-Day Rescue Plan</p>
              {result.plan.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginTop: i === 0 ? 0 : "18px" }}>
                  <div style={{ flexShrink: 0, background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: "7px", padding: "5px 9px", fontSize: "11px", color: "#30d158", whiteSpace: "nowrap" }}>{p.day}</div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: "bold" }}>{p.action}</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "rgba(240,234,214,0.42)", fontStyle: "italic" }}>{p.why}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.18)", textAlign: "center" }}>
              <p style={styles.label}>⚖️ Final Verdict</p>
              <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.6, fontStyle: "italic" }}>"{result.verdict}"</p>
            </div>

            <div style={{ ...styles.card, background: "rgba(240,234,214,0.03)", border: "1px solid rgba(240,234,214,0.08)" }}>
              <p style={styles.label}>📸 Share this</p>
              <p style={{ margin: "0 0 14px", fontSize: "15px", fontStyle: "italic", color: "rgba(240,234,214,0.65)" }}>"{result.shareQuote}"</p>
              <button onClick={() => { navigator.clipboard.writeText(`"${result.shareQuote}" 💀\n\nroast-my-life.vercel.app`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ background: "rgba(240,234,214,0.06)", border: "1px solid rgba(240,234,214,0.1)", borderRadius: "8px", color: "rgba(240,234,214,0.55)", padding: "10px 20px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", width: "100%" }}>
                {copied ? "✓ Copied!" : "Copy to share →"}
              </button>
            </div>

            <div style={{ textAlign: "center" }}>
              <button style={styles.btn} onClick={() => { setStep("form"); setResult(null); setForm({ job: "", relationship: "", finances: "", goals: "", wildcard: "" }); }}>
                Roast someone else →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}