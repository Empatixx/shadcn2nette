#!/usr/bin/env node
/** CLI entry point for the shadcn -> Nette (.phtml/Latte) transpiler. */
import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { transpileComponent, listComponents } from './transpile.js';
import { DEFAULT_REGISTRY, DEFAULT_STYLE } from './registry.js';

interface TranspileCliOptions {
  all?: boolean;
  style: string;
  out: string;
  registry: string;
}

const program = new Command();

program
  .name('shadcn-to-nette')
  .description('Transpile shadcn/ui components into Nette .phtml (Latte) templates');

program
  .command('transpile', { isDefault: true })
  .argument('[components...]', 'component names to transpile (e.g. button card alert)')
  .option('--all', 'transpile every registry:ui component')
  .option('--style <style>', 'shadcn style (new-york | default)', DEFAULT_STYLE)
  .option('--out <dir>', 'output directory', './out')
  .option('--registry <url>', 'registry base URL', DEFAULT_REGISTRY)
  .action(async (components: string[], options: TranspileCliOptions) => {
    const registryOpts = { style: options.style, registry: options.registry };

    let names = components;
    if (options.all) {
      names = await listComponents(registryOpts);
    }
    if (!names || names.length === 0) {
      console.error('No components specified. Pass component names or use --all.');
      process.exitCode = 1;
      return;
    }

    await mkdir(options.out, { recursive: true });

    let written = 0;
    const failures: string[] = [];
    for (const name of names) {
      try {
        const templates = await transpileComponent(name, registryOpts);
        if (templates.length === 0) {
          console.warn(`! ${name}: no renderable components found (skipped)`);
          continue;
        }
        for (const t of templates) {
          const file = join(options.out, `${t.name}.phtml`);
          await writeFile(file, t.phtml, 'utf8');
          console.log(`✓ ${name} → ${file}`);
          written++;
        }
      } catch (err) {
        failures.push(name);
        console.error(`✗ ${name}: ${(err as Error).message}`);
      }
    }

    console.log(`\nDone. ${written} template(s) written to ${options.out}`);
    if (failures.length > 0) {
      console.error(`Failed: ${failures.join(', ')}`);
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
