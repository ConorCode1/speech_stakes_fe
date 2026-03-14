//weddinghostlogin.jsx

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WeddingApp.css";

const LS_WEDDING_HOST_USER_KEY = "wedding_host_user_v1";

export default function WeddingHostLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cleanedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cleanedEmail) {
      setError("Please enter your email.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanedEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in.");
      }

      localStorage.setItem(
        LS_WEDDING_HOST_USER_KEY,
        JSON.stringify({
          userId: data.user.user_id,
          email: data.user.email,
        })
      );

      navigate("/weddingcreateevent");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen wedding-home ss-editorial">
      <div className="ss-card">
        <div className="ss-header">
          <div className="ss-ornament" aria-hidden="true">
            <span className="ss-dot" />
            <span className="ss-line" />
            <span className="ss-dot" />
          </div>

          <h1 className="ss-title">Host Sign In</h1>
          <p className="ss-subtitle">
            Enter your email to create and manage events.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="ss-form">
          <div className="ss-field">
            <label className="ss-label" htmlFor="hostEmail">
              Email
            </label>
            <input
              id="hostEmail"
              className="ss-input"
              type="email"
              placeholder="e.g. you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {error ? <div className="ss-error">{error}</div> : null}

          <button
            type="submit"
            className="ss-btn ss-btn--primary"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
