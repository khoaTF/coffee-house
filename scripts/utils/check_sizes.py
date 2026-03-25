import subprocess
commits = subprocess.check_output(['git', 'rev-list', 'HEAD']).decode().splitlines()
for commit in commits:
    try:
        size_str = subprocess.check_output(['git', 'ls-tree', '-r', '-l', commit, 'public']).decode()
        for line in size_str.splitlines():
            if 'index.html' in line:
                print(f"Commit {commit[:7]}: {line.strip()}")
    except Exception as e:
        print(f"Error {commit[:7]}: {e}")
