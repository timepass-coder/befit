// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation loads a SQLite wasm binary at runtime. Metro
// must treat `.wasm` files as bundled assets so the import resolves.
const wasmIndex = config.resolver.assetExts.indexOf('wasm');
if (wasmIndex === -1) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;