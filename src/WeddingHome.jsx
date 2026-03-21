import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function WeddingHome() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null);

  const cleanedJoinCode = useMemo(() => {
    return joinCode.replace(/\s+/g, "").toUpperCase();
  }, [joinCode]);

  async function handleJoin(e) {
    if (e) e.preventDefault();
    setError("");

    const code = cleanedJoinCode.trim();
    const name = playerName.trim();

    if (!code) {
      setError("Please enter your event code.");
      return;
    }

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (!API_URL) {
      navigate(
        `/weddingpredictionselection?code=${encodeURIComponent(
          code,
        )}&name=${encodeURIComponent(name)}`,
      );
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
        setError(data?.error || `Request failed (${res.status}).`);
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
      console.error("Wedding check-name request failed:", err);
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setError("");
    navigate("/weddinghostlogin");
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
    <div className="ss-home-page">
      <section className="ss-hero">
        <div className="ss-hero-inner">
          <h1 className="ss-hero-title">
            Turn every speech into <em>a moment</em> to remember.
          </h1>

          <p className="ss-hero-subtitle">
            Guests predict how long each speech will run. Closest guess wins. No
            app, no fuss — just a fun live game that fits naturally around the
            speeches.
          </p>

          <div className="ss-hero-actions-stack">
            <button
              type="button"
              className="ss-btn ss-btn-primary ss-btn-lg ss-btn-full"
              onClick={handleCreate}
              disabled={loading}
            >
              Create your event
            </button>
          </div>

          <div className="ss-join-block">
            <div className="ss-join-block-header">
              <div className="ss-join-card-badge">
                <span className="ss-badge-dot" />
                Live event
              </div>
              <h2 className="ss-join-card-title">Join with your event code</h2>
              <p className="ss-join-card-subtitle">
                Already at a wedding? Enter your code and name to play.
              </p>
            </div>

            <form onSubmit={handleJoin} className="ss-form">
              <div className="ss-form-field">
                <label className="ss-form-label" htmlFor="joinCode">
                  Event code
                </label>
                <input
                  id="joinCode"
                  className="ss-form-input ss-code"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="e.g. SMITH24"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onBlur={() => setJoinCode(cleanedJoinCode)}
                  disabled={loading}
                />
              </div>

              <div className="ss-form-field">
                <label className="ss-form-label" htmlFor="playerName">
                  Your name
                </label>
                <input
                  id="playerName"
                  className="ss-form-input"
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error ? <div className="ss-form-error">{error}</div> : null}

              <button
                type="submit"
                className="ss-btn ss-btn-gold ss-btn-full ss-btn-form"
                disabled={loading}
              >
                {loading ? "Checking..." : "Join event"}
              </button>
            </form>
          </div>

          <div className="ss-hero-pills">
            <div className="ss-hero-pill">
              <span className="ss-pill-dot" />
              <span>No download required for guests</span>
            </div>
            <div className="ss-hero-pill">
              <span className="ss-pill-dot" />
              <span>Join in seconds with an event code</span>
            </div>
            <div className="ss-hero-pill">
              <span className="ss-pill-dot" />
              <span>Results reveal live during the reception</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-proof-strip">
        <div className="ss-proof-item">
          <span className="ss-proof-number">Fast</span>
          <span className="ss-proof-label">
            Guests join in under 30 seconds
          </span>
        </div>
        <div className="ss-proof-item">
          <span className="ss-proof-number">Simple</span>
          <span className="ss-proof-label">Zero downloads or sign-ups</span>
        </div>
        <div className="ss-proof-item">
          <span className="ss-proof-number">Memorable</span>
          <span className="ss-proof-label">
            A moment guests talk about after
          </span>
        </div>
      </section>

      <section className="ss-section">
        <div className="ss-section-inner">
          <div className="ss-section-kicker">Why hosts love it</div>
          <h2 className="ss-section-title">
            The perfect light-touch interactive moment
          </h2>
          <p className="ss-section-text">
            Speech Stakes gives you a playful way to involve every guest before
            and during the speeches — without adding any logistics to your day.
          </p>

          <div className="ss-feature-grid">
            <div className="ss-feature-card">
              <div className="ss-feature-icon">📱</div>
              <h3 className="ss-feature-title">Easy for everyone</h3>
              <p className="ss-feature-text">
                Guests enter a code, add their name, and submit predictions from
                their phone in seconds.
              </p>
            </div>

            <div className="ss-feature-card">
              <div className="ss-feature-icon">✨</div>
              <h3 className="ss-feature-title">Adds real energy</h3>
              <p className="ss-feature-text">
                Creates a gentle buzz before the speeches and gives you a fun
                result to reveal afterwards.
              </p>
            </div>

            <div className="ss-feature-card">
              <div className="ss-feature-icon">🏆</div>
              <h3 className="ss-feature-title">Feels premium</h3>
              <p className="ss-feature-text">
                A polished experience that feels more special than a paper
                sweepstake or ad hoc game.
              </p>
            </div>

            <div className="ss-feature-card">
              <div className="ss-feature-icon">🕐</div>
              <h3 className="ss-feature-title">Built for speeches</h3>
              <p className="ss-feature-text">
                Designed specifically for wedding speech timings, live reveals,
                and real-time scoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-section ss-section-alt">
        <div className="ss-section-inner">
          <div className="ss-section-kicker">How it works</div>
          <h2 className="ss-section-title">Up and running in minutes</h2>

          <div className="ss-steps">
            <div className="ss-step-card">
              <div className="ss-step-number">01</div>
              <h3 className="ss-step-title">Create your event</h3>
              <p className="ss-step-text">
                Set up your wedding event in under two minutes and get a unique
                join code to share with guests.
              </p>
            </div>

            <div className="ss-step-card">
              <div className="ss-step-number">02</div>
              <h3 className="ss-step-title">Guests make their predictions</h3>
              <p className="ss-step-text">
                Before each speech, guests open their phones, enter the code,
                and predict how long the speech will last.
              </p>
            </div>

            <div className="ss-step-card">
              <div className="ss-step-number">03</div>
              <h3 className="ss-step-title">Reveal the result live</h3>
              <p className="ss-step-text">
                Record the actual time when the speech ends and instantly see
                who called it closest.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-section">
        <div className="ss-section-inner">
          <div className="ss-section-kicker">Perfect for</div>
          <h2 className="ss-section-title">
            Weddings that want something interactive but tasteful
          </h2>

          <div className="ss-usecases">
            <div className="ss-usecase-card">
              <span className="ss-usecase-icon">💍</span>
              <h3 className="ss-usecase-title">Couples</h3>
              <p className="ss-usecase-text">
                Add a modern interactive touch to your reception without adding
                hassle or taking attention away from what matters.
              </p>
            </div>

            <div className="ss-usecase-card">
              <span className="ss-usecase-icon">🥂</span>
              <h3 className="ss-usecase-title">
                Best men &amp; maids of honour
              </h3>
              <p className="ss-usecase-text">
                A brilliant surprise extra to set up yourself — it makes the
                speeches more fun for every guest in the room.
              </p>
            </div>

            <div className="ss-usecase-card">
              <span className="ss-usecase-icon">📋</span>
              <h3 className="ss-usecase-title">Planners &amp; venues</h3>
              <p className="ss-usecase-text">
                Offer clients a fresh, polished guest experience that feels
                genuinely considered.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-final-cta">
        <div className="ss-final-cta-inner">
          <div className="ss-section-kicker ss-section-kicker-light">
            Ready to host?
          </div>
          <h2 className="ss-final-cta-title">
            Make your wedding speeches more memorable
          </h2>
          <p className="ss-final-cta-text">
            Set up your event, share the code, and turn speech timings into a
            live moment your guests will actually talk about.
          </p>
          <button
            type="button"
            className="ss-btn ss-btn-gold ss-btn-lg"
            onClick={handleCreate}
            disabled={loading}
          >
            Host your event
          </button>
        </div>
      </section>

      {showOverwritePrompt && pendingJoin ? (
        <div className="ss-modal-overlay">
          <div className="ss-modal-box">
            <h3 className="ss-modal-title">Name already used</h3>
            <p className="ss-modal-text">
              A prediction already exists for "{pendingJoin.name}". Would you
              like to overwrite it?
            </p>
            <div className="ss-modal-actions">
              <button
                type="button"
                className="ss-btn ss-btn-ghost"
                onClick={handleCancelOverwrite}
              >
                Keep existing
              </button>
              <button
                type="button"
                className="ss-btn ss-btn-primary"
                onClick={handleConfirmOverwrite}
              >
                Yes, overwrite
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
