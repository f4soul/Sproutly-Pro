const fs = require('fs');
let c = fs.readFileSync('src/services/ExportService.ts', 'utf8');

const t1 = `container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';`;
const r1 = `container.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';`;
c = c.split(t1).join(r1);

const t2 = `logo.innerHTML = '<span style="font-weight: 900; font-size: 20px; color: #6366f1; font-family: monospace; letter-spacing: -1px;">SPROUTLY<span style="color: #6366f1;">•</span>PRO</span>';`;
const r2 = "logo.innerHTML = `<span style=\"font-weight: 900; font-size: 24px; color: ${textColor}; font-family: 'JetBrains Mono', monospace; letter-spacing: -2px; text-transform: uppercase;\">SPROUTLY<span style=\"display: inline-block; width: 6px; height: 6px; background-color: #3b82f6; border-radius: 50%; margin: 0 4px; vertical-align: middle;\"></span>PRO</span>`;";
c = c.split(t2).join(r2);

fs.writeFileSync('src/services/ExportService.ts', c);
console.log("Done");
