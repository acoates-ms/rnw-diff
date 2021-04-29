// @ts-check

const { execSync } = require("child_process");

function run() {
  const cmd = "npm info react-native-windows versions --json";
  console.log("Running: " + cmd);
  const allVersions = JSON.parse(execSync(cmd).toString());

  for (let rnwVersion of allVersions) {
    if (rnwVersion.indexOf("-") < 0) {
      // Skip preview versions for now.

      const matches = /(\d+)\.(\d+).(\d+)(-[\w.-_]+)?/.exec(rnwVersion);

      if (matches[1] === "0" && Number.parseInt(matches[2]) >= 61) {
        // Just do versions 0.61+ for now
        const newReleaseCmd = `node new-release.js ${rnwVersion}`;
        console.log("Running: " + newReleaseCmd);
        execSync(newReleaseCmd, { stdio: "inherit" });
      }
    }
  }
}

run();
