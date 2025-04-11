"""
python codebase_prompt.py [--directory DIR] [--ignore EXTENSIONS] [--include-binary]
"""

import os
import sys
import argparse
import subprocess

def parse_arguments():
    parser = argparse.ArgumentParser(description='LLM codebase')
    parser.add_argument('--directory', nargs='?', default=os.getcwd(), dest='directory')
    parser.add_argument('--ignore', dest='ignore_extensions', 
                        default=".ipynb,.bin,.pyc,.pyo,.pyd,.git,.DS_Store,.jpg,.jpeg,.png,.gif,.pdf,.ico,.gitignore,.env,.svg,.md,.mjs,setup.js,lock.json",
                        help='extensions to ignore')
    parser.add_argument('--include-binary', dest='include_binary', 
                        action='store_true', default=False,
                        help='Include files that might be binary/non-text')
    
    args = parser.parse_args()
    ignore_extensions = [ext.strip() 
                         for ext in args.ignore_extensions.split(',')]
    
    return args.directory, ignore_extensions, args.include_binary

def is_likely_text_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for _ in range(15):
                f.readline()
        return True
    except UnicodeDecodeError:
        return False

def get_file_structure(root_dir, ignore_extensions, include_binary=False):
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=root_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True
    )
    
    files = [
        f for f in result.stdout.splitlines()
        if not any(f.endswith(ext) for ext in ignore_extensions)
    ]
    
    if not include_binary:
        files = [f for f in files if is_likely_text_file(os.path.join(root_dir, f))]
    
    try:
        temp_file = os.path.join(root_dir, ".git", "temp_file_list.txt")
        with open(temp_file, 'w') as f:
            f.write("\n".join(sorted(files)))
        
        tree_cmd = ["tree", "--fromfile", "-F"]
        tree_result = subprocess.run(
            tree_cmd,
            cwd=root_dir,
            input="\n".join(sorted(files)),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        os.remove(temp_file)
        
        if tree_result.returncode == 0:
            return f"# Repository: {os.path.basename(root_dir)}\n{tree_result.stdout}"
    except Exception as e:
        print(f"Tree command failed: {e}. Using simple file listing instead., {files}")
        
    print("Using simple file listing instead.")
    file_structure = f"# Repository: {os.path.basename(root_dir)}\n"
    file_structure += "\n".join(sorted(files))
    
    return file_structure
def get_file_contents(root_dir, ignore_extensions, include_binary=False):
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=root_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True
    )
    
    files = [
        f for f in result.stdout.splitlines()
        if not any(f.endswith(ext) for ext in ignore_extensions)
    ]
    if not include_binary:
        files = [f for f in files if is_likely_text_file(os.path.join(root_dir, f))]
    
    file_contents = []
    extensions_used = set()
    for file_path in sorted(files):
        full_path = os.path.join(root_dir, file_path)
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            file_contents.append(f"\n\n--- File: {file_path} ---\n\n")
            file_contents.append(content)
            extensions_used.add(os.path.splitext(file_path)[1])
        except Exception as e:
            file_contents.append(f"\n\n--- File: {file_path} ---\n\n")
            file_contents.append(f"Error reading file: {str(e)}")
    print(f"Extensions used: {', '.join(extensions_used)}")    
    return "".join(file_contents)

directory, ignore_extensions, include_binary = parse_arguments()

if not os.path.isdir(directory):
    print(f"Error: '{directory}' is not a valid directory.")
    sys.exit(1)

output_file = "codebase_prompt.txt"

prompt = []
prompt.append("# CODEBASE STRUCTURE\n")
prompt.append(get_file_structure(directory, ignore_extensions, include_binary))
prompt.append("\n\n# FILE CONTENTS\n")
prompt.append(get_file_contents(directory, ignore_extensions, include_binary))

full_prompt = "\n".join(prompt)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(full_prompt)

char_count = len(full_prompt)
print(f"Prompt generated in '{output_file}'")
print(f"Character count: {char_count:,}")