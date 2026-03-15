import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
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
        code,
      )}&name=${encodeURIComponent(name)}`,
    );
  }

  function handleCreate() {
    setError("");
    navigate("/weddinghostlogin");
  }

  return (
    <div className="home-container">
      <div className="screen wedding-home ss-editorial">
        <div className="ss-card">
          <div className="ss-header">
            {/* <div className="ss-ornament" aria-hidden="true">
              <span className="ss-dot" />
              <span className="ss-line" />
              <span className="ss-dot" />
            </div> */}

            <h1 className="ss-title">Speech Stakes</h1>
            <p className="ss-subtitle">
              Predict how long each speech will last.
            </p>
          </div>

          <form onSubmit={handleJoin} className="ss-form">
            <div className="ss-field">
              <div className="ss-input-wrap">
                <Icon icon="tabler:dice" className="ss-input-icon" />
                <input
                  id="joinCode"
                  className="ss-input ss-input--icon ss-code"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Enter event code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onBlur={() => setJoinCode(cleanedJoinCode)}
                />
              </div>
            </div>

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
                />
              </div>
            </div>

            {error ? <div className="ss-error">{error}</div> : null}

            <button type="submit" className="ss-btn ss-btn--primary">
              Join
            </button>

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
    </div>
  );
}
