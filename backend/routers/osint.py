import asyncio
import re
import socket
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

_DOMAIN_RE = re.compile(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$')
_IP_RE = re.compile(r'^(\d{1,3}\.){3}\d{1,3}(/\d{1,2})?$')
_SHELL_CHARS = set(';|&`$(){}[]<>\n\r\\\'\"')

def _clean_domain(v: Optional[str]) -> str:
    if not v:
        return ""
    v = v.strip().lower()
    if not _DOMAIN_RE.match(v):
        raise HTTPException(status_code=400, detail=f"Invalid domain: {v!r}")
    return v

def _clean_ip(v: Optional[str]) -> str:
    if not v:
        return ""
    v = v.strip()
    if not _IP_RE.match(v):
        raise HTTPException(status_code=400, detail=f"Invalid IP: {v!r}")
    return v

def _clean_url(v: Optional[str]) -> str:
    if not v:
        return ""
    v = v.strip()
    if not v.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
    if any(c in v for c in _SHELL_CHARS):
        raise HTTPException(status_code=400, detail="URL contains invalid characters")
    return v

def _clean_email(v: Optional[str]) -> str:
    if not v:
        return ""
    v = v.strip()
    if any(c in v for c in _SHELL_CHARS) or " " in v:
        raise HTTPException(status_code=400, detail="Invalid email")
    return v

def _clean_username(v: Optional[str]) -> str:
    if not v:
        return ""
    v = v.strip()
    if any(c in v for c in _SHELL_CHARS) or " " in v:
        raise HTTPException(status_code=400, detail="Invalid username")
    return v

class OsintRequest(BaseModel):
    module: str
    domain: Optional[str] = None
    ip: Optional[str] = None
    url: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    target_id: Optional[int] = None

async def run_cmd(cmd: list[str], timeout: int = 60) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return stdout.decode(errors="replace")
    except asyncio.TimeoutError:
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass
        return f"[TIMEOUT] Command timed out after {timeout}s"
    except FileNotFoundError:
        return f"[NOT FOUND] Tool '{cmd[0]}' not installed"
    except Exception as e:
        return f"[ERROR] {e}"

@router.post("/run")
async def run_osint(req: OsintRequest):
    module = req.module
    domain = _clean_domain(req.domain)
    ip = _clean_ip(req.ip)
    url = _clean_url(req.url)
    email = _clean_email(req.email)
    username = _clean_username(req.username)

    if module == "whois":
        output = await run_cmd(["whois", domain or ip or ""])
        return {"raw": output, "module": "whois"}

    elif module == "dns":
        results = {}
        for record_type in ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]:
            out = await run_cmd(["dig", "+short", record_type, domain])
            if out.strip():
                results[record_type] = out.strip().split("\n")
        output = "\n".join([f"{k}: {', '.join(v)}" for k, v in results.items()])
        return {"raw": output or "No DNS records found", "summary": results, "module": "dns"}

    elif module == "subdomains":
        import shutil
        output = ""
        if shutil.which("amass"):
            output = await run_cmd(["amass", "enum", "-passive", "-d", domain], timeout=120)
        if not output.strip():
            if shutil.which("subfinder"):
                output = await run_cmd(["subfinder", "-d", domain, "-silent"], timeout=120)
        if not output.strip():
            common = ["www", "mail", "ftp", "api", "dev", "staging", "admin", "vpn", "remote", "test", "app", "blog"]
            found = []
            loop = asyncio.get_running_loop()
            for sub in common:
                try:
                    await loop.run_in_executor(None, socket.gethostbyname, f"{sub}.{domain}")
                    found.append(f"{sub}.{domain}")
                except Exception:
                    pass
            output = "\n".join(found) if found else "No subdomains found (install amass or subfinder for better results)"
        return {"raw": output, "module": "subdomains"}

    elif module == "cert_transparency":
        import urllib.request
        try:
            ct_url = f"https://crt.sh/?q=%.{domain}&output=json"
            def _fetch_ct():
                req_http = urllib.request.Request(ct_url, headers={"User-Agent": "NEXUS/1.0"})
                with urllib.request.urlopen(req_http, timeout=15) as r:
                    return json.loads(r.read())
            loop = asyncio.get_running_loop()
            data = await loop.run_in_executor(None, _fetch_ct)
            names = list({d.get("name_value", "") for d in data[:50]})
            return {"raw": "\n".join(names[:50]), "module": "cert_transparency", "count": len(names)}
        except Exception as e:
            return {"raw": f"crt.sh lookup failed: {e}", "module": "cert_transparency"}

    elif module == "shodan":
        return {"raw": f"Shodan lookup for {ip}\nInstall shodan CLI: pip install shodan\nThen: shodan host {ip}", "module": "shodan"}

    elif module == "reverse_ip":
        output = await run_cmd(["host", ip])
        return {"raw": output, "module": "reverse_ip"}

    elif module == "email_hunt":
        output = await run_cmd(["theHarvester", "-d", domain, "-b", "google,bing,linkedin"], timeout=60)
        return {"raw": output, "module": "email_hunt"}

    elif module == "tech_stack":
        output = await run_cmd(["whatweb", url or f"http://{domain}", "--color=never"])
        return {"raw": output, "module": "tech_stack"}

    elif module == "google_dorks":
        dorks = [
            f'site:{domain} filetype:pdf',
            f'site:{domain} filetype:xls OR filetype:xlsx OR filetype:csv',
            f'site:{domain} inurl:admin OR inurl:login OR inurl:dashboard',
            f'site:{domain} intitle:"index of"',
            f'site:{domain} "password" OR "passwd" OR "credentials"',
            f'site:{domain} filetype:sql OR filetype:db',
            f'site:{domain} inurl:config OR inurl:conf OR inurl:env',
            f'site:{domain} inurl:backup OR inurl:bak',
            f'site:{domain} "api_key" OR "api key" OR "apikey"',
            f'site:{domain} inurl:.git OR inurl:.svn',
            f'"@{domain}" email dump',
            f'site:pastebin.com "{domain}"',
            f'site:github.com "{domain}" password',
        ]
        output = "\n\n".join(dorks)
        return {"raw": output, "module": "google_dorks", "count": len(dorks)}

    elif module == "headers":
        import urllib.request
        target_url = url or f"http://{domain}"
        try:
            def _fetch_headers():
                req_http = urllib.request.Request(target_url, headers={"User-Agent": "NEXUS/1.0"})
                with urllib.request.urlopen(req_http, timeout=10) as r:
                    return dict(r.headers)
            loop = asyncio.get_running_loop()
            headers = await loop.run_in_executor(None, _fetch_headers)
            output = "\n".join([f"{k}: {v}" for k, v in headers.items()])
            return {"raw": output, "summary": headers, "module": "headers"}
        except Exception as e:
            return {"raw": f"Headers lookup failed: {e}", "module": "headers"}

    elif module == "robots":
        import urllib.request
        base = url or f"http://{domain}"
        result = {}
        loop = asyncio.get_running_loop()
        for path in ["/robots.txt", "/sitemap.xml"]:
            try:
                full_url = base.rstrip("/") + path
                def _fetch_robots(u=full_url):
                    req_http = urllib.request.Request(u, headers={"User-Agent": "NEXUS/1.0"})
                    with urllib.request.urlopen(req_http, timeout=10) as r:
                        return r.read().decode(errors="replace")[:2000]
                result[path] = await loop.run_in_executor(None, _fetch_robots)
            except Exception:
                result[path] = "Not found"
        output = "\n\n".join([f"=== {k} ===\n{v}" for k, v in result.items()])
        return {"raw": output, "module": "robots"}

    elif module == "breach_check":
        return {"raw": f"Breach check for {email}\nUse: https://haveibeenpwned.com/api/v3/breachedaccount/{email}\n(Requires API key)", "module": "breach_check"}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown module: {module}")
