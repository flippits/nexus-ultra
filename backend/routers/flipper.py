import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from flipper_service import flipper_service

router = APIRouter()


def _require_connection():
    if not flipper_service.connected:
        raise HTTPException(status_code=503, detail="Flipper Zero not connected")


async def _cmd(command: str, timeout: float = 8.0) -> str:
    _require_connection()
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, flipper_service.send_command, command, timeout)


# ── Models ────────────────────────────────────────────────────────────────────

class ConnectRequest(BaseModel):
    port: Optional[str] = None

class CommandRequest(BaseModel):
    command: str
    timeout: float = 8.0

class TransmitFileRequest(BaseModel):
    file_path: str

class IRTransmitRequest(BaseModel):
    file_path: str
    signal_name: Optional[str] = None

class GPIOModeRequest(BaseModel):
    pin: str
    mode: str  # INPUT or OUTPUT

class GPIOWriteRequest(BaseModel):
    pin: str
    value: int  # 0 or 1

class LEDRequest(BaseModel):
    color: str = "r"  # r, g, b
    value: int = 255

class BadUSBRequest(BaseModel):
    file_path: str


# ── Connection ────────────────────────────────────────────────────────────────

@router.get("/status")
async def status():
    loop = asyncio.get_running_loop()
    ports = await loop.run_in_executor(None, flipper_service.list_ports)
    detected = await loop.run_in_executor(None, flipper_service.find_port)
    return {
        "connected": flipper_service.connected,
        "port": flipper_service.port,
        "ports": ports,
        "detected": detected,
    }

@router.post("/connect")
async def connect(req: ConnectRequest = ConnectRequest()):
    loop = asyncio.get_running_loop()
    ok = await loop.run_in_executor(None, flipper_service.connect, req.port)
    if not ok:
        raise HTTPException(status_code=503, detail="Could not connect — is the Flipper plugged in?")
    info = await _cmd("info", 5.0)
    return {"status": "connected", "port": flipper_service.port, "info": info}

@router.post("/disconnect")
async def disconnect():
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, flipper_service.disconnect)
    return {"status": "disconnected"}


# ── Raw CLI ───────────────────────────────────────────────────────────────────

@router.post("/command")
async def raw_command(req: CommandRequest):
    output = await _cmd(req.command, req.timeout)
    return {"output": output}


# ── Device info ───────────────────────────────────────────────────────────────

@router.get("/info")
async def device_info():
    output = await _cmd("info", 5.0)
    return {"output": output}


# ── Sub-GHz ───────────────────────────────────────────────────────────────────

@router.post("/subghz/rx")
async def subghz_rx(frequency: str = "433920000"):
    output = await _cmd(f"subghz rx {frequency}", 12.0)
    return {"output": output, "frequency": frequency}

@router.post("/subghz/tx")
async def subghz_tx(req: TransmitFileRequest):
    output = await _cmd(f"subghz tx_from_file {req.file_path}", 15.0)
    return {"output": output}

@router.get("/subghz/files")
async def subghz_files():
    output = await _cmd("storage list /ext/subghz", 5.0)
    return {"output": output}

@router.post("/subghz/freq_analyzer")
async def subghz_freq_analyzer():
    output = await _cmd("subghz freq_analyzer", 15.0)
    return {"output": output}


# ── NFC ───────────────────────────────────────────────────────────────────────

@router.post("/nfc/detect")
async def nfc_detect():
    output = await _cmd("nfc detect", 12.0)
    return {"output": output}

@router.get("/nfc/files")
async def nfc_files():
    output = await _cmd("storage list /ext/nfc", 5.0)
    return {"output": output}


# ── RFID ──────────────────────────────────────────────────────────────────────

@router.post("/rfid/read")
async def rfid_read():
    output = await _cmd("rfid read", 12.0)
    return {"output": output}

@router.get("/rfid/files")
async def rfid_files():
    output = await _cmd("storage list /ext/lfrfid", 5.0)
    return {"output": output}


# ── Infrared ──────────────────────────────────────────────────────────────────

@router.post("/ir/rx")
async def ir_rx():
    output = await _cmd("ir rx", 12.0)
    return {"output": output}

@router.post("/ir/tx")
async def ir_tx(req: IRTransmitRequest):
    cmd = f"ir tx_file {req.file_path}"
    if req.signal_name:
        cmd += f" {req.signal_name}"
    output = await _cmd(cmd, 10.0)
    return {"output": output}

@router.get("/ir/files")
async def ir_files():
    output = await _cmd("storage list /ext/infrared", 5.0)
    return {"output": output}


# ── Bad USB ───────────────────────────────────────────────────────────────────

@router.post("/badusb/run")
async def badusb_run(req: BadUSBRequest):
    output = await _cmd(f"badusb run {req.file_path}", 30.0)
    return {"output": output}

@router.get("/badusb/files")
async def badusb_files():
    output = await _cmd("storage list /ext/badusb", 5.0)
    return {"output": output}


# ── GPIO ──────────────────────────────────────────────────────────────────────

@router.post("/gpio/mode")
async def gpio_mode(req: GPIOModeRequest):
    output = await _cmd(f"gpio mode {req.pin} {req.mode}", 5.0)
    return {"output": output}

@router.post("/gpio/write")
async def gpio_write(req: GPIOWriteRequest):
    output = await _cmd(f"gpio write {req.pin} {req.value}", 5.0)
    return {"output": output}

@router.get("/gpio/read")
async def gpio_read(pin: str):
    output = await _cmd(f"gpio read {pin}", 5.0)
    return {"output": output, "pin": pin}


# ── Storage ───────────────────────────────────────────────────────────────────

@router.get("/storage/list")
async def storage_list(path: str = "/ext"):
    output = await _cmd(f"storage list {path}", 6.0)
    return {"output": output, "path": path}

@router.get("/storage/read")
async def storage_read(path: str):
    output = await _cmd(f"storage read {path}", 10.0)
    return {"output": output, "path": path}


# ── Misc ──────────────────────────────────────────────────────────────────────

@router.post("/led")
async def led(req: LEDRequest):
    output = await _cmd(f"led {req.color} {req.value}", 3.0)
    return {"output": output}

@router.post("/vibro")
async def vibro(state: int = 1):
    output = await _cmd(f"vibro {state}", 3.0)
    return {"output": output}
