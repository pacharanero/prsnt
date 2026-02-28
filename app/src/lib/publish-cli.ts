import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseTextToUrls, publishPresentation, slugify } from './publish';

type Args = {
  input: string;
  slug: string;
  title: string;
  outRoot: string;
};

function parseArgs(argv: string[]): Args {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) {
      continue;
    }
    const key = part.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      continue;
    }
    result[key] = value;
  }

  const input = result.input || '';
  if (!input) {
    throw new Error('Missing --input <path-to-txt>');
  }

  const inferred = slugify(result.slug || result.title || input.replace(/\.txt$/i, '')) || 'presentation';

  return {
    input,
    slug: inferred,
    title: result.title || inferred,
    outRoot: result.out || '../docs',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const source = await readFile(inputPath, 'utf8');
  const urls = parseTextToUrls(source);
  if (!urls.length) {
    throw new Error('No URLs found in input file');
  }

  const outDir = resolve(process.cwd(), args.outRoot, args.slug);
  await publishPresentation({
    title: args.title,
    urls,
    outDir,
  });

  const local = join(args.outRoot, args.slug);
  console.log(`Published ${urls.length} slides to ${local}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
