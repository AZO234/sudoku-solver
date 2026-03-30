import { ref, computed } from 'vue'

type Lang = 'en' | 'ja'

const messages = {
  en: {
    title: 'Sudoku Solver',
    subtitle: 'Logic · Elimination · Backtracking',
    btnStart:   'Start',
    btnStep:    'Step',
    btnRunAll:  'Run All',
    btnReset:   'Reset',
    btnClear:   'Clear',
    btnErase:   'Erase',
    inputHint:  'Click a cell, then press 1–9 / DEL, or use numpad',
    logTitle:   'Log',
    status: {
      preset:        'Preset (blue)',
      determined:    'Solved (black)',
      bruteforce:    'Brute-forcing (green)',
      justDetermined:'This step (red)',
    },
    preset1: 'Easy',
    preset2: 'Medium',
    preset3: 'Hard',
    preset4: '2010',
    preset5: '2012',
    preset6: '2013W',
    presetLoad: 'Load preset',
    presetRef: 'Reference',
    running: 'Solving…',
    complete: 'Complete!',
    fontSize: 'Size',
  },
  ja: {
    title: '数独解答プログラム',
    subtitle: '論理・消去法・バックトラック',
    btnStart:   '開始',
    btnStep:    'ステップ',
    btnRunAll:  '全実行',
    btnReset:   'リセット',
    btnClear:   'クリア',
    btnErase:   '消去',
    inputHint:  'セルをクリックして選択し、1〜9キーまたはDELで入力',
    logTitle:   'ログ',
    status: {
      preset:        'プリセット（青）',
      determined:    '決定済み（黒）',
      bruteforce:    'ブルートフォース中（緑）',
      justDetermined:'今回決定（赤）',
    },
    preset1: '簡単',
    preset2: '普通',
    preset3: '難しい',
    preset4: '2010',
    preset5: '2012',
    preset6: '2013W',
    presetLoad: 'プリセット読込',
    presetRef: '参考リンク',
    running: '解析中…',
    complete: '完了！',
    fontSize: '文字',
  },
}

const lang = ref<Lang>('ja')

export function useI18n() {
  const t = computed(() => messages[lang.value])
  function toggle() { lang.value = lang.value === 'en' ? 'ja' : 'en' }
  return { lang, t, toggle }
}
