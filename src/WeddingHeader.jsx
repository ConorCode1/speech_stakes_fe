import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";
import speechStakesIcon from "./assets/speechstakesicon.svg";

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
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const isWeddingHome = location.pathname === "/";

  const hostUser = safeJsonParse(
    localStorage.getItem(LS_WEDDING_HOST_USER_KEY),
  );

  const isLoggedIn = Boolean(hostUser?.userId && hostUser?.email);

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

  function openAccountModal() {
    setAccountModalOpen(true);
  }

  function closeAccountModal() {
    setAccountModalOpen(false);
  }

  function handleGoToMyEvent() {
    closeAccountModal();
    closeMenu();
    navigate("/weddinghostlogin");
  }

  function handleLogout() {
    localStorage.removeItem(LS_WEDDING_HOST_USER_KEY);
    closeAccountModal();
    closeMenu();
    navigate("/weddinghostlogin");
  }

  function handleAccountNavigation() {
    closeMenu();

    if (isLoggedIn) {
      openAccountModal();
      return;
    }

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
          <img
            src={speechStakesIcon}
            alt=""
            className="wedding-header__logo-icon"
            aria-hidden="true"
          />
          <span>SpeechStakes</span>
        </Link>

        <button
          type="button"
          className="wedding-header__right"
          onClick={handleAccountNavigation}
          aria-label={isLoggedIn ? "Go to account" : "Go to login"}
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
                <Link
                  to="/weddingjoin"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="gridicons:add-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Join an event
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
                <button
                  type="button"
                  className="wedding-nav-link wedding-nav-button"
                  onClick={handleAccountNavigation}
                >
                  <Icon
                    icon="codicon:account"
                    className="wedding-sidebar-item-icon"
                  />
                  Login
                </button>
              </li>

              <li>
                <a
                  href="https://www.instagram.com/speechstakes/"
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
                  href="https://www.tiktok.com/@speechstakes"
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
            </ul>
          </aside>
        </>
      )}

      {accountModalOpen && (
        <div
          className="wedding-modal-overlay"
          onClick={closeAccountModal}
          role="presentation"
        >
          <div
            className="wedding-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wedding-account-modal-title"
          >
            <button
              type="button"
              className="wedding-modal__close"
              onClick={closeAccountModal}
              aria-label="Close modal"
            >
              <Icon icon="mdi:close" />
            </button>

            <div className="wedding-modal__icon-wrap">
              <Icon
                icon="mdi:account-circle-outline"
                className="wedding-modal__icon"
              />
            </div>

            <h2
              id="wedding-account-modal-title"
              className="wedding-modal__title"
            >
              Account options
            </h2>

            <p className="wedding-modal__text">
              You’re already logged in. What would you like to do?
            </p>

            <div className="wedding-modal__actions">
              <button
                type="button"
                className="wedding-modal__button wedding-modal__button--primary"
                onClick={handleGoToMyEvent}
              >
                Go to my event
              </button>

              <button
                type="button"
                className="wedding-modal__button wedding-modal__button--secondary"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
