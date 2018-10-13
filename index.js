#!/usr/bin/env node

const axios = require('axios');
const { RegistryClient } = require('package-metadata');

const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

// ["github.com/axios/axios.git", "/", "axios", "axios"]
// [, , organization, project]
const repositoryPattern = /github\.com(\/|:)(.*)\/(.*)\.git/;

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

  const { repository } = metadata.versions.latest;
  if (!repository || !repository.url) return null;

  const match = repository.url.match(repositoryPattern);
  if (!match) return null;

  const [, , githubOrg, githubProject] = match;
  return { githubOrg, githubProject };
}

async function getDependencyWithRepo(dependency) {
  const repository = await getRepositoryForPackage(dependency.name);

  return {
    ...dependency,
    repository,
  };
}

async function run() {
  const contents = await getContents();

  const json = JSON.parse(contents);

  const dependencies = [
    ...modelDependencies(json, 'dependencies'),
    ...modelDependencies(json, 'devDependencies'),
    ...modelDependencies(json, 'peerDependnecies'),
  ];

  const foo = await Promise.all(dependencies.map(getDependencyWithRepo));
  console.log({ foo });
}

run();
