import os

# --- 設定 ---
INPUT_FILE = 'work1/party-admin/seed/towns.txt'
OUTPUT_DIR = 'work1/party-admin/seed/03_seed_towns'
OUTPUT_BASE_NAME = '03_seed_towns'
FILE_SPLIT_SIZE = 10000  # 10,000件ごとにファイルを分割
INSERT_BATCH_SIZE = 1000 # INSERT文の中のVALUESは1,000件ごと

def main():
    results = []
    
    # 出力先ディレクトリの作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"ファイルを読み込み中: {INPUT_FILE}")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"エラー: {INPUT_FILE} が見つかりません。")
        return

    total = len(lines)
    print(f"合計 {total} 件のデータを処理中...")

    # 1. データのパース
    for i, line in enumerate(lines):
        parts = line.split()
        if len(parts) < 9:
            continue

        key_code   = parts[0]
        pref_code  = parts[1]
        city_code  = parts[2]
        level      = parts[3]
        town_name  = parts[4].replace("'", "''") # SQLエスケープ
        pop        = parts[5]
        male       = parts[6]
        female     = parts[7]
        households = parts[8]

        lat, lng = "0.0", "0.0"

        val = (
            f"('{key_code}','{pref_code}','{city_code}','{level}','{town_name}',"
            f"{lat},{lng},{pop},{male},{female},{households})"
        )
        results.append(val)

    # 2. 10,000件ごとに分割してファイル書き出し
    file_count = 0
    for start_idx in range(0, len(results), FILE_SPLIT_SIZE):
        file_count += 1
        chunk = results[start_idx : start_idx + FILE_SPLIT_SIZE]
        output_file = os.path.join(OUTPUT_DIR, f"{OUTPUT_BASE_NAME}_{file_count}.sql")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- D1 Seed Data Part {file_count}\n")
            f.write("BEGIN TRANSACTION;\n")
            
            # 最初のファイルの最初だけDELETE文を入れる（既存データをリセットする場合）
            if file_count == 1:
                f.write("DELETE FROM m_towns;\n\n")

            # INSERT文を1,000件ごとに分割
            for j in range(0, len(chunk), INSERT_BATCH_SIZE):
                batch = chunk[j : j + INSERT_BATCH_SIZE]
                f.write(
                    'INSERT INTO "m_towns" ('
                    'key_code, pref_code, city_code, level, town_name, '
                    'latitude, longitude, population, male, female, households'
                    ') VALUES\n'
                )
                f.write(",\n".join(batch))
                f.write(";\n\n")

            f.write("COMMIT;\n")
            f.write(f"SELECT count(*) AS total_after_part_{file_count} FROM m_towns;\n")
        
        print(f"ファイル出力完了: {output_file} ({len(chunk)}件)")

    print(f"\nすべて完了！ {file_count} 個のSQLファイルを生成しました。")

if __name__ == "__main__":
    main()