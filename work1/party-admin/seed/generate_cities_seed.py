import requests
import time
import unicodedata
import xml.etree.ElementTree as ET

# --- 設定 ---
INPUT_FILE = 'work1\\party-admin\\seed\\cities.txt'
OUTPUT_FILE = 'work1\\party-admin\\seed\\02_seed_cities.sql'
BATCH_SIZE = 1000  # 1000行ごとにINSERT文を区切る
PREF_MAP = { '01': '北海道' } # 必要に応じて追加

def to_full_width_katakana(text):
    """半角カタカナを全角カタカナに変換（濁点結合含む）"""
    return unicodedata.normalize('NFKC', text)

def get_coords(pref_code, city_name):
    """国土地理院APIから座標を取得"""
    pref_name = PREF_MAP.get(pref_code, "")
    address = f"{pref_name}{city_name}"
    # 国土地理院 住所検索API
    url = f"https://msearch.gsi.go.jp/address-search/AddressSearch?q={address}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data and isinstance(data, list) and len(data) > 0:
                # 'geometry'→'coordinates'は [lng, lat] の順
                coords = data[0].get('geometry', {}).get('coordinates', None)
                if coords and len(coords) == 2:
                    lng, lat = coords
                    return str(lat), str(lng)
    except Exception as e:
        print(f"  [Error] {city_name}: {e}")
    return "0.0", "0.0"

def main():
    results = []
    
    print(f"ファイルを読み込み中: {INPUT_FILE}")
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"エラー: {INPUT_FILE} が見つかりません。")
        return

    print(f"合計 {len(lines)} 件の処理を開始します（{BATCH_SIZE}件ごとに分割出力）")

    for i, line in enumerate(lines):
        parts = line.split()
        if len(parts) < 4:
            continue
            
        pref_code = parts[0]
        city_code = parts[1]
        city_name = parts[2]
        city_kana_half = parts[3]
        
        # 全角変換
        city_kana_full = to_full_width_katakana(city_kana_half)
        
        # 座標取得
        lat, lng = get_coords(pref_code, city_name)
        print(f"[{i+1}/{len(lines)}] {city_name} -> {lat}, {lng}")
        
        # 行データの作成
        val = f"('{city_code}','{pref_code}','{city_name}','{city_kana_full}',{lat},{lng})"
        results.append(val)
        
        # API負荷軽減 (0.5秒待機)
        time.sleep(0.5)

    # SQLファイル作成
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("BEGIN TRANSACTION;\n")
        f.write("DELETE FROM m_cities;\n\n")

        # BATCH_SIZEごとに分割してINSERT文を書く
        for i in range(0, len(results), BATCH_SIZE):
            batch = results[i : i + BATCH_SIZE]
            f.write('INSERT INTO "m_cities" (city_code, pref_code, city_name, city_kana, latitude, longitude) VALUES\n')
            f.write(",\n".join(batch))
            f.write(";\n\n")

        f.write("COMMIT;")
        
    print(f"\n完了！ {OUTPUT_FILE} に保存しました。")

if __name__ == "__main__":
    main()