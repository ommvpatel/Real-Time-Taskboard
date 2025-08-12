<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { useBoardStore } from "./stores/board";

const store = useBoardStore();
const boardInput = ref(store.boardId);
const title = ref("");

function connect() {
  store.connect(boardInput.value.trim() || "alpha");
}

function add() {
  if (!title.value.trim()) return;
  store.createTask(title.value.trim());
  title.value = "";
}

onMounted(() => store.connect());
onBeforeUnmount(() => store.disconnect());
</script>

<template>
  <main style="max-width: 720px; margin: 40px auto; font-family: system-ui">
    <h1>Real-Time Taskboard</h1>

    <div style="display: flex; gap: 8px; align-items: center; margin: 12px 0">
      <label>Board:</label>
      <input
        v-model="boardInput"
        style="padding: 6px; border: 1px solid #ccc; border-radius: 6px"
      />
      <button @click="connect" style="padding: 6px 10px; border-radius: 6px">
        Connect
      </button>
    </div>

    <div style="display: flex; gap: 8px; align-items: center; margin: 12px 0">
      <input
        v-model="title"
        placeholder="Task title"
        style="
          flex: 1;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 6px;
        "
      />
      <button @click="add" style="padding: 8px 12px; border-radius: 6px">
        Add
      </button>
    </div>

    <ul style="list-style: none; padding: 0; display: grid; gap: 8px">
      <li
        v-for="t in store.tasks"
        :key="t.id"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
        "
      >
        <div>
          <span :style="{ textDecoration: t.done ? 'line-through' : 'none' }">{{
            t.title
          }}</span>
          <small style="opacity: 0.6; margin-left: 8px">{{ t.id }}</small>
        </div>
        <div style="display: flex; gap: 8px">
          <button @click="store.toggleTask(t.id, !t.done)">Toggle</button>
          <button @click="store.deleteTask(t.id)">Delete</button>
        </div>
      </li>
    </ul>
  </main>
</template>
