import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function WeddingJoin() {
  const navigate = useNavigate();
  const query = useQuery();

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null);

  const joinCode = useMemo(() => {
    return String(query.get("code") || "")
      .replace(/\s+/g, "")
      .toUpperCase()
      .trim();
  }, [query]);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");

    const code = joinCode;
    const name = playerName.trim();

    if (!code) {
      setError("This join link is missing an event code.");
      return;
    }

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (!API_URL) {
      setError("API URL is missing.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/wedding/check-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, name }),
      });

      let data = null;

      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        setError(data?.error || `Request failed with status ${res.status}.`);
        return;
      }

      if (data?.exists) {
        setPendingJoin({ code, name });
        setShowOverwritePrompt(true);
        return;
      }

      navigate(
        `/weddingpredictionselection?code=${encodeURIComponent(
          code,
        )}&name=${encodeURIComponent(name)}`,
      );
    } catch (err) {
      console.error("Wedding join check-name request failed:", err);
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmOverwrite() {
    if (!pendingJoin) return;

    navigate(
      `/weddingpredictionselection?code=${encodeURIComponent(
        pendingJoin.code,
      )}&name=${encodeURIComponent(pendingJoin.name)}&overwrite=1`,
    );

    setShowOverwritePrompt(false);
    setPendingJoin(null);
  }

  function handleCancelOverwrite() {
    setShowOverwritePrompt(false);
    setPendingJoin(null);
  }

  return (
    <div className="home-container">
      <div className="screen wedding-home ss-editorial">
        <div className="ss-card">
          <div className="ss-header">
            <h1 className="ss-title">Speech Stakes</h1>
            <p className="ss-subtitle">
              Predict how long each speech will last.
            </p>
          </div>

          <form onSubmit={handleJoin} className="ss-form">
            <div className="ss-field">
              <div className="ss-input-wrap">
                <Icon icon="bx:user" className="ss-input-icon" />
                <input
                  id="playerName"
                  className="ss-input ss-input--icon"
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error ? <div className="ss-error">{error}</div> : null}

            <button type="submit" className="join-button" disabled={loading}>
              {loading ? "Checking..." : "Join"}
            </button>
          </form>

          {showOverwritePrompt && pendingJoin ? (
            <div className="ss-overwrite-modal">
              <div className="ss-overwrite-box">
                <h3 className="ss-overwrite-title">Name already used</h3>
                <p className="ss-overwrite-text">
                  A prediction already exists for "{pendingJoin.name}". Do you
                  want to overwrite it?
                </p>

                <div className="ss-overwrite-actions">
                  <button
                    type="button"
                    className="host-button"
                    onClick={handleCancelOverwrite}
                  >
                    No
                  </button>

                  <button
                    type="button"
                    className="join-button"
                    onClick={handleConfirmOverwrite}
                  >
                    Yes, overwrite
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
