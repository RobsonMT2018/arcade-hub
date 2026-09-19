const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const btnStart = document.getElementById('btn-start');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let score = 0;
let applesEaten = 0;
let speedLevel = 1;
let currentIntervalMs = 120; // Tempo por frame em ms
let highScore = localStorage.getItem('snake_highscore') || 0;
let gameInterval = null;
let isPaused = false;
let gameRunning = false;

highScoreEl.innerText = highScore;

if (btnStart) {
  btnStart.addEventListener('click', (e) => {
    e.preventDefault();
    if (!gameRunning) startGame();
  });
}

// --- SINTETIZADOR DE EFEITOS SONOROS (Web Audio API) ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
}

function playEatSound() {
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playGameOverSound() {
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

function playClickSound() {
  initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// Teclado
document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(e) {
  if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
    if (!gameRunning) startGame();
    else togglePause();
    return;
  }

  if (!gameRunning || isPaused) return;

  if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) moveUp();
  else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')) moveDown();
  else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')) moveLeft();
  else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) moveRight();
}

function moveUp() {
  if (dy === 0) { dx = 0; dy = -gridSize; }
}
function moveDown() {
  if (dy === 0) { dx = 0; dy = gridSize; }
}
function moveLeft() {
  if (dx === 0) { dx = -gridSize; dy = 0; }
}
function moveRight() {
  if (dx === 0) { dx = gridSize; dy = 0; }
}

function bindTouchButton(id, action) {
  const btn = document.getElementById(id);
  if (!btn) return;

  const handler = (e) => {
    e.preventDefault();
    if (!gameRunning) {
      startGame();
      return;
    }
    if (!isPaused) action();
  };

  btn.addEventListener('touchstart', handler, { passive: false });
  btn.addEventListener('click', handler);
}

bindTouchButton('btn-up', moveUp);
bindTouchButton('btn-down', moveDown);
bindTouchButton('btn-left', moveLeft);
bindTouchButton('btn-right', moveRight);

const btnPause = document.getElementById('btn-pause');
if (btnPause) {
  const handlePause = (e) => {
    e.preventDefault();
    if (gameRunning) togglePause();
  };
  btnPause.addEventListener('touchstart', handlePause, { passive: false });
  btnPause.addEventListener('click', handlePause);
}

function startGame() {
  initAudio();
  playClickSound();

  snake = [
    { x: 160, y: 200 },
    { x: 140, y: 200 },
    { x: 120, y: 200 }
  ];
  dx = gridSize;
  dy = 0;
  score = 0;
  applesEaten = 0;
  speedLevel = 1;
  currentIntervalMs = 120;

  scoreEl.innerText = score;
  speedEl.innerText = speedLevel;
  isPaused = false;
  gameRunning = true;
  if (btnStart) btnStart.style.visibility = 'hidden';

  overlay.style.display = 'none';
  generateFood();

  resetGameLoop();
}

function resetGameLoop() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, currentIntervalMs);
}

function gameLoop() {
  update();
  draw();
}

function update() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Colisão com as paredes
  if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
    gameOver();
    return;
  }

  // Colisão com o próprio corpo
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      gameOver();
      return;
    }
  }

  snake.unshift(head);

  // Comeu a maçã
  if (head.x === food.x && head.y === food.y) {
    playEatSound();
    score += 10;
    applesEaten++;

    // A cada 3 maçãs comidas, aumenta a velocidade
    if (applesEaten % 3 === 0) {
      speedLevel++;
      speedEl.innerText = speedLevel;

      if (currentIntervalMs > 40) {
        currentIntervalMs -= 8;
        resetGameLoop();
      }
    }

    scoreEl.innerText = score;

    if (score > highScore) {
      highScore = score;
      highScoreEl.innerText = highScore;
      localStorage.setItem('snake_highscore', highScore);
    }

    generateFood();
  } else {
    snake.pop();
  }
}

function draw() {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Maçã
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 8;
  ctx.fillRect(food.x, food.y, gridSize - 2, gridSize - 2);
  ctx.shadowBlur = 0;

  // Cobra
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? '#10b981' : '#22c55e';
    ctx.fillRect(part.x, part.y, gridSize - 2, gridSize - 2);
  });
}

function generateFood() {
  food.x = Math.floor(Math.random() * tileCount) * gridSize;
  food.y = Math.floor(Math.random() * tileCount) * gridSize;

  snake.forEach(part => {
    if (part.x === food.x && part.y === food.y) {
      generateFood();
    }
  });
}

function togglePause() {
  playClickSound();
  if (isPaused) {
    resetGameLoop();
    overlay.style.display = 'none';
    isPaused = false;
  } else {
    clearInterval(gameInterval);
    overlayTitle.innerText = 'Pausado';
    overlayTitle.style.color = '#facc15';
    overlayMsg.innerText = 'Toque na tela ou Espaço para Continuar';
    overlay.style.display = 'flex';
    isPaused = true;
  }
}

function gameOver() {
  clearInterval(gameInterval);
  gameRunning = false;
  playGameOverSound();

  overlayTitle.innerText = 'Fim de Jogo';
  overlayTitle.style.color = '#ef4444';
  overlayMsg.innerText = `Sua pontuação final foi: ${score}`;
  
  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.innerText = 'Jogar Novamente';
  if (btnStart) btnStart.style.visibility = 'visible';

  overlay.style.display = 'flex';
}