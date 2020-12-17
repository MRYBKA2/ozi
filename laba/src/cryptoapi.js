const { createHash, createDecipheriv, createCipheriv } = require('crypto');

const SALT = 'jibty735utwebfwy';
const IV = Buffer.alloc(16, SALT);

function makeMD5Hash(password) {
  return createHash('md5').update(password + SALT).toString();
};

exports.encryptAES = (str, password) => {
  const key = makeMD5Hash(password);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(Buffer.alloc(32, key)), IV);
  let encrypted = cipher.update(str);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {iv: IV.toString('hex'), data: encrypted.toString('hex')};
};

exports.decryptAES = (str, password) => {
	const iv = Buffer.from(str.iv, 'hex');
	const encryptedData = Buffer.from(str.data, 'hex');
	const key = makeMD5Hash(password);
	const decipher = createDecipheriv('aes-256-cbc', Buffer.from(Buffer.alloc(32, key)), IV);
	let decrypted = decipher.update(encryptedData);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
};