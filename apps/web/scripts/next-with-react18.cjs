#!/usr/bin/env node

const path = require('node:path');

const webRoot = path.resolve(__dirname, '..');
const hookPath = path.join(__dirname, 'react18-require-hook.cjs');
const hookOption = `--require=${hookPath.replace(/\\/g, '/')}`;

if (!process.env.NODE_OPTIONS?.includes(hookOption)) {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
    ? `${process.env.NODE_OPTIONS} ${hookOption}`
    : hookOption;
}

require(hookPath);

const nextBin = require.resolve('next/dist/bin/next', { paths: [webRoot] });
process.argv = [process.argv[0], nextBin, ...process.argv.slice(2)];
require(nextBin);
