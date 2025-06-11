#!/usr/bin/env bash
# kickstart-versioning.sh — Setup Semantic Versioning
# Author: Charles VDD
# License: MIT

set -e

# --- Color & Emoji Logging ---
info() { echo -e "\e[34mℹ️  $1\e[0m"; }
success() { echo -e "\e[32m✅ $1\e[0m"; }
error() { echo -e "\e[31m❌ $1\e[0m"; exit 1; }

# --- Prerequisites ---
info "Checking Git CLI..."
command -v git >/dev/null 2>&1 || error "Git not found. Please install Git and retry."
success "Git is installed: $(git --version)"

# Check or set up remote origin
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  info "Detected Git repository."
  if git remote get-url origin >/dev/null 2>&1; then
    origin_url=$(git remote get-url origin)
    info "Remote 'origin' → $origin_url"
    git ls-remote origin >/dev/null 2>&1 || error "Cannot reach origin. Check SSH/HTTPS setup."
    success "Origin reachable."
  else
    read -p "Enter GitHub remote URL for 'origin': " origin_url
    git remote add origin "$origin_url"
    success "Added remote origin: $origin_url"
  fi
else
  info "No Git repo found. Will initialize one later."
fi

# --- Interactive Configuration ---
info "Setting up Semantic Versioning configuration..."
read -p "Version file name (default VERSION): " VERSION_FILE
VERSION_FILE=${VERSION_FILE:-VERSION}
read -p "Tag prefix (default v): " TAG_PREFIX
TAG_PREFIX=${TAG_PREFIX:-v}
read -p "Initial version (default 0.1.0): " INITIAL_VERSION
INITIAL_VERSION=${INITIAL_VERSION:-0.1.0}
read -p "Commit message template (use %s for new version, default 'chore: bump to %s'): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"chore: bump to %s"}

# Confirm and write config
cat > .versionrc <<EOF
VERSION_FILE="$VERSION_FILE"
TAG_PREFIX="$TAG_PREFIX"
COMMIT_MSG="$COMMIT_MSG"
EOF
success "Configuration saved to .versionrc"

# --- Initialize Git Repo & Version ---
if [[ ! -d .git ]]; then
  git init
  success "Initialized new Git repository."
fi

if [[ ! -f $VERSION_FILE ]]; then
  echo "$INITIAL_VERSION" > "$VERSION_FILE"
  git add "$VERSION_FILE" .versionrc
  git commit -m "chore: initial version $INITIAL_VERSION"
  git tag -a "${TAG_PREFIX}${INITIAL_VERSION}" -m "Release $INITIAL_VERSION"
  success "Created $VERSION_FILE (version $INITIAL_VERSION) and tagged ${TAG_PREFIX}${INITIAL_VERSION}."
else
  info "$VERSION_FILE already exists, skipping creation."
fi

# --- Generate bump_version.sh ---
cat > bump_version.sh <<'EOS'
$(sed -n '1,200p' kickstart-versioning.sh | sed '1,40d')
EOS
chmod +x bump_version.sh
git add bump_version.sh
git commit -m "chore: add bump_version.sh"
success "Generated bump_version.sh and committed to repo."

success "🎉 Semantic Versioning setup complete! Use './bump_version.sh {patch|minor|major}' to bump versions."
