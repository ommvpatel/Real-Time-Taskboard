<script setup lang="ts">
import { onBeforeUnmount, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBoardStore } from "../stores/board";

const route = useRoute();
const router = useRouter();
const store = useBoardStore();

// Read boardId from the URL (e.g., /b/alpha)
const currentBoardFromRoute = (): string =>
  String(route.params.boardId ?? "alpha");

// Local inputs
const boardInput = ref<string>(currentBoardFromRoute());
const title = ref<string>("");

// Derived stats
const total = computed<number>(() => store.tasks.length);
const done = computed<number>(() => store.tasks.filter((t) => t.done).length);

// Update URL to /b/<board>; watcher below will connect
function connect() {
  const id = (boardInput.value || "").trim() || "alpha";
  if (String(route.params.boardId) !== id) {
    router.push({ name: "board", params: { boardId: id } });
  } else {
    store.connect(id);
  }
}

function addTask() {
  const t = (title.value || "").trim();
  if (!t) return;
  store.createTask(t);
  title.value = "";
}

// Auto-connect whenever /b/:boardId changes (including first load)
watch(
  () => route.params.boardId,
  (id) => {
    const boardId = String(id ?? "alpha");
    boardInput.value = boardId; // keep input in sync with URL
    store.connect(boardId); // join + snapshot
  },
  { immediate: true }
);

onBeforeUnmount(() => store.disconnect());
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable" prominent>
      <v-app-bar-title>Real-Time Taskboard</v-app-bar-title>
      <v-spacer />
      <v-chip class="mr-3" variant="elevated"
        >Done {{ done }} / {{ total }}</v-chip
      >
      <v-btn icon="mdi-refresh" @click="connect" />
    </v-app-bar>

    <v-main class="pa-6">
      <v-container fluid class="d-flex justify-center">
        <v-sheet
          color="white"
          elevation="0"
          rounded="lg"
          class="pa-8"
          width="100%"
          max-width="1440"
        >
          <!-- Board connect -->
          <v-card class="mb-6 w-100" variant="outlined">
            <v-card-text>
              <v-row dense>
                <v-col cols="12">
                  <v-text-field
                    v-model="boardInput"
                    label="Board ID"
                    variant="outlined"
                    hide-details
                  />
                </v-col>
              </v-row>
              <v-row dense>
                <v-col cols="12" class="d-flex justify-end">
                  <v-btn color="primary" @click="connect">Connect & Join</v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Task add -->
          <v-card class="mb-6 w-100" variant="outlined">
            <v-card-text class="d-flex align-center" style="gap: 12px">
              <v-text-field
                v-model="title"
                label="New task title"
                variant="outlined"
                hide-details
                @keydown.enter="addTask"
                style="flex: 1; min-width: 0"
              />
              <v-btn color="primary" @click="addTask" prepend-icon="mdi-plus"
                >Add</v-btn
              >
            </v-card-text>
          </v-card>

          <!-- Task list -->
          <v-card class="w-100" variant="outlined">
            <v-list lines="two">
              <v-list-item v-for="t in store.tasks" :key="t.id">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="t.done"
                    @update:model-value="store.toggleTask(t.id, !t.done)"
                  />
                </template>

                <v-list-item-title
                  :class="t.done ? 'text-decoration-line-through' : ''"
                >
                  {{ t.title }}
                </v-list-item-title>
                <v-list-item-subtitle class="opacity-70">
                  {{ t.id }}
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    variant="text"
                    icon="mdi-delete"
                    @click="store.deleteTask(t.id)"
                  />
                </template>
              </v-list-item>

              <v-divider v-if="store.tasks.length" />
              <v-list-item v-else>
                <v-list-item-title class="opacity-70"
                  >No tasks yet — add one.</v-list-item-title
                >
              </v-list-item>
            </v-list>
          </v-card>
        </v-sheet>
      </v-container>
    </v-main>
  </v-app>
</template>
