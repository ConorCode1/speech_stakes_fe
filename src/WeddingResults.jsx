import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import confetti from "canvas-confetti";
import "./WeddingApp.css";

const SS_WEDDING_RESULTS_KEY = "wedding_last_results_v1";
const LS_WEDDING_LAST_PREDICTIONS_KEY = "wedding_last_predictions_v1";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function formatSeconds(totalSeconds) {
  const safe = Number(totalSeconds);
  if (!Number.isFinite(safe)) return "-";
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getMedalIcon(rank) {
  if (rank === 1) {
    return (
      <Icon icon="noto:1st-place-medal" className="ss-leaderboard-medal-icon" />
    );
  }
  if (rank === 2) {
    return (
      <Icon icon="noto:2nd-place-medal" className="ss-leaderboard-medal-icon" />
    );
  }
  if (rank === 3) {
    return (
      <Icon icon="noto:3rd-place-medal" className="ss-leaderboard-medal-icon" />
    );
  }
  return null;
}

function renderPredictionList(rows, emptyText = "No predictions") {
  if (!rows || rows.length === 0) {
    return <div className="ss-summary-empty">{emptyText}</div>;
  }

  return rows.map((row, index) => (
    <div
      className="ss-clean-stat-person"
      key={[
        row.playerId || "unknown-player",
        row.playerName || "unknown-name",
        row.predictedSeconds ?? "unknown-prediction",
        index,
      ].join("__")}
    >
      <div className="ss-clean-stat-person__name">{row.playerName}</div>
      <div className="ss-clean-stat-person__time">
        Predicted {formatSeconds(row.predictedSeconds)}
      </div>
    </div>
  ));
}

export default function WeddingResults() {
  const query = useQuery();

  const codeFromUrl = (query.get("code") || "").trim().toUpperCase();

  const storedSession =
    typeof window !== "undefined"
      ? safeJsonParse(localStorage.getItem(SS_WEDDING_RESULTS_KEY))
      : null;

  const savedPredictions =
    typeof window !== "undefined"
      ? safeJsonParse(localStorage.getItem(LS_WEDDING_LAST_PREDICTIONS_KEY))
      : null;

  const joinCode = codeFromUrl || storedSession?.joinCode || "";

  const matchingSavedPredictions =
    savedPredictions && savedPredictions.joinCode === joinCode
      ? savedPredictions
      : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState(null);
  const [leaderboardReady, setLeaderboardReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState({
    overall: [],
    bySpeaker: {},
  });
  const [speakerSummaries, setSpeakerSummaries] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("overall");
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!joinCode) return;

    localStorage.setItem(
      SS_WEDDING_RESULTS_KEY,
      JSON.stringify({
        joinCode,
        updatedAt: Date.now(),
      }),
    );
  }, [joinCode]);

  useEffect(() => {
    setHasShownConfetti(false);
    setSelectedFilter("overall");
    setShowStats(false);
  }, [joinCode]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    async function loadResults() {
      if (!joinCode) {
        setError("Missing join code.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_BACKEND_URL
          }/api/wedding/results/${encodeURIComponent(joinCode)}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load results.");
        }

        if (cancelled) return;

        setEventData(data.event || null);
        setLeaderboardReady(Boolean(data.leaderboardReady));
        setLeaderboards(
          data.leaderboards || {
            overall: [],
            bySpeaker: {},
          },
        );
        setSpeakerSummaries(data.speakerSummaries || []);
        setError("");
        setLoading(false);

        if (!data.leaderboardReady) {
          timeoutId = window.setTimeout(() => {
            loadResults();
          }, 5000);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load results.");
        setLoading(false);
      }
    }

    setLoading(true);
    setError("");
    setEventData(null);
    setLeaderboardReady(false);
    setLeaderboards({
      overall: [],
      bySpeaker: {},
    });
    setSpeakerSummaries([]);
    setShowStats(false);

    loadResults();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [joinCode]);

  useEffect(() => {
    if (!leaderboardReady) return;
    if (selectedFilter !== "overall") return;
    if ((leaderboards.overall || []).length === 0) return;
    if (hasShownConfetti) return;

    const timeout = window.setTimeout(() => {
      const canvas = document.getElementById("ss-confetti-canvas");
      if (!canvas) return;

      setHasShownConfetti(true);

      const myConfetti = confetti.create(canvas, { resize: true });
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          window.clearInterval(interval);
          return;
        }

        myConfetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          particleCount: 80,
          origin: {
            x: Math.random(),
            y: Math.max(0, Math.random() - 0.2),
          },
        });
      }, 250);

      window.setTimeout(() => {
        window.clearInterval(interval);
      }, duration + 500);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [
    leaderboardReady,
    selectedFilter,
    leaderboards.overall,
    hasShownConfetti,
  ]);

  const currentRows =
    selectedFilter === "overall"
      ? leaderboards.overall || []
      : leaderboards.bySpeaker?.[selectedFilter] || [];

  const metricText =
    selectedFilter === "overall"
      ? "Lowest total time difference wins."
      : "Lowest time difference wins.";

  const topThree = currentRows.slice(0, 3);
  const remainingRows = currentRows.slice(3);

  function getRowValue(row) {
    return selectedFilter === "overall"
      ? formatSeconds(row.totalDifference)
      : formatSeconds(row.difference);
  }

  function getRowKey(row, index) {
    return [
      selectedFilter,
      row.playerId || "unknown-player",
      row.rank || "no-rank",
      row.playerName || "unknown-name",
      index,
    ].join("__");
  }

  if (loading) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide ss-results-page-card">
          <div className="ss-results-page-header">
            <div className="ss-results-page-title">Results</div>
          </div>

          <div className="ss-results-panel">
            <div className="ss-results-empty">Loading results...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide ss-results-page-card">
          <div className="ss-results-page-header">
            <div className="ss-results-page-title">Results</div>
          </div>

          <div className="ss-results-panel">
            <div className="ss-results-empty">Results unavailable.</div>
          </div>

          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  if (!leaderboardReady) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide ss-results-page-card">
          <div className="ss-results-page-header">
            {/* <div className="ss-results-page-title">Results</div> */}
          </div>

          <div className="ss-results-panel">
            <div className="ss-results-panel__metric"></div>
            <div className="ss-results-empty">
              The host is still entering the final speech times. This page will
              update once the results are ready.
            </div>
          </div>

          {matchingSavedPredictions?.predictions?.length > 0 ? (
            <div className="ss-card ss-card--wide ss-waiting-predictions-card">
              <div className="ss-speaker-clean-card__header">
                <div className="ss-speaker-clean-card__title-wrap">
                  <div className="ss-speaker-clean-card__role">
                    Your predictions
                  </div>
                  {/* <div className="ss-speaker-clean-card__name">
                    {matchingSavedPredictions.playerName || "Your latest entry"}
                  </div> */}
                </div>
              </div>

              <div className="ss-list ss-list--predictions">
                {matchingSavedPredictions.predictions.map((prediction) => (
                  <div
                    className="ss-prediction-card ss-prediction-card--compact"
                    key={prediction.speakerId}
                  >
                    <div className="ss-prediction-card__role">
                      {prediction.role}
                    </div>

                    <div className="ss-prediction-card__name">
                      {prediction.personName}
                    </div>

                    <div className="ss-prediction-saved-display">
                      <div className="ss-prediction-saved-display__value">
                        <span className="ss-prediction-saved-display__number">
                          {prediction.minutes}
                        </span>
                        <span className="ss-prediction-saved-display__unit">
                          min
                        </span>

                        <span className="ss-prediction-saved-display__divider">
                          ·
                        </span>

                        <span className="ss-prediction-saved-display__number">
                          {String(prediction.seconds).padStart(2, "0")}
                        </span>
                        <span className="ss-prediction-saved-display__unit">
                          sec
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="screen ss-editorial wedding-predictions">
      <div className="ss-card ss-card--wide ss-results-page-card">
        <div className="ss-results-page-header">
          <div className="ss-results-page-title">Results</div>

          <div className="ss-results-picker-wrap">
            <select
              className="ss-results-picker"
              value={selectedFilter}
              onChange={(e) => {
                const nextValue = e.target.value;
                setSelectedFilter(nextValue);

                if (nextValue !== "overall") {
                  setHasShownConfetti(true);
                }
              }}
              aria-label="Select leaderboard"
            >
              <option value="overall">Overall leaderboard</option>
              {(eventData?.speakers || []).map((speaker) => (
                <option key={speaker.speakerId} value={speaker.speakerId}>
                  {speaker.speakerRole} leaderboard
                </option>
              ))}
            </select>

            <Icon
              icon="mdi:chevron-down"
              className="ss-results-picker__icon"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="ss-results-metric-line">{metricText}</div>

        <div className="ss-results-scroll-area">
          {currentRows.length === 0 ? (
            <div className="ss-results-empty">No results available yet.</div>
          ) : (
            <>
              {topThree.length > 0 ? (
                <div className="ss-results-podium-cards">
                  {topThree.map((row, idx) => (
                    <div
                      className={`ss-podium-card ss-podium-card--standalone ss-podium-card--${Math.min(
                        row.rank,
                        3,
                      )}`}
                      key={getRowKey(row, idx)}
                    >
                      <div className="ss-podium-card__rank">
                        {getMedalIcon(row.rank) || `#${row.rank}`}
                      </div>

                      <div className="ss-podium-card__main">
                        <div className="ss-podium-card__name">
                          {row.playerName}
                        </div>
                      </div>

                      <div className="ss-podium-card__score">
                        {getRowValue(row)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {remainingRows.length > 0 ? (
                <div className="ss-results-table ss-results-table--standalone">
                  <div className="ss-results-table__head">
                    <div>Rank</div>
                    <div>Player</div>
                    <div>Off by</div>
                  </div>

                  {remainingRows.map((row, index) => (
                    <div
                      className="ss-results-table__row"
                      key={getRowKey(row, index + 3)}
                    >
                      <div className="ss-results-table__rank">
                        {getMedalIcon(row.rank) || `#${row.rank}`}
                      </div>
                      <div className="ss-results-table__player">
                        {row.playerName}
                      </div>
                      <div className="ss-results-table__score">
                        {getRowValue(row)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
        {error ? <div className="ss-error">{error}</div> : null}

        {speakerSummaries.length > 0 ? (
          <div className="ss-results-stats-bar">
            {!showStats ? (
              <button
                type="button"
                className="ss-btn ss-btn--secondary ss-btn--with-icon ss-results-stats-toggle__btn"
                onClick={() => setShowStats(true)}
              >
                <Icon
                  icon="mdi:chart-box-outline"
                  className="ss-btn__icon-svg"
                />
                See stats
              </button>
            ) : (
              <button
                type="button"
                className="ss-btn ss-btn--ghost ss-btn--with-icon ss-results-stats-toggle__btn"
                onClick={() => setShowStats(false)}
              >
                <Icon icon="mdi:chevron-up" className="ss-btn__icon-svg" />
                Hide stats
              </button>
            )}
          </div>
        ) : null}
      </div>

      {showStats && speakerSummaries.length > 0 ? (
        <div className="ss-speaker-summary-list">
          {speakerSummaries.map((speaker) => {
            const farthestAway =
              speaker.mostUnderestimated?.length > 0
                ? speaker.mostUnderestimated
                : speaker.mostOverestimated || [];

            return (
              <div
                className="ss-card ss-card--wide ss-speaker-clean-card"
                key={speaker.speakerId}
              >
                <div className="ss-speaker-clean-card__header">
                  <div className="ss-speaker-clean-card__title-wrap">
                    <div className="ss-speaker-clean-card__role">
                      {speaker.speakerRole}
                    </div>
                    <div className="ss-speaker-clean-card__name">
                      {speaker.speakerName}
                    </div>
                  </div>
                </div>

                <div className="ss-speaker-clean-card__stats">
                  <div className="ss-speaker-clean-stat">
                    <div className="ss-speaker-clean-stat__label">
                      Actual time
                    </div>
                    <div className="ss-speaker-clean-stat__big">
                      {formatSeconds(speaker.actualSeconds)}
                    </div>
                  </div>

                  <div className="ss-speaker-clean-stat">
                    <div className="ss-speaker-clean-stat__label">
                      Average prediction
                    </div>
                    <div className="ss-speaker-clean-stat__big">
                      {formatSeconds(speaker.averagePredictionSeconds)}
                    </div>
                  </div>

                  <div className="ss-speaker-clean-stat">
                    <div className="ss-speaker-clean-stat__label">
                      Closest prediction
                    </div>
                    <div className="ss-speaker-clean-stat__content">
                      {renderPredictionList(
                        speaker.winners,
                        "No closest prediction.",
                      )}
                    </div>
                  </div>

                  <div className="ss-speaker-clean-stat">
                    <div className="ss-speaker-clean-stat__label">
                      Worst prediction
                    </div>
                    <div className="ss-speaker-clean-stat__content">
                      {renderPredictionList(farthestAway, "No standout miss.")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <canvas
        id="ss-confetti-canvas"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    </div>
  );
}
