import csv
import hashlib
import os

# --- 設定 ---
# Windowsのパスは r'' (raw文字列) を使うとバックスラッシュが扱いやすくなります
input_file = r'work1\party-admin\seed\electoral_districts.txt'
output_file = r'work1\party-admin\seed\04_seed_electoral_districts.sql'
table_name = 'm_electoral_districts'

def generate_hash(c_type, p_code, d_num):
    # カラムを結合した文字列を作成
    target_str = f"{c_type}{p_code}{d_num}"
    # SHA-256でハッシュ化
    return hashlib.sha256(target_str.encode('utf-8')).hexdigest()

def create_sql_insert():
    # 出力先ディレクトリが存在しない場合に作成
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        # encoding='utf-8-sig' にすることで、BOM付きUTF-8でも正常に読み込めます
        with open(input_file, mode='r', encoding='utf-8-sig') as f_in, \
             open(output_file, mode='w', encoding='utf-8') as f_out:
            
            # delimiter='\t' を指定してタブ区切りとして読み込む
            reader = csv.DictReader(f_in, delimiter='\t')
            
            # トランザクション開始
            f_out.write("BEGIN TRANSACTION;\n")
            
            for row in reader:
                # 各値の取得
                c_type = row['chamber_type_code']
                p_code = row['pref_code']
                d_num = row['district_number']
                name = row['name']
                
                # ハッシュ値の計算
                h_id = generate_hash(c_type, p_code, d_num)
                
                # SQL文の作成 (シングルクォートのエスケープ処理)
                safe_name = name.replace("'", "''")
                sql = (f"INSERT INTO {table_name} "
                       f"(id, chamber_type_code, pref_code, district_number, name) "
                       f"VALUES ('{h_id}', '{c_type}', '{p_code}', '{d_num}', '{safe_name}');\n")
                
                f_out.write(sql)
            
            # トランザクション終了
            f_out.write("COMMIT;\n")
            
        print(f"成功: {output_file} が作成されました。")

    except FileNotFoundError:
        print(f"エラー: {input_file} が見つかりません。")
    except KeyError as e:
        print(f"エラー: タブ区切りの中にカラム {e} が見つかりません。")
        print("ファイルの1行目がタブで区切られているか、スペルが正しいか確認してください。")

if __name__ == "__main__":
    create_sql_insert()