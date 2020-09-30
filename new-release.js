// TODO Diffs need to ignore pfx files and android/ios dirs

const newRelease = "0.63.3";
const rnVersion = "^0.63";

const appName = "RnDiffApp";
const appBaseName = "app-base";

const { execSync } = require("child_process");

execSync(`git worktree add wt-app ${appBaseName}`);
execSync(`cd wt-app`);

// clear any existing stuff
try {
  execSync(`rmdir /S /Q ${appName}`);
} catch {
  // Ignore failures
}

execSync(`git pull`);

// make a new branch
const branchName = `release/cpp/${newRelease}`;
try {
  execSync(`git branch -D "${branchName}"`);
} catch {
  // Ignore failures
}
execSync(`git checkout -b "${branchName}"`);

execSync(
  `npx react-native init "${appName}" --template react-native@${rnVersion}`
);
execSync(`cd ${appName}`);
execSync(`npx react-native-windows-init --version ${newRelease} --overwrite`);
// Modify some files to prevent new guids being generated and showing up in the diffs
execSync(`node standardizeProj.js`);
execSync(`cd ..`);
execSync(`git add ${appName}`);
execSync(`git commit -m "Release cpp/${newRelease}"`);
execSync(
  `git push origin --delete "${branchName}" || git push origin "${branchName}"`
);
execSync(`git push --set-upstream origin "${branchName}"`);

// go back to master
execSync(`cd ..`);
execSync(`rmdir /S /Q wt-app`);
execSync(`git worktree prune`);
