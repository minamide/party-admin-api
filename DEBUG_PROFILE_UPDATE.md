# プロフィール更新デバッグガイド

## 問題診断フロー

### 1. ブラウザコンソールの確認

開発者ツール (F12) → コンソールで以下を確認：

```javascript
// 以下のログが表示されるか確認
// - "Saving profile:" - リクエスト送信前
// - "Profile update response:" - レスポンス受信
// - "Profile saved successfully:" - 完了
// - エラーがあれば "Profile update error:" と詳細
```

### 2. ネットワークタブの確認

1. F12 を開く
2. Network タブを開く
3. プロフィール編集ページで「保存」をクリック
4. `PUT /users/{userId}` リクエストを探す
5. **Response タブ**を確認：
   ```json
   {
     "success": true,
     "data": {
       "id": "...",
       "name": "更新後の名前",
       "bio": "更新後の自己紹介",
       "updatedAt": "2025-12-27T..."
     }
   }
   ```
6. **Status コード** が 200 か 400/403 か確認

### 3. バックエンド ログの確認

開発サーバーを起動している Terminal で以下ログが表示されるか：

```
Profile update request: { userId: '...', authUserId: '...', authUserRole: 'user', body: {...} }
Updating user with data: { id: '...', updateData: {...} }
Update result: { id: '...', success: true, name: '更新後の名前', bio: '...', updatedAt: '...' }
```

**エラーの場合：**
```
Access denied: { requestUserId: '...', targetId: '...', role: 'user' }
// → ユーザーID が一致していない可能性
```

### 4. 共通の問題と対策

| 問題 | ログ | 対策 |
|------|------|------|
| 権限エラー | `Access denied` | ユーザーIDが正しいか確認。トークンが正しいユーザーのものか確認 |
| ユーザーが見つからない | `USER_NOT_FOUND` | ユーザーID の型が一致しているか確認（文字列か数値か） |
| バリデーション失敗 | `INVALID_EMAIL` など | メールアドレス、ハンドルの形式を確認 |
| DB エラー | `USER_UPDATE_ERROR` | サーバーのエラーログを確認。DB接続の確認 |
| レスポンス形式エラー | 無し、またはエラー表示 | Network タブでレスポンス本体を確認 |

### 5. 手動テスト（curl コマンド）

```bash
# トークン取得後
curl -X PUT http://127.0.0.1:8787/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "bio": "Updated bio",
    "location": "Tokyo, Japan"
  }'
```

### 6. データベース直接確認（Wrangler D1）

```bash
# ワークスペース内で実行
wrangler d1 execute party-admin-api-db --remote \
  --command "SELECT id, name, bio, location, updated_at FROM users WHERE id = 'USER_ID' LIMIT 1;"
```

## デバッグチェックリスト

- [ ] ブラウザコンソールで "Saving profile:" ログが出ている
- [ ] Network タブで PUT リクエストが 200 で返っている
- [ ] Response に `"success": true` が含まれている
- [ ] Response の `data` に新しい値が含まれている
- [ ] バックエンド Terminal に "Update result: { ... success: true ..." ログが出ている
- [ ] `fetchMe()` で再取得したユーザー情報が新しい値を持っている
- [ ] DB に直接クエリして updatedAt が最新時刻になっている

## よくある原因

1. **トークン問題**: 無効なトークンまたはトークンの型が正しくない
2. **ユーザーID の不一致**: リクエストするユーザーIDとトークンに含まれるユーザーIDが異なる
3. **DB トランザクション失敗**: SQLの構文エラーなど
4. **Image/Base64 が大きすぎる**: 大きな画像を Base64 エンコードしようとしている
5. **API ベース URL の設定**: `NEXT_PUBLIC_PARTY_ADMIN_API_BASE` が正しく設定されているか

## さらに詳細なログを有効にする場合

バックエンド ([users.ts](../../party-admin-api/src/routes/users.ts)) の `PUT /:id` エンドポイントに以下を追加：

```typescript
console.log('Before update, user exists:', await db.select().from(users).where(eq(users.id, id)).get());
// ... 更新実行 ...
console.log('After update, user data:', await db.select().from(users).where(eq(users.id, id)).get());
```

以上の手順で問題の原因を特定できます。
