// @ts-check

const { readFileSync, writeFileSync } = require("fs");
// We always use this GUID to represent the apps project guid
const standardAppProjectGuid = "{UNIQUE00-APP0-GUID-GOES-HERE00000000}";

const appName = "RnDiffApp";
let projectGuid = "";

function standardizeSolutionFile() {
  const slnFilePath = `./${appName}/windows/${appName}.sln`;
  const sln = readFileSync(slnFilePath);
  const reg = new RegExp(
    `Project.*"${appName}", "${appName}\\\\${appName}.vcxproj", "(.*)"`,
    "m"
  );
  const matches = reg.exec(sln.toString());

  projectGuid = matches[1];

  if (!projectGuid) {
    throw new Error("Failed to find app projects guid");
  }

  // Replace all the guids with the standard one
  writeFileSync(
    slnFilePath,
    sln.toString().replace(new RegExp(projectGuid, "g"), standardAppProjectGuid)
  );
}

function standardizeAppsProjectFile() {
  const appProjPath = `./${appName}/windows/${appName}/${appName}.vcxproj`;
  const appProj = readFileSync(appProjPath);

  writeFileSync(
    appProjPath,
    appProj
      .toString()
      .replace(
        new RegExp(`<ProjectGuid>.*</ProjectGuid>`),
        `<ProjectGuid>${standardAppProjectGuid}</ProjectGuid>`
      )
      .replace(
        new RegExp(
          `<PackageCertificateThumbprint>.*</PackageCertificateThumbprint>`
        ),
        "<PackageCertificateThumbprint>UniqueThumbPrintHere</PackageCertificateThumbprint>"
      )
  );
}

function standardizeAppxManifest() {
  const appxManPath = `./${appName}/windows/${appName}/Package.appxmanifest`;
  const appxMan = readFileSync(appxManPath);

  console.log(appxMan.toString());

  writeFileSync(
    appxManPath,
    appxMan
      .toString()
      .replace(
        new RegExp(
          `<Identity[\r\n\t ]+Name="[^"]*"[\r\n\t ]+Publisher="[^"]*"`,
          "gms"
        ),
        '<Identitiy Name="AppSpecificNameHere" Publisher="AppSpecificPublisherHere"'
      ).replace(
        new RegExp(
          `<PublisherDisplayName>.*</PublisherDisplayName>`,
          "gms"
        ),
        '<PublisherDisplayName>AppSpecificPublisherNameHere</PublisherDisplayName>'
      )
  );
}

standardizeSolutionFile();
standardizeAppsProjectFile();
standardizeAppxManifest();
