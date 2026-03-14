//weddingcreateevent.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./WeddingApp.css";

const LS_DRAFT_KEY = "wedding_event_draft_v1";
const LS_HOST_EVENT_KEY = "wedding_host_event_v1";
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

function makeEmptySpeaker() {
  return {
    id: `sp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    personName: "",
    role: "Best Man",
    customRole: "",
  };
}

export default function WeddingCreateEvent() {
  const navigate = useNavigate();

  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [speakers, setSpeakers] = useState([makeEmptySpeaker()]);

  const [created, setCreated] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(LS_DRAFT_KEY);
    if (!raw) return;

    const draft = safeJsonParse(raw);
    if (!draft) return;

    setBrideName(draft.brideName || "");
    setGroomName(draft.groomName || "");
    setSpeakers(
      Array.isArray(draft.speakers) && draft.speakers.length
        ? draft.speakers
        : [makeEmptySpeaker()]
    );

    // Do not trust previously "created" local state as the source of truth.
    // The database is now the real source of truth.
    setCreated(false);
    setJoinCode("");
  }, []);

  useEffect(() => {
    const payload = {
      brideName,
      groomName,
      speakers,
      created,
      joinCode,
      updatedAt: Date.now(),
    };

    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(payload));
  }, [brideName, groomName, speakers, created, joinCode]);

  const coupleLabel = useMemo(() => {
    const b = (brideName || "").trim();
    const g = (groomName || "").trim();

    if (!b && !g) return "The Wedding";
    if (b && g) return `The Wedding of ${b} & ${g}`;
    return `The Wedding of ${b || g}`;
  }, [brideName, groomName]);

  function updateSpeaker(id, patch) {
    setSpeakers((prev) =>
      prev.map((speaker) =>
        speaker.id === id ? { ...speaker, ...patch } : speaker
      )
    );
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, makeEmptySpeaker()]);
  }

  function removeSpeaker(id) {
    setSpeakers((prev) =>
      prev.length <= 1 ? prev : prev.filter((speaker) => speaker.id !== id)
    );
  }

  function validate() {
    const b = brideName.trim();
    const g = groomName.trim();

    if (!b || !g) {
      return "Please enter the first name of the bride and groom.";
    }

    const cleaned = speakers.map((speaker) => ({
      ...speaker,
      personName: (speaker.personName || "").trim(),
      role: speaker.role,
      customRole: (speaker.customRole || "").trim(),
    }));

    if (cleaned.some((speaker) => !speaker.personName)) {
      return "Please enter a name for each speaker.";
    }

    if (
      cleaned.some((speaker) => speaker.role === "Other" && !speaker.customRole)
    ) {
      return "For any speaker with role 'Other', please enter a custom role.";
    }

    return "";
  }

  async function handleCreateEvent() {
    if (isCreating) return;

    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setIsCreating(true);

    try {
      const hostUser = JSON.parse(
        localStorage.getItem(LS_WEDDING_HOST_USER_KEY) || "null"
      );

      if (!hostUser?.userId) {
        setError("Please sign in as a host first.");
        setIsCreating(false);
        return;
      }

      const payload = {
        hostUserId: hostUser.userId,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        eventDate: null,
        speakers: speakers.map((speaker, idx) => ({
          personName: speaker.personName.trim(),
          role:
            speaker.role === "Other" ? speaker.customRole.trim() : speaker.role,
          sortOrder: idx + 1,
        })),
      };

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/wedding/events`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();

      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error || rawText || "Failed to create event.");
      }

      localStorage.setItem(
        LS_HOST_EVENT_KEY,
        JSON.stringify({
          eventId: data.event.event_id,
          joinCode: data.event.join_code,
        })
      );

      localStorage.setItem(
        LS_DRAFT_KEY,
        JSON.stringify({
          brideName,
          groomName,
          speakers,
          created: true,
          joinCode: data.event.join_code,
          updatedAt: Date.now(),
        })
      );

      setJoinCode(data.event.join_code);
      setCreated(true);

      navigate(`/wedding/manage/${data.event.event_id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create event.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleGoToPredictions() {
    if (!joinCode) return;
    navigate(`/wedding/join?code=${encodeURIComponent(joinCode)}`);
  }

  function handleResetDraft() {
    localStorage.removeItem(LS_DRAFT_KEY);
    setBrideName("");
    setGroomName("");
    setSpeakers([makeEmptySpeaker()]);
    setCreated(false);
    setJoinCode("");
    setError("");
    setIsCreating(false);
  }

  return (
    <div className="screen ss-editorial wedding-create">
      <div className="ss-card ss-card--wide">
        <div className="ss-header ss-wedding-header">
          <div className="ss-ornament" aria-hidden="true">
            <span className="ss-dot" />
            <span className="ss-line" />
            <span className="ss-dot" />
          </div>

          <div className="ss-wedding-titleblock">
            <div className="ss-wedding-overline">Create Event</div>
            <div className="ss-wedding-names">
              <span className="ss-wedding-name">{coupleLabel}</span>
            </div>
            <div className="ss-wedding-underline" aria-hidden="true" />
          </div>

          <p className="ss-subtitle ss-subtitle--tight">
            Add the couple and the list of speakers, then create your event
            code.
          </p>
        </div>

        <div className="ss-form">
          <div className="ss-grid-2">
            <div className="ss-field">
              <label className="ss-label" htmlFor="brideName">
                Bride first name
              </label>
              <input
                id="brideName"
                className="ss-input"
                value={brideName}
                onChange={(e) => setBrideName(e.target.value)}
                placeholder="e.g. Emma"
              />
            </div>

            <div className="ss-field">
              <label className="ss-label" htmlFor="groomName">
                Groom first name
              </label>
              <input
                id="groomName"
                className="ss-input"
                value={groomName}
                onChange={(e) => setGroomName(e.target.value)}
                placeholder="e.g. Daniel"
              />
            </div>
          </div>

          <div className="ss-section">
            <div className="ss-section__title">Speakers</div>
            <div className="ss-section__hint">
              Add each speaker’s name and role.
            </div>
          </div>

          <div className="ss-list">
            {speakers.map((speaker, idx) => {
              const showCustom = speaker.role === "Other";

              return (
                <div className="ss-row ss-row--stack" key={speaker.id}>
                  <div className="ss-row__top">
                    <div className="ss-row__badge">Speaker {idx + 1}</div>

                    <button
                      type="button"
                      className="ss-icon-btn"
                      onClick={() => removeSpeaker(speaker.id)}
                      disabled={speakers.length <= 1}
                      title={
                        speakers.length <= 1
                          ? "At least one speaker is required"
                          : "Remove speaker"
                      }
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
                          updateSpeaker(speaker.id, {
                            personName: e.target.value,
                          })
                        }
                        placeholder="e.g. James"
                      />
                    </div>

                    <div className="ss-field">
                      <label className="ss-label">Role</label>
                      <select
                        className="ss-select ss-select--full"
                        value={speaker.role}
                        onChange={(e) =>
                          updateSpeaker(speaker.id, {
                            role: e.target.value,
                            customRole: "",
                          })
                        }
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showCustom && (
                    <div className="ss-field">
                      <label className="ss-label">Custom role</label>
                      <input
                        className="ss-input"
                        value={speaker.customRole}
                        onChange={(e) =>
                          updateSpeaker(speaker.id, {
                            customRole: e.target.value,
                          })
                        }
                        placeholder="e.g. Friend of the couple"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="ss-btn ss-btn--secondary"
            onClick={addSpeaker}
            disabled={isCreating}
          >
            Add another speaker
          </button>

          {error ? <div className="ss-error">{error}</div> : null}

          <div className="ss-actions">
            <button
              type="button"
              className="ss-btn ss-btn--primary"
              onClick={handleCreateEvent}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create event"}
            </button>

            <button
              type="button"
              className="ss-btn ss-btn--ghost"
              onClick={handleResetDraft}
              disabled={isCreating}
            >
              Reset
            </button>
          </div>

          {created && joinCode ? (
            <div className="ss-created">
              <div className="ss-created__label">Event code</div>
              <div className="ss-created__code">{joinCode}</div>
              <div className="ss-created__hint">
                Share this code with guests. If you need to change speakers,
                create a new event for now.
              </div>

              <button
                type="button"
                className="ss-btn ss-btn--primary ss-submit"
                onClick={handleGoToPredictions}
              >
                Preview guest view
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
