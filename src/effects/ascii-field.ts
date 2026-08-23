type Glyph = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  character: string;
  alpha: number;
  accent: boolean;
};

type PointerState = {
  x: number;
  y: number;
  inside: boolean;
  pressed: boolean;
  suctionUntil: number;
};

const GLYPH_RAMP = ['·', ':', '+', '=', '*', '#', '@'];
const TAU = Math.PI * 2;
const POINTER_RADIUS = 112;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const noiseAt = (x: number, y: number): number => {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

export const initAsciiField = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext('2d');

  if (!context) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const rootStyles = getComputedStyle(document.documentElement);
  const foreground = rootStyles.getPropertyValue('--fg').trim();
  const accent = rootStyles.getPropertyValue('--accent').trim();
  const monoFont = rootStyles.getPropertyValue('--font-mono').trim();
  const pointer: PointerState = {
    x: 0,
    y: 0,
    inside: false,
    pressed: false,
    suctionUntil: 0,
  };

  let glyphs: Glyph[] = [];
  let width = 0;
  let height = 0;
  let fontSize = 10;
  let animationFrame = 0;
  let previousTime = performance.now();
  let visible = true;

  const buildSphere = (): void => {
    glyphs = [];
    fontSize = clamp(width / 58, 8.5, 11.5);

    const columnGap = fontSize * 0.92;
    const rowGap = fontSize * 1.28;
    const radius = Math.min(width * 0.39, height * 0.43);
    const centerX = width * 0.52;
    const centerY = height * 0.47;
    const startX = centerX - radius;
    const startY = centerY - radius;

    for (let y = startY; y <= centerY + radius; y += rowGap) {
      for (let x = startX; x <= centerX + radius; x += columnGap) {
        const normalizedX = (x - centerX) / radius;
        const normalizedY = (y - centerY) / radius;
        const radialDistance = normalizedX ** 2 + normalizedY ** 2;

        if (radialDistance > 1) continue;

        const distance = Math.sqrt(radialDistance);
        const angle = Math.atan2(normalizedY, normalizedX);
        const noise = noiseAt(x, y);
        const brokenArc = angle > -0.62 && angle < 0.18 && distance > 0.4;
        const fragmentedEdge = normalizedX > 0.42 && normalizedY > 0.08 && noise < 0.54;
        const dropout = noise < 0.025 + distance * 0.16;

        if ((brokenArc && noise < 0.72) || fragmentedEdge || dropout) continue;

        const depth = Math.sqrt(1 - radialDistance);
        const light = clamp(0.2 + depth * 0.62 - normalizedX * 0.25 - normalizedY * 0.12, 0, 1);
        const rampIndex = Math.min(Math.floor(light * GLYPH_RAMP.length), GLYPH_RAMP.length - 1);
        const character = GLYPH_RAMP[rampIndex];

        glyphs.push({
          homeX: x,
          homeY: y,
          x,
          y,
          velocityX: 0,
          velocityY: 0,
          character,
          alpha: 0.28 + light * 0.72,
          accent: noise > 0.985 || (distance > 0.92 && noise > 0.94),
        });
      }
    }
  };

  const drawGuides = (): void => {
    context.save();
    context.strokeStyle = 'rgba(240, 240, 235, 0.1)';
    context.lineWidth = 1;
    context.setLineDash([2, 8]);
    context.beginPath();
    context.ellipse(width * 0.52, height * 0.47, width * 0.34, height * 0.12, -0.18, 0, TAU);
    context.stroke();
    context.beginPath();
    context.ellipse(width * 0.52, height * 0.47, width * 0.13, height * 0.39, 0.22, 0, TAU);
    context.stroke();
    context.restore();
  };

  const draw = (): void => {
    context.clearRect(0, 0, width, height);
    drawGuides();
    context.font = `500 ${fontSize}px ${monoFont}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (const glyph of glyphs) {
      context.globalAlpha = glyph.alpha;
      context.fillStyle = glyph.accent ? accent : foreground;
      context.fillText(glyph.character, glyph.x, glyph.y);
    }

    context.globalAlpha = 1;
  };

  const resize = (): void => {
    const bounds = canvas.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) return;

    width = bounds.width;
    height = bounds.height;

    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildSphere();
    draw();
  };

  const updatePointer = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.inside = true;
  };

  const update = (time: number): void => {
    const delta = clamp((time - previousTime) / 16.67, 0.25, 2);
    const suctionActive = pointer.pressed || time < pointer.suctionUntil;

    previousTime = time;

    for (const glyph of glyphs) {
      const offsetX = glyph.x - pointer.x;
      const offsetY = glyph.y - pointer.y;
      const distance = Math.max(Math.hypot(offsetX, offsetY), 1);
      const insidePointerArea = pointer.inside && distance < POINTER_RADIUS;
      const localSuction = suctionActive && insidePointerArea;
      const spring = localSuction ? 0.003 : 0.026;

      glyph.velocityX += (glyph.homeX - glyph.x) * spring * delta;
      glyph.velocityY += (glyph.homeY - glyph.y) * spring * delta;

      if (insidePointerArea) {
        const falloff = 1 - distance / POINTER_RADIUS;

        if (localSuction) {
          const pull = falloff * 0.014 * delta;
          glyph.velocityX -= offsetX * pull;
          glyph.velocityY -= offsetY * pull;
        } else {
          const push = falloff ** 2 * 2.1 * delta;
          glyph.velocityX += (offsetX / distance) * push;
          glyph.velocityY += (offsetY / distance) * push;
        }
      }

      const damping = localSuction ? 0.84 : 0.88;
      glyph.velocityX *= damping ** delta;
      glyph.velocityY *= damping ** delta;
      glyph.x += glyph.velocityX * delta;
      glyph.y += glyph.velocityY * delta;
    }

    draw();

    if (visible && !document.hidden && !reduceMotion.matches && !mobileViewport.matches) {
      animationFrame = requestAnimationFrame(update);
    }
  };

  const start = (): void => {
    cancelAnimationFrame(animationFrame);

    if (reduceMotion.matches || mobileViewport.matches || !visible || document.hidden) {
      draw();
      return;
    }

    previousTime = performance.now();
    animationFrame = requestAnimationFrame(update);
  };

  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    start();
  });

  canvas.addEventListener('pointerenter', updatePointer);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
    pointer.pressed = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    updatePointer(event);
    pointer.pressed = true;
    pointer.suctionUntil = performance.now() + 720;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    pointer.pressed = false;
    pointer.suctionUntil = performance.now() + 520;

    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  document.addEventListener('visibilitychange', start);
  reduceMotion.addEventListener('change', start);
  mobileViewport.addEventListener('change', start);
  resizeObserver.observe(canvas);
  visibilityObserver.observe(canvas);
};
