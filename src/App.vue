<script setup lang="ts">
import { ref, watch } from 'vue'
import ThemeToggle from './components/ThemeToggle.vue'
import SudokuBoard from './components/SudokuBoard.vue'
import SolverLog   from './components/SolverLog.vue'
import { useSudokuSolver } from './composables/useSudokuSolver'
import { useI18n } from './composables/useI18n'



const baseUrl = import.meta.env.BASE_URL

// ── theme ────────────────────────────────────────────────────────────────────
const isDark = ref(false)
watch(isDark, v => document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light'), { immediate: true })

// ── i18n ─────────────────────────────────────────────────────────────────────
const { lang, t, toggle: toggleLang } = useI18n()

// ── font size ─────────────────────────────────────────────────────────────────
const fontSizes = [20, 24, 28] as const
const fontSizeIdx = ref(1)
const fontSize = ref(fontSizes[fontSizeIdx.value])
function cycleFontSize() {
  fontSizeIdx.value = (fontSizeIdx.value + 1) % fontSizes.length
  fontSize.value = fontSizes[fontSizeIdx.value]
}
const fontLabel = computed(() => ['S','M','L'][fontSizeIdx.value])

// ── solver ───────────────────────────────────────────────────────────────────
const {
  board, logs, isRunning, isComplete, isSolving,
  setPreset, reset, clearSolution,
  startSolving, step, solveAll,
} = useSudokuSolver()

// ── selected cell state (owned by App) ───────────────────────────────────────
const selectedRow = ref<number | null>(null)
const selectedCol = ref<number | null>(null)

// Called when a cell is clicked → just select it
function onCellSelect(row: number, col: number) {
  if (isRunning.value) return
  selectedRow.value = row
  selectedCol.value = col
}

// Write a value to the currently selected cell
function writeToSelected(value: number) {
  if (isRunning.value) return
  const r = selectedRow.value
  const c = selectedCol.value
  if (r === null || c === null) return
  if (value === 0) {
    setPreset(r, c, 0)
  } else {
    const current = board.value[r][c].value
    setPreset(r, c, current === value ? 0 : value)
  }
}

// Numpad button handler
function onNumpadClick(n: number) {
  writeToSelected(n)
}

// Keyboard events from SudokuBoard
function onCellKey(key: string, shift: boolean) {
  const r = selectedRow.value
  const c = selectedCol.value

  // Arrow navigation
  if (r !== null && c !== null) {
    if (key === 'ArrowUp')    { selectedRow.value = Math.max(0, r - 1); return }
    if (key === 'ArrowDown')  { selectedRow.value = Math.min(8, r + 1); return }
    if (key === 'ArrowLeft')  { selectedCol.value = Math.max(0, c - 1); return }
    if (key === 'ArrowRight') { selectedCol.value = Math.min(8, c + 1); return }
    if (key === 'Tab') {
      const idx = r * 9 + c
      const next = shift ? (idx - 1 + 81) % 81 : (idx + 1) % 81
      selectedRow.value = Math.floor(next / 9)
      selectedCol.value = next % 9
      return
    }
  } else {
    // No cell selected yet → pick centre on arrow/tab
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(key)) {
      selectedRow.value = 4; selectedCol.value = 4; return
    }
  }

  // Number input
  if (key >= '1' && key <= '9') { writeToSelected(Number(key)); return }
  if (key === '0' || key === 'Delete' || key === 'Backspace') { writeToSelected(0); return }
}

// ── start / step / run all ───────────────────────────────────────────────────
function onStep() {
  if (!isRunning.value) startSolving()
  step()
}

let runAllPromise: Promise<void> | null = null
const isRunningAll = ref(false)
async function onRunAll() {
  if (!isRunning.value) startSolving()
  isRunningAll.value = true
  runAllPromise = solveAll(0)
  await runAllPromise
  isRunningAll.value = false
}

// ── presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  // Easy
  [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],
    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],
    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
  ],
  // Medium
  [
    [0,0,0, 2,6,0, 7,0,1],
    [6,8,0, 0,7,0, 0,9,0],
    [1,9,0, 0,0,4, 5,0,0],
    [8,2,0, 1,0,0, 0,4,0],
    [0,0,4, 6,0,2, 9,0,0],
    [0,5,0, 0,0,3, 0,2,8],
    [0,0,9, 3,0,0, 0,7,4],
    [0,4,0, 0,5,0, 0,3,6],
    [7,0,3, 0,1,8, 0,0,0],
  ],
  // Hard (AI Escargot)
  [
    [1,0,0, 0,0,7, 0,9,0],
    [0,3,0, 0,2,0, 0,0,8],
    [0,0,9, 6,0,0, 5,0,0],
    [0,0,5, 3,0,0, 9,0,0],
    [0,1,0, 0,8,0, 0,0,2],
    [6,0,0, 0,0,4, 0,0,0],
    [3,0,0, 0,0,0, 0,1,0],
    [0,4,0, 0,0,0, 0,0,7],
    [0,0,7, 0,0,0, 3,0,0],
  ],
  // 2010
  [
    [0,0,5, 3,0,0, 0,0,0],
    [8,0,0, 0,0,0, 0,2,0],
    [0,7,0, 0,1,0, 5,0,0],
    [4,0,0, 0,0,5, 3,0,0],
    [0,1,0, 0,7,0, 0,0,6],
    [0,0,3, 2,0,0, 0,8,0],
    [0,6,0, 5,0,0, 0,0,9],
    [0,0,4, 0,0,0, 0,3,0],
    [0,0,0, 0,0,9, 7,0,0],
  ],
  // 2012
  [
    [8,0,0, 0,0,0, 0,0,0],
    [0,0,3, 0,6,0, 0,0,0],
    [0,7,0, 0,0,9, 2,0,0],
    [0,5,0, 0,0,7, 0,0,0],
    [0,0,0, 0,4,5, 7,0,0],
    [0,0,0, 1,0,0, 0,3,0],
    [0,0,1, 0,0,0, 0,6,8],
    [0,0,8, 5,0,0, 0,1,0],
    [0,9,0, 0,0,0, 4,0,0],
  ],
  // 2013watanabe
  [
    [0,8,0, 0,0,0, 1,5,0],
    [4,0,6, 5,0,9, 0,8,0],
    [0,0,0, 0,0,8, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,2, 0,4,0, 0,0,3],
    [3,0,0, 8,0,1, 0,0,0],
    [9,0,0, 7,0,0, 0,0,1],
    [6,0,0, 0,0,0, 0,0,4],
    [1,5,0, 0,0,0, 0,9,0],
  ],
]
const PRESET_LINKS: (string | null)[] = [
  null,   // Easy
  null,   // Medium
  null,   // Hard
  'https://gigazine.net/news/20100822_hardest_sudoku/',
  'https://web.archive.org/web/20180305011727/http://www.efamol.com/efamol-news/news-item.php?id=43',
  'https://web.archive.org/web/20180708045022/http://apollon.issp.u-tokyo.ac.jp/~watanabe/sample/sudoku/index_j.html',
]

const selectedPreset = ref<number | null>(null)
const selectedPresetLink = computed(() =>
  selectedPreset.value !== null ? PRESET_LINKS[selectedPreset.value] : null
)

function loadPreset(idx: number) {
  reset()
  selectedPreset.value = idx
  const grid = PRESETS[idx]
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) setPreset(r, c, grid[r][c])
    }
  }
}

import { computed } from 'vue'

const statusBarText = computed(() => {
  if (isComplete.value) return t.value.complete
  if (isSolving.value)  return t.value.running
  return ''
})
</script>

<template>
  <div class="app" :class="{ dark: isDark }">
    <!-- ── Topbar ─────────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar__title">
        <img :src="`${baseUrl}icon.svg`" alt="icon" class="topbar__logo" />
        <div>
          <h1 class="topbar__h1">{{ t.title }}</h1>
          <p class="topbar__sub">{{ t.subtitle }}</p>
        </div>
      </div>

      <div class="topbar__controls">
        <!-- Language toggle -->
        <button class="ctrl-btn ctrl-btn--lang" @click="toggleLang">
          {{ lang === 'en' ? 'JA' : 'EN' }}
        </button>

        <!-- Font size cycle -->
        <button class="ctrl-btn ctrl-btn--font" @click="cycleFontSize" :title="t.fontSize">
          {{ fontLabel }}
        </button>

        <!-- Theme toggle -->
        <ThemeToggle v-model="isDark" />
      </div>
    </header>

    <!-- ── Main ──────────────────────────────────────────────────── -->
    <main class="main">
      <!-- Board column -->
      <section class="board-col">
        <!-- Number input buttons -->
        <div class="numpad">
          <button
            v-for="n in 9"
            :key="n"
            class="numpad__btn"
            :disabled="isRunning"
            @click="onNumpadClick(n)"
          >{{ n }}</button>
          <button
            class="numpad__btn numpad__btn--erase"
            :disabled="isRunning"
            @click="onNumpadClick(0)"
          >✕</button>
        </div>

        <p class="input-hint" v-if="!isRunning">{{ t.inputHint }}</p>

        <SudokuBoard
          :board="board"
          :is-running="isRunning"
          :font-size="fontSize"
          :selected-row="selectedRow"
          :selected-col="selectedCol"
          @cell-select="onCellSelect"
          @cell-key="onCellKey"
        />

        <!-- Preset loader -->
        <div class="preset-row">
          <span class="preset-label">{{ t.presetLoad }}:</span>
          <button
            v-for="(_, i) in PRESETS"
            :key="i"
            class="preset-btn"
            :class="{ 'preset-btn--active': selectedPreset === i }"
            @click="loadPreset(i)"
            :disabled="isRunning"
          >{{ [t.preset1, t.preset2, t.preset3, t.preset4, t.preset5, t.preset6][i] }}</button>
        </div>

        <!-- Preset reference link -->
        <a
          v-if="selectedPresetLink"
          :href="selectedPresetLink"
          target="_blank"
          rel="noopener noreferrer"
          class="preset-link"
        >🔗 {{ t.presetRef }}</a>

        <!-- Log below board -->
        <SolverLog :logs="logs" :title="t.logTitle" class="board-log" />
      </section>

      <!-- Controls + Log column -->
      <section class="side-col">
        <!-- Action buttons -->
        <div class="actions">
          <button class="action-btn action-btn--step" @click="onStep" :disabled="isRunningAll || isComplete">
            {{ t.btnStep }}
          </button>
          <button class="action-btn action-btn--run" @click="onRunAll" :disabled="isRunningAll || isComplete">
            {{ t.btnRunAll }}
          </button>
          <button class="action-btn action-btn--clear" @click="clearSolution" :disabled="isRunningAll">
            {{ t.btnClear }}
          </button>
          <button class="action-btn action-btn--reset" @click="reset" :disabled="isRunningAll">
            {{ t.btnReset }}
          </button>
        </div>

        <!-- Status bar -->
        <div v-if="statusBarText" class="status-bar" :class="{ 'status-bar--complete': isComplete }">
          {{ statusBarText }}
        </div>

        <!-- Legend -->
        <div class="legend">
          <div class="legend__item"><span class="legend__dot legend__dot--preset"/>{{ t.status.preset }}</div>
          <div class="legend__item"><span class="legend__dot legend__dot--determined"/>{{ t.status.determined }}</div>
          <div class="legend__item"><span class="legend__dot legend__dot--brute"/>{{ t.status.bruteforce }}</div>
          <div class="legend__item"><span class="legend__dot legend__dot--just"/>{{ t.status.justDetermined }}</div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <a href="https://domisan.sakura.ne.jp/" target="_blank"><img src="https://domisan.sakura.ne.jp/banner.png" width="150" /></a><br />
      © AZO
    </footer>
  </div>

</template>

<style>
/* ── Google Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;600;700&family=Noto+Sans+Mono:wght@400;700&display=swap');

/* ── CSS variables: light ── */
:root {
  --bg:             #f0ede8;
  --bg2:            #e8e3dc;
  --surface:        #fff;
  --c-text:         #1a1612;
  --c-muted:        #8a827a;
  --c-accent:       #2d6a4f;

  --board-bg:       #d9d2c9;
  --board-shadow:   0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);

  --cell-bg:        #faf7f3;
  --cell-border:    #c4bdb5;
  --cell-hover:     #e8f5ee;
  --cell-hover-shadow: rgba(45,106,79,0.2);
  --cell-preset-bg: #e8f0ff;
  --cell-brute-bg:  #eafff0;
  --cell-just-bg:   #fff0f0;
  --box-border-color: #6b5f55;

  --c-preset:        #1a56db;
  --c-determined:    #1a1612;
  --c-bruteforce:    #059669;
  --c-just-determined: #dc2626;

  --log-bg:         var(--surface);
  --log-header-bg:  var(--bg2);

  --topbar-bg:      rgba(240,237,232,0.92);
  --topbar-border:  #d0c9c0;
}

/* ── CSS variables: dark ── */
[data-theme="dark"] {
  --bg:             #141210;
  --bg2:            #1e1a18;
  --surface:        #252018;
  --c-text:         #e8e3dc;
  --c-muted:        #7a7268;

  --board-bg:       #1a1712;
  --board-shadow:   0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);

  --cell-bg:        #201c18;
  --cell-border:    #3a3530;
  --cell-hover:     #1a2e22;
  --cell-hover-shadow: rgba(52,211,153,0.2);
  --cell-preset-bg: #1a1f33;
  --cell-brute-bg:  #142218;
  --cell-just-bg:   #2e1515;
  --box-border-color: #5a5248;

  --c-preset:        #60a5fa;
  --c-determined:    #e8e3dc;
  --c-bruteforce:    #34d399;
  --c-just-determined: #f87171;

  --log-bg:         var(--surface);
  --log-header-bg:  var(--bg2);

  --topbar-bg:      rgba(20,18,16,0.92);
  --topbar-border:  #2a2520;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--c-text);
  font-family: 'Noto Sans JP', sans-serif;
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}

/* ── App wrapper ── */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Topbar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: var(--topbar-bg);
  border-bottom: 1.5px solid var(--topbar-border);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 12px;
}
.topbar__title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.topbar__logo {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 8px;
  flex-shrink: 0;
}
.topbar__h1 {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.topbar__sub {
  font-size: 0.65rem;
  color: var(--c-muted);
  font-weight: 300;
  letter-spacing: 0.05em;
}
.topbar__controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctrl-btn {
  height: 2.1rem;
  padding: 0 0.75rem;
  border: 1.5px solid var(--cell-border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--c-text);
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  letter-spacing: 0.05em;
}
.ctrl-btn:hover {
  background: var(--cell-hover);
  border-color: var(--c-accent);
}

/* ── Main layout ── */
.main {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  padding: 24px;
  justify-content: center;
  align-items: flex-start;
}

/* ── Board column ── */
.board-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

/* ── Numpad ── */
.numpad {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.numpad__btn {
  width: 42px; height: 42px;
  border: 1.5px solid var(--cell-border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--c-text);
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s, border-color 0.12s;
}
.numpad__btn:hover:not(:disabled) {
  background: var(--cell-hover);
  border-color: var(--c-accent);
  transform: translateY(-2px);
}
.numpad__btn--active {
  background: var(--c-accent) !important;
  color: #fff !important;
  border-color: var(--c-accent) !important;
}
.numpad__btn--erase { font-size: 0.9rem; color: #dc2626; }
.numpad__btn:disabled { opacity: 0.4; cursor: not-allowed; }

.input-hint {
  font-size: 0.72rem;
  color: var(--c-muted);
  text-align: center;
}

/* ── Preset row ── */
.preset-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.preset-label { font-size: 0.75rem; color: var(--c-muted); }
.preset-btn {
  padding: 4px 14px;
  border: 1.5px solid var(--cell-border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--c-text);
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover:not(:disabled) { background: var(--cell-hover); border-color: var(--c-accent); }
.preset-btn--active { background: var(--bg2); border-color: var(--c-accent); }
.preset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Side column ── */
.side-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 280px;
  min-width: 240px;
  max-width: 320px;
}

/* ── Action buttons ── */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.action-btn {
  padding: 10px 0;
  border: 1.5px solid var(--cell-border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--c-text);
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.02em;
}
.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.action-btn:disabled { opacity: 0.38; cursor: not-allowed; }

.action-btn--step  { border-color: var(--c-bruteforce); color: var(--c-bruteforce); grid-column: span 1; }
.action-btn--run   { border-color: var(--c-bruteforce); color: var(--c-bruteforce); }
.action-btn--reset { border-color: #ef4444; color: #ef4444; }
.action-btn--clear { border-color: var(--c-muted); }

/* ── Status bar ── */
.status-bar {
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--bg2);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--c-bruteforce);
  text-align: center;
  animation: pulse 1.5s ease-in-out infinite;
}
.status-bar--complete {
  animation: none;
  color: #10b981;
  background: #d1fae5;
}
[data-theme="dark"] .status-bar--complete {
  background: #052e16;
  color: #34d399;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

/* ── Legend ── */
.legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1.5px solid var(--cell-border);
  border-radius: 10px;
}
.legend__item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--c-muted);
}
.legend__dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend__dot--preset     { background: var(--c-preset); }
.legend__dot--determined { background: var(--c-determined); border: 1px solid var(--cell-border); }
.legend__dot--brute      { background: var(--c-bruteforce); }
.legend__dot--just       { background: var(--c-just-determined); }

/* ── Preset reference link ── */
.preset-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: var(--c-accent);
  text-decoration: none;
  padding: 4px 10px;
  border: 1.5px solid var(--c-accent);
  border-radius: 20px;
  transition: background 0.15s, color 0.15s;
  align-self: center;
}
.preset-link:hover {
  background: var(--c-accent);
  color: #fff;
}

/* ── Log below board ── */
.board-log {
  width: 100%;
  align-self: stretch;
}

.site-footer {
  text-align: center;
  font-size: 0.6rem;
  color: var(--fg-label);
  letter-spacing: 0.15em;
  padding: 1rem 0 0.5rem;
  font-family: 'Hiragino Sans', sans-serif;
  transition: color 0.3s;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .main {
    padding: 12px;
    gap: 16px;
    width: 95%;
    margin: 0 auto;
  }
  .side-col {
    width: 100%;
    max-width: 100%;
  }
  .topbar {
    padding: 8px 12px;
  }
  .topbar__sub { display: none; }
}
</style>
