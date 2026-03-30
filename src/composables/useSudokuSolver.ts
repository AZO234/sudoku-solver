import { ref } from 'vue'
import type { Board, Cell, LogEntry, CellStatus } from '../types/sudoku'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeCell(value = 0, status: CellStatus = 'empty'): Cell {
  return {
    value,
    candidates: value === 0 ? new Set([1,2,3,4,5,6,7,8,9]) : new Set<number>(),
    status,
  }
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => ({
    value: cell.value,
    candidates: new Set(cell.candidates),
    status: cell.status,
  })))
}

function getBox(row: number, col: number) {
  return { br: Math.floor(row / 3) * 3, bc: Math.floor(col / 3) * 3 }
}

function eliminateFromPeers(board: Board, row: number, col: number, n: number) {
  for (let c = 0; c < 9; c++) if (c !== col) board[row][c].candidates.delete(n)
  for (let r = 0; r < 9; r++) if (r !== row) board[r][col].candidates.delete(n)
  const { br, bc } = getBox(row, col)
  for (let dr = 0; dr < 3; dr++)
    for (let dc = 0; dc < 3; dc++) {
      const r = br+dr, c = bc+dc
      if (r !== row || c !== col) board[r][c].candidates.delete(n)
    }
}

function placeValue(board: Board, row: number, col: number, n: number, status: CellStatus) {
  board[row][col].value = n
  board[row][col].candidates.clear()
  board[row][col].status = status
  eliminateFromPeers(board, row, col, n)
}

function initCandidates(board: Board) {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c].value !== 0) board[r][c].candidates.clear()
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c].value !== 0) eliminateFromPeers(board, r, c, board[r][c].value)
}

// ── logical deduction ─────────────────────────────────────────────────────────

interface StepResult {
  determined: { row: number; col: number; value: number }[]
  deadlock: boolean
}

function logicalStep(board: Board): StepResult {
  const determined: { row: number; col: number; value: number }[] = []

  // Naked Single
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c]
      if (cell.value === 0 && cell.candidates.size === 1)
        determined.push({ row: r, col: c, value: [...cell.candidates][0] })
    }
  if (determined.length > 0) return { determined, deadlock: false }

  // Hidden Single - row
  for (let r = 0; r < 9; r++)
    for (let n = 1; n <= 9; n++) {
      const hits: number[][] = []
      for (let c = 0; c < 9; c++)
        if (board[r][c].value === 0 && board[r][c].candidates.has(n)) hits.push([r,c])
      if (hits.length === 1) determined.push({ row: hits[0][0], col: hits[0][1], value: n })
    }

  // Hidden Single - col
  for (let c = 0; c < 9; c++)
    for (let n = 1; n <= 9; n++) {
      const hits: number[][] = []
      for (let r = 0; r < 9; r++)
        if (board[r][c].value === 0 && board[r][c].candidates.has(n)) hits.push([r,c])
      if (hits.length === 1) determined.push({ row: hits[0][0], col: hits[0][1], value: n })
    }

  // Hidden Single - box
  for (let br = 0; br < 9; br += 3)
    for (let bc = 0; bc < 9; bc += 3)
      for (let n = 1; n <= 9; n++) {
        const hits: number[][] = []
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const r = br+dr, c = bc+dc
            if (board[r][c].value === 0 && board[r][c].candidates.has(n)) hits.push([r,c])
          }
        if (hits.length === 1) determined.push({ row: hits[0][0], col: hits[0][1], value: n })
      }

  // deduplicate
  const seen = new Set<string>()
  const unique = determined.filter(d => {
    const k = `${d.row},${d.col}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  if (unique.length > 0) return { determined: unique, deadlock: false }

  // deadlock check
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c].value === 0 && board[r][c].candidates.size === 0)
        return { determined: [], deadlock: true }

  return { determined: [], deadlock: false }
}

function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c].value === 0) return false
  return true
}

/** Run logic to fixpoint. Returns false on contradiction. */
function propagate(board: Board): boolean {
  let changed = true
  while (changed) {
    changed = false
    const { determined, deadlock } = logicalStep(board)
    if (deadlock) return false
    for (const d of determined) {
      placeValue(board, d.row, d.col, d.value, 'determined')
      changed = true
    }
  }
  return true
}

function findBruteTarget(board: Board): { row: number; col: number; candidates: number[] } | null {
  let best: { row: number; col: number; candidates: number[] } | null = null
  let minSize = 10
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c]
      if (cell.value === 0 && cell.candidates.size > 0 && cell.candidates.size < minSize) {
        minSize = cell.candidates.size
        best = { row: r, col: c, candidates: [...cell.candidates] }
      }
    }
  return best
}

// ── BruteFrame ────────────────────────────────────────────────────────────────
// Each frame holds the board snapshot BEFORE any candidate was tried here.
// nextIdx advances one-by-one so we can "step" through each candidate.

interface BruteFrame {
  snapshot:   Board    // board state before trying any candidate at (row,col)
  row:        number
  col:        number
  candidates: number[]
  nextIdx:    number   // which candidate to try next
}

// ── composable ────────────────────────────────────────────────────────────────

export function useSudokuSolver() {
  const board = ref<Board>(Array.from({length: 9}, () =>
    Array.from({length: 9}, () => makeCell())
  ))
  const logs        = ref<LogEntry[]>([])
  const isRunning   = ref(false)
  const isComplete_ = ref(false)
  const isSolving   = ref(false)
  const selectedNum = ref<number | null>(null)

  const bruteStack = ref<BruteFrame[]>([])
  const stepPhase  = ref<'logic' | 'brute' | 'done'>('logic')

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.push({ message, type })
    if (logs.value.length > 200) logs.value.shift()
  }

  function reset() {
    board.value = Array.from({length: 9}, () =>
      Array.from({length: 9}, () => makeCell())
    )
    logs.value        = []
    isRunning.value   = false
    isComplete_.value = false
    isSolving.value   = false
    selectedNum.value = null
    bruteStack.value  = []
    stepPhase.value   = 'logic'
  }

  function clearSolution() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board.value[r][c].status !== 'preset')
          board.value[r][c] = makeCell()
    logs.value        = []
    isRunning.value   = false
    isComplete_.value = false
    isSolving.value   = false
    bruteStack.value  = []
    stepPhase.value   = 'logic'
    initCandidates(board.value)
  }

  function setPreset(row: number, col: number, value: number) {
    if (isRunning.value) return
    board.value[row][col] = value === 0 ? makeCell() : makeCell(value, 'preset')
  }

  function startSolving() {
    isRunning.value   = true
    isComplete_.value = false
    isSolving.value   = true
    bruteStack.value  = []
    stepPhase.value   = 'logic'
    logs.value        = []
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board.value[r][c].status !== 'preset')
          board.value[r][c] = makeCell()
    initCandidates(board.value)
    addLog('Solver started.', 'info')
  }

  // ── Logic phase ──────────────────────────────────────────────────────────

  function doLogicStep(): boolean {
    const result = logicalStep(board.value)
    if (result.deadlock) {
      addLog('Deadlock — no candidates available.', 'deadlock')
      return false
    }
    if (result.determined.length === 0) return false

    // clear previous "just determined" highlights
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board.value[r][c].status === 'justDetermined')
          board.value[r][c].status = 'determined'

    for (const d of result.determined) {
      placeValue(board.value, d.row, d.col, d.value, 'justDetermined')
      addLog(`Determined R${d.row+1}C${d.col+1} = ${d.value}`, 'determine')
    }
    return true
  }

  // ── Brute-force phase ────────────────────────────────────────────────────
  //
  // One call = one visible board change:
  //   • try candidates in the current frame until one doesn't immediately
  //     contradict, then push a new frame and return  (board advanced)
  //   • if all candidates contradict → pop frame (backtrack) and return
  //   • exhausting the whole stack → no solution

  function doNextBruteStep() {
    while (bruteStack.value.length > 0) {
      const top = bruteStack.value[bruteStack.value.length - 1]

      // All candidates exhausted for this frame → backtrack
      if (top.nextIdx >= top.candidates.length) {
        bruteStack.value.pop()
        addLog(`Dead end at R${top.row+1}C${top.col+1} — undoing and trying next`, 'brute')
        if (bruteStack.value.length === 0) {
          addLog('No solution found.', 'error')
          isSolving.value = false
          stepPhase.value = 'done'
        }
        // Return so the UI shows the backtrack state
        return
      }

      const n = top.candidates[top.nextIdx++]

      const trial = cloneBoard(top.snapshot)
      placeValue(trial, top.row, top.col, n, 'bruteforce')
      addLog(`Brute-force R${top.row+1}C${top.col+1} = ${n}`, 'brute')

      const ok = propagate(trial)
      if (!ok) {
        addLog(`  ✗ Contradiction with ${n}`, 'deadlock')
        // Don't return — immediately try the next candidate in this frame
        continue
      }

      // Update displayed board
      board.value = trial

      if (isBoardComplete(trial)) {
        finish()
        return
      }

      const nextTarget = findBruteTarget(trial)
      if (!nextTarget) {
        // Board not complete but no empty cells with candidates → contradiction
        addLog(`  ✗ No more candidates after ${n}`, 'deadlock')
        continue
      }

      // Advance: push new frame for the next decision cell
      bruteStack.value.push({
        snapshot:   cloneBoard(trial),
        row:        nextTarget.row,
        col:        nextTarget.col,
        candidates: nextTarget.candidates,
        nextIdx:    0,
      })
      addLog(`  → Next R${nextTarget.row+1}C${nextTarget.col+1} (${nextTarget.candidates.join(',')})`, 'brute')
      // Return — one visible step done
      return
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function step() {
    if (!isSolving.value || isComplete_.value) return

    if (stepPhase.value === 'logic') {
      const progressed = doLogicStep()
      if (!progressed) {
        if (isBoardComplete(board.value)) { finish(); return }

        const target = findBruteTarget(board.value)
        if (!target) {
          addLog('No solution found.', 'error')
          isSolving.value = false
          stepPhase.value = 'done'
          return
        }
        addLog(
          `Logic exhausted. Brute-force on R${target.row+1}C${target.col+1} (${target.candidates.join(',')})`,
          'brute'
        )
        bruteStack.value = [{
          snapshot:   cloneBoard(board.value),
          row:        target.row,
          col:        target.col,
          candidates: target.candidates,
          nextIdx:    0,
        }]
        stepPhase.value = 'brute'
        doNextBruteStep()
      } else {
        if (isBoardComplete(board.value)) finish()
      }

    } else if (stepPhase.value === 'brute') {
      doNextBruteStep()
    }
  }

  function finish() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const s = board.value[r][c].status
        if (s === 'justDetermined' || s === 'bruteforce' || s === 'determined')
          board.value[r][c].status = 'determined'
      }
    isComplete_.value = true
    isSolving.value   = false
    stepPhase.value   = 'done'
    const nPreset  = board.value.flat().filter(c => c.status === 'preset').length
    const nSolved  = board.value.flat().filter(c => c.status === 'determined').length
    addLog(`Puzzle complete! ${nPreset} preset + ${nSolved} solved = 81 cells.`, 'complete')
  }

  async function solveAll(delayMs = 0) {
    while (isSolving.value && !isComplete_.value) {
      step()
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  return {
    board,
    logs,
    isRunning,
    isComplete: isComplete_,
    isSolving,
    selectedNum,
    setPreset,
    reset,
    clearSolution,
    startSolving,
    step,
    solveAll,
  }
}
