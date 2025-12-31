# Census Mesh 2020 API

国勢調査メッシュデータ（2020年）を操作するためのAPIエンドポイント群です。

## エンドポイント一覧

### 1. 特定メッシュコードのデータ取得

```
GET /census-mesh/:keyCode
```

指定したメッシュコードの国勢調査データを取得します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード（例: `623927591`）

**レスポンス例:**
```json
{
  "keyCode": "623927591",
  "htkSyori": 0,
  "htkSaki": null,
  "gassan": null,
  "t001101001": 149,
  "t001101002": 59,
  "t001101003": 90,
  "t001101034": 84,
  ...
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

### 2. メッシュデータの検索

```
GET /census-mesh
```

クエリパラメータで条件を指定してメッシュデータを検索します。

**クエリパラメータ:**
- `keyCodePrefix` (string, optional): メッシュコードの前方一致検索（例: `6239`）
- `minPopulation` (number, optional): 最小人口
- `maxPopulation` (number, optional): 最大人口
- `minHouseholds` (number, optional): 最小世帯数
- `maxHouseholds` (number, optional): 最大世帯数
- `limit` (number, optional): 取得件数上限（デフォルト: 100, 最大: 1000）
- `offset` (number, optional): オフセット（ページネーション用）

**リクエスト例:**
```
GET /census-mesh?keyCodePrefix=6239&minPopulation=100&limit=50&offset=0
```

**レスポンス例:**
```json
{
  "data": [
    {
      "keyCode": "623927591",
      "t001101001": 149,
      ...
    },
    {
      "keyCode": "623927592",
      "t001101001": 194,
      ...
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "count": 2
  }
}
```

**ステータスコード:**
- `200`: 成功
- `500`: サーバーエラー

---

### 3. メッシュコード前綴の集計データ取得

```
GET /census-mesh/summary/:keyCodePrefix
```

特定のメッシュコード前綴（都道府県や市区町村レベル）の集計データを取得します。

**パスパラメータ:**
- `keyCodePrefix` (string): メッシュコードの前綴（例: `6239` で東京都内の一部）

**レスポンス例:**
```json
{
  "keyCodePrefix": "6239",
  "summary": {
    "totalPopulation": 1000,
    "totalHouseholds": 450,
    "totalMale": 480,
    "totalFemale": 520,
    "totalAge0to14": 150,
    "totalAge15to64": 650,
    "totalAge65Plus": 200,
    "totalAge75Plus": 80,
    "totalForeigners": 30,
    "meshCount": 10
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: 該当するメッシュデータが見つからない
- `500`: サーバーエラー

---

### 4. 人口統計詳細（整形版）

```
GET /census-mesh/statistics/demographics/:keyCode
```

特定メッシュの詳細な人口統計情報を整形して返します。

**パスパラメータ:**
- `keyCode` (string): 標準地域メッシュコード

**レスポンス例:**
```json
{
  "keyCode": "623927591",
  "population": {
    "total": 149,
    "male": 59,
    "female": 90
  },
  "ageGroups": {
    "age0to14": {
      "total": 10,
      "male": 5,
      "female": 5
    },
    "age15to64": {
      "total": 100,
      "male": 40,
      "female": 60
    },
    "age65Plus": {
      "total": 39,
      "male": 14,
      "female": 25
    },
    "age75Plus": {
      "total": 15,
      "male": 6,
      "female": 9
    }
  },
  "foreigners": {
    "total": 5,
    "male": 2,
    "female": 3
  },
  "households": {
    "total": 84,
    "general": 84,
    "singlePerson": 40,
    "twoPerson": 31,
    "threePerson": 7,
    "fourPerson": 4,
    "fivePerson": 2,
    "sixPerson": 0,
    "sevenPlusPersons": 0,
    "nuclear": 38,
    "elderly": 14
  }
}
```

**ステータスコード:**
- `200`: 成功
- `404`: メッシュデータが見つからない
- `500`: サーバーエラー

---

## データ項目の説明

### 秘匿処理関連
- `htkSyori`: 秘匿処理区分（0=なし, 1=秘匿あり, 2=合算先）
- `htkSaki`: 秘匿先メッシュコード
- `gassan`: 合算先メッシュコード（セミコロン区切り）

### 人口統計（t001101001 ~ t001101033）
- `t001101001-003`: 人口（総数/男/女）
- `t001101004-006`: 0～14歳人口
- `t001101007-009`: 15歳以上人口
- `t001101010-012`: 15～64歳人口
- `t001101013-015`: 18歳以上人口
- `t001101016-018`: 20歳以上人口
- `t001101019-021`: 65歳以上人口
- `t001101022-024`: 75歳以上人口
- `t001101025-027`: 85歳以上人口
- `t001101028-030`: 95歳以上人口
- `t001101031-033`: 外国人人口

### 世帯統計（t001101034 ~ t001101050）
- `t001101034`: 世帯総数
- `t001101035`: 一般世帯数
- `t001101036-042`: 世帯人員別（1人～7人以上）
- `t001101043`: 親族のみ世帯数
- `t001101044`: 核家族世帯数
- `t001101045`: 核家族以外世帯数
- `t001101046`: 6歳未満世帯員のいる世帯数
- `t001101047`: 65歳以上世帯員のいる世帯数
- `t001101048`: 世帯主20～29歳の1人世帯
- `t001101049`: 高齢単身世帯
- `t001101050`: 高齢夫婦世帯

---

## 使用例

### TypeScript/JavaScript

```typescript
// 特定メッシュのデータ取得
const response = await fetch('https://api.example.com/census-mesh/623927591');
const data = await response.json();
console.log(`人口: ${data.t001101001}, 世帯数: ${data.t001101034}`);

// 東京都内の人口100人以上のメッシュを検索
const searchResponse = await fetch(
  'https://api.example.com/census-mesh?keyCodePrefix=6239&minPopulation=100&limit=100'
);
const searchData = await searchResponse.json();
console.log(`検索結果: ${searchData.data.length}件`);

// 集計データ取得
const summaryResponse = await fetch('https://api.example.com/census-mesh/summary/6239');
const summaryData = await summaryResponse.json();
console.log(`合計人口: ${summaryData.summary.totalPopulation}`);

// 整形された人口統計データ取得
const demographicsResponse = await fetch(
  'https://api.example.com/census-mesh/statistics/demographics/623927591'
);
const demographics = await demographicsResponse.json();
console.log(`65歳以上人口: ${demographics.ageGroups.age65Plus.total}`);
```

---

## パフォーマンス考慮事項

1. **ページネーション**: 大量データを取得する際は`limit`と`offset`を使用してページング処理を実装してください。
2. **インデックス**: `key_code`はPRIMARY KEYとしてインデックスが設定されています。前方一致検索も効率的に動作します。
3. **集計クエリ**: `/summary`エンドポイントはSQLiteの集計関数を使用しており、大量のメッシュを含む前綴では処理時間がかかる場合があります。

---

## テスト

```bash
# テストの実行
npm run test src/routes/census_mesh.test.ts
```

---

## データソース

- 出典: [e-Stat 統計GIS](https://www.e-stat.go.jp/gis/statmap-search)
- 統計: 令和2年国勢調査（2020年）
- メッシュ: 標準地域メッシュ（500m, 1km）

---

## 参考リンク

- [標準地域メッシュについて](https://www.stat.go.jp/data/mesh/index.html)
- [国勢調査](https://www.stat.go.jp/data/kokusei/2020/)
