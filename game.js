const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const stateEl = document.getElementById("state");

const STORAGE_KEY = "pixel_hopper_high_score";
const SCREEN = {
  width: canvas.width,
  height: canvas.height,
  groundY: canvas.height - 58,
};

const world = {
  speed: 3.1,
  gravity: 0.45,
  jumpVelocity: -11.4,
  score: 0,
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  running: false,
  gameOver: false,
  ticks: 0,
  difficulty: 0,
};

const player = {
  x: 150,
  y: SCREEN.groundY - 36,
  w: 26,
  h: 36,
  vx: 0,
  vy: 0,
  onGround: false,
};

let platforms = [];
let stars = [];
const pressedKeys = new Set();

function updateHud() {
  scoreEl.textContent = String(Math.floor(world.score));
  highScoreEl.textContent = String(Math.floor(world.highScore));
}

function resetWorld() {
  world.score = 0;
  world.speed = 3.1;
  world.gravity = 0.45;
  world.ticks = 0;
  world.difficulty = 0;
  world.running = false;
  world.gameOver = false;

  player.y = SCREEN.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;

  platforms = [
    { x: 0, y: SCREEN.groundY, w: 320, h: 58 },
    { x: 360, y: SCREEN.groundY - 30, w: 220, h: 58 },
    { x: 650, y: SCREEN.groundY - 62, w: 220, h: 58 },
  ];

  stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * SCREEN.width,
    y: Math.random() * (SCREEN.height * 0.55),
    s: Math.random() > 0.7 ? 3 : 2,
  }));

  updateHud();
  stateEl.textContent = "Press jump to start";
}

function jump() {
  if (world.gameOver) {
    resetWorld();
    world.running = true;
    player.vy = world.jumpVelocity;
    stateEl.textContent = "";
    return;
  }

  if (!world.running) {
    world.running = true;
    stateEl.textContent = "";
  }

  if (player.onGround) {
    player.vy = world.jumpVelocity;
    player.onGround = false;
  }
}

function spawnPlatform() {
  const last = platforms[platforms.length - 1];
  const d = world.difficulty;

  const minGap = 70 + d * 35;
  const maxGap = 190 + d * 70;
  const gap = minGap + Math.random() * (maxGap - minGap);

  const minWidth = Math.max(92, 120 - d * 28);
  const maxWidth = Math.max(140, 270 - d * 90);
  let width = minWidth + Math.random() * (maxWidth - minWidth);
  if (Math.random() < 0.2 + d * 0.25) width *= 0.72;

  const minY = 85;
  const maxY = SCREEN.groundY;
  const step = (Math.random() * 2 - 1) * (70 + d * 70);
  let y = Math.max(minY, Math.min(maxY, last.y + step));

  if (Math.random() < 0.35 + d * 0.3) {
    y = Math.max(minY, y - (18 + Math.random() * (45 + d * 45)));
  }

  platforms.push({
    x: last.x + last.w + gap,
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

function resolvePlatformCollisions(prevX, prevY) {
  for (const platform of platforms) {
    const prevBottom = prevY + player.h;
    const currBottom = player.y + player.h;
    const prevTop = prevY;
    const currTop = player.y;

    const prevRight = prevX + player.w;
    const currRight = player.x + player.w;
    const prevLeft = prevX;
    const currLeft = player.x;

    const overlapXNow = currRight > platform.x && currLeft < platform.x + platform.w;
    const overlapXPrev = prevRight > platform.x && prevLeft < platform.x + platform.w;
    const overlapYNow = currBottom > platform.y && currTop < platform.y + platform.h;

    if (player.vy >= 0 && (overlapXNow || overlapXPrev) && prevBottom <= platform.y && currBottom >= platform.y) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    if (player.vy < 0 && (overlapXNow || overlapXPrev) && prevTop >= platform.y + platform.h && currTop <= platform.y + platform.h) {
      player.y = platform.y + platform.h;
      player.vy = 0;
      continue;
    }

    if (overlapYNow && prevRight <= platform.x && currRight >= platform.x) {
      player.x = platform.x - player.w;
      player.vx = 0;
      continue;
    }

    if (overlapYNow && prevLeft >= platform.x + platform.w && currLeft <= platform.x + platform.w) {
      player.x = platform.x + platform.w;
      player.vx = 0;
      continue;
    }

    if (!intersects(player, platform)) continue;

    const penLeft = currRight - platform.x;
    const penRight = platform.x + platform.w - currLeft;
    const penTop = currBottom - platform.y;
    const penBottom = platform.y + platform.h - currTop;
    const smallestPenetration = Math.min(penLeft, penRight, penTop, penBottom);

    if (smallestPenetration === penTop) {
      player.y = platform.y - player.h;
      player.vy = Math.min(0, player.vy);
      player.onGround = true;
    } else if (smallestPenetration === penBottom) {
      player.y = platform.y + platform.h;
      player.vy = Math.max(0, player.vy);
    } else if (smallestPenetration === penLeft) {
      player.x = platform.x - player.w;
      player.vx = Math.min(0, player.vx);
    } else {
      player.x = platform.x + platform.w;
      player.vx = Math.max(0, player.vx);
    }
  }
}

function updateDifficulty() {
  world.difficulty = Math.min(1, world.ticks / 3600 + world.score / 4200);
  world.speed = 3.1 + world.difficulty * 2.2;
  world.gravity = 0.45 + world.difficulty * 0.16;
}

function updateInput() {
  const movingLeft = pressedKeys.has("ArrowLeft") || pressedKeys.has("KeyA");
  const movingRight = pressedKeys.has("ArrowRight") || pressedKeys.has("KeyD");
  const moveSpeed = 4;

  if (movingLeft && !movingRight) {
    player.vx = -moveSpeed;
  } else if (movingRight && !movingLeft) {
    player.vx = moveSpeed;
  } else {
    player.vx *= 0.75;
  }
}

function keepPlayerInBounds() {
  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
    return;
  }

  if (player.x + player.w > SCREEN.width) {
    player.x = SCREEN.width - player.w;
    player.vx = 0;
  }
}

function update() {
  if (!world.running || world.gameOver) return;

  world.ticks += 1;
  updateDifficulty();
  world.score += world.speed * 0.12;

  for (const platform of platforms) {
    platform.x -= world.speed;
  }

  while (platforms.length && platforms[0].x + platforms[0].w < -10) {
    platforms.shift();
  }

  while (platforms[platforms.length - 1].x < SCREEN.width - 220) {
    spawnPlatform();
  }

  for (const star of stars) {
    star.x -= world.speed * 0.15;
    if (star.x < -4) {
      star.x = SCREEN.width + Math.random() * 60;
      star.y = Math.random() * (SCREEN.height * 0.55);
    }
  }

  updateInput();
  player.x += player.vx;
  keepPlayerInBounds();

  player.vy += world.gravity;
  player.onGround = false;

  const steps = Math.max(2, Math.ceil((Math.abs(player.vy) + world.speed) / 2));
  for (let i = 0; i < steps; i += 1) {
    const prevX = player.x;
    const prevY = player.y;
    player.y += player.vy / steps;
    resolvePlatformCollisions(prevX, prevY);
  }

  if (player.y > SCREEN.height + 10) {
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
  ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

  ctx.fillStyle = "#2e3c7f";
  ctx.fillRect(0, SCREEN.height - 150, SCREEN.width, 92);

  ctx.fillStyle = "#57d3ff";
  for (const star of stars) {
    ctx.fillRect(Math.round(star.x), Math.round(star.y), star.s, star.s);
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    ctx.fillStyle = "#43753a";
    ctx.fillRect(Math.round(platform.x), platform.y, Math.round(platform.w), platform.h);

    ctx.fillStyle = "#66b552";
    ctx.fillRect(Math.round(platform.x), platform.y, Math.round(platform.w), 10);

    ctx.fillStyle = "#355a2f";
    for (let x = platform.x + 6; x < platform.x + platform.w - 6; x += 18) {
      ctx.fillRect(Math.round(x), platform.y + 18, 8, 8);
    }
  }
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
    ctx.fillRect(0, 0, SCREEN.width, SCREEN.height);

    ctx.fillStyle = "#ffcb4d";
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillText("PRESS JUMP", SCREEN.width / 2 - 92, SCREEN.height / 2);
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const jumpKeys = ["Space", "ArrowUp", "KeyW"];
  if (jumpKeys.includes(event.code)) {
    event.preventDefault();
    jump();
  }

  pressedKeys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

canvas.addEventListener("pointerdown", jump);

resetWorld();
gameLoop();
