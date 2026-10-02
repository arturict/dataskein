-- DataSkein reproducible recipe
-- Generated locally. Keep the source files beside this SQL file or update the view paths.
-- source: monthly-orders.csv | csv | 157 bytes | sha256 723e528b669ec1a1a233a8b21181b22aecf1e0ca4d99794665ecf5b1f3d6abe2
-- source: region-teams.csv | csv | 54 bytes | sha256 850c661dd64b312f1df19d1169d9de135ace20d5d6dbfc03e4ee10bded6f7a11

CREATE OR REPLACE VIEW "dataset_demo_0" AS SELECT * FROM read_csv_auto('monthly-orders.csv', sample_size = 20480);
CREATE OR REPLACE VIEW "dataset_demo_1" AS SELECT * FROM read_csv_auto('region-teams.csv', sample_size = 20480);

-- Shaped rows
WITH recipe_0 AS (SELECT * FROM "dataset_demo_0"),
recipe_1 AS (SELECT * FROM recipe_0 WHERE "status" = 'paid'),
recipe_2 AS (SELECT base.*, joined."team" AS "region-teams · team" FROM recipe_1 AS base LEFT JOIN "dataset_demo_1" AS joined ON base."region" = joined."region") SELECT * FROM recipe_2;

-- Current chart answer
SELECT CAST("region" AS VARCHAR) AS label, SUM(TRY_CAST("net_revenue" AS DOUBLE)) AS value
FROM (WITH recipe_0 AS (SELECT * FROM "dataset_demo_0"),
recipe_1 AS (SELECT * FROM recipe_0 WHERE "status" = 'paid'),
recipe_2 AS (SELECT base.*, joined."team" AS "region-teams · team" FROM recipe_1 AS base LEFT JOIN "dataset_demo_1" AS joined ON base."region" = joined."region") SELECT * FROM recipe_2) AS chart_source
WHERE "region" IS NOT NULL
GROUP BY "region"
ORDER BY value DESC NULLS LAST
LIMIT 100;
