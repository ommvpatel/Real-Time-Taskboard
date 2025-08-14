import { createRouter, createWebHistory } from "vue-router";
import BoardView from "./views/BoardView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/b/alpha" },
    { path: "/b/:boardId", name: "board", component: BoardView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
