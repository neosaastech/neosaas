### ✅ Nouveau `README.md` pour la branche `docker`

````markdown
![logo_neosaas](https://github-production-user-asset-6210df.s3.amazonaws.com/17944080/436394487-0f3b275c-a0da-4512-bfd1-4887ed773500.jpg)

# 🚀 NeoSaaS – Docker Setup

This branch provides a **Dockerized environment** for running **NeoSaaS**.

---

## 📦 Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 🔨 Build & Run (Basic)

```bash
# Build and start containers
docker compose up -d --build

# Check logs
docker compose logs -f

# Stop containers
docker compose down
````

---

## 🏷️ Versioning

Docker images for NeoSaaS are published to **GitHub Container Registry (GHCR)**.

Available tags:

* `latest` → always points to the most recent build on the `docker` branch
* `<commit-sha>` → unique build reference (e.g. `ghcr.io/neosaastech/neosaas:efd7530`)
* `<package-version>` → matches the version defined in `package.json` (e.g. `ghcr.io/neosaastech/neosaas:0.1.1`)

Examples:

```bash
# Run the latest version
docker run -p 3000:3000 ghcr.io/neosaastech/neosaas:latest

# Run a specific version
docker run -p 3000:3000 ghcr.io/neosaastech/neosaas:0.1.1
```

---

## 📂 Project Structure

```
neosaas/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── ...
```

---

## 📄 License

This project is licensed under the [MIT License](https://github.com/neosaastech/neosaas/blob/docker/LICENCE).
© 2025 Charles Van den Driessche @ Neomnia
