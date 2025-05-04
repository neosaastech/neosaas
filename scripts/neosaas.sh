#!/bin/bash

# Capture la commande principale (start, dev, db)
ACTION=$1

# Capture les arguments suivants
shift
ARGS="$@"

# Lancer node avec le bon script
node /opt/neosaas/scripts/neosaas.mjs "$ACTION" $ARGS
