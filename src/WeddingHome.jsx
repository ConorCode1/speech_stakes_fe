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

  const [showJoinForm, setShowJoinForm] = useState(false);

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

  function handleJoinButtonClick() {
    if (loading) return;

    if (!showJoinForm) {
      setError("");
      setShowJoinForm(true);
      return;
    }

    handleJoin();
  }

  function handleAccountClick(e) {
    e.preventDefault();
    navigate("/weddinghostlogin");
  }

  return (
    <div className="ss-home-page">
      <section className="ss-hero" id="top">
        <div className="ss-hero-inner">
          <h1 className="ss-hero-title">
            The wedding speech game your guests will <em>love</em>.
            {/* The wedding speech game your guests will <em>love</em>. */}
          </h1>

          <p className="ss-hero-subtitle">
            Guests predict how long each speech will last. The closest guess
            wins.
          </p>

          <div className="ss-hero-actions-stack">
            <button
              type="button"
              className="ss-btn ss-btn-primary ss-btn-lg ss-btn-full"
              onClick={handleCreate}
              disabled={loading}
            >
              Get Started
            </button>
          </div>

          <div className="ss-join-block">
            <div className="ss-join-block-header">
              <h2 className="ss-join-card-title">Already at a wedding?</h2>
              <p className="ss-join-card-subtitle">
                Join the game and make your guess
              </p>
            </div>

            <form onSubmit={handleJoin} className="ss-form">
              <div
                className={`ss-join-form-wrap ${showJoinForm ? "is-open" : ""}`}
              >
                <div className="ss-join-form-inner">
                  <div className="ss-form-field">
                    <input
                      id="joinCode"
                      className="ss-form-input ss-code"
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Enter event code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      onBlur={() => setJoinCode(cleanedJoinCode)}
                      disabled={loading}
                    />
                  </div>

                  <div className="ss-form-field">
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
                </div>
              </div>

              <button
                type="button"
                className={`ss-btn ss-btn-full ss-btn-form ss-join-toggle-btn ${
                  showJoinForm ? "ss-btn-dark" : "ss-btn-secondary-soft"
                }`}
                onClick={handleJoinButtonClick}
                disabled={loading}
              >
                {loading ? "Checking..." : "Join now"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="ss-proof-strip">
        <div className="ss-proof-item">
          <span className="ss-proof-number">Gets everyone involved</span>
          <span className="ss-proof-label">Creates a fun shared moment</span>
        </div>
        <div className="ss-proof-item">
          <span className="ss-proof-number">Quick to play</span>
          <span className="ss-proof-label">
            Takes seconds to join and make a guess
          </span>
        </div>

        <div className="ss-proof-item">
          <span className="ss-proof-number">Unforgettable</span>
          <span className="ss-proof-label">
            Turns speeches into a highlight
          </span>
        </div>
      </section>

      <section className="ss-section ss-section-alt" id="how-it-works">
        <div className="ss-section-inner">
          <div className="ss-section-kicker">How it works</div>

          <div className="ss-steps">
            <div className="ss-step-card">
              <div className="ss-step-row">
                <div className="ss-step-number">01</div>
                <h3 className="ss-step-title">Set up</h3>
              </div>
              <p className="ss-step-text">
                Add your speakers and their roles so everything is ready to go
                before the big day.
              </p>
            </div>

            <div className="ss-step-card">
              <div className="ss-step-row">
                <div className="ss-step-number">02</div>
                <h3 className="ss-step-title">Share</h3>
              </div>
              <p className="ss-step-text">
                Share your event code with guests, or print easy QR codes so
                people can join quickly at the wedding.
              </p>
            </div>

            <div className="ss-step-card">
              <div className="ss-step-row">
                <div className="ss-step-number">03</div>
                <h3 className="ss-step-title">Make predictions </h3>
              </div>
              <p className="ss-step-text">
                Guests join on their phones and predict how long each speech
                will last.
              </p>
            </div>

            <div className="ss-step-card">
              <div className="ss-step-row">
                <div className="ss-step-number">04</div>
                <h3 className="ss-step-title">Reveal results</h3>
              </div>
              <p className="ss-step-text">
                Record each actual speech time and reveal the leaderboard
                instantly, with optional prizes for the winners.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-section ss-section-why" id="why-hosts-love-it">
        <div className="ss-section-inner ss-section-inner-narrow">
          <div className="ss-section-kicker">Why couples love it</div>
          <h2 className="ss-section-title">
            A simple way to add more fun to your day
          </h2>
          <p className="ss-section-text ss-section-text-large">
            Speech Stakes adds a fun, interactive layer to one of the biggest
            parts of your wedding day. It is easy to set up, simple for guests
            to join, and creates a shared moment that sparks conversation and
            energises the room without taking away from the speeches themselves.
          </p>
        </div>
      </section>

      <section className="ss-section ss-section-alt" id="perfect-for">
        <div className="ss-section-inner">
          <div className="ss-section-kicker">Perfect for</div>
          <h2 className="ss-section-title">
            Weddings that want a fun, modern guest experience
          </h2>

          <div className="ss-usecases">
            <div className="ss-usecase-card">
              <h3 className="ss-usecase-title">Couples</h3>
              <p className="ss-usecase-text">
                Add something interactive to your day that feels fresh, easy,
                and genuinely enjoyable for guests.
              </p>
            </div>

            <div className="ss-usecase-card">
              <h3 className="ss-usecase-title">
                Best men &amp; maids of honour
              </h3>
              <p className="ss-usecase-text">
                Set up a fun extra for the speeches that surprises the room and
                gives guests something to talk about.
              </p>
            </div>

            <div className="ss-usecase-card">
              <h3 className="ss-usecase-title">Planners &amp; venues</h3>
              <p className="ss-usecase-text">
                Offer couples a polished interactive touch that adds energy to
                the day without adding complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ss-final-cta">
        <div className="ss-final-cta-inner">
          <h2 className="ss-final-cta-title">
            Create a moment your guests will remember
          </h2>

          <p className="ss-final-cta-text">
            Set up your event in minutes, and create a fun live experience that
            brings the whole room together.
          </p>

          <div className="ss-final-cta-actions">
            <div className="ss-final-cta-price">
              <span className="ss-final-cta-price-label">
                Everything you need for one event
              </span>
              <span className="ss-final-cta-price-value">€24.99</span>
            </div>

            <button
              type="button"
              className="ss-btn ss-btn-white ss-btn-lg ss-final-cta-button"
              onClick={handleCreate}
              disabled={loading}
            >
              Get started
            </button>
          </div>
        </div>
      </section>
      <footer className="ss-site-footer">
        <div className="ss-site-footer-inner">
          <div className="ss-site-footer-links">
            <a href="/contact" className="ss-site-footer-link">
              Contact
            </a>
            <a href="/legal" className="ss-site-footer-link">
              Legal
            </a>
            <a
              href="/weddinghostlogin"
              className="ss-site-footer-link"
              onClick={handleAccountClick}
            >
              Account
            </a>
          </div>

          <div className="ss-site-footer-copy">
            Speech Stakes Registered 2026
          </div>
        </div>
      </footer>

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
