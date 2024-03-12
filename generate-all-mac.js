// @ts-check

const { execSync } = require("child_process");
const { join } = require("path");
const { existsSync } = require("fs");
const { versionAlreadyExists } = require('./new-release-tools');

let onlyOne = false;

function run() {

  if (process.argv.length == 3 && process.argv[2] === 'onlyOne') {
    onlyOne = true;
  }

  const cmd = "npm info react-native-macos versions --json";
  console.log("Running: " + cmd);
  const allVersions = JSON.parse(execSync(cmd).toString());

  for (let rnwVersion of allVersions) {
    const matches = /(\d+)\.(\d+).(\d+)(-[\w.-_]+)?/.exec(rnwVersion);
    const isPrerelease = matches[4] !== undefined;
    const isPreviewRelease = isPrerelease && matches[4].startsWith("-preview.");
    const inVersionRange =
      matches[1] === "0" && Number.parseInt(matches[2]) >= 61;

    if (inVersionRange && (!isPrerelease || isPreviewRelease)) {

      if (versionAlreadyExists(rnwVersion, true /*mac*/)) {
        console.log(`Already generated diff for ${rnwVersion}`);
      } else {
        const newReleaseCmd = `node new-release.js ${rnwVersion} mac`;
        console.log("Running: " + newReleaseCmd);
        execSync(newReleaseCmd, { stdio: "inherit" });
        if (onlyOne) {
          break;
        }
      }
    }
  }
  if (existsSync(join(__dirname, "wt-diffs"))) {
    execSync(`rmdir /S /Q wt-diffs`, { cwd: __dirname, stdio: "inherit" });
    execSync(`git worktree prune`, { cwd: __dirname, stdio: "inherit" });
  }
}

run();
