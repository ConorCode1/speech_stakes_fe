import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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

  useEffect(() => {
    if (!joinCode) return;

    localStorage.setItem(
      LS_WEDDING_RESULTS_KEY,
      JSON.stringify({
        joinCode,
        updatedAt: Date.now(),
      })
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
          `${import.meta.env.VITE_BACKEND_URL}/api/wedding/results/${joinCode}`
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
          }
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

  const currentRows =
    selectedFilter === "overall"
      ? leaderboards.overall || []
      : leaderboards.bySpeaker?.[selectedFilter] || [];

  const currentSpeaker =
    selectedFilter === "overall"
      ? null
      : eventData?.speakers?.find((s) => s.speakerId === selectedFilter) ||
        null;

  if (loading) {
    return (
      <div className="screen ss-editorial wedding-predictions">
        <div className="ss-card ss-card--wide">
          <div className="ss-header">
            <h1 className="ss-title">Speechstakes</h1>
            <p className="ss-subtitle">Loading results…</p>
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
            <h1 className="ss-title">Speechstakes</h1>
            <p className="ss-subtitle">Results unavailable</p>
          </div>
          {error ? <div className="ss-error">{error}</div> : null}
        </div>
      </div>
    );
  }

  const coupleNames =
    eventData.brideName && eventData.groomName
      ? `${eventData.brideName} & ${eventData.groomName}`
      : eventData.eventName;

  const coupleParts = coupleNames.split("&").map((x) => x.trim());
  const brideName = coupleParts[0] || coupleNames;
  const groomName = coupleParts[1] || "";

  if (!leaderboardReady) {
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
                {groomName ? (
                  <span className="ss-wedding-amp">&amp;</span>
                ) : null}
                {groomName ? (
                  <span className="ss-wedding-name">{groomName}</span>
                ) : null}
              </div>
              <div className="ss-wedding-underline" aria-hidden="true" />
            </div>

            <p className="ss-subtitle ss-subtitle--tight">
              Waiting for results to be tallied…
            </p>
          </div>

          <div className="ss-footer ss-footer--muted">
            <div className="ss-footnote">
              Join code: <strong>{eventData.joinCode}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="ss-wedding-overline">Results</div>
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
            {selectedFilter === "overall"
              ? "Overall leaderboard"
              : `${currentSpeaker?.speakerRole || "Speaker"} leaderboard`}
          </p>
        </div>

        <div className="ss-field" style={{ marginBottom: 20 }}>
          <label className="ss-label">View leaderboard</label>
          <select
            className="ss-select ss-select--full"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
          >
            <option value="overall">Overall</option>
            {(eventData.speakers || []).map((speaker) => (
              <option key={speaker.speakerId} value={speaker.speakerId}>
                {speaker.speakerRole} — {speaker.speakerName}
              </option>
            ))}
          </select>
        </div>

        <div className="ss-list">
          {currentRows.map((row) => (
            <div className="ss-row" key={row.playerId}>
              <div className="ss-row__left">
                <div className="ss-row__role">#{row.rank}</div>
                <div className="ss-row__person">
                  <span className="ss-row__person-pill" aria-hidden="true" />
                  <span className="ss-row__person-name">{row.playerName}</span>
                </div>
              </div>

              <div className="ss-row__right">
                <div className="ss-row__role">
                  {selectedFilter === "overall"
                    ? formatSeconds(row.totalDifference)
                    : formatSeconds(row.difference)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error ? <div className="ss-error">{error}</div> : null}

        <div className="ss-footer ss-footer--muted">
          <div className="ss-footnote">
            Join code: <strong>{eventData.joinCode}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
