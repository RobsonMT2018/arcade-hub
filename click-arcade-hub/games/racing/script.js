const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over-screen');
const restartBtn = document.getElementById('restart-btn');

// Estado do Jogo
let isGameOver = false;
let score = 0;
let speed = 5;
let frameCount = 0;

// Teclas pressionadas
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  a: false,
  d: false,
  w: false,
  s: false
};

// Parallax Offsets
let bgOffsetFar = 0;
let bgOffsetMid = 0;
let roadOffset = 0;

// Jogador (Carro)
const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 100,
  width: 40,
  height: 70,
  speedX: 5,
  color: '#e74c3c'
};

// Obstáculos
let obstacles = [];

// Limites da pista
const roadLeft = 80;
const roadRight = canvas.width - 80;

// Event Listeners dos Controles
window.addEventListener('keydown', (e) => {
  if (e.key in keys) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

restartBtn.addEventListener('click', resetGame);

function spawnObstacle() {
  const width = 40;
  const height = 70;
  const minX = roadLeft + 10;
  const maxX = roadRight - width - 10;
  const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

  const colors = ['#f1c40f', '#8e44ad', '#3498db', '#1abc9c'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  obstacles.push({
    x: randomX,
    y: -height,
    width: width,
    height: height,
    color: color,
    speedOffsetY: Math.random() * 2 - 1 // Variação leve de velocidade individual
  });
}

function update() {
  if (isGameOver) return;

  frameCount++;
  score += Math.floor(speed / 2);

  // Atualiza UI
  scoreEl.textContent = score;
  speedEl.textContent = Math.floor(speed * 18);

  // --- MOVIMENTAÇÃO DO PARALLAX ---
  bgOffsetFar = (bgOffsetFar + speed * 0.2) % canvas.height;
  bgOffsetMid = (bgOffsetMid + speed * 0.5) % canvas.height;
  roadOffset = (roadOffset + speed) % 40; // Repetição da faixa pontilhada

  // --- MOVIMENTAÇÃO DO JOGADOR ---
  if ((keys.ArrowLeft || keys.a) && player.x > roadLeft + 5) {
    player.x -= player.speedX;
  }
  if ((keys.ArrowRight || keys.d) && player.x + player.width < roadRight - 5) {
    player.x += player.speedX;
  }
  if ((keys.ArrowUp || keys.w) && speed < 12) {
    speed += 0.02; // Aceleração
  }
  if ((keys.ArrowDown || keys.s) && speed > 3) {
    speed -= 0.05; // Frenagem
  }

  // --- SPAWN E ATUALIZAÇÃO DE OBSTÁCULOS ---
  if (frameCount % Math.max(30, Math.floor(120 / (speed / 3))) === 0) {
    spawnObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.y += speed + obs.speedOffsetY;

    // Detecção de Colisão (AABB)
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      triggerGameOver();
    }

    // Remove obstáculos que saírem da tela
    if (obs.y > canvas.height) {
      obstacles.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Fundo Distante (Grama / Vegetação com efeito Parallax)
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Detalhes distantes (Árvores / Textura lateral)
  ctx.fillStyle = '#1e824c';
  for (let y = -40 + bgOffsetFar; y < canvas.height; y += 80) {
    ctx.fillRect(15, y, 30, 30);
    ctx.fillRect(canvas.width - 45, y, 30, 30);
  }

  // Detalhes médios (Arbustos mais próximos)
  ctx.fillStyle = '#2ecc71';
  for (let y = -40 + bgOffsetMid; y < canvas.height; y += 60) {
    ctx.beginPath();
    ctx.arc(60, y, 12, 0, Math.PI * 2);
    ctx.arc(canvas.width - 60, y, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Asfalto / Pista
  ctx.fillStyle = '#34495e';
  ctx.fillRect(roadLeft, 0, roadRight - roadLeft, canvas.height);

  // Guias Laterais (Zebras)
  ctx.fillStyle = '#ecf0f1';
  ctx.fillRect(roadLeft - 6, 0, 6, canvas.height);
  ctx.fillRect(roadRight, 0, 6, canvas.height);

  // Faixa Pontilhada Central (Movimento para efeito de velocidade)
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);
  ctx.lineDashOffset = -roadOffset;

  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]); // Reseta linha contínua

  // 3. Desenhar Jogador
  drawCar(player.x, player.y, player.width, player.height, player.color);

  // 4. Desenhar Obstáculos
  obstacles.forEach(obs => {
    drawCar(obs.x, obs.y, obs.width, obs.height, obs.color);
  });
}

// Função auxiliar para desenhar carros simples
function drawCar(x, y, w, h, color) {
  // Corpo do carro
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Vidro dianteiro
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 5, y + 15, w - 10, 15);

  // Vidro traseiro
  ctx.fillRect(x + 5, y + h - 20, w - 10, 10);

  // Faróis
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 3, y + 2, 8, 4);
  ctx.fillRect(x + w - 11, y + 2, 8, 4);

  // Lanternas Traseiras
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x + 3, y + h - 4, 8, 4);
  ctx.fillRect(x + w - 11, y + h - 4, 8, 4);
}

function triggerGameOver() {
  isGameOver = true;
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  score = 0;
  speed = 5;
  frameCount = 0;
  obstacles = [];
  player.x = canvas.width / 2 - 20;
  isGameOver = false;
  gameOverScreen.classList.add('hidden');
  loop();
}

// Loop Principal
function loop() {
  update();
  draw();

  if (!isGameOver) {
    requestAnimationFrame(loop);
  }
}

// Iniciar o jogo
loop();