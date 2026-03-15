import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

const LS_WEDDING_HOST_USER_KEY = "wedding_host_user_v1";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function WeddingHostLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("create");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  const cleanedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const routeHostUser = useCallback(
    async (userId) => {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events`,
        {
          headers: {
            "x-wedding-host-user-id": userId,
          },
        },
      );

      const raw = await response.text();

      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Server returned an unexpected response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to load host events.");
      }

      const events = Array.isArray(data.events) ? data.events : [];

      if (events.length > 0) {
        navigate(`/wedding/manage/${events[0].event_id}`, { replace: true });
        return;
      }

      navigate("/weddingcreateevent", { replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    async function checkExistingHost() {
      try {
        const stored = safeJsonParse(
          localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
        );

        if (!stored?.userId) {
          setCheckingExistingSession(false);
          return;
        }

        await routeHostUser(stored.userId);
      } catch (err) {
        console.error(err);
        localStorage.removeItem(LS_WEDDING_HOST_USER_KEY);
        setCheckingExistingSession(false);
      }
    }

    checkExistingHost();
  }, [routeHostUser]);

  async function postToEndpoint(endpoint, emailValue) {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailValue,
        }),
      },
    );

    const raw = await response.text();

    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error("Server returned an unexpected response.");
    }

    return { response, data };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cleanedEmail) {
      setError("Please enter your email.");
      return;
    }

    try {
      setSubmitting(true);

      let result;

      if (mode === "create") {
        result = await postToEndpoint(
          "/api/wedding/host/register",
          cleanedEmail,
        );

        if (!result.response.ok) {
          const message = String(result.data?.error || "").toLowerCase();

          const alreadyExists =
            result.response.status === 409 ||
            message.includes("already exists") ||
            message.includes("already registered") ||
            message.includes("account exists") ||
            message.includes("user exists");

          if (alreadyExists) {
            result = await postToEndpoint(
              "/api/wedding/host/login",
              cleanedEmail,
            );
          }
        }
      } else {
        result = await postToEndpoint("/api/wedding/host/login", cleanedEmail);
      }

      const { response, data } = result;

      if (!response.ok) {
        throw new Error(
          data.error ||
            (mode === "create"
              ? "Failed to create account."
              : "Failed to sign in."),
        );
      }

      localStorage.setItem(
        LS_WEDDING_HOST_USER_KEY,
        JSON.stringify({
          userId: data.user.user_id,
          email: data.user.email,
        }),
      );

      await routeHostUser(data.user.user_id);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingExistingSession) {
    return (
      <div className="home-container">
        <div className="screen wedding-home ss-editorial">
          <div className="ss-card">
            <p className="ss-subtitle">Checking your account...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="screen wedding-home ss-editorial">
        <div className="ss-card">
          <div className="ss-header">
            <div className="ss-ornament" aria-hidden="true">
              <span className="ss-dot" />
              <span className="ss-line" />
              <span className="ss-dot" />
            </div>

            <h1 className="ss-title">
              {mode === "create" ? "Create Account" : "Sign In"}
            </h1>

            <p className="ss-subtitle">
              {mode === "create"
                ? "Use your email to create and manage wedding events."
                : "Enter your email to access your wedding events."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="ss-form">
            <div className="ss-field">
              <div className="ss-input-wrap">
                <Icon icon="mdi:email-outline" className="ss-input-icon" />
                <input
                  id="hostEmail"
                  className="ss-input ss-input--icon"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {error ? <div className="ss-error">{error}</div> : null}

            <button
              type="submit"
              className="ss-btn ss-btn--primary"
              disabled={submitting}
            >
              {submitting
                ? mode === "create"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "create"
                  ? "Create account"
                  : "Sign in"}
            </button>

            <div className="ss-footer ss-footer--muted">
              {mode === "create" ? (
                <button
                  type="button"
                  className="ss-link"
                  onClick={() => {
                    setError("");
                    setMode("signin");
                  }}
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  className="ss-link"
                  onClick={() => {
                    setError("");
                    setMode("create");
                  }}
                >
                  Need an account? Create one
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
