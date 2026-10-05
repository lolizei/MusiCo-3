# Free Steam release plan

Goal: distribute MusiCo-3 as free Windows audio-production software, with its
editable source available to everyone. This is a preparation plan, not an
approved Steam submission. Official documentation reviewed during 0.2.0 development.

Owner update (2026-10-04): the US$100 Steam Direct fee has already been paid,
as reported by the owner. Payment is not a remaining task. The exact payment
date has not yet been confirmed here. App ID **5067350** and provisional name
**code for music** were supplied by the owner. The owner's depot screenshot
confirms Windows depot **5067351**, currently named "CS2018 Content". Use Steamworks'
recorded payment date when calculating the release waiting period.
When configuring the store/depot, confirm supported Windows targets and any
name change with the owner. Never request passwords,
Steam Guard codes, banking information or tax documents in chat.

## Steam eligibility and costs

Valve lists Audio/Video Production among accepted non-game software categories.
Acceptance of this particular app still requires Valve's review. Steam Direct
currently charges US$100 per product, even if the intended user price is free.
The fee is recoupable only after US$1,000 adjusted gross revenue; a completely
free app without purchases should not budget for recovering it. Identity,
banking and tax onboarding are handled by the owner in Steamworks.

Plan for the published 30-day period after paying the app fee and at least
two weeks of a public Coming Soon page. Store presence and the build both need
approval. Leave time for review and corrections instead of promising a date.

Sources: [Steam Direct](https://partner.steamgames.com/steamdirect/),
[app fee](https://partner.steamgames.com/doc/gettingstarted/appfee),
[release process](https://partner.steamgames.com/doc/store/releasing).

## AGPL and Steamworks compatibility: resolve before submission

The application remains **AGPL-3.0-or-later** and Strudel remains **AGPL-3.0**.
A free download does not remove license obligations. Preserve notices and
provide the matching Corresponding Source, dependency sources where required,
build scripts and lockfile for every binary release. Include source access
in the Steam distribution and store/support material, with versioned archives
available at no charge. The existing share packaging already creates source
and dependency archives; verify the exact Steam depot contains/accesses them.
See the [GNU AGPL text](https://www.gnu.org/licenses/agpl-3.0.en.html), especially
sections 5, 6, 10 and 13.

Valve explicitly warns that copyleft licenses can be incompatible with the
Steamworks SDK and that developers must have all necessary distribution rights:
[Distributing Open Source Applications on Steam](https://partner.steamgames.com/doc/sdk/uploading/distributing_opensource).
We cannot relicense third-party Strudel code just by changing our project license.
Current architecture uses no Steamworks SDK, achievements, Workshop integration
or Steam DRM wrapper. Proposed first submission: the existing standalone app
launched by Steam, with source included. This avoids introducing an SDK linking
conflict, but it is **not a finding that Steam's agreements are compatible**.
Resolve the intended agreement/distribution arrangement with Valve and qualified
license review before submitting or adding SDK features. Keep Steam-only
proprietary integration out of the AGPL application until that question is settled.

## Work required before a public launch

1. Resolve the outstanding Discord/McAfee distribution findings for the exact
   final binary; retain reports/hashes and investigate detections. Build and
   provenance checks alone do not establish antivirus clearance. See
   [SECURITY-REVIEW.md](SECURITY-REVIEW.md). Do not ask users to disable protection.
2. Run the packaged Windows checklist by ear, including first keyboard RUN,
   saved/draft tab recovery, STOP and long playback with visible effects.
   Verify installation/update on a clean Windows account and a second computer.
3. Test the native Sonic Pi consent/picker and separate-GUI coexistence; describe
   it as optional and requiring a separate **5.0.0** installation. Strudel must
   remain useful without it. Ruby runs trusted native code after consent.
4. Complete offline first-run/reload acceptance. Synths require no downloaded
   samples; drums need internet on first use. Audit actual sample provenance
   and licenses before bundling any sample collection or publishing claims
   about users' rights to redistribute recordings. Do not advertise full offline
   drums or universal commercial-use clearance based only on the engine license.
5. Verify beginner walkthroughs, keyboard-only operation, reduced motion, text
   scaling, 320px/390px layouts and legible default/custom palettes. Test settings
   and draft persistence through a real application update.
6. Prepare original logo/capsule art, actual-app screenshots, store description,
   system requirements, support/contact information and required content survey.
   Advertise only implemented, verified features. Do not include Minecraft names,
   branding or soundtrack material as application assets; the supplied ambient
   composition is original.
7. Configure the Windows depot with the full extracted application directory,
   not just the EXE; choose the executable as launch target. Include matching
   sources/notices. Exercise install, launch, update and uninstall through a
   private Steam test before seeking build approval.

## Scope and honest capability claims

Available in development: real Strudel code/audio, beginner guide and searchable
snippets, project tabs with independent drafts/history, editable shortcuts,
seven preset themes and custom validated theme files. Optional Sonic Pi remains
experimental pending the manual checks above. No fake audio visualizer is shown.

Optional startup greeting is implemented, disabled by default and skippable
without swallowing keyboard RUN; reduced motion bypasses it. Still to implement:
an AnalyserNode visualizer of real Strudel output. Audio export, bundled
offline drum library, macOS builds, Steam Cloud and Workshop are future
work; none are claimed in the store plan. A free release does not need these
optional Steam integrations to be useful.
