export type CellStatus = 'empty' | 'preset' | 'determined' | 'bruteforce' | 'justDetermined'

export interface Cell {
  value: number        // 0 = empty
  candidates: Set<number>
  status: CellStatus
}

export interface LogEntry {
  message: string
  type: 'info' | 'determine' | 'brute' | 'deadlock' | 'complete' | 'error'
}

export type Board = Cell[][]  // [row][col], 0-indexed

export interface SolverState {
  board: Board
  logs: LogEntry[]
  isRunning: boolean
  isComplete: boolean
  isSolving: boolean
  bruteforceDepth: number
}
