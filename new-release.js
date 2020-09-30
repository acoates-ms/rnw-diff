// @ts-check
const { readFileSync, writeFileSync, existsSync } = require("fs");
// TODO Diffs need to ignore pfx files and android/ios dirs

const path = require('path');
const { execSync } = require("child_process");


function createNewRelease(newRelease, rnVersion) {
  const appName = "RnDiffApp";
  const appBaseName = "app-base";

  const wtAppPath = path.resolve(__dirname, "wt-app");
  const appDir = path.resolve(__dirname, "wt-app", appName);

  execSync(`git worktree add wt-app ${appBaseName}`, { stdio: "inherit" });
  execSync(`cd wt-app`);

  // clear any existing stuff
  try {
    execSync(`rmdir /S /Q ${appName}`, { cwd: wtAppPath, stdio: "inherit" });
  } catch {
    // Ignore failures
  }

  execSync(`git pull`, { cwd: wtAppPath, stdio: "inherit" });

  // make a new branch
  const branchName = `release/cpp/${newRelease}`;
  try {
    execSync(`git branch -D "${branchName}"`, {
      cwd: wtAppPath,
      stdio: "inherit",
    });
  } catch {
    // Ignore failures
  }
  execSync(`git checkout -b "${branchName}"`, {
    cwd: wtAppPath,
    stdio: "inherit",
  });

  execSync(
    `npx react-native init "${appName}" --template react-native@${rnVersion}`,
    { cwd: wtAppPath, stdio: "inherit" }
  );
  execSync(
    `npx react-native-windows-init --version ${newRelease} --overwrite`,
    { cwd: appDir, stdio: "inherit" }
  );
  // Modify some files to prevent new guids being generated and showing up in the diffs
  execSync(`node ../standardizeProj.js`, { cwd: wtAppPath, stdio: "inherit" });
  execSync(`git add ${appName}`, { cwd: wtAppPath, stdio: "inherit" });
  execSync(`git commit -m "Release cpp/${newRelease}"`, {
    cwd: wtAppPath,
    stdio: "inherit",
  });
  execSync(
    `git push origin --delete "${branchName}" || git push origin "${branchName}"`,
    { cwd: wtAppPath, stdio: "inherit" }
  );
  execSync(`git push --set-upstream origin "${branchName}"`, {
    cwd: wtAppPath,
    stdio: "inherit",
  });

  // go back to master
  execSync(`rmdir /S /Q wt-app`);
  execSync(`git worktree prune`);
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
    releases = readFileSync(releasesFile).toString().split("\n");
  }

  return releases;
}

function addReleaseToList(rnwVersion) {
  getReleases().push(rnwVersion);
  releases = releases.sort();
  writeFileSync(releasesFile, releases.join('\n'));
}

function guardExisting(rnwVersion) {
  if(getReleases().indexOf(rnwVersion) >= 0)
  {
    console.error(`Already generated diff for ${rnwVersion}`);
    process.exit(1);
  }
}


function generateDiffs () {
  const wtDiffsDir = path.resolve(__dirname, 'wt-diffs');

  if (!existsSync('wt-diffs')) {
    execSync('git worktree add wt-diffs diffs', {stdio: 'inherit'});
  }

  execSync('git pull', {cwd: wtDiffsDir, stdio:'inherit'})

  for(let release in getReleases()) {
    console.log('processing ' + releases);
  }
/*
  IFS=$'\n' GLOBIGNORE='*' command eval 'releases=($(cat "$ReleasesFile"))'
  for existingRelease in "${releases[@]}"
  do
      git diff --binary origin/release/"$existingRelease"..origin/release/"$newRelease" > wt-diffs/diffs/"$existingRelease".."$newRelease".diff
      git diff --binary origin/release/"$newRelease"..origin/release/"$existingRelease" > wt-diffs/diffs/"$newRelease".."$existingRelease".diff
  done

  cd wt-diffs
  git add .
  git commit -m "Add release $newRelease diffs"
  git push
  cd ..
  */
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

  // For RNW 0.62.3 use RN ^0.62.0
  const rnVersion = `^${matches[1]}.${matches[2]}.0`;

  guardExisting(rnwVersion);
  //createNewRelease(rnwVersion, rnVersion);
  addReleaseToList(rnwVersion);
  generateDiffs();
}

run();
