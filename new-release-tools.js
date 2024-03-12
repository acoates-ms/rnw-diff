// @ts-check
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const semver = require("semver");

// TODO Diffs need to ignore pfx files and android/ios dirs

const path = require("path");
const { execSync } = require("child_process");

function runCmd(cmd, cwd) {
  console.log("Running: " + cmd);
  const opts = cwd ? { cwd: cwd, stdio: "inherit" } : { stdio: "inherit" };
  execSync(cmd, opts);
}

/**
 * @param {string} [newRelease] - version of windows/macos
 * @param {string} [rnVersion] - version of react-native to use with release
 * @param {'cpp' | 'cs' | 'mac'} [apptype] - Either language to use for windows, or use mac
 */
function createNewRelease(newRelease, rnVersion, apptype) {
  if (apptype !== "cpp" && apptype !== "cs" && apptype !== "mac") {
    throw new Error("Must specify cpp or cs app type");
  }

  const appName = "RnDiffApp";
  const appBaseName = "app-base";

  const wtAppPath = path.resolve(__dirname, "wt-app");
  const appDir = path.resolve(__dirname, "wt-app", appName);

  runCmd(`git worktree add wt-app ${appBaseName}`);
  runCmd(`cd wt-app`);

  // clear any existing stuff
  try {
    runCmd(`rmdir /S /Q ${appName}`, wtAppPath);
  } catch {
    // Ignore failures
  }

  runCmd(`git pull`, wtAppPath);

  // make a new branch
  const branchName = `release/${apptype}/${newRelease}`;
  try {
    runCmd(`git branch -D "${branchName}"`, wtAppPath);
  } catch {
    // Ignore failures
  }
  runCmd(`git checkout -b "${branchName}"`, wtAppPath);

  runCmd(
    `npx --yes react-native init "${appName}" --template react-native@${rnVersion}`,
    wtAppPath
  );
  if (apptype === "mac") {
    runCmd(
      `npx --yes react-native-macos-init --version ${newRelease} --overwrite`,
      appDir
    );
  } else {
    runCmd(
      `npx --yes react-native-windows-init --version ${newRelease} --overwrite --language ${apptype}`,
      appDir
    );
    // Modify some files to prevent new guids being generated and showing up in the diffs
    runCmd(`node ../standardizeProj.js`, wtAppPath);
  }
  runCmd(`git add ${appName}`, wtAppPath);
  runCmd(`git commit -m "Release ${apptype}/${newRelease}"`, wtAppPath);
  runCmd(
    `git push origin --delete "${branchName}" || git push origin "${branchName}"`,
    wtAppPath
  );
  runCmd(`git push --set-upstream origin "${branchName}"`, wtAppPath);

  // go back to master
  runCmd(`rmdir /S /Q wt-app`);
  runCmd(`git worktree prune`);
}

let releasesWindows;
let releasesMac;
const releasesFileWindows = path.resolve(__dirname, "RELEASES");
const releasesFileMac = path.resolve(__dirname, "RELEASES_MAC");

/**
 * @param {boolean} [isMac] - get Mac releases instead of windows
 */
function getReleases(isMac) {
  if (!isMac) {
    if (!releasesWindows) {
      releasesWindows = readFileSync(releasesFileWindows)
        .toString()
        .split("\n")
        .map((_) => _.trim());
    }

    return releasesWindows;
  } else {
    if (!releasesMac) {
      releasesMac = readFileSync(releasesFileMac)
        .toString()
        .split("\n")
        .map((_) => _.trim());
    }

    return releasesMac;
  }
}

/**
 * @param {string} [rnwVersion]
 * @param {boolean} [mac] - mac vs windows
 */
function addReleaseToList(rnwVersion, mac) {
  getReleases(mac).push(rnwVersion);
  if (mac) {
    releasesMac = releasesMac
      .filter((a) => a)
      .sort((a, b) => 0 - semver.compare(a, b));
    writeFileSync(releasesFileMac, releasesMac.join("\n"));
  } else {
    releasesWindows = releasesWindows
      .filter((a) => a)
      .sort((a, b) => 0 - semver.compare(a, b));
    writeFileSync(releasesFileWindows, releasesWindows.join("\n"));
  }
}

/**
 * @param {string} [rnwVersion]
 * @param {boolean} [mac] - mac vs windows
 */
function versionAlreadyExists(rnwVersion, mac) {
  return getReleases(mac).indexOf(rnwVersion) >= 0;
}

/**
 * @param {string} [rnwVersion]
 * @param {'cs' | 'cpp' | 'mac'} [apptype]
 */
function generateDiffs(rnwVersion, apptype) {
  const wtDiffsDir = path.resolve(__dirname, "wt-diffs");

  if (!existsSync("wt-diffs")) {
    runCmd("git worktree add wt-diffs diffs");
  }

  if (!process.env.CI) {
    runCmd("git pull", wtDiffsDir);
  }

  if (!existsSync(path.resolve(wtDiffsDir, `diffs/${apptype}`))) {
    mkdirSync(path.resolve(wtDiffsDir, `diffs/${apptype}`), {recursive:true});
  }

  for (let existingRelease of getReleases(apptype === 'mac')) {
    console.log("processing " + existingRelease);
    if (existingRelease === rnwVersion) continue;
    runCmd(
      `git diff --binary origin/release/${apptype}/"${existingRelease}"..origin/release/${apptype}/"${rnwVersion}" > wt-diffs/diffs/${apptype}/"${existingRelease}".."${rnwVersion}".diff`
    );
    runCmd(
      `git diff --binary origin/release/${apptype}/"${rnwVersion}"..origin/release/${apptype}/"${existingRelease}" > wt-diffs/diffs/${apptype}/"${rnwVersion}".."${existingRelease}".diff`
    );
  }

  runCmd("git add .", wtDiffsDir);
  runCmd(`git commit -m "Add release ${rnwVersion} ${apptype} diffs"`, wtDiffsDir);
  runCmd("git push", wtDiffsDir);
}

module.exports = {
  addReleaseToList,
  createNewRelease,
  generateDiffs,
  versionAlreadyExists,
};