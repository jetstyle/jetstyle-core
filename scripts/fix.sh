#!/bin/bash

# Go to the script's parent directory (i.e., the root of the project)
cd "$(dirname "$0")/.."

echo "Searching and removing all node_modules folders under $(pwd)..."

# find . -type d -name "node_modules"
 find . -type d -name "node_modules" -prune -exec rm -rf '{}' +

echo "Done."
