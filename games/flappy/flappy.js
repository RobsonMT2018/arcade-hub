const canvas = document.getElementById('flappyCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');

let score = 0;
let highScore = localStorage.getItem('flappy_highscore') || 0;
highScoreEl.innerText = highScore;

let gameRunning = false;
let animationId = null;

// Configurações do Pássaro
const bird = {
  x: 50,
  y: 150,
  radius: 12,
  gravity: 0.25,
  jump: -5.5,
  velocity: 0
};

// Canos (Obstáculos)
let pipes = [];
const pipeWidth = 50;
const pipeGap = 120;
let frameCount = 0;

// Eventos de Pulo
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (gameRunning) flap();
    else startGame();
  }
});

canvas.addEventListener('click', () => {
  if (gameRunning) flap();
});

function flap() {
  bird.velocity = bird.jump;
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
  // Física do Pássaro
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;

  // Colisão com o Chão / Teto
  if (bird.y + bird.radius >= canvas.height || bird.y - bird.radius <= 0) {
    gameOver();
    return;
  }

  // Gerar Canos
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

  // Mover e verificar Canos
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= 2;

    // Colisão do Pássaro com os Canos
    if (
      bird.x + bird.radius > p.x &&
      bird.x - bird.radius < p.x + pipeWidth &&
      (bird.y - bird.radius < p.top || bird.y + bird.radius > canvas.height - p.bottom)
    ) {
      gameOver();
      return;
    }

    // Incrementar Pontuação
    if (!p.passed && p.x + pipeWidth < bird.x) {
      p.passed = true;
      score++;
      scoreEl.innerText = score;

      if (score > highScore) {
        highScore = score;
        highScoreEl.innerText = highScore;
        localStorage.setItem('flappy_highscore', highScore);
      }
    }

    // Remover canos fora da tela
    if (p.x + pipeWidth < 0) {
      pipes.splice(i, 1);
    }
  }
}

function draw() {
  // Limpar Tela (Céu)
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenhar Nuvens de Fundo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(80, 80, 25, 0, Math.PI * 2);
  ctx.arc(110, 80, 35, 0, Math.PI * 2);
  ctx.arc(280, 120, 30, 0, Math.PI * 2);
  ctx.fill();

  // Desenhar Canos
  pipes.forEach(p => {
    ctx.fillStyle = '#22c55e'; // Verde Mario
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;

    // Cano Superior
    ctx.fillRect(p.x, 0, pipeWidth, p.top);
    ctx.strokeRect(p.x, 0, pipeWidth, p.top);

    // Cano Inferior
    ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
    ctx.strokeRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
  });

  // Desenhar Pássaro (Amarelo)
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.stroke();

  // Olho do Pássaro
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(bird.x + 6, bird.y - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // Bico
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(bird.x + 10, bird.y + 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function gameOver() {
  gameRunning = false;
  cancelAnimationFrame(animationId);

  overlayTitle.innerText = 'Game Over!';
  overlayTitle.style.color = '#ef4444';
  overlayMsg.innerText = `Sua pontuação foi: ${score}`;
  overlay.style.display = 'flex';
}