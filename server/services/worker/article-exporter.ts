import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { ScheduledExportFormat } from '~/types/worker-scheduler';

interface ExportArticleFormatsInput {
  fakeid: string;
  aid: string;
  title: string;
  html: string;
  formats: ScheduledExportFormat[];
  outputRoot: string;
}

interface ExportArticleFormatsResult {
  writtenFormats: ScheduledExportFormat[];
  files: Partial<Record<ScheduledExportFormat, string>>;
}

function normalizeWorkerHtml(rawHTML: string, format: 'html' | 'text') {
  const $ = cheerio.load(rawHTML);
  const $jsArticleContent = $('#js_article');

  $jsArticleContent.find('#js_content').removeAttr('style');
  $jsArticleContent.find('#js_top_ad_area').remove();
  $jsArticleContent.find('#js_tags_preview_toast').remove();
  $jsArticleContent.find('#content_bottom_area').remove();
  $jsArticleContent.find('script').remove();
  $jsArticleContent.find('#js_pc_qr_code').remove();
  $jsArticleContent.find('#wx_stream_article_slide_tip').remove();

  $('img').each((_, el) => {
    const $img = $(el);
    const imgUrl = $img.attr('src') || $img.attr('data-src');
    if (imgUrl) {
      $img.attr('src', imgUrl);
    }
  });

  if (format === 'text') {
    return $jsArticleContent
      .text()
      .trim()
      .replace(/\n+/g, '\n')
      .replace(/ +/g, ' ')
      .split('\n')
      .filter(line => !/^\s*$/.test(line))
      .join('\n');
  }

  const bodyCls = $('body').attr('class') || '';
  const pageContentHTML = $('<div>').append($jsArticleContent.clone()).html();
  return `<!DOCTYPE html>
<html lang="zh_CN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0,viewport-fit=cover">
  <meta name="referrer" content="no-referrer">
</head>
<body class="${bodyCls}">
${pageContentHTML}
</body>
</html>`;
}

function sanitizeFilenamePart(value: string) {
  const normalized = value
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || 'article';
}

async function writeExportFile(
  outputRoot: string,
  fakeid: string,
  format: ScheduledExportFormat,
  filename: string,
  content: string
) {
  const formatDir = path.join(outputRoot, fakeid, format);
  await fs.mkdir(formatDir, { recursive: true });
  const filePath = path.join(formatDir, filename);
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function exportArticleFormats(input: ExportArticleFormatsInput): Promise<ExportArticleFormatsResult> {
  const requestedFormats = [...new Set(input.formats)];
  const writtenFormats: ScheduledExportFormat[] = [];
  const files: Partial<Record<ScheduledExportFormat, string>> = {};
  if (requestedFormats.length === 0) {
    return { writtenFormats, files };
  }

  const normalizedHtml =
    requestedFormats.includes('html') || requestedFormats.includes('markdown')
      ? normalizeWorkerHtml(input.html, 'html')
      : null;
  const normalizedText = requestedFormats.includes('txt') ? normalizeWorkerHtml(input.html, 'text') : null;
  const baseName = sanitizeFilenamePart(`${input.aid}-${input.title}`);

  try {
    if (requestedFormats.includes('html') && normalizedHtml) {
      files.html = await writeExportFile(input.outputRoot, input.fakeid, 'html', `${baseName}.html`, normalizedHtml);
      writtenFormats.push('html');
    }

    if (requestedFormats.includes('txt') && normalizedText !== null) {
      files.txt = await writeExportFile(input.outputRoot, input.fakeid, 'txt', `${baseName}.txt`, normalizedText);
      writtenFormats.push('txt');
    }

    if (requestedFormats.includes('markdown') && normalizedHtml) {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(normalizedHtml);
      files.markdown = await writeExportFile(input.outputRoot, input.fakeid, 'markdown', `${baseName}.md`, markdown);
      writtenFormats.push('markdown');
    }
  } catch (error) {
    await Promise.all(
      Object.values(files).map(filePath => (filePath ? fs.unlink(filePath).catch(() => {}) : Promise.resolve()))
    );
    throw error;
  }

  return { writtenFormats, files };
}
