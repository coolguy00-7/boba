const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const stateEl = document.getElementById("state");

const STORAGE_KEY = "pixel_hopper_high_score";
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = HEIGHT - 58;

const world = {
  speed: 3.1,
  gravity: 0.45,
  jumpForce: -10.2,
  score: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  running: false,
  gameOver: false,
  time: 0,
};

const player = {
  x: 150,
  y: GROUND_Y - 36,
  w: 26,
  h: 36,
  vx: 0,
  vy: 0,
  onGround: false,
};

let platforms = [];
let stars = [];

function resetWorld() {
  world.score = 0;
  world.speed = 3.1;
  world.time = 0;
  world.running = false;
  world.gameOver = false;

  player.y = GROUND_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;

  platforms = [
    { x: 0, y: GROUND_Y, w: 320, h: 58 },
    { x: 360, y: GROUND_Y, w: 240, h: 58 },
    { x: 640, y: GROUND_Y, w: 220, h: 58 },
  ];

  stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * (HEIGHT * 0.55),
    s: Math.random() > 0.7 ? 3 : 2,
  }));

  updateHud();
  stateEl.textContent = "Press jump to start";
}

function updateHud() {
  scoreEl.textContent = Math.floor(world.score).toString();
  highScoreEl.textContent = Math.floor(world.highScore).toString();
}

function jump() {
  if (world.gameOver) {
    resetWorld();
    world.running = true;
    player.vy = world.jumpForce;
    stateEl.textContent = "";
    return;
  }

  if (!world.running) {
    world.running = true;
    stateEl.textContent = "";
  }

  if (player.onGround) {
    player.vy = world.jumpForce;
    player.onGround = false;
  }
}

function spawnPlatform() {
  const rightMost = platforms[platforms.length - 1];
  const gap = 70 + Math.random() * 140;
  const width = 120 + Math.random() * 180;
  const x = rightMost.x + rightMost.w + gap;

  platforms.push({
    x,
    y: GROUND_Y,
    w: width,
    h: 58,
  });
}

function intersectsTop(pf) {
  const nextBottom = player.y + player.h + player.vy;
  const withinX = player.x + player.w > pf.x && player.x < pf.x + pf.w;
  const falling = player.vy >= 0;
  const crossesTop = player.y + player.h <= pf.y && nextBottom >= pf.y;
  return withinX && falling && crossesTop;
}

function update() {
  if (!world.running || world.gameOver) {
    return;
  }

  world.time += 1;
  world.speed += 0.0007;
  world.score += world.speed * 0.12;

  platforms.forEach((pf) => {
    pf.x -= world.speed;
  });

  while (platforms.length && platforms[0].x + platforms[0].w < -10) {
    platforms.shift();
  }

  while (platforms[platforms.length - 1].x < WIDTH - 220) {
    spawnPlatform();
  }

  stars.forEach((star) => {
    star.x -= world.speed * 0.15;
    if (star.x < -4) {
      star.x = WIDTH + Math.random() * 60;
      star.y = Math.random() * (HEIGHT * 0.55);
    }
  });

  player.vy += world.gravity;
  player.y += player.vy;
  player.onGround = false;

  for (const pf of platforms) {
    if (intersectsTop(pf)) {
      player.y = pf.y - player.h;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }

  if (player.y > HEIGHT + 10) {
    world.gameOver = true;
    world.running = false;
    if (world.score > world.highScore) {
      world.highScore = Math.floor(world.score);
      localStorage.setItem(STORAGE_KEY, String(world.highScore));
    }
    stateEl.textContent = "Game Over - Press jump to restart";
  }

  updateHud();
}

function drawBackdrop() {
  ctx.fillStyle = "#1a2152";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#2e3c7f";
  ctx.fillRect(0, HEIGHT - 150, WIDTH, 92);

  ctx.fillStyle = "#57d3ff";
  stars.forEach((star) => {
    ctx.fillRect(Math.round(star.x), Math.round(star.y), star.s, star.s);
  });
}

function drawPlatforms() {
  platforms.forEach((pf) => {
    ctx.fillStyle = "#43753a";
    ctx.fillRect(Math.round(pf.x), pf.y, Math.round(pf.w), pf.h);

    ctx.fillStyle = "#66b552";
    ctx.fillRect(Math.round(pf.x), pf.y, Math.round(pf.w), 10);

    ctx.fillStyle = "#355a2f";
    for (let x = pf.x + 6; x < pf.x + pf.w - 6; x += 18) {
      ctx.fillRect(Math.round(x), pf.y + 18, 8, 8);
    }
  });
}

function drawPlayer() {
  const px = Math.round(player.x);
  const py = Math.round(player.y);

  ctx.fillStyle = "#ffcb4d";
  ctx.fillRect(px, py, player.w, player.h);

  ctx.fillStyle = "#1f2b63";
  ctx.fillRect(px + 4, py + 8, 6, 6);
  ctx.fillRect(px + 16, py + 8, 6, 6);

  ctx.fillStyle = "#ff6b82";
  ctx.fillRect(px + 7, py + 24, 12, 4);

  if (!player.onGround) {
    ctx.fillStyle = "#f3f5ff";
    ctx.fillRect(px - 2, py + player.h - 3, 4, 3);
    ctx.fillRect(px + player.w - 2, py + player.h - 3, 4, 3);
  }
}

function drawScoreBanner() {
  ctx.fillStyle = "rgba(15, 19, 36, 0.82)";
  ctx.fillRect(16, 14, 220, 44);

  ctx.strokeStyle = "#57d3ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 14, 220, 44);

  ctx.fillStyle = "#f3f5ff";
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillText(`SCORE ${Math.floor(world.score)}`, 28, 41);
}

function render() {
  drawBackdrop();
  drawPlatforms();
  drawPlayer();
  drawScoreBanner();

  if (!world.running && !world.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffcb4d";
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillText("PRESS JUMP", WIDTH / 2 - 92, HEIGHT / 2);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const keys = ["Space", "ArrowUp", "KeyW"];
  if (keys.includes(event.code)) {
    event.preventDefault();
    jump();
  }
});

canvas.addEventListener("pointerdown", () => jump());

resetWorld();
loop();
