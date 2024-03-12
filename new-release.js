// @ts-check
const semver = require("semver");
const { addReleaseToList, createNewRelease, generateDiffs, versionAlreadyExists } = require('./new-release-tools');

// TODO Diffs need to ignore pfx files and android/ios dirs

const path = require("path");
const { execSync } = require("child_process");

function usageAndExit() {
  console.log(`Usage: node ${process.argv[1]} <rnwVersion> [both|cpp|cs|mac]`);
  console.log(`ex: node ${process.argv[1]} 0.63.3`);
  console.log(`ex: node ${process.argv[1]} 0.64.1 cpp`);
  process.exit(1);
}

/**
 * @param {string} [rnwVersion]
 * @param {boolean} [mac] - mac vs windows
 */
function guardExisting(rnwVersion, mac) {
  if (versionAlreadyExists(rnwVersion, mac)) {
    console.error(`Already generated diff for ${rnwVersion}`);
    process.exit(0);
  }
}

function run() {
  if (process.argv.length < 3) {
    usageAndExit();
  }

  const rnwVersion = process.argv[2];
  const matches = /(\d+)\.(\d+).(\d+)(-[\w.-_]+)?/.exec(rnwVersion);
  if (!matches) {
    usageAndExit();
  }

  /** @type {'both' | 'cs' | 'cpp' | 'mac'} */
  let apptype = "both";
  if (process.argv.length == 4) {
    // @ts-ignore
    apptype = process.argv[3];
  }

  if (
    apptype !== "both" &&
    apptype !== "cpp" &&
    apptype !== "cs" &&
    apptype !== "mac"
  ) {
    usageAndExit();
  }

  guardExisting(rnwVersion, apptype === 'mac');

  const rnPackageName =
    apptype === "mac" ? "react-native-macos" : "react-native-windows";
  const npmInfoCmd = `npm info ${rnPackageName}@${rnwVersion} peerDependencies.react-native`;
  console.log("Running: " + npmInfoCmd);

  let rnRequiredVersion;
  if (apptype === 'mac') {
    const minorVersion = matches[2];
    // react-native-macos doesn't specify react-native as a peerDependency
    rnRequiredVersion = `^0.${minorVersion}`;
  } else {
    rnRequiredVersion = execSync(npmInfoCmd).toString().trim();
  }

  console.log("rnRequiredVersion: " + rnRequiredVersion);

  const npmRnVersionsCmd = `npm info react-native versions --json`;
  console.log("Running: " + npmRnVersionsCmd);
  const rnVersions = JSON.parse(execSync(npmRnVersionsCmd).toString());

  let rnVersion = rnVersions[0];
  rnVersions.forEach((version) => {
    if (semver.satisfies(version, rnRequiredVersion)) {
      if (semver.compare(version, rnVersion) > 0) {
        rnVersion = version;
      }
    }
  });

  console.log(`rnVersion: ${rnVersion}`);

  if (apptype === "both" || apptype === "cpp") {
    createNewRelease(rnwVersion, rnVersion, 'cpp');
  }
  if (apptype === "both" || apptype === "cs") {
    createNewRelease(rnwVersion, rnVersion, 'cs');
  }
  if (apptype === "mac") {
    createNewRelease(rnwVersion, rnVersion, 'mac');
  }

  if (apptype === "both") {
    generateDiffs(rnwVersion, 'cpp');
    generateDiffs(rnwVersion, 'cs');
  } else {
    generateDiffs(rnwVersion, apptype);
  }

  addReleaseToList(rnwVersion, apptype === "mac");
}

run();
