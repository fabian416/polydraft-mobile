const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow importing from the parent web project (../src) via @web alias
config.watchFolders = [path.resolve(__dirname, '..')];

// Ensure node_modules resolves from this project first
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

module.exports = config;
