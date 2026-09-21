const canvas = document.getElementById('flappyCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const gameArea = document.getElementById('game-area');

let score = 0;
let highScore = Number(localStorage.getItem('flappy_highscore')) || 0;
highScoreEl.innerText = highScore;

let gameRunning = false;
let animationId = null;
let audioContext = null;

const bird = {
  x: 50,
  y: 150,
  radius: 12,
  gravity: 0.25,
  jump: -5.5,
  velocity: 0
};

let pipes = [];
const pipeWidth = 50;
const pipeGap = 120;
let frameCount = 0;

const clouds = [
  { x: 40, y: 70, size: 1.1, speed: 0.3, phase: 0.3 },
  { x: 180, y: 120, size: 1.4, speed: 0.45, phase: 1.1 },
  { x: 280, y: 70, size: 1.15, speed: 0.25, phase: 2.2 },
  { x: 330, y: 140, size: 1.6, speed: 0.5, phase: 3.8 }
];

function ensureAudio() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function playTone({ frequency = 440, duration = 0.12, type = 'sine', volume = 0.05, endFrequency = null }) {
  const context = ensureAudio();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playFlapSound() {
  playTone({ frequency: 700, duration: 0.08, type: 'square', volume: 0.045, endFrequency: 340 });
}

function playScoreSound() {
  playTone({ frequency: 900, duration: 0.09, type: 'triangle', volume: 0.04, endFrequency: 1200 });
}

function playCrashSound() {
  playTone({ frequency: 180, duration: 0.18, type: 'sawtooth', volume: 0.06, endFrequency: 70 });
  setTimeout(() => {
    playTone({ frequency: 110, duration: 0.22, type: 'square', volume: 0.05, endFrequency: 40 });
  }, 60);
}

document.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'ArrowUp') {
    event.preventDefault();
    handleInput();
  }
});

gameArea.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  handleInput();
});

function handleInput() {
  ensureAudio();

  if (!gameRunning) {
    startGame();
  }

  flap();
}

function flap() {
  bird.velocity = bird.jump;
  playFlapSound();
}

function startGame() {
  bird.y = 150;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frameCount = 0;
  scoreEl.innerText = score;
  gameRunning = true;

  overlay.style.display = 'none';

  if (animationId) cancelAnimationFrame(animationId);
  gameLoop();
}

function gameLoop() {
  if (!gameRunning) return;

  update();
  draw();

  frameCount++;
  animationId = requestAnimationFrame(gameLoop);
}

function update() {
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;

  if (bird.y + bird.radius >= canvas.height || bird.y - bird.radius <= 0) {
    gameOver();
    return;
  }

  if (frameCount % 100 === 0) {
    const minHeight = 40;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
      x: canvas.width,
      top: topHeight,
      bottom: canvas.height - topHeight - pipeGap,
      passed: false
    });
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= 2;

    if (
      bird.x + bird.radius > p.x &&
      bird.x - bird.radius < p.x + pipeWidth &&
      (bird.y - bird.radius < p.top || bird.y + bird.radius > canvas.height - p.bottom)
    ) {
      gameOver();
      return;
    }

    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;
      scoreEl.innerText = score;
      playScoreSound();

      if (score > highScore) {
        highScore = score;
        highScoreEl.innerText = highScore;
        localStorage.setItem('flappy_highscore', highScore);
      }
    }

    if (p.x + pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }

  clouds.forEach((cloud) => {
    cloud.x -= cloud.speed;
    if (cloud.x < -120) {
      cloud.x = canvas.width + 30;
      cloud.y = 40 + Math.random() * 130;
    }
  });
}

function drawCloud(cloud) {
  const baseX = cloud.x;
  const baseY = cloud.y;
  const cloudScale = cloud.size;
  const pulse = 1 + Math.sin(frameCount * 0.06 + cloud.phase) * 0.08;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(cloudScale * pulse, cloudScale * pulse);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(28, -12, 23, 0, Math.PI * 2);
  ctx.arc(52, 0, 20, 0, Math.PI * 2);
  ctx.arc(18, 14, 24, 0, Math.PI * 2);
  ctx.arc(44, 16, 22, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.ellipse(30, 10, 52, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, '#76d7ff');
  skyGradient.addColorStop(0.55, '#a7e8ff');
  skyGradient.addColorStop(1, '#dff6ff');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 8; i++) {
    const y = 30 + i * 42;
    ctx.fillRect(0, y, canvas.width, 1);
  }

  clouds.forEach(drawCloud);
}

function draw() {
  drawBackground();

  pipes.forEach((p) => {
    ctx.fillStyle = '#25944d';
    ctx.strokeStyle = '#17552ee0';
    ctx.lineWidth = 2;

    ctx.fillRect(p.x, 0, pipeWidth, p.top);
    ctx.strokeRect(p.x, 0, pipeWidth, p.top);

    ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
    ctx.strokeRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);

    ctx.fillStyle = '#324646';
    ctx.fillRect(p.x - 4, p.top - 18, pipeWidth + 8, 20);
    ctx.fillRect(p.x - 4, canvas.height - p.bottom, pipeWidth + 8, 20);
  });

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 4, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(bird.x + 6, bird.y - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(bird.x + 10, bird.y + 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function gameOver() {
  gameRunning = false;
  cancelAnimationFrame(animationId);
  playCrashSound();

  overlayTitle.innerText = 'FIM DE JOGO';
  overlayTitle.style.color = '#ef4444';
  overlayMsg.innerText = `Pontuacao final: ${score}. Toque para tentar novamente`;
  overlay.style.display = 'flex';
}