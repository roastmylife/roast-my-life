import { useState } from "react";

export default function App() {
  const [step, setStep] = useState("intro");

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#e8e0d0", fontFamily: "Georgia, serif", padding: "40px 24px" }}>
      {step === "intro" && (
        <div style={{ maxWidth: "600px", margin: "0 auto", paddingTop: "80px" }}>
          <h1 style={{ fontSize: "72px", fontWeight: 300, margin: "0 0 16px" }}>Villain Era</h1>
          <p style={{ fontSize: "20px", color: "rgba(232,224,208,0.5)", marginBottom: "48px" }}>Stop shrinking. Start rewriting.</p>
          <button onClick={() => setStep("form")} style={{ background: "transparent", border: "1px solid rgba(232,224,208,0.3)", color: "#e8e0d0", padding: "14px 48px", fontFamily: "Georgia, serif", fontSize: "18px", cursor: "pointer" }}>
            Reclaim yourself →
          </button>
        </div>
      )}
      {step === "form" && (
        <div style={{ maxWidth: "600px", margin: "0 auto", paddingTop: "80px" }}>
          <h2 style={{ fontSize: "36px", fontWeight: 300, marginBottom: "32px" }}>Tell me what happened.</h2>
          <textarea rows={6} style={{ width: "100%", background: "rgba(232,224,208,0.05)", border: "1px solid rgba(232,224,208,0.1)", color: "#e8e0d0", fontFamily: "Georgia, serif", fontSize: "16px", padding: "16px", boxSizing: "border-box" }} />
          <button onClick={() => setStep("intro")} style={{ background: "transparent", border: "1px solid rgba(232,224,208,0.3)", color: "#e8e0d0", padding: "14px 48px", fontFamily: "Georgia, serif", fontSize: "18px", cursor: "pointer", marginTop: "24px" }}>
            Begin →
          </button>
        </div>
      )}
    </div>
  );
}