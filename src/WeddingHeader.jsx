import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

export default function WeddingHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);

  const isWeddingHome = location.pathname === "/weddinghome";

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

    navigate("/weddinghome");
  }

  function handleAccountClick() {
    console.log("Open wedding account modal");
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
            <Icon icon="mdi:home-outline" className="wedding-header__icon" />
          )}
        </button>

        <Link
          to="/weddinghome"
          className="wedding-header__title"
          onClick={closeMenu}
        >
          Speechstakes
        </Link>

        <button
          type="button"
          className="wedding-header__right"
          onClick={handleAccountClick}
          aria-label="Account"
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
                <Link
                  to="/weddinghome"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:home-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  Home
                </Link>
              </li>

              <li>
                <Link
                  to="/weddinghostlogin"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:login"
                    className="wedding-sidebar-item-icon"
                  />
                  Login
                </Link>
              </li>

              <li>
                <Link
                  to="/weddingabout"
                  className="wedding-nav-link"
                  onClick={closeMenu}
                >
                  <Icon
                    icon="mdi:information-outline"
                    className="wedding-sidebar-item-icon"
                  />
                  About
                </Link>
              </li>
            </ul>
          </aside>
        </>
      )}
    </>
  );
}
