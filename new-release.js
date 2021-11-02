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

function createNewRelease(newRelease, rnVersion, apptype) {
  if (apptype !== 'cpp' && apptype !== 'cs') {
    throw new Error('Must specify cpp or cs app type');
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
    `npx react-native init "${appName}" --template react-native@${rnVersion}`,
    wtAppPath
  );
  runCmd(
    `npx react-native-windows-init --version ${newRelease} --overwrite --language ${apptype}`,
    appDir
  );
  // Modify some files to prevent new guids being generated and showing up in the diffs
  runCmd(`node ../standardizeProj.js`, wtAppPath);
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

function usageAndExit() {
  console.log(`Usage: node ${process.argv[1]} <rnwVersion> [both|cpp|cs]`);
  console.log(`ex: node ${process.argv[1]} 0.63.3`);
  console.log(`ex: node ${process.argv[1]} 0.64.1 cpp`);
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
  releases = releases.filter(a => a).sort((a, b) => (0 - semver.compare(a,b)));
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

  if (!existsSync(path.resolve(wtDiffsDir, 'diffs/cpp'))) {
    mkdirSync(path.resolve(wtDiffsDir, 'diffs/cpp'));
  }
  if (!existsSync(path.resolve(wtDiffsDir, 'diffs/cs'))) {
    mkdirSync(path.resolve(wtDiffsDir, 'diffs/cs'));
  }

  for (let existingRelease of getReleases()) {
    console.log("processing " + existingRelease);
    if (existingRelease === rnwVersion) continue;
    // For legacy upgrade-helper, output the cpp diff to root dir too. Once upgrade-helper gets updated to support language option, remove this
    runCmd(
      `git diff --binary origin/release/cpp/"${existingRelease}"..origin/release/cpp/"${rnwVersion}" > wt-diffs/diffs/"${existingRelease}".."${rnwVersion}".diff`
    );
    // For legacy upgrade-helper, output the cpp diff to root dir too. Once upgrade-helper gets updated to support language option, remove this
    runCmd(
      `git diff --binary origin/release/cpp/"${rnwVersion}"..origin/release/cpp/"${existingRelease}" > wt-diffs/diffs/"${rnwVersion}".."${existingRelease}".diff`
    );
    runCmd(
      `git diff --binary origin/release/cpp/"${existingRelease}"..origin/release/cpp/"${rnwVersion}" > wt-diffs/diffs/cpp/"${existingRelease}".."${rnwVersion}".diff`
    );
    runCmd(
      `git diff --binary origin/release/cpp/"${rnwVersion}"..origin/release/cpp/"${existingRelease}" > wt-diffs/diffs/cpp/"${rnwVersion}".."${existingRelease}".diff`
    );
    runCmd(
      `git diff --binary origin/release/cs/"${existingRelease}"..origin/release/cs/"${rnwVersion}" > wt-diffs/diffs/cs/"${existingRelease}".."${rnwVersion}".diff`
    );
    runCmd(
      `git diff --binary origin/release/cs/"${rnwVersion}"..origin/release/cs/"${existingRelease}" > wt-diffs/diffs/cs/"${rnwVersion}".."${existingRelease}".diff`
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

  let apptype = 'both';
  if (process.argv.length == 4)
    apptype = process.argv[3];

  if (apptype !== 'both' && apptype !== 'cpp' && apptype !== 'cs') {
    usageAndExit();
  }

  const npmInfoCmd = `npm info react-native-windows@${rnwVersion} peerDependencies.react-native`;
  console.log("Running: " + npmInfoCmd);
  const rnRequiredVersion = execSync(npmInfoCmd).toString().trim();

  console.log('rnRequiredVersion: ' + rnRequiredVersion);

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

  guardExisting(rnwVersion);
  createNewRelease(rnwVersion, rnVersion, 'cpp');
  createNewRelease(rnwVersion, rnVersion, 'cs');
  generateDiffs(rnwVersion);
  addReleaseToList(rnwVersion);
}

run();
