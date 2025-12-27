# メール認証トラブルシューティング ガイド

## メール認証が失敗する原因と解決策

### 原因1: 環境変数が設定されていない

**症状:**
- メール送信が失敗する
- エラーメッセージ: "No email service configured"

**解決策:**

`wrangler.jsonc` に以下の環境変数を設定してください:

```jsonc
"vars": {
  "NODE_ENV": "development",
  "BASE_URL": "http://localhost:3000",  // フロントエンドのURL
  "FROM_EMAIL": "noreply@party-admin.local",
  "EMAIL_SERVICE": "development"  // 開発環境ではdevelopmentを指定
}
```

#### 設定値の説明:

| 変数 | 説明 | 開発環境 | 本番環境 |
|-----|------|--------|--------|
| `NODE_ENV` | 実行環境 | `development` | `production` |
| `BASE_URL` | フロントエンドのベースURL | `http://localhost:3000` | 本番URL |
| `FROM_EMAIL` | メール送信元アドレス | テスト用 | 実際のメール |
| `EMAIL_SERVICE` | メールサービスプロバイダ | `development` | `resend` or `mailgun` |

### 原因2: メール認証トークンが生成されていない

**症状:**
- ユーザー登録成功時にメール認証URLが返されない
- データベースにトークンレコードがない

**確認方法:**

1. サーバーログを確認して、以下のメッセージを探してください:
   ```
   🔐 Verification Token Created:
     Token: <token_value>
     Full URL: http://localhost:3000/auth/verify-email?token=<token_value>
   ```

2. ログに上記が表示されない場合、`src/routes/auth.ts` の署名登録エンドポイントで
   トークン生成が失敗している可能性があります。

### 原因3: BASE_URLが正しく設定されていない

**症状:**
- メール認証リンクが正しいドメインを指していない
- クリックしても「ページが見つかりません」エラーになる

**解決策:**

開発環境での場合:
```jsonc
"BASE_URL": "http://localhost:3000"  // x_mockupプロジェクトのURL
```

本番環境での場合:
```jsonc
"BASE_URL": "https://yourdomain.com"  // 実際のドメイン
```

## メール認証フロー の全体像

### ステップ 1: ユーザー登録

```bash
POST /auth/signup
Content-Type: application/json

{
  "name": "ユーザー名",
  "email": "user@example.com",
  "handle": "handle123",
  "password": "Password123!"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Account created successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "handle": "handle123",
      "isVerified": false
    },
    "token": "jwt_token"
  }
}
```

**内部処理:**
1. ユーザーをデータベースに保存（`isVerified: 0`）
2. メール認証トークンを生成
3. メール認証URLを作成
4. メールを送信（開発環境ではコンソール出力）

**開発環境でのメール確認:**
- `npm run dev` で実行中に、ターミナルを確認
- 次のようなメッセージが表示されます:
  ```
  📧 [DEVELOPMENT MODE] Email would be sent:
  From: noreply@party-admin.local
  To: user@example.com
  Subject: アカウント登録完了 - メール認証をお願いします
  ---
  TEXT VERSION:
  [メールテキスト内容]
  ---
  HTML VERSION:
  [メールHTML内容]
  ```

### ステップ 2: メール認証トークンの検証

ユーザーがメール内のリンクをクリック:
```
http://localhost:3000/auth/verify-email?token=<token_value>
```

フロントエンドがバックエンドの認証エンドポイントを呼び出し:
```bash
POST /auth/verify-email
Content-Type: application/json

{
  "token": "<verification_token>"
}
```

**レスポンス (成功):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "isVerified": true
    },
    "token": "new_jwt_token"
  }
}
```

**内部処理:**
1. トークンの有効性を検証（期限切れ、使用済みなど）
2. ユーザーの `isVerified` を 1 に更新
3. トークンを使用済みとしてマーク
4. 新しい JWT を生成して返す

## デバッグ方法

### 1. メール送信がスキップされていないか確認

ログで以下を探してください:
```
❌ Email sending failed: ...
```

### 2. トークンが正しく生成されているか確認

ログで以下を探してください:
```
🔐 Verification Token Created:
  Token: [64文字のランダム文字列]
```

### 3. データベースでトークンを確認

D1 データベースで `verificationTokens` テーブルをクエリ:
```sql
SELECT * FROM verificationTokens WHERE userId = '<user-id>';
```

出力:
- `token`: ランダムトークン値
- `type`: `email_verification`
- `expiresAt`: ISO 形式の時刻（現在から24時間後）
- `usedAt`: `NULL`（未使用）

### 4. ユーザー登録後の状態を確認

```sql
SELECT id, email, isVerified, createdAt FROM users WHERE email = 'user@example.com';
```

- `isVerified`: 0（未検証）→ メール認証後 → 1（検証済み）

## テストコマンド

### テスト1: ユーザー登録

```bash
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "handle": "testuser",
    "password": "TestPass123!"
  }'
```

ターミナルに表示されるトークンを確認します。

### テスト2: メール認証

```bash
curl -X POST http://localhost:8787/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-step1>"
  }'
```

## 本番環境での設定

本番環境では、実際のメールサービスを使用してください。

### Resend を使用する場合

1. [Resend](https://resend.com) でアカウント作成
2. API キーを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "resend",
  "RESEND_API_KEY": "re_xxxxxx"  // 環境変数として定義
}
```

### MailGun を使用する場合

1. [MailGun](https://www.mailgun.com) でアカウント作成
2. API キーとドメインを取得
3. `wrangler.jsonc` に設定:

```jsonc
"vars": {
  "EMAIL_SERVICE": "mailgun",
  "MAILGUN_API_KEY": "key-xxxxxx",
  "MAILGUN_DOMAIN": "mg.yourdomain.com"
}
```

## その他の注意事項

- トークンは24時間で有効期限切れ
- 同じユーザーに対して新しいトークンを生成すると、古いトークンは削除される
- `/resend-verification` エンドポイントで認証メールを再送信可能
- メール認証完了後、ユーザーは認証済みユーザーとしてアクセス可能
