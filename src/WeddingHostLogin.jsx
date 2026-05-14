import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

const LS_WEDDING_HOST_USER_KEY = "wedding_host_user_v1";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function hasActiveWeddingPass(user) {
  if (!user) return false;
  const status = (user.membershipStatus || "").toLowerCase();
  return status !== "free" && status !== "";
}

export default function WeddingHostLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("create");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  const [hostUser, setHostUser] = useState(null);
  const [showPurchaseStep, setShowPurchaseStep] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const cleanedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const isPaymentSuccessPage = location.pathname === "/wedding-payment-success";
  const isPaymentCancelledPage =
    location.pathname === "/wedding-payment-cancelled";

  const routeHostUser = useCallback(
    async (userId) => {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/events`,
        {
          headers: {
            "x-wedding-host-user-id": userId,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load host events.");
      }

      const events = Array.isArray(data.events) ? data.events : [];

      if (events.length > 0) {
        navigate(`/wedding/manage/${events[0].event_id}`, { replace: true });
        return;
      }

      navigate("/weddingcreateevent", { replace: true });
    },
    [navigate],
  );

  const saveHostUser = useCallback((user) => {
    const normalized = {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name || "",
      membershipStatus: user.membership_status || "free",
      membershipExpiresAt: user.membership_expires_at || null,
    };

    localStorage.setItem(LS_WEDDING_HOST_USER_KEY, JSON.stringify(normalized));
    setHostUser(normalized);
    return normalized;
  }, []);

  const refreshHostUser = useCallback(async () => {
    const stored = safeJsonParse(
      localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
    );

    if (!stored?.userId || !stored?.email) {
      return null;
    }

    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: stored.email,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to refresh host account.");
    }

    return saveHostUser(data.user);
  }, [saveHostUser]);

  useEffect(() => {
    async function checkExistingHost() {
      try {
        const stored = safeJsonParse(
          localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
        );

        if (!stored?.userId) {
          setCheckingExistingSession(false);
          return;
        }

        setHostUser(stored);

        if (isPaymentSuccessPage) {
          const refreshedUser = await refreshHostUser();

          if (refreshedUser && hasActiveWeddingPass(refreshedUser)) {
            setPurchaseMessage("Your payment was successful.");
            setShowPurchaseStep(true);
          } else {
            setPurchaseMessage(
              "Payment went through, but your account has not updated yet. Please try again in a moment.",
            );
            setShowPurchaseStep(true);
          }

          setCheckingExistingSession(false);
          return;
        }

        if (isPaymentCancelledPage) {
          setPurchaseMessage(
            "Checkout was cancelled. You can try again below.",
          );
          setShowPurchaseStep(true);
          setCheckingExistingSession(false);
          return;
        }

        if (hasActiveWeddingPass(stored)) {
          await routeHostUser(stored.userId);
          return;
        }

        setShowPurchaseStep(true);
        setCheckingExistingSession(false);
      } catch (err) {
        console.error(err);
        localStorage.removeItem(LS_WEDDING_HOST_USER_KEY);
        setHostUser(null);
        setShowPurchaseStep(false);
        setCheckingExistingSession(false);
      }
    }

    checkExistingHost();
  }, [
    isPaymentSuccessPage,
    isPaymentCancelledPage,
    refreshHostUser,
    routeHostUser,
  ]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPurchaseMessage("");

    if (!cleanedEmail) {
      setError("Please enter your email.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/host/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanedEmail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (mode === "create"
              ? "Failed to create account."
              : "Failed to sign in."),
        );
      }

      const savedUser = saveHostUser(data.user);

      if (hasActiveWeddingPass(savedUser)) {
        await routeHostUser(savedUser.userId);
        return;
      }

      setShowPurchaseStep(true);
      setPurchaseMessage("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartCheckout() {
    setError("");
    setPurchaseMessage("");

    const stored =
      hostUser || safeJsonParse(localStorage.getItem(LS_WEDDING_HOST_USER_KEY));

    if (!stored?.userId) {
      setError("Please sign in again before purchasing.");
      return;
    }

    try {
      setStartingCheckout(true);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/wedding/payments/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hostUserId: stored.userId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start checkout.");
      }

      if (!data.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to start checkout.");
      setStartingCheckout(false);
    }
  }

  async function handleContinueToHostArea() {
    setError("");

    const stored =
      hostUser || safeJsonParse(localStorage.getItem(LS_WEDDING_HOST_USER_KEY));

    if (!stored?.userId) {
      setError("Could not find your account. Please sign in again.");
      return;
    }

    try {
      const refreshedUser = await refreshHostUser();

      if (!refreshedUser || !hasActiveWeddingPass(refreshedUser)) {
        setError("Your event pass is not active yet.");
        setShowPurchaseStep(true);
        return;
      }

      await routeHostUser(refreshedUser.userId);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to continue.");
    }
  }

  if (checkingExistingSession) {
    return (
      <div className="home-container login-container">
        <div className="screen wedding-home ss-editorial">
          <div className="ss-card">
            <p className="ss-subtitle">Checking your account...</p>
          </div>
        </div>
      </div>
    );
  }

  if (
    showPurchaseStep ||
    (hostUser && (isPaymentSuccessPage || isPaymentCancelledPage))
  ) {
    const isSuccessState =
      isPaymentSuccessPage && hasActiveWeddingPass(hostUser);
    const isCancelledState = isPaymentCancelledPage;

    return (
      <div className="home-container login-container">
        <div className="screen wedding-home ss-editorial">
          <div className="ss-card ss-card--purchase">
            {isSuccessState ? (
              <>
                <div className="ss-header ss-header--success">
                  <div className="ss-success-icon-wrap">
                    <Icon icon="mdi:check-circle" className="ss-success-icon" />
                  </div>
                  <h1 className="ss-title">You’re all set</h1>
                  <p className="ss-subtitle ss-subtitle--wide">
                    Your Event Pass is now active.
                  </p>
                </div>

                <div className="ss-form">
                  <div className="ss-success-message">
                    Payment successful. You can now create and manage your
                    event.
                  </div>

                  <div className="ss-next-steps">
                    <div className="ss-next-steps-title">What happens next</div>
                    <div className="ss-next-step">1. Set up your event</div>
                    <div className="ss-next-step">2. Add your speakers</div>
                    <div className="ss-next-step">
                      3. Share the join code with your guests
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ss-btn ss-btn--primary"
                    onClick={handleContinueToHostArea}
                  >
                    Create My Event
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ss-header ss-header--success">
                  <div className="ss-success-icon-wrap">
                    <Icon
                      icon="mdi:check-circle-outline"
                      className="ss-success-icon"
                    />
                  </div>

                  {!isCancelledState ? (
                    <div className="ss-success-kicker">
                      Account created successfully
                    </div>
                  ) : null}

                  <h1 className="ss-title">
                    {isCancelledState
                      ? "Complete your purchase"
                      : "Your account is ready"}
                  </h1>

                  <p className="ss-subtitle ss-subtitle--wide">
                    {isCancelledState
                      ? "Finish checkout to unlock your Event Pass."
                      : "You’re just one step away from setting up your event."}
                  </p>
                </div>

                <div className="ss-form">
                  <div className="ss-purchase-account">
                    <div className="ss-purchase-account__label">
                      Signed in as
                    </div>
                    <div className="ss-purchase-account__email">
                      {hostUser?.email || "your account"}
                    </div>
                  </div>

                  <div className="ss-purchase-price-card">
                    <div className="ss-purchase-price-card__label">
                      One-time payment
                    </div>
                    <div className="ss-purchase-price-card__amount">€24.99</div>
                    <div className="ss-purchase-price-card__text">
                      One event per purchase. Unlock your Event Pass and start
                      creating your event.
                    </div>
                  </div>

                  {purchaseMessage ? (
                    <div
                      className={
                        isCancelledState ? "ss-warning" : "ss-success-message"
                      }
                    >
                      {purchaseMessage}
                    </div>
                  ) : null}

                  {error ? <div className="ss-error">{error}</div> : null}

                  {!hasActiveWeddingPass(hostUser) ? (
                    <button
                      type="button"
                      className="ss-btn ss-btn--primary ss-btn--checkout"
                      onClick={handleStartCheckout}
                      disabled={startingCheckout}
                    >
                      {startingCheckout ? (
                        "Redirecting to checkout..."
                      ) : (
                        <>
                          <Icon
                            icon="mdi:lock-outline"
                            className="ss-btn-icon"
                          />
                          Continue to Checkout
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ss-btn ss-btn--primary"
                      onClick={handleContinueToHostArea}
                    >
                      Continue
                    </button>
                  )}

                  {!hasActiveWeddingPass(hostUser) ? (
                    <div className="ss-checkout-note">
                      Secure checkout powered by Stripe
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container login-container">
      <div className="screen wedding-home ss-editorial">
        <div className="ss-card ss-card--event-pass">
          <div className="ss-event-pass-icon-wrap">
            <Icon
              icon="streamline:champagne-party-alcohol"
              className="ss-event-pass-icon"
            />
          </div>

          <div className="ss-header">
            <h1 className="ss-title">
              {mode === "create" ? "Get your Event Pass" : "Sign in"}
            </h1>

            <p className="ss-subtitle ss-subtitle--wide">
              {mode === "create"
                ? "Set up your wedding speech game in minutes. Everything you need for one event."
                : "Sign in to continue managing your event."}
            </p>
          </div>

          {mode === "create" ? (
            <>
              <div className="ss-price-hero">
                <div className="ss-price-hero__amount">€24.99</div>
                <div className="ss-price-hero__text">
                  One-time payment for one event
                </div>
              </div>

              <div className="ss-reassurance">
                <Icon icon="mdi:check-circle-outline" />
                <span>No subscription. No hidden fees.</span>
              </div>

              {/* <div className="ss-feature-grid">
                <div className="ss-feature-card">
                  <Icon icon="mdi:account-group-outline" />
                  <span>Guest predictions</span>
                </div>

                <div className="ss-feature-card">
                  <Icon icon="mdi:microphone-outline" />
                  <span>Speaker setup</span>
                </div>

                <div className="ss-feature-card">
                  <Icon icon="mdi:trophy-outline" />
                  <span>Live leaderboard</span>
                </div>
              </div> */}
            </>
          ) : null}

          <form onSubmit={handleSubmit} className="ss-form">
            <div className="ss-field">
              <div className="ss-input-wrap">
                <Icon icon="mdi:email-outline" className="ss-input-icon" />
                <input
                  id="hostEmail"
                  className="ss-input ss-input--icon"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {error ? <div className="ss-error">{error}</div> : null}

            <button
              type="submit"
              className="ss-btn ss-btn--primary"
              disabled={submitting}
            >
              {submitting
                ? mode === "create"
                  ? "Continuing..."
                  : "Signing in..."
                : mode === "create"
                  ? "Continue"
                  : "Sign in"}
              {!submitting && mode === "create" ? null : null}
            </button>

            <div className="ss-footer ss-footer--muted">
              {mode === "create" ? (
                <button
                  type="button"
                  className="ss-link"
                  onClick={() => {
                    setError("");
                    setMode("signin");
                  }}
                >
                  Already have an account? Sign in
                </button>
              ) : (
                <button
                  type="button"
                  className="ss-link"
                  onClick={() => {
                    setError("");
                    setMode("create");
                  }}
                >
                  Need an account? Create one
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
