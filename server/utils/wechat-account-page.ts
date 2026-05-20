import * as cheerio from 'cheerio';

function cleanAccountName(value: string | undefined): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/[｜|-]\s*微信公众平台.*/, '')
    .replace(/\s*的公众号$/, '')
    .trim();
}

export function extractAccountNameFromHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);
  const selectors = [
    '.wx_follow_nickname:first',
    '.profile_nickname:first',
    '.account_nickname:first',
    '.nickname:first',
    '#nickname:first',
  ];

  for (const selector of selectors) {
    const name = cleanAccountName($(selector).text());
    if (name) {
      return name;
    }
  }

  const metaTitle = cleanAccountName(
    $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content')
  );
  if (metaTitle) {
    return metaTitle;
  }

  return cleanAccountName($('title').first().text());
}
