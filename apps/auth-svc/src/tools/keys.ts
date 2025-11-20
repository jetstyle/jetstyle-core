import { Buffer } from 'buffer'
import { generateKeyPairSync } from 'node:crypto'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',      // Recommended for RSA public keys
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',     // Recommended for RSA private keys
    format: 'pem',
  },
})

// console.log('Private Key:', privateKey)
// console.log('Public Key:', publicKey)

// Assuming you have the `privateKey` and `publicKey` variables from the previous step
const privateKeyBase64 = Buffer.from(privateKey, 'utf8').toString('base64')
const publicKeyBase64 = Buffer.from(publicKey, 'utf8').toString('base64')

console.log('\n')
console.log('private key:', privateKeyBase64)
console.log('\n')
console.log('public key:', publicKeyBase64)
