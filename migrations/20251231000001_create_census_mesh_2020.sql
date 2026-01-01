-- https://www.e-stat.go.jp/gis/statmap-search?page=1&type=1&toukeiCode=00200521&toukeiYear=2020&aggregateUnit=H&serveyId=H002005112020&statsId=T001101&datum=2000&by_prefecture_flg=1

CREATE TABLE census_mesh_2020 (
    key_code TEXT PRIMARY KEY,          -- 標準地域メッシュコード

    htk_syori INTEGER,                  -- 秘匿処理区分
    htk_saki  TEXT,                     -- 秘匿先
    gassan    TEXT,                     -- 合算先（;区切り）

    -- 人口
    t001101001 INTEGER, -- 人口（総数）
    t001101002 INTEGER, -- 人口（総数）男
    t001101003 INTEGER, -- 人口（総数）女

    t001101004 INTEGER, -- 0～14歳人口 総数
    t001101005 INTEGER, -- 0～14歳人口 男
    t001101006 INTEGER, -- 0～14歳人口 女

    t001101007 INTEGER, -- 15歳以上人口 総数
    t001101008 INTEGER, -- 15歳以上人口 男
    t001101009 INTEGER, -- 15歳以上人口 女

    t001101010 INTEGER, -- 15～64歳人口 総数
    t001101011 INTEGER, -- 15～64歳人口 男
    t001101012 INTEGER, -- 15～64歳人口 女

    t001101013 INTEGER, -- 18歳以上人口 総数
    t001101014 INTEGER, -- 18歳以上人口 男
    t001101015 INTEGER, -- 18歳以上人口 女

    t001101016 INTEGER, -- 20歳以上人口 総数
    t001101017 INTEGER, -- 20歳以上人口 男
    t001101018 INTEGER, -- 20歳以上人口 女

    t001101019 INTEGER, -- 65歳以上人口 総数
    t001101020 INTEGER, -- 65歳以上人口 男
    t001101021 INTEGER, -- 65歳以上人口 女

    t001101022 INTEGER, -- 75歳以上人口 総数
    t001101023 INTEGER, -- 75歳以上人口 男
    t001101024 INTEGER, -- 75歳以上人口 女

    t001101025 INTEGER, -- 85歳以上人口 総数
    t001101026 INTEGER, -- 85歳以上人口 男
    t001101027 INTEGER, -- 85歳以上人口 女

    t001101028 INTEGER, -- 95歳以上人口 総数
    t001101029 INTEGER, -- 95歳以上人口 男
    t001101030 INTEGER, -- 95歳以上人口 女

    t001101031 INTEGER, -- 外国人人口 総数
    t001101032 INTEGER, -- 外国人人口 男
    t001101033 INTEGER, -- 外国人人口 女

    -- 世帯
    t001101034 INTEGER, -- 世帯総数
    t001101035 INTEGER, -- 一般世帯数

    t001101036 INTEGER, -- 1人世帯数
    t001101037 INTEGER, -- 2人世帯数
    t001101038 INTEGER, -- 3人世帯数
    t001101039 INTEGER, -- 4人世帯数
    t001101040 INTEGER, -- 5人世帯数
    t001101041 INTEGER, -- 6人世帯数
    t001101042 INTEGER, -- 7人以上世帯数

    t001101043 INTEGER, -- 親族のみ世帯数
    t001101044 INTEGER, -- 核家族世帯数
    t001101045 INTEGER, -- 核家族以外世帯数

    t001101046 INTEGER, -- 6歳未満世帯員のいる世帯数
    t001101047 INTEGER, -- 65歳以上世帯員のいる世帯数

    t001101048 INTEGER, -- 世帯主20～29歳の1人世帯
    t001101049 INTEGER, -- 高齢単身世帯
    t001101050 INTEGER  -- 高齢夫婦世帯
);