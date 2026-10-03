# MusiCo-3 0.1.1 — Windows desktop prerelease

Download **MusiCo-3-0.1.1-windows-x64.zip**, extract it, and open
`MusiCo-3-Windows/MusiCo-3/MusiCo-3.exe`. Windows 10/11 x64; no Node.js or
development server needed. Keep the surrounding application files together.

New beginner tools: note/MIDI/scale-degree table, five melody starters, 53
searchable Strudel snippets, and a blinking ASCII guide cat that respects
reduced-motion and animation settings. Snippet insertions have their own undo step.

The desktop engine selector also offers **Sonic Pi**, requiring a separate
[Sonic Pi 5.0.0 installation](https://sonic-pi.net/#windows). Choose it, press RUN,
and select the installation folder when prompted. Includes Ruby highlighting
and four starters. Ruby is native code with access to files/programs; connect
only when running trusted code. RUN replaces previous jobs with about a two-second gap;
visualization remains disabled. Sonic Pi stays unavailable in web builds.

Verified: strict typecheck/build, 82 unit tests, 40 call-counting and 43 real web
integration checks, 75 beginner checks, real Sonic Pi recordings/control/error
checks and 16 Sonic Pi desktop integration checks. Packaged desktop distribution
checks cover extraction, real Strudel output and persistence. Automated output
measurements do not confirm sound on your speakers. Desktop/Sonic Pi listening,
native consent/picker and concurrent Sonic Pi GUI use remain manual checks.

**Unresolved security warning:** Discord rejected the earlier 0.1.0 Windows ZIP;
McAfee quarantined earlier self-extracting launchers. A false positive has not
been established. The owner supplied [a VirusTotal report for the original ZIP](https://www.virustotal.com/gui/file/ec89e5e79b475d9a6a74495ac502eff0859115e44cbd5bd2716564dfee186adf),
whose contents could not be read through the available tool. That report does
not cover this updated ZIP. Functional/provenance checks are not malware
clearance. This unsigned build is published as a prerelease at the owner's
request with this warning disclosed. Leave protection enabled.

Matching source, dependency sources, AGPL license and customization guides are
included in the Windows ZIP and also provided as release assets. Check
SHA256SUMS.txt for the exact download hashes. Multiple editor tabs, configurable
shortcuts and additional themes remain planned.
