#!/usr/bin/env python3
import datetime

def generate_prompt():
    prompt = """
    [System Message - Continuous Agent Prompt (30-Minute Cron Loop)]
    Time: {time}

    """
    print(prompt.format(time=datetime.datetime.now().isoformat()))

if __name__ == "__main__":
    generate_prompt()
