const path = require("path");
const fs = require("fs");
const rootEnv = path.resolve(__dirname, "../.env");
if (fs.existsSync(rootEnv)) {
  require("dotenv").config({ path: rootEnv });
}

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
