import csv
import os

# --- 設定 ---
input_file = r'work1\party-admin\seed\parties.txt'  # 入力ファイル名
output_file = r'work1\party-admin\seed\05_seed_parties.sql'  # 出力SQL
table_name = 'm_parties' # テーブル名は適宜合わせてください

def create_sql_insert():
    # 出力先ディレクトリの作成
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        # utf-8-sig でBOM対策
        with open(input_file, mode='r', encoding='utf-8-sig') as f_in, \
             open(output_file, mode='w', encoding='utf-8') as f_out:
            
            # タブ区切りとして読み込み
            # ※もしデータがスペース区切りの場合は delimiter='\t' を消すか ' ' に変更してください
            reader = csv.DictReader(f_in, delimiter='\t')
            
            f_out.write("BEGIN TRANSACTION;\n")
            
            for row in reader:
                # 各カラムの抽出
                p_id = row['party_id']
                name = row['name']
                color = row['party_color']
                notes = row['notes']
                c_at = row['created_at']
                u_at = row['updated_at']
                alive = row['alive']
                
                # エスケープ処理
                safe_name = name.replace("'", "''")
                safe_notes = notes.replace("'", "''")
                
                # SQLの組み立て
                sql = (f"INSERT INTO {table_name} "
                       f"(id, name, color_code, notes, created_at, updated_at, alive) "
                       f"VALUES ('{p_id}', '{safe_name}', '{color}', '{safe_notes}', '{c_at}', '{u_at}', {alive});\n")
                
                f_out.write(sql)
            
            f_out.write("COMMIT;\n")
            
        print(f"成功: {output_file} が作成されました。")

    except FileNotFoundError:
        print(f"エラー: {input_file} が見つかりません。")
    except KeyError as e:
        print(f"エラー: カラム {e} が見つかりません。ヘッダー（1行目）のタブ区切りを確認してください。")

if __name__ == "__main__":
    create_sql_insert()