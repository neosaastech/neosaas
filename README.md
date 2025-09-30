# 🚀 NeoSaaS – Docker Setup

This branch provides a **Dockerized environment** for running **NeoSaaS**.

---

## 📦 Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🔨 Build & Run

```bash
# Build and start containers
docker compose up -d --build

# Check logs
docker compose logs -f

# Stop containers
docker compose down
