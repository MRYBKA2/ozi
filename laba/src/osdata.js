const path = require('path');
const os = require('os');
const {exec, execSync} = require('child_process');
const util = require('util');
const execCB = util.promisify(exec);

function getUsername() {
	return os.userInfo().username;
}
function getComputerName() {
	return os.hostname();
}
function getWindowsDirectory() {
	const stdout = execSync('echo %WINDIR%').toString();
	return stdout.trim().replace(/\n/g, '');
}
function getSystemDirectory() {
	const stdout = execSync('echo %comspec%').toString();
	return stdout.trim().replace('cmd.exe', '').replace(/\n/g, '');
}
function getScreenWidth() {
	const stdout = execSync('wmic path Win32_VideoController get CurrentHorizontalResolution').toString();
	return stdout.trim().replace('CurrentHorizontalResolution', '').replace(/(?:\\[rns]|[\r\n\s]+)+/g, '');
}
function getDisks() {
	const stdout = execSync('wmic diskdrive get model').toString();
	return stdout.trim().replace('Model', '').replace(/(?:\\[rns]|[\r\n\s]+)+/g, '');
}
function getRootDirectory(){
	return path.parse(__dirname).root;
}

exports.getData = () => {
	const userName = getUsername();
	const pcName = getComputerName();
	const osDir = getWindowsDirectory();
	const sysDir = getSystemDirectory();
	const scrw = getScreenWidth();
	const disks = getDisks();
	const root = getRootDirectory();
	const data = {
		userName,
		pcName,
		osDir,
		sysDir,
		scrw,
		disks,
		root
	}
	return JSON.stringify(data);
}