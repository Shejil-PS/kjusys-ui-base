const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const mf = require("@angular-architects/module-federation/webpack");
const path = require("path");
const share = mf.share;
const CompressionPlugin = require('compression-webpack-plugin');

const REMOTE_ENTRY_VERSION = Date.now();

const sharedMappings = new mf.SharedMappings();
sharedMappings.register(path.join(__dirname, "../../tsconfig.json"), [
  "@libs/left-menu-lib",
  "@libs/menu-header-lib",
  "@libs/shared-auth",
  "@libs/http-common",
]);

module.exports = {
  output: {
    uniqueName: "shell",
    publicPath: "https://dev-kjusys.kristujayanti.edu.in/",
    scriptType: "text/javascript",
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks: 'async',
      minSize: 20000,
      maxSize: 2000000,
      cacheGroups: {
        defaultVendors: false,
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  },
  resolve: {
    alias: {
      ...sharedMappings.getAliases(),
    },
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      library: { type: "module" },
      name: "shell",
      remotes: {
        admissions: `https://admissions.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        sim: `https://sim.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        core: `https://core.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        applicant: `https://applicant.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        fees: `https://fees.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        library: `https://library.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        apps: `https://apps.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        arena: `https://arena.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        guesthouse: `https://annexe.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        eduServ: `https://eduserv.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        academics: `https://academics.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        gymnasium: `https://gymnasium.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        assets: `https://assets.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        jayantianscholar: `https://jayantian-scholar.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        examinations: `https://examinations.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        portal: `https://events.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        globalrelations: `https://global-relations.dev-kjusys.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,,
        "placement": "http://placement.dev-kjusys.kristujayanti.edu.in/remoteEntry.js",
      },
      shared: share({
        "@angular/core": {
          singleton: true,
          strictVersion: true,
          requiredVersion: "auto",
        },
        "@angular/common": {
          singleton: true,
          strictVersion: true,
          requiredVersion: "auto",
        },
        "@angular/common/http": {
          singleton: true,
          strictVersion: true,
          requiredVersion: "auto",
        },
        "@angular/router": {
          singleton: true,
          strictVersion: true,
          requiredVersion: "auto",
        },
        "ngx-toastr": {
          singleton: true,
          strictVersion: true,
          requiredVersion: "auto",
        },
   
          "@angular/platform-browser/animations": {
            singleton: true,
            strictVersion: true,
            requiredVersion: "auto",
          },
          "@libs/left-menu-lib": { singleton: true, strictVersion: true },
          "@libs/menu-header-lib": { singleton: true, strictVersion: true },
          "@libs/shared-auth": { singleton: true, strictVersion: true },
          "@libs/http-common": { singleton: true, strictVersion: true },
          ...sharedMappings.getDescriptors(),
        
      }),
    }),
    new CompressionPlugin({
      algorithm: 'gzip',
      compressionOptions: { level: 3 },
      test: /\.(js|css|html|json)$/,
      threshold: 1024,
      minRatio: 0.8,
    }),
    sharedMappings.getPlugin(),
  ],
};
