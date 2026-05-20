import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const endpointFiles = [
  'server/api/web/data/articles/by-link.get.ts',
  'server/api/web/data/articles/single-by-link.get.ts',
];

test('article lookup endpoints await repository calls inside try/catch', () => {
  for (const file of endpointFiles) {
    const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
    assert.match(
      source,
      /return\s+await\s+get(?:Single)?ArticleByLink\(/,
      `${file} must await async repository errors`
    );
  }
});
