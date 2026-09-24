const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Carregando a imagem do carro do jogador
const playerImg = new Image();
playerImg.src = 'car.png';

// Elementos UI
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const coinsEl = document.getElementById('coins');
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const buyBtn = document.getElementById('buy-btn');
const carNameEl = document.getElementById('car-name');
const carStatusEl = document.getElementById('car-status');
const powerupBar = document.getElementById('powerup-bar');
const powerupName = document.getElementById('powerup-name');
const powerupProgress = document.getElementById('powerup-progress');

// Botões Touch
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Configuração das Pistas (3 Faixas)
const lanes = [110, 200, 290];
let currentLane = 1;

// Skins de Carros
const CAR_SKINS = [
  { id: 0, name: 'Red Racer', color: '#e74c3c', accent: '#c0392b', price: 0, unlocked: true },
  { id: 1, name: 'Cyber Neon', color: '#00f3ff', accent: '#ff0055', price: 50, unlocked: false },
  { id: 2, name: 'Gold Speed', color: '#f1c40f', accent: '#f39c12', price: 120, unlocked: false },
  { id: 3, name: 'Dark Phantom', color: '#2c3e50', accent: '#95a5a6', price: 200, unlocked: false }
];

let selectedCarIndex = 0;

// Estado Global de Progresso (Save)
let saveData = JSON.parse(localStorage.getItem('turbo_dash_data')) || {
  highScore: 0,
  coins: 0,
  unlockedSkins: [0],
  selectedSkin: 0
};

selectedCarIndex = saveData.selectedSkin;
saveData.unlockedSkins.forEach(id => {
  if (CAR_SKINS[id]) CAR_SKINS[id].unlocked = true;
});

// Parâmetros da Partida
let isPlaying = false;
let isGameOver = false;
let score = 0;
let coinsCollected = 0;
let gameSpeed = 6;
let frameCount = 0;

// Efeitos de Cenario
let roadOffset = 0;
let bgOffset = 0;

// Jogador (Animação e Posição)
const player = {
  x: lanes[1] - 20,
  targetX: lanes[1] - 20,
  y: 500,
  width: 40,
  height: 70,
  tilt: 0,
  shieldActive: false,
  turboActive: false,
  magnetActive: false,
  powerupTimer: 0,
  powerupDuration: 0
};

// Arrays de Entidades
let obstacles = [];
let coins = [];
let powerups = [];
let particles = [];

// Funções de Movimentação por Faixa
function moveLeft() {
  if (!isPlaying || isGameOver) return;
  if (currentLane > 0) {
    currentLane--;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = -0.15;
  }
}

function moveRight() {
  if (!isPlaying || isGameOver) return;
  if (currentLane < lanes.length - 1) {
    currentLane++;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = 0.15;
  }
}

// Controles de Teclado
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
  if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
});

// Controles dos Botões Touch
btnLeft.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  moveLeft();
});

btnRight.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  moveRight();
});

// Suporte a Gestos (Swipe) na Tela
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const diffX = touchEndX - touchStartX;

  if (Math.abs(diffX) > 30) { // Sensibilidade mínima do deslize
    if (diffX > 0) moveRight();
    else moveLeft();
  }
}, { passive: true });

// Salvar Dados
function saveGameProgress() {
  saveData.coins += coinsCollected;
  if (score > saveData.highScore) saveData.highScore = score;
  saveData.selectedSkin = selectedCarIndex;
  localStorage.setItem('turbo_dash_data', JSON.stringify(saveData));
  updateUI();
}

function updateUI() {
  highScoreEl.textContent = saveData.highScore;
  coinsEl.textContent = saveData.coins + coinsCollected;
  scoreEl.textContent = score;
}

// Navegação Garagem
function updateShopUI() {
  const car = CAR_SKINS[selectedCarIndex];
  carNameEl.textContent = car.name;
  
  if (car.unlocked) {
    carStatusEl.textContent = selectedCarIndex === saveData.selectedSkin ? 'SELECIONADO' : 'ADQUIRIDO';
    carStatusEl.className = 'status-owned';
    buyBtn.classList.add('hidden');
  } else {
    carStatusEl.textContent = `BLOQUEADO`;
    carStatusEl.className = 'status-locked';
    buyBtn.textContent = `COMPRAR (${car.price} 🪙)`;
    buyBtn.classList.remove('hidden');
  }
}

document.getElementById('prev-car').addEventListener('click', () => {
  selectedCarIndex = (selectedCarIndex - 1 + CAR_SKINS.length) % CAR_SKINS.length;
  updateShopUI();
});

document.getElementById('next-car').addEventListener('click', () => {
  selectedCarIndex = (selectedCarIndex + 1) % CAR_SKINS.length;
  updateShopUI();
});

buyBtn.addEventListener('click', () => {
  const car = CAR_SKINS[selectedCarIndex];
  if (!car.unlocked && saveData.coins >= car.price) {
    saveData.coins -= car.price;
    car.unlocked = true;
    saveData.unlockedSkins.push(car.id);
    saveData.selectedSkin = car.id;
    saveGameProgress();
    updateShopUI();
  }
});

// Partículas
function createParticles(x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 + 2,
      size: Math.random() * 4 + 2,
      color,
      life: 1
    });
  }
}

// Spawners de Entidades
function spawnEntities() {
  if (frameCount % Math.max(25, Math.floor(80 - gameSpeed * 3)) === 0) {
    const laneIdx = Math.floor(Math.random() * 3);
    const posX = lanes[laneIdx] - 20;

    const typeRandom = Math.random();
    if (typeRandom < 0.65) {
      // Variações para obstáculos estilo Pixel Art
      const enemySkins = [
        { main: '#d63031', accent: '#ff7675' },
        { main: '#0984e3', accent: '#74b9ff' },
        { main: '#e17055', accent: '#fab1a0' },
        { main: '#6c5ce7', accent: '#a29bfe' }
      ];
      const skin = enemySkins[Math.floor(Math.random() * enemySkins.length)];

      obstacles.push({
        x: posX,
        y: -80,
        width: 40,
        height: 70,
        color: skin.main,
        accentColor: skin.accent
      });
    } else if (typeRandom < 0.90) {
      coins.push({
        x: lanes[laneIdx],
        y: -30,
        radius: 10
      });
    } else {
      const pTypes = ['SHIELD', 'TURBO', 'MAGNET'];
      powerups.push({
        x: lanes[laneIdx],
        y: -30,
        radius: 12,
        type: pTypes[Math.floor(Math.random() * pTypes.length)]
      });
    }
  }
}

// Atualização da Lógica do Jogo
function update() {
  if (!isPlaying || isGameOver) return;

  frameCount++;
  score += Math.floor(gameSpeed / 4);
  gameSpeed = 6 + Math.floor(score / 300) * 0.5;

  player.x += (player.targetX - player.x) * 0.25;
  player.tilt *= 0.85;

  if (frameCount % 3 === 0) {
    createParticles(player.x + 8, player.y + 65, '#555', 1);
    createParticles(player.x + 32, player.y + 65, '#555', 1);
  }

  const currentSpeed = player.turboActive ? gameSpeed * 2 : gameSpeed;
  roadOffset = (roadOffset + currentSpeed) % 40;
  bgOffset = (bgOffset + currentSpeed * 0.3) % 60;

  if (player.powerupTimer > 0) {
    player.powerupTimer--;
    const progress = (player.powerupTimer / player.powerupDuration) * 100;
    powerupProgress.style.width = `${progress}%`;

    if (player.powerupTimer === 0) {
      player.shieldActive = false;
      player.turboActive = false;
      player.magnetActive = false;
      powerupBar.classList.add('hidden');
    }
  }

  spawnEntities();

  particles.forEach((p, index) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(index, 1);
  });

  for (let i = coins.length - 1; i >= 0; i--) {
    let c = coins[i];
    c.y += currentSpeed;

    if (player.magnetActive) {
      const dx = (player.x + player.width / 2) - c.x;
      const dy = player.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 180) {
        c.x += dx * 0.15;
        c.y += dy * 0.15;
      }
    }

    if (Math.hypot((player.x + player.width / 2) - c.x, (player.y + player.height / 2) - c.y) < 30) {
      coinsCollected++;
      createParticles(c.x, c.y, '#f1c40f', 8);
      coins.splice(i, 1);
      continue;
    }

    if (c.y > canvas.height) coins.splice(i, 1);
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    p.y += currentSpeed;

    if (Math.hypot((player.x + player.width / 2) - p.x, (player.y + player.height / 2) - p.y) < 30) {
      activatePowerup(p.type);
      createParticles(p.x, p.y, '#00f3ff', 12);
      powerups.splice(i, 1);
      continue;
    }

    if (p.y > canvas.height) powerups.splice(i, 1);
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.y += currentSpeed;

    if (
      player.x + 5 < obs.x + obs.width &&
      player.x + player.width - 5 > obs.x &&
      player.y + 5 < obs.y + obs.height &&
      player.y + player.height - 5 > obs.y
    ) {
      if (player.turboActive) {
        createParticles(obs.x + 20, obs.y + 35, obs.color, 15);
        obstacles.splice(i, 1);
      } else if (player.shieldActive) {
        player.shieldActive = false;
        player.powerupTimer = 0;
        powerupBar.classList.add('hidden');
        createParticles(player.x + 20, player.y + 35, '#3498db', 20);
        obstacles.splice(i, 1);
      } else {
        triggerGameOver();
      }
    }

    if (obs.y > canvas.height) obstacles.splice(i, 1);
  }

  updateUI();
}

function activatePowerup(type) {
  player.shieldActive = type === 'SHIELD';
  player.turboActive = type === 'TURBO';
  player.magnetActive = type === 'MAGNET';

  player.powerupDuration = 300;
  player.powerupTimer = player.powerupDuration;

  powerupName.textContent = type;
  powerupBar.classList.remove('hidden');
}

// Desenho da Arte Pixel dos Obstáculos
function drawCar(x, y, w, h, color, accentColor, tilt) {
  const p = w / 10;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt || 0);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + p, -h / 2 + p, w, h);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.fillStyle = '#2d3436';
  ctx.fillRect(-w / 2 + p, -h / 2 + p, p * 2, h - p * 2);
  ctx.fillRect(w / 2 - p * 3, -h / 2 + p, p * 2, h - p * 2);

  ctx.fillStyle = '#636e72';
  for (let i = -h / 2 + p * 2; i < h / 2 - p * 2; i += p * 2) {
    ctx.fillRect(-w / 2 + p, i, p * 2, p);
    ctx.fillRect(w / 2 - p * 3, i, p * 2, p);
  }

  ctx.fillStyle = color;
  ctx.fillRect(-w / 2 + p * 2, -h / 2 + p * 2, w - p * 4, h - p * 4);

  ctx.fillStyle = accentColor;
  ctx.fillRect(-w / 2 + p * 3, -h / 2 + p * 4, w - p * 6, h - p * 8);

  ctx.fillStyle = '#2d3436';
  ctx.fillRect(-p, -p * 2, p * 2, p * 3);
  ctx.fillStyle = '#00cec9';
  ctx.fillRect(-p + 1, -p * 2 + 1, p, p);

  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(-w / 2 + p * 3, -h / 2 + p * 2, p * 2, p);
  ctx.fillRect(w / 2 - p * 5, -h / 2 + p * 2, p * 2, p);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2 + p * 2, -h / 2 + p, p * 2, p);
  ctx.fillRect(w / 2 - p * 4, -h / 2 + p, p * 2, p);

  ctx.fillStyle = '#ff7675';
  ctx.fillRect(-w / 2 + p * 3, h / 2 - p * 2, p * 2, p);
  ctx.fillRect(w / 2 - p * 5, h / 2 - p * 2, p * 2, p);

  ctx.restore();
}

// Renderização Geral
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#161b22';
  for (let y = -60 + bgOffset; y < canvas.height; y += 60) {
    ctx.fillRect(10, y, 40, 20);
    ctx.fillRect(canvas.width - 50, y, 40, 20);
  }

  ctx.fillStyle = '#1f242d';
  ctx.fillRect(60, 0, 280, canvas.height);

  ctx.fillStyle = (frameCount % 10 < 5) ? '#e74c3c' : '#ecf0f1';
  ctx.fillRect(54, 0, 6, canvas.height);
  ctx.fillRect(340, 0, 6, canvas.height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 20]);
  ctx.lineDashOffset = -roadOffset;

  [155, 245].forEach(laneX => {
    ctx.beginPath();
    ctx.moveTo(laneX, 0);
    ctx.lineTo(laneX, canvas.height);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  coins.forEach(c => {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d35400';
    ctx.font = '10px sans-serif';
    ctx.fillText('🪙', c.x - 5, c.y + 4);
  });

  powerups.forEach(p => {
    ctx.fillStyle = p.type === 'SHIELD' ? '#3498db' : p.type === 'TURBO' ? '#f1c40f' : '#9b59b6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(p.type[0], p.x - 3, p.y + 4);
  });

  obstacles.forEach(obs => {
    drawCar(obs.x, obs.y, obs.width, obs.height, obs.color, obs.accentColor, 0);
  });

  // Renderiza Jogador usando a imagem customizada car.png
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.tilt);

  if (playerImg.complete) {
    ctx.drawImage(playerImg, -player.width / 2, -player.height / 2, player.width, player.height);
  } else {
    drawCar(-player.width / 2, -player.height / 2, player.width, player.height, '#2ecc71', '#27ae60', 0);
  }

  if (player.shieldActive) {
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.stroke();
  } else if (player.turboActive) {
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function triggerGameOver() {
  isGameOver = true;
  isPlaying = false;

  const isNewRecord = score > saveData.highScore;
  saveGameProgress();

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-coins').textContent = coinsCollected;
  
  const recordTag = document.getElementById('new-record-tag');
  if (isNewRecord) recordTag.classList.remove('hidden');
  else recordTag.classList.add('hidden');

  gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  score = 0;
  coinsCollected = 0;
  gameSpeed = 6;
  frameCount = 0;
  obstacles = [];
  coins = [];
  powerups = [];
  particles = [];
  currentLane = 1;
  player.x = lanes[1] - 20;
  player.targetX = player.x;
  player.shieldActive = false;
  player.turboActive = false;
  player.magnetActive = false;
  player.powerupTimer = 0;

  isGameOver = false;
  isPlaying = true;

  gameOverScreen.classList.add('hidden');
  menuScreen.classList.add('hidden');
  powerupBar.classList.add('hidden');
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);

updateShopUI();
updateUI();
gameLoop();
