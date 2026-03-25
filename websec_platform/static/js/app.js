/* WebSec Platform — main application JS */
'use strict';

// ── Config from server ───────────────────────────────────────────────────────
const CFG = window.WEBSEC_CONFIG || { hasApiKey: false, apiBase: '/api' };

// ── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  { id:'nmap',    name:'Nmap',       desc:'Port & service scan',      cmd:'nmap -sV -sC -oN nmap_{{target}}.txt {{target}}' },
  { id:'zap',     name:'OWASP ZAP',  desc:'DAST / web scanner',       cmd:'zap-cli quick-scan --self-contained -s xss,sqli --spider -r {{target}}' },
  { id:'nikto',   name:'Nikto',      desc:'Web server scanner',       cmd:'nikto -h {{target}} -output nikto_{{target}}.txt' },
  { id:'sqlmap',  name:'SQLMap',     desc:'SQL injection tester',     cmd:'sqlmap -u "{{target}}/login" --forms --crawl=3 --batch' },
  { id:'gobust',  name:'Gobuster',   desc:'Dir/file enumeration',     cmd:'gobuster dir -u {{target}} -w /usr/share/wordlists/dirb/common.txt -o gobuster_out.txt' },
  { id:'sslscan', name:'SSLScan',    desc:'TLS/SSL analysis',         cmd:'sslscan --no-colour {{target}} > sslscan_out.txt' },
  { id:'burp',    name:'Burp Suite', desc:'Manual proxy / active',    cmd:'# Launch Burp Suite → Proxy → Intercept target traffic' },
  { id:'wpscan',  name:'WPScan',     desc:'WordPress scanner',        cmd:'wpscan --url {{target}} --enumerate vp,vt,u --api-token $WP_API' },
  { id:'sublist', name:'Subfinder',  desc:'Subdomain discovery',      cmd:'subfinder -d {{target}} -o subdomains.txt' },
  { id:'nuclei',  name:'Nuclei',     desc:'Vulnerability templates',  cmd:'nuclei -u {{target}} -t ~/nuclei-templates/ -o nuclei_out.txt' },
  { id:'hydra',   name:'Hydra',      desc:'Auth brute-force',         cmd:'hydra -L users.txt -P pass.txt {{target}} http-post-form "/login:user=^USER^&pass=^PASS^:F=incorrect"' },
  { id:'ffuf',    name:'FFUF',       desc:'Web fuzzer',               cmd:'ffuf -w wordlist.txt -u {{target}}/FUZZ -o ffuf_out.json' },
];

const TOOL_OS = {
  nmap:    { kali:{i:'sudo apt-get install -y nmap',u:'sudo apt-get install --only-upgrade -y nmap',v:'nmap --version | head -1'},ubuntu:{i:'sudo apt-get install -y nmap',u:'sudo apt-get install --only-upgrade -y nmap',v:'nmap --version | head -1'},mac:{i:'brew install nmap',u:'brew upgrade nmap',v:'nmap --version | head -1'},arch:{i:'sudo pacman -S --noconfirm nmap',u:'sudo pacman -Syu --noconfirm nmap',v:'nmap --version | head -1'}, bin:'nmap', type:'pkg' },
  zap:     { kali:{i:'sudo apt-get install -y zaproxy',u:'sudo apt-get install --only-upgrade -y zaproxy',v:'zap.sh -version 2>/dev/null || echo "ZAP installed"'},ubuntu:{i:'sudo snap install zaproxy --classic',u:'sudo snap refresh zaproxy',v:'echo "ZAP installed via snap"'},mac:{i:'brew install --cask owasp-zap',u:'brew upgrade --cask owasp-zap',v:'echo "ZAP installed"'},arch:{i:'yay -S zaproxy --noconfirm',u:'yay -Syu zaproxy --noconfirm',v:'echo "ZAP installed"'}, bin:'zaproxy', type:'pkg', note:'Also available at https://www.zaproxy.org/download/' },
  nikto:   { kali:{i:'sudo apt-get install -y nikto',u:'sudo apt-get install --only-upgrade -y nikto',v:'nikto -Version 2>&1 | head -2'},ubuntu:{i:'sudo apt-get install -y nikto',u:'sudo apt-get install --only-upgrade -y nikto',v:'nikto -Version 2>&1 | head -2'},mac:{i:'brew install nikto',u:'brew upgrade nikto',v:'nikto -Version 2>&1 | head -2'},arch:{i:'sudo pacman -S --noconfirm nikto',u:'sudo pacman -Syu --noconfirm nikto',v:'nikto -Version 2>&1 | head -2'}, bin:'nikto', type:'pkg' },
  sqlmap:  { kali:{i:'sudo apt-get install -y sqlmap',u:'sudo apt-get install --only-upgrade -y sqlmap',v:'sqlmap --version'},ubuntu:{i:'sudo apt-get install -y sqlmap',u:'sudo apt-get install --only-upgrade -y sqlmap',v:'sqlmap --version'},mac:{i:'brew install sqlmap',u:'brew upgrade sqlmap',v:'sqlmap --version'},arch:{i:'sudo pacman -S --noconfirm sqlmap',u:'sudo pacman -Syu --noconfirm sqlmap',v:'sqlmap --version'}, bin:'sqlmap', type:'pkg' },
  gobust:  { kali:{i:'sudo apt-get install -y gobuster',u:'sudo apt-get install --only-upgrade -y gobuster',v:'gobuster version'},ubuntu:{i:'go install github.com/OJ/gobuster/v3@latest && sudo cp ~/go/bin/gobuster /usr/local/bin/',u:'go install github.com/OJ/gobuster/v3@latest && sudo cp ~/go/bin/gobuster /usr/local/bin/',v:'gobuster version'},mac:{i:'brew install gobuster',u:'brew upgrade gobuster',v:'gobuster version'},arch:{i:'go install github.com/OJ/gobuster/v3@latest && sudo cp ~/go/bin/gobuster /usr/local/bin/',u:'go install github.com/OJ/gobuster/v3@latest && sudo cp ~/go/bin/gobuster /usr/local/bin/',v:'gobuster version'}, bin:'gobuster', type:'go' },
  sslscan: { kali:{i:'sudo apt-get install -y sslscan',u:'sudo apt-get install --only-upgrade -y sslscan',v:'sslscan --version'},ubuntu:{i:'sudo apt-get install -y sslscan',u:'sudo apt-get install --only-upgrade -y sslscan',v:'sslscan --version'},mac:{i:'brew install sslscan',u:'brew upgrade sslscan',v:'sslscan --version'},arch:{i:'sudo pacman -S --noconfirm sslscan',u:'sudo pacman -Syu --noconfirm sslscan',v:'sslscan --version'}, bin:'sslscan', type:'pkg' },
  burp:    { kali:{i:'sudo apt-get install -y burpsuite\n  # Pro: download from https://portswigger.net/burp/releases',u:'sudo apt-get install --only-upgrade -y burpsuite',v:'echo "Burp Suite installed"'},ubuntu:{i:'sudo apt-get install -y burpsuite',u:'sudo apt-get install --only-upgrade -y burpsuite',v:'echo "Burp Suite installed"'},mac:{i:'brew install --cask burp-suite',u:'brew upgrade --cask burp-suite',v:'echo "Burp Suite installed"'},arch:{i:'yay -S burpsuite --noconfirm',u:'yay -Syu burpsuite --noconfirm',v:'echo "Burp Suite installed"'}, bin:'burpsuite', type:'manual', note:'Pro license for full scanner: https://portswigger.net/burp/pro' },
  wpscan:  { kali:{i:'sudo apt-get install -y wpscan',u:'sudo apt-get install --only-upgrade -y wpscan && wpscan --update',v:'wpscan --version'},ubuntu:{i:'sudo gem install wpscan',u:'sudo gem update wpscan',v:'wpscan --version'},mac:{i:'brew install wpscan',u:'brew upgrade wpscan',v:'wpscan --version'},arch:{i:'sudo gem install wpscan',u:'sudo gem update wpscan',v:'wpscan --version'}, bin:'wpscan', type:'gem', note:'Free API token at https://wpscan.com/api/' },
  sublist: { kali:{i:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',u:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',v:'subfinder -version'},ubuntu:{i:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',u:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',v:'subfinder -version'},mac:{i:'brew install subfinder',u:'brew upgrade subfinder',v:'subfinder -version'},arch:{i:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',u:'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && sudo cp ~/go/bin/subfinder /usr/local/bin/',v:'subfinder -version'}, bin:'subfinder', type:'go' },
  nuclei:  { kali:{i:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',u:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',v:'nuclei -version'},ubuntu:{i:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',u:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',v:'nuclei -version'},mac:{i:'brew install nuclei',u:'brew upgrade nuclei',v:'nuclei -version'},arch:{i:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',u:'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && sudo cp ~/go/bin/nuclei /usr/local/bin/',v:'nuclei -version'}, bin:'nuclei', type:'go' },
  hydra:   { kali:{i:'sudo apt-get install -y hydra',u:'sudo apt-get install --only-upgrade -y hydra',v:'hydra -h 2>&1 | head -2'},ubuntu:{i:'sudo apt-get install -y hydra',u:'sudo apt-get install --only-upgrade -y hydra',v:'hydra -h 2>&1 | head -2'},mac:{i:'brew install hydra',u:'brew upgrade hydra',v:'hydra -h 2>&1 | head -2'},arch:{i:'sudo pacman -S --noconfirm hydra',u:'sudo pacman -Syu --noconfirm hydra',v:'hydra -h 2>&1 | head -2'}, bin:'hydra', type:'pkg' },
  ffuf:    { kali:{i:'sudo apt-get install -y ffuf',u:'sudo apt-get install --only-upgrade -y ffuf',v:'ffuf -V'},ubuntu:{i:'go install github.com/ffuf/ffuf/v2@latest && sudo cp ~/go/bin/ffuf /usr/local/bin/',u:'go install github.com/ffuf/ffuf/v2@latest && sudo cp ~/go/bin/ffuf /usr/local/bin/',v:'ffuf -V'},mac:{i:'brew install ffuf',u:'brew upgrade ffuf',v:'ffuf -V'},arch:{i:'go install github.com/ffuf/ffuf/v2@latest && sudo cp ~/go/bin/ffuf /usr/local/bin/',u:'go install github.com/ffuf/ffuf/v2@latest && sudo cp ~/go/bin/ffuf /usr/local/bin/',v:'ffuf -V'}, bin:'ffuf', type:'go' },
};

const OS_NOTES = {
  kali:   'Kali Linux — most tools are pre-installed; script will verify and update each one.',
  ubuntu: 'Ubuntu / Debian — uses apt, snap, gem, and Go toolchain as needed.',
  mac:    'macOS — uses Homebrew for all packages. Homebrew must be installed first.',
  arch:   'Arch / BlackArch — uses pacman and Go toolchain.',
};

const CHECKLIST = [
  { code:'A01', color:'#E24B4A', label:'Broken Access Control', items:['Test horizontal privilege escalation (IDOR)','Test vertical privilege escalation (low → admin)','Verify insecure direct object refs in APIs','Check missing function-level access control','Test CORS misconfigurations (wildcard + credentials)','Verify JWT validation server-side (alg:none, RS→HS)']},
  { code:'A02', color:'#EF9F27', label:'Cryptographic Failures', items:['Scan TLS/SSL config (TLS 1.0/1.1, weak ciphers)','Check for sensitive data over HTTP','Inspect cookies: Secure, HttpOnly, SameSite','Verify password hashing (bcrypt / Argon2)','Test for secrets in logs, error messages, JS source','Check for API keys exposed in client-side code']},
  { code:'A03', color:'#D85A30', label:'Injection', items:['SQL injection — all inputs (manual + SQLMap)','NoSQL injection (MongoDB, Elasticsearch operators)','OS command injection in file upload / system calls','LDAP injection in authentication flows','XSS: reflected, stored, DOM-based','XML / XXE injection (if XML parsing used)','Template injection (SSTI) in user-controlled data']},
  { code:'A04', color:'#534AB7', label:'Insecure Design', items:['Rate limiting on auth and sensitive endpoints','Business logic flaws (negative qty, skip payment)','Mass assignment in REST APIs','Anti-automation controls (CAPTCHA, rate-limit)','Account enumeration via timing / error differences']},
  { code:'A05', color:'#185FA5', label:'Security Misconfiguration', items:['Default credentials on admin panels / dev tools','Exposed debug endpoints (/debug, /actuator)','HTTP security headers (CSP, HSTS, X-Frame-Options)','Directory listing enabled on web server','Stack traces / version info in error messages','Cloud storage bucket permissions (S3, GCS)']},
  { code:'A06', color:'#639922', label:'Vulnerable Components', items:['Frontend JS lib versions (Retire.js, npm audit)','Server-side framework versions from headers/errors','Cross-reference versions against CVE databases','Unpatched CMS plugins / themes (WPScan)']},
  { code:'A07', color:'#D4537E', label:'Authentication Failures', items:['Brute force on login (rate limit / lockout)','Password policy enforcement','MFA bypass (token reuse, social engineering)','Session invalidation on logout (server-side)','Session fixation attacks','"Remember me" token security and expiration']},
  { code:'A08', color:'#BA7517', label:'Data Integrity Failures', items:['Deserialization vulnerabilities in API endpoints','Third-party script integrity (SRI hashes)','CI/CD pipeline unauthorized injection points','Auto-update signature validation']},
  { code:'A09', color:'#888780', label:'Logging & Monitoring', items:['Login attempts (success + failure) logged with context','High-value transactions generate audit entries','Log injection (CR/LF in logged fields)','Alerts fire for repeated auth failures']},
  { code:'A10', color:'#0F6E56', label:'Server-Side Request Forgery', items:['URL params that fetch remote resources','Webhook URLs for internal network access (10.x, 172.x)','Blind SSRF via DNS/HTTP callback','Cloud metadata endpoint access (169.254.169.254)']},
];

// ── State ────────────────────────────────────────────────────────────────────
let selectedTools = new Set(['nmap','zap','nikto','sqlmap','gobust','sslscan']);
let checks = {};
let findings = [];
let currentOS = 'kali';

CHECKLIST.forEach(cat => cat.items.forEach((_, i) => {
  checks[cat.code+'_'+i] = { done: false, status: 'pending' };
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const val = id => ($(id) || {}).value || '';

function copyText(text, el, label='copy') {
  navigator.clipboard.writeText(text).catch(() => {});
  if (el) { el.textContent = 'copied!'; setTimeout(() => el.textContent = label, 1600); }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTools();
  renderChecklist();
  renderFindings();
  buildScript();
  updateStatBadges();
});

// ── Tab routing ───────────────────────────────────────────────────────────────
function switchTab(name) {
  const names = ['setup','kickoff','checklist','findings','report'];
  names.forEach(t => $(('tab-'+t)).style.display = t===name ? '' : 'none');
  document.querySelectorAll('.tab').forEach((el,i) => el.classList.toggle('active', names[i]===name));
  if (name==='kickoff') buildScript();
}

// ── Setup / Tools tab ─────────────────────────────────────────────────────────
function renderTools() {
  $('tool-grid').innerHTML = TOOLS.map(t => `
    <div class="tool-tile ${selectedTools.has(t.id)?'selected':''}" onclick="toggleTool('${t.id}')">
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.desc}</div>
    </div>
  `).join('');
  renderCmds();
  buildScript();
}

function toggleTool(id) {
  selectedTools.has(id) ? selectedTools.delete(id) : selectedTools.add(id);
  renderTools();
}

function renderCmds() {
  const target = val('target-url') || '{{target}}';
  const panel = $('tool-cmd-panel');
  const selected = TOOLS.filter(t => selectedTools.has(t.id));
  if (!selected.length) { panel.innerHTML = ''; return; }
  panel.innerHTML = '<div class="card"><div class="card-title">Command Reference</div>' +
    selected.map(t => {
      const cmd = t.cmd.replace(/\{\{target\}\}/g, target);
      return `<div style="margin-bottom:12px;">
        <div class="flex-row" style="margin-bottom:4px;">
          <span style="font-size:12px;font-weight:500;">${t.name}</span>
          <span class="badge badge-info" style="margin-left:auto;">${t.desc}</span>
        </div>
        <div class="cmd-block">${cmd}
          <span class="cmd-copy" onclick="copyText(\`${cmd.replace(/`/g,'\\`')}\`,this,'copy')">copy</span>
        </div>
      </div>`;
    }).join('') + '</div>';
}

function updateTarget() { renderCmds(); }

// ── Kickoff Script tab ────────────────────────────────────────────────────────
function setOS(os, el) {
  currentOS = os;
  document.querySelectorAll('.os-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  $('os-note').textContent = OS_NOTES[os];
  buildScript();
}

function buildScript() {
  const installDir = val('install-dir') || '/opt/sectools';
  const logFile    = val('log-file')    || '/var/log/sectools-setup.log';
  const doUpdate   = $('opt-update')   ? $('opt-update').checked   : true;
  const doVerify   = $('opt-verify')   ? $('opt-verify').checked   : true;
  const doWordlist = $('opt-wordlists')? $('opt-wordlists').checked : false;
  const doNucleiT  = $('opt-nuclei-tmpl')? $('opt-nuclei-tmpl').checked : false;
  const os = currentOS;
  const selected = TOOLS.filter(t => selectedTools.has(t.id));
  const needsGo  = selected.some(t => TOOL_OS[t.id]?.type === 'go');
  const needsGem = selected.some(t => TOOL_OS[t.id]?.type === 'gem');

  const goInstall  = { kali:'sudo apt-get install -y golang-go', ubuntu:'sudo apt-get install -y golang-go', mac:'brew install go', arch:'sudo pacman -S --noconfirm go' };
  const gemInstall = { kali:'sudo apt-get install -y ruby ruby-dev', ubuntu:'sudo apt-get install -y ruby ruby-dev', mac:'# Ruby pre-installed on macOS', arch:'sudo pacman -S --noconfirm ruby' };

  const L = [];
  const add = s => L.push(s);

  add(`#!/usr/bin/env bash`);
  add(`# =================================================================`);
  add(`#  WebSec Platform — Tooling Kickoff Script`);
  add(`#  OS target  : ${os==='kali'?'Kali Linux':os==='ubuntu'?'Ubuntu / Debian':os==='mac'?'macOS (Homebrew)':'Arch / BlackArch'}`);
  add(`#  Tools      : ${selected.map(t=>t.name).join(', ')}`);
  add(`#  Generated  : ${new Date().toISOString().slice(0,10)}`);
  add(`# =================================================================`);
  add(`set -euo pipefail`);
  add(`LOG="${logFile}"`);
  add(`INSTALL_DIR="${installDir}"`);
  add(``);
  add(`# ── helpers ──────────────────────────────────────────────────────`);
  add(`RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; CYAN='\\033[0;36m'; NC='\\033[0m'`);
  add(`log()  { echo -e "[$(date +%T)] $*" | tee -a "$LOG"; }`);
  add(`info() { echo -e "\${CYAN}[INFO]\${NC}  $*" | tee -a "$LOG"; }`);
  add(`ok()   { echo -e "\${GREEN}[OK]\${NC}    $*" | tee -a "$LOG"; }`);
  add(`warn() { echo -e "\${YELLOW}[WARN]\${NC}  $*" | tee -a "$LOG"; }`);
  add(`is_installed() { command -v "$1" &>/dev/null; }`);
  add(``);
  add(`mkdir -p "$INSTALL_DIR" && touch "$LOG"`);
  add(`info "Kickoff started — log: $LOG"`);
  add(``);

  if (os === 'kali' || os === 'ubuntu') {
    add(`# ── package index ─────────────────────────────────────────────────`);
    add(`info "Updating apt index..."`); add(`sudo apt-get update -qq`); add(``);
  } else if (os === 'mac') {
    add(`# ── homebrew ──────────────────────────────────────────────────────`);
    add(`if ! is_installed brew; then`);
    add(`  warn "Homebrew not found — installing..."`);
    add(`  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`);
    add(`fi`); add(`brew update --quiet`); add(``);
  } else if (os === 'arch') {
    add(`# ── pacman sync ───────────────────────────────────────────────────`);
    add(`sudo pacman -Sy --noconfirm`); add(``);
  }

  if (needsGo) {
    add(`# ── Go runtime ────────────────────────────────────────────────────`);
    add(`if ! is_installed go; then`);
    add(`  info "Installing Go runtime..."`);
    add(`  ${goInstall[os]}`);
    add(`  export PATH=$PATH:$(go env GOPATH)/bin`);
    add(`  echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc`);
    add(`else`); add(`  ok "Go: $(go version)"`); add(`fi`); add(``);
  }

  if (needsGem) {
    add(`# ── Ruby / gem ────────────────────────────────────────────────────`);
    add(`if ! is_installed gem; then`);
    add(`  info "Installing Ruby..."`); add(`  ${gemInstall[os]}`);
    add(`else`); add(`  ok "Ruby: $(ruby -v)"`); add(`fi`); add(``);
  }

  selected.forEach(t => {
    const cfg = TOOL_OS[t.id]; if (!cfg) return;
    const osCfg = cfg[os];
    add(`# ── ${t.name} ${'─'.repeat(Math.max(1,50-t.name.length))}`);
    if (cfg.note) add(`# NOTE: ${cfg.note}`);
    add(`info "Processing ${t.name}..."`);
    if (cfg.type === 'manual') {
      add(osCfg.i);
      if (doUpdate) { add(`# Update:`); add(`# ${osCfg.u}`); }
    } else {
      add(`if is_installed ${cfg.bin}; then`);
      if (doUpdate) {
        add(`  ok "${t.name} found — updating..."`);
        add(`  ${osCfg.u.replace(/\n/g,'\n  ')}`);
      } else {
        add(`  ok "${t.name} already installed — skipping update"`);
      }
      add(`else`);
      add(`  info "Installing ${t.name}..."`);
      add(`  ${osCfg.i.replace(/\n/g,'\n  ')}`);
      add(`  ok "${t.name} installed"`);
      add(`fi`);
    }
    if (doVerify) {
      add(`${osCfg.v} && ok "${t.name} verified" || warn "${t.name} — verify manually"`);
    }
    add(``);
  });

  if (doWordlist) {
    add(`# ── SecLists ──────────────────────────────────────────────────────`);
    add(`WLDIR="$INSTALL_DIR/wordlists"`);
    add(`if [ -d "$WLDIR/SecLists" ]; then`);
    add(`  info "SecLists found — pulling updates..."`);
    add(`  cd "$WLDIR/SecLists" && git pull --quiet`);
    add(`else`);
    add(`  info "Cloning SecLists (~1.5 GB)..."`);
    add(`  mkdir -p "$WLDIR" && git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$WLDIR/SecLists"`);
    add(`  ok "SecLists ready"`);
    add(`fi`); add(``);
  }

  if (doNucleiT && selectedTools.has('nuclei')) {
    add(`# ── Nuclei templates ──────────────────────────────────────────────`);
    add(`if is_installed nuclei; then`);
    add(`  info "Updating Nuclei templates..."`);
    add(`  nuclei -update-templates && ok "Nuclei templates updated"`);
    add(`fi`); add(``);
  }

  add(`# ── summary ───────────────────────────────────────────────────────`);
  add(`echo ""`);
  add(`echo -e "\${GREEN}╔══════════════════════════════════════╗\${NC}"`);
  add(`echo -e "\${GREEN}║   Kickoff complete!                  ║\${NC}"`);
  add(`echo -e "\${GREEN}╚══════════════════════════════════════╝\${NC}"`);
  add(`info "Tools: ${selected.map(t=>t.name).join(', ')}"`);
  add(`info "Log  : $LOG"`);
  if (needsGo) add(`warn "Go tools: ensure \$(go env GOPATH)/bin is in PATH"`);

  const txt = L.join('\n');
  if ($('script-output')) $('script-output').textContent = txt;

  const legendEl = $('tool-legend');
  if (legendEl) legendEl.innerHTML = `
    <span class="step-pill install">install</span>
    <span class="step-pill update">update</span>
    <span class="step-pill manual">manual</span>
    <span style="font-size:11px;color:var(--text3);margin-left:4px;">${selected.length} tool${selected.length!==1?'s':''} · ${os}</span>
  `;

  return txt;
}

function copyScript() {
  const txt = $('script-output') ? $('script-output').textContent : buildScript();
  copyText(txt, event.target, 'Copy Script');
}

function downloadScript() {
  const content = buildScript();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/x-shellscript' }));
  a.download = 'websec-kickoff.sh';
  a.click();
}

// ── Checklist tab ──────────────────────────────────────────────────────────────
function renderChecklist() {
  $('checklist-container').innerHTML = CHECKLIST.map(cat => {
    const total = cat.items.length;
    const done  = cat.items.filter((_,i) => checks[cat.code+'_'+i].done).length;
    return `<div class="check-category">
      <div class="check-cat-hdr" onclick="toggleCat('cat-${cat.code}',this)">
        <span class="toggle-icon open">▶</span>
        <span class="cat-code" style="background:${cat.color}22;color:${cat.color}">${cat.code}</span>
        <span class="cat-label">${cat.label}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text2)">${done}/${total}</span>
      </div>
      <div class="card collapsible-body" id="cat-${cat.code}" style="max-height:1000px">
        ${cat.items.map((item,i) => {
          const key = cat.code+'_'+i; const c = checks[key];
          return `<div class="check-item">
            <input type="checkbox" ${c.done?'checked':''} onchange="toggleCheck('${key}',this.checked)"/>
            <span class="item-text ${c.done?'done':''}" id="ck-${key}">${item}</span>
            <select style="width:90px;padding:2px 6px;font-size:11px;" onchange="checks['${key}'].status=this.value">
              <option value="pending" ${c.status==='pending'?'selected':''}>—</option>
              <option value="pass"    ${c.status==='pass'?'selected':''}>Pass</option>
              <option value="finding" ${c.status==='finding'?'selected':''}>Finding</option>
              <option value="na"      ${c.status==='na'?'selected':''}>N/A</option>
            </select>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  updateProgress();
}

function toggleCat(id, hdr) {
  const el = $(id), icon = hdr.querySelector('.toggle-icon');
  const open = el.style.maxHeight !== '0px' && el.style.maxHeight !== '';
  el.style.maxHeight = open ? '0px' : '1000px';
  icon.classList.toggle('open', !open);
}

function toggleCheck(key, done) {
  checks[key].done = done;
  const el = $('ck-'+key); if (el) el.className='item-text '+(done?'done':'');
  updateProgress(); updateStatBadges();
}

function updateProgress() {
  const total = Object.keys(checks).length;
  const done  = Object.values(checks).filter(c=>c.done).length;
  $('progress-label').textContent = `${done} / ${total} checks completed`;
  $('progress-bar').style.width = (total ? Math.round(done/total*100) : 0)+'%';
}

function clearChecks() {
  Object.keys(checks).forEach(k => { checks[k].done=false; checks[k].status='pending'; });
  renderChecklist(); updateStatBadges();
}

// ── Findings tab ────────────────────────────────────────────────────────────
const SEV = { critical:{label:'Critical',color:'danger'}, high:{label:'High',color:'warn'}, medium:{label:'Medium',color:'info'}, low:{label:'Low',color:'ok'}, info:{label:'Info',color:''} };

function addFinding() {
  const title = val('f-title').trim(); if (!title) { $('f-title').focus(); return; }
  findings.push({ id:Date.now(), title, severity:val('f-sev'), tool:val('f-tool').trim(), desc:val('f-desc').trim(), rem:val('f-rem').trim(), cvss:val('f-cvss').trim() });
  ['f-title','f-tool','f-desc','f-rem','f-cvss'].forEach(id => $(id).value='');
  $('f-sev').value='medium';
  renderFindings(); updateStatBadges();
}

function removeFinding(id) { findings=findings.filter(f=>f.id!==id); renderFindings(); updateStatBadges(); }

function renderFindings() {
  const list=$('findings-list'), stats=$('findings-stats');
  if (!findings.length) { list.innerHTML='<div class="empty-state">No findings yet.</div>'; stats.style.display='none'; return; }
  const counts={critical:0,high:0,medium:0,low:0,info:0};
  findings.forEach(f=>counts[f.severity]++);
  stats.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px;';
  stats.innerHTML=Object.entries(counts).map(([s,n])=>`<div class="stat-card"><div class="stat-num" style="color:var(--${SEV[s].color?SEV[s].color+'-text':'text2'})">${n}</div><div class="stat-lbl">${SEV[s].label}</div></div>`).join('');
  list.innerHTML=findings.map(f=>`<div class="finding ${f.severity}">
    <div class="finding-hdr">
      <span class="badge badge-${SEV[f.severity].color||''}">${SEV[f.severity].label}</span>
      <span class="finding-title">${f.title}</span>
      ${f.tool?`<span class="tag">${f.tool}</span>`:''}
      ${f.cvss?`<span class="badge badge-warn">CVSS ${f.cvss}</span>`:''}
      <button class="btn btn-sm btn-danger" onclick="removeFinding(${f.id})" style="padding:2px 8px;">✕</button>
    </div>
    ${f.desc?`<div class="finding-body" style="margin-bottom:6px;"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--text3);">Evidence</strong><br>${f.desc}</div>`:''}
    ${f.rem?`<div class="finding-body"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:var(--text3);">Remediation</strong><br>${f.rem}</div>`:''}
  </div>`).join('');
}

function updateStatBadges() {
  const crit=findings.filter(f=>f.severity==='critical').length;
  const high=findings.filter(f=>f.severity==='high').length;
  const done=Object.values(checks).filter(c=>c.done).length;
  const total=Object.keys(checks).length;
  $('stat-badges').innerHTML=`
    ${crit?`<span class="badge badge-danger">${crit} Critical</span>`:''}
    ${high?`<span class="badge badge-warn">${high} High</span>`:''}
    <span class="badge badge-info">${done}/${total} checks</span>
  `;
}

// ── Report tab ───────────────────────────────────────────────────────────────
async function generateReport() {
  const btn=$('gen-btn'), out=$('report-output');
  btn.disabled=true; btn.textContent='Generating...';
  $('copy-btn').style.display='none';
  out.innerHTML='<span class="thinking">Analyzing findings and generating report...</span>';

  const checksSummary = CHECKLIST.map(cat=>{
    const done=cat.items.filter((_,i)=>checks[cat.code+'_'+i].done).length;
    const fi=cat.items.filter((_,i)=>checks[cat.code+'_'+i].status==='finding').length;
    return `${cat.code} ${cat.label}: ${done}/${cat.items.length} checked, ${fi} flagged`;
  }).join('\n');

  const findingsSummary = findings.length===0 ? 'No findings documented.' :
    findings.map((f,i)=>`[${i+1}] ${f.severity.toUpperCase()} - ${f.title}${f.cvss?` (CVSS ${f.cvss})`:''}
   Tool: ${f.tool||'Manual'}
   Description: ${f.desc||'Not provided'}
   Remediation: ${f.rem||'Not provided'}`).join('\n\n');

  const prompt = `You are a professional penetration testing report writer. Generate a ${val('r-format')||'Executive + Technical'} penetration test report in plain text (no markdown — use plain text with === section separators).

ENGAGEMENT:
- Title: ${val('r-title')||'Web Application Penetration Test Report'}
- Application: ${val('app-name')||'Web Application'}
- Target: ${val('target-url')||'Not specified'}
- Scope: ${val('scope')||'Not specified'}
- Test Type: ${val('test-type')||'Black Box'}
- Assessor: ${val('r-assessor')||'Security Assessor'}
- Date: ${val('r-date')||new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}
- Auth: ${val('auth-notes')||'Not specified'}
${val('r-context')?`- Context: ${val('r-context')}`:''}

OWASP TOP 10 COVERAGE:
${checksSummary}

FINDINGS:
${findingsSummary}

Generate: 1) Executive Summary 2) Engagement Overview 3) Risk Summary 4) Detailed Findings 5) Remediation Roadmap 6) Conclusion. Plain text only, === between sections.`;

  try {
    const resp = await fetch(`${CFG.apiBase}/generate-report`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    out.textContent = data.text;
    $('copy-btn').style.display='inline-flex';
  } catch(e) {
    out.innerHTML=`<span class="thinking">Error: ${e.message}</span>`;
  }

  btn.disabled=false;
  btn.textContent='Generate AI Report';
}

function copyReport() {
  copyText($('report-output').textContent, $('copy-btn'), 'Copy Report');
}
