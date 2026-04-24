#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { listRefs } from './commands/list.js';
import { pullRefs } from './commands/pull.js';
import { searchRefs } from './commands/search.js';
import { listCollections, createCollection } from './commands/collections.js';
import { addRef } from './commands/add.js';

const DEFAULT_OUT = process.env.REFS_OUT_DIR ?? './.refs';

const program = new Command();
program
  .name('refs')
  .description('Personal reference platform CLI')
  .version('0.1.0');

program
  .command('list')
  .description('List refs (newest first)')
  .option('-c, --collection <name>', 'filter by collection')
  .option('-t, --tag <tag>', 'filter by tag')
  .option('-n, --limit <n>', 'max results', (v) => parseInt(v, 10), 50)
  .action(async (opts) => {
    await listRefs(opts);
  });

program
  .command('pull')
  .description('Pull refs to local markdown files')
  .option('-c, --collection <name>', 'pull only this collection')
  .option('-t, --tag <tag>', 'pull only this tag')
  .option('-o, --out <dir>', 'output directory', DEFAULT_OUT)
  .option('-n, --limit <n>', 'max refs', (v) => parseInt(v, 10))
  .action(async (opts) => {
    await pullRefs(opts);
  });

program
  .command('search <query>')
  .description('Search refs by title/content/notes (ILIKE)')
  .option('-o, --out <dir>', 'also write matches to this directory')
  .option('-n, --limit <n>', 'max results', (v) => parseInt(v, 10), 50)
  .action(async (query, opts) => {
    await searchRefs({ query, ...opts });
  });

program
  .command('collections')
  .description('List collections with ref counts')
  .action(async () => {
    await listCollections();
  });

program
  .command('create-collection <name>')
  .description('Create a new collection')
  .option('-d, --description <text>', 'description')
  .action(async (name, opts) => {
    await createCollection(name, opts.description);
  });

program
  .command('add')
  .description('Add a ref manually (useful for quick notes)')
  .option('--title <text>', 'title')
  .option('--url <url>', 'source URL')
  .option('--content <text>', 'main content (markdown)')
  .option('--notes <text>', 'your notes')
  .option('-c, --collection <name>', 'collection name')
  .option('-t, --tags <tags>', 'comma-separated tags', (v) => v.split(',').map((s) => s.trim()))
  .option('--type <type>', 'page | selection | image | video | note', 'note')
  .action(async (opts) => {
    await addRef(opts);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('Error:'), err.message ?? err);
  process.exit(1);
});
