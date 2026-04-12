import React, { useEffect, useMemo, useState } from "react";
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

  const [manualJoinCode, setManualJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showOverwritePrompt, setShowOverwritePrompt] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(null);

  const [checkingCompletedEvent, setCheckingCompletedEvent] = useState(false);
  const [initialCodeCheckDone, setInitialCodeCheckDone] = useState(false);

  const urlJoinCode = useMemo(() => {
    return String(query.get("code") || "")
      .replace(/\s+/g, "")
      .toUpperCase()
      .trim();
  }, [query]);

  const cleanedManualJoinCode = useMemo(() => {
    return manualJoinCode.replace(/\s+/g, "").toUpperCase().trim();
  }, [manualJoinCode]);

  const effectiveJoinCode = urlJoinCode || cleanedManualJoinCode;
  const hasCodeInUrl = Boolean(urlJoinCode);

  useEffect(() => {
    let cancelled = false;

    async function checkCompletedEventFromQrCode() {
      if (!hasCodeInUrl || !urlJoinCode) {
        setInitialCodeCheckDone(true);
        return;
      }

      if (!API_URL) {
        setError("API URL is missing.");
        setInitialCodeCheckDone(true);
        return;
      }

      setCheckingCompletedEvent(true);
      setError("");

      try {
        const res = await fetch(
          `${API_URL}/api/wedding/events/${encodeURIComponent(urlJoinCode)}`,
        );

        let data = null;

        try {
          data = await res.json();
        } catch {
          data = null;
        }

        if (cancelled) return;

        if (!res.ok) {
          setError(data?.error || `Request failed with status ${res.status}.`);
          setInitialCodeCheckDone(true);
          return;
        }

        if (data?.event?.status === "completed") {
          navigate(`/weddingresults?code=${encodeURIComponent(urlJoinCode)}`, {
            replace: true,
          });
          return;
        }

        setInitialCodeCheckDone(true);
      } catch (err) {
        if (cancelled) return;
        console.error("Wedding join event status check failed:", err);
        setError("Unable to connect. Please try again.");
        setInitialCodeCheckDone(true);
      } finally {
        if (!cancelled) {
          setCheckingCompletedEvent(false);
        }
      }
    }

    checkCompletedEventFromQrCode();

    return () => {
      cancelled = true;
    };
  }, [API_URL, hasCodeInUrl, navigate, urlJoinCode]);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");

    const code = effectiveJoinCode;
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
        if (data?.code === "EVENT_COMPLETED") {
          navigate(`/weddingresults?code=${encodeURIComponent(code)}`);
          return;
        }

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

  if (hasCodeInUrl && !initialCodeCheckDone) {
    return (
      <div className="home-container">
        <div className="screen wedding-home ss-editorial">
          <div className="ss-card">
            <div className="ss-header">
              <h1 className="ss-title">Speech Stakes</h1>
              <p className="ss-subtitle">
                {checkingCompletedEvent
                  ? "Checking event..."
                  : "Loading event..."}
              </p>
            </div>
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
            <h1 className="ss-title">Speech Stakes</h1>
            <p className="ss-subtitle">
              Predict how long each speech will last.
            </p>
          </div>

          <form onSubmit={handleJoin} className="ss-form">
            {!hasCodeInUrl ? (
              <div className="ss-field">
                <div className="ss-input-wrap">
                  <Icon icon="bx:hash" className="ss-input-icon" />
                  <input
                    id="joinCode"
                    className="ss-input ss-input--icon"
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Enter event code"
                    value={manualJoinCode}
                    onChange={(e) => setManualJoinCode(e.target.value)}
                    onBlur={() => setManualJoinCode(cleanedManualJoinCode)}
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="ss-join-code-pill"></div>
            )}

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
