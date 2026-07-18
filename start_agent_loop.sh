#!/bin/bash
echo "Starting continuous agent loop. Triggering every 30 minutes (1800 seconds)..."
while true; do
    ./cron_agent.py
    # Output could be piped to an agent API or a file in a real scenario
    echo "Waiting for 30 minutes..."
    sleep 1800
done
