const COUNT = 17;
const MAX_LEFT = 89.8;
const MAX_RIGHT = 89.4;
const SIGMA_LEFT = 0.5;
const SIGMA_RIGHT = 0.5;
const GAP = 36;

const blinds = document.getElementById("blinds");
const plate = document.getElementById("plate");
const scene = document.querySelector(".scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

blinds.style.setProperty("--n", String(COUNT));

const slats = Array.from({ length: COUNT }, (_, index) => {
  const el = document.createElement("div");
  el.className = "slat";
  el.style.setProperty("--i", String(index));
  blinds.appendChild(el);
  return {
    el,
    index,
    x: index / (COUNT - 1),
    follow: 0,
    angle: 0,
    vel: 0,
  };
});

function syncSlatArt() {
  const width = blinds.clientWidth;
  const height = blinds.clientHeight;
  slats.forEach((slat) => {
    slat.el.style.setProperty("--art-w", `${width}px`);
    slat.el.style.setProperty("--art-h", `${height}px`);
    slat.el.style.setProperty("--art-x", `${-slat.el.offsetLeft}px`);
    slat.el.style.setProperty("--art-y", "0px");
  });
  if (plate) {
    plate.style.setProperty("--art-w", `${width}px`);
    plate.style.setProperty("--art-h", `${height}px`);
    plate.style.setProperty("--art-x", "0px");
    plate.style.setProperty("--art-y", "0px");
  }
}

syncSlatArt();
requestAnimationFrame(syncSlatArt);
window.addEventListener("resize", syncSlatArt);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function maxAngleAt(x) {
  return MAX_RIGHT + (MAX_LEFT - MAX_RIGHT) * Math.pow(1 - x, 0.8);
}

function sigmaAt(mouseX) {
  return SIGMA_RIGHT + (SIGMA_LEFT - SIGMA_RIGHT) * (1 - mouseX);
}

function openAmount(slatX, mouseX, sigma) {
  const flat = sigma * 0.48;
  const fall = Math.max(0.001, sigma - flat);
  let platL = mouseX - flat;
  let platR = mouseX + flat;
  if (mouseX < 0.38) platL = 0;
  if (mouseX > 0.62) platR = 1;

  if (slatX >= platL && slatX <= platR) return 1;
  const dist = slatX < platL ? platL - slatX : slatX - platR;
  if (dist >= fall) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * dist) / fall));
}

function targetFor(slat, mouseX) {
  return openAmount(slat.x, mouseX, sigmaAt(mouseX)) * maxAngleAt(slat.x);
}

if (reduceMotion) {
  slats.forEach((slat) => {
    slat.el.style.transform = "rotateY(0deg)";
  });
  if (plate) plate.style.opacity = "1";
} else {
  const fineQuery = window.matchMedia("(pointer: fine)");
  let finePointer = fineQuery.matches;
  const pointer = { raw: 0.5, x: 0.5 };
  let plateOpacity = 1;
  let last = performance.now();
  let heroVisible = true;

  const SWEEP_MIN = 0.16;
  const SWEEP_MAX = 0.84;
  const SWEEP_MS = 10000;
  const PAUSE_MS = 1400;
  const AUTO_CYCLE = (SWEEP_MS + PAUSE_MS) * 2;

  function autoPointer(now) {
    const t = now % AUTO_CYCLE;
    if (t < SWEEP_MS) {
      const ease = 0.5 - 0.5 * Math.cos((Math.PI * t) / SWEEP_MS);
      return SWEEP_MIN + (SWEEP_MAX - SWEEP_MIN) * ease;
    }
    if (t < SWEEP_MS + PAUSE_MS) return SWEEP_MAX;
    if (t < SWEEP_MS * 2 + PAUSE_MS) {
      const u = (t - SWEEP_MS - PAUSE_MS) / SWEEP_MS;
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * u);
      return SWEEP_MAX - (SWEEP_MAX - SWEEP_MIN) * ease;
    }
    return SWEEP_MIN;
  }

  function onMove(event) {
    if (!finePointer) return;
    const rect = blinds.getBoundingClientRect();
    pointer.raw = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  if (fineQuery.addEventListener) {
    fineQuery.addEventListener("change", (event) => {
      finePointer = event.matches;
    });
  } else if (fineQuery.addListener) {
    fineQuery.addListener((event) => {
      finePointer = event.matches;
    });
  }

  const stage = document.querySelector(".stage");
  if (stage && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
      },
      { threshold: 0.12 }
    );
    io.observe(stage);
  }

  function tick(now) {
    if (!heroVisible) {
      last = now;
      requestAnimationFrame(tick);
      return;
    }

    const dt = clamp((now - last) / 1000, 0.001, 0.04);
    last = now;

    if (!finePointer) pointer.raw = autoPointer(now);

    pointer.x += (pointer.raw - pointer.x) * (1 - Math.exp(-dt / 0.14));
    if (scene) {
      scene.style.perspectiveOrigin = `${18 + pointer.x * 64}% 50%`;
    }

    let maxAbs = 0;

    slats.forEach((slat) => {
      const tau = 0.08 + Math.abs(slat.x - pointer.x) * 0.14;
      const target = targetFor(slat, pointer.x);
      slat.follow += (target - slat.follow) * (1 - Math.exp(-dt / tau));

      const omega = 7.2;
      const zeta = 1.08;
      const accel = omega * omega * (slat.follow - slat.angle) - 2 * zeta * omega * slat.vel;
      slat.vel += accel * dt;
      slat.angle += slat.vel * dt;

      maxAbs = Math.max(maxAbs, Math.abs(slat.angle));
    });

    const extras = slats.map((slat) => {
      const opened = Math.sin((Math.abs(slat.angle) * Math.PI) / 180);
      return opened * (GAP + slat.x * 40);
    });
    const shift = extras.reduce((sum, extra) => sum + extra, 0) * -0.5;
    let cursor = shift;
    slats.forEach((slat, index) => {
      slat.el.style.transform = `translate3d(${cursor}px, 0, 0) rotateY(${slat.angle}deg)`;
      cursor += extras[index];
    });

    const plateTarget = clamp(1 - maxAbs / 4, 0, 1);
    plateOpacity += (plateTarget - plateOpacity) * (1 - Math.exp(-dt / 0.16));
    if (plate) plate.style.opacity = String(plateOpacity);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const featuredSection = document.querySelector(".featured");
const featuredCard = document.querySelector(".featured__card");
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (featuredSection && featuredCard) {
  const followCard = finePointer && !reduceMotion;

  if (!followCard) {
    featuredSection.classList.add("is-card-static");
  } else {
    featuredSection.classList.add("is-card-follow");

    const pointer = { x: 0, y: 0, inside: false };
    const pos = { x: 0, y: 0 };
    let lastCard = performance.now();
    let cardRaf = 0;

    function cardTarget(x, y) {
      const width = featuredCard.offsetWidth;
      const height = featuredCard.offsetHeight;
      const pad = 12;
      const gap = 24;
      let left = x + gap;
      let top = y + gap;
      if (left + width > window.innerWidth - pad) left = x - width - gap;
      if (top + height > window.innerHeight - pad) top = y - height - gap;
      return {
        left: clamp(left, pad, Math.max(pad, window.innerWidth - width - pad)),
        top: clamp(top, pad, Math.max(pad, window.innerHeight - height - pad)),
      };
    }

    function tickCard(now) {
      const dt = clamp((now - lastCard) / 1000, 0.001, 0.04);
      lastCard = now;
      const target = cardTarget(pointer.x, pointer.y);
      const k = 1 - Math.exp(-dt / 0.14);
      pos.x += (target.left - pos.x) * k;
      pos.y += (target.top - pos.y) * k;
      featuredCard.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (pointer.inside) cardRaf = requestAnimationFrame(tickCard);
    }

    function setCardInside(inside) {
      if (inside === pointer.inside) return;
      pointer.inside = inside;
      featuredSection.classList.toggle("is-card-on", inside);
      cancelAnimationFrame(cardRaf);
      if (!inside) return;
      const target = cardTarget(pointer.x, pointer.y);
      pos.x = target.left;
      pos.y = target.top;
      featuredCard.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      lastCard = performance.now();
      cardRaf = requestAnimationFrame(tickCard);
    }

    function pointerOverSection(x, y) {
      const box = featuredSection.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        setCardInside(pointerOverSection(pointer.x, pointer.y));
      },
      { passive: true }
    );

    window.addEventListener(
      "scroll",
      () => setCardInside(pointerOverSection(pointer.x, pointer.y)),
      { passive: true }
    );
  }
}
