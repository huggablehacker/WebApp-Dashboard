# Usage Guide

## Workflow

A typical engagement with WebSec Platform follows this sequence:

1. **Setup & Tools** — enter target URL, scope, testing type, and select tools
2. **Kickoff Script** — generate and run the install script on your testing machine
3. **Test Checklist** — work through OWASP Top 10 items, marking each as tested
4. **Findings** — log each discovered vulnerability as you go
5. **Report** — generate a professional report with one click

---

## Setup & Tools Tab

### Target Configuration

- **Target URL / IP** — populates all command templates automatically (e.g. `nmap -sV target.com`)
- **Application Name** — appears in the generated report
- **Scope** — comma-separated list of in-scope hosts/domains
- **Testing Type** — Black Box, Grey Box, or White Box (informs report context)
- **Authorization Notes** — reference your SOW or authorization letter

### Tool Selection

Click any tool tile to toggle it on or off. Selected tools appear in:
- The **Command Reference** section (copy-ready CLI commands)
- The **Kickoff Script** (install/update logic)

---

## Kickoff Script Tab

### Platform Selection

Choose the OS of your testing machine. The script adapts package managers accordingly.

### Options

| Option | Effect |
|--------|--------|
| Update existing tools | Runs upgrade command if tool is already installed |
| Verify after install | Runs `tool --version` to confirm each install succeeded |
| Download SecLists | Clones or pulls `danielmiessler/SecLists` (~1.5 GB) |
| Download Nuclei templates | Runs `nuclei -update-templates` |

### Running the Script

```bash
# Download the generated script, then:
chmod +x websec-kickoff.sh
sudo ./websec-kickoff.sh
```

The script logs all output to `/var/log/sectools-setup.log` (configurable).

---

## Test Checklist Tab

Each OWASP Top 10 category is expandable. For each test item:

- **Check the box** when you have completed that test
- **Set the status** to Pass, Finding, or N/A

Items marked "Finding" are flagged in the report summary.

---

## Findings Tab

Log each vulnerability discovered during testing:

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Short, descriptive name |
| Severity | Yes | Critical / High / Medium / Low / Informational |
| Tool / Source | No | e.g. SQLMap, Burp Suite, Manual |
| Description / Evidence | No | Paste tool output or describe the finding |
| Remediation | No | What the developer should do to fix it |
| CVSS Score | No | Optional numeric score (e.g. 7.5) |

---

## Report Tab

### Format Options

| Format | Best for |
|--------|----------|
| Executive + Technical | Full delivery to a client |
| Executive Summary Only | Management briefings |
| Technical Detail Only | Developer remediation handoff |
| Remediation Roadmap | Prioritized action plan |

### Additional Context

Use this field to guide the AI:

- "This is a PCI-DSS environment — prioritize payment flow findings"
- "Client has a 30-day SLA — focus on critical and high findings only"
- "Include NIST 800-53 control references where applicable"

### API Key Setup

Report generation requires an Anthropic API key. Add it to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then restart the server. The banner at the top of the page will disappear once the key is detected.
