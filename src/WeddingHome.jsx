import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import weddingCardImage from "./assets/ss-hero-photo.jpg";
import { Icon } from "@iconify/react";

const LS_SPEECH_STAKES_VISITOR_ID_KEY = "speechstakes_visitor_id_v1";

function createAnonymousVisitorId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `ss_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateSpeechStakesVisitorId() {
  try {
    const existingId = localStorage.getItem(LS_SPEECH_STAKES_VISITOR_ID_KEY);

    if (existingId) {
      return existingId;
    }

    const newId = createAnonymousVisitorId();
    localStorage.setItem(LS_SPEECH_STAKES_VISITOR_ID_KEY, newId);
    return newId;
  } catch {
    return createAnonymousVisitorId();
  }
}

export default function WeddingHome() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const hasTrackedLandingVisitRef = useRef(false);

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

  useEffect(() => {
    if (hasTrackedLandingVisitRef.current) return;
    hasTrackedLandingVisitRef.current = true;

    if (!API_URL) return;

    const visitorId = getOrCreateSpeechStakesVisitorId();

    fetch(`${API_URL}/api/wedding/analytics/landing-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visitorId,
        pagePath: window.location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent || null,
      }),
    }).catch((err) => {
      console.error("Landing page visit tracking failed:", err);
    });
  }, [API_URL]);

  return (
    <div className="home-page">
      <section className="home-hero" id="top">
        <div className="home-hero-inner">
          <h1 className="home-hero-title">
            The wedding speech game your guests will <em>love</em>.
          </h1>

          <p className="home-hero-subtitle">
            Guests predict how long each speech will last. The closest guess
            wins.
          </p>

          <div className="home-hero-actions">
            <button
              type="button"
              className="ss-btn home-btn home-btn-primary home-btn-lg home-btn-full"
              onClick={handleCreate}
              disabled={loading}
            >
              Get Started
            </button>
          </div>

          <div className="home-mobile-demo-wrap">
            <div className="home-mobile-demo-card">
              <img
                src={weddingCardImage}
                alt="Preview of the Speech Stakes game card"
                className="home-mobile-demo-image"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="home-proof-strip">
        <div className="home-proof-inner">
          <div className="home-section-kicker">Why guests love it</div>

          <div className="home-proof-grid">
            <div className="home-proof-card">
              <div className="home-proof-icon-wrap">
                <Icon
                  icon="solar:users-group-rounded-bold"
                  className="home-proof-icon"
                />
              </div>
              <div className="home-proof-content">
                <span className="home-proof-number">
                  Gets everyone involved
                </span>
                <span className="home-proof-label">
                  Creates a fun shared moment
                </span>
              </div>
            </div>

            <div className="home-proof-card">
              <div className="home-proof-icon-wrap">
                <Icon icon="solar:bolt-bold" className="home-proof-icon" />
              </div>
              <div className="home-proof-content">
                <span className="home-proof-number">Quick to play</span>
                <span className="home-proof-label">
                  Takes seconds to join and make a guess
                </span>
              </div>
            </div>

            <div className="home-proof-card">
              <div className="home-proof-icon-wrap">
                <Icon icon="solar:star-bold" className="home-proof-icon" />
              </div>
              <div className="home-proof-content">
                <span className="home-proof-number">Unforgettable</span>
                <span className="home-proof-label">
                  Turns speeches into a highlight
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="home-section home-section-alt" id="how-it-works">
        <div className="home-section-inner">
          <div className="home-section-kicker">How it works</div>

          <div className="home-steps">
            <div className="home-step-card">
              <div className="home-step-left">
                <div className="home-step-number">01</div>
                <div className="home-step-icon-wrap">
                  <Icon icon="solar:settings-bold" className="home-step-icon" />
                </div>
              </div>

              <div className="home-step-main">
                <h3 className="home-step-title">Set up</h3>
                <p className="home-step-text">
                  Add your speakers and their roles so everything is ready to go
                  before the big day.
                </p>
              </div>
            </div>

            <div className="home-step-card">
              <div className="home-step-left">
                <div className="home-step-number">02</div>
                <div className="home-step-icon-wrap">
                  <Icon icon="solar:qr-code-bold" className="home-step-icon" />
                </div>
              </div>

              <div className="home-step-main">
                <h3 className="home-step-title">Share</h3>
                <p className="home-step-text">
                  Share your event code with guests, or print easy QR codes so
                  people can join quickly at the wedding.
                </p>
              </div>
            </div>

            <div className="home-step-card">
              <div className="home-step-left">
                <div className="home-step-number">03</div>
                <div className="home-step-icon-wrap">
                  <Icon
                    icon="solar:stopwatch-bold"
                    className="home-step-icon"
                  />
                </div>
              </div>

              <div className="home-step-main">
                <h3 className="home-step-title">Make predictions</h3>
                <p className="home-step-text">
                  Guests join on their phones and predict how long each speech
                  will last.
                </p>
              </div>
            </div>

            <div className="home-step-card">
              <div className="home-step-left">
                <div className="home-step-number">04</div>
                <div className="home-step-icon-wrap">
                  <Icon icon="solar:cup-star-bold" className="home-step-icon" />
                </div>
              </div>

              <div className="home-step-main">
                <h3 className="home-step-title">Reveal results</h3>
                <p className="home-step-text">
                  Record each actual speech time and reveal the leaderboard
                  instantly, with optional prizes for the winners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section-why" id="why-hosts-love-it">
        <div className="home-section-inner home-section-inner-narrow">
          <div className="home-section-kicker">Why couples love it</div>
          <h2 className="home-section-title">
            A simple way to add more fun to your day
          </h2>
          <p className="home-section-text home-section-text-large">
            Speech Stakes adds a fun, interactive layer to one of the biggest
            parts of your wedding day. It is easy to set up, simple for guests
            to join, and creates a shared moment that sparks conversation and
            energises the room without taking away from the speeches themselves.
          </p>
        </div>
      </section>

      <section className="home-section home-section-alt" id="perfect-for">
        <div className="home-section-inner">
          <div className="home-section-kicker">Perfect for</div>
          <h2 className="home-section-title">
            Weddings that want a fun, modern guest experience
          </h2>

          <div className="home-usecases">
            <div className="home-usecase-card">
              <h3 className="home-usecase-title">Couples</h3>
              <p className="home-usecase-text">
                Add something interactive to your day that feels fresh, easy,
                and genuinely enjoyable for guests.
              </p>
            </div>

            <div className="home-usecase-card">
              <h3 className="home-usecase-title">Bridal party</h3>
              <p className="home-usecase-text">
                Set up a fun extra for the speeches that surprises the room and
                gives guests something to talk about.
              </p>
            </div>

            <div className="home-usecase-card">
              <h3 className="home-usecase-title">Planners &amp; venues</h3>
              <p className="home-usecase-text">
                Offer couples a polished interactive touch that adds energy to
                the day without adding complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-final-cta" id="pricing">
        <div className="home-final-cta-inner">
          <h2 className="home-final-cta-title">
            Create a moment your guests will remember
          </h2>

          <p className="home-final-cta-text">
            Set up your event in minutes, and create a fun live experience that
            brings the whole room together.
          </p>

          <div className="home-final-cta-actions">
            <div className="home-final-cta-price">
              <span className="home-final-cta-price-label">
                Everything you need for one event
              </span>
              <span className="home-final-cta-price-value">€24.99</span>
            </div>

            <button
              type="button"
              className="ss-btn home-btn home-btn-white home-btn-lg home-final-cta-button"
              onClick={handleCreate}
              disabled={loading}
            >
              Get started
            </button>
          </div>
        </div>
      </section>

      <section className="home-guest-join-section">
        <div className="home-guest-join-inner">
          <div className="home-guest-join-card">
            <div className="home-join-header">
              <h2 className="home-join-title">Already at a wedding?</h2>
              <p className="home-join-subtitle">
                Join the game and make your guess
              </p>
            </div>

            <form onSubmit={handleJoin} className="home-form">
              <div
                className={`home-join-form-wrap ${showJoinForm ? "is-open" : ""}`}
              >
                <div className="home-join-form-inner">
                  <div className="home-form-field">
                    <input
                      id="joinCode"
                      className="home-input home-code-input"
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

                  <div className="home-form-field">
                    <input
                      id="playerName"
                      className="home-input"
                      type="text"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {error ? (
                    <div className="home-form-error">{error}</div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className={`ss-btn home-btn home-btn-full home-btn-form home-join-toggle-btn ${
                  showJoinForm ? "home-btn-dark" : "home-btn-secondary-soft"
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

      <footer className="home-site-footer">
        <div className="home-site-footer-inner">
          <div className="home-site-footer-links">
            <a href="/contact" className="home-site-footer-link">
              Contact
            </a>
            <a href="/legal" className="home-site-footer-link">
              Legal
            </a>
            <a
              href="/weddinghostlogin"
              className="home-site-footer-link"
              onClick={handleAccountClick}
            >
              Account
            </a>
          </div>

          <div className="home-site-footer-copy">
            Speech Stakes 2026, All Rights Reserved
          </div>
        </div>
      </footer>

      {showOverwritePrompt && pendingJoin ? (
        <div className="home-modal-overlay">
          <div className="home-modal-box">
            <h3 className="home-modal-title">Name already used</h3>
            <p className="home-modal-text">
              A prediction already exists for "{pendingJoin.name}". Would you
              like to overwrite it?
            </p>
            <div className="home-modal-actions">
              <button
                type="button"
                className="ss-btn ss-btn-ghost"
                onClick={handleCancelOverwrite}
              >
                Keep existing
              </button>
              <button
                type="button"
                className="ss-btn home-btn home-btn-primary"
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
