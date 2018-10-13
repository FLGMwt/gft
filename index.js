#!/usr/bin/env node

const axios = require('axios');
const { RegistryClient } = require('package-metadata');

const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

function error(message) {
  console.error(message);
  process.exit(1);
}

async function getContents() {
  try {
    return await readFileAsync('package.json', { encoding: 'utf8' });
  } catch (error) {
    error('Unable to load "package.json" from current directory');
  }
}

function modelDependencies(json, dependencyType) {
  return Object.keys(json[dependencyType] || {}).map(dependencyKey => ({
    name: dependencyKey,
    dependencyType,
  }));
}

async function getRepositoryForPackage(packageName) {
  const metadata = await RegistryClient.getMetadata('axios', {
    fullMetadata: true,
  });

  console.log(metadata.versions.latest.repository);
}

async function run() {
  // TODO: test getting version

  // TODO: test getting GH issues
  error('');
  const contents = await getContents();

  const json = JSON.parse(contents);

  const dependencies = [
    ...modelDependencies(json, 'dependencies'),
    ...modelDependencies(json, 'devDependencies'),
    ...modelDependencies(json, 'peerDependnecies'),
  ];
}

run();
