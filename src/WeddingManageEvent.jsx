import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import "./WeddingApp.css";

const LS_WEDDING_HOST_USER_KEY = "wedding_host_user_v1";

const ROLE_OPTIONS = [
  "Bride",
  "Groom",
  "Best Man",
  "Maid of Honour",
  "Father of the Bride",
  "Mother of the Bride",
  "Father of the Groom",
  "Mother of the Groom",
  "Brother of the Bride",
  "Sister of the Bride",
  "Brother of the Groom",
  "Sister of the Groom",
  "Bridesmaid",
  "Groomsman",
  "Officiant",
  "Other",
];

const MINUTE_OPTIONS = Array.from({ length: 61 }, (_, i) => String(i));
const SECOND_OPTIONS = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function toMinutesSeconds(totalSeconds) {
  const safe = Number(totalSeconds);

  if (!Number.isFinite(safe) || safe < 0) {
    return { minutes: "", seconds: "" };
  }

  return {
    minutes: String(Math.floor(safe / 60)),
    seconds: String(safe % 60).padStart(2, "0"),
  };
}

function toTotalSeconds(minutes, seconds) {
  const mins = Number(minutes);
  const secs = Number(seconds);

  if (!Number.isFinite(mins) || mins < 0) return null;
  if (!Number.isFinite(secs) || secs < 0 || secs > 59) return null;

  return mins * 60 + secs;
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function getEventStatusLabel(status) {
  return status === "completed" ? "Completed" : "In progress";
}

function getLocalTimesKey(eventId) {
  return `wedding_manage_times_${eventId}`;
}

export default function WeddingManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [speakers, setSpeakers] = useState([]);

  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerRole, setNewSpeakerRole] = useState("Best Man");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [timerSpeaker, setTimerSpeaker] = useState(null);
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const timerStartRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const hostUser = safeJsonParse(
    localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
  );
  const hostUserId = hostUser?.userId || "";

  const isCompleted = eventData?.status === "completed";
  const canEdit = !isCompleted;

  const statusLabel = useMemo(() => {
    return getEventStatusLabel(eventData?.status);
  }, [eventData?.status]);

  const shareLink = useMemo(() => {
    if (!eventData?.join_code) return "";
    if (typeof window === "undefined") return "";

    return `${window.location.origin}/weddingjoin?code=${encodeURIComponent(
      eventData.join_code,
    )}`;
  }, [eventData?.join_code]);

  const persistLocalSpeakerTimes = useCallback(
    (nextSpeakers) => {
      if (!eventId) return;

      try {
        const payload = nextSpeakers.map((speaker) => ({
          speakerId: speaker.speaker_id,
          actualMinutes: speaker.actualMinutes ?? "",
          actualSeconds: speaker.actualSeconds ?? "",
        }));

        localStorage.setItem(
          getLocalTimesKey(eventId),
          JSON.stringify(payload),
        );
      } catch (err) {
        console.error("Failed to persist local speaker times:", err);
      }
    },
    [eventId],
  );

  const clearLocalSpeakerTimes = useCallback(() => {
    if (!eventId) return;

    try {
      localStorage.removeItem(getLocalTimesKey(eventId));
    } catch (err) {
      console.error("Failed to clear local speaker times:", err);
    }
  }, [eventId]);

  const loadEvent = useCallback(async () => {
    if (!hostUserId) {
      setError("No signed-in host found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}`,
        {
          headers: {
            "x-wedding-host-user-id": hostUserId,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load event.");
      }

      setEventData(data.event);

      const storedTimes = safeJsonParse(
        localStorage.getItem(getLocalTimesKey(eventId)),
      );

      const storedTimeMap = new Map(
        Array.isArray(storedTimes)
          ? storedTimes.map((row) => [String(row.speakerId), row])
          : [],
      );

      const hydratedSpeakers = (data.event.speakers || []).map((speaker) => {
        const fromDb = toMinutesSeconds(speaker.actual_seconds);
        const fromStorage = storedTimeMap.get(String(speaker.speaker_id));

        return {
          ...speaker,
          personName: speaker.speaker_name || "",
          role: speaker.speaker_role || "",
          actualMinutes:
            fromStorage?.actualMinutes !== undefined
              ? fromStorage.actualMinutes
              : fromDb.minutes,
          actualSeconds:
            fromStorage?.actualSeconds !== undefined
              ? fromStorage.actualSeconds
              : fromDb.seconds,
        };
      });

      setSpeakers(hydratedSpeakers);
      setShowCompleteConfirm(false);
      setShowDeleteConfirm(false);
      setError("");

      if (data.event.status === "completed") {
        clearLocalSpeakerTimes();
      } else {
        persistLocalSpeakerTimes(hydratedSpeakers);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }, [eventId, hostUserId, clearLocalSpeakerTimes, persistLocalSpeakerTimes]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (!timerRunning) return undefined;

    timerIntervalRef.current = setInterval(() => {
      const startMs = timerStartRef.current;
      if (!startMs) return;

      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setTimerElapsedSeconds(elapsed);
    }, 250);

    return () => {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    };
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!copyMessage) return undefined;

    const timeout = setTimeout(() => {
      setCopyMessage("");
    }, 2000);

    return () => clearTimeout(timeout);
  }, [copyMessage]);

  function updateSpeakers(updater) {
    setSpeakers((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistLocalSpeakerTimes(next);
      return next;
    });
  }

  function updateSpeakerLocal(speakerId, patch) {
    updateSpeakers((prev) =>
      prev.map((speaker) =>
        speaker.speaker_id === speakerId ? { ...speaker, ...patch } : speaker,
      ),
    );
  }

  async function handleAddSpeaker() {
    if (!canEdit || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}/speakers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wedding-host-user-id": hostUserId,
          },
          body: JSON.stringify({
            personName: newSpeakerName.trim(),
            role: newSpeakerRole,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add speaker.");
      }

      updateSpeakers((prev) => [
        ...prev,
        {
          ...data.speaker,
          personName: data.speaker.speaker_name,
          role: data.speaker.speaker_role,
          actualMinutes: "",
          actualSeconds: "",
        },
      ]);

      setNewSpeakerName("");
      setNewSpeakerRole("Best Man");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add speaker.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSpeaker(speakerId) {
    if (!canEdit || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/speakers/${speakerId}`,
        {
          method: "DELETE",
          headers: {
            "x-wedding-host-user-id": hostUserId,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete speaker.");
      }

      updateSpeakers((prev) =>
        prev.filter((speaker) => speaker.speaker_id !== speakerId),
      );

      if (timerSpeaker?.speaker_id === speakerId) {
        closeTimerModal();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete speaker.");
    } finally {
      setSaving(false);
    }
  }

  function handleSpeakerMinutesChange(speaker, nextMinutes) {
    updateSpeakerLocal(speaker.speaker_id, {
      actualMinutes: nextMinutes,
    });
  }

  function handleSpeakerSecondsChange(speaker, nextSeconds) {
    updateSpeakerLocal(speaker.speaker_id, {
      actualSeconds: nextSeconds,
    });
  }

  async function handleCompleteEvent() {
    if (saving || !canEdit) return;

    const invalidSpeaker = speakers.find((speaker) => {
      return (
        toTotalSeconds(speaker.actualMinutes, speaker.actualSeconds) == null
      );
    });

    if (invalidSpeaker) {
      setError(
        "Please enter a valid minute and second time for every speaker.",
      );
      setShowCompleteConfirm(false);
      return;
    }

    const speakerTimes = speakers.map((speaker) => ({
      speakerId: speaker.speaker_id,
      actualSeconds: toTotalSeconds(
        speaker.actualMinutes,
        speaker.actualSeconds,
      ),
    }));

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}/finalise`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wedding-host-user-id": hostUserId,
          },
          body: JSON.stringify({
            speakerTimes,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete event.");
      }

      clearLocalSpeakerTimes();

      setEventData((prev) => ({
        ...prev,
        status: data.event.status,
        join_code: data.event.join_code,
      }));

      setShowCompleteConfirm(false);
      closeTimerModal();
      navigate(`/weddingresults?code=${data.event.join_code}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to complete event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent() {
    if (deleting) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            "x-wedding-host-user-id": hostUserId,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event.");
      }

      clearLocalSpeakerTimes();
      closeTimerModal();

      setEventData(null);
      setSpeakers([]);
      setShowDeleteConfirm(false);
      setShowQrModal(false);

      navigate("/weddingcreateevent");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  }

  function handleGoToResults() {
    if (!eventData?.join_code) return;
    navigate(`/weddingresults?code=${eventData.join_code}`);
  }

  function openTimerModal(speaker) {
    const existingTotal = toTotalSeconds(
      speaker.actualMinutes,
      speaker.actualSeconds,
    );

    setTimerSpeaker(speaker);
    setTimerElapsedSeconds(existingTotal ?? 0);
    setTimerRunning(false);
    timerStartRef.current = null;
  }

  function closeTimerModal() {
    setTimerRunning(false);
    timerStartRef.current = null;
    setTimerSpeaker(null);
    setTimerElapsedSeconds(0);
  }

  function handleStartTimer() {
    if (timerRunning) return;

    timerStartRef.current = Date.now() - timerElapsedSeconds * 1000;
    setTimerRunning(true);
  }

  function handlePauseTimer() {
    if (!timerRunning) return;

    const startMs = timerStartRef.current;
    const elapsed = startMs
      ? Math.floor((Date.now() - startMs) / 1000)
      : timerElapsedSeconds;

    setTimerElapsedSeconds(Math.max(0, elapsed));
    setTimerRunning(false);
    timerStartRef.current = null;
  }

  function handleResetTimer() {
    setTimerRunning(false);
    timerStartRef.current = null;
    setTimerElapsedSeconds(0);
  }

  function handleSubmitTimedSpeaker() {
    if (!timerSpeaker || !canEdit) return;

    const split = toMinutesSeconds(timerElapsedSeconds);

    updateSpeakerLocal(timerSpeaker.speaker_id, {
      actualMinutes: split.minutes,
      actualSeconds: split.seconds,
    });

    closeTimerModal();
  }

  async function handleCopyShareLink() {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopyMessage("Link copied");
    } catch (err) {
      console.error(err);
      setCopyMessage("Could not copy link");
    }
  }

  async function handleNativeShare() {
    if (!shareLink || !navigator.share) return;

    try {
      await navigator.share({
        title: "Join wedding predictions",
        text: `Join the wedding predictions for code ${eventData?.join_code}`,
        url: shareLink,
      });
    } catch (err) {
      console.error(err);
    }
  }

  function handlePrintQr() {
    window.print();
  }

  if (loading) {
    return (
      <div className="screen ss-editorial wedding-create">
        <div className="ss-card ss-card--wide">
          <p className="ss-subtitle">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="screen ss-editorial wedding-create">
        <div className="ss-card ss-card--wide ss-manage-card">
          <div className="ss-manage-hero">
            <div className="ss-wedding-overline">Manage Event</div>
            <div className="ss-manage-hero__title">No event found</div>
            <div className="ss-section__hint">
              You do not currently have an event to manage.
            </div>
          </div>

          {error ? <div className="ss-error">{error}</div> : null}

          <div className="ss-manage-footer">
            <button
              type="button"
              className="ss-btn ss-btn--primary ss-btn--final"
              onClick={() => navigate("/weddingcreateevent")}
            >
              Create event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen ss-editorial wedding-create">
      <div className="ss-card ss-card--wide ss-manage-card">
        <div className="ss-manage-hero">
          <div className="ss-wedding-overline">Manage Event</div>
          <div className="ss-manage-hero__title">Manage my event</div>

          <div className="ss-meta-pills">
            <span className="ss-meta-pill">Code {eventData?.join_code}</span>
            <span className="ss-meta-pill">{statusLabel}</span>
          </div>
        </div>

        {error ? <div className="ss-error">{error}</div> : null}

        <div className="ss-panel">
          <div className="ss-section">
            <div className="ss-section__title">Share</div>
            <div className="ss-section__hint">
              Share this link or show the QR code so guests can join quickly.
            </div>
          </div>

          <div className="ss-field">
            <label className="ss-label">Guest join link</label>
            <input className="ss-input" value={shareLink} readOnly />
          </div>

          <div className="ss-actions ss-actions--stack-mobile">
            <button
              type="button"
              className="ss-btn ss-btn--secondary"
              onClick={handleCopyShareLink}
              disabled={!shareLink}
            >
              Copy link
            </button>

            {typeof navigator !== "undefined" && navigator.share ? (
              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={handleNativeShare}
                disabled={!shareLink}
              >
                Share link
              </button>
            ) : null}

            <button
              type="button"
              className="ss-btn ss-btn--ghost"
              onClick={() => setShowQrModal(true)}
              disabled={!shareLink}
            >
              Show QR code
            </button>
          </div>

          {copyMessage ? (
            <div className="ss-section__hint">{copyMessage}</div>
          ) : null}
        </div>

        {isCompleted ? (
          <div className="ss-row ss-row--stack">
            <div className="ss-section__hint">
              This event has been completed. You can still view the results, but
              speech times can no longer be changed.
            </div>
          </div>
        ) : null}

        <div className="ss-section ss-section--speakers">
          <div className="ss-section__title">Speakers</div>
          <div className="ss-section__hint">
            {isCompleted
              ? "Speech times are locked for this completed event."
              : "Times are stored on this device as you go and submitted only when you press Everyone has spoken."}
          </div>
        </div>

        <div className="ss-list ss-list--speakers">
          {speakers.map((speaker, idx) => (
            <div className="ss-speaker-card" key={speaker.speaker_id}>
              <div className="ss-speaker-card__top">
                <span className="ss-row__badge">Speaker {idx + 1}</span>

                {canEdit ? (
                  <button
                    type="button"
                    className="ss-icon-btn"
                    onClick={() => handleDeleteSpeaker(speaker.speaker_id)}
                    disabled={saving || deleting}
                    title="Remove speaker"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="ss-speaker-card__name">{speaker.personName}</div>
              <div className="ss-speaker-card__role">{speaker.role}</div>

              {!isCompleted ? (
                <div className="ss-actions">
                  <button
                    type="button"
                    className="ss-btn ss-btn--ghost ss-btn--compact"
                    onClick={() => openTimerModal(speaker)}
                    disabled={saving || deleting}
                  >
                    Use timer
                  </button>
                </div>
              ) : null}

              <div className="ss-time-entry">
                <div className="ss-time-entry__group">
                  <label className="ss-label">Min</label>
                  <select
                    className="ss-select ss-select--full ss-input--time"
                    value={speaker.actualMinutes}
                    onChange={(e) =>
                      handleSpeakerMinutesChange(speaker, e.target.value)
                    }
                    disabled={!canEdit || saving || deleting}
                  >
                    <option value="">Min</option>
                    {MINUTE_OPTIONS.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ss-time-entry__colon">:</div>

                <div className="ss-time-entry__group">
                  <label className="ss-label">Sec</label>
                  <select
                    className="ss-select ss-select--full ss-input--time"
                    value={speaker.actualSeconds}
                    onChange={(e) =>
                      handleSpeakerSecondsChange(speaker, e.target.value)
                    }
                    disabled={!canEdit || saving || deleting}
                  >
                    <option value="">Sec</option>
                    {SECOND_OPTIONS.map((second) => (
                      <option key={second} value={second}>
                        {second}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="ss-panel ss-panel--add-speaker">
            <div className="ss-section">
              <div className="ss-section__title">Add speaker</div>
              <div className="ss-section__hint">
                Add another speaker to the running order.
              </div>
            </div>

            <div className="ss-grid-2">
              <div className="ss-field">
                <label className="ss-label">Speaker name</label>
                <input
                  className="ss-input"
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  placeholder="e.g. James"
                  disabled={saving || deleting}
                />
              </div>

              <div className="ss-field">
                <label className="ss-label">Role</label>
                <select
                  className="ss-select ss-select--full"
                  value={newSpeakerRole}
                  onChange={(e) => setNewSpeakerRole(e.target.value)}
                  disabled={saving || deleting}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn ss-btn--secondary"
                onClick={handleAddSpeaker}
                disabled={saving || deleting}
              >
                Add speaker
              </button>
            </div>
          </div>
        ) : null}

        <div className="ss-manage-footer">
          {!isCompleted ? (
            <button
              type="button"
              className="ss-btn ss-btn--primary ss-btn--final"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={saving || deleting}
            >
              Everyone has spoken
            </button>
          ) : (
            <div className="ss-actions ss-actions--stack-mobile">
              <button
                type="button"
                className="ss-btn ss-btn--primary ss-btn--final"
                onClick={handleGoToResults}
                disabled={!eventData?.join_code || deleting}
              >
                See results
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--ghost ss-btn--final"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting || saving}
              >
                Delete event
              </button>
            </div>
          )}
        </div>
      </div>

      {showCompleteConfirm ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card">
            <h3 className="ss-modal-title">Complete this event?</h3>
            <p className="ss-modal-text">
              Are you sure everyone has spoken? This will submit all recorded
              speaker times and lock the event.
            </p>

            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={() => setShowCompleteConfirm(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handleCompleteEvent}
                disabled={saving}
              >
                {saving ? "Submitting..." : "Yes, complete event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card">
            <h3 className="ss-modal-title">Delete this event?</h3>
            <p className="ss-modal-text">
              This will remove the current wedding event and let you create a
              new one from scratch.
            </p>

            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handleDeleteEvent}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, delete event"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {timerSpeaker ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card">
            <h3 className="ss-modal-title">
              Timer for {timerSpeaker.personName || "speaker"}
            </h3>

            <p className="ss-modal-text">
              Start, pause, or reset the timer. When you are happy with the
              final time, submit it for this speaker.
            </p>

            <div className="ss-timer-display">
              {formatClock(timerElapsedSeconds)}
            </div>

            <div className="ss-actions ss-actions--stack-mobile">
              {!timerRunning ? (
                <button
                  type="button"
                  className="ss-btn ss-btn--primary"
                  onClick={handleStartTimer}
                  disabled={saving}
                >
                  {timerElapsedSeconds > 0 ? "Resume timer" : "Start timer"}
                </button>
              ) : (
                <button
                  type="button"
                  className="ss-btn ss-btn--secondary"
                  onClick={handlePauseTimer}
                  disabled={saving}
                >
                  Pause timer
                </button>
              )}

              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={handleResetTimer}
                disabled={saving}
              >
                Reset
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handleSubmitTimedSpeaker}
                disabled={saving}
              >
                Submit time
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showQrModal ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card ss-qr-modal-card">
            <div className="ss-qr-print-area">
              <h3 className="ss-modal-title">Scan to join</h3>
              <p className="ss-modal-text">
                Guests can scan this QR code to open the join page directly.
              </p>

              <div className="ss-qr-code-wrap">
                <div className="ss-qr-code-surface">
                  <QRCode value={shareLink} size={220} />
                </div>
              </div>

              <div className="ss-qr-meta">
                <div className="ss-qr-meta__title">Speech Stakes</div>
                <div className="ss-qr-meta__code">
                  Code: {eventData?.join_code}
                </div>
                <div className="ss-qr-meta__link">{shareLink}</div>
              </div>
            </div>

            <div className="ss-actions ss-actions--stack-mobile ss-no-print">
              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={() => setShowQrModal(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handlePrintQr}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
