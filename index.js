#!/usr/bin/env node

const axios = require('axios');
const { RegistryClient } = require('package-metadata');
const octokit = require('@octokit/rest')();

const Table = require('cli-table');

const { promisify } = require('util');
const fs = require('fs');
const readFileAsync = promisify(fs.readFile);

// ["github.com/axios/axios.git", "/", "axios", "axios"]
// [, , owner, repo]
const repositoryPattern = /github\.com(\/|:)(.*)\/(.*)\.git/;

function chunkString(str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

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
  const metadata = await RegistryClient.getMetadata(packageName, {
    fullMetadata: true,
  });

  const { repository } = metadata.versions.latest;
  if (!repository || !repository.url) return null;

  const match = repository.url.match(repositoryPattern);
  if (!match) return null;

  const [, , owner, repo] = match;
  return { owner, repo };
}

async function getDependencyWithRepo(dependency) {
  const repository = await getRepositoryForPackage(dependency.name);

  return {
    ...dependency,
    repository,
  };
}

async function getIssuesForDependency(dependency) {
  if (!dependency.repository) return { ...dependency, issues: [] };

  const {
    repository: { owner, repo },
  } = dependency;
  const { data } = await octokit.issues.getForRepo({
    owner,
    repo,
    // owner: 'facebook',
    // repo: 'react',
    labels: 'Good first issue',
  });

  return {
    ...dependency,
    issues: data.map(issue => ({
      title: issue.title,
      link: issue.html_url,
    })),
  };
}

function printIssueTable(dependency) {
  console.log(`\n${dependency.name}`);
  if (!dependency.issues.length) {
    console.log('No "Good First Task" issues :(');
    return;
  }

  const table = new Table({
    head: ['Issue Label', 'Github Issue'],
    colWidths: [50, 60],
  });
  const rows = dependency.issues.map(({ title, link }) => {
    const formattedTitle = chunkString(title, 47).join('\n');
    return [formattedTitle, link];
  });
  table.push(...rows);
  console.log(table.toString());
}

async function run() {
  const contents = await getContents();

  const json = JSON.parse(contents);

  let dependencies = [
    ...modelDependencies(json, 'dependencies'),
    ...modelDependencies(json, 'devDependencies'),
    ...modelDependencies(json, 'peerDependnecies'),
  ];

  const dependenciesWithRepos = await Promise.all(
    dependencies.map(getDependencyWithRepo)
  );

  dependenciesWithIssues = await Promise.all(
    dependenciesWithRepos.map(getIssuesForDependency)
  );

  dependenciesWithIssues.forEach(printIssueTable);
}

run();
