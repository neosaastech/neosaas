# ============================================================
# Dockerfile — neokube/zoho-discovery
#
# Build & push vers le registry local K3s :
#   cd /home/neokube-beta/scripts/zoho-discovery
#   docker build -t localhost:5000/neokube/zoho-discovery:latest .
#   docker push localhost:5000/neokube/zoho-discovery:latest
#
# Puis redéployer le worker :
#   kubectl scale deployment zoho-discovery -n agent-system --replicas=1
# ============================================================

FROM python:3.12-slim

WORKDIR /app

# Dépendances système minimales
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY worker.py .

# Utilisateur non-root
RUN useradd -r -u 1001 worker && chown -R worker /app
USER worker

CMD ["python", "worker.py"]
