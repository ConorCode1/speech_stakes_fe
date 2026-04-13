import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
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

function getLocalTimesKey(eventId) {
  return `wedding_manage_times_${eventId}`;
}

function makeDraftSpeaker() {
  return {
    draftId: `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    personName: "",
    role: "Best Man",
    actualMinutes: "",
    actualSeconds: "",
    isDraft: true,
  };
}

export default function WeddingManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [speakers, setSpeakers] = useState([]);

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
        const payload = nextSpeakers
          .filter((speaker) => !speaker.isDraft)
          .map((speaker) => ({
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

  function updateDraftSpeaker(draftId, patch) {
    setSpeakers((prev) =>
      prev.map((speaker) =>
        speaker.draftId === draftId ? { ...speaker, ...patch } : speaker,
      ),
    );
  }

  function handleShowAddSpeakerCard() {
    if (!canEdit || saving || deleting) return;

    setError("");
    setSpeakers((prev) => [...prev, makeDraftSpeaker()]);
  }

  async function handleSaveDraftSpeaker(draftSpeaker) {
    if (!canEdit || saving) return;

    const trimmedName = (draftSpeaker.personName || "").trim();

    if (!trimmedName) {
      setError("Please enter a name for the new speaker.");
      return;
    }

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
            personName: trimmedName,
            role: draftSpeaker.role,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add speaker.");
      }

      updateSpeakers((prev) =>
        prev.map((speaker) =>
          speaker.draftId === draftSpeaker.draftId
            ? {
                ...data.speaker,
                personName: data.speaker.speaker_name,
                role: data.speaker.speaker_role,
                actualMinutes: "",
                actualSeconds: "",
              }
            : speaker,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add speaker.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSpeaker(speaker) {
    if (!canEdit || saving) return;

    if (speaker.isDraft) {
      setSpeakers((prev) =>
        prev.filter((item) => item.draftId !== speaker.draftId),
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/speakers/${speaker.speaker_id}`,
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
        prev.filter((item) => item.speaker_id !== speaker.speaker_id),
      );

      if (timerSpeaker?.speaker_id === speaker.speaker_id) {
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

    const hasDraftSpeaker = speakers.some((speaker) => speaker.isDraft);
    if (hasDraftSpeaker) {
      setError(
        "Please save or remove any new speaker card before completing the event.",
      );
      setShowCompleteConfirm(false);
      return;
    }

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
          <div className="ss-manage-hero ss-manage-hero--compact">
            <div className="ss-wedding-overline">Manage Event</div>

            <div className="ss-meta-pills">
              <span className="ss-meta-pill">No event found</span>
            </div>

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
        <div className="ss-meta-pills">
          <span className="ss-meta-pill">
            Event code: {eventData?.join_code}
          </span>
        </div>

        {error ? <div className="ss-error">{error}</div> : null}

        <div className="ss-panel ss-panel--share">
          <div className="ss-section">
            <div className="ss-section__title">Share with guests</div>
          </div>

          <div className="ss-actions ss-actions--share">
            <button
              type="button"
              className="ss-btn ss-btn--secondary ss-btn--with-icon"
              onClick={handleCopyShareLink}
              disabled={!shareLink}
            >
              <Icon icon="mdi:content-copy" className="ss-btn__icon-svg" />
              Copy link
            </button>

            <button
              type="button"
              className="ss-btn ss-btn--secondary ss-btn--with-icon"
              onClick={() => setShowQrModal(true)}
              disabled={!shareLink}
            >
              <Icon icon="mdi:qrcode" className="ss-btn__icon-svg" />
              Show QR code
            </button>
          </div>

          {copyMessage ? (
            <div className="ss-share-feedback">{copyMessage}</div>
          ) : null}

          <div className="ss-share-tip">
            Tip: Print the QR code so guests can join easily at the wedding.
          </div>
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
          <div className="ss-section__title_record">Record speaker times</div>
          <div className="ss-section__hint">
            {isCompleted
              ? "Speech times are locked for this completed event."
              : ""}
          </div>
        </div>

        <div className="ss-list ss-list--speakers">
          {speakers.map((speaker) => {
            if (speaker.isDraft) {
              return (
                <div
                  className="ss-speaker-card ss-speaker-card--rich"
                  key={speaker.draftId}
                >
                  <div className="ss-speaker-card__top">
                    <div />
                    <button
                      type="button"
                      className="ss-icon-btn ss-icon-btn--danger"
                      onClick={() => handleDeleteSpeaker(speaker)}
                      disabled={saving || deleting}
                      title="Remove speaker"
                    >
                      ×
                    </button>
                  </div>

                  <div className="ss-grid-2">
                    <div className="ss-field">
                      <label className="ss-label">Speaker name</label>
                      <input
                        className="ss-input"
                        value={speaker.personName}
                        onChange={(e) =>
                          updateDraftSpeaker(speaker.draftId, {
                            personName: e.target.value,
                          })
                        }
                        placeholder="e.g. James"
                        disabled={saving || deleting}
                      />
                    </div>

                    <div className="ss-field">
                      <label className="ss-label">Role</label>
                      <select
                        className="ss-select ss-select--full"
                        value={speaker.role}
                        onChange={(e) =>
                          updateDraftSpeaker(speaker.draftId, {
                            role: e.target.value,
                          })
                        }
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

                  <div className="ss-actions ss-actions--speaker-save">
                    <button
                      type="button"
                      className="ss-btn ss-btn--secondary ss-btn--with-icon"
                      onClick={() => handleSaveDraftSpeaker(speaker)}
                      disabled={saving || deleting}
                    >
                      <Icon icon="mdi:plus" className="ss-btn__icon-svg" />
                      Save speaker
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                className="ss-speaker-card ss-speaker-card--rich"
                key={speaker.speaker_id}
              >
                <div className="ss-speaker-card__top">
                  <div className="ss-speaker-card__heading">
                    <div className="ss-speaker-card__name">
                      {speaker.personName}
                    </div>
                    <div className="ss-speaker-card__role">{speaker.role}</div>
                  </div>

                  {canEdit ? (
                    <button
                      type="button"
                      className="ss-icon-btn ss-icon-btn--danger"
                      onClick={() => handleDeleteSpeaker(speaker)}
                      disabled={saving || deleting}
                      title="Remove speaker"
                    >
                      ×
                    </button>
                  ) : null}
                </div>

                <div className="ss-time-entry">
                  <div className="ss-time-entry__group">
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

                {!isCompleted ? (
                  <div className="ss-actions ss-actions--speaker-timer">
                    <button
                      type="button"
                      className="ss-btn ss-btn--timer ss-btn--with-icon ss-btn--compact"
                      onClick={() => openTimerModal(speaker)}
                      disabled={saving || deleting}
                    >
                      <Icon
                        icon="mdi:timer-outline"
                        className="ss-btn__icon-svg"
                      />
                      Use timer
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {canEdit ? (
          <div className="ss-actions ss-actions--add-speaker-button">
            <button
              type="button"
              className="ss-btn ss-btn--secondary ss-btn--with-icon"
              onClick={handleShowAddSpeakerCard}
              disabled={
                saving ||
                deleting ||
                speakers.some((speaker) => speaker.isDraft)
              }
            >
              <Icon icon="mdi:plus" className="ss-btn__icon-svg" />
              Add speaker
            </button>
          </div>
        ) : null}

        <div className="ss-manage-footer">
          {!isCompleted ? (
            <button
              type="button"
              className="ss-btn ss-btn--primary ss-btn--finalme"
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
        <div className="ss-modal-backdrop" onClick={closeTimerModal}>
          <div
            className="ss-modal-card ss-timer-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ss-modal-close"
              onClick={closeTimerModal}
              aria-label="Close timer"
            >
              ×
            </button>

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

            <div className="ss-timer-actions">
              <div className="ss-timer-actions__top">
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
              </div>

              <div className="ss-timer-actions__middle">
                <button
                  type="button"
                  className="ss-btn ss-btn--primary"
                  onClick={handleSubmitTimedSpeaker}
                  disabled={saving}
                >
                  Submit time
                </button>
              </div>

              <div className="ss-timer-actions__bottom">
                <button
                  type="button"
                  className="ss-btn ss-btn--ghost"
                  onClick={handleResetTimer}
                  disabled={saving}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showQrModal ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card ss-qr-modal-card">
            <div className="ss-qr-modal-simple ss-screen-only">
              <div className="ss-qr-modal-simple__text">
                Scan to join and predict the wedding speeches.
              </div>

              <div className="ss-qr-code-wrap">
                <div className="ss-qr-code-surface">
                  <QRCode
                    value={shareLink}
                    size={220}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>
              </div>
            </div>
            <div id="wedding-qr-print-poster" className="wedding-print-poster">
              <div className="wedding-print-poster__inner">
                <div className="wedding-print-poster__corner wedding-print-poster__corner--tl">
                  <span className="wedding-print-poster__corner-line"></span>
                </div>

                <div className="wedding-print-poster__corner wedding-print-poster__corner--br">
                  <span className="wedding-print-poster__corner-line"></span>
                </div>

                <div className="wedding-print-poster__content">
                  <h1 className="wedding-print-poster__title">
                    Make Your Guess
                  </h1>

                  <div className="wedding-print-poster__tagline">
                    Join the game and predict how long each speech will last.
                  </div>

                  <div className="wedding-print-poster__divider" />

                  <p className="wedding-print-poster__text">
                    Scan the QR code, enter your name, and submit your
                    predictions.
                  </p>

                  <div className="wedding-print-poster__qr-box">
                    <QRCode
                      value={shareLink}
                      size={210}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="ss-actions ss-actions--stack-mobile ss-screen-only">
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
