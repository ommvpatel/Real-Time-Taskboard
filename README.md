# 📝 Real-Time Collaborative Taskboard

A collaborative, real-time task board built with **Vue 3 + Pinia** on the frontend, **Fastify + TypeScript** on the backend, and **PostgreSQL + Redis** for persistence and pub/sub.  
Syncs tasks instantly between connected clients using **WebSockets**.

---

## 🚀 Features
- Real-time updates with WebSockets (Fastify WS)
- Collaborative task creation, editing, toggling, and deletion
- PostgreSQL persistence
- Redis pub/sub for multi-instance sync
- Dockerized for easy local setup
- Configurable environment variables for local and production use

---

## 🛠 Tech Stack

**Frontend**
- Vue 3
- Pinia (state)
- TypeScript
- Vite (build)
- Vuetify (UI)

**Backend**
- Fastify
- TypeScript
- WebSocket (@fastify/websocket)
- PostgreSQL (pg)
- Redis (ioredis: pub/sub for fanout)
- Docker
- Zod (validation)

**Infrastructure**
- Docker Compose (local)
- Neon (free Postgres) *(recommended for deploy)*
- Upstash (free Redis) *(recommended for deploy)*
- Cloud Run (backend deploy)
- Netlify / Vercel (frontend deploy)

---

http://localhost:5173/b/alpha
