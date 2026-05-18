import asyncio
import re
import socket
import subprocess
import shutil
from fastapi import APIRouter

router = APIRouter()

# ── OUI vendor prefix lookup (top ~120 common vendors) ─────────────────────────
_OUI = {
    "00:00:0C": "Cisco", "00:1A:A0": "Dell", "00:50:56": "VMware",
    "00:0C:29": "VMware", "00:15:5D": "Microsoft Hyper-V",
    "08:00:27": "VirtualBox", "52:54:00": "QEMU/KVM",
    "00:1C:42": "Parallels",
    "AC:BC:32": "Apple", "00:03:93": "Apple", "00:0A:27": "Apple",
    "00:0A:95": "Apple", "00:11:24": "Apple", "00:14:51": "Apple",
    "00:16:CB": "Apple", "00:17:F2": "Apple", "00:19:E3": "Apple",
    "00:1B:63": "Apple", "00:1C:B3": "Apple", "00:1D:4F": "Apple",
    "00:1E:52": "Apple", "00:1E:C2": "Apple", "00:1F:5B": "Apple",
    "00:1F:F3": "Apple", "00:21:E9": "Apple", "00:22:41": "Apple",
    "00:23:12": "Apple", "00:23:32": "Apple", "00:23:6C": "Apple",
    "00:23:DF": "Apple", "00:24:36": "Apple", "00:25:00": "Apple",
    "00:25:4B": "Apple", "00:25:BC": "Apple", "00:26:08": "Apple",
    "00:26:B9": "Apple", "00:26:BB": "Apple", "00:30:65": "Apple",
    "00:3E:E1": "Apple", "F0:18:98": "Apple", "F4:F1:5A": "Apple",
    "88:66:5A": "Apple", "DC:A9:04": "Apple", "A4:C3:61": "Apple",
    "00:1A:2B": "Fujitsu", "00:00:F0": "Samsung",
    "00:12:FB": "Samsung", "00:16:32": "Samsung", "00:17:C9": "Samsung",
    "00:1D:25": "Samsung", "00:21:19": "Samsung", "00:23:39": "Samsung",
    "00:26:37": "Samsung", "78:1F:DB": "Samsung", "A0:07:98": "Samsung",
    "10:08:B1": "Samsung", "CC:07:AB": "Samsung",
    "00:E0:4C": "Realtek", "52:54:00": "Realtek",
    "00:00:AA": "Xerox", "00:00:C0": "Western Digital",
    "00:01:42": "Cisco", "00:01:43": "Cisco", "00:01:64": "Cisco",
    "00:01:96": "Cisco", "00:01:97": "Cisco", "00:01:C7": "Cisco",
    "00:02:17": "Cisco", "00:03:6B": "Cisco", "00:04:27": "Cisco",
    "00:04:9A": "Cisco", "00:04:C0": "Cisco", "00:05:31": "Cisco",
    "00:0A:41": "Cisco", "00:0A:42": "Cisco", "00:0A:43": "Cisco",
    "00:0B:45": "Cisco", "00:0B:46": "Cisco", "00:0C:CE": "Cisco",
    "00:1C:57": "Cisco", "00:1C:58": "Cisco", "00:24:C4": "Cisco",
    "B0:AA:77": "Cisco", "E8:BA:70": "Cisco",
    "00:09:0F": "Fortinet", "00:09:5B": "Netgear", "00:14:6C": "Netgear",
    "00:18:4D": "Netgear", "00:1B:2F": "Netgear", "00:1E:2A": "Netgear",
    "00:22:3F": "Netgear", "00:24:B2": "Netgear", "20:4E:7F": "Netgear",
    "A0:21:B7": "Netgear", "C0:3F:0E": "Netgear", "E0:46:9A": "Netgear",
    "00:17:9A": "D-Link", "00:19:5B": "D-Link", "00:1B:11": "D-Link",
    "00:1C:F0": "D-Link", "00:1E:58": "D-Link", "00:21:91": "D-Link",
    "00:22:B0": "D-Link", "00:24:01": "D-Link", "00:26:5A": "D-Link",
    "14:D6:4D": "D-Link", "1C:7E:E5": "D-Link", "28:10:7B": "D-Link",
    "00:13:46": "TP-Link", "00:14:78": "TP-Link", "14:CC:20": "TP-Link",
    "50:C7:BF": "TP-Link", "54:A7:03": "TP-Link", "60:E3:27": "TP-Link",
    "74:DA:38": "TP-Link", "90:F6:52": "TP-Link", "AC:84:C6": "TP-Link",
    "C4:6E:1F": "TP-Link", "E8:DE:27": "TP-Link", "F4:EC:38": "TP-Link",
    "00:0F:66": "Ubiquiti", "00:15:6D": "Ubiquiti", "00:27:22": "Ubiquiti",
    "04:18:D6": "Ubiquiti", "24:A4:3C": "Ubiquiti", "44:D9:E7": "Ubiquiti",
    "68:72:51": "Ubiquiti", "78:8A:20": "Ubiquiti", "80:2A:A8": "Ubiquiti",
    "B4:FB:E4": "Ubiquiti", "DC:9F:DB": "Ubiquiti", "F0:9F:C2": "Ubiquiti",
    "00:1D:7E": "Linksys", "00:21:29": "Linksys", "00:23:69": "Linksys",
    "C0:C1:C0": "Linksys", "00:18:E7": "ASUSTek", "00:1A:92": "ASUSTek",
    "00:1D:60": "ASUSTek", "00:22:15": "ASUSTek", "00:26:18": "ASUSTek",
    "10:BF:48": "ASUSTek", "14:DA:E9": "ASUSTek", "2C:FD:A1": "ASUSTek",
    "30:85:A9": "ASUSTek", "50:46:5D": "ASUSTek", "6C:F0:49": "ASUSTek",
    "AC:22:0B": "ASUSTek", "BC:EE:7B": "ASUSTek", "F8:32:E4": "ASUSTek",
    "00:17:88": "Philips Hue", "EC:B5:FA": "Espressif/IoT",
    "24:0A:C4": "Espressif/IoT", "30:AE:A4": "Espressif/IoT",
    "3C:61:05": "Espressif/IoT", "84:CC:A8": "Espressif/IoT",
    "A4:CF:12": "Espressif/IoT", "AC:67:B2": "Espressif/IoT",
    "BC:DD:C2": "Espressif/IoT", "FC:F5:C4": "Espressif/IoT",
    "00:1A:11": "Google", "08:9E:08": "Google", "20:DF:B9": "Google",
    "54:60:09": "Google", "6C:AD:F8": "Google", "94:EB:2C": "Google",
    "A4:77:33": "Google", "F4:F5:D8": "Google",
    "00:17:FA": "Xbox/Microsoft", "00:22:48": "Xbox/Microsoft",
    "28:18:78": "Xbox/Microsoft", "30:59:B7": "Xbox/Microsoft",
    "58:82:A8": "Xbox/Microsoft", "60:45:BD": "Xbox/Microsoft",
    "98:5F:D3": "Xbox/Microsoft",
    "18:B4:30": "Nest", "64:16:66": "Nest",
    "00:18:DD": "Amazon", "00:FC:8B": "Amazon", "34:D2:70": "Amazon",
    "40:B4:CD": "Amazon", "44:65:0D": "Amazon", "50:F5:DA": "Amazon",
    "68:37:E9": "Amazon", "74:75:48": "Amazon", "84:D6:D0": "Amazon",
    "A0:02:DC": "Amazon", "B4:7C:9C": "Amazon", "CC:9E:A2": "Amazon",
    "F0:D2:F1": "Amazon", "FC:A1:83": "Amazon",
    "10:68:3F": "Raspberry Pi", "28:CD:C1": "Raspberry Pi",
    "B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi",
    "E4:5F:01": "Raspberry Pi",
}

def _vendor(mac: str) -> str:
    if not mac:
        return "Unknown"
    prefix = mac[:8].upper()
    if prefix in _OUI:
        return _OUI[prefix]
    prefix6 = mac[:6].upper().replace(":", "")
    formatted = f"{prefix6[:2]}:{prefix6[2:4]}:{prefix6[4:6]}"
    return _OUI.get(formatted, "Unknown")


async def _run(cmd: list[str], timeout: int = 15) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode(errors="replace")
    except asyncio.TimeoutError:
        try: proc.kill(); await proc.wait()
        except Exception: pass
        return ""
    except Exception:
        return ""


async def _get_wifi_info() -> dict:
    airport = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
    info = {}
    if shutil.which("airport") or __import__("os").path.exists(airport):
        cmd = airport if __import__("os").path.exists(airport) else "airport"
        out = await _run([cmd, "-I"])
        for line in out.splitlines():
            line = line.strip()
            if ": " in line:
                k, v = line.split(": ", 1)
                k = k.strip(); v = v.strip()
                info[k] = v
        return {
            "ssid":     info.get("SSID", ""),
            "bssid":    info.get("BSSID", ""),
            "channel":  info.get("channel", ""),
            "rssi":     info.get("agrCtlRSSI", ""),
            "noise":    info.get("agrCtlNoise", ""),
            "rate":     info.get("lastTxRate", ""),
            "security": info.get("link auth", ""),
            "state":    info.get("state", ""),
        }

    # Linux fallback: iwgetid
    if shutil.which("iwgetid"):
        ssid_out  = await _run(["iwgetid", "-r"])
        bssid_out = await _run(["iwgetid", "-a", "-r"])
        return {"ssid": ssid_out.strip(), "bssid": bssid_out.strip()}

    return {}


async def _get_interfaces() -> list[dict]:
    interfaces = []
    out = await _run(["ifconfig", "-a"])
    current = None
    for line in out.splitlines():
        # New interface block
        iface_match = re.match(r'^(\S+):', line)
        if iface_match:
            if current:
                interfaces.append(current)
            name = iface_match.group(1)
            current = {"name": name, "ip": "", "mask": "", "mac": "", "ipv6": "", "status": "down"}
            if "RUNNING" in line or "UP" in line:
                current["status"] = "up"
        if not current:
            continue
        # MAC
        mac_m = re.search(r'ether\s+([0-9a-f:]{17})', line, re.I)
        if mac_m:
            current["mac"] = mac_m.group(1)
        # IPv4
        ip_m = re.search(r'inet\s+([\d.]+)\s+netmask\s+(0x[0-9a-f]+|[\d.]+)', line, re.I)
        if ip_m:
            current["ip"] = ip_m.group(1)
            mask_raw = ip_m.group(2)
            if mask_raw.startswith("0x"):
                n = int(mask_raw, 16)
                current["mask"] = ".".join(str((n >> (24 - i * 8)) & 0xFF) for i in range(4))
            else:
                current["mask"] = mask_raw
        # IPv6
        ip6_m = re.search(r'inet6\s+([\w:]+)', line)
        if ip6_m and not ip6_m.group(1).startswith("fe80"):
            current["ipv6"] = ip6_m.group(1)
    if current:
        interfaces.append(current)

    return [i for i in interfaces if i["ip"] and i["name"] not in ("lo", "lo0")]


def _mask_to_prefix(mask: str) -> int:
    try:
        return sum(bin(int(x)).count('1') for x in mask.split('.'))
    except Exception:
        return 24


def _ip_to_cidr(ip: str, mask: str) -> str:
    try:
        parts = ip.split('.')
        mask_parts = mask.split('.')
        net = '.'.join(str(int(parts[i]) & int(mask_parts[i])) for i in range(4))
        return f"{net}/{_mask_to_prefix(mask)}"
    except Exception:
        return f"{ip}/24"


async def _resolve_hostname(ip: str) -> str:
    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, socket.gethostbyaddr, ip),
            timeout=2.0
        )
        return result[0]
    except Exception:
        return ""


async def _parse_arp_table() -> list[dict]:
    out = await _run(["arp", "-a"])
    hosts = {}
    for line in out.splitlines():
        # macOS/BSD: ? (192.168.1.1) at aa:bb:cc:dd:ee:ff on en0 ifscope [ethernet]
        # Linux:     192.168.1.1 ether aa:bb:cc:dd:ee:ff C en0
        m = re.search(r'[\?\s]?\(?([\d.]+)\)?\s+at\s+([0-9a-f:]{17})', line, re.I)
        if not m:
            m = re.search(r'([\d.]+)\s+\w+\s+([0-9a-f:]{17})', line, re.I)
        if m:
            ip, mac = m.group(1), m.group(2).lower()
            if mac != "ff:ff:ff:ff:ff:ff" and not mac.startswith("00:00:00"):
                # grab interface name
                iface_m = re.search(r'on\s+(\S+)', line) or re.search(r'([a-z]+\d+)$', line)
                iface = iface_m.group(1).rstrip(']') if iface_m else ""
                hosts[ip] = {"ip": ip, "mac": mac, "interface": iface}
    return list(hosts.values())


async def _nmap_scan(cidr: str) -> list[dict]:
    if not shutil.which("nmap"):
        return []
    out = await _run(["nmap", "-sn", "--open", "-T4", cidr], timeout=60)
    hosts = []
    current_ip = current_host = current_mac = ""
    for line in out.splitlines():
        ip_m = re.search(r'Nmap scan report for (.+)', line)
        if ip_m:
            if current_ip:
                hosts.append({"ip": current_ip, "hostname": current_host, "mac": current_mac})
            val = ip_m.group(1).strip()
            # "hostname (IP)" or just "IP"
            h_m = re.match(r'(.+)\s+\(([\d.]+)\)', val)
            if h_m:
                current_host = h_m.group(1)
                current_ip   = h_m.group(2)
            else:
                current_ip   = val
                current_host = ""
            current_mac = ""
        mac_m = re.search(r'MAC Address:\s+([0-9A-F:]{17})\s*\(([^)]*)\)', line, re.I)
        if mac_m:
            current_mac = mac_m.group(1).lower()
    if current_ip:
        hosts.append({"ip": current_ip, "hostname": current_host, "mac": current_mac})
    return hosts


@router.get("/info")
async def get_network_info():
    wifi_task  = asyncio.create_task(_get_wifi_info())
    iface_task = asyncio.create_task(_get_interfaces())
    wifi, interfaces = await asyncio.gather(wifi_task, iface_task)
    for iface in interfaces:
        if iface["ip"]:
            iface["cidr"] = _ip_to_cidr(iface["ip"], iface["mask"])
            iface["vendor"] = _vendor(iface["mac"])
    return {"wifi": wifi, "interfaces": interfaces}


@router.get("/arp")
async def get_arp_table():
    hosts = await _parse_arp_table()
    # resolve hostnames concurrently (cap at 2s each)
    async def enrich(h):
        h["hostname"] = await _resolve_hostname(h["ip"])
        h["vendor"]   = _vendor(h["mac"])
        return h
    results = await asyncio.gather(*[enrich(h) for h in hosts])
    return {"hosts": sorted(results, key=lambda x: list(map(int, x["ip"].split('.'))))}


@router.post("/scan")
async def scan_network(body: dict = {}):
    cidr = body.get("cidr", "")
    interfaces = await _get_interfaces()

    if not cidr and interfaces:
        # pick the first non-loopback interface with an IP
        for iface in interfaces:
            if iface["ip"] and iface["mask"]:
                cidr = _ip_to_cidr(iface["ip"], iface["mask"])
                break

    if not cidr:
        return {"hosts": [], "cidr": "", "error": "Could not determine network range"}

    arp_task  = asyncio.create_task(_parse_arp_table())
    nmap_task = asyncio.create_task(_nmap_scan(cidr))
    arp_hosts, nmap_hosts = await asyncio.gather(arp_task, nmap_task)

    # merge: nmap is authoritative for hostnames, arp fills in MACs
    merged: dict[str, dict] = {}
    for h in arp_hosts:
        merged[h["ip"]] = {"ip": h["ip"], "mac": h["mac"], "hostname": "", "interface": h.get("interface", ""), "vendor": _vendor(h["mac"]), "source": "arp"}
    for h in nmap_hosts:
        if h["ip"] in merged:
            merged[h["ip"]]["hostname"] = h.get("hostname", "")
            if h.get("mac"):
                merged[h["ip"]]["mac"] = h["mac"]
                merged[h["ip"]]["vendor"] = _vendor(h["mac"])
            merged[h["ip"]]["source"] = "arp+nmap"
        else:
            merged[h["ip"]] = {
                "ip": h["ip"], "mac": h.get("mac", ""), "hostname": h.get("hostname", ""),
                "interface": "", "vendor": _vendor(h.get("mac", "")), "source": "nmap"
            }

    # resolve any missing hostnames (from arp-only entries)
    async def resolve_missing(h):
        if not h["hostname"]:
            h["hostname"] = await _resolve_hostname(h["ip"])
        return h

    hosts = await asyncio.gather(*[resolve_missing(h) for h in merged.values()])
    hosts = sorted(hosts, key=lambda x: list(map(int, x["ip"].split('.'))))
    return {"hosts": hosts, "cidr": cidr, "count": len(hosts)}
