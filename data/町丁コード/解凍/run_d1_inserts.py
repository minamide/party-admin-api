import subprocess
import sys
import shutil
from pathlib import Path

# ========= 設定 =========
DB_NAME = "party-admin-db"
SQL_DIR = Path("sql_out")
# =======================

# check wrangler availability
WRANGLER_CMD = shutil.which("wrangler")
if WRANGLER_CMD is None:
    print("Error: 'wrangler' executable not found in PATH.")
    print("Install Wrangler and ensure it's on PATH. e.g.: npm install -g wrangler")
    sys.exit(2)

if not SQL_DIR.exists():
    print(f"Error: directory not found: {SQL_DIR}")
    sys.exit(2)

sql_files = sorted(SQL_DIR.glob("*.sql"))

if not sql_files:
    print("No .sql files found.")
    sys.exit(0)

print(f"Found {len(sql_files)} SQL files\n")

# Ensure `m_towns` exists before running inserts
create_sql_path = SQL_DIR / "create_m_towns.sql"
create_sql = (
    "CREATE TABLE IF NOT EXISTS m_towns (\n"
    "  key_code TEXT PRIMARY KEY,\n"
    "  pref_code TEXT,\n"
    "  city_code TEXT,\n"
    "  level INTEGER,\n"
    "  town_name TEXT,\n"
    "  population INTEGER,\n"
    "  male INTEGER,\n"
    "  female INTEGER,\n"
    "  households INTEGER\n"
    ");\n"
)
with open(create_sql_path, "w", encoding="utf-8") as f:
    f.write(create_sql)

print(f"▶ Executing: {create_sql_path}")
try:
    result = subprocess.run(
        [WRANGLER_CMD, "d1", "execute", DB_NAME, "--file", str(create_sql_path)],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.stdout:
        print(result.stdout.strip())
except subprocess.CalledProcessError as e:
    print("\n❌ Error occurred while creating table")
    if e.stdout:
        print("STDOUT:")
        print(e.stdout)
    if e.stderr:
        print("STDERR:")
        print(e.stderr)
    sys.exit(1)

for sql_file in sql_files:
    print(f"▶ Executing: {sql_file}")

    try:
        result = subprocess.run(
            [WRANGLER_CMD, "d1", "execute", DB_NAME, "--file", str(sql_file)],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.stdout:
            print(result.stdout.strip())

    except subprocess.CalledProcessError as e:
        print("\n❌ Error occurred")
        print(f"File: {sql_file}")
        if e.stdout:
            print("STDOUT:")
            print(e.stdout)
        if e.stderr:
            print("STDERR:")
            print(e.stderr)
        sys.exit(1)

print("\n✅ All SQL files executed successfully")
