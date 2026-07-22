import { useEffect, useMemo, useState } from "react";
import { CloudMoon, Heart, Sparkles, Star, Orbit } from "lucide-react";

const SPLASH_IMAGE = "/branding/our-universe-splash.png";

const LOADING_STEPS = [
  { message: "Creating your universe...", icon: CloudMoon },
  { message: "Connecting hearts...", icon: Heart },
  { message: "Collecting your memories...", icon: Sparkles },
  { message: "Preparing your home...", icon: Star },
  { message: "Almost there...", icon: Orbit },
];

function SplashScreen({ onComplete, minimumDuration = 4200 }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const intervalDuration = Math.max(650, Math.floor(minimumDuration / LOADING_STEPS.length));
    const messageTimer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, LOADING_STEPS.length - 1));
    }, intervalDuration);

    let finishTimer;
    const leaveTimer = window.setTimeout(() => {
      setStep(LOADING_STEPS.length - 1);
      setIsLeaving(true);
      finishTimer = window.setTimeout(onComplete, 700);
    }, minimumDuration);

    return () => {
      window.clearInterval(messageTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [minimumDuration, onComplete]);

  const progress = useMemo(
    () => ((step + 1) / LOADING_STEPS.length) * 100,
    [step]
  );

  const ActiveIcon = LOADING_STEPS[step].icon;

  return (
    <div
      className={`our-universe-splash ${
        isLeaving ? "our-universe-splash--leaving" : ""
      }`}
      role="status"
      aria-live="polite"
      aria-label={LOADING_STEPS[step].message}
    >
      <img
        className="our-universe-splash__image"
        src={SPLASH_IMAGE}
        alt="Our Universe"
        draggable="false"
      />

      <div className="our-universe-splash__shade" aria-hidden="true" />
      <div className="our-universe-splash__nebula our-universe-splash__nebula--left" aria-hidden="true" />
      <div className="our-universe-splash__nebula our-universe-splash__nebula--right" aria-hidden="true" />

      <div className="our-universe-splash__sparkles" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
      </div>
      <div className="our-universe-splash__shooting-star" aria-hidden="true" />

      <div className="our-universe-splash__content">
        <p className="our-universe-splash__tagline">
          <Sparkles size={14} />
          A space for us, always.
          <Sparkles size={14} />
        </p>

        <div className="our-universe-splash__status-card">
          <ActiveIcon className="our-universe-splash__status-icon" size={20} aria-hidden="true" />
          <p key={step}>{LOADING_STEPS[step].message}</p>
          <span className="our-universe-splash__status-star" aria-hidden="true">✦</span>
        </div>

        <div className="our-universe-splash__dots" aria-hidden="true">
          {LOADING_STEPS.map((item, index) => (
            <span
              key={item.message}
              className={`${index === step ? "is-active" : ""} ${index < step ? "is-complete" : ""}`}
            >
              {index === step && <Heart size={13} fill="currentColor" />}
            </span>
          ))}
        </div>

        <div className="our-universe-splash__wave" aria-hidden="true">
          <svg viewBox="0 0 600 54" preserveAspectRatio="none">
            <path d="M0 31 C55 31 65 9 116 9 S178 42 232 42 S285 14 340 14 S408 40 464 30 S529 5 600 22" />
          </svg>
          <span style={{ left: `calc(${Math.min(progress, 96)}% - 9px)` }}>
            <Heart size={16} fill="currentColor" />
          </span>
        </div>

        <div className="our-universe-splash__mini-steps" aria-hidden="true">
          {LOADING_STEPS.slice(0, 4).map(({ message, icon: Icon }, index) => (
            <div key={message} className={index <= step ? "is-lit" : ""}>
              <Icon size={19} />
              <small>{message.replace("...", "")}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
