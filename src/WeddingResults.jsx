import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import confetti from "canvas-confetti";
import "./WeddingApp.css";

const LS_WEDDING_RESULTS_KEY = "wedding_last_results_v1";

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

export default function WeddingResults() {
  const query = useQuery();

  const stored = safeJsonParse(localStorage.getItem(LS_WEDDING_RESULTS_KEY));
  const codeFromUrl = (query.get("code") || "").trim().toUpperCase();
  const joinCode = codeFromUrl || stored?.joinCode || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState(null);
  const [leaderboardReady, setLeaderboardReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState({
    overall: [],
    bySpeaker: {},
  });
  const [selectedFilter, setSelectedFilter] = useState("overall");
  const [hasShownConfetti, setHasShownConfetti] = useState(false);

  useEffect(() => {
    if (!joinCode) return;

    localStorage.setItem(
      LS_WEDDING_RESULTS_KEY,
      JSON.stringify({
        joinCode,
        updatedAt: Date.now(),
      }),
    );
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
          `${import.meta.env.VITE_BACKEND_URL}/api/wedding/results/${joinCode}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load results.");
        }

        if (cancelled) return;

        setEventData(data.event);
        setLeaderboardReady(Boolean(data.leaderboardReady));
        setLeaderboards(
          data.leaderboards || {
            overall: [],
            bySpeaker: {},
          },
        );
        setError("");
        setLoading(false);

        if (!data.leaderboardReady) {
          timeoutId = setTimeout(loadResults, 5000);
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err.message || "Failed to load results.");
        setLoading(false);
      }
    }

    loadResults();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [joinCode]);

  useEffect(() => {
    const shouldCelebrate =
      leaderboardReady &&
      selectedFilter === "overall" &&
      (leaderboards.overall || []).length > 0 &&
      !hasShownConfetti;

    if (!shouldCelebrate) return;

    setHasShownConfetti(true);

    const canvas = document.getElementById("ss-confetti-canvas");
    if (!canvas) return;

    const myConfetti = confetti.create(canvas, { resize: true });
    const duration = 2500;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      myConfetti({
        startVelocity: 28,
        spread: 360,
        ticks: 60,
        particleCount: 70,
        origin: {
          x: Math.random(),
          y: Math.random() - 0.15,
        },
      });
    }, 250);

    return () => clearInterval(interval);
  }, [leaderboardReady, selectedFilter, leaderboards, hasShownConfetti]);

  const currentRows =
    selectedFilter === "overall"
      ? leaderboards.overall || []
      : leaderboards.bySpeaker?.[selectedFilter] || [];

  // const currentSpeaker =
  //   selectedFilter === "overall"
  //     ? null
  //     : eventData?.speakers?.find((s) => s.speakerId === selectedFilter) ||
  //       null;

  const metricText =
    selectedFilter === "overall"
      ? "Lower total off-by wins."
      : "Lower off-by wins.";

  const topThree = currentRows.slice(0, 3);
  const remainingRows = currentRows.slice(3);

  function getRowValue(row) {
    return selectedFilter === "overall"
      ? formatSeconds(row.totalDifference)
      : formatSeconds(row.difference);
  }

  if (loading) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide">
          <div className="ss-header">
            <h1 className="ss-title">SpeechStakes</h1>
            <p className="ss-subtitle">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide">
          <div className="ss-header">
            <h1 className="ss-title">SpeechStakes</h1>
            <p className="ss-subtitle">Results unavailable</p>
          </div>
          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  if (!leaderboardReady) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide ss-results-card">
          <div className="ss-results-hero">
            <div className="ss-wedding-overline">Results</div>
            <div className="ss-results-hero__title">
              Waiting for final times
            </div>
            <p className="ss-results-hero__text">
              The host is still entering the final speech times. This page will
              update automatically once the leaderboard is ready.
            </p>
          </div>

          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="screen ss-editorial wedding-predictions">
      <div className="ss-card ss-card--wide ss-results-card">
        <div className="ss-results-topbar">
          <div className="ss-wedding-overline">Results</div>

          <div className="ss-results-title-select">
            <select
              className="ss-results-title-select__input"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              aria-label="Select leaderboard"
            >
              <option value="overall">Overall leaderboard</option>
              {(eventData.speakers || []).map((speaker) => (
                <option key={speaker.speakerId} value={speaker.speakerId}>
                  {speaker.speakerRole} results
                </option>
              ))}
            </select>
          </div>

          <div className="ss-results-metric">{metricText}</div>
        </div>

        {currentRows.length === 0 ? (
          <div className="ss-results-empty">No results available yet.</div>
        ) : (
          <>
            {topThree.length > 0 ? (
              <div className="ss-results-podium">
                {topThree.map((row, idx) => (
                  <div
                    className={`ss-podium-card ss-podium-card--${idx + 1}`}
                    key={row.playerId}
                  >
                    <div className="ss-podium-card__rank">
                      {getMedalIcon(row.rank) || `#${row.rank}`}
                    </div>

                    <div className="ss-podium-card__main">
                      <div className="ss-podium-card__name">
                        {row.playerName}
                      </div>
                      <div className="ss-podium-card__meta">
                        {selectedFilter === "overall"
                          ? "Total off-by"
                          : "Off by"}
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
              <div className="ss-results-table">
                <div className="ss-results-table__head">
                  <div>Rank</div>
                  <div>Player</div>
                  <div>Off by</div>
                </div>

                {remainingRows.map((row) => (
                  <div className="ss-results-table__row" key={row.playerId}>
                    <div className="ss-results-table__rank">#{row.rank}</div>
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

        {error ? <div className="ss-error">{error}</div> : null}
      </div>

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
