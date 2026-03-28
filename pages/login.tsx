import React, { useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const continueAsGuest = () => {
    const guestId = `guest_${crypto.randomUUID()}`;
    // No Max-Age / Expires → session cookie, cleared when browser closes
    document.cookie = `guestId=${guestId}; path=/; SameSite=Strict`;
    router.push("/");
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#07090f", fontFamily: "system-ui, -apple-system, sans-serif", gap: 24,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 3, color: "#e8f0ff", marginBottom: 4 }}>
          ASTRAPATH
        </div>
        <div style={{ fontSize: 11, color: "#2d3f55", letterSpacing: 0.8 }}>Supply Chain Graph</div>
      </div>

      <SignIn routing="hash" />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: 360 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: 11, color: "#2d3f55" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>

        <button
          onClick={continueAsGuest}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: 360, padding: "13px 16px", borderRadius: 9,
            border: `1px solid ${hovered ? "rgba(52,211,153,0.6)" : "rgba(52,211,153,0.25)"}`,
            background: hovered
              ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.12))"
              : "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.06))",
            color: hovered ? "#6ee7b7" : "#34d399",
            cursor: "pointer", fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 0.18s ease",
            boxShadow: hovered ? "0 0 20px rgba(52,211,153,0.15)" : "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Continue as Guest
        </button>
        <div style={{ fontSize: 10, color: "#2d3f55", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
          No account needed · Changes lost when browser closes
        </div>
      </div>
    </div>
  );
}
