import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./WeddingApp.css";

const LS_PLAYER_ID_KEY = "wedding_player_id_v1";
const LS_PLAYER_NAME_KEY = "wedding_player_name_v1";
const LS_WEDDING_RESULTS_KEY = "wedding_last_results_v1";

function getOrCreatePlayerId() {
  const existing = localStorage.getItem(LS_PLAYER_ID_KEY);
  if (existing) return existing;

  const newId =
    (typeof crypto !== "undefined" &&
      crypto.randomUUID &&
      crypto.randomUUID()) ||
    `pid_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(LS_PLAYER_ID_KEY, newId);
  return newId;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export default function WeddingPredictionSelection() {
  const navigate = useNavigate();
  const query = useQuery();

  const codeFromUrl = (query.get("code") || "").toUpperCase();
  const nameFromUrl = query.get("name") || "";

  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState(nameFromUrl);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [predictions, setPredictions] = useState({});

  useEffect(() => {
    const id = getOrCreatePlayerId();
    setPlayerId(id);

    const existingName = localStorage.getItem(LS_PLAYER_NAME_KEY);
    const finalName = (existingName || nameFromUrl || "").trim();

    if (finalName) {
      localStorage.setItem(LS_PLAYER_NAME_KEY, finalName);
      setPlayerName(finalName);
    }
  }, [nameFromUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      if (!codeFromUrl) {
        setError("Missing join code.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/wedding/events/${codeFromUrl}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load event.");
        }

        if (cancelled) return;

        const eventData = data.event;

        const mappedEvent = {
          joinCode: eventData.join_code,
          coupleNames:
            eventData.bride_name && eventData.groom_name
              ? `${eventData.bride_name} & ${eventData.groom_name}`
              : eventData.event_name,
          status: eventData.status,
          speakers: (eventData.speakers || []).map((s) => ({
            speakerId: s.speaker_id,
            role: s.speaker_role,
            personName: s.speaker_name,
          })),
        };

        if (mappedEvent.status === "completed") {
          localStorage.setItem(
            LS_WEDDING_RESULTS_KEY,
            JSON.stringify({
              joinCode: mappedEvent.joinCode,
              playerId: getOrCreatePlayerId(),
              playerName: (
                localStorage.getItem(LS_PLAYER_NAME_KEY) ||
                nameFromUrl ||
                ""
              ).trim(),
            })
          );

          navigate(
            `/weddingresults?code=${encodeURIComponent(mappedEvent.joinCode)}`
          );
          return;
        }

        setEvent(mappedEvent);

        const initial = {};
        mappedEvent.speakers.forEach((s) => {
          initial[s.speakerId] = { minutes: 0, seconds: 0 };
        });
        setPredictions(initial);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load event.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [codeFromUrl, nameFromUrl, navigate]);

  function updatePrediction(speakerId, field, value) {
    setPredictions((prev) => {
      const curr = prev[speakerId] || { minutes: 0, seconds: 0 };
      const next = { ...curr };

      if (field === "minutes") next.minutes = clamp(value, 0, 59);
      if (field === "seconds") next.seconds = clamp(value, 0, 59);

      return { ...prev, [speakerId]: next };
    });
  }

  async function handleSubmit() {
    setError("");

    const trimmedName = (playerName || "").trim();

    if (!trimmedName) {
      setError("Missing player name. Please re-join the event.");
      return;
    }

    if (!event) return;

    try {
      setSubmitting(true);

      const rows = event.speakers.map((s) => {
        const p = predictions[s.speakerId] || { minutes: 0, seconds: 0 };
        const totalSeconds =
          clamp(p.minutes, 0, 59) * 60 + clamp(p.seconds, 0, 59);

        return {
          speakerId: s.speakerId,
          predictedSeconds: totalSeconds,
        };
      });

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/predictions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            joinCode: event.joinCode,
            playerId,
            playerName: trimmedName,
            predictions: rows,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit predictions.");
      }

      localStorage.setItem(
        LS_WEDDING_RESULTS_KEY,
        JSON.stringify({
          joinCode: event.joinCode,
          playerId,
          playerName: trimmedName,
        })
      );

      navigate(`/weddingresults?code=${encodeURIComponent(event.joinCode)}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to submit predictions.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card">
          <div className="ss-header">
            <div className="ss-ornament" aria-hidden="true">
              <span className="ss-dot" />
              <span className="ss-line" />
              <span className="ss-dot" />
            </div>
            <h1 className="ss-title">Speechstakes</h1>
            <p className="ss-subtitle">Loading event…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card">
          <div className="ss-header">
            <h1 className="ss-title">Speechstakes</h1>
            <p className="ss-subtitle">Event unavailable</p>
          </div>
          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  const coupleParts = event.coupleNames.split("&").map((x) => x.trim());
  const brideName = coupleParts[0] || event.coupleNames;
  const groomName = coupleParts[1] || "";

  return (
    <div className="screen ss-editorial wedding-predictions">
      <div className="ss-card ss-card--wide">
        <div className="ss-header ss-wedding-header">
          <div className="ss-ornament" aria-hidden="true">
            <span className="ss-dot" />
            <span className="ss-line" />
            <span className="ss-dot" />
          </div>

          <div className="ss-wedding-titleblock">
            <div className="ss-wedding-overline">The Wedding of</div>

            <div className="ss-wedding-names">
              <span className="ss-wedding-name">{brideName}</span>
              {groomName ? <span className="ss-wedding-amp">&amp;</span> : null}
              {groomName ? (
                <span className="ss-wedding-name">{groomName}</span>
              ) : null}
            </div>

            <div className="ss-wedding-underline" aria-hidden="true" />
          </div>

          <p className="ss-subtitle ss-subtitle--tight">
            Enter your predictions for each speech (mm:ss).
          </p>
        </div>

        <div className="ss-list">
          {event.speakers.map((s) => {
            const p = predictions[s.speakerId] || { minutes: 0, seconds: 0 };
            const mm = clamp(p.minutes, 0, 59);
            const ss = clamp(p.seconds, 0, 59);

            return (
              <div className="ss-row" key={s.speakerId}>
                <div className="ss-row__left">
                  <div className="ss-row__role">{s.role}</div>

                  <div className="ss-row__person">
                    <span className="ss-row__person-pill" aria-hidden="true" />
                    <span className="ss-row__person-name">{s.personName}</span>
                  </div>
                </div>

                <div className="ss-time">
                  <div className="ss-time__group">
                    <label className="ss-time__label">Min</label>
                    <select
                      className="ss-select"
                      value={mm}
                      onChange={(e) =>
                        updatePrediction(s.speakerId, "minutes", e.target.value)
                      }
                    >
                      {Array.from({ length: 60 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ss-time__colon">:</div>

                  <div className="ss-time__group">
                    <label className="ss-time__label">Sec</label>
                    <select
                      className="ss-select"
                      value={ss}
                      onChange={(e) =>
                        updatePrediction(s.speakerId, "seconds", e.target.value)
                      }
                    >
                      {Array.from({ length: 60 }).map((_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error ? <div className="ss-error">{error}</div> : null}

        <button
          className="ss-btn ss-btn--primary ss-submit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit predictions"}
        </button>

        <div className="ss-footer ss-footer--muted">
          <div className="ss-footnote">
            Join code: <strong>{event.joinCode}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
