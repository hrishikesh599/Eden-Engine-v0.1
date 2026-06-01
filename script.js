const canvas = document.getElementById("garden");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const plants = [];
const seeds = [];
const rainParticles = [];
const fireflies = [];
const fallingSeeds = [];

let timeScale = 1;
let worldTime = 0;
let watering = false;

let mouseX = 0;
let mouseY = 0;

function setTimeScale(scale) {
  timeScale = scale;
}

// =========================
// DNA SYSTEM
// =========================

function createDNA() {
  return {
    growthRate: 0.00008 + Math.random() * 0.00012,
    maxSegments: 10 + Math.floor(Math.random() * 22),
    branchChance: 0.15 + Math.random() * 0.4,
    leafSize: 14 + Math.random() * 10,
    flowerHue: Math.random() * 360,
    leanStrength: 0.1 + Math.random() * 0.25,
    hue: 90 + Math.random() * 60
  };
}

// =========================
// SEED
// =========================

class Seed {

  constructor(x, y, dna = createDNA()) {

    this.x = x;
    this.y = y;

    this.age = 0;

    this.germinated = false;

    this.dna = dna;
  }

  update() {

    this.age += 0.00035 * timeScale;

    if (
      this.age > 1 &&
      !this.germinated
    ) {

      this.germinated = true;

      plants.push(
        new Plant(
          this.x,
          this.y,
          this.dna
        )
      );
    }
  }

  draw() {

    ctx.fillStyle = "#3b2a1c";

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      4,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }
}

// =========================
// PLANT
// =========================

class Plant {

  constructor(x, y, dna) {

    this.x = x;
    this.y = y;

    this.dna = dna;

    this.segments = [];

    this.branches = [];

    this.growthTimer = 0;

    this.finished = false;

    this.dead = false;

    this.water = 100;

    this.energy = 50;

    this.sunlight = 1;

    this.windOffset = Math.random() * 1000;

    this.seedDropped = false;
  }

  calculateSunlight() {

    let sunlight = 1;

    plants.forEach(other => {

      if (other === this) return;

      const dx =
        Math.abs(other.x - this.x);

      if (
        dx < 90 &&
        other.segments.length >
        this.segments.length
      ) {

        sunlight -= 0.35;
      }
    });

    this.sunlight =
      Math.max(0.15, sunlight);
  }

  photosynthesis(daylight) {

    if (this.dead) return;

    this.energy +=
      daylight *
      this.sunlight *
      0.012 *
      timeScale;

    this.water -=
      0.0015 *
      this.segments.length *
      timeScale;

    if (
      this.water <= 0 ||
      this.energy <= 0
    ) {

      this.dead = true;
    }

    this.water =
      Math.min(100, this.water);

    this.energy =
      Math.min(100, this.energy);
  }

  growSegment(parent = null) {

    if (
      this.dead ||
      this.energy < 10 ||
      this.water < 10
    ) return;

    let x = this.x;
    let y = this.y;

    let angle = -Math.PI / 2;

    let list = this.segments;

    if (parent) {
      list = parent.segments;
    }

    if (list.length > 0) {

      const prev =
        list[list.length - 1];

      x = prev.endX;
      y = prev.endY;

      angle = prev.angle;
    }

    angle +=
      (0.5 - this.sunlight) *
      -this.dna.leanStrength;

    angle +=
      (Math.random() - 0.5) * 0.3;

    const length =
      7 + Math.random() * 10;

    const thickness =
      Math.max(
        1,
        5 - list.length * 0.2
      );

    const endX =
      x + Math.cos(angle) * length;

    const endY =
      y + Math.sin(angle) * length;

    list.push({
      x,
      y,
      endX,
      endY,
      angle,
      renderAngle: angle,
      length,
      thickness
    });

    this.energy -= 3;
    this.water -= 2;
  }

  maybeBranch() {

    if (
      Math.random() <
      this.dna.branchChance &&
      this.segments.length > 5
    ) {

      const index =
        Math.floor(
          Math.random() *
          (this.segments.length - 2)
        );

      const source =
        this.segments[index];

      this.branches.push({
        startIndex: index,
        angleOffset:
          (Math.random() > 0.5 ? 1 : -1) *
          (0.4 + Math.random() * 0.5),
        segments: [],
        source
      });
    }
  }

  spreadSeeds() {

    if (
      this.finished &&
      !this.seedDropped
    ) {

      this.seedDropped = true;

      for (let i = 0; i < 3; i++) {

        fallingSeeds.push({
          x: this.x,
          y: this.y - 100,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0,
          dna: this.dna
        });
      }
    }
  }

  update(daylight) {

    if (this.dead) return;

    this.calculateSunlight();

    this.photosynthesis(daylight);

    this.growthTimer +=
      this.dna.growthRate *
      this.energy *
      0.02 *
      timeScale;

    if (this.growthTimer > 1) {

      this.growthTimer = 0;

      if (
        this.segments.length <
        this.dna.maxSegments
      ) {

        this.growSegment();

        if (Math.random() < 0.08) {
          this.maybeBranch();
        }

      } else {

        if (
          this.energy > 70 &&
          this.water > 40
        ) {

          this.finished = true;
        }
      }
    }

    const wind =
      Math.sin(
        Date.now() * 0.0007 +
        this.windOffset
      ) * 0.08;

    this.segments.forEach((seg, i) => {

      seg.renderAngle =
        seg.angle +
        Math.sin(
          Date.now() * 0.001 +
          i * 0.4 +
          this.windOffset
        ) * 0.04 +
        wind;

      if (i > 0) {

        const prev =
          this.segments[i - 1];

        seg.x =
          prev.x +
          Math.cos(prev.renderAngle) *
          prev.length;

        seg.y =
          prev.y +
          Math.sin(prev.renderAngle) *
          prev.length;
      }

      seg.endX =
        seg.x +
        Math.cos(seg.renderAngle) *
        seg.length;

      seg.endY =
        seg.y +
        Math.sin(seg.renderAngle) *
        seg.length;
    });

    this.branches.forEach(branch => {

      if (
        branch.segments.length < 5 &&
        Math.random() < 0.01
      ) {

        let bx = branch.source.endX;
        let by = branch.source.endY;

        let angle =
          branch.source.angle +
          branch.angleOffset;

        if (branch.segments.length > 0) {

          const prev =
            branch.segments[
              branch.segments.length - 1
            ];

          bx = prev.endX;
          by = prev.endY;
          angle = prev.angle;
        }

        const length =
          6 + Math.random() * 7;

        branch.segments.push({
          x: bx,
          y: by,
          angle,
          renderAngle: angle,
          length,
          thickness: 1.5,
          endX:
            bx + Math.cos(angle) * length,
          endY:
            by + Math.sin(angle) * length
        });
      }
    });

    this.spreadSeeds();
  }

  draw() {

    const health =
      Math.max(0, this.water / 100);

    this.segments.forEach((seg, i) => {

      const brightness =
        20 + health * 30;

      ctx.strokeStyle =
        `hsl(
          ${this.dna.hue},
          50%,
          ${brightness}%
        )`;

      ctx.lineWidth =
        seg.thickness;

      ctx.beginPath();

      ctx.moveTo(seg.x, seg.y);

      ctx.quadraticCurveTo(
        (seg.x + seg.endX) / 2 +
        Math.sin(i) * 3,

        (seg.y + seg.endY) / 2,

        seg.endX,
        seg.endY
      );

      ctx.stroke();

      if (i > 1) {

        drawLeaf(
          seg.endX,
          seg.endY,
          this.dna.hue,
          seg.renderAngle,
          health,
          this.dna.leafSize
        );
      }
    });

    this.branches.forEach(branch => {

      branch.segments.forEach(seg => {

        ctx.strokeStyle =
          `hsl(${this.dna.hue},50%,30%)`;

        ctx.lineWidth = 1.5;

        ctx.beginPath();

        ctx.moveTo(seg.x, seg.y);

        ctx.lineTo(seg.endX, seg.endY);

        ctx.stroke();
      });
    });

    if (
      this.finished &&
      this.segments.length > 0
    ) {

      const top =
        this.segments[
          this.segments.length - 1
        ];

      drawFlower(
        top.endX,
        top.endY,
        this.dna.flowerHue
      );
    }
  }
}

// =========================
// VISUALS
// =========================

function drawLeaf(
  x,
  y,
  hue,
  angle,
  health,
  size
) {

  ctx.save();

  ctx.translate(x, y);

  ctx.rotate(angle);

  ctx.fillStyle =
    `hsl(
      ${hue},
      70%,
      ${35 + health * 25}%
    )`;

  ctx.shadowBlur = 10;

  ctx.shadowColor =
    `hsl(${hue},80%,60%)`;

  ctx.beginPath();

  ctx.moveTo(0, 0);

  ctx.quadraticCurveTo(
    size,
    -size * 0.4,
    size * 1.8,
    0
  );

  ctx.quadraticCurveTo(
    size,
    size * 0.4,
    0,
    0
  );

  ctx.fill();

  ctx.restore();
}

function drawFlower(x, y, hue) {

  ctx.save();

  ctx.translate(x, y);

  ctx.rotate(
    Date.now() * 0.0004
  );

  for (let i = 0; i < 8; i++) {

    ctx.rotate(Math.PI / 4);

    ctx.fillStyle =
      `hsl(${hue + i * 8},90%,70%)`;

    ctx.shadowBlur = 20;

    ctx.shadowColor =
      `hsl(${hue},90%,70%)`;

    ctx.beginPath();

    ctx.ellipse(
      0,
      10,
      5,
      12,
      0,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.fillStyle = "#fff7ad";

  ctx.beginPath();

  ctx.arc(
    0,
    0,
    5,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}

// =========================
// BACKGROUND
// =========================

function drawBackground() {

  const cycle =
    (Math.sin(worldTime) + 1) / 2;

  const topR = 10 + cycle * 70;
  const topG = 15 + cycle * 120;
  const topB = 35 + cycle * 190;

  const bottomR = 15 + cycle * 50;
  const bottomG = 20 + cycle * 70;
  const bottomB = 30 + cycle * 100;

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );

  gradient.addColorStop(
    0,
    `rgb(${topR},${topG},${topB})`
  );

  gradient.addColorStop(
    1,
    `rgb(${bottomR},${bottomG},${bottomB})`
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // stars

  if (cycle < 0.4) {

    ctx.fillStyle =
      `rgba(255,255,255,${
        (0.4 - cycle) * 2
      })`;

    for (let i = 0; i < 120; i++) {

      const x =
        (i * 137.5) % canvas.width;

      const y =
        (i * 91.7) %
        (canvas.height * 0.7);

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        1.2,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  }

  // sun + moon

  const orbitRadiusX =
    canvas.width * 0.45;

  const orbitRadiusY =
    canvas.height * 0.45;

  const centerX =
    canvas.width / 2;

  const centerY =
    canvas.height * 0.9;

  const angle = worldTime;

  const sunX =
    centerX +
    Math.cos(angle - Math.PI) *
    orbitRadiusX;

  const sunY =
    centerY +
    Math.sin(angle - Math.PI) *
    orbitRadiusY;

  const moonX =
    centerX +
    Math.cos(angle) *
    orbitRadiusX;

  const moonY =
    centerY +
    Math.sin(angle) *
    orbitRadiusY;

  if (cycle > 0.15) {

    ctx.beginPath();

    ctx.arc(
      sunX,
      sunY,
      45,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      `rgba(255,220,120,${cycle})`;

    ctx.shadowBlur = 80;

    ctx.shadowColor =
      "rgba(255,200,120,0.8)";

    ctx.fill();
  }

  if (cycle < 0.65) {

    ctx.beginPath();

    ctx.arc(
      moonX,
      moonY,
      30,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      `rgba(220,230,255,${1 - cycle})`;

    ctx.shadowBlur = 40;

    ctx.shadowColor =
      "rgba(180,210,255,0.7)";

    ctx.fill();
  }

  ctx.shadowBlur = 0;

  // ground

  ctx.fillStyle =
    `rgb(
      ${18 + cycle * 12},
      ${18 + cycle * 16},
      15
    )`;

  ctx.fillRect(
    0,
    canvas.height - 80,
    canvas.width,
    80
  );

  // grass

  for (
    let i = 0;
    i < canvas.width;
    i += 8
  ) {

    const h =
      15 +
      Math.sin(
        i * 0.05 +
        Date.now() * 0.0015
      ) * 5;

    ctx.strokeStyle =
      `rgba(
        ${40 + cycle * 50},
        ${70 + cycle * 110},
        40,
        0.8
      )`;

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      i,
      canvas.height - 80
    );

    ctx.quadraticCurveTo(
      i + 4,
      canvas.height - 80 - h,
      i + 8,
      canvas.height - 80
    );

    ctx.stroke();
  }
}

// =========================
// WATERING
// =========================

window.addEventListener(
  "mousemove",
  e => {

    mouseX = e.clientX;
    mouseY = e.clientY;
  }
);

function waterPlants() {

  if (!watering) return;

  for (let i = 0; i < 10; i++) {

    rainParticles.push({
      x:
        mouseX +
        (Math.random() - 0.5) * 40,

      y: mouseY,

      vy: 2 + Math.random() * 3
    });
  }

  plants.forEach(plant => {

    const dx =
      plant.x - mouseX;

    const dy =
      plant.y - mouseY;

    const dist =
      Math.sqrt(dx * dx + dy * dy);

    if (dist < 140) {

      plant.water += 0.25;

      plant.water =
        Math.min(100, plant.water);
    }
  });
}

function updateRain() {

  for (
    let i = rainParticles.length - 1;
    i >= 0;
    i--
  ) {

    const p = rainParticles[i];

    p.y += p.vy;

    ctx.fillStyle =
      "rgba(120,170,255,0.7)";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    if (p.y > canvas.height) {
      rainParticles.splice(i, 1);
    }
  }
}

// =========================
// FIRELIES
// =========================

class Firefly {

  constructor() {

    this.x = Math.random() * canvas.width;

    this.y =
      Math.random() *
      canvas.height * 0.7;

    this.offset = Math.random() * 1000;
  }

  update(cycle) {

    if (cycle > 0.45) return;

    this.x +=
      Math.sin(
        Date.now() * 0.001 +
        this.offset
      ) * 0.4;

    this.y +=
      Math.cos(
        Date.now() * 0.001 +
        this.offset
      ) * 0.3;

    const glow =
      (Math.sin(
        Date.now() * 0.004 +
        this.offset
      ) + 1) / 2;

    ctx.fillStyle =
      `rgba(255,255,120,${glow})`;

    ctx.shadowBlur = 20;

    ctx.shadowColor =
      "rgba(255,255,150,1)";

    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

for (let i = 0; i < 30; i++) {
  fireflies.push(new Firefly());
}

// =========================
// FALLING SEEDS
// =========================

function updateFallingSeeds() {

  for (
    let i = fallingSeeds.length - 1;
    i >= 0;
    i--
  ) {

    const s = fallingSeeds[i];

    s.vy += 0.02;

    s.x += s.vx;
    s.y += s.vy;

    ctx.fillStyle =
      "rgba(220,190,120,0.9)";

    ctx.beginPath();

    ctx.arc(
      s.x,
      s.y,
      3,
      0,
      Math.PI * 2
    );

    ctx.fill();

    if (s.y > canvas.height - 80) {

      seeds.push(
        new Seed(
          s.x,
          canvas.height - 82,
          s.dna
        )
      );

      fallingSeeds.splice(i, 1);
    }
  }
}

// =========================
// MAIN LOOP
// =========================

function animate() {

  requestAnimationFrame(animate);

  worldTime +=
    0.00012 * timeScale;

  drawBackground();

  const daylight =
    Math.max(
      0,
      Math.sin(worldTime)
    );

  seeds.forEach(seed => {
    seed.update();
    seed.draw();
  });

  plants.forEach(plant => {

    plant.update(daylight);

    plant.draw();
  });

  waterPlants();

  updateRain();

  fireflies.forEach(f => {
    f.update(daylight);
  });

  updateFallingSeeds();
}

animate();

// =========================
// CONTROLS
// =========================

canvas.addEventListener(
  "click",
  e => {

    if (
      e.clientY >
      canvas.height - 120
    ) {

      seeds.push(
        new Seed(
          e.clientX,
          e.clientY
        )
      );
    }
  }
);

window.addEventListener(
  "keydown",
  e => {

    if (e.key === "w") {
      watering = true;
    }

    if (e.key === "1") {
      setTimeScale(1);
    }

    if (e.key === "2") {
      setTimeScale(3);
    }

    if (e.key === "3") {
      setTimeScale(8);
    }
  }
);

window.addEventListener(
  "keyup",
  e => {

    if (e.key === "w") {
      watering = false;
    }
  }
);