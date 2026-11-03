const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb');

const threeModulePath = path.join(__dirname, 'node_modules/three/build/three.module.js');
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return resolveRequest
      ? resolveRequest(context, threeModulePath, platform)
      : context.resolveRequest(context, threeModulePath, platform);
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
