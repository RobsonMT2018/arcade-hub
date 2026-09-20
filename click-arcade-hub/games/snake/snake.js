const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const btnStart = document.getElementById('start-btn');
const btnPlay = document.getElementById('btn-play');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let score = 0;
let applesEaten = 0;
let speedLevel = 0;
let currentIntervalMs = 240; // Tempo por frame em ms
let highScore = localStorage.getItem('snake_highscore') || 0;
let gameInterval = null;
let isPaused = false;
let gameRunning = false;
let directionChangedThisTick = false;

highScoreEl.innerText = highScore;

const hasWallCollision = false; 

// Parede Solida (Com Colisão / Game Over)

function checkWallCollision(head, gridWidth, gridHeight) {
 
  if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight
  ) {
    return true; // Colidiu com a parede -> Game Over
  }
  return false;
}

  
// Parede Aberta (Sem Colisão / Portal Teletransporte)

function wrapAroundWall(head, gridWidth, gridHeight) {

  // Eixo X (Horizontal)
  if (head.x < 0) {
    head.x = gridWidth - 1; // Saiu pela esquerda, aparece na extrema direita
  } else if (head.x >= gridWidth) {
    head.x = 0; 
  }

  // Eixo Y (Vertical)
  if (head.y < 0) {
    head.y = gridHeight - 1; // Saiu pelo topo, aparece na base
  } else if (head.y >= gridHeight) {
    head.y = 0; // Saiu pela base, aparece no topo
  }

  return head;
}




// --- SINTETIZADOR DE EFEITOS SONOROS (Web Audio API) ---
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!AudioCtx) return false;

  try {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return true;
  } catch (error) {
    audioCtx = null;
    return false;
  }
}

function playSoundMove() {
  if (!initAudio()) return;
  
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (error) {
    audioCtx = null;
  }
}

function playEatSound() {
  if (!initAudio()) return;

  try {
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
  } catch (error) {
    audioCtx = null;
  }
}

function playGameOverSound() {
  if (!initAudio()) return;

  try {
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
  } catch (error) {
    audioCtx = null;
  }
}

function playClickSound() {
  if (!initAudio()) return;

  try {
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
  } catch (error) {
    audioCtx = null;
  }
}

// Teclado
document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(e) {
  if (e.key === ' ') {
    if (!gameRunning) {
      startGame();
    } else {
      togglePause();
    }
    return;
  }

  if (e.key === 'p' || e.key === 'P') {
    if (gameRunning) togglePause();
    return;
  }

 // Se o jogo não estiver a rodar ou estiver pausado, ignora as setas direcionais
  if (!gameRunning || isPaused) return;

  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveUp();
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDown();
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
}

function moveUp() {
  if (dy === 0 && !directionChangedThisTick) {
    dx = 0;
    dy = -gridSize;
    directionChangedThisTick = true;
  }
}
function moveDown() {
  if (dy === 0 && !directionChangedThisTick) {
    dx = 0;
    dy = gridSize;
    directionChangedThisTick = true;
  }
}
function moveLeft() {
  if (dx === 0 && !directionChangedThisTick) {
    dx = -gridSize;
    dy = 0;
    directionChangedThisTick = true;
  }
}
function moveRight() {
  if (dx === 0 && !directionChangedThisTick) {
    dx = gridSize;
    dy = 0;
    directionChangedThisTick = true;
  }
}

function bindTouchButton(id, action) {
  const btn = document.getElementById(id);
  if (!btn) return;

  let lastPointerTime = 0;
  const handlePointer = (e) => {
    e.preventDefault();
    lastPointerTime = Date.now();
    if (gameRunning && !isPaused) action();
  };
  const handleClick = (e) => {
    e.preventDefault();
    if (Date.now() - lastPointerTime > 500 && gameRunning && !isPaused) action();
  };

  btn.addEventListener('pointerdown', handlePointer, { passive: false });
  btn.addEventListener('click', handleClick);
}

bindTouchButton('btn-up', moveUp);
bindTouchButton('btn-down', moveDown);
bindTouchButton('btn-left', moveLeft);
bindTouchButton('btn-right', moveRight);

const btnPause = document.getElementById('btn-pause');
if (btnPause) {
  let lastPausePointerTime = 0;
  const handlePause = (e) => {
    e.preventDefault();
    lastPausePointerTime = Date.now();
    if (gameRunning) togglePause();
  };
  btnPause.addEventListener('pointerdown', handlePause, { passive: false });
  btnPause.addEventListener('click', (e) => {
    e.preventDefault();
    if (Date.now() - lastPausePointerTime > 500 && gameRunning) togglePause();
  });
}

// Botão Play (Apenas este reinicia o jogo)
if (btnPlay) {
  let lastPlayPointerTime = 0;
  const handlePlay = (e) => {
    e.preventDefault();
    lastPlayPointerTime = Date.now();
    if (!gameRunning || isPaused) {
      startGame();
    }
  };
  
  btnPlay.addEventListener('pointerdown', handlePlay, { passive: false });
  btnPlay.addEventListener('click', (e) => {
    if (Date.now() - lastPlayPointerTime > 500) handlePlay(e);
  });
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
  currentIntervalMs = 240;

  scoreEl.innerText = score;
  speedEl.innerText = speedLevel;
  isPaused = false;
  gameRunning = true;
  directionChangedThisTick = false;

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
  directionChangedThisTick = false;
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Colisão com as paredes
  if (hasWallCollision){
  // MODO 1: Morre ao bater na parede
    if (checkWallCollision(head, GRID_WIDTH, GRID_HEIGHT)){
      gameOver();
      return;
     }
    }else {
    // MODO 2: Atravessa para o outro lado
    head = wrapAroundWall(head, GRID_WIDTH, GRID_HEIGHT);
  }

  // Colisão com o próprio corpo
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      gameOver();
      return;
    }
  }

  playSoundMove();
  snake.unshift(head);

  // Comeu a maçã
  if (head.x === food.x && head.y === food.y) {
    playEatSound();
    score += 10;
    applesEaten++;

    // A cada 10 maçãs comidas, aumenta a velocidade
    if (applesEaten % 10 === 0) {
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
  
  if (btnStart) btnStart.innerText = '▶';

  overlay.style.display = 'flex';
}