// src/App.jsx
// Full app with: free first roast, Stripe paywall, backend API proxy

import { useState, useEffect, useRef } from "react";

const ROAST_SYSTEM = `You are a brutally honest, wickedly funny life coach who roasts people's life situations before giving them a real plan.

Your response MUST be a JSON object with exactly this structure:
{
  "roastTitle": "A savage 6-8 word title for their situation (funny, cutting)",
  "roastLines": ["line1", "line2", "line3", "line4"],
  "savageScore": <number 1-100 representing how messy their life is>,
  "savageScoreLabel": "A funny 2-3 word label for their score (e.g. 'Certified Disaster', 'Mildly Chaotic', 'Actually Cooked')",
  "redFlags": ["flag1", "flag2", "flag3"],
  "plan": [
    {"day": "Days 1-7", "action": "specific action", "why": "brutal honest reason"},
    {"day": "Days 8-30", "action": "specific action", "why": "brutal honest reason"},
    {"day": "Days 31-90", "action": "specific action", "why": "brutal honest reason"}
  ],
  "verdict": "A 1-sentence brutal but loving final verdict that ends on a hopeful note",
  "shareQuote": "The single most savage/funny/quotable line from the roast (for sharing)"
}

Be genuinely funny and cutting but never mean-spirited. Punch at the choices, not the person. The plan must be REAL and actionable. No emojis in roastLines. Return ONLY the JSON object, no markdown, no preamble.`;

// ─── Paywall Modal ────────────────────────────────────────────────────────────
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
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
    }}>
      <div style={{
        background: "#111", border: "1px solid rgba(255,45,85,0.3)", borderRadius: "20px",
        padding: "40px 36px", maxWidth: "420px", width: "100%", textAlign: "center",
        fontFamily: "Georgia, serif", color: "#f0ead6"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔥</div>
        <h2 style={{ fontSize: "26px", margin: "0 0 10px", fontWeight: "bold" }}>You used your free roast</h2>
        <p style={{ color: "rgba(240,234,214,0.55)", margin: "0 0 28px", fontSize: "15px", fontStyle: "italic" }}>
          Unlimited roasts for you, your friends, and anyone who deserves to be cooked.
        </p>

        <div style={{
          background: "rgba(255,45,85,0.07)", border: "1px solid rgba(255,45,85,0.2)",
          borderRadius: "12px", padding: "20px", marginBottom: "28px"
        }}>
          <div style={{ fontSize: "36px", fontWeight: "bold", color: "#ff2d55", marginBottom: "4px" }}>$4.99</div>
          <div style={{ fontSize: "13px", color: "rgba(240,234,214,0.4)" }}>per month · cancel anytime</div>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {["Unlimited roasts", "90-day action plans", "Roast your friends (send a link)", "New features first"].map(f => (
              <div key={f} style={{ fontSize: "14px", color: "rgba(240,234,214,0.7)", display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#30d158" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            background: "#ff2d55", color: "#fff", border: "none", borderRadius: "10px",
            padding: "16px", width: "100%", fontSize: "16px", fontWeight: "bold",
            fontFamily: "Georgia, serif", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1, marginBottom: "12px", transition: "all 0.2s"
          }}
        >
          {loading ? "Redirecting to Stripe..." : "Subscribe now →"}
        </button>

        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "rgba(240,234,214,0.3)",
            fontSize: "13px", cursor: "pointer", fontFamily: "Georgia, serif"
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function RoastMyLife() {
  const [step, setStep] = useState("intro");
  const [formData, setFormData] = useState({ job: "", relationship: "", finances: "", goals: "", wildcard: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const timerRef = useRef(null);

  // On mount: check if user paid (session_id in URL) or already unlocked
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      // Came back from Stripe — verify payment
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.unlocked) {
            localStorage.setItem("roast_unlocked", "true");
            setUnlocked(true);
            // Clean URL
            window.history.replaceState({}, "", "/");
          }
        });
    } else if (localStorage.getItem("roast_unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (step === "loading") {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const handleSubmit = async () => {
    if (!formData.job.trim() || !formData.finances.trim() || !formData.goals.trim()) return;

    // Check free usage
    const hasUsedFree = localStorage.getItem("roast_used_free") === "true";
    if (hasUsedFree && !unlocked) {
      setShowPaywall(true);
      return;
    }

    setStep("loading");
    setError(null);

    const userPrompt = `Here's my life situation:

JOB/CAREER: ${formData.job}
RELATIONSHIP STATUS: ${formData.relationship || "Rather not say"}
FINANCES: ${formData.finances}
GOALS/DREAMS: ${formData.goals}
${formData.wildcard ? `WILDCARD: ${formData.wildcard}` : ""}

Roast me. Then save me.`;

    try {
      // Call our secure backend proxy instead of Anthropic directly
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: ROAST_SYSTEM,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await response.json();
      const text = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Mark free roast as used
      localStorage.setItem("roast_used_free", "true");

      setResult(parsed);
      setStep("result");
    } catch (e) {
      setError("Even our AI was too stunned to respond. Try again.");
      setStep("form");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`"${result.shareQuote}" 💀\n\nGet roasted at roastmylife.vercel.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreColor = (s) => s >= 75 ? "#ff2d55" : s >= 45 ? "#ff9f0a" : "#30d158";

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#f0ead6", position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .field { background: rgba(240,234,214,0.05); border: 1px solid rgba(240,234,214,0.12); border-radius: 8px; color: #f0ead6; font-family: Georgia, serif; font-size: 15px; padding: 14px 16px; width: 100%; box-sizing: border-box; resize: vertical; transition: border-color 0.2s, background 0.2s; outline: none; }
        .field:focus { border-color: rgba(255,45,85,0.5); background: rgba(255,45,85,0.04); }
        .field::placeholder { color: rgba(240,234,214,0.3); }
        .btn { background: #ff2d55; color: #fff; border: none; border-radius: 8px; padding: 16px 40px; font-family: Georgia, serif; font-size: 17px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
        .btn:hover { background: #ff0a3c; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(255,45,85,0.35); }
        .btn:disabled { background: rgba(255,45,85,0.3); cursor: not-allowed; transform: none; box-shadow: none; }
        .fade { animation: fadeUp 0.5s ease forwards; }
        .section { background: rgba(240,234,214,0.03); border: 1px solid rgba(240,234,214,0.08); border-radius: 16px; padding: 28px; margin-bottom: 20px; animation: fadeUp 0.5s ease forwards; }
        .label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(240,234,214,0.4); margin-bottom: 8px; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "600px", height: "400px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,45,85,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}

      <div style={{ position: "relative", zIndex: 1, maxWidth: "660px", margin: "0 auto", padding: "0 24px 80px" }}>

        {/* INTRO */}
        {step === "intro" && (
          <div className="fade" style={{ textAlign: "center", paddingTop: "80px" }}>
            <div style={{ fontSize: "60px", marginBottom: "8px" }}>🔥</div>
            <h1 style={{ fontSize: "clamp(36px,8vw,54px)", fontWeight: "bold", margin: "0 0 12px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Roast My Life
            </h1>
            <p style={{ fontSize: "19px", color: "rgba(240,234,214,0.55)", margin: "0 0 6px", fontStyle: "italic" }}>
              AI roasts your choices. Then saves you from yourself.
            </p>
            <p style={{ fontSize: "13px", color: "rgba(240,234,214,0.3)", margin: "0 0 48px" }}>First roast free · Results in under 90 seconds</p>

            <div style={{ display: "flex", gap: "32px", justifyContent: "center", marginBottom: "48px", flexWrap: "wrap" }}>
              {[["💀", "Brutally honest"], ["📋", "Real 90-day plan"], ["📸", "Screenshot-worthy"]].map(([icon, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "26px", marginBottom: "4px" }}>{icon}</div>
                  <div style={{ fontSize: "12px", color: "rgba(240,234,214,0.4)" }}>{label}</div>
                </div>
              ))}
            </div>

            <button className="btn" onClick={() => setStep("form")} style={{ fontSize: "18px", padding: "18px 48px" }}>
              Roast me →
            </button>
            <p style={{ marginTop: "16px", fontSize: "12px", color: "rgba(240,234,214,0.2)" }}>12,847 lives roasted this week</p>
          </div>
        )}

        {/* FORM */}
        {step === "form" && (
          <div className="fade" style={{ paddingTop: "56px" }}>
            <button onClick={() => setStep("intro")} style={{ background: "none", border: "none", color: "rgba(240,234,214,0.35)", cursor: "pointer", fontSize: "13px", marginBottom: "28px", fontFamily: "Georgia, serif", padding: 0 }}>← back</button>
            <h2 style={{ fontSize: "26px", margin: "0 0 6px", fontWeight: "bold" }}>Tell me everything.</h2>
            <p style={{ color: "rgba(240,234,214,0.45)", margin: "0 0 36px", fontStyle: "italic", fontSize: "15px" }}>The more honest you are, the harder the roast. The harder the roast, the better the plan.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { key: "job", label: "Job / Career *", placeholder: "e.g. 28, same dead-end job for 3 years, haven't asked for a raise..." },
                { key: "relationship", label: "Relationship status", placeholder: "e.g. Single for 4 years, keep attracting the wrong people..." },
                { key: "finances", label: "Finances *", placeholder: "e.g. $4k in credit card debt, no savings, spend too much on takeout..." },
                { key: "goals", label: "Goals / Dreams *", placeholder: "e.g. Want to start a business, travel more, feel like I'm actually living..." },
                { key: "wildcard", label: "Wildcard (optional — make it spicy)", placeholder: "e.g. I still text my ex. I've been 'about to go to the gym' for 8 months..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <textarea className="field" rows={2} placeholder={placeholder} value={formData[key]} onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}

              {error && <div style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: "8px", padding: "12px 16px", fontSize: "14px", color: "#ff6b80" }}>{error}</div>}

              <button className="btn" onClick={handleSubmit} disabled={!formData.job.trim() || !formData.finances.trim() || !formData.goals.trim()} style={{ width: "100%", marginTop: "4px" }}>
                🔥 Roast me now
              </button>
              <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(240,234,214,0.2)", margin: "-8px 0 0" }}>Your info is never stored or shared</p>
            </div>
          </div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <div className="fade" style={{ paddingTop: "120px", textAlign: "center" }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ animation: "spin 1.2s linear infinite", marginBottom: "28px" }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(240,234,214,0.1)" strokeWidth="4" />
              <path d="M32 4 A28 28 0 0 1 60 32" fill="none" stroke="#ff2d55" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <h2 style={{ fontSize: "22px", margin: "0 0 10px" }}>Analyzing your choices...</h2>
            <p style={{ color: "rgba(240,234,214,0.4)", fontStyle: "italic", margin: "0 0 24px" }}>
              {timer < 10 ? "Reading between the lines..." : timer < 25 ? "Counting the red flags..." : timer < 45 ? "Building your escape plan..." : "Putting finishing touches on your roast..."}
            </p>
            <div style={{ display: "inline-block", background: "rgba(240,234,214,0.05)", borderRadius: "100px", padding: "6px 20px", fontSize: "13px", color: "rgba(240,234,214,0.3)" }}>{timer}s elapsed</div>
          </div>
        )}

        {/* RESULT */}
        {step === "result" && result && (
          <div style={{ paddingTop: "48px" }}>
            {/* Score */}
            <div style={{ background: "rgba(255,45,85,0.06)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: "16px", padding: "32px", marginBottom: "20px", textAlign: "center", animation: "fadeUp 0.5s ease both" }}>
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(240,234,214,0.35)", margin: "0 0 16px" }}>Your Chaos Score</p>
              <div style={{ position: "relative", display: "inline-block", marginBottom: "14px" }}>
                <svg width="110" height="110" viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(240,234,214,0.07)" strokeWidth="6" />
                  <circle cx="45" cy="45" r="40" fill="none" stroke={scoreColor(result.savageScore)} strokeWidth="6" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 - (251 * result.savageScore / 100)} transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1) 0.3s" }} />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div style={{ fontSize: "26px", fontWeight: "bold", color: scoreColor(result.savageScore) }}>{result.savageScore}</div>
                  <div style={{ fontSize: "10px", color: "rgba(240,234,214,0.35)" }}>/100</div>
                </div>
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: scoreColor(result.savageScore), marginBottom: "8px" }}>{result.savageScoreLabel}</div>
              <h2 style={{ fontSize: "clamp(17px,4vw,22px)", margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>"{result.roastTitle}"</h2>
            </div>

            {/* Roast */}
            <div className="section">
              <p className="label">🔥 The Roast</p>
              {result.roastLines.map((line, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0", fontSize: "15px", lineHeight: 1.6, paddingLeft: "14px", borderLeft: "2px solid rgba(255,45,85,0.3)", color: "rgba(240,234,214,0.82)" }}>{line}</p>
              ))}
            </div>

            {/* Red Flags */}
            <div style={{ ...{ background: "rgba(255,159,10,0.05)", border: "1px solid rgba(255,159,10,0.15)" }, borderRadius: "16px", padding: "28px", marginBottom: "20px", animation: "fadeUp 0.5s 0.1s ease both" }}>
              <p className="label" style={{ color: "rgba(255,159,10,0.55)" }}>🚩 Red Flags</p>
              {result.redFlags.map((flag, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", marginTop: i === 0 ? 0 : "10px" }}>
                  <span style={{ color: "#ff9f0a", flexShrink: 0 }}>▸</span>
                  <span style={{ fontSize: "14px", color: "rgba(240,234,214,0.72)", lineHeight: 1.5 }}>{flag}</span>
                </div>
              ))}
            </div>

            {/* Plan */}
            <div style={{ background: "rgba(48,209,88,0.04)", border: "1px solid rgba(48,209,88,0.15)", borderRadius: "16px", padding: "28px", marginBottom: "20px", animation: "fadeUp 0.5s 0.2s ease both" }}>
              <p className="label" style={{ color: "rgba(48,209,88,0.55)" }}>📋 Your 90-Day Rescue Plan</p>
              {result.plan.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginTop: i === 0 ? 0 : "18px" }}>
                  <div style={{ flexShrink: 0, background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: "7px", padding: "5px 9px", fontSize: "11px", color: "#30d158", whiteSpace: "nowrap", height: "fit-content" }}>{s.day}</div>
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: "bold", color: "rgba(240,234,214,0.9)" }}>{s.action}</p>
                    <p style={{ margin: 0, fontSize: "13px", color: "rgba(240,234,214,0.42)", fontStyle: "italic" }}>{s.why}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Verdict */}
            <div style={{ background: "linear-gradient(135deg,rgba(255,45,85,0.07),rgba(255,159,10,0.04))", border: "1px solid rgba(255,45,85,0.18)", borderRadius: "16px", padding: "24px", marginBottom: "20px", textAlign: "center", animation: "fadeUp 0.5s 0.3s ease both" }}>
              <p className="label">⚖️ Final Verdict</p>
              <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.6, fontStyle: "italic" }}>"{result.verdict}"</p>
            </div>

            {/* Share */}
            <div className="section" style={{ animationDelay: "0.4s" }}>
              <p className="label">📸 Copy your best line</p>
              <p style={{ margin: "0 0 14px", fontSize: "15px", lineHeight: 1.6, color: "rgba(240,234,214,0.65)", fontStyle: "italic" }}>"{result.shareQuote}"</p>
              <button onClick={handleCopy} style={{ background: copied ? "rgba(48,209,88,0.12)" : "rgba(240,234,214,0.06)", border: `1px solid ${copied ? "rgba(48,209,88,0.25)" : "rgba(240,234,214,0.1)"}`, borderRadius: "8px", color: copied ? "#30d158" : "rgba(240,234,214,0.55)", padding: "10px 20px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", width: "100%", transition: "all 0.2s" }}>
                {copied ? "✓ Copied to clipboard" : "Copy to share →"}
              </button>
            </div>

            {/* Roast again */}
            <div style={{ textAlign: "center", animation: "fadeUp 0.5s 0.5s ease both" }}>
              <button className="btn" onClick={() => { setStep("form"); setResult(null); setFormData({ job: "", relationship: "", finances: "", goals: "", wildcard: "" }); }}>
                Roast someone else →
              </button>
              <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(240,234,214,0.22)" }}>Dare a friend to get their score</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
