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

  const codeFromUrl = (query.get("code") || "").trim().toUpperCase();
  const nameFromUrl = (query.get("name") || "").trim();
  const overwriteFromUrl = query.get("overwrite") === "1";

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

    const storedName = (localStorage.getItem(LS_PLAYER_NAME_KEY) || "").trim();

    const finalName = (nameFromUrl || storedName || "").trim();

    setPlayerName(finalName);

    if (finalName) {
      localStorage.setItem(LS_PLAYER_NAME_KEY, finalName);
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
          `${import.meta.env.VITE_BACKEND_URL}/api/wedding/events/${codeFromUrl}`,
        );

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load event.");
        }

        if (cancelled) return;

        const eventData = data.event;

        const mappedEvent = {
          joinCode: eventData.join_code,
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
                nameFromUrl ||
                localStorage.getItem(LS_PLAYER_NAME_KEY) ||
                ""
              ).trim(),
            }),
          );

          navigate(
            `/weddingresults?code=${encodeURIComponent(mappedEvent.joinCode)}`,
          );
          return;
        }

        setEvent(mappedEvent);

        const initial = {};
        mappedEvent.speakers.forEach((s) => {
          initial[s.speakerId] = { minutes: "", seconds: "" };
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
      const curr = prev[speakerId] || { minutes: "", seconds: "" };
      const next = { ...curr };

      if (field === "minutes") {
        next.minutes = value === "" ? "" : clamp(value, 0, 59);
      }

      if (field === "seconds") {
        next.seconds = value === "" ? "" : clamp(value, 0, 59);
      }

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

    const missingPrediction = event.speakers.find((s) => {
      const p = predictions[s.speakerId] || { minutes: "", seconds: "" };
      return p.minutes === "" || p.seconds === "";
    });

    if (missingPrediction) {
      setError("Please choose a minute and second value for each speech.");
      return;
    }

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
            overwrite: overwriteFromUrl,
            predictions: rows,
          }),
        },
      );

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 409 && data?.code === "NAME_ALREADY_EXISTS") {
          throw new Error(
            `A prediction already exists for "${trimmedName}". Please go back and choose overwrite, or use a different name.`,
          );
        }

        throw new Error(data?.error || "Failed to submit predictions.");
      }

      localStorage.setItem(LS_PLAYER_NAME_KEY, trimmedName);

      localStorage.setItem(
        LS_WEDDING_RESULTS_KEY,
        JSON.stringify({
          joinCode: event.joinCode,
          playerId,
          playerName: trimmedName,
        }),
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
        <div className="ss-card ss-card--wide">
          <div className="ss-header">
            <p className="ss-subtitle">Loading event...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide">
          <div className="ss-header">
            <p className="ss-subtitle">Event unavailable</p>
          </div>
          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="screen ss-editorial wedding-predictions">
      <div className="ss-card ss-card--wide ss-predictions-card">
        <div className="ss-predictions-hero">
          <div className="ss-predictions-hero__title">
            Make your predictions
          </div>

          {/* <div className="ss-meta-pills">
            <span className="ss-meta-pill">Join code: {event.joinCode}</span>
            <span className="ss-meta-pill">
              {event.speakers.length}{" "}
              {event.speakers.length === 1 ? "speech" : "speeches"}
            </span>
          </div> */}

          <p className="ss-predictions-hero__text">
            Choose a predicted time for each speaker, then tap submit when you
            are finished.
          </p>
        </div>

        <div className="ss-list ss-list--predictions">
          {event.speakers.map((s) => {
            const p = predictions[s.speakerId] || {
              minutes: "",
              seconds: "",
            };

            return (
              <div
                className="ss-prediction-card ss-prediction-card--compact"
                key={s.speakerId}
              >
                <div className="ss-prediction-card__role">{s.role}</div>

                <div className="ss-prediction-card__name">{s.personName}</div>

                <div className="ss-prediction-time">
                  <div className="ss-prediction-time__group">
                    <select
                      className="ss-select ss-select--prediction"
                      value={p.minutes}
                      onChange={(e) =>
                        updatePrediction(s.speakerId, "minutes", e.target.value)
                      }
                    >
                      <option value="">Minutes</option>
                      {Array.from({ length: 60 }).map((_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ss-prediction-time__colon">:</div>

                  <div className="ss-prediction-time__group">
                    <select
                      className="ss-select ss-select--prediction"
                      value={p.seconds}
                      onChange={(e) =>
                        updatePrediction(s.speakerId, "seconds", e.target.value)
                      }
                    >
                      <option value="">Seconds</option>
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

        <div className="ss-predictions-footer">
          <button
            className="ss-btn ss-btn--primary ss-btn--final"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit predictions"}
          </button>

          <div className="ss-footnote ss-footnote--center">
            Tap submit after you have entered a time for every speaker.
          </div>
        </div>
      </div>
    </div>
  );
}
