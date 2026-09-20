// ==========================================
// CONFIGURAÇÕES E ESTADO DO JOGO
// ==========================================
const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Tamanho do Grid (ex: 20x20 blocos)
const gridSize = 20;
const tileCount = canvas ? canvas.width / gridSize : 20;

// Cobra e Comida
let snake = [];
let food = { x: 10, y: 10 };

// Velocidade e Direção (dx, dy)
let dx = 1;
let dy = 0;
let nextDx = 1;
let nextDy = 0;

// Placar
let score = 0;
let highScore = localStorage.getItem('snake_highscore') || 0;

// Estados do Jogo
let gameLoopInterval = null;
let isPaused = false;
let isGameOver = false;
const gameSpeed = 120; // Atualização a cada 120ms

// MODOS DE PAREDE:
// true  = Modo Clássico (Com colisão nas bordas)
// false = Modo Pac-Man (Sem colisão, atravessa a borda)
let hasWallCollision = false;

// ==========================================
// INICIALIZAÇÃO E REINÍCIO
// ==========================================
function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  
  dx = 1;
  dy = 0;
  nextDx = 1;
  nextDy = 0;
  score = 0;
  isPaused = false;
  isGameOver = false;

  updateScoreDisplay();
  generateFood();

  if (gameLoopInterval) clearInterval(gameLoopInterval);
  gameLoopInterval = setInterval(gameLoop, gameSpeed);
}

// ==========================================
// LOOP PRINCIPAL DO JOGO
// ==========================================
function gameLoop() {
  if (isPaused || isGameOver) return;

  update();
  draw();
}

// ==========================================
// ATUALIZAÇÃO DA LÓGICA (UPDATE)
// ==========================================
function update() {
  // Aplica a próxima direção para evitar mudanças bruscas no mesmo frame
  dx = nextDx;
  dy = nextDy;

  // 1. Calcula a nova posição da cabeça
  let head = {
    x: snake[0].x + dx,
    y: snake[0].y + dy
  };

  // 2. Lógica das Paredes
  if (hasWallCollision) {
    // MODO COM COLISÃO: Bateu na borda -> Game Over
    if (
      head.x < 0 ||
      head.x >= tileCount ||
      head.y < 0 ||
      head.y >= tileCount
    ) {
      handleGameOver();
      return;
    }
  } else {
    // MODO SEM COLISÃO: Atravessa a borda e sai do outro lado (Eixo X e Y)
    if (head.x < 0) {
      head.x = tileCount - 1; // Esquerda -> Direita
    } else if (head.x >= tileCount) {
      head.x = 0;              // Direita -> Esquerda
    }

    if (head.y < 0) {
      head.y = tileCount - 1; // Topo -> Base
    } else if (head.y >= tileCount) {
      head.y = 0;              // Base -> Topo
    }
  }

  // 3. Colisão com o próprio corpo
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      handleGameOver();
      return;
    }
  }

  // Adiciona a nova cabeça
  snake.unshift(head);

  // 4. Verificação da Comida
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake_highscore', highScore);
    }
    updateScoreDisplay();
    generateFood();
  } else {
    snake.pop(); // Remove o último pedaço do rabo se não comeu
  }
}

// ==========================================
// RENDERIZAÇÃO NA TELA (DRAW)
// ==========================================
function draw() {
  // Limpa o Canvas
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenha a Comida
  ctx.fillStyle = '#ff4757';
  ctx.shadowColor = '#ff4757';
  ctx.shadowBlur = 8;
  ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);

  // Desenha a Cobra
  ctx.shadowBlur = 0; // Reseta o shadow Blur para o corpo
  snake.forEach((segment, index) => {
    // Cabeça verde clara, corpo verde escuro
    ctx.fillStyle = index === 0 ? '#2ed573' : '#26af5f';
    ctx.fillRect(
      segment.x * gridSize + 1,
      segment.y * gridSize + 1,
      gridSize - 2,
      gridSize - 2
    );
  });
}

// ==========================================
// GERADORES E AUXILIARES
// ==========================================
function generateFood() {
  while (true) {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };

    // Garante que a comida não apareça dentro da cobra
    let onSnake = snake.some(segment => segment.x === food.x && segment.y === food.y);
    if (!onSnake) break;
  }
}

function updateScoreDisplay() {
  const scoreElem = document.getElementById('score');
  const recordElem = document.getElementById('record');
  
  if (scoreElem) scoreElem.textContent = score;
  if (recordElem) recordElem.textContent = highScore;
}

function handleGameOver() {
  isGameOver = true;
  clearInterval(gameLoopInterval);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ff4757';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Fim de Jogo', canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.fillText(`Pontuação: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
}

// Alternar entre modo com e sem parede
function setWallMode(hasCollision) {
  hasWallCollision = hasCollision;
}

function togglePause() {
  isPaused = !isPaused;
}

// ==========================================
// CONTROLES (TECLADO E BOTÕES D-PAD)
// ==========================================
function changeDirection(dir) {
  if (dir === 'UP' && dy === 0) { nextDx = 0; nextDy = -1; }
  if (dir === 'DOWN' && dy === 0) { nextDx = 0; nextDy = 1; }
  if (dir === 'LEFT' && dx === 0) { nextDx = -1; nextDy = 0; }
  if (dir === 'RIGHT' && dx === 0) { nextDx = 1; nextDy = 0; }
}

// Eventos de Teclado
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': changeDirection('UP'); break;
    case 'ArrowDown': case 's': case 'S': changeDirection('DOWN'); break;
    case 'ArrowLeft': case 'a': case 'A': changeDirection('LEFT'); break;
    case 'ArrowRight': case 'd': case 'D': changeDirection('RIGHT'); break;
    case ' ': togglePause(); break;
  }
});

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initGame();
});
