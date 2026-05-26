import { useState, useEffect, useRef } from "react";

const SYSTEM = `You are the voice inside someone's head that finally tells the truth — cold, clear, powerful. You help people who have been walked on, silenced, manipulated, or ignored reclaim their power.

The user will describe a situation where they were a people pleaser, got taken advantage of, stayed silent when they shouldn't have, or let someone walk over them.

Your response MUST be a JSON object with this EXACT structure:
{
  "diagnosis": "A razor-sharp 1-sentence naming of exactly what happened to them (e.g. 'You let someone else's comfort become more important than your own dignity')",
  "villainScore": <number 1-100, how much they need to enter their villain era, 100 = completely cooked>,
  "villainTitle": "Their villain era title (e.g. 'The Unbothered', 'The Unforgiving', 'The Silent Storm')",
  "whatTheyActuallyFelt": "What they were ACTUALLY feeling but never said — raw and real, 2-3 sentences",
  "rewrite": "The EXACT words they should have said or could say now — powerful, calm, devastating in the best way. 3-5 sentences. No screaming, no drama. Ice cold power.",
  "theyWereWrong": ["specific thing person did wrong #1", "specific thing #2", "specific thing #3"],
  "boundaries": ["Boundary to set going forward #1", "Boundary #2", "Boundary #3"],
  "mantra": "Their personal villain era mantra — 6-10 words, poetic, powerful, theirs forever",
  "shareQuote": "The single most powerful quotable line from the rewrite or diagnosis — for sharing"
}

Be COLD. Be CLEAR. Be on THEIR SIDE completely. No victim-blaming. No "but consider their perspective." This is not therapy — this is someone finally being told they deserved better. The rewrite should make them feel like they just put on armor.

Return ONLY the JSON. No markdown. No preamble.`;

const CURSES = [
  "They had no right.",
  "You already knew.",
  "The silence was never yours to keep.",
  "You were never too much. They were just too small.",
  "Peace is not the same as surrender.",
  "Soft is not the same as weak.",
  "Your discomfort was data. You ignored it.",
  "You owe no one your smallness.",
];

const TITLES = [
  "The Unbothered", "The Unforgiving", "The Silent Storm",
  "The Immovable", "The Untouchable", "The Last Word",
  "The Reclaimed", "The Uncolonized"
];

function GlitchText({ text, active }) {
  const [glitched, setGlitched] = useState(text);
  const chars = "アイウエオカキクケコ#@$%&*!?ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  useEffect(() => {
    if (!active) { setGlitched(text); return; }
    let iterations = 0;
    const interval = setInterval(() => {
      setGlitched(text.split("").map((char, i) => {
        if (i < iterations) return char;
        if (char === " ") return " ";
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      iterations += 1.5;
      if (iterations > text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text, active]);
  return <span>{glitched}</span>;
}

function ScoreRing({ score, color }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    setTimeout(() => setOffset(circ - (circ * score / 100)), 300);
  }, [score]);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 2s cubic-bezier(0.19,1,0.22,1)" }} />
      <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="'Cormorant Garamond', serif">{score}</text>
      <text x="70" y="82" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="'Cormorant Garamond', serif">VILLAIN SCORE</text>
    </svg>
  );
}

export default function VillainEra() {
  const [step, setStep] = useState("intro");
  const [situation, setSituation] = useState("");
  const [who, setWho] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState(0);
  const [copied, setCopied] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [curseIdx, setCurseIdx] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const timerRef = useRef(null);

  const loadMessages = [
    "Reading between every line...",
    "Finding what you couldn't say...",
    "Sharpening your armor...",
    "Rewriting the story...",
    "Your villain era begins now.",
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      fetch(`/api/verify-session?session_id=${sid}`).then(r => r.json()).then(d => {
        if (d.unlocked) { localStorage.setItem("villain_unlocked", "true"); setUnlocked(true); window.history.replaceState({}, "", "/"); }
      });
    } else if (localStorage.getItem("villain_unlocked") === "true") setUnlocked(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurseIdx(i => (i + 1) % CURSES.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) {
      timerRef.current = setInterval(() => setLoadMsg(m => Math.min(m + 1, loadMessages.length - 1)), 2500);
    } else { clearInterval(timerRef.current); setLoadMsg(0); }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  useEffect(() => {
    if (result) {
      let i = 0;
      const t = setInterval(() => { setRevealStep(i); i++; if (i > 8) clearInterval(t); }, 400);
    }
  }, [result]);

  const submit = async () => {
    if (!situation.trim()) return;
    if (localStorage.getItem("villain_used_free") === "true" && !unlocked) { setShowPaywall(true); return; }
    setLoading(true); setStep("loading"); setError("");
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM,
          messages: [{ role: "user", content: `WHO DID THIS: ${who || "someone in my life"}\n\nWHAT HAPPENED: ${situation}` }]
        })
      });
      const data = await res.json();
      const text = data.content.map(b => b.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      localStorage.setItem("villain_used_free", "true");
      setResult(parsed);
      setStep("result");
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 2000);
    } catch (e) {
      setError("Something broke. Try again."); setStep("form");
    } finally { setLoading(false); }
  };

  const scoreColor = (s) => s >= 80 ? "#ff2d55" : s >= 55 ? "#c084fc" : "#818cf8";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      color: "#e8e0d0",
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
      position: "relative",
      overflowX: "hidden",
    }}>
      <style>{`
        
        * { box-sizing: border-box; }
        ::selection { background: rgba(192,132,252,0.3); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} 97%{opacity:0.7} 98%{opacity:1} }
        @keyframes scanline { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        .reveal-0 { animation: fadeUp 0.7s 0s ease both; }
        .reveal-1 { animation: fadeUp 0.7s 0.15s ease both; }
        .reveal-2 { animation: fadeUp 0.7s 0.3s ease both; }
        .reveal-3 { animation: fadeUp 0.7s 0.45s ease both; }
        .reveal-4 { animation: fadeUp 0.7s 0.6s ease both; }
        .reveal-5 { animation: fadeUp 0.7s 0.75s ease both; }
        .reveal-6 { animation: fadeUp 0.7s 0.9s ease both; }
        .reveal-7 { animation: fadeUp 0.7s 1.05s ease both; }
        .flicker { animation: flicker 8s infinite; }
        .breathe { animation: breathe 4s ease-in-out infinite; }
        textarea:focus { outline: none; border-color: rgba(192,132,252,0.5) !important; background: rgba(192,132,252,0.04) !important; }
        textarea::placeholder { color: rgba(232,224,208,0.2); font-style: italic; font-family: 'Cormorant Garamond', serif; }
        .btn-main { background: transparent; border: 1px solid rgba(232,224,208,0.3); color: #e8e0d0; padding: 14px 48px; font-family: 'Cormorant Garamond', serif; font-size: 18px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
        .btn-main::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(192,132,252,0.1), rgba(255,45,85,0.1)); opacity: 0; transition: opacity 0.3s; }
        .btn-main:hover { border-color: rgba(192,132,252,0.6); color: #fff; }
        .btn-main:hover::before { opacity: 1; }
        .btn-main:disabled { opacity: 0.3; cursor: not-allowed; }
        .card { border: 1px solid rgba(232,224,208,0.07); border-radius: 2px; padding: 28px 32px; margin-bottom: 16px; position: relative; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; }
      `}</style>

      {/* Scanline effect */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)", pointerEvents: "none" }} />
      </div>

      {/* Ambient orbs */}
      <div style={{ position: "fixed", top: "10%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "0", left: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,85,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Paywall */}
      {showPaywall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", animation: "fadeIn 0.3s ease" }}>
          <div style={{ maxWidth: "440px", width: "100%", border: "1px solid rgba(192,132,252,0.3)", padding: "48px 40px", textAlign: "center", background: "#080808" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(192,132,252,0.6)", marginBottom: "24px" }}>Your free session is complete</div>
            <h2 style={{ fontSize: "32px", fontWeight: 300, margin: "0 0 12px", lineHeight: 1.2 }}>The villain era<br /><em>doesn't end here.</em></h2>
            <p style={{ color: "rgba(232,224,208,0.45)", margin: "0 0 36px", fontSize: "16px", lineHeight: 1.7 }}>
              Unlimited rewrites. Every situation. Every person who pushed you too far.
            </p>
            <div style={{ fontSize: "48px", fontWeight: 300, color: "#c084fc", marginBottom: "4px" }}>$4.99</div>
            <div style={{ fontSize: "13px", color: "rgba(232,224,208,0.3)", letterSpacing: "0.1em", marginBottom: "32px" }}>PER MONTH · CANCEL ANYTIME</div>
            <button className="btn-main" style={{ width: "100%", marginBottom: "16px" }} onClick={async () => {
              try {
                const res = await fetch("/api/create-checkout", { method: "POST" });
                const d = await res.json();
                if (d.url) window.location.href = d.url;
              } catch { alert("Error. Try again."); }
            }}>Enter the era →</button>
            <button onClick={() => setShowPaywall(false)} style={{ background: "none", border: "none", color: "rgba(232,224,208,0.25)", fontSize: "13px", cursor: "pointer", fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.05em" }}>Not yet</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 28px 100px", position: "relative", zIndex: 1 }}>

        {/* INTRO */}
        {step === "intro" && (
          <div style={{ paddingTop: "100px" }}>
            <div className="reveal-0" style={{ marginBottom: "80px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(192,132,252,0.6)", marginBottom: "24px" }}>
                A reckoning
              </div>
              <h1 className="flicker" style={{ fontSize: "clamp(56px, 10vw, 96px)", fontWeight: 300, margin: "0 0 8px", lineHeight: 1, letterSpacing: "-0.02em" }}>
                Villain Era
              </h1>
              <p style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 300, color: "rgba(232,224,208,0.5)", fontStyle: "italic", margin: 0 }}>
                Stop shrinking. Start rewriting.
              </p>
            </div>

            <div className="reveal-1" style={{ borderLeft: "1px solid rgba(192,132,252,0.3)", paddingLeft: "24px", marginBottom: "64px" }}>
              <p style={{ fontSize: "18px", lineHeight: 1.8, color: "rgba(232,224,208,0.65)", margin: "0 0 16px", fontWeight: 300 }}>
                You stayed quiet when you should have spoken.<br />
                You said yes when every part of you said no.<br />
                You made yourself smaller so someone else could feel bigger.
              </p>
              <p style={{ fontSize: "18px", lineHeight: 1.8, color: "rgba(232,224,208,0.9)", margin: 0, fontStyle: "italic" }}>
                That ends today.
              </p>
            </div>

            <div className="reveal-2" style={{ marginBottom: "64px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(232,224,208,0.25)", marginBottom: "20px" }}>What you get</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  ["Your words back", "Exactly what you should have said — calm, clear, devastating"],
                  ["Your villain title", "The version of you that doesn't apologize for existing"],
                  ["Your diagnosis", "Named, seen, validated — no more gaslighting yourself"],
                  ["Your mantra", "Six words to carry into every room from now on"],
                ].map(([title, desc]) => (
                  <div key={title} style={{ border: "1px solid rgba(232,224,208,0.06)", padding: "20px", borderRadius: "2px" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "6px", color: "#e8e0d0" }}>{title}</div>
                    <div style={{ fontSize: "13px", color: "rgba(232,224,208,0.4)", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-3" style={{ marginBottom: "48px", padding: "20px 24px", borderLeft: "2px solid rgba(192,132,252,0.3)", background: "rgba(192,132,252,0.03)" }}>
              <div style={{ fontSize: "16px", fontStyle: "italic", color: "rgba(232,224,208,0.6)", animation: "fadeIn 0.5s ease", lineHeight: 1.7 }}>
                "{CURSES[curseIdx]}"
              </div>
            </div>

            <div className="reveal-4">
              <button className="btn-main" onClick={() => setStep("form")}>
                Reclaim yourself →
              </button>
              <div style={{ marginTop: "16px", fontSize: "12px", color: "rgba(232,224,208,0.2)", letterSpacing: "0.1em" }}>
                FIRST SESSION FREE · $4.99/MO AFTER
              </div>
            </div>
          </div>
        )}

        {/* FORM */}
        {step === "form" && (
          <div style={{ paddingTop: "80px" }}>
            <button onClick={() => setStep("intro")} style={{ background: "none", border: "none", color: "rgba(232,224,208,0.3)", cursor: "pointer", fontSize: "13px", marginBottom: "48px", fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.1em", padding: 0 }}>
              ← back
            </button>

            <div className="reveal-0" style={{ marginBottom: "48px" }}>
              <h2 style={{ fontSize: "36px", fontWeight: 300, margin: "0 0 8px" }}>Tell me what happened.</h2>
              <p style={{ fontSize: "16px", color: "rgba(232,224,208,0.4)", fontStyle: "italic", margin: 0 }}>
                Don't soften it. Don't make excuses for them. Just tell the truth.
              </p>
            </div>

            <div className="reveal-1" style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(232,224,208,0.35)", marginBottom: "10px" }}>
                Who did this to you? (optional)
              </label>
              <textarea
                rows={1}
                placeholder="e.g. my manager, my ex, my mother, my friend of 10 years..."
                value={who}
                onChange={e => setWho(e.target.value)}
                style={{ background: "rgba(232,224,208,0.03)", border: "1px solid rgba(232,224,208,0.1)", borderRadius: "2px", color: "#e8e0d0", fontFamily: "Cormorant Garamond, serif", fontSize: "17px", padding: "16px 20px", width: "100%", resize: "none", lineHeight: 1.5 }}
              />
            </div>

            <div className="reveal-2" style={{ marginBottom: "36px" }}>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(232,224,208,0.35)", marginBottom: "10px" }}>
                What happened? *
              </label>
              <textarea
                rows={6}
                placeholder="e.g. I've been covering for my manager for two years. She takes credit for my work in every meeting. Last week she told the CEO that the project I built alone was 'her vision.' I said nothing. I smiled. I even congratulated her after. I don't recognize myself anymore..."
                value={situation}
                onChange={e => setSituation(e.target.value)}
                style={{ background: "rgba(232,224,208,0.03)", border: "1px solid rgba(232,224,208,0.1)", borderRadius: "2px", color: "#e8e0d0", fontFamily: "Cormorant Garamond, serif", fontSize: "17px", padding: "16px 20px", width: "100%", resize: "vertical", lineHeight: 1.7 }}
              />
            </div>

            {error && <div style={{ color: "#ff6b80", fontSize: "14px", marginBottom: "16px" }}>{error}</div>}

            <div className="reveal-3">
              <button className="btn-main" onClick={submit} disabled={!situation.trim()}>
                Begin the reckoning →
              </button>
              <div style={{ marginTop: "12px", fontSize: "12px", color: "rgba(232,224,208,0.2)", letterSpacing: "0.08em" }}>
                Your words are never stored or shared.
              </div>
            </div>
          </div>
        )}

        {/* LOADING */}
        {step === "loading" && (
          <div style={{ paddingTop: "140px", textAlign: "center" }}>
            <div style={{ marginBottom: "40px" }}>
              <div style={{ width: "1px", height: "80px", background: "linear-gradient(to bottom, transparent, rgba(192,132,252,0.8), transparent)", margin: "0 auto", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <p style={{ fontSize: "22px", fontWeight: 300, fontStyle: "italic", color: "rgba(232,224,208,0.7)", margin: "0 0 12px", letterSpacing: "0.02em", animation: "fadeIn 0.5s ease" }}>
              {loadMessages[loadMsg]}
            </p>
            <p style={{ fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(232,224,208,0.2)" }}>
              This takes about 30 seconds
            </p>
          </div>
        )}

        {/* RESULT */}
        {step === "result" && result && (
          <div style={{ paddingTop: "72px" }}>

            {/* Title + Score */}
            <div className="reveal-0" style={{ textAlign: "center", marginBottom: "48px", padding: "48px 32px", border: "1px solid rgba(192,132,252,0.15)", background: "rgba(192,132,252,0.03)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(192,132,252,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
              <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(192,132,252,0.5)", marginBottom: "16px" }}>You have entered</div>
              <h2 style={{ fontSize: "clamp(32px,6vw,52px)", fontWeight: 300, margin: "0 0 24px", lineHeight: 1.1 }}>
                <GlitchText text={result.villainTitle} active={glitchActive} />
              </h2>
              <ScoreRing score={result.villainScore} color={scoreColor(result.villainScore)} />
            </div>

            {/* Diagnosis */}
            <div className="reveal-1 card" style={{ borderColor: "rgba(255,45,85,0.15)", background: "rgba(255,45,85,0.03)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,45,85,0.5)", marginBottom: "14px" }}>What actually happened</div>
              <p style={{ fontSize: "20px", fontWeight: 400, lineHeight: 1.6, margin: 0, fontStyle: "italic", color: "rgba(232,224,208,0.9)" }}>
                "{result.diagnosis}"
              </p>
            </div>

            {/* What they actually felt */}
            <div className="reveal-2 card" style={{ borderColor: "rgba(232,224,208,0.07)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(232,224,208,0.3)", marginBottom: "14px" }}>What you were actually feeling</div>
              <p style={{ fontSize: "17px", lineHeight: 1.8, margin: 0, color: "rgba(232,224,208,0.7)", fontStyle: "italic" }}>
                {result.whatTheyActuallyFelt}
              </p>
            </div>

            {/* The Rewrite — hero section */}
            <div className="reveal-3 card" style={{ borderColor: "rgba(192,132,252,0.2)", background: "rgba(192,132,252,0.04)", padding: "36px 32px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(192,132,252,0.6)", marginBottom: "20px" }}>What you should have said — and can say now</div>
              <p style={{ fontSize: "20px", lineHeight: 1.9, margin: 0, color: "#e8e0d0", fontWeight: 400 }}>
                {result.rewrite}
              </p>
            </div>

            {/* They were wrong */}
            <div className="reveal-4 card">
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(232,224,208,0.3)", marginBottom: "16px" }}>What they did wrong</div>
              {result.theyWereWrong.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginBottom: i < result.theyWereWrong.length - 1 ? "12px" : 0 }}>
                  <span style={{ color: "rgba(255,45,85,0.6)", flexShrink: 0, marginTop: "2px" }}>—</span>
                  <span style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(232,224,208,0.7)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Boundaries */}
            <div className="reveal-5 card" style={{ borderColor: "rgba(129,140,248,0.15)", background: "rgba(129,140,248,0.03)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(129,140,248,0.5)", marginBottom: "16px" }}>Your boundaries going forward</div>
              {result.boundaries.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", marginBottom: i < result.boundaries.length - 1 ? "12px" : 0 }}>
                  <span style={{ color: "rgba(129,140,248,0.5)", flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(232,224,208,0.75)" }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Mantra */}
            <div className="reveal-6" style={{ margin: "32px 0", padding: "40px 32px", textAlign: "center", border: "1px solid rgba(192,132,252,0.2)", background: "rgba(192,132,252,0.04)", position: "relative" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(192,132,252,0.4)", marginBottom: "20px" }}>Your mantra</div>
              <p className="breathe" style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 300, fontStyle: "italic", margin: 0, lineHeight: 1.4, color: "#e8e0d0", letterSpacing: "0.02em" }}>
                "{result.mantra}"
              </p>
            </div>

            {/* Share */}
            <div className="reveal-7 card">
              <div style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(232,224,208,0.25)", marginBottom: "14px" }}>Share your reckoning</div>
              <p style={{ fontSize: "16px", fontStyle: "italic", color: "rgba(232,224,208,0.55)", margin: "0 0 16px", lineHeight: 1.7 }}>
                "{result.shareQuote}"
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(`"${result.shareQuote}"\n\n— villain era\nvillaineRA.vercel.app`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ background: copied ? "rgba(192,132,252,0.1)" : "rgba(232,224,208,0.04)", border: `1px solid ${copied ? "rgba(192,132,252,0.3)" : "rgba(232,224,208,0.1)"}`, borderRadius: "2px", color: copied ? "#c084fc" : "rgba(232,224,208,0.4)", padding: "12px 24px", cursor: "pointer", fontSize: "13px", fontFamily: "Cormorant Garamond, serif", letterSpacing: "0.1em", textTransform: "uppercase", width: "100%", transition: "all 0.2s" }}>
                {copied ? "✓ Copied" : "Copy to share"}
              </button>
            </div>

            {/* Go again */}
            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <button className="btn-main" onClick={() => { setStep("form"); setResult(null); setSituation(""); setWho(""); setRevealStep(0); }}>
                Another situation →
              </button>
              <p style={{ marginTop: "14px", fontSize: "12px", color: "rgba(232,224,208,0.2)", letterSpacing: "0.08em" }}>
                Send this to someone who needs it
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

