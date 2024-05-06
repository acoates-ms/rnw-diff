
const { execSync } = require("child_process");

function runCmd(cmd) {
  console.log("Running: " + cmd);
  const buf = execSync(cmd);
  if (!buf) {
    return '';
  }
  return buf.toString();
}

if (runCmd('git diff .\\RELEASES') === '') {
    console.log('No RELEASES changes.');
} else {
    console.log('Changed found in RELEASES.');
    runCmd('git add .\\RELEASES');
    runCmd('git commit -m "Update RELEASES"');
}

if (runCmd('git diff .\\RELEASES_MAC') === '') {
    console.log('No RELEASES_MAC changes.');
} else {
    console.log('Changed found in RELEASES_MAC.');
    runCmd('git add .\\RELEASES_MAC');
    runCmd('git commit -m "Update RELEASES_MAC"');
}