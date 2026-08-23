import './styles.css';
import { initAsciiField } from './effects/ascii-field';

const bootCount = document.querySelector<HTMLOutputElement>('[data-boot-count]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (bootCount && !reduceMotion) {
  const startedAt = performance.now();
  const duration = 1620;

  const updateCount = (now: number): void => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    bootCount.value = Math.round(easedProgress * 100)
      .toString()
      .padStart(3, '0');

    if (progress < 1) requestAnimationFrame(updateCount);
  };

  requestAnimationFrame(updateCount);
} else if (bootCount) {
  bootCount.value = '100';
}

const asciiCanvas = document.querySelector<HTMLCanvasElement>('[data-ascii-field]');

if (asciiCanvas) initAsciiField(asciiCanvas);

document.addEventListener('contextmenu', (event) => event.preventDefault());
