import styles from "./atmosphere.module.css";

/** Decorative only: a lightweight, CSS-led backdrop with no client-side effects. */
export function BrandAtmosphere() {
  return (
    <div className={styles.heroAtmosphere} aria-hidden="true">
      <span className={styles.blueLight} />
      <span className={styles.limeLight} />
      <span className={styles.paperArc} />
      <svg className={styles.contours} viewBox="0 0 1600 1100" preserveAspectRatio="xMidYMin slice" fill="none" focusable="false">
        <g stroke="currentColor" strokeWidth="0.85">
          <ellipse cx="1330" cy="330" rx="510" ry="430" transform="rotate(-24 1330 330)" />
          <ellipse cx="1330" cy="330" rx="550" ry="470" transform="rotate(-24 1330 330)" />
          <ellipse cx="1330" cy="330" rx="590" ry="510" transform="rotate(-24 1330 330)" />
          <path d="M-150 730C180 620 280 1000 720 890S1240 520 1750 650" />
          <path d="M-150 751C180 641 280 1021 720 911S1240 541 1750 671" opacity="0.6" />
        </g>
      </svg>
      <span className={styles.dotField} />
      <span className={styles.lightGlint} />
    </div>
  );
}
