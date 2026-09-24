const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

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

// Configuração Web Audio API (Sintetizador de Efeitos Sonoros)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

function playSound(type) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'coin') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'powerup') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'crash') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'move') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// Configuração das Pistas (3 Faixas)
const lanes = [110, 200, 290];
let currentLane = 1;

// Lista de Veículos para Seleção na Garagem
const CAR_SKINS = [
  { id: 0, name: 'Tanque Militar', color: '#2ecc71', accent: '#27ae60', price: 0, unlocked: true },
  { id: 1, name: 'Tático Vermelho', color: '#d63031', accent: '#ff7675', price: 30, unlocked: false },
  { id: 2, name: 'Cyber Blue', color: '#0984e3', accent: '#74b9ff', price: 60, unlocked: false },
  { id: 3, name: 'Ouro Especial', color: '#f1c40f', accent: '#e67e22', price: 100, unlocked: false }
];

let selectedCarIndex = 0;

// Carregar Dados Salvos
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

// Parâmetros do Jogo
let isPlaying = false;
let isGameOver = false;
let score = 0;
let coinsCollected = 0;
let gameSpeed = 6;
let frameCount = 0;

let roadOffset = 0;
let bgOffset = 0;

// Objeto do Jogador
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

// Coleções de Objetos do Jogo
let obstacles = [];
let coins = [];
let powerups = [];
let particles = [];

// Funções de Troca de Faixa
function moveLeft() {
  if (!isPlaying || isGameOver) return;
  if (currentLane > 0) {
    currentLane--;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = -0.15;
    playSound('move');
  }
}

function moveRight() {
  if (!isPlaying || isGameOver) return;
  if (currentLane < lanes.length - 1) {
    currentLane++;
    player.targetX = lanes[currentLane] - player.width / 2;
    player.tilt = 0.15;
    playSound('move');
  }
}

// Ouvintes de Teclado e Touch
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
  if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
});

btnLeft.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  moveLeft();
});

btnRight.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  moveRight();
});

// Atualizar Garagem e UI
function updateShopUI() {
  const car = CAR_SKINS[selectedCarIndex];
  carNameEl.textContent = car.name;
  
  if (car.unlocked) {
    carStatusEl.textContent = selectedCarIndex === saveData.selectedSkin ? 'SELECIONADO' : 'ADQUIRIDO';
    carStatusEl.className = 'status-owned';
    buyBtn.classList.add('hidden');
  } else {
    carStatusEl.textContent = 'BLOQUEADO';
    carStatusEl.className = 'status-locked';
    buyBtn.textContent = `COMPRAR (${car.price} 🪙)`;
    buyBtn.classList.remove('hidden');
  }

  // Renderiza a visualização do carro no mini-canvas
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  drawCarOnContext(previewCtx, 10, 10, 40, 70, car.color, car.accent, 0);
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
    playSound('powerup');
  }
});

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

// Criação de Partículas
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

// Geração dos Elementos na Pista
function spawnEntities() {
  if (frameCount % Math.max(25, Math.floor(80 - gameSpeed * 3)) === 0) {
    const laneIdx = Math.floor(Math.random() * 3);
    const posX = lanes[laneIdx] - 20;

    const typeRandom = Math.random();
    if (typeRandom < 0.65) {
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
      coins.push({ x: lanes[laneIdx], y: -30, radius: 10 });
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

// Loop de Atualização de Lógica
function update() {
  if (!isPlaying || isGameOver) return;

  frameCount++;
  score += Math.floor(gameSpeed / 4);
  gameSpeed = 6 + Math.floor(score / 300) * 0.5;

  player.x += (player.targetX - player.x) * 0.25;
  player.tilt *= 0.85;

  if (frameCount % 4 === 0) {
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
      if (Math.hypot(dx, dy) < 180) {
        c.x += dx * 0.15;
        c.y += dy * 0.15;
      }
    }

    if (Math.hypot((player.x + player.width / 2) - c.x, (player.y + player.height / 2) - c.y) < 30) {
      coinsCollected++;
      playSound('coin');
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
      playSound('powerup');
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
        playSound('crash');
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

// Função Universal para desenhar os Carros em estilo Pixel Art
function drawCarOnContext(targetCtx, x, y, w, h, color, accentColor, tilt) {
  const p = w / 10;

  targetCtx.save();
  targetCtx.translate(x + w / 2, y + h / 2);
  targetCtx.rotate(tilt || 0);

  targetCtx.fillStyle = 'rgba(0,0,0,0.3)';
  targetCtx.fillRect(-w / 2 + p, -h / 2 + p, w, h);

  targetCtx.fillStyle = '#0a0a0a';
  targetCtx.fillRect(-w / 2, -h / 2, w, h);

  targetCtx.fillStyle = '#2d3436';
  targetCtx.fillRect(-w / 2 + p, -h / 2 + p, p * 2, h - p * 2);
  targetCtx.fillRect(w / 2 - p * 3, -h / 2 + p, p * 2, h - p * 2);

  targetCtx.fillStyle = '#636e72';
  for (let i = -h / 2 + p * 2; i < h / 2 - p * 2; i += p * 2) {
    targetCtx.fillRect(-w / 2 + p, i, p * 2, p);
    targetCtx.fillRect(w / 2 - p * 3, i, p * 2, p);
  }

  targetCtx.fillStyle = color;
  targetCtx.fillRect(-w / 2 + p * 2, -h / 2 + p * 2, w - p * 4, h - p * 4);

  targetCtx.fillStyle = accentColor;
  targetCtx.fillRect(-w / 2 + p * 3, -h / 2 + p * 4, w - p * 6, h - p * 8);

  targetCtx.fillStyle = '#2d3436';
  targetCtx.fillRect(-p, -p * 2, p * 2, p * 3);
  targetCtx.fillStyle = '#00cec9';
  targetCtx.fillRect(-p + 1, -p * 2 + 1, p, p);

  targetCtx.fillStyle = '#f1c40f';
  targetCtx.fillRect(-w / 2 + p * 3, -h / 2 + p * 2, p * 2, p);
  targetCtx.fillRect(w / 2 - p * 5, -h / 2 + p * 2, p * 2, p);

  targetCtx.fillStyle = '#ffffff';
  targetCtx.fillRect(-w / 2 + p * 2, -h / 2 + p, p * 2, p);
  targetCtx.fillRect(w / 2 - p * 4, -h / 2 + p, p * 2, p);

  targetCtx.fillStyle = '#ff7675';
  targetCtx.fillRect(-w / 2 + p * 3, h / 2 - p * 2, p * 2, p);
  targetCtx.fillRect(w / 2 - p * 5, h / 2 - p * 2, p * 2, p);

  targetCtx.restore();
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
  });

  powerups.forEach(p => {
    ctx.fillStyle = p.type === 'SHIELD' ? '#3498db' : p.type === 'TURBO' ? '#f1c40f' : '#9b59b6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Renderiza Obstáculos
  obstacles.forEach(obs => {
    drawCarOnContext(ctx, obs.x, obs.y, obs.width, obs.height, obs.color, obs.accentColor, 0);
  });

  // Renderiza o Carro do Jogador com a Skin Selecionada
  const activeSkin = CAR_SKINS[saveData.selectedSkin] || CAR_SKINS[0];
  drawCarOnContext(ctx, player.x, player.y, player.width, player.height, activeSkin.color, activeSkin.accent, player.tilt);

  if (player.shieldActive) {
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 45, 0, Math.PI * 2);
    ctx.stroke();
  }
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
  initAudio();
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
