const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snake_highscore') || 0;
let gameInterval = null;
let isPaused = false;
let gameRunning = false;

highScoreEl.innerText = highScore;

// Event Listeners para Teclado
document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(e) {
  if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
    if (!gameRunning) {
      startGame();
    } else {
      togglePause();
    }
    return;
  }

  if (!gameRunning || isPaused) return;

  // Evita inverter a direção diretamente (ex: ir da direita para a esquerda de uma vez)
  if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dy === 0) {
    dx = 0; dy = -gridSize;
  } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dy === 0) {
    dx = 0; dy = gridSize;
  } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dx === 0) {
    dx = -gridSize; dy = 0;
  } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dx === 0) {
    dx = gridSize; dy = 0;
  }
}

function startGame() {
  snake = [
    { x: 160, y: 200 },
    { x: 140, y: 200 },
    { x: 120, y: 200 }
  ];
  dx = gridSize;
  dy = 0;
  score = 0;
  scoreEl.innerText = score;
  isPaused = false;
  gameRunning = true;

  overlay.style.display = 'none';
  generateFood();

  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 100);
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

  // Comeu a comida
  if (head.x === food.x && head.y === food.y) {
    score += 10;
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
  // Limpar Canvas
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenhar Comida
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10;
  ctx.fillRect(food.x, food.y, gridSize - 2, gridSize - 2);
  ctx.shadowBlur = 0; // Reset sombra

  // Desenhar Cobrinha
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? '#22c55e' : '#4ade80';
    ctx.fillRect(part.x, part.y, gridSize - 2, gridSize - 2);
  });
}

function generateFood() {
  food.x = Math.floor(Math.random() * tileCount) * gridSize;
  food.y = Math.floor(Math.random() * tileCount) * gridSize;

  // Garante que a comida não apareça em cima da cobrinha
  snake.forEach(part => {
    if (part.x === food.x && part.y === food.y) {
      generateFood();
    }
  });
}

function togglePause() {
  if (isPaused) {
    gameInterval = setInterval(gameLoop, 100);
    overlay.style.display = 'none';
    isPaused = false;
  } else {
    clearInterval(gameInterval);
    overlayTitle.innerText = 'Pausado';
    overlayTitle.style.color = '#f59e0b';
    overlayMsg.innerText = 'Pressione Espaço para Continuar';
    overlay.style.display = 'flex';
    isPaused = true;
  }
}

function gameOver() {
  clearInterval(gameInterval);
  gameRunning = false;

  overlayTitle.innerText = 'Game Over!';
  overlayTitle.style.color = '#ef4444';
  overlayMsg.innerText = `Sua pontuação foi: ${score}`;
  overlay.style.display = 'flex';
}