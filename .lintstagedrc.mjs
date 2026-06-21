import path from 'node:path';

const eslintWorkspaces = [
  'apps/api',
  'apps/client',
  'apps/docs',
  'apps/web',
  'packages/ui',
];

const quote = (value) => JSON.stringify(value);

const buildEslintCommand = (workspace, files) => {
  const workspacePath = path.join(process.cwd(), workspace);
  const workspaceFiles = files
    .map((file) => path.relative(workspacePath, file))
    .filter((file) => file && !file.startsWith('..') && !path.isAbsolute(file));

  if (workspaceFiles.length === 0) {
    return null;
  }

  return `pnpm --dir ${quote(workspace)} exec eslint --fix ${workspaceFiles
    .map(quote)
    .join(' ')}`;
};

export default {
  '*.{js,mjs,cjs,ts,tsx,json,md,yml,yaml,css,scss,html}': (files) =>
    `prettier --write ${files.map(quote).join(' ')}`,

  '*.{js,mjs,cjs,ts,tsx}': (files) =>
    eslintWorkspaces
      .map((workspace) => buildEslintCommand(workspace, files))
      .filter(Boolean),
};
