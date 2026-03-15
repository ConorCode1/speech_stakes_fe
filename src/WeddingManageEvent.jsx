import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

function getEventStatusLabel(status) {
  return status === "completed" ? "Completed" : "In progress";
}

function formatEventOptionLabel(event) {
  const bride = String(event.bride_name || "").trim();
  const groom = String(event.groom_name || "").trim();
  const joinCode = String(event.join_code || "").trim();
  const statusLabel = getEventStatusLabel(event.status);

  const names =
    bride && groom ? `${bride} & ${groom}` : bride || groom || "Untitled event";

  return joinCode
    ? `${names} (${joinCode}) - ${statusLabel}`
    : `${names} - ${statusLabel}`;
}

export default function WeddingManageEvent() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [hostEvents, setHostEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [speakers, setSpeakers] = useState([]);

  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerRole, setNewSpeakerRole] = useState("Best Man");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showEditDetails, setShowEditDetails] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const hostUser = safeJsonParse(
    localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
  );
  const hostUserId = hostUser?.userId || "";

  const isCompleted = eventData?.status === "completed";
  const canEdit = !isCompleted;

  const coupleLabel = useMemo(() => {
    const b = (brideName || "").trim();
    const g = (groomName || "").trim();

    if (!b && !g) return "Manage Event";
    if (b && g) return `${b} & ${g}`;
    return b || g;
  }, [brideName, groomName]);

  const statusLabel = useMemo(() => {
    return getEventStatusLabel(eventData?.status);
  }, [eventData?.status]);

  const loadHostEvents = useCallback(async () => {
    if (!hostUserId) {
      setEventsLoading(false);
      return;
    }

    try {
      setEventsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events`,
        {
          headers: {
            "x-wedding-host-user-id": hostUserId,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load events.");
      }

      setHostEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      console.error(err);
      setError((prev) => prev || err.message || "Failed to load events.");
    } finally {
      setEventsLoading(false);
    }
  }, [hostUserId]);

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
      setBrideName(data.event.bride_name || "");
      setGroomName(data.event.groom_name || "");

      setSpeakers(
        (data.event.speakers || []).map((speaker) => {
          const split = toMinutesSeconds(speaker.actual_seconds);

          return {
            ...speaker,
            personName: speaker.speaker_name || "",
            role: speaker.speaker_role || "",
            actualMinutes: split.minutes,
            actualSeconds: split.seconds,
          };
        }),
      );

      setShowCompleteConfirm(false);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }, [eventId, hostUserId]);

  useEffect(() => {
    loadHostEvents();
  }, [loadHostEvents]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  function updateSpeakerLocal(speakerId, patch) {
    setSpeakers((prev) =>
      prev.map((speaker) =>
        speaker.speaker_id === speakerId ? { ...speaker, ...patch } : speaker,
      ),
    );
  }

  function handleEventChange(e) {
    const nextEventId = e.target.value;
    if (!nextEventId || String(nextEventId) === String(eventId)) return;
    navigate(`/wedding/manage/${nextEventId}`);
  }

  function handleCreateNewEvent() {
    navigate("/weddingcreateevent");
  }

  async function handleSaveEventDetails() {
    if (!canEdit || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-wedding-host-user-id": hostUserId,
          },
          body: JSON.stringify({
            brideName: brideName.trim(),
            groomName: groomName.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save event details.");
      }

      setEventData((prev) => ({
        ...prev,
        ...data.event,
      }));

      setHostEvents((prev) =>
        prev.map((event) =>
          String(event.event_id) === String(eventId)
            ? { ...event, ...data.event }
            : event,
        ),
      );

      setShowEditDetails(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save event details.");
    } finally {
      setSaving(false);
    }
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

      setSpeakers((prev) => [
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

      setSpeakers((prev) =>
        prev.filter((speaker) => speaker.speaker_id !== speakerId),
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete speaker.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveActualTime(speaker) {
    if (saving || !canEdit) return;

    const totalSeconds = toTotalSeconds(
      speaker.actualMinutes,
      speaker.actualSeconds,
    );

    if (totalSeconds == null) {
      setError("Please enter a valid time using minutes and seconds.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/speakers/${speaker.speaker_id}/actual-time`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-wedding-host-user-id": hostUserId,
          },
          body: JSON.stringify({
            actualSeconds: totalSeconds,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save actual time.");
      }

      const split = toMinutesSeconds(data.speaker.actual_seconds);

      updateSpeakerLocal(speaker.speaker_id, {
        actualMinutes: split.minutes,
        actualSeconds: split.seconds,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save actual time.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteEvent() {
    if (saving || !canEdit) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events/${eventId}/complete`,
        {
          method: "POST",
          headers: {
            "x-wedding-host-user-id": hostUserId,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete event.");
      }

      setEventData((prev) => ({
        ...prev,
        status: data.event.status,
      }));

      setHostEvents((prev) =>
        prev.map((event) =>
          String(event.event_id) === String(eventId)
            ? { ...event, ...data.event }
            : event,
        ),
      );

      setShowCompleteConfirm(false);
      navigate(`/weddingresults?code=${data.event.join_code}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to complete event.");
    } finally {
      setSaving(false);
    }
  }

  function handleGoToResults() {
    if (!eventData?.join_code) return;
    navigate(`/weddingresults?code=${eventData.join_code}`);
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

  return (
    <div className="screen ss-editorial wedding-create">
      <div className="ss-card ss-card--wide ss-manage-card">
        <div className="ss-manage-toolbar">
          <div className="ss-field">
            <label className="ss-label">Your events</label>
            <select
              className="ss-select ss-select--full"
              value={eventId || ""}
              onChange={handleEventChange}
              disabled={eventsLoading || saving || hostEvents.length === 0}
            >
              {eventsLoading ? (
                <option value="">Loading events...</option>
              ) : hostEvents.length === 0 ? (
                <option value="">No events found</option>
              ) : (
                hostEvents.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {formatEventOptionLabel(event)}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className="ss-btn ss-btn--primary ss-manage-toolbar__create"
            onClick={handleCreateNewEvent}
          >
            Create new event
          </button>
        </div>

        <div className="ss-manage-hero">
          <div className="ss-wedding-overline">Manage Event</div>

          <div className="ss-manage-hero__title">{coupleLabel}</div>

          <div className="ss-meta-pills">
            <span className="ss-meta-pill">Code {eventData?.join_code}</span>
            <span className="ss-meta-pill">{statusLabel}</span>
          </div>

          <div className="ss-manage-hero__actions">
            <button
              type="button"
              className="ss-btn ss-btn--ghost"
              onClick={() => setShowEditDetails((prev) => !prev)}
              disabled={!canEdit || saving}
            >
              {showEditDetails ? "Hide details" : "Edit wedding details"}
            </button>
          </div>
        </div>

        {error ? <div className="ss-error">{error}</div> : null}

        {isCompleted ? (
          <div className="ss-row ss-row--stack">
            <div className="ss-section__hint">
              This event has been completed. You can still view the results, but
              speech times can no longer be changed.
            </div>
          </div>
        ) : null}

        {showEditDetails ? (
          <div className="ss-panel">
            <div className="ss-section">
              <div className="ss-section__title">Wedding details</div>
            </div>

            <div className="ss-grid-2">
              <div className="ss-field">
                <label className="ss-label">Bride first name</label>
                <input
                  className="ss-input"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div className="ss-field">
                <label className="ss-label">Groom first name</label>
                <input
                  className="ss-input"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handleSaveEventDetails}
                disabled={!canEdit || saving}
              >
                Save details
              </button>
            </div>
          </div>
        ) : null}

        <div className="ss-section ss-section--speakers">
          <div className="ss-section__title">Speakers</div>
          <div className="ss-section__hint">
            {isCompleted
              ? "Speech times are locked for this completed event."
              : "Enter the actual speech time for each speaker."}
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
                    disabled={saving}
                    title="Remove speaker"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="ss-speaker-card__name">{speaker.personName}</div>
              <div className="ss-speaker-card__role">{speaker.role}</div>

              <div className="ss-time-entry">
                <div className="ss-time-entry__group">
                  <label className="ss-label">Min</label>
                  <input
                    className="ss-input ss-input--time"
                    type="number"
                    min="0"
                    value={speaker.actualMinutes}
                    onChange={(e) =>
                      updateSpeakerLocal(speaker.speaker_id, {
                        actualMinutes: e.target.value,
                      })
                    }
                    disabled={!canEdit || saving}
                  />
                </div>

                <div className="ss-time-entry__colon">:</div>

                <div className="ss-time-entry__group">
                  <label className="ss-label">Sec</label>
                  <input
                    className="ss-input ss-input--time"
                    type="number"
                    min="0"
                    max="59"
                    value={speaker.actualSeconds}
                    onChange={(e) =>
                      updateSpeakerLocal(speaker.speaker_id, {
                        actualSeconds: e.target.value,
                      })
                    }
                    disabled={!canEdit || saving}
                  />
                </div>
              </div>

              {!isCompleted ? (
                <button
                  type="button"
                  className="ss-btn ss-btn--secondary ss-btn--compact"
                  onClick={() => handleSaveActualTime(speaker)}
                  disabled={saving}
                >
                  Save time
                </button>
              ) : null}
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
                />
              </div>

              <div className="ss-field">
                <label className="ss-label">Role</label>
                <select
                  className="ss-select ss-select--full"
                  value={newSpeakerRole}
                  onChange={(e) => setNewSpeakerRole(e.target.value)}
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
                disabled={saving}
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
              disabled={saving}
            >
              Everyone has spoken
            </button>
          ) : (
            <button
              type="button"
              className="ss-btn ss-btn--primary ss-btn--final"
              onClick={handleGoToResults}
              disabled={!eventData?.join_code}
            >
              See results
            </button>
          )}
        </div>
      </div>

      {showCompleteConfirm ? (
        <div className="ss-modal-backdrop">
          <div className="ss-modal-card">
            <h3 className="ss-modal-title">Complete this event?</h3>
            <p className="ss-modal-text">
              Are you sure everyone has spoken? Once you complete this event,
              speech times will be locked and you will no longer be able to make
              changes.
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
                Yes, complete event
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
