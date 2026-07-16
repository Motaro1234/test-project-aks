"""
Warehouse Stock API

Run with:
    uvicorn app.main:app --reload

Then open http://localhost:8000 for the test UI,
or http://localhost:8000/docs for interactive API docs.
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional

from . import models, schemas
from .database import engine, get_db, Base

app = FastAPI(title="Warehouse Stock API")

# Allow the local frontend (or any origin, for local testing) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Connection test ----------

@app.get("/api/db-test")
def db_test(db: Session = Depends(get_db)):
    """Simple endpoint to prove the app can reach PostgreSQL."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Connected to PostgreSQL successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")


@app.post("/api/init-db")
def init_db():
    """Creates the tables if they don't exist yet. Safe to call more than once."""
    try:
        Base.metadata.create_all(bind=engine)
        return {"status": "ok", "message": "Tables created (or already existed)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create tables: {e}")


# ---------- Warehouses ----------

@app.post("/api/warehouses", response_model=schemas.WarehouseOut)
def create_warehouse(warehouse: schemas.WarehouseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Warehouse).filter(models.Warehouse.name == warehouse.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A warehouse with this name already exists.")
    db_warehouse = models.Warehouse(**warehouse.model_dump())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse


@app.get("/api/warehouses", response_model=List[schemas.WarehouseOut])
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(models.Warehouse).order_by(models.Warehouse.name).all()


@app.delete("/api/warehouses/{warehouse_id}")
def delete_warehouse(warehouse_id: int, db: Session = Depends(get_db)):
    warehouse = db.query(models.Warehouse).get(warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    db.delete(warehouse)
    db.commit()
    return {"status": "ok"}


# ---------- Stock items ----------

@app.post("/api/stock", response_model=schemas.StockItemOut)
def create_stock_item(item: schemas.StockItemCreate, db: Session = Depends(get_db)):
    warehouse = db.query(models.Warehouse).get(item.warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    db_item = models.StockItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.get("/api/stock", response_model=List[schemas.StockItemOut])
def list_stock_items(warehouse_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.StockItem)
    if warehouse_id is not None:
        query = query.filter(models.StockItem.warehouse_id == warehouse_id)
    return query.order_by(models.StockItem.product_name).all()


@app.patch("/api/stock/{item_id}", response_model=schemas.StockItemOut)
def update_stock_item(item_id: int, item: schemas.StockItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.StockItem).get(item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Stock item not found.")
    for field, value in item.model_dump(exclude_unset=True).items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item


@app.delete("/api/stock/{item_id}")
def delete_stock_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.StockItem).get(item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Stock item not found.")
    db.delete(db_item)
    db.commit()
    return {"status": "ok"}


# ---------- Stock calculation ----------

@app.get("/api/stock/summary")
def stock_summary(db: Session = Depends(get_db)):
    """
    Total quantity and total value, grouped by warehouse.
    This is the 'calculate stock' part of the app.
    """
    rows = (
        db.query(
            models.Warehouse.id,
            models.Warehouse.name,
            func.coalesce(func.sum(models.StockItem.quantity), 0).label("total_quantity"),
            func.coalesce(func.sum(models.StockItem.quantity * models.StockItem.unit_price), 0).label("total_value"),
        )
        .outerjoin(models.StockItem, models.StockItem.warehouse_id == models.Warehouse.id)
        .group_by(models.Warehouse.id, models.Warehouse.name)
        .order_by(models.Warehouse.name)
        .all()
    )
    return [
        {
            "warehouse_id": r.id,
            "warehouse_name": r.name,
            "total_quantity": int(r.total_quantity),
            "total_value": float(r.total_value),
        }
        for r in rows
    ]


# ---------- Static frontend ----------
# Serves static/index.html at "/" so you can test everything from the browser.
app.mount("/", StaticFiles(directory="static", html=True), name="static")
