#!/bin/bash
# Copy the latest results from parent directory to the app

SOURCE="../data/evals/results.json"
DEST="public/data/evals/results.json"

if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "$DEST"
    echo "✓ Results updated from $SOURCE"
else
    echo "✗ Source file not found: $SOURCE"
    exit 1
fi


