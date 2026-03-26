<template>
  <div class="home-container">
    <n-card title="俄罗斯方块（Tetris）" class="game-card">
      <div class="layout">
        <canvas ref="canvasEl" class="board" />

        <div class="side">
          <div class="stat-row">
            <div class="stat-label">状态</div>
            <div class="stat-value">{{ statusText }}</div>
          </div>

          <n-divider />

          <div class="stat-row">
            <div class="stat-label">分数</div>
            <div class="stat-value">{{ score }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-label">等级</div>
            <div class="stat-value">{{ level }}</div>
          </div>

          <n-divider />

          <n-space vertical>
            <n-button type="primary" @click="togglePause">
              {{ gameOver ? "再来一局" : started ? (running ? "暂停" : "继续") : "开始" }}
            </n-button>
            <n-button quaternary @click="restart">重新开始</n-button>
          </n-space>

          <div class="help">
            <div class="help-title">按键</div>
            <div>←/→：移动</div>
            <div>↓：软降</div>
            <div>↑：旋转</div>
            <div>Space：硬降</div>
            <div>P：暂停/继续</div>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

type Cell = number; // -1 empty, 0..6 piece type
const EMPTY = -1;

const COLS = 10;
const VISIBLE_ROWS = 20;
const HIDDEN_ROWS = 2;
const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

type Matrix = number[][];
type Point = { x: number; y: number };

type PieceType = 0 | 1 | 2 | 3 | 4 | 5 | 6;
interface PieceDef {
  color: string;
  matrix: Matrix; // 4x4 base matrix
}
interface Piece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

const PIECES: PieceDef[] = [
  // I
  {
    color: "#00E5FF",
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // J
  {
    color: "#4D7CFF",
    matrix: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // L
  {
    color: "#FFB020",
    matrix: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // O
  {
    color: "#FFD54A",
    matrix: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // S
  {
    color: "#4CAF50",
    matrix: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // Z
  {
    color: "#F44336",
    matrix: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  // T
  {
    color: "#B388FF",
    matrix: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
];

function rotateMatrixCW(m: Matrix): Matrix {
  // 4x4 rotation
  const n = m.length;
  const res: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      res[y][x] = m[n - 1 - x][y];
    }
  }
  return res;
}

const shapes = PIECES.map((p) => {
  const rots: Matrix[] = [p.matrix];
  rots.push(rotateMatrixCW(rots[0]));
  rots.push(rotateMatrixCW(rots[1]));
  rots.push(rotateMatrixCW(rots[2]));

  const points = rots.map((mat) => {
    const pts: Point[] = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (mat[y][x]) pts.push({ x, y });
      }
    }
    return pts;
  });

  return { color: p.color, points };
});

function createBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => EMPTY));
}

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const canvasEl = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let rafId = 0;

let board: Cell[][] = createBoard();
let current: Piece | null = null;
let queue: PieceType[] = [];

const started = ref(false);
const running = ref(false);
const gameOver = ref(false);

const score = ref(0);
const level = ref(1);
let totalLines = 0;

const statusText = computed(() => {
  if (!started.value) return "未开始（按“开始”或 Space）";
  if (gameOver.value) return "游戏结束";
  if (running.value) return "进行中";
  return "已暂停";
});

let cellSize = 24;
let canvasW = COLS * cellSize;
let canvasH = VISIBLE_ROWS * cellSize;

let softDropping = false;
let lastTime = 0;
let dropCounter = 0;

function getDropIntervalMs(lvl: number) {
  // Simple speed curve.
  const base = 800;
  const ms = base * Math.pow(0.85, lvl - 1);
  return Math.max(60, Math.round(ms));
}

function piecePoints(piece: Piece): Point[] {
  return shapes[piece.type].points[piece.rot % 4];
}

function canPlace(piece: Piece): boolean {
  const pts = piecePoints(piece);
  for (const pt of pts) {
    const x = piece.x + pt.x;
    const y = piece.y + pt.y;

    if (x < 0 || x >= COLS) return false;
    if (y >= ROWS) return false;
    if (y >= 0 && board[y][x] !== EMPTY) return false;
  }
  return true;
}

function mergePiece(piece: Piece) {
  for (const pt of piecePoints(piece)) {
    const x = piece.x + pt.x;
    const y = piece.y + pt.y;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      board[y][x] = piece.type;
    }
  }
}

function clearLines() {
  const fullRows: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((c) => c !== EMPTY)) fullRows.push(y);
  }

  if (fullRows.length === 0) return 0;

  // Remove from bottom to top.
  for (const y of fullRows.sort((a, b) => b - a)) {
    board.splice(y, 1);
    board.unshift(Array.from({ length: COLS }, () => EMPTY));
  }

  return fullRows.length;
}

function scoreForLines(lines: number, lvl: number) {
  // Classic-ish scoring.
  const base = [0, 100, 300, 500, 800][lines] ?? 0;
  return base * lvl;
}

function ensureQueue() {
  // 7-bag randomizer
  while (queue.length < 7) {
    const bag = shuffle([0, 1, 2, 3, 4, 5, 6]) as PieceType[];
    queue.push(...bag);
  }
}

function spawnPiece() {
  ensureQueue();
  const type = queue.shift()!;
  const p: Piece = {
    type,
    rot: 0,
    x: 3,
    y: 0,
  };
  current = p;
  if (!canPlace(p)) {
    gameOver.value = true;
    running.value = false;
    started.value = true;
  }
}

function tryMove(dx: number, dy: number) {
  if (!current) return false;
  const next: Piece = { ...current, x: current.x + dx, y: current.y + dy };
  if (!canPlace(next)) return false;
  current = next;
  return true;
}

function tryRotate(dir: 1 | -1) {
  if (!current) return false;
  const nextRot = (current.rot + (dir === 1 ? 1 : -1) + 4) % 4;
  const rotated: Piece = { ...current, rot: nextRot };

  if (canPlace(rotated)) {
    current = rotated;
    return true;
  }

  // Basic wall-kick: try several offsets.
  const kicks = [
    { dx: 0, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -2, dy: 0 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
  ];
  for (const k of kicks) {
    const kicked: Piece = { ...rotated, x: rotated.x + k.dx, y: rotated.y + k.dy };
    if (canPlace(kicked)) {
      current = kicked;
      return true;
    }
  }

  return false;
}

function hardDrop() {
  if (!current) return;
  while (tryMove(0, 1)) {
    // Keep moving.
  }
  lockPiece();
}

function getGhostY(piece: Piece) {
  let y = piece.y;
  while (true) {
    const next: Piece = { ...piece, y: y + 1 };
    if (!canPlace(next)) break;
    y++;
  }
  return y;
}

function lockPiece() {
  if (!current) return;
  mergePiece(current);

  const cleared = clearLines();
  if (cleared > 0) {
    score.value += scoreForLines(cleared, level.value);
    totalLines += cleared;
    const newLevel = Math.floor(totalLines / 10) + 1;
    level.value = newLevel;
  }

  spawnPiece();
}

function resizeCanvas() {
  const maxSide = Math.min(420, window.innerWidth - 120);
  cellSize = Math.max(16, Math.floor(maxSide / COLS));
  canvasW = COLS * cellSize;
  canvasH = VISIBLE_ROWS * cellSize;

  if (!canvasEl.value) return;
  const dpr = window.devicePixelRatio || 1;
  canvasEl.value.width = Math.floor(canvasW * dpr);
  canvasEl.value.height = Math.floor(canvasH * dpr);
  canvasEl.value.style.width = `${canvasW}px`;
  canvasEl.value.style.height = `${canvasH}px`;

  ctx = canvasEl.value.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawCell(x: number, y: number, color: string, alpha = 1) {
  if (!ctx) return;
  const px = x * cellSize;
  const py = y * cellSize;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

  // Subtle border for readability.
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
  ctx.globalAlpha = 1;
}

function render() {
  if (!ctx) return;

  // Background
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, canvasH);
    ctx.stroke();
  }
  for (let y = 0; y <= VISIBLE_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(canvasW, y * cellSize);
    ctx.stroke();
  }

  // Static blocks
  for (let y = HIDDEN_ROWS; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = board[y][x];
      if (c !== EMPTY) {
        drawCell(x, y - HIDDEN_ROWS, shapes[c].color);
      }
    }
  }

  // Ghost
  if (current) {
    const ghostY = getGhostY(current);
    const ghostPiece: Piece = { ...current, y: ghostY };
    for (const pt of piecePoints(ghostPiece)) {
      const x = ghostPiece.x + pt.x;
      const y = ghostPiece.y + pt.y;
      if (y >= HIDDEN_ROWS) {
        drawCell(x, y - HIDDEN_ROWS, shapes[ghostPiece.type].color, 0.25);
      }
    }
  }

  // Active piece
  if (current) {
    for (const pt of piecePoints(current)) {
      const x = current.x + pt.x;
      const y = current.y + pt.y;
      if (y >= HIDDEN_ROWS) {
        drawCell(x, y - HIDDEN_ROWS, shapes[current.type].color);
      }
    }
  }
}

function loop(t: number) {
  rafId = requestAnimationFrame(loop);
  if (!lastTime) lastTime = t;
  const delta = t - lastTime;
  lastTime = t;

  if (running.value && !gameOver.value && current) {
    dropCounter += delta;
    const interval = getDropIntervalMs(level.value) * (softDropping ? 0.15 : 1);

    while (dropCounter >= interval) {
      dropCounter -= interval;
      if (!tryMove(0, 1)) {
        lockPiece();
        break;
      }
    }
  }

  render();
}

function restart() {
  board = createBoard();
  queue = [];
  current = null;

  score.value = 0;
  level.value = 1;
  totalLines = 0;

  started.value = true;
  gameOver.value = false;
  running.value = true;

  softDropping = false;
  dropCounter = 0;
  lastTime = 0;

  spawnPiece();
}

function togglePause() {
  if (!started.value || gameOver.value) {
    restart();
    return;
  }
  running.value = !running.value;
}

function handleKeydown(e: KeyboardEvent) {
  const key = e.key;
  const lower = key.toLowerCase();

  // If game not started, allow start via Space / Enter / P.
  if (!started.value && (key === " " || key === "Spacebar" || lower === "p")) {
    e.preventDefault();
    restart();
    return;
  }

  if (lower === "p") {
    e.preventDefault();
    togglePause();
    return;
  }

  if (!running.value || gameOver.value) return;

  if (key === "ArrowLeft") {
    e.preventDefault();
    tryMove(-1, 0);
  } else if (key === "ArrowRight") {
    e.preventDefault();
    tryMove(1, 0);
  } else if (key === "ArrowDown") {
    e.preventDefault();
    softDropping = true;
    // Soft drop: one immediate step for responsiveness.
    tryMove(0, 1);
  } else if (key === "ArrowUp") {
    e.preventDefault();
    tryRotate(1);
  } else if (key === " " || key === "Spacebar") {
    e.preventDefault();
    hardDrop();
  }
}

function handleKeyup(e: KeyboardEvent) {
  if (e.key === "ArrowDown") softDropping = false;
}

onMounted(async () => {
  await nextTick();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("keyup", handleKeyup);

  // Render immediately.
  render();
  rafId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("keyup", handleKeyup);
});
</script>

<style scoped>
.home-container {
  padding: 20px;
  box-sizing: border-box;
}

.game-card {
  max-width: 980px;
  margin: 0 auto;
}

.layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.board {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  flex: 0 0 auto;
}

.side {
  min-width: 260px;
}

.stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 4px 0;
}

.stat-label {
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.help {
  margin-top: 14px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  line-height: 1.6;
}

.help-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.75);
}
</style>
