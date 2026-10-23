# Thunderbird
Thunderbird is a powerful and customizable open source email client with many users. It is based on the same platform that Firefox uses.

## Getting Started
This README will try and give you the basics that you need to get started, more comprehensive documentation is available on the [Thunderbird Developer Website](https://developer.thunderbird.net).

We also have documentation from this repository in a rendered version at [Thunderbird Source Tree Documentation](https://source-docs.thunderbird.net/en/latest/).

### Mozilla Code Base
Thunderbird is built on the Mozilla platform, the same base that Firefox is built from. As such, the two projects share a lot of code and much of the documentation for one will apply to the other.

In order to be able to build Thunderbird - you will need the [Firefox repository](https://github.com/mozilla-firefox/firefox) as well as the [Thunderbird repository](https://github.com/thunderbird/thunderbird-desktop) (where this README lives). Check out our [Getting Started documentation](https://developer.thunderbird.net/thunderbird-development/getting-started) for instructions on how and where to get the source code.

### Firefox vs Thunderbird Source Code
The Firefox repository contains the Firefox codebase and all of the platform code. The Thunderbird repository is added as a subdirectory "comm/" under Firefox. This contains the code for Thunderbird.

## Building Thunderbird
Follow the [Building Thunderbird guide](https://developer.thunderbird.net/thunderbird-development/building-thunderbird) to get set up and build Thunderbird.

## Delta Chat / RFC 9580 decryption (this fork)

This fork decrypts OpenPGP mail that uses RFC 9580 PKESK version 6 and
SEIPDv2 (AES-OCB), including anonymous recipients and messages encrypted
to a v4 Cv25519 key. Delta Chat sends mail in that form. The work is
local to this repository. Nothing here is an upstream Thunderbird or RNP
submission.

What changed:

- `third_party/rnp_experimental` is built with `ENABLE_CRYPTO_REFRESH` and
  `ENABLE_PQC`. SEIPDv2 comes from `v2_seipd.cpp`. ML-DSA and SLH-DSA, which
  that flag combination compiles in, are covered by the Botan modules
  `ml_dsa` and `slh_dsa_shake`.
- A local RNP patch for anonymous v6 PKESK packets is applied to that tree
  and recorded in `third_party/patches/rnp_experimental/dc-v6-pkesk.patch`
  (`third_party/rnp_experimental/moz.yaml` lists it for `mach vendor`).
- `RNP.decrypt()` passes `RNP_VERIFY_ALLOW_HIDDEN_RECIPIENT`. Anonymous v6
  packets have an empty fingerprint; the patch turns that into the empty
  key id this flag already understands.
- The experimental library is built and packaged on every update channel,
  not only Nightly. `mail.openpgp.use_rnp_experimental` defaults to `true`.
  Set it to `false` and restart to load the stable RNP 0.18.1 library
  instead. v6 mail will not decrypt with the stable library.

A full application build needs mozilla-central as the parent tree. This
checkout is only the `comm/` repository.

### macOS build

Artifact builds do not compile `librnp_experimental`, so they will not
contain this change. Do not pass `--enable-artifact-builds`, and do not
pass `--with-system-librnp`.

```bash
git clone https://github.com/mozilla-firefox/firefox thunderbird
cd thunderbird
git clone https://github.com/r404r/releases-comm-central comm
cd comm
git checkout <this-branch>
cd ..

./mach bootstrap
```

When bootstrap asks which product to build, choose Thunderbird. Then, in
the mozilla-central directory, create `mozconfig`:

```
ac_add_options --enable-project=comm/mail
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/obj-tb-darwin
```

The default crypto backend is Botan, which is what this fork expects.
OpenSSL is Linux-only and is not the macOS path.

```bash
./mach build
./mach run
```

If an existing objdir was configured before this branch, run
`./mach configure` again (or delete `obj-tb-darwin/comm/third_party/botan`)
so Botan is rebuilt with `ml_dsa` and `slh_dsa_shake`.

`./mach run` starts the objdir build on the machine that compiled it. It
does not need a Developer ID.

### macOS signing

A local build can run unsigned or ad-hoc signed. Gatekeeper on another
Mac will reject it until the app is signed with a Developer ID
Application certificate, notarized, and stapled. This fork does not ship
a signing identity.

The experimental library adds nested binaries that must be signed
inside-out, before the outer `.app`, or `codesign` of the bundle fails:

- `Contents/MacOS/librnp_experimental.dylib` (also matched by the
  existing `*.dylib` rule, with no extra entitlement)
- `Contents/MacOS/rnp-cli-experimental`
- `Contents/MacOS/rnpkeys-experimental`

Those CLI tools used to be packaged and signed only for Nightly. This
fork packages them on every channel. `taskcluster/config.yml` signs them
on every channel as well. The dylib does not need its own entitlement.
The main executable still needs Thunderbird's existing entitlements
(hardened runtime, library validation). Copy those from the Firefox
tree's `security/` entitlements rather than signing the outer app with
an empty entitlement set.

Ad-hoc signature, after `./mach package`, using the `.app` under the
objdir `dist/` directory (the product name follows the branding, often
Daily for an unofficial build):

```bash
APP=obj-tb-darwin/dist/Daily.app
codesign --force --sign - "$APP/Contents/MacOS/librnp_experimental.dylib"
codesign --force --sign - "$APP/Contents/MacOS/rnp-cli-experimental"
codesign --force --sign - "$APP/Contents/MacOS/rnpkeys-experimental"
codesign --force --sign - "$APP"
```

Replace `-` with a Developer ID identity for a build you want to move to
another Mac, then notarize with `notarytool` and staple the ticket.
Mozilla's release workers do this with the entitlements in
`taskcluster/config.yml`. A local Developer ID build has to supply the
certificate itself.

## Contributing

### Getting Plugged into the Community
We have a complete listing of the ways in which you can get involved with Thunderbird [on our website](https://thunderbird.net/participate). Below are some quick references from that page that you can use if you are looking to contribute to Thunderbird core right away.

#### Mailing Lists
If you want to participate in discussions about Thunderbird development, there are two main mailing lists you want to join.

1. [**Thunderbird Planning**](https://thunderbird.topicbox.com/groups/planning)**:** This moderated mailing list is for higher level topics like: the future of Thunderbird, potential features, and changes that you would like to see happen. It is also used to discuss a variety of broader issues around community and governance of the project.
2. [**Thunderbird Developers**](https://thunderbird.topicbox.com/groups/developers)**:** A moderated mailing list for discussing engineering plans for Thunderbird. It is a place where you can raise questions and ideas for core Thunderbird development.

#### Matrix Chat
If you want to ask questions about how to hack on Thunderbird, the Matrix room you want to join is [\#maildev:mozilla.org](https://matrix.to/#/#maildev:mozilla.org?web-instance%5Belement.io%5D=chat.mozilla.org).

### Report a Bug and Request Features
Thunderbird uses [Bugzilla](https://bugzilla.mozilla.org/enter_bug.cgi?product=Thunderbird) for reporting and tracking bugs. If you want to become a contributor to Thunderbird, you will need an account on Bugzilla.

Feature requests should be submitted to [Mozilla Connect](https://connect.mozilla.org/).

### Fixing a Bug and Submitting Patches
See [Fixing a Bug in the developer documentation](https://developer.thunderbird.net/thunderbird-development/fixing-a-bug).
