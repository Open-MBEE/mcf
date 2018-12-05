/**
 * Classification: UNCLASSIFIED
 *
 * @module  test.201-lib-crypto
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Tests loading the MBEE crypto library and executing the encrypt
 * and decrypt functions in the library.
 */

// Node modules
const chai = require('chai');

// MBEE modules
const mbeeCrypto = M.require('lib.crypto');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should have encrypt and decrypt functions', checkCryptoFunctions);
  it('should encrypt and decrypt a message', encryptTest);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Checks that the crypto library has encrypt and decrypt
 * functions.
 */
function checkCryptoFunctions(done) {
  chai.expect(mbeeCrypto.hasOwnProperty('encrypt')).to.equal(true);
  chai.expect(mbeeCrypto.hasOwnProperty('decrypt')).to.equal(true);
  chai.expect(typeof mbeeCrypto.encrypt).to.equal('function');
  chai.expect(typeof mbeeCrypto.decrypt).to.equal('function');
  done();
}


/**
 * @description Encrypts and decrypts a string message. Expected to pass by
 * returning 'TEST 1 2 3' after encrypting and decrypting.
 */
function encryptTest(done) {
  const encrypted = mbeeCrypto.encrypt('TEST 1 2 3');
  const decrypted = mbeeCrypto.decrypt(encrypted);
  chai.expect(encrypted).to.not.equal('TEST 1 2 3');
  chai.expect(decrypted).to.equal('TEST 1 2 3');
  done();
}
