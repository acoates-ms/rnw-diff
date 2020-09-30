// TODO Diffs need to ignore pfx files and android/ios dirs

const newRelease = "0.62.12";
const rnVersion = "^0.62";

const appName = "RnDiffApp";
const appBaseName = "app-base";

const { execSync } = require("child_process");
const path = require('path');
const wtAppPath = path.resolve(__dirname, 'wt-app');
const appDir = path.resolve(__dirname, 'wt-app', appName);

execSync(`git worktree add wt-app ${appBaseName}`, {stdio: 'inherit'});
execSync(`cd wt-app`);

// clear any existing stuff
try {
  execSync(`rmdir /S /Q ${appName}`, {cwd: wtAppPath, stdio: 'inherit'});
} catch {
  // Ignore failures
}

execSync(`git pull`, {cwd: wtAppPath, stdio: 'inherit'});

// make a new branch
const branchName = `release/cpp/${newRelease}`;
try {
  execSync(`git branch -D "${branchName}"`, {cwd: wtAppPath, stdio: 'inherit'});
} catch {
  // Ignore failures
}
execSync(`git checkout -b "${branchName}"`, {cwd: wtAppPath, stdio: 'inherit'});

execSync(
  `npx react-native init "${appName}" --template react-native@${rnVersion}`, {cwd: wtAppPath, stdio: 'inherit'}
);
execSync(`npx react-native-windows-init --version ${newRelease} --overwrite`, {cwd: appDir, stdio: 'inherit'});
// Modify some files to prevent new guids being generated and showing up in the diffs
execSync(`node ../standardizeProj.js`, {cwd: wtAppPath, stdio: 'inherit'});
execSync(`git add ${appName}`, {cwd: wtAppPath, stdio: 'inherit'});
execSync(`git commit -m "Release cpp/${newRelease}"`, {cwd: wtAppPath, stdio: 'inherit'});
execSync(
  `git push origin --delete "${branchName}" || git push origin "${branchName}"`, {cwd: wtAppPath, stdio: 'inherit'}
);
execSync(`git push --set-upstream origin "${branchName}"`, {cwd: wtAppPath, stdio: 'inherit'});

// go back to master
execSync(`rmdir /S /Q wt-app`);
execSync(`git worktree prune`);
