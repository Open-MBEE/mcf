/**
 * @classification UNCLASSIFIED
 *
 * @module  test.202-lib-sani
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Leah De Laurell
 * @author Austin Bieber
 *
 * @description Tests the sanitization module and each of its functions.
 */

// NPM modules
const chai = require('chai');

// MBEE modules
const sani = M.require('lib.sanitization');

/* --------------------( Main )-------------------- */
/**
 * The "describe" function is provided by Mocha and provides a way of wrapping
 * or grouping several "it" tests into a single group. In this case, the name of
 * that group (the first parameter passed into describe) is derived from the
 * name of the current file.
 */
describe(M.getModuleName(module.filename), () => {
  it('should sanitize html inputs by user', htmlTest);
  it('should sanitize a JSON object for html input', sanitizeHtmlObject);
  it('should not sanitize the allowed exceptions', sanitizeAllowedCharacters);
  it('should sanitize an LDAP filter', sanitizeLDAP);
});

/* --------------------( Tests )-------------------- */
/**
 * @description Tests the html sanitation with html input.
 * Expected to change the html input.
 * Same thing occurring in a test more than once.
 */
async function htmlTest() {
  const htmlLessThan = sani.html('<script>');
  const htmlQuote = sani.html("'OR 1=1");
  const htmlDoubleQuote = sani.html('"double it up');
  const htmlNull = sani.html(null);
  const htmlBool = sani.html(false);
  chai.expect(htmlLessThan).to.equal('&lt;script&gt;');
  chai.expect(htmlQuote).to.equal('&#039;OR 1=1');
  chai.expect(htmlDoubleQuote).to.equal('&quot;double it up');
  chai.expect(htmlNull).to.equal(null);
  chai.expect(htmlBool).to.equal(false);
}

/**
 * @description Test sanitation of a JSON Object.
 */
async function sanitizeHtmlObject() {
  const data = {
    name: 'First Last',
    fname: '<script>',
    lname: '</script>',
    admin: true,
    email: null
  };
  const htmlSan = sani.html(data);
  chai.expect(htmlSan.name).to.equal('First Last');
  chai.expect(htmlSan.fname).to.equal('&lt;script&gt;');
  chai.expect(htmlSan.lname).to.equal('&lt;/script&gt;');
  chai.expect(htmlSan.admin).to.equal(true);
  chai.expect(htmlSan.email).to.equal(null);
}

/**
 * @description Should attempt to sanitize &amp; and other allowed exceptions.
 */
async function sanitizeAllowedCharacters() {
  const s = 'this string has &amp;, &lt;, &nbsp; and  but also &sample';
  const expected = 'this string has &amp;, &lt;, &nbsp; and  but also &amp;sample';
  const htmlSan = sani.html(s);
  chai.expect(htmlSan).to.equal(expected);
}

/**
 * @description Should attempt to sanitize ldap special filter chars.
 */
async function sanitizeLDAP() {
  const s = 'test1 \\ test2 * test3 ( test4 ) test5 NUL';
  const expected = 'test1 \\2A test2 \\28 test3 \\29 test4 \\5C test5 \\00';
  const ldapSan = sani.ldapFilter(s);
  chai.expect(ldapSan).to.equal(expected);
}
