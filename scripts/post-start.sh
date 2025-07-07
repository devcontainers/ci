#!/bin/bash

# This script runs after the container is created
echo 'Post-create script running from (/workspace/scripts)...'
echo "Current folder: $(pwd)"
echo "Current user: $(whoami)"