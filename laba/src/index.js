const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const {checkUsersFile} = require('./check');
const {saveOneTime, getOneTime} = require('./onetime');
const dataFile = checkUsersFile();
const file = require(__dirname+'/'+dataFile);
const { createHash, createVerify, createSign } = require('crypto');	
const { getData } = require('./osdata');
const regedit = require('regedit');

const { encryptAES, decryptAES } = require('./cryptoapi');
const word = getOneTime();
const users = JSON.parse(decryptAES(file,word));

const {handleSquirrelEvent} = require('./installer');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (handleSquirrelEvent()) { // eslint-disable-line global-require
	return;
}

// 1. Generate new private RSA Key:
// openssl req -newkey rsa:2048 -new -nodes -keyout key.pem -out csr.pem

// 2. Derivate public RSA Key from private:
// openssl rsa -in key.pem -out public_key.pem -outform PEM -pubout

regedit.arch.list32('HKCU\\Software\\Rybka').on('data', function(entry) {
	const publicKey = fs.readFileSync(__dirname+'/key.pub');
	const hash = createHash('md5').update(getData()).digest('hex');
	const sign = entry.data.values.Signature.value;
	const isValid = createVerify('sha256').update(hash).verify(publicKey, sign.toString(), 'hex');
	if (!isValid) {
		dialog.showErrorBox('Sign invalid!', 'Your personal signature is invalid.');
		app.quit();
	}
})

let mainWindow;
let changePhraseWindow;
let loggedIn = false;
let passEnterCounter = 0;
let passPhrase = "";


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
	resizable: false,
	webPreferences: {
		nodeIntegration: true
	}
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  // Insert menu
  Menu.setApplicationMenu(mainMenu);
  
};


const createChangePhraseWindow = () => {
	changePhraseWindow = new BrowserWindow({
		width: 300,
		height: 150,
		resizable: false,
		closable: false,
		webPreferences: {
			nodeIntegration: true
		},
		title: 'Change encryption onetime key'
	})
	mainWindow.setEnabled(false);
	
	changePhraseWindow.loadFile(path.join(__dirname, 'passphrase.html'));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

function refreshUsername() {
	let buffer = [];
	users.forEach((user) => {
		let username = user.user;
		if (user.blocked) {
			username = username + '🔴';
		}
		if (user.restrictions) {
			username = username + '🚩';
		}
		buffer.push(username);
	})
	return buffer;
}
function saveUsers() {
	const buff = JSON.stringify(users);
	if (passPhrase == "") {
		passPhrase = word;
	}
	let encryptData = encryptAES(buff, passPhrase);
	fs.writeFileSync(__dirname+'/'+dataFile, JSON.stringify(encryptData));
	saveOneTime(passPhrase);
}

ipcMain.on('dom:loaded', (e, loaded) => {
	mainWindow.webContents.send('login:checked', loggedIn);
	mainWindow.webContents.send('users:refresh', refreshUsername());
})

ipcMain.on('login:proceed', (e, username, password) => {
	users.forEach((user) => {
		if (user.user == username) {
			if(user.password == password) {
				if(user.blocked) {
					mainWindow.webContents.send('login:failed', 'You are blocked!');
					return;
				};
				loggedIn = true;
				mainWindow.webContents.send('login:success', loggedIn);
				return;
			}
			else {
				mainWindow.webContents.send('login:failed', 'Incorrect password!');
				passEnterCounter++;
				return;
			}
		} 
	})
	if (passEnterCounter >= 3)
		app.quit();

})


ipcMain.on('user:add', (e, username) => {
	let newUser = {
		"user": username,
		"password": "",
		"blocked": 0,
		"restrictions": 0
	}
	let userExists = false;
	users.forEach((user) => {
		if(user.user == username) {
			userExists = true;
		}
	});
	if (userExists) {
		mainWindow.webContents.send('user:exists', username);
		return;
	}
	users.push(newUser);
	mainWindow.webContents.send('users:refresh', refreshUsername());
})

ipcMain.on('user:block', (e, userId) => {
	if(users[userId].blocked == 1) return;
	users[userId].blocked = 1;
	mainWindow.webContents.send('users:refresh', refreshUsername());
})
ipcMain.on('user:unblock', (e, userId) => {
	if(users[userId].blocked == 0) return;
	users[userId].blocked = 0;
	mainWindow.webContents.send('users:refresh', refreshUsername());
})
ipcMain.on('user:unrestrict', (e, userId) => {
	if(users[userId].restrictions == 0) return;
	users[userId].restrictions = 0;
	mainWindow.webContents.send('users:refresh', refreshUsername());
})
ipcMain.on('user:restrict', (e, userId) => {
	if(users[userId].restrictions == 1) return;
	users[userId].restrictions = 1;
	mainWindow.webContents.send('users:refresh', refreshUsername());
})

ipcMain.on('password:change', (e, oldPassword, newPassword, username) => {
	users.forEach((user) => {
		if(user.user == username) {
			if(user.password == oldPassword) {
				user.password = newPassword;
			} else {
				mainWindow.webContents.send('password:change-failed');
				return;
			}
		}
	})
})

ipcMain.on('restrictions:check', (e, username) => {
	users.forEach((user) => {
		if(user.user == username){
			if (user.restrictions == 1)
				mainWindow.webContents.send('restrictions:cheked', true);
			if(user.restrictions == 0)
				mainWindow.webContents.send('restrictions:cheked', false);
		}
	})
})

ipcMain.on('passphrase:openWindow', (e) => {
	createChangePhraseWindow();
})

ipcMain.on('passphrase:change', (e, phrase) => {
	passPhrase = phrase;
	changePhraseWindow.destroy();
	mainWindow.setEnabled(true);
	mainWindow.focus();
})

ipcMain.on('app:quit', (e) => {
	saveUsers();
	app.quit();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
	saveUsers();
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const mainMenuTemplate =  [
  // Each object is a dropdown
];

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
