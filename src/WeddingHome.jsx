import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WeddingApp.css";

export default function WeddingHome() {
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");

  const cleanedJoinCode = useMemo(() => {
    return joinCode.replace(/\s+/g, "").toUpperCase();
  }, [joinCode]);

  function handleJoin(e) {
    e.preventDefault();
    setError("");

    const code = cleanedJoinCode.trim();
    const name = playerName.trim();

    if (!code) {
      setError("Please enter a join code.");
      return;
    }

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    navigate(
      `/weddingpredictionselection?code=${encodeURIComponent(
        code
      )}&name=${encodeURIComponent(name)}`
    );
  }

  function handleCreate() {
    setError("");
    navigate("/weddinghostlogin");
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

          <h1 className="ss-title">Speechstakes</h1>
          <p className="ss-subtitle">Predict how long each speech will last.</p>
        </div>

        <form onSubmit={handleJoin} className="ss-form">
          <div className="ss-field">
            <label className="ss-label" htmlFor="joinCode">
              Event Code
            </label>
            <input
              id="joinCode"
              className="ss-input ss-code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. 7K4"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onBlur={() => setJoinCode(cleanedJoinCode)}
            />
          </div>

          <div className="ss-field">
            <label className="ss-label" htmlFor="playerName">
              Your name
            </label>
            <input
              id="playerName"
              className="ss-input"
              type="text"
              placeholder="e.g. Marie Smith"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          {error ? <div className="ss-error">{error}</div> : null}

          <button type="submit" className="ss-btn ss-btn--primary">
            Join
          </button>

          <div className="ss-divider" aria-hidden="true">
            <span className="ss-divider-line" />
            <span className="ss-divider-text">Hosting?</span>
            <span className="ss-divider-line" />
          </div>

          <button
            type="button"
            className="ss-btn ss-btn--secondary"
            onClick={handleCreate}
          >
            Host game
          </button>
        </form>
      </div>
    </div>
  );
}
