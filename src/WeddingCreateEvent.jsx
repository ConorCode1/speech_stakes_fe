import React, { useEffect, useState } from "react";
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

const DEFAULT_BRIDE_NAME = "Bride";
const DEFAULT_GROOM_NAME = "Groom";

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

    setSpeakers(
      Array.isArray(draft.speakers) && draft.speakers.length
        ? draft.speakers
        : [makeEmptySpeaker()],
    );

    setCreated(false);
    setJoinCode("");
  }, []);

  useEffect(() => {
    const payload = {
      speakers,
      created,
      joinCode,
      updatedAt: Date.now(),
    };

    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(payload));
  }, [speakers, created, joinCode]);

  function updateSpeaker(id, patch) {
    setSpeakers((prev) =>
      prev.map((speaker) =>
        speaker.id === id ? { ...speaker, ...patch } : speaker,
      ),
    );
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, makeEmptySpeaker()]);
  }

  function removeSpeaker(id) {
    setSpeakers((prev) =>
      prev.length <= 1 ? prev : prev.filter((speaker) => speaker.id !== id),
    );
  }

  function validate() {
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
        localStorage.getItem(LS_WEDDING_HOST_USER_KEY) || "null",
      );

      if (!hostUser?.userId) {
        setError("Please sign in as a host first.");
        setIsCreating(false);
        return;
      }

      const payload = {
        hostUserId: hostUser.userId,
        brideName: DEFAULT_BRIDE_NAME,
        groomName: DEFAULT_GROOM_NAME,
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
        }),
      );

      localStorage.setItem(
        LS_DRAFT_KEY,
        JSON.stringify({
          speakers,
          created: true,
          joinCode: data.event.join_code,
          updatedAt: Date.now(),
        }),
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
    navigate(`/weddingjoin?code=${encodeURIComponent(joinCode)}`);
  }

  // function handleResetDraft() {
  //   localStorage.removeItem(LS_DRAFT_KEY);
  //   setSpeakers([makeEmptySpeaker()]);
  //   setCreated(false);
  //   setJoinCode("");
  //   setError("");
  //   setIsCreating(false);
  // }

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
              <span className="ss-wedding-name">Add your speakers</span>
            </div>
            <div className="ss-wedding-underline" aria-hidden="true" />
          </div>

          <p className="ss-subtitle ss-subtitle--tight">
            Add the speakers and their roles to finish setting up your event.
          </p>
        </div>

        <div className="ss-form">
          <div className="ss-section">
            {/* <div className="ss-section__title">Speakers</div>
            <div className="ss-section__hint">
              Enter the name and role for each speaker.
            </div> */}
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

                  {showCustom ? (
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
                  ) : null}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="ss-btn ss-btn--secondary ss-btn--with-icon"
            onClick={addSpeaker}
            disabled={isCreating}
          >
            <span className="ss-btn__icon" aria-hidden="true">
              +
            </span>
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
            <div className="ss-created__hint ss-created__hint--precta">
              You can add, remove, or edit speakers later if needed.
            </div>
          </div>

          {created && joinCode ? (
            <div className="ss-created">
              <div className="ss-created__label">Event code</div>
              <div className="ss-created__code">{joinCode}</div>
              <div className="ss-created__hint">
                Share this code with guests.
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
