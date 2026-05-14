#!/usr/bin/env bash
# sync-charlotte-docs.sh — copie les CLAUDE*.md vers Kubinote-GitOps/docs/
# Déclenché automatiquement par le hook Claude Code PostToolUse (Edit/Write)
# Peut aussi être lancé manuellement : bash ~/scripts/sync-charlotte-docs.sh

set -euo pipefail

GITOPS_DIR="/home/neokube-beta/Kubinote-GitOps"
SRC_DIR="/home/neokube-beta"
DOCS_DIR="$GITOPS_DIR/docs"

# Copier tous les CLAUDE*.md
changed=0
for src in "$SRC_DIR"/CLAUDE*.md; do
    fname=$(basename "$src")
    dest="$DOCS_DIR/$fname"
    if ! diff -q "$src" "$dest" &>/dev/null 2>&1; then
        cp "$src" "$dest"
        changed=1
        echo "  ✓ copié : $fname"
    fi
done

if [ "$changed" -eq 0 ]; then
    echo "  — aucun changement CLAUDE*.md"
    exit 0
fi

# Commit et push si des fichiers ont changé
cd "$GITOPS_DIR"
git add docs/CLAUDE*.md

if git diff --cached --quiet; then
    echo "  — git : rien à committer"
    exit 0
fi

git commit -m "sync(docs): CLAUDE*.md → docs/ (auto-sync depuis neokube-beta)" \
  --author="Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
echo "  ✅ CLAUDE*.md synchronisés et poussés dans GitOps"

# Indexer les docs dans SurfSense (espace 2 — Infrastructure NeoKube)
python3 "$SRC_DIR/scripts/index-claude-docs-surfsense.py" || true
