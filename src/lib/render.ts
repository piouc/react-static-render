import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import { format } from 'prettier'

async function hashContent(content: string): Promise<string> {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function exportSvg(htmlFilePath: string, outputDir: string) {
  const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;
  const svgElements = document.querySelectorAll('svg');

  const htmlDir = path.dirname(htmlFilePath);
  const relativeOutputDir = path.relative(htmlDir, outputDir);

  await fs.mkdir(outputDir, { recursive: true });

  for (const svg of svgElements) {
    const svgContent = svg.outerHTML;
    const hash = await hashContent(svgContent);
    const fileName = `${hash}.svg`;
    const filePath = path.join(outputDir, fileName);
    const relativeFilePath = path.join(relativeOutputDir, fileName);

    await fs.writeFile(filePath, svgContent, 'utf-8');

    const scriptElement = document.createElement('script');
    scriptElement.textContent = `
      (() => {
        const script = document.currentScript
        fetch("${relativeFilePath.replace(/\\/g, '/')}")
          .then(response => response.text())
          .then(data => {
            const template = document.createElement('template');
            template.innerHTML = data.trim();
            script.replaceWith(template.content.firstChild);
          })
      })()
    `;
    svg.replaceWith(scriptElement);
  }

  const newHtmlContent = dom.serialize();
  await fs.writeFile(htmlFilePath, await format(newHtmlContent, {parser: 'html', printWidth: Number.MAX_SAFE_INTEGER}), 'utf-8');
}