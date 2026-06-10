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
  cache: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  output: {
    uniqueName: "shell",
    publicPath: "https://kjusys.kristujayanti.edu.in/",
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
        admissions: `https://kjusys-admissions.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        sim: `https://kjusys-sim.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        core: `https://kjusys-core.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        applicant: `https://kjusys-applicant.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        fees: `https://kjusys-fees.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        library: `https://kjusys-library.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        apps: `https://kjusys-apps.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        arena: `https://kjusys-arena.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        guesthouse: `https://kjusys-annexe.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        eduServ: `https://kjusys-eduserv.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        academics: `https://kjusys-academics.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        gymnasium: `https://kjusys-gymnasium.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        assets: `https://kjusys-assets.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        jayantianscholar: `https://kjusys-jayantian-scholar.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        examinations: `https://kjusys-examinations.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        portal: `https://kjusys-events.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,
        globalrelations: `https://kjusys-global-relations.kristujayanti.edu.in/remoteEntry.js?v=${REMOTE_ENTRY_VERSION}`,,
        "placement": "https://kjusys-placement.kristujayanti.edu.in/remoteEntry.js",
      },
      shared: share({
        // ── Core Angular packages ──────────────────────────────────────────
        "@angular/core": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/common": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/common/http": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/router": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/forms": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/animations": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/platform-browser": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "@angular/platform-browser/animations": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },

        // ── RxJS — shared to avoid duplicate operator bundles ──────────────
        // strictVersion: false → standalone remotes fall back to own copy safely
        "rxjs": {
          singleton: true, strictVersion: false, requiredVersion: "auto",
        },

        // ── NgRx — state is global; must be singleton ──────────────────────
        "@ngrx/store": {
          singleton: true, strictVersion: false, requiredVersion: "auto",
        },
        "@ngrx/effects": {
          singleton: true, strictVersion: false, requiredVersion: "auto",
        },
        "@ngrx/store-devtools": {
          singleton: true, strictVersion: false, requiredVersion: "auto",
        },

        // ── UI libraries ───────────────────────────────────────────────────
        "ngx-toastr": {
          singleton: true, strictVersion: true, requiredVersion: "auto",
        },
        "tslib": {
          singleton: true, strictVersion: false, requiredVersion: "auto",
        },

        // ── Internal shared libs ───────────────────────────────────────────
        "@libs/left-menu-lib":     { singleton: true, strictVersion: true },
        "@libs/menu-header-lib":   { singleton: true, strictVersion: true },
        "@libs/shared-auth":       { singleton: true, strictVersion: true },
        "@libs/http-common":       { singleton: true, strictVersion: true },
        "@ngx-formly/core": { singleton: true, strictVersion: false, requiredVersion: "auto" },
        "@ngx-formly/bootstrap": { singleton: true, strictVersion: false, requiredVersion: "auto" },

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
