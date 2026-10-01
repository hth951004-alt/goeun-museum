const COUNT = 17;
const MAX_LEFT = 89.8;
const MAX_RIGHT = 89.4;
const GAP = 72;
const REST_SCALE = 1.35;
const FACE_SCALE = 4.2;
const SPACING = 1 / (COUNT - 1);

const SHOWS = [
  {
    src: "assets/featured-73.png",
    href: "fluid-scape.html",
    label: "흐르는 도시 FLUID SCAPE",
  },
  {
    src: "assets/exhibition-50.png",
    href: "fluid-scape.html",
    label: "SEED STORIES",
  },
  {
    src: "assets/exhibition-69.png",
    href: "fluid-scape.html",
    label: "STILL SEA",
  },
  {
    src: "assets/exhibition-67.png",
    href: "fluid-scape.html",
    label: "TAL",
  },
  {
    src: "assets/exhibition-68.png",
    href: "fluid-scape.html",
    label: "VOLUME",
  },
  {
    src: "assets/exhibition-55.png",
    href: "fluid-scape.html",
    label: "SEED STORIES",
  },
  {
    src: "assets/exhibition-70.png",
    href: "fluid-scape.html",
    label: "TAL",
  },
];

const blinds = document.getElementById("exhibit-blinds");
const scene = document.querySelector(".stage--exhibits .scene");
const hero = document.querySelector(".stage--exhibits .hero");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (blinds) {
  blinds.style.setProperty("--n", String(COUNT));

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function maxAngleAt(x) {
    return MAX_RIGHT + (MAX_LEFT - MAX_RIGHT) * Math.pow(1 - x, 0.8);
  }

  function faceAmount(slatX, mouseX) {
    const dist = Math.abs(slatX - mouseX) / SPACING;
    const radius = 1.85;
    if (dist >= radius) return 0;
    const lobe = 0.5 * (1 + Math.cos((Math.PI * dist) / radius));
    return Math.pow(lobe, 1.7);
  }

  const slats = Array.from({ length: COUNT }, (_, index) => {
    const show = SHOWS[index % SHOWS.length];
    const el = document.createElement("a");
    el.className = "slat";
    el.href = show.href;
    el.setAttribute("aria-label", show.label);
    el.style.setProperty("--i", String(index));
    el.style.setProperty("--photo", `url("${show.src}")`);
    blinds.appendChild(el);
    const rest = maxAngleAt(index / (COUNT - 1));
    return {
      el,
      index,
      x: index / (COUNT - 1),
      rest,
      follow: rest,
      angle: rest,
      vel: 0,
      widen: REST_SCALE,
      restC: 0,
      hitL: 0,
      hitR: 0,
    };
  });

  const pointer = { raw: 0.5, x: 0.5, inside: false, engage: 0, index: 8 };

  const hit = document.createElement("a");
  hit.className = "exhibit-hit";
  hit.tabIndex = -1;
  hit.setAttribute("aria-hidden", "true");
  if (hero) hero.appendChild(hit);

  function faceOf(slat) {
    return 1 - Math.min(1, Math.abs(slat.angle) / Math.max(1, slat.rest));
  }

  function currentShow() {
    return slats[clamp(pointer.index, 0, COUNT - 1)];
  }

  function syncHit() {
    const slat = currentShow();
    hit.href = slat.el.href;
    hit.setAttribute("aria-label", slat.el.getAttribute("aria-label") || "전시 보기");
  }

  function extrasFor() {
    return slats.map((slat) => {
      const opened = Math.sin((slat.rest * Math.PI) / 180);
      return opened * (GAP + slat.x * 52);
    });
  }

  function cssLeft(slat, width) {
    const restW = (width / COUNT) * REST_SCALE;
    return slat.index * (width - restW) / Math.max(1, COUNT - 1);
  }

  function cacheRestHits() {
    const width = blinds.clientWidth;
    const restW = (width / COUNT) * REST_SCALE;
    const extras = extrasFor();
    const shift = extras.reduce((sum, extra) => sum + extra, 0) * -0.5;
    let cursor = shift;
    slats.forEach((slat, index) => {
      slat.restC = cssLeft(slat, width) + restW * 0.5 + cursor;
      cursor += extras[index];
    });
  }

  function slatAtLocalX(localX) {
    const open = slats[pointer.index];
    if (open && pointer.engage > 0.2 && faceOf(open) > 0.28) {
      if (localX >= open.hitL && localX <= open.hitR) return open;
    }

    let best = slats[0];
    let bestDist = Infinity;
    slats.forEach((slat) => {
      const dist = Math.abs(localX - slat.restC);
      if (dist < bestDist) {
        bestDist = dist;
        best = slat;
      }
    });
    return best;
  }

  function layoutSpread(widenFace = true) {
    const extras = extrasFor();
    const shift = extras.reduce((sum, extra) => sum + extra, 0) * -0.5;
    const width = blinds.clientWidth;
    const unit = width / COUNT;
    const peak = slats.reduce((best, slat) => Math.max(best, faceOf(slat)), 0);
    const push = peak * 64 * pointer.engage;
    let cursor = shift;
    slats.forEach((slat, index) => {
      const face = faceOf(slat);
      const extraW = (slat.widen - REST_SCALE) * unit;
      const away = Math.tanh(((slat.x - pointer.x) / SPACING) * 1.1);
      if (widenFace) {
        slat.el.style.setProperty("--s", String(slat.widen));
        slat.el.style.zIndex = String(Math.round(face * 120 + slat.index));
      }
      const x = cursor + away * push - extraW * 0.5;
      const boxW = unit * slat.widen;
      slat.hitL = cssLeft(slat, width) + x;
      slat.hitR = slat.hitL + boxW;
      slat.el.style.transform = `translate3d(${x}px, 0, ${face * 80}px) rotateY(${slat.angle}deg)`;
      cursor += extras[index];
    });
  }

  function onMove(event) {
    const rect = blinds.getBoundingClientRect();
    pointer.inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (pointer.inside) {
      const picked = slatAtLocalX(event.clientX - rect.left);
      pointer.index = picked.index;
      pointer.raw = picked.x;
      syncHit();
    }
  }

  let pressed = false;

  function goToShow(event) {
    onMove(event);
    const slat = currentShow();
    syncHit();
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    window.location.assign(slat.el.href);
  }

  hit.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pressed = true;
    onMove(event);
  });
  hit.addEventListener("pointermove", onMove, { passive: true });
  hit.addEventListener("pointerleave", () => {
    pointer.inside = false;
  });
  hit.addEventListener("pointerup", (event) => {
    if (event.button !== 0 || !pressed) return;
    pressed = false;
    goToShow(event);
  });
  hit.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goToShow(event);
  });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("mousemove", onMove, { passive: true });
  cacheRestHits();
  requestAnimationFrame(cacheRestHits);
  window.addEventListener("resize", cacheRestHits);
  syncHit();

  if (reduceMotion || !finePointer) {
    slats.forEach((slat) => {
      slat.angle = 0;
    });
    layoutSpread(false);
    syncHit();
  } else {
    let last = performance.now();

    function tick(now) {
      const dt = clamp((now - last) / 1000, 0.001, 0.04);
      last = now;

      pointer.x += (pointer.raw - pointer.x) * (1 - Math.exp(-dt / 0.1));
      const engageTau = pointer.inside ? 0.09 : 0.2;
      pointer.engage +=
        ((pointer.inside ? 1 : 0) - pointer.engage) * (1 - Math.exp(-dt / engageTau));
      if (scene) {
        scene.style.perspectiveOrigin = `${34 + pointer.x * 32}% 50%`;
      }

      slats.forEach((slat) => {
        const target =
          slat.rest * (1 - faceAmount(slat.x, pointer.raw) * pointer.engage);
        const tau = 0.06 + Math.abs(slat.x - pointer.raw) * 0.1;
        slat.follow += (target - slat.follow) * (1 - Math.exp(-dt / tau));

        const omega = 6.1;
        const zeta = 1.14;
        const accel =
          omega * omega * (slat.follow - slat.angle) - 2 * zeta * omega * slat.vel;
        slat.vel += accel * dt;
        slat.angle += slat.vel * dt;

        const face = faceOf(slat);
        const desired =
          REST_SCALE + (FACE_SCALE - REST_SCALE) * Math.pow(face, 2.1);
        slat.widen += (desired - slat.widen) * (1 - Math.exp(-dt / 0.08));
      });

      layoutSpread();
      syncHit();
      requestAnimationFrame(tick);
    }

    layoutSpread();
    requestAnimationFrame(tick);
  }
}
