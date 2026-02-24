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
  jumpForce: -11.4,
  score: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  running: false,
  gameOver: false,
  time: 0,
  difficulty: 0,
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
const keysDown = new Set();

function resetWorld() {
  world.score = 0;
  world.speed = 3.1;
  world.gravity = 0.45;
  world.time = 0;
  world.difficulty = 0;
  world.running = false;
  world.gameOver = false;

  player.y = GROUND_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;

  platforms = [
    { x: 0, y: GROUND_Y, w: 320, h: 58 },
    { x: 360, y: GROUND_Y - 30, w: 220, h: 58 },
    { x: 650, y: GROUND_Y - 62, w: 220, h: 58 },
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
  const diff = world.difficulty;
  const minGap = 70 + diff * 35;
  const maxGap = 190 + diff * 70;
  const gap = minGap + Math.random() * (maxGap - minGap);

  const minWidth = Math.max(92, 120 - diff * 28);
  const maxWidth = Math.max(140, 270 - diff * 90);
  let width = minWidth + Math.random() * (maxWidth - minWidth);
  if (Math.random() < 0.2 + diff * 0.25) {
    width *= 0.72;
  }

  const x = rightMost.x + rightMost.w + gap;
  const minY = 85;
  const maxY = GROUND_Y;
  const yStep = (Math.random() * 2 - 1) * (70 + diff * 70);
  let y = Math.max(minY, Math.min(maxY, rightMost.y + yStep));

  if (Math.random() < 0.35 + diff * 0.3) {
    y = Math.max(minY, y - (18 + Math.random() * (45 + diff * 45)));
  }

  platforms.push({
    x,
    y,
    w: Math.max(80, width),
    h: 58,
  });
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resolvePlatformCollision(prevX, prevY) {
  for (const pf of platforms) {
    if (!intersects(player, pf)) {
      continue;
    }

    const prevBottom = prevY + player.h;
    const prevTop = prevY;
    const prevRight = prevX + player.w;
    const prevLeft = prevX;

    if (prevBottom <= pf.y && player.vy >= 0) {
      player.y = pf.y - player.h;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    if (prevTop >= pf.y + pf.h && player.vy < 0) {
      player.y = pf.y + pf.h;
      player.vy = 0;
      continue;
    }

    if (prevRight <= pf.x && player.vx > 0) {
      player.x = pf.x - player.w;
      player.vx = 0;
      continue;
    }

    if (prevLeft >= pf.x + pf.w && player.vx < 0) {
      player.x = pf.x + pf.w;
      player.vx = 0;
    }
  }
}

function update() {
  if (!world.running || world.gameOver) {
    return;
  }

  world.time += 1;
  world.difficulty = Math.min(1, world.time / 3600 + world.score / 4200);
  world.speed = 3.1 + world.difficulty * 2.2;
  world.gravity = 0.45 + world.difficulty * 0.16;
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

  const moveSpeed = 4;
  const movingLeft = keysDown.has("ArrowLeft") || keysDown.has("KeyA");
  const movingRight = keysDown.has("ArrowRight") || keysDown.has("KeyD");

  if (movingLeft && !movingRight) {
    player.vx = -moveSpeed;
  } else if (movingRight && !movingLeft) {
    player.vx = moveSpeed;
  } else {
    player.vx *= 0.75;
  }

  player.x += player.vx;
  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  } else if (player.x + player.w > WIDTH) {
    player.x = WIDTH - player.w;
    player.vx = 0;
  }

  player.vy += world.gravity;
  player.onGround = false;
  const verticalSteps = Math.max(1, Math.ceil(Math.abs(player.vy) / 5));
  for (let i = 0; i < verticalSteps; i += 1) {
    const stepPrevX = player.x;
    const stepPrevY = player.y;
    player.y += player.vy / verticalSteps;
    resolvePlatformCollision(stepPrevX, stepPrevY);
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
  const jumpKeys = ["Space", "ArrowUp", "KeyW"];
  if (jumpKeys.includes(event.code)) {
    event.preventDefault();
    jump();
  }
  keysDown.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keysDown.delete(event.code);
});

canvas.addEventListener("pointerdown", () => jump());

resetWorld();
loop();
