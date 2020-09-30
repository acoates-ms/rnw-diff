

const newRelease = '0.63.3';
const rnVersion = '^0.63';

const appName = 'RnDiffApp';
const appBaseName = 'app-base';

import {execSync} from 'child_process';

execSync(`git worktree add wt-app ${appBaseName}`);
execSync(`cd wt-app`);

// clear any existing stuff
execSync(`rmdir /S /Q ${appName}`);

execSync(`git pull`);

// make a new branch
const branchName = `release/cpp/${newRelease}`;
execSync(`git branch -D "${branchName}" || true`);
execSync(`git checkout -b "${branchName}"`);

execSync(`npx react-native init "${appName}" --template react-native@${rnVersion}`);
execSync(`cd ${appName}`);
execSync(`npx react-native-windows-init --version ${newRelease} --overwrite`);
execSync(`cd ..`);
execSync(`git add ${appName}`);
execSync(`git commit -m "Release cpp/${newRelease}"`);
execSync(`git push origin --delete "${branchName}" || git push origin "${branchName}"`);
execSync(`git push --set-upstream origin "${branchName}"`);

// go back to master
execSync(`cd ..`);
execSync(`rmdir /S /Q wt-app`);
execSync(`git worktree prune`);