<script setup lang="ts">
import type { Board } from '../types/sudoku'

const props = defineProps<{
  board: Board
  isRunning: boolean
  fontSize: number
  selectedRow: number | null
  selectedCol: number | null
}>()

const emit = defineEmits<{
  cellSelect: [row: number, col: number]
  cellKey:    [key: string, shift: boolean]
}>()

function onKeydown(e: KeyboardEvent) {
  if (props.isRunning) return
  const nav = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab']
  const input = (e.key >= '1' && e.key <= '9') || e.key === '0'
    || e.key === 'Delete' || e.key === 'Backspace'
  if (nav.includes(e.key) || input) e.preventDefault()
  emit('cellKey', e.key, e.shiftKey)
}

function cellClass(row: number, col: number) {
  const cell = props.board[row][col]
  return {
    'cell--preset':          cell.status === 'preset',
    'cell--determined':      cell.status === 'determined',
    'cell--bruteforce':      cell.status === 'bruteforce',
    'cell--just-determined': cell.status === 'justDetermined',
    'cell--empty':           cell.status === 'empty',
    'cell--border-right':    col === 2 || col === 5,
    'cell--border-bottom':   row === 2 || row === 5,
    'cell--clickable':       !props.isRunning,
    'cell--selected':        row === props.selectedRow && col === props.selectedCol,
  }
}
</script>

<template>
  <div
    class="board"
    :style="{ '--fs': fontSize + 'px' }"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div v-for="(row, ri) in board" :key="ri" class="board__row">
      <button
        v-for="(cell, ci) in row"
        :key="ci"
        class="cell"
        :class="cellClass(ri, ci)"
        @click="emit('cellSelect', ri, ci)"
        :disabled="isRunning"
        :aria-label="`R${ri+1}C${ci+1}: ${cell.value || 'empty'}`"
        tabindex="-1"
      >
        <span v-if="cell.value" class="cell__val">{{ cell.value }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.board {
  --cell: clamp(32px, calc(var(--fs, 24px) * 2.4), 72px);
  --gap: 2px;
  --box-border: 3px;
  display: inline-flex;
  flex-direction: column;
  gap: var(--gap);
  padding: 4px;
  border-radius: 10px;
  background: var(--board-bg);
  box-shadow: var(--board-shadow);
  user-select: none;
  outline: none;
}
.board__row { display: flex; gap: var(--gap); }

.cell {
  width: var(--cell); height: var(--cell);
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--cell-border);
  border-radius: 5px;
  background: var(--cell-bg);
  cursor: default;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  padding: 0;
}
.cell--clickable { cursor: pointer; }
.cell--clickable:hover:not(:disabled) {
  background: var(--cell-hover);
  transform: scale(1.05);
  box-shadow: 0 2px 8px var(--cell-hover-shadow);
}
.cell--selected {
  outline: 3px solid var(--c-accent);
  outline-offset: -2px;
  background: var(--cell-hover) !important;
  transform: scale(1.05);
  z-index: 1;
}
.cell__val {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: var(--fs, 24px);
  font-weight: 700;
  line-height: 1;
  transition: color 0.2s;
}
.cell--preset .cell__val       { color: var(--c-preset); }
.cell--determined .cell__val   { color: var(--c-determined); }
.cell--bruteforce .cell__val   { color: var(--c-bruteforce); }
.cell--just-determined .cell__val { color: var(--c-just-determined); }
.cell--preset          { background: var(--cell-preset-bg); }
.cell--bruteforce      { background: var(--cell-brute-bg); }
.cell--just-determined { background: var(--cell-just-bg); animation: pop 0.3s ease; }
.cell--border-right  { border-right: var(--box-border) solid var(--box-border-color); }
.cell--border-bottom { border-bottom: var(--box-border) solid var(--box-border-color); }
@keyframes pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
</style>
