#!/bin/bash

# Simple auto-bump script for VERSION file

if [ ! -f VERSION ]; then
  echo "0.0.1" > VERSION
fi

current_version=$(cat VERSION)
echo "Current version: $current_version"

IFS='.' read -r -a parts <<< "$current_version"
major=${parts[0]}
minor=${parts[1]}
patch=${parts[2]}

patch=$((patch+1))
new_version="$major.$minor.$patch"

echo "New version: $new_version"
echo "$new_version" > VERSION

git add VERSION
git commit -m "Bump version to $new_version"
