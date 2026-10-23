/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Decrypt a Delta Chat sample: RFC 9580 PKESK v6 with an anonymous
 * recipient (zero-length key fingerprint) and SEIPDv2 (AES-OCB),
 * encrypted to a v4 Cv25519 key.
 *
 * The message and key are throwaway fixtures. Decryption goes through
 * RNP.decrypt(), which sets RNP_VERIFY_ALLOW_HIDDEN_RECIPIENT.
 */

"use strict";

const { RNP } = ChromeUtils.importESModule(
  "chrome://openpgp/content/modules/RNP.sys.mjs"
);
const { EnigmailConstants } = ChromeUtils.importESModule(
  "chrome://openpgp/content/modules/constants.sys.mjs"
);
const { OpenPGPTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/mail/OpenPGPTestUtils.sys.mjs"
);

const PLAINTEXT = "hello from deltachat core";

add_setup(async function () {
  do_get_profile();
  // Resolved once, when RNPLib is first loaded.
  Services.prefs.setBoolPref("mail.openpgp.use_rnp_experimental", true);
  await OpenPGPTestUtils.initOpenPGP();
  Assert.ok(
    RNP.getRNPLibStatus().path.includes("rnp_experimental"),
    `the experimental RNP library should be loaded, got ${RNP.getRNPLibStatus().path}`
  );

  await OpenPGPTestUtils.importPrivateKey(
    null,
    do_get_file("data/sec.asc"),
    OpenPGPTestUtils.ACCEPTANCE_PERSONAL,
    null
  );
});

/**
 * Anonymous v6 PKESK + SEIPDv2 decrypts to the fixture plaintext and is
 * reported as integrity protected.
 */
add_task(async function test_decryptsAnonymousV6Pkesk() {
  const bytes = await IOUtils.read(do_get_file("data/msg_v2.asc").path);
  const encrypted = String.fromCharCode(...bytes);

  const result = await RNP.decrypt(encrypted, {
    fromAddr: "tester@example.org",
    maxOutputLength: encrypted.length * 100,
    noOutput: false,
    uiFlags: EnigmailConstants.UI_PGP_MIME,
    verifyOnly: false,
    msgDate: null,
  });

  Assert.equal(result.exitCode, 0, "RNP.decrypt() should succeed");
  Assert.equal(
    result.decryptedData,
    PLAINTEXT,
    "decrypted plaintext should match the Delta Chat fixture"
  );
  Assert.ok(
    result.statusFlags & EnigmailConstants.DECRYPTION_OKAY,
    "DECRYPTION_OKAY should be set"
  );
  Assert.ok(
    result.extStatusFlags & EnigmailConstants.EXT_INTEGRITY_PROTECTED,
    "SEIPDv2 should be reported as integrity protected"
  );
});
