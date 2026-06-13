"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

const LOGO_SRC = "/The_Year_of_the_fire_academy%20(1).svg";

const METEOR_PARTICLES = [
  {
    id: "ember-a",
    top: "7%",
    left: "11%",
    size: "3px",
    drift: "34vw",
    fall: "21vh",
    delay: "0.08s",
    duration: "1.9s",
    opacity: 0.9,
  },
  {
    id: "ember-b",
    top: "15%",
    left: "67%",
    size: "2px",
    drift: "28vw",
    fall: "17vh",
    delay: "0.28s",
    duration: "2.4s",
    opacity: 0.62,
  },
  {
    id: "ember-c",
    top: "23%",
    left: "29%",
    size: "4px",
    drift: "41vw",
    fall: "26vh",
    delay: "0.14s",
    duration: "2.1s",
    opacity: 0.84,
  },
  {
    id: "ember-d",
    top: "31%",
    left: "81%",
    size: "2px",
    drift: "23vw",
    fall: "14vh",
    delay: "0.46s",
    duration: "2.7s",
    opacity: 0.58,
  },
  {
    id: "ember-e",
    top: "42%",
    left: "8%",
    size: "2px",
    drift: "48vw",
    fall: "30vh",
    delay: "0.36s",
    duration: "2.3s",
    opacity: 0.72,
  },
  {
    id: "ember-f",
    top: "53%",
    left: "47%",
    size: "3px",
    drift: "36vw",
    fall: "19vh",
    delay: "0.2s",
    duration: "2.6s",
    opacity: 0.78,
  },
  {
    id: "ember-g",
    top: "64%",
    left: "19%",
    size: "2px",
    drift: "31vw",
    fall: "16vh",
    delay: "0.58s",
    duration: "2.2s",
    opacity: 0.66,
  },
  {
    id: "ember-h",
    top: "72%",
    left: "72%",
    size: "5px",
    drift: "26vw",
    fall: "24vh",
    delay: "0.1s",
    duration: "2s",
    opacity: 0.88,
  },
  {
    id: "ember-i",
    top: "84%",
    left: "38%",
    size: "2px",
    drift: "44vw",
    fall: "20vh",
    delay: "0.42s",
    duration: "2.5s",
    opacity: 0.6,
  },
  {
    id: "ember-j",
    top: "12%",
    left: "43%",
    size: "2px",
    drift: "38vw",
    fall: "28vh",
    delay: "0.68s",
    duration: "2.8s",
    opacity: 0.7,
  },
  {
    id: "ember-k",
    top: "36%",
    left: "58%",
    size: "3px",
    drift: "30vw",
    fall: "22vh",
    delay: "0s",
    duration: "2.15s",
    opacity: 0.82,
  },
  {
    id: "ember-l",
    top: "58%",
    left: "89%",
    size: "2px",
    drift: "25vw",
    fall: "18vh",
    delay: "0.34s",
    duration: "2.35s",
    opacity: 0.55,
  },
];

export default function OpeningAnimation() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="opening-animation fixed inset-0 z-[100] overflow-hidden bg-ink-950 text-white"
      aria-label="26アカデミー オープニングアニメーション"
      role="status"
    >
      <div className="opening-aurora opening-aurora-one" />
      <div className="opening-aurora opening-aurora-two" />
      <div className="opening-grid" />
      <div className="opening-meteor-field" aria-hidden="true">
        {METEOR_PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="opening-meteor-particle"
            style={
              {
                "--meteor-top": particle.top,
                "--meteor-left": particle.left,
                "--meteor-size": particle.size,
                "--meteor-drift": particle.drift,
                "--meteor-fall": particle.fall,
                "--meteor-delay": particle.delay,
                "--meteor-duration": particle.duration,
                "--meteor-opacity": particle.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="opening-emblem-wrap relative">
          <div className="opening-orbit opening-orbit-one" />
          <div className="opening-orbit opening-orbit-two" />
          <div className="opening-logo-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="26アカデミー ロゴ"
            className="opening-logo relative z-10 h-40 w-40 object-contain sm:h-52 sm:w-52"
          />
        </div>

        <div className="opening-copy mt-10">
          <p className="opening-kicker text-xs font-semibold uppercase tracking-[0.6em] text-white/60 sm:text-sm">
            The Year of the Fire Academy
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-[0.12em] text-white sm:text-5xl">
            26アカデミー
          </h1>
          <p className="mt-3 text-sm font-medium tracking-[0.25em] text-white/70 sm:text-base">
            例会SNS、開幕。
          </p>
        </div>

        <div className="opening-progress mt-10 h-1 w-56 overflow-hidden rounded-full bg-white/10 sm:w-72">
          <div className="opening-progress-bar h-full rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
