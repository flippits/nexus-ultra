FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Core system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git vim nano \
    python3 python3-pip python3-dev \
    ruby ruby-dev build-essential \
    net-tools iputils-ping dnsutils \
    ca-certificates gnupg lsb-release \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Recon & scanning
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap masscan nikto \
    amass subfinder \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Web attack tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gobuster ffuf sqlmap dirb \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Brute force & cracking
RUN apt-get update && apt-get install -y --no-install-recommends \
    hydra hashcat john \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# OSINT tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    theharvester exiftool \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Exploitation framework
RUN apt-get update && apt-get install -y --no-install-recommends \
    metasploit-framework \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Exploit database
RUN apt-get update && apt-get install -y --no-install-recommends \
    exploitdb \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Wireless
RUN apt-get update && apt-get install -y --no-install-recommends \
    aircrack-ng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Forensics & reversing
RUN apt-get update && apt-get install -y --no-install-recommends \
    binwalk foremost steghide \
    radare2 gdb ltrace strace \
    file binutils \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Network tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tcpdump tshark socat \
    netcat-traditional ncat \
    proxychains4 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# AD / SMB attack tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    enum4linux smbmap smbclient \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Wordlists
RUN apt-get update && apt-get install -y --no-install-recommends \
    wordlists p7zip-full \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Python security tools — use pipx to avoid breaking system packages
RUN apt-get update && apt-get install -y --no-install-recommends pipx && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/nexus-venv && \
    /opt/nexus-venv/bin/pip install --no-cache-dir \
    impacket pwntools ropper ropgadget volatility3 certipy-ad dnsrecon

# Make venv tools accessible globally
RUN ln -sf /opt/nexus-venv/bin/impacket-* /usr/local/bin/ 2>/dev/null || true && \
    ln -sf /opt/nexus-venv/bin/pwntools /usr/local/bin/ 2>/dev/null || true && \
    ln -sf /opt/nexus-venv/bin/vol /usr/local/bin/vol 2>/dev/null || true

ENV PATH="/opt/nexus-venv/bin:$PATH"

# Install netexec via venv
RUN /opt/nexus-venv/bin/pip install --no-cache-dir netexec 2>/dev/null || \
    /opt/nexus-venv/bin/pip install --no-cache-dir crackmapexec 2>/dev/null || true

# Install zsteg via gem
RUN gem install zsteg --no-document 2>/dev/null || true

# Install evil-winrm
RUN gem install evil-winrm --no-document 2>/dev/null || true

# Install chisel (tunneling tool)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    wget -q "https://github.com/jpillora/chisel/releases/latest/download/chisel_linux_${ARCH}.gz" -O /tmp/chisel.gz && \
    gunzip /tmp/chisel.gz && \
    mv /tmp/chisel /usr/local/bin/chisel && \
    chmod +x /usr/local/bin/chisel || true

# Decompress rockyou
RUN gunzip -k /usr/share/wordlists/rockyou.txt.gz 2>/dev/null || true

# Create nexus directories
RUN mkdir -p /nexus/data/wordlists /nexus/output /nexus/tools

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /nexus
EXPOSE 4444 8080 9090

ENTRYPOINT ["/entrypoint.sh"]
