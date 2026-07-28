"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || "Could not sign in");
      setLoading(false);
      return;
    }
    window.location.assign(new URLSearchParams(window.location.search).get("next") || "/");
  };

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <span className="login-mark"><Sparkles /></span>
        <p className="eyebrow">ENTROPY LAB</p>
        <h1>Open the workspace</h1>
        <p>Enter the shared access code. It protects saved prompts and the model account.</p>
        <label htmlFor="access-code">Access code</label>
        <input
          id="access-code"
          type="password"
          autoComplete="current-password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoFocus
        />
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="primary" disabled={!code || loading}>
          {loading ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
          {loading ? "Opening…" : "Open workspace"}
        </button>
      </form>
    </main>
  );
}
