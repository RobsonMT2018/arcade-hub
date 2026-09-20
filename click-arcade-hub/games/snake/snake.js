const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const levelEl = document.getElementById('level');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const btnStart = document.getElementById('start-btn');

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
let hasWalls = true;
let obstacles = [];
let currentLevelIndex = 0;

const LEVELS = [
  {
    id: 1,
    name: 'Nível 1',
    hasWalls: true,
    obstacles: [],
    badAppleChance: 0,
    nextScoreTarget: 30
  },
  {
    id: 2,
    name: 'Nível 2',
    hasWalls: false,
    obstacles: [],
    badAppleChance: 0,
    nextScoreTarget: 60
  },
  {
    id: 3,
    name: 'Nível 3',
    hasWalls: true,
    obstacles: [
      { x: 120, y: 120 }, { x: 140, y: 120 }, { x: 160, y: 120 }, { x: 180, y: 120 },
      { x: 200, y: 120 }, { x: 220, y: 120 }, { x: 240, y: 120 },
      { x: 120, y: 260 }, { x: 140, y: 260 }, { x: 160, y: 260 }, { x: 180, y: 260 },
      { x: 200, y: 260 }, { x: 220, y: 260 }, { x: 240, y: 260 },
      { x: 120, y: 160 }, { x: 120, y: 180 }, { x: 120, y: 200 }, { x: 120, y: 220 },
      { x: 260, y: 160 }, { x: 260, y: 180 }, { x: 260, y: 200 }, { x: 260, y: 220 }
    ],
    badAppleChance: 0,
    nextScoreTarget: 90
  },
  {
    id: 4,
    name: 'Nível 4',
    hasWalls: true,
    obstacles: [],
    badAppleChance: 0.35,
    nextScoreTarget: 120
  }
];

// Alterna o modo de bordas do jogo: true = parede, false = wrap no outro lado.
function setWallMode(enabled) {
  hasWalls = Boolean(enabled);
}

// Retorna a configuração do nível atual.
function getLevelConfig() {
  return LEVELS[currentLevelIndex] || LEVELS[0];
}

// Aplica as regras do nível selecionado: paredes, obstáculos e maças especiais.
function applyLevel(levelIndex) {
  currentLevelIndex = Math.max(0, Math.min(levelIndex, LEVELS.length - 1));
  const level = getLevelConfig();
  hasWalls = level.hasWalls;
  obstacles = level.obstacles.map((block) => ({ ...block }));

  if (levelEl) {
    levelEl.innerText = String(currentLevelIndex + 1);
  }

  if (overlay && overlay.style.display === 'flex' && gameRunning) {
    overlayTitle.innerText = `${level.name}`;
    overlayTitle.style.color = '#facc15';
    overlayMsg.innerText = level.hasWalls ? 'Paredes ativas' : 'Sem paredes — wrap ativado';
  }
}

// Avança para o próximo nível quando a pontuação atinge o alvo.
function advanceLevelIfNeeded() {
  const level = getLevelConfig();
  if (score >= level.nextScoreTarget && currentLevelIndex < LEVELS.length - 1) {
    const nextIndex = currentLevelIndex + 1;
    applyLevel(nextIndex);
    overlayTitle.innerText = `${getLevelConfig().name} ativo`;
    overlayTitle.style.color = '#facc15';
    overlayMsg.innerText = 'Nível avançado!';
    overlay.style.display = 'flex';
    setTimeout(() => {
      if (gameRunning) overlay.style.display = 'none';
    }, 800);
  }
}

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

// Inicializa o áudio do navegador para reproduzir efeitos sonoros do jogo.
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

// Toca um som leve quando a cobra se move.
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

// Toca um som ao comer uma maçã válida.
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

// Toca um som ao perder o jogo.
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

// Toca um som de clique ao iniciar ou pausar o jogo.
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
// Escuta as teclas do teclado para controlar a cobra.
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

// Move a cobra para cima sem permitir reverso imediato.
function moveUp() {
  if (dy === 0 && !directionChangedThisTick) {
    dx = 0;
    dy = -gridSize;
    directionChangedThisTick = true;
  }
}

// Move a cobra para baixo sem permitir reverso imediato.
function moveDown() {
  if (dy === 0 && !directionChangedThisTick) {
    dx = 0;
    dy = gridSize;
    directionChangedThisTick = true;
  }
}
// Move a cobra para a esquerda sem permitir reverso imediato.
function moveLeft() {
  if (dx === 0 && !directionChangedThisTick) {
    dx = -gridSize;
    dy = 0;
    directionChangedThisTick = true;
  }
}

// Move a cobra para a direita sem permitir reverso imediato.
function moveRight() {
  if (dx === 0 && !directionChangedThisTick) {
    dx = gridSize;
    dy = 0;
    directionChangedThisTick = true;
  }
}

// Associa os botões touch ou clique dos controles do jogo às funções de movimento.
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

// Botão Play / Reiniciar
if (btnStart) {
  let lastPlayPointerTime = 0;
  const handlePlay = (e) => {
    e.preventDefault();
    lastPlayPointerTime = Date.now();
    if (!gameRunning || isPaused) {
      startGame();
    }
  };

  btnStart.addEventListener('pointerdown', handlePlay, { passive: false });
  btnStart.addEventListener('click', (e) => {
    if (Date.now() - lastPlayPointerTime > 500) handlePlay(e);
  });
}

// Reinicia a partida com as configurações do nível 1.
function startGame() {
  initAudio();
  playClickSound();

  applyLevel(0);
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
  if (levelEl) levelEl.innerText = String(currentLevelIndex + 1);
  isPaused = false;
  gameRunning = true;
  directionChangedThisTick = false;

  if (btnStart) btnStart.innerText = '↻';
  overlayTitle.innerText = `${getLevelConfig().name}`;
  overlayTitle.style.color = '#facc15';
  overlayMsg.innerText = getLevelConfig().hasWalls ? 'Paredes ativas' : 'Sem paredes — wrap ativado';
  overlay.style.display = 'none';
  generateFood();

  resetGameLoop();
}

// Recria o intervalo do loop principal com a velocidade atual.
function resetGameLoop() {
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, currentIntervalMs);
}

// Executa uma rodada do jogo: atualiza a lógica e redesenha o frame.
function gameLoop() {
  update();
  draw();
}

// Atualiza a posição da cobra, verifica colisões e trata as maçãs.
function update() {
  directionChangedThisTick = false;
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  if (!hasWalls) {
    if (head.x < 0) head.x = canvas.width - gridSize;
    else if (head.x >= canvas.width) head.x = 0;

    if (head.y < 0) head.y = canvas.height - gridSize;
    else if (head.y >= canvas.height) head.y = 0;
  } else if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
    gameOver();
    return;
  }

  const hitObstacle = obstacles.some((block) => block.x === head.x && block.y === head.y);
  if (hitObstacle) {
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

  playSoundMove();
  snake.unshift(head);

  // Comeu a maçã
  if (head.x === food.x && head.y === food.y) {
    playEatSound();

    if (food.bad) {
      if (snake.length > 1) {
        snake.pop();
      }
      score = Math.max(0, score - 10);
    } else {
      score += 10;
    }

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

    advanceLevelIfNeeded();
    generateFood();
  } else {
    snake.pop();
  }
}

// Desenha o fundo, obstáculos, maças e cobra na tela.
function draw() {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  obstacles.forEach((block) => {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(block.x, block.y, gridSize - 2, gridSize - 2);
  });

  // Maçã
  ctx.fillStyle = food.bad ? '#7c3aed' : '#ef4444';
  ctx.shadowColor = food.bad ? '#7c3aed' : '#ef4444';
  ctx.shadowBlur = 8;
  ctx.fillRect(food.x, food.y, gridSize - 2, gridSize - 2);
  ctx.shadowBlur = 0;

  // Cobra
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? '#10b981' : '#22c55e';
    ctx.fillRect(part.x, part.y, gridSize - 2, gridSize - 2);
  });
}

// Gera uma nova posição para a maçã, evitando o corpo da cobra e os obstáculos.
function generateFood() {
  let nextX;
  let nextY;
  let isBad = false;

  do {
    nextX = Math.floor(Math.random() * tileCount) * gridSize;
    nextY = Math.floor(Math.random() * tileCount) * gridSize;
    isBad = getLevelConfig().badAppleChance > 0 && Math.random() < getLevelConfig().badAppleChance;
  } while (
    snake.some((part) => part.x === nextX && part.y === nextY) ||
    obstacles.some((block) => block.x === nextX && block.y === nextY)
  );

  food = { x: nextX, y: nextY, bad: isBad };
}

// Alterna entre pausa e retorno do jogo.
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

// Finaliza a partida quando a cobra colide com algo proibido.
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