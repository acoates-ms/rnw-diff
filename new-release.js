// @ts-check
const { readFileSync, writeFileSync, existsSync } = require("fs");
// TODO Diffs need to ignore pfx files and android/ios dirs

const path = require("path");
const { execSync } = require("child_process");

function runCmd(cmd, cwd) {
  console.log("Running: " + cmd);
  const opts = cwd ? { cwd: cwd, stdio: "inherit" } : { stdio: "inherit" };
  return execSync(cmd, opts).toString();
}

function createNewRelease(newRelease, rnVersion) {
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
  const branchName = `release/cpp/${newRelease}`;
  try {
    runCmd(`git branch -D "${branchName}"`, wtAppPath);
  } catch {
    // Ignore failures
  }
  runCmd(`git checkout -b "${branchName}"`, wtAppPath);

  runCmd(
    `npx react-native init "${appName}" --template react-native@${rnVersion}`,
    wtAppPath
  );
  runCmd(
    `npx react-native-windows-init --version ${newRelease} --overwrite`,
    appDir
  );
  // Modify some files to prevent new guids being generated and showing up in the diffs
  runCmd(`node ../standardizeProj.js`, wtAppPath);
  runCmd(`git add ${appName}`, wtAppPath);
  runCmd(`git commit -m "Release cpp/${newRelease}"`, wtAppPath);
  runCmd(
    `git push origin --delete "${branchName}" || git push origin "${branchName}"`,
    wtAppPath
  );
  runCmd(`git push --set-upstream origin "${branchName}"`, wtAppPath);

  // go back to master
  runCmd(`rmdir /S /Q wt-app`);
  runCmd(`git worktree prune`);
}

function usageAndExit() {
  console.log(`Usage: node ${process.argv[1]} <rnwVersion>`);
  console.log(`ex: node ${process.argv[1]} 0.63.3`);
  process.exit(1);
}

let releases;
const releasesFile = path.resolve(__dirname, "RELEASES");
function getReleases() {
  if (!releases) {
    releases = readFileSync(releasesFile)
      .toString()
      .split("\n")
      .map((_) => _.trim());
  }

  return releases;
}

function addReleaseToList(rnwVersion) {
  getReleases().push(rnwVersion);
  releases = releases.sort();
  writeFileSync(releasesFile, releases.join("\n"));
}

function guardExisting(rnwVersion) {
  if (getReleases().indexOf(rnwVersion) >= 0) {
    console.error(`Already generated diff for ${rnwVersion}`);
    process.exit(0);
  }
}

function generateDiffs(rnwVersion) {
  const wtDiffsDir = path.resolve(__dirname, "wt-diffs");

  if (!existsSync("wt-diffs")) {
    runCmd("git worktree add wt-diffs diffs");
  }

  runCmd("git pull", wtDiffsDir);

  for (let existingRelease of getReleases()) {
    console.log("processing " + existingRelease);
    if (existingRelease === rnwVersion) continue;
    runCmd(
      `git diff --binary origin/release/cpp/"${existingRelease}"..origin/release/cpp/"${rnwVersion}" > wt-diffs/diffs/"${existingRelease}".."${rnwVersion}".diff`
    );
    runCmd(
      `git diff --binary origin/release/cpp/"${rnwVersion}"..origin/release/cpp/"${existingRelease}" > wt-diffs/diffs/"${rnwVersion}".."${existingRelease}".diff`
    );
  }

  runCmd("git add .", wtDiffsDir);
  runCmd(`git commit -m "Add release ${rnwVersion} diffs"`, wtDiffsDir);
  runCmd("git push", wtDiffsDir);
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

  const rnVersion = runCmd(`npm info react-native-windows@${rnwVersion} peerDependencies.react-native`);

  guardExisting(rnwVersion);
  createNewRelease(rnwVersion, rnVersion);
  // No-one using diffs right now
  //generateDiffs(rnwVersion);
  addReleaseToList(rnwVersion);
}

run();
