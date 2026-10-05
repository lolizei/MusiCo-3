# Steam preparation — code for music

Latest verified upload: **25726762** (2026-10-05), newest checked Windows build
with compact live piano, evaluated note view, snippet previews and guarded
quit/exit, plus earlier FLAC, fonts and audio-output customization.
Windows manifest: **6606718254681447401**. Linux manifest **1803617613340275726**
was reused unchanged; no Linux files were added, changed or removed. Staged
Windows app matches the tested candidate; matching source, combined preview,
Linux executable flags and successful upload were verified. Branch activation
is **pending**, because the connected browser is not signed into Steamworks.
Activate Build 25726762 on the existing test branch from Steamworks Builds;
this upload did not release the store product. Earlier upload: 25714881.

Latest active combined test build: **25712174** (2026-10-04), Windows depot
5067351 and Linux depot 5067352. Fresh Steam metadata verifies both manifests
and separate launch options; ReleaseState remains unavailable. The Windows
manifest is unchanged from 25711609. Linux direct startup is user-reported;
Steam launch currently stops after several minutes and is under investigation.
See [Linux launch diagnostics](../docs/LINUX.md#diagnosing-steam-launch-failures).

App ID: **5067350**. Windows depot: **5067351** (confirmed in the owner's
Steamworks screenshot). The product name is provisional. Edit project.json
when it changes; no Windows data/profile or executable rename is necessary.

From the repository, run `npm run desktop:share`, then `npm run steam:prepare`.
Preparation creates a fresh `release/steam-5067350-*` folder with:

- `content/`: complete Windows app, matching source, notices, songs and guides.
- `scripts/app_build_5067350.vdf` and `scripts/depot_build_5067351.vdf`.
- `build-output/`: separate SteamPipe cache/output, never mapped into the depot.
- `PREPARATION.json`: identity, version and launch path for review.

The build script uses **Preview 1**. It does not upload a build or set a branch
live. No Steamworks library is linked into the AGPL application. SteamPipe
has been run against the owner account. Latest verified upload (2026-10-04):
Build 25711609, App 5067350, depot 5067351, including offline piano, sample
sharing, piano roll, the effect-worklet fix, volume/meters/WAV export and
personal library/companions. Preview verified 97 mapped files. Staging hashes match the
tested app/source; preview and upload success were verified from fresh logs.
Branch activation and Steam installation/update remain separate, unverified steps.

In Steamworks, this depot is currently named "CS2018 Content". It can be
renamed to "Windows Content" without changing its ID. Confirm it remains in
the developer/free-release packages (the screenshot shows three references).
The launch executable relative to content root is `MusiCo-3/MusiCo-3.exe`.
Windows is the current runtime-tested platform. Linux depot **5067352** was
confirmed in the owner's screenshot. `npm run desktop:linux:share` creates
a separate native Linux TAR.GZ with executable modes and matching source;
`npm run steam:prepare:linux` creates preview-only Linux staging. Linux was
uploaded in the combined build above; Linux audio and Steam acceptance remain pending.
See [Linux configuration and acceptance](../docs/LINUX.md) for Linux-only
depot settings, package assignment and launch path `MusiCo-3/musico-3`.
No macOS build is prepared.

After the release gates in docs/STEAM_RELEASE.md are resolved, use Valve's
ContentBuilder/SteamCMD tools with the owner authenticated locally. Run the
preview against the generated app-build file first and inspect its manifest.
An actual upload will require explicitly changing Preview to 0; branch/release
configuration is a separate reviewed step. Do not put passwords or Steam Guard
codes in scripts, repository files or chat.

Official references:
[SteamPipe uploading](https://partner.steamgames.com/doc/sdk/uploading),
[depots](https://partner.steamgames.com/doc/store/application/depots).
