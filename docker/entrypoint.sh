#!/bin/bash
# NEXUS ULTRA — Kali Linux Container Entrypoint

echo "[NEXUS-KALI] Container starting..."
echo "[NEXUS-KALI] Kali Linux $(cat /etc/os-release | grep VERSION= | cut -d'"' -f2)"

# Start postgresql for Metasploit
service postgresql start 2>/dev/null
sleep 2

# Init MSF database
msfdb init 2>/dev/null &

echo "[NEXUS-KALI] All services ready."
echo "[NEXUS-KALI] Tools available: $(which nmap msfconsole gobuster sqlmap hydra john hashcat 2>/dev/null | wc -l) core tools"

# Keep container alive
exec tail -f /dev/null
