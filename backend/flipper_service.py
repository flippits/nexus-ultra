import serial
import serial.tools.list_ports
import threading
import time
from typing import Optional

FLIPPER_VID = 0x0483
FLIPPER_PID = 0x5740
BAUD = 230400
PROMPT = b">: "


class FlipperService:
    def __init__(self):
        self.port: Optional[str] = None
        self.ser: Optional[serial.Serial] = None
        self.connected = False
        self._lock = threading.Lock()

    def find_port(self) -> Optional[str]:
        for p in serial.tools.list_ports.comports():
            if p.vid == FLIPPER_VID and p.pid == FLIPPER_PID:
                return p.device
        for p in serial.tools.list_ports.comports():
            if "flipper" in (p.description or "").lower():
                return p.device
        for p in serial.tools.list_ports.comports():
            if "usbmodem" in p.device.lower():
                return p.device
        return None

    def list_ports(self):
        return [{"device": p.device, "description": p.description or ""} for p in serial.tools.list_ports.comports()]

    def connect(self, port: Optional[str] = None) -> bool:
        if port is None:
            port = self.find_port()
        if port is None:
            return False
        try:
            self.ser = serial.Serial(port, BAUD, timeout=2)
            self.port = port
            self.connected = True
            time.sleep(0.2)
            self.ser.reset_input_buffer()
            self.ser.write(b"\r\n")
            time.sleep(0.3)
            self.ser.reset_input_buffer()
            return True
        except Exception:
            self.connected = False
            self.ser = None
            return False

    def disconnect(self):
        if self.ser:
            try:
                self.ser.close()
            except Exception:
                pass
        self.ser = None
        self.connected = False
        self.port = None

    def send_command(self, command: str, timeout: float = 8.0) -> str:
        if not self.connected or not self.ser:
            raise RuntimeError("Flipper not connected")
        with self._lock:
            self.ser.reset_input_buffer()
            self.ser.write(f"{command}\r\n".encode())
            buf = b""
            deadline = time.time() + timeout
            while time.time() < deadline:
                waiting = self.ser.in_waiting
                if waiting:
                    buf += self.ser.read(waiting)
                    if PROMPT in buf:
                        break
                else:
                    time.sleep(0.05)
            text = buf.decode("utf-8", errors="replace")
            lines = []
            for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped == command.strip():
                    continue
                if stripped.endswith(">:") or stripped == ">:":
                    continue
                if stripped.startswith(">:"):
                    stripped = stripped[2:].strip()
                    if stripped:
                        lines.append(stripped)
                    continue
                lines.append(stripped)
            return "\n".join(lines).strip()


flipper_service = FlipperService()
