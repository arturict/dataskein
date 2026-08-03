-- Provenance for catalog.duckdb.
-- Generated with DuckDB 1.4.3 and checkpointed before the connection closed.
CREATE TABLE orders AS
SELECT
  i AS order_id,
  ['North', 'South', 'East', 'West'][(i % 4) + 1] AS region,
  CAST((i % 1000) * 1.25 AS DECIMAL(12, 2)) AS revenue,
  DATE '2026-01-01' + CAST(i % 90 AS INTEGER) AS ordered_at
FROM range(1, 100001) AS source(i);

CREATE SCHEMA analytics;
CREATE TABLE analytics.targets(region VARCHAR, target INTEGER);
INSERT INTO analytics.targets VALUES
  ('North', 5000),
  ('South', 4500),
  ('East', 5200),
  ('West', 4700);

CREATE VIEW order_summary AS
SELECT region, COUNT(*) AS order_count
FROM orders
GROUP BY region;

CHECKPOINT;
