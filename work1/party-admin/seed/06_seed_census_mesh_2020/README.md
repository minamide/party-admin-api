## 下記の仕様で、pythonスクリプトを作成してください。

census_mesh_2020_data/


## 補足（実装済みの追加機能と使い方のまとめ）

- ストリーミング読み込み (`read_csv_stream`) によりファイルを読みながらバッチ単位でアップロードします（メモリ節約）。
- オプション: `--upload-batch-size`（デフォルト1000）。バッチ毎にチェックポイント保存、ログ出力、`--sleep` による待機を行います。
- 進行表示: `--progress-every` で行単位の進捗を定期出力します（例: `--progress-every 100`）。
- 並列処理: `--parallel N` を指定すると ThreadPoolExecutor で並列 PUT を行います。並列時もバッチ単位で処理します。
- wrangler handling:
	- `--use-wrangler` を指定すると `wrangler` CLI で KV 操作を行います。
	- `wrangler` が PATH に無い場合、`CF_ACCOUNT_ID`/`CF_NAMESPACE_ID`/`CF_API_TOKEN` がセットされていれば自動で HTTP API 経路へフォールバックします（警告を出力）。
	- `wrangler` 呼び出しにはタイムアウトと出力キャプチャが入り、ハングを緩和しています。
- 安全機能: `--dry-run`、`--skip-existing`、チェックポイント（`--checkpoint-file`）等を備えています。

### 実行例（推奨）

HTTP 経路（環境変数を設定）:
```powershell
setx CF_ACCOUNT_ID "your_account_id"
setx CF_NAMESPACE_ID "your_namespace_id"
setx CF_API_TOKEN "your_api_token"
# 新しいターミナルを開いてから
python upload_kv.py --indir census_mesh_2020_data --parallel 4 --upload-batch-size 1000 --progress-every 100 --dry-run
```

wrangler 経路（wrangler がインストール済みの場合）:
```bashpython upload_kv.py --use-wrangler --wrangler-namespace census_mesh_2020 --parallel 4 --upload-batch-size 1000 --progress-every 100 --dry-run

```

### トラブルシュート

- コマンドが固まる: `wrangler` を使っているときは CLI が PATH にあるか確認してください。`wrangler` が無い場合は上記の HTTP 経路を利用してください。
- wrangler が見つからず自動フォールバックした際は警告が出ます。
- 環境変数（CF_*）未設定の場合、HTTP 経路は利用できません。wrangler をインストールするか環境変数を設定してください。

----

これらの情報は `upload_kv.py` に実装済みのオプション/挙動を反映しています。実行確認を希望する場合は `--dry-run` での実行ログを取得します。


CSV（メッシュ集計）を読み込み、各行を JSON 化して Cloudflare Workers KV にキー単位で登録する Python スクリプトを作成してください。

前提（必ず含めること）:

入力ディレクトリ: census_mesh_2020_data/（複数 CSV を処理）
各 CSV の1行目はヘッダー（例: KEY_CODE,HTKSYORI,HTKSAKI,GASSAN,T001101001,...T001101050）
出力: KV に key=census_mesh_2020:{KEY_CODE}、value=JSON（列名→値）
環境変数（必須）:
CF_ACCOUNT_ID（Cloudflare アカウント ID）
CF_NAMESPACE_ID（KV ネームスペース ID）
CF_API_TOKEN（API トークン。KV の write 権限を含むこと）
Cloudflare KV 書き込み API を直接使う（PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key}）。ヘッダに Authorization: Bearer {CF_API_TOKEN} を付与する。
必須機能（スクリプトが満たすべき要件）:

エンコーディング検出: utf-8-sig, utf-8, cp932, shift_jis, euc_jp を順に試す。
値変換:
空文字、全角空白、* → JSON の null
数値列はカンマ除去後に整数化、失敗時は null
HTKSAKI のセミコロン区切りは文字列のままでOK（必要なら配列化するオプション）
登録挙動:
オプション --skip-existing が指定されたら、KV に同キーが既に存在する場合はスキップ（事前に GET して存在確認）。
デフォルトは上書き（PUT）。
安全/実行オプション:
--dry-run: 実際の PUT は行わず、実行予定のコマンド／キー／サンプル JSON を出力。
--batch-size（デフォルト 100）と --sleep（デフォルト 0.5 秒）でレート制御。
再試行ロジック: PUT/GET 失敗時は指数バックオフで最大 N 回リトライ（例: 3回）。
ロギング:
成功数、スキップ数、失敗の要約を最後に出力。
失敗時はキーと HTTP ステータス/メッセージをログに残す。
使い方表示（--help）と例:
例: CF_ACCOUNT_ID=... CF_NAMESPACE_ID=... CF_API_TOKEN=... python upload_kv.py --indir census_mesh_2020_data --skip-existing --dry-run
出力 JSON フォーマットの例（value）を示すこと:
{
"key_code": "623927494",
"htk_syori": 2,
"htk_saki": "623927592",
"gassan": null,
"t001101001": 7,
...
}
追加機能（本実装）:
- KV 値サイズが 25MB を超える可能性がある場合に警告を出します。
- --parallel N で並列処理（デフォルトは逐次）。大規模投入時は注意してください。
- --log-file でログをファイルに追記します。
- --checkpoint-file で途中再開用マーカーを保存/読み込みします（ファイル単位と行インデックスで再開）。
- requirements: requests のみ必要（pip install requests）

簡単な実行例:
 CF_ACCOUNT_ID=... CF_NAMESPACE_ID=... CF_API_TOKEN=... python upload_kv.py --indir census_mesh_2020_data --skip-existing --log-file upload.log --checkpoint-file .ckp --parallel 4

注意:
- API トークン等は環境変数で渡してください（ハードコーディング禁止）。
- 並列時のチェックポイントはファイル単位で上書きする方式のため、厳密な行単位再開が不要な使い方を推奨します。
