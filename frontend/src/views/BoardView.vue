<script setup lang="ts">
import { onBeforeUnmount, ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBoardStore } from "../stores/board";

const route = useRoute();
const router = useRouter();
const store = useBoardStore();

const currentBoardFromRoute = (): string =>
  String(route.params.boardId ?? "alpha");

// Inputs
const boardInput = ref<string>(currentBoardFromRoute());
const title = ref<string>("");
const description = ref<string>("");

// Editing state
const editingTask = ref<any | null>(null);
const editTitle = ref("");
const editDescription = ref("");

// Stats
const total = computed<number>(() => store.tasks.length);
const done = computed<number>(() => store.tasks.filter((t) => t.done).length);

// Connect
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
  const d = (description.value || "").trim();
  if (!t) return;
  store.createTask(t, d);
  title.value = "";
  description.value = "";
}
function startEdit(task: any) {
  editingTask.value = { ...task };
  editTitle.value = task.title;
  editDescription.value = task.description || "";
}
function saveEdit() {
  if (!editingTask.value) return;
  store.editTask(editingTask.value.id, editTitle.value, editDescription.value);
  editingTask.value = null;
}
function cancelEdit() {
  editingTask.value = null;
}

watch(
  () => route.params.boardId,
  (id) => {
    const boardId = String(id ?? "alpha");
    boardInput.value = boardId;
    store.connect(boardId);
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

      <!-- NEW: connection status chip (optional; requires store.status) -->
      <v-chip
        v-if="store.status"
        class="mr-3"
        :color="
          store.status === 'connected'
            ? 'green'
            : store.status === 'connecting'
            ? 'orange'
            : 'red'
        "
        text-color="white"
        label
        density="comfortable"
      >
        {{ store.status }}
      </v-chip>

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
                  <!-- optional loading if you set store.status -->
                  <v-btn
                    color="primary"
                    @click="connect"
                    :loading="store.status === 'connecting'"
                  >
                    Connect & Join
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Task add -->
          <v-card class="mb-6 w-100" variant="outlined">
            <v-card-text>
              <div class="d-flex align-center" style="gap: 12px">
                <v-text-field
                  v-model="title"
                  label="New task title"
                  variant="outlined"
                  hide-details
                  @keydown.enter="addTask"
                  style="flex: 1; min-width: 0"
                />
                <!-- NEW: disable when empty -->
                <v-btn
                  color="primary"
                  @click="addTask"
                  :disabled="!title.trim()"
                  prepend-icon="mdi-plus"
                >
                  Add
                </v-btn>
              </div>

              <v-text-field
                class="mt-3"
                v-model="description"
                label="Description (optional)"
                variant="outlined"
                hide-details
                @keydown.enter="addTask"
              />
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

                <template v-if="editingTask?.id === t.id">
                  <v-list-item-content>
                    <v-text-field
                      v-model="editTitle"
                      label="Edit title"
                      hide-details
                      density="comfortable"
                    />
                    <v-text-field
                      v-model="editDescription"
                      label="Edit description"
                      hide-details
                      density="comfortable"
                    />
                    <div class="d-flex" style="gap: 8px; margin-top: 4px">
                      <v-btn size="small" color="primary" @click="saveEdit"
                        >Save</v-btn
                      >
                      <v-btn size="small" variant="tonal" @click="cancelEdit"
                        >Cancel</v-btn
                      >
                    </div>
                  </v-list-item-content>
                </template>
                <template v-else>
                  <v-list-item-title
                    :class="t.done ? 'text-decoration-line-through' : ''"
                  >
                    {{ t.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="t.description" class="opacity-70">
                    {{ t.description }}
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="opacity-50">
                    {{ t.id }}
                  </v-list-item-subtitle>
                </template>

                <template #append>
                  <v-btn
                    variant="text"
                    icon="mdi-pencil"
                    @click="startEdit(t)"
                  />
                  <v-btn
                    variant="text"
                    icon="mdi-delete"
                    @click="store.deleteTask(t.id)"
                  />
                </template>
              </v-list-item>

              <v-divider v-if="store.tasks.length" />
              <v-list-item v-else>
                <v-list-item-title class="opacity-70">
                  No tasks yet — add one.
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-sheet>
      </v-container>
    </v-main>
  </v-app>
</template>
