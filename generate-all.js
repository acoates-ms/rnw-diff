// @ts-check

const { execSync } = require("child_process");

function run() {
  const cmd = "npm info react-native-windows versions --json";
  console.log("Running: " + cmd);
  const allVersions = JSON.parse(execSync(cmd).toString());

  for (let rnwVersion of allVersions) {

    const matches = /(\d+)\.(\d+).(\d+)(-[\w.-_]+)?/.exec(rnwVersion);
    const isPrerelease = matches[4] !== undefined;
    const isPreviewRelease = isPrerelease && matches[4].startsWith('-preview.')
    const inVersionRange = matches[1] === "0" && Number.parseInt(matches[2]) >= 61;

    if (inVersionRange && (!isPrerelease || isPreviewRelease)) {
      const newReleaseCmd = `node new-release.js ${rnwVersion}`;
      console.log("Running: " + newReleaseCmd);
      execSync(newReleaseCmd, { stdio: "inherit" });
    }
  }
}

run();
