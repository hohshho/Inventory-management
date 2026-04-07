ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS category_level1 varchar(255);
UPDATE items SET category_level1 = '' WHERE category_level1 IS NULL;
ALTER TABLE IF EXISTS items ALTER COLUMN category_level1 SET DEFAULT '';
ALTER TABLE IF EXISTS items ALTER COLUMN category_level1 SET NOT NULL;

ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS category_level2 varchar(255);
UPDATE items SET category_level2 = '' WHERE category_level2 IS NULL;
ALTER TABLE IF EXISTS items ALTER COLUMN category_level2 SET DEFAULT '';
ALTER TABLE IF EXISTS items ALTER COLUMN category_level2 SET NOT NULL;

ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS category_level3 varchar(255);
UPDATE items SET category_level3 = '' WHERE category_level3 IS NULL;
ALTER TABLE IF EXISTS items ALTER COLUMN category_level3 SET DEFAULT '';
ALTER TABLE IF EXISTS items ALTER COLUMN category_level3 SET NOT NULL;

ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS size varchar(255);
UPDATE items SET size = '' WHERE size IS NULL;
ALTER TABLE IF EXISTS items ALTER COLUMN size SET DEFAULT '';
ALTER TABLE IF EXISTS items ALTER COLUMN size SET NOT NULL;

ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS custom_fields_json varchar(4000);
UPDATE items SET custom_fields_json = '[]' WHERE custom_fields_json IS NULL;
ALTER TABLE IF EXISTS items ALTER COLUMN custom_fields_json SET DEFAULT '[]';
ALTER TABLE IF EXISTS items ALTER COLUMN custom_fields_json SET NOT NULL;
