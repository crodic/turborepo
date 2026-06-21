const { config } = require('dotenv');
const { resolve } = require('node:path');

const result = config({
  path: resolve(process.cwd(), '.env.testing'),
  override: true,
  quiet: true,
});

if (result.error) {
  throw result.error;
}
