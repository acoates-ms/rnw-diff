// Run this after moving versions from RELEASES to RELEASES_ignored

const { getReleases } = require("./new-release-tools");
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

function purgeDiffs(isMac, rootdir) {
  const files = fs.readdirSync(rootdir);
  const releases = getReleases(isMac);

  files.forEach((file) => {
    let vers = file.split("..");
    if (vers.length > 1) {
      if (vers[1].endsWith(".diff")) {
        vers[1] = vers[1].slice(0, vers[1].length - 5);
      }
      if (!releases.includes(vers[0]) || !releases.includes(vers[1])) {
        fs.unlinkSync(path.resolve(rootdir, file));
        console.log(JSON.stringify(vers));
      }
    }
  });
}

function purgeReleaseBranches(isMac) {
  const releasesIgnoredFileWindows = path.resolve(
    __dirname,
    "RELEASES_ignored"
  );
  const releasesIgnoredFileMac = path.resolve(
    __dirname,
    "RELEASES_MAC_ignored"
  );

  const releasesIgnoredWindows = fs
    .readFileSync(isMac ? releasesIgnoredFileMac : releasesIgnoredFileWindows)
    .toString()
    .split("\n")
    .map((_) => _.trim());

  releasesIgnoredWindows.forEach((release) => {
    if (isMac) {
      try {
        child_process.execSync(
          `git push origin --delete release/mac/${release}`,
          { stdio: "inherit" }
        );
      } catch {}
    } else {
      try {
        child_process.execSync(
          `git push origin --delete release/cpp/${release}`,
          { stdio: "inherit" }
        );
      } catch {}

      try {
        child_process.execSync(
          `git push origin --delete release/cs/${release}`,
          { stdio: "inherit" }
        );
      } catch {}
    }
  });
}

purgeDiffs(false, 'E:\\repos\\rnw-diff\\wt-diffs\\diffs');
purgeDiffs(false, 'E:\\repos\\rnw-diff\\wt-diffs\\diffs\\cpp');
purgeDiffs(false, 'E:\\repos\\rnw-diff\\wt-diffs\\diffs\\cs');

purgeDiffs(true, 'E:\\repos\\rnw-diff\\wt-diffs\\diffs\\mac');

purgeReleaseBranches(false); // windows
purgeReleaseBranches(true); // mac
