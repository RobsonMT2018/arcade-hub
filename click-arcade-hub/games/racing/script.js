const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// Configuração das Pistas (3 Faixas)
const lanes = [110, 200, 290]; // Posições X centrais de cada faixa
let currentLane = 1; // Começa na faixa do meio

// Garagem / Skins de Carro
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

// Carrega saves
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

// Escutadores de Teclas (Troca de faixa simples e precisa)
window.addEventListener('keydown', (e) => {
  if (!isPlaying || isGameOver) return;

  if ((e.key === 'ArrowLeft' || e.key === 'a') && currentLane > 0) {
    currentLane--;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = -0.15; // Inclina carro para esquerda
  }
  if ((e.key === 'ArrowRight' || e.key === 'd') && currentLane < lanes.length - 1) {
    currentLane++;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = 0.15; // Inclina carro para direita
  }
});

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

// Spawners de Elementos
function spawnEntities() {
  if (frameCount % Math.max(25, Math.floor(80 - gameSpeed * 3)) === 0) {
    const laneIdx = Math.floor(Math.random() * 3);
    const posX = lanes[laneIdx] - 20;

    // Garante que não nasça um obstáculo em cima de outro item
    const typeRandom = Math.random();
    if (typeRandom < 0.65) {
      // Obstáculo
      obstacles.push({
        x: posX,
        y: -80,
        width: 40,
        height: 70,
        color: ['#e67e22', '#8e44ad', '#2c3e50'][Math.floor(Math.random() * 3)]
      });
    } else if (typeRandom < 0.90) {
      // Moedas
      coins.push({
        x: lanes[laneIdx],
        y: -30,
        radius: 10
      });
    } else {
      // Power-Up (Shield, Turbo, Magnet)
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
  gameSpeed = 6 + Math.floor(score / 300) * 0.5; // Aceleração gradual

  // Suavização do movimento horizontal (Interpolador LERP)
  player.x += (player.targetX - player.x) * 0.25;
  player.tilt *= 0.85; // Retorna suavizado à rotação neutra

  // Rastro das rodas (Partículas)
  if (frameCount % 3 === 0) {
    createParticles(player.x + 8, player.y + 65, '#555', 1);
    createParticles(player.x + 32, player.y + 65, '#555', 1);
  }

  // Atualização Parallax/Pista
  const currentSpeed = player.turboActive ? gameSpeed * 2 : gameSpeed;
  roadOffset = (roadOffset + currentSpeed) % 40;
  bgOffset = (bgOffset + currentSpeed * 0.3) % 60;

  // Gerencia Power-ups temporários
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

  // Atualiza Partículas
  particles.forEach((p, index) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(index, 1);
  });

  // Atualiza Moedas
  for (let i = coins.length - 1; i >= 0; i--) {
    let c = coins[i];
    c.y += currentSpeed;

    // Ímã atrai moedas
    if (player.magnetActive) {
      const dx = (player.x + player.width / 2) - c.x;
      const dy = player.y - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 180) {
        c.x += dx * 0.15;
        c.y += dy * 0.15;
      }
    }

    // Coleta Moeda
    if (Math.hypot((player.x + player.width / 2) - c.x, (player.y + player.height / 2) - c.y) < 30) {
      coinsCollected++;
      createParticles(c.x, c.y, '#f1c40f', 8);
      coins.splice(i, 1);
      continue;
    }

    if (c.y > canvas.height) coins.splice(i, 1);
  }

  // Atualiza Power-ups
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

  // Atualiza Obstáculos
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.y += currentSpeed;

    // Colisão AABB com folga de tolerância
    if (
      player.x + 5 < obs.x + obs.width &&
      player.x + player.width - 5 > obs.x &&
      player.y + 5 < obs.y + obs.height &&
      player.y + player.height - 5 > obs.y
    ) {
      if (player.turboActive) {
        // Destrói obstáculos no modo Turbo
        createParticles(obs.x + 20, obs.y + 35, obs.color, 15);
        obstacles.splice(i, 1);
      } else if (player.shieldActive) {
        // Escudo Absorve
        player.shieldActive = false;
        player.powerupTimer = 0;
        powerupBar.classList.add('hidden');
        createParticles(player.x + 20, player.y + 35, '#3498db', 20);
        obstacles.splice(i, 1);
      } else {
        // Game Over
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

  player.powerupDuration = 300; // ~5 segundos a 60fps
  player.powerupTimer = player.powerupDuration;

  powerupName.textContent = type;
  powerupBar.classList.remove('hidden');
}

// Renderização
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Cenário Lateral / Parallax
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vegetação/Detalhes distantes
  ctx.fillStyle = '#161b22';
  for (let y = -60 + bgOffset; y < canvas.height; y += 60) {
    ctx.fillRect(10, y, 40, 20);
    ctx.fillRect(canvas.width - 50, y, 40, 20);
  }

  // 2. Pista
  ctx.fillStyle = '#1f242d';
  ctx.fillRect(60, 0, 280, canvas.height);

  // Zebras laterais
  ctx.fillStyle = (frameCount % 10 < 5) ? '#e74c3c' : '#ecf0f1';
  ctx.fillRect(54, 0, 6, canvas.height);
  ctx.fillRect(340, 0, 6, canvas.height);

  // Linhas divisórias das 3 faixas
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

  // 3. Renderiza Partículas
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  // 4. Renderiza Moedas
  coins.forEach(c => {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d35400';
    ctx.font = '10px sans-serif';
    ctx.fillText('🪙', c.x - 5, c.y + 4);
  });

  // 5. Renderiza Power-ups
  powerups.forEach(p => {
    ctx.fillStyle = p.type === 'SHIELD' ? '#3498db' : p.type === 'TURBO' ? '#f1c40f' : '#9b59b6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(p.type[0], p.x - 3, p.y + 4);
  });

  // 6. Renderiza Obstáculos (Outros Carros)
  obstacles.forEach(obs => {
    drawCar(obs.x, obs.y, obs.width, obs.height, obs.color, '#111', 0);
  });

  // 7. Renderiza Jogador
  const skin = CAR_SKINS[CAR_SKINS.findIndex(s => s.id === saveData.selectedSkin)] || CAR_SKINS[0];
  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.tilt);

  drawCar(-player.width / 2, -player.height / 2, player.width, player.height, skin.color, skin.accent, player.tilt);

  // Aura do Escudo/Turbo
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

// Desenhista Genérico de Carro
function drawCar(x, y, w, h, color, accentColor, tilt) {
  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 4, y + 4, w, h);

  // Chassis
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Detalhes / Listras
  ctx.fillStyle = accentColor;
  ctx.fillRect(x + w * 0.3, y, w * 0.4, h);

  // Vidros
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 5, y + 15, w - 10, 14); // Parabrisa
  ctx.fillRect(x + 6, y + h - 22, w - 12, 10); // Traseiro

  // Faróis
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 2, y + 2, 8, 4);
  ctx.fillRect(x + w - 10, y + 2, 8, 4);

  // Lanternas
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x + 2, y + h - 4, 8, 3);
  ctx.fillRect(x + w - 10, y + h - 4, 8, 3);
}

// Controle do Loop e Estados
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

// Event Listeners
startBtn.addEventListener('click', () => {
  resetGame();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

// Inicialização
updateShopUI();
updateUI();
gameLoop();