-- Optional: run this manually if you'd rather create tables by hand
-- instead of using the "Create tables" button / POST /api/init-db.

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    location VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS stock_items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(64) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sku, warehouse_id)
);
