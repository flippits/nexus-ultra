from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, Boolean
from datetime import datetime, timezone
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'nexus.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_async_engine(f"sqlite+aiosqlite:///{DB_PATH}", echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def now():
    return datetime.now(timezone.utc)

class Target(Base):
    __tablename__ = "targets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(255))
    domain: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="host")
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
    nodes: Mapped[list["GraphNode"]] = relationship(back_populates="target", cascade="all, delete-orphan")
    findings: Mapped[list["Finding"]] = relationship(back_populates="target", cascade="all, delete-orphan")
    scans: Mapped[list["Scan"]] = relationship(back_populates="target", cascade="all, delete-orphan")

class GraphNode(Base):
    __tablename__ = "graph_nodes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="host")
    label: Mapped[str | None] = mapped_column(String(255))
    value: Mapped[str | None] = mapped_column(String(500))
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)
    properties: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    target: Mapped["Target"] = relationship(back_populates="nodes")
    edges_from: Mapped[list["GraphEdge"]] = relationship("GraphEdge", foreign_keys="GraphEdge.source_id", cascade="all, delete-orphan")
    edges_to: Mapped[list["GraphEdge"]] = relationship("GraphEdge", foreign_keys="GraphEdge.target_id", cascade="all, delete-orphan")

class GraphEdge(Base):
    __tablename__ = "graph_edges"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("graph_nodes.id"), nullable=False)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("graph_nodes.id"), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("targets.id"))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="medium")
    description: Mapped[str | None] = mapped_column(Text)
    evidence: Mapped[str | None] = mapped_column(Text)
    cve: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    target: Mapped["Target | None"] = relationship(back_populates="findings")

class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("targets.id"))
    tool: Mapped[str] = mapped_column(String(100))
    command: Mapped[str | None] = mapped_column(Text)
    output: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="running")
    scan_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    target: Mapped["Target | None"] = relationship(back_populates="scans")

class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target_id: Mapped[int] = mapped_column(Integer, ForeignKey("targets.id"), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with SessionLocal() as session:
        yield session
