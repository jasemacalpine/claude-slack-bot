#!/bin/bash

# Navigate to Gypsy Tales directory
cd /Users/gypsytalesmini/Documents/Gypsy-Tales_Media-V2

# Set up proper environment
export PATH="$PATH:/Users/gypsytalesmini/.npm-global/bin"
export HOME="/Users/gypsytalesmini"

# Run Claude Code with the prompt
exec claude -p "$1"