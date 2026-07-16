"""
Pydantic schemas: define the shape of data going in/out of the API.
Keeping these separate from the DB models makes it easy to see exactly
what the API accepts and returns.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal
from datetime import datetime


class WarehouseCreate(BaseModel):
    name: str
    location: Optional[str] = None


class WarehouseOut(WarehouseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class StockItemCreate(BaseModel):
    sku: str
    product_name: str
    quantity: int = 0
    unit_price: Optional[Decimal] = None
    warehouse_id: int


class StockItemUpdate(BaseModel):
    product_name: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[Decimal] = None


class StockItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    product_name: str
    quantity: int
    unit_price: Optional[Decimal]
    warehouse_id: int
    updated_at: Optional[datetime]
