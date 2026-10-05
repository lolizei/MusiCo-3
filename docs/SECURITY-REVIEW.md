# Windows distribution security review — 2026-10-03

Status: unresolved antivirus/upload detection. Do not treat functional tests,
checksums or source review as a malware-scanner clearance. The requested GitHub
download is designated a prerelease at the owner's explicit request, with
the unresolved warning disclosed. No clean scanner verdict is claimed.

## Artifact identified by the user

`MusiCo-3-0.1.0-windows-x64.zip`

SHA-256: `ec89e5e79b475d9a6a74495ac502eff0859115e44cbd5bd2716564dfee186adf`

Discord rejected the upload with: “Hm, it looks like that file might've been a
virus.” Its scanner's exact engine, flagged member and detection name are not
available. A false positive has not been established.

The ZIP contains `MusiCo-3/MusiCo-3.exe` and the matching source archive. It
does not contain the earlier self-extracting `MusiCo-3-0.1.0-windows-x64.exe`.
The app executable hash is:
`ae8f2b6820cda1e705621728aa69f9d9f9fd86bff446597b9115e2738484b61d`.

The owner provided [this VirusTotal report](https://www.virustotal.com/gui/file/ec89e5e79b475d9a6a74495ac502eff0859115e44cbd5bd2716564dfee186adf).
The page could not be read through the available web tool; its detection counts
are therefore unverified here. This report refers to the original 0.1.0 ZIP,
not the 0.1.1 build or the new 0.2.0 development build. None inherits a clean
scanner verdict from the old report. The 0.2.0 local build adds project tabs and
customization; compare its own hashes in release/SHA256SUMS.txt and scan that
exact ZIP before treating it as a public-release candidate.

## Local detections

McAfee's detection log records quarantine of two earlier self-extracting EXE
builds, with detections `ti!58F1437E25B5` and `ti!2CA185C98A85`.
These are different artifacts from the extracted app executable in the ZIP.
Their classification does not establish whether the final ZIP is safe.
Windows Defender is inactive on this machine; a Defender scan was not run.

## Provenance checks completed without running the files

- The cached Electron 44.5.1 Windows x64 archive matches the checksum downloaded
  from the official Electron GitHub release: SHA-256
  `9b382492dcfee91f8f9e92c91f7972550a1b95d2299cac72279dab33a600d7db`.
- Seventy runtime files match the official runtime archive. Electron's LICENSE
  is renamed to LICENSE.electron.txt by packaging and matches the original.
- Fourteen non-resource executable sections match the installed, verified
  Electron executable. The resource section is changed by the builder for the
  application's ASAR integrity metadata.
- Packaged desktop modules and Vite assets match the local build files; the
  application entrypoint is desktop/main.mjs. No runtime node_modules tree is
  included in the app archive.
- The original Electron executable and packaged app both report NotSigned.
- No files were uploaded to an external scanner. A public VirusTotal report
  could not be retrieved through the available web tool.

Reproduce executable/application comparisons with:

    node tests/smoke/provenance.mjs

Next step: a current scan of the exact final ZIP with McAfee and preferably an
independent scanner/report, followed by investigation of any named file or
detection. Do not restore quarantined files or disable protection to publish.

References: [official Electron checksums](https://github.com/electron/electron/releases/download/v44.5.1/SHASUMS256.txt),
[ASAR integrity metadata](https://www.electronjs.org/docs/latest/tutorial/asar-integrity),
[Discord's description of executable/archive scanning](https://discord.com/blog/security-discord-and-you/).
