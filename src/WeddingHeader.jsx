import { useLocation, useNavigate, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

const LS_WEDDING_HOST_USER_KEY = "wedding_host_user_v1";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function WeddingHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const isWeddingHome = location.pathname === "/";

  const hostUser = safeJsonParse(
    localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
  );

  const isLoggedIn = Boolean(hostUser?.userId && hostUser?.email);

  const displayName = useMemo(() => {
    if (!hostUser?.email) return "Guest";

    if (hostUser.name) return hostUser.name;

    const emailPrefix = String(hostUser.email).split("@")[0] || "";
    if (!emailPrefix) return hostUser.email;

    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }, [hostUser]);

  const subscriptionStatus = hostUser?.subscriptionStatus || "Free";

  function openMenu() {
    setSidebarClosing(false);
    setMenuOpen(true);
  }

  function closeMenu() {
    if (menuOpen) {
      setSidebarClosing(true);
    }
  }

  function handleSidebarAnimationEnd() {
    if (sidebarClosing) {
      setMenuOpen(false);
      setSidebarClosing(false);
    }
  }

  function handleLeftClick() {
    if (isWeddingHome) {
      if (menuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
      return;
    }

    navigate("/");
  }

  function handleAccountClick() {
    if (!isLoggedIn) {
      navigate("/weddinghostlogin");
      return;
    }

    setShowAccountModal(true);
  }

  function handleLogout() {
    localStorage.removeItem(LS_WEDDING_HOST_USER_KEY);
    setShowAccountModal(false);
    navigate("/weddinghostlogin");
  }

  return (
    <>
      <header className="wedding-header">
        <button
          type="button"
          className="wedding-header__left"
          onClick={handleLeftClick}
          aria-label={isWeddingHome ? "Open menu" : "Go to wedding home"}
        >
          {isWeddingHome ? (
            <Icon icon="mdi:menu" className="wedding-header__icon" />
          ) : (
            <Icon
              icon="material-symbols:home-outline-rounded"
              className="wedding-header__icon"
            />
          )}
        </button>

        <Link to="/" className="wedding-header__title" onClick={closeMenu}>
          SpeechStakes
        </Link>

        <button
          type="button"
          className="wedding-header__right"
          onClick={handleAccountClick}
          aria-label={isLoggedIn ? "Open account" : "Go to login"}
        >
          <Icon
            icon="mdi:account-circle-outline"
            className="wedding-header__icon wedding-header__icon--account"
          />
        </button>
      </header>

      {isWeddingHome && (menuOpen || sidebarClosing) && (
        <>
          <div className="wedding-sidebar-overlay" onClick={closeMenu} />

          <aside
            className={`wedding-sidebar ${
              sidebarClosing ? "slide-out" : "slide-in"
            }`}
            onAnimationEnd={handleSidebarAnimationEnd}
          >
            <ul className="wedding-sidebar-list">
              <li>
                <Link to="/" className="wedding-nav-link" onClick={closeMenu}>
                  <Icon
                    icon="mdi:home-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Home
                </Link>
              </li>

              <li>
                <a
                  href="/#how-it-works"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mingcute:question-line"
                    className="wedding-sidebar-item-icon"
                  />
                  How it Works
                </a>
              </li>

              <li>
                <a
                  href="/#pricing"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:tag-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Pricing
                </a>
              </li>

              <li>
                <Link
                  to="/contact"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:message-text-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Contact
                </Link>
              </li>

              <li>
                <Link
                  to="/weddinghostlogin"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="codicon:account"
                    className="wedding-sidebar-item-icon"
                  />
                  Login
                </Link>
              </li>

              <li>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:instagram"
                    className="wedding-sidebar-item-icon"
                  />
                  Instagram
                </a>
              </li>

              <li>
                <a
                  href="https://www.tiktok.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="ic:baseline-tiktok"
                    className="wedding-sidebar-item-icon"
                  />
                  TikTok
                </a>
              </li>
              <li>
                <Link
                  to="/legal"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:file-document-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Legal
                </Link>
              </li>
            </ul>
          </aside>
        </>
      )}

      {showAccountModal && (
        <div
          className="ss-modal-backdrop"
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className="ss-modal-card ss-account-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ss-account-modal__header">
              <h3 className="ss-modal-title">Your account</h3>

              <button
                type="button"
                className="ss-icon-btn"
                onClick={() => setShowAccountModal(false)}
                aria-label="Close account modal"
              >
                ×
              </button>
            </div>

            <div className="ss-account-modal__body">
              <div className="ss-account-row">
                <div className="ss-account-row__label">Username</div>
                <div className="ss-account-row__value">{displayName}</div>
              </div>

              <div className="ss-account-row">
                <div className="ss-account-row__label">Email</div>
                <div className="ss-account-row__value">
                  {hostUser?.email || "-"}
                </div>
              </div>

              <div className="ss-account-row">
                <div className="ss-account-row__label">Subscription</div>
                <div className="ss-account-row__value">
                  {subscriptionStatus}
                </div>
              </div>
            </div>

            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn ss-btn--ghost"
                onClick={() => setShowAccountModal(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="ss-btn ss-btn--primary"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
