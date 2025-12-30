# TODOs

作成日: 2025-12-30

以下は今後対応する主要タスクの一覧です。優先度はプロジェクト状況に応じて調整してください。

1. リモート D1 にマイグレーションを適用して `activity_places` 系テーブルを作成
   - ステータス: not-started
   - 関連: `drizzle/20251230000001_create_activity_places.sql`, `wrangler.jsonc`

2. `drizzle` マイグレーションの検出経路と `migrations_dir` を確認・修正する
   - ステータス: not-started
   - 関連: `wrangler.jsonc` の `d1_databases[*].migrations_dir`

3. 活動場所テーブル用の down（ロールバック）マイグレーションを追加
   - ステータス: not-started
   - 関連: `drizzle/` フォルダ

4. 写真アップロードエンドポイントを実装（署名付きURL or direct upload）
   - ステータス: not-started
   - 関連: `src/routes/activity_places.ts`, `activity_place_photos` テーブル

5. 写真挿入をトランザクションで処理し `photo_count` を更新
   - ステータス: not-started
   - 関連: `src/db/schema.ts`, `src/routes/activity_places.ts`

6. `activity_places` の統合テスト（CRUD + types + photos）を作成
   - ステータス: not-started
   - 関連: `tmp/` テストスクリプト、`vitest` 設定

7. OAuth の `social_accounts` SELECT エラー原因を再現・調査・ログ強化
   - ステータス: not-started
   - 関連: `src/routes/oauth.ts`, `src/db/schema.ts` の `social_accounts`

8. PowerShell/ログの文字化け問題を調査して UTF-8 出力に統一
   - ステータス: not-started
   - 備考: Windows 環境における端末設定と Node の標準出力設定を確認

9. CI に D1 マイグレーション適用とテスト実行を追加（GitHub Actions 等）
   - ステータス: not-started
   - 関連: `.github/workflows/`（未作成）

10. ドキュメント更新：`TABLE_DEFINITIONS.md` と `activity_places` API 仕様を反映
   - ステータス: not-started
   - 関連: `docs/`, `README.md`

---

次のアクションを教えてください（例: 1 を実行してリモートにマイグレーションを適用する）。