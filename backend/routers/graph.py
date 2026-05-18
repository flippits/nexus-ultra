from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, GraphNode, GraphEdge, Target

router = APIRouter()

class NodeCreate(BaseModel):
    type: str = "host"
    label: Optional[str] = None
    value: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    properties: Optional[str] = None

class EdgeCreate(BaseModel):
    source_id: int
    target_id: int
    label: Optional[str] = None

def node_dict(n: GraphNode):
    return {
        "id": n.id,
        "target_id": n.target_id,
        "type": n.type,
        "label": n.label,
        "value": n.value,
        "x": n.x,
        "y": n.y,
        "properties": n.properties,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }

def edge_dict(e: GraphEdge):
    return {
        "id": e.id,
        "source_id": e.source_id,
        "target_id": e.target_id,
        "label": e.label,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }

@router.get("/{target_id}")
async def get_graph(target_id: int, db: AsyncSession = Depends(get_db)):
    nodes_res = await db.execute(select(GraphNode).where(GraphNode.target_id == target_id))
    nodes = nodes_res.scalars().all()
    node_ids = {n.id for n in nodes}
    edges_res = await db.execute(
        select(GraphEdge).where(
            GraphEdge.source_id.in_(node_ids)
        )
    )
    edges = edges_res.scalars().all()
    return {
        "nodes": [node_dict(n) for n in nodes],
        "edges": [edge_dict(e) for e in edges]
    }

@router.post("/{target_id}/node")
async def add_node(target_id: int, data: NodeCreate, db: AsyncSession = Depends(get_db)):
    t = await db.get(Target, target_id)
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")
    node = GraphNode(target_id=target_id, **data.model_dump())
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node_dict(node)

@router.post("/{target_id}/edge")
async def add_edge(target_id: int, data: EdgeCreate, db: AsyncSession = Depends(get_db)):
    src = await db.get(GraphNode, data.source_id)
    tgt = await db.get(GraphNode, data.target_id)
    if not src or src.target_id != target_id or not tgt or tgt.target_id != target_id:
        raise HTTPException(status_code=400, detail="Source and target nodes must belong to this target")
    edge = GraphEdge(**data.model_dump())
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return edge_dict(edge)

@router.delete("/node/{node_id}")
async def delete_node(node_id: int, db: AsyncSession = Depends(get_db)):
    node = await db.get(GraphNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    await db.delete(node)
    await db.commit()
    return {"ok": True}
