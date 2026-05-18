# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for NEXUS ULTRA backend
# Produces a single-folder bundle: dist/nexus_backend/

import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[str(Path('.'))] ,
    binaries=[],
    datas=[
        ('routers', 'routers'),
        ('requirements.txt', '.'),
    ],
    hiddenimports=[
        # FastAPI / Starlette internals
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.logging',
        'starlette.routing',
        'starlette.middleware.cors',
        'starlette.middleware.gzip',
        # SQLAlchemy dialects
        'sqlalchemy.dialects.sqlite',
        'aiosqlite',
        # pydantic v2
        'pydantic.deprecated.class_validators',
        'pydantic.deprecated.config',
        'pydantic.deprecated.tools',
        # other
        'python_multipart',
        'dns.resolver',
        'whois',
        'bs4',
        'httpx',
        'openai',
        'anthropic',
        'ollama',
        'dotenv',
        'jinja2',
        'weasyprint',
        'serial',
    ],
    excludes=[
        'chromadb',
        'torch',
        'tensorflow',
        'cv2',
        'PIL',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'sklearn',
        'tkinter',
        '_tkinter',
        'wx',
        'PyQt5',
        'PyQt6',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='nexus_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='nexus_backend',
)
