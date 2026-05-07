const { randomBytes, pbkdf2Sync } = require('crypto')

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

const password = process.argv[2] || 'test123'
console.log(hashPassword(password))
