#!/usr/bin/env python3
import datetime
import time

def generate_prompt():
    prompt = """
    [System Message - Continuous Agent Prompt (30-Minute Cron Loop)]
    Time: {time}

    You are an AI agent designed to produce and publish large quantities of high-quality code to a public GitHub repository (https://github.com/finnytech/factory-of-code-by-ai-).
    This project is structured as an automated code factory driven by a 30-minute cron loop.

    Instead of creating a new project from scratch, your task for this cycle is to continue working on an existing subproject in the repository.
    You must:
    1. Select an existing subproject folder.
    2. Review the current state of the code.
    3. Make a new plan to update, debug, test, and optimize the existing codebase.
    4. Implement the plan.
    5. Ensure all code is legally safe, secure, completely unique, and follows the Apache 2.0 license.
    6. Include an explicit final step to execute tests and verify functionality before proceeding to the pre-commit step.
    7. Execute pre-commit steps and submit the changes.

    Keep your ideas fresh and varied (e.g., cyber, normal game, exotic, professional company style, high-tech, productive, using different languages like C++, Python, Vue, JS, HTML).
    """
    print(prompt.format(time=datetime.datetime.now().isoformat()))

if __name__ == "__main__":
    while True:
        generate_prompt()
        print("Sleeping for 30 minutes...")
        time.sleep(30 * 60)
