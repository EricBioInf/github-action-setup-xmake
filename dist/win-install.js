"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winInstall = void 0;
const core = require("@actions/core");
const exec_1 = require("@actions/exec");
const io = require("@actions/io");
const toolCache = require("@actions/tool-cache");
const os = require("os");
const path = require("path");
const semver = require("semver");
function getInstallerUrl(version) {
    const ver = version.version;
    switch (version.type) {
        case 'heads': {
            // we only use appveyor ci artifacts for branch version
            const arch = os.arch() === 'x64' ? 'x64' : 'x86';
            return `https://ci.appveyor.com/api/projects/waruqi/xmake/artifacts/xmake-installer.exe?branch=${ver}&pr=false&job=Image%3A+Visual+Studio+2017%3B+Platform%3A+${arch}`;
        }
        case 'pull': {
            throw new Error('PR builds for windows is not supported');
        }
        case 'sha': {
            throw new Error('Sha builds for windows is not supported');
        }
        case 'tags': {
            // we cannot use appveyor ci artifacts, the old version links may be broken.
            const arch = os.arch() === 'x64' ? 'win64' : 'win32';
            return semver.gt(ver, '2.2.6')
                ? `https://github.com/xmake-io/xmake/releases/download/${ver}/xmake-${ver}.${arch}.exe`
                : `https://github.com/xmake-io/xmake/releases/download/${ver}/xmake-${ver}.exe`;
        }
        default: {
            // check that we have tested all types
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ = version.type;
            throw new Error('Unknown version type');
        }
    }
}
async function winInstall(version) {
    const ver = version.version;
    let toolDir = toolCache.find('xmake', ver);
    if (!toolDir) {
        const installer = await core.group(`download xmake ${String(version)}`, async () => {
            const url = getInstallerUrl(version);
            core.info(`downloading from ${url}`);
            const file = await toolCache.downloadTool(url);
            const exe = path.format({ ...path.parse(file), ext: '.exe', base: undefined });
            await io.mv(file, exe);
            core.info(`downloaded to ${exe}`);
            return exe;
        });
        toolDir = await core.group(`install xmake ${String(version)}`, async () => {
            const binDir = path.join(os.tmpdir(), `xmake-${version.sha}`);
            core.info(`installing to ${binDir}`);
            await exec_1.exec(`"${installer}" /NOADMIN /S /D=${binDir}`);
            core.info(`installed to ${binDir}`);
            const cacheDir = await toolCache.cacheDir(binDir, 'xmake', ver);
            await io.rmRF(binDir);
            await io.rmRF(installer);
            return cacheDir;
        });
    }
    core.addPath(toolDir);
}
exports.winInstall = winInstall;
