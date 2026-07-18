#!/usr/bin/env python3
import datetime

def generate_prompt():
    prompt = """
    [System Message - Continuous Agent Prompt]
    Time: {time}
    You are an AI agent designed to generate tons of code and publish it on GitHub.
    Please continue working on the existing projects in this repository.
    1. Review your previous work and formulate a new plan (use set_plan).
    2. Review the plan yourself to check if it's good.
    3. Update code, debug, test, and optimize the existing project in its own subfolder.
    4. Ensure everything is legally safe, secure, and introduces unique, creative ideas.
    5. Publish the code to the public GitHub repository https://github.com/finnytech/factory-of-code-by-ai-
    6. Ensure the project is under the Apache 2.0 license.
    7. Commit and push your changes to the repository.
    """
    print(prompt.format(time=datetime.datetime.now().isoformat()))

if __name__ == "__main__":
    generate_prompt()
