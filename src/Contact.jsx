import React from "react";
import { Icon } from "@iconify/react";
import "./WeddingApp.css";

export default function Contact() {
  return (
    <div className="home-container">
      <div className="screen wedding-home ss-editorial">
        <div className="ss-card ss-contact-card">
          <div className="ss-header ss-contact-header">
            <h1 className="ss-title">Need help?</h1>
            <p className="ss-subtitle ss-subtitle--wide">
              If you have any questions, issues, or need a hand setting up your
              event, get in touch and we’ll be happy to help.
            </p>
          </div>

          <div className="ss-contact-methods">
            <a
              className="ss-contact-method"
              href="mailto:speechstakes@gmail.com"
            >
              <div className="ss-contact-icon-wrap">
                <Icon icon="mdi:email-outline" className="ss-contact-icon" />
              </div>

              <div className="ss-contact-content">
                <div className="ss-contact-label">Email us</div>
                <div className="ss-contact-value">speechstakes@gmail.com</div>
                <div className="ss-contact-copy">
                  Best for general questions, support, or account issues.
                </div>
              </div>

              <Icon icon="mdi:chevron-right" className="ss-contact-chevron" />
            </a>

            <a
              className="ss-contact-method"
              href="https://wa.me/353862101524"
              target="_blank"
              rel="noreferrer"
            >
              <div className="ss-contact-icon-wrap ss-contact-icon-wrap--whatsapp">
                <Icon icon="mdi:whatsapp" className="ss-contact-icon" />
              </div>

              <div className="ss-contact-content">
                <div className="ss-contact-label">WhatsApp us</div>
                <div className="ss-contact-value">+353862101524</div>
                <div className="ss-contact-copy">
                  Send us a quick message if you’d prefer to chat on WhatsApp.
                </div>
              </div>

              <Icon icon="mdi:chevron-right" className="ss-contact-chevron" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
