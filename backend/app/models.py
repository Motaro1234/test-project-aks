"""
Database tables, defined as plain SQLAlchemy models.

Two tables:
- warehouses: the physical locations
- stock_items: products held at a warehouse, with a quantity
"""

from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    location = Column(String(200), nullable=True)

    stock_items = relationship("StockItem", back_populates="warehouse", cascade="all, delete-orphan")


class StockItem(Base):
    __tablename__ = "stock_items"
    __table_args__ = (
        UniqueConstraint("sku", "warehouse_id", name="uq_sku_per_warehouse"),
    )

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), nullable=False, index=True)
    product_name = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    unit_price = Column(Numeric(10, 2), nullable=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    warehouse = relationship("Warehouse", back_populates="stock_items")
