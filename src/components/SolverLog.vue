<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { LogEntry } from '../types/sudoku'
const props = defineProps<{ logs: LogEntry[]; title: string }>()
const bodyRef = ref<HTMLDivElement | null>(null)
watch(() => props.logs.length, async () => {
  await nextTick()
  if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
})
</script>

<template>
  <div class="log">
    <div class="log__header">{{ title }}</div>
    <div class="log__body" ref="bodyRef">
      <div
        v-for="(entry, i) in logs"
        :key="i"
        class="log__entry"
        :class="`log__entry--${entry.type}`"
      >
        <span class="log__dot"/>
        {{ entry.message }}
      </div>
      <div v-if="logs.length === 0" class="log__empty">—</div>
    </div>
  </div>
</template>

<style scoped>
.log {
  border: 1.5px solid var(--cell-border);
  border-radius: 10px;
  overflow: hidden;
  font-family: 'Noto Sans Mono', monospace;
  font-size: 0.78rem;
  background: var(--log-bg);
}
.log__header {
  padding: 6px 12px;
  background: var(--log-header-bg);
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-muted);
}
.log__body {
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 0;
  scrollbar-width: thin;
}
.log__entry {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 12px;
  line-height: 1.5;
  color: var(--c-text);
  transition: background 0.1s;
}
.log__entry:hover { background: var(--cell-hover); }

.log__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 1px;
}

/* type colours */
.log__entry--determine .log__dot { background: var(--c-just-determined); }
.log__entry--brute     .log__dot { background: var(--c-bruteforce); }
.log__entry--deadlock  .log__dot { background: #f59e0b; }
.log__entry--complete  .log__dot { background: #10b981; }
.log__entry--error     .log__dot { background: #ef4444; }
.log__entry--info      .log__dot { background: var(--c-muted); }

.log__entry--complete { font-weight: 700; }
.log__empty { padding: 8px 12px; color: var(--c-muted); font-style: italic; }
</style>
