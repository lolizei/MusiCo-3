# Sample sources and sharing songs

In a Strudel project, open **SAMPLES** (or type `samples` / `sounds` in the
app terminal). A sample source is a Strudel JSON map linking sound names to
audio files. It adds instruments, not an engine, and needs no app update.

1. Enter a source name, HTTPS map URL or `github:owner/repo/ref/path`, and the
   author/license information. GitHub shorthand defaults to main/strudel.json.
2. Save source. This stores the URL and credits; it does not run or download audio.
3. Check sound list downloads JSON only, with a 15-second timeout and 1 MB limit.
   This verifies supported map structure, not the audio, ownership or license.
4. Add loader to current song inserts `await samples("https://…")` before the
   existing code. Undo/redo works, and adding the same loader twice is ignored.
   Or choose a sound name from the list to create a new demo tab.
5. Review the source and code, then RUN. Strudel fetches the map and downloads
   the sounds used in the pattern. Existing RUN serialization is unchanged.
6. Share the complete code through COPY CODE, project JSON export, or your
   personal starter library. Keep loader and attribution comments included.
   The recipient needs internet access and permission to use the source.

Source lists can also be exported/imported as BEAT.EXE sample-source JSON.
Import merges by URL without replacing an existing source or running anything.
Up to 100 sources can be stored. Removing one deletes its saved metadata;
existing songs keep their loaders. Restart the app to clear sounds already
registered by Strudel. Registered sound names are shared between Strudel tabs;
use distinctive names to avoid one pack replacing another's instruments.

## Host a sample map

The host must permit browser access (CORS) for both JSON and audio. A public
GitHub repository with a raw URL is one option. Upload only audio you have
permission to distribute; putting a file on GitHub does not create permission.
Prefer a pinned commit URL when sharing a song so the map cannot change later.

Example JSON (replace the domain with your own host):

```json
{
  "_base": "https://your-host.example/my-kit/",
  "my_kick": ["kick.wav"],
  "my_piano": { "C4": "C4.mp3", "G4": "G4.mp3" }
}
```

Use relative filenames and a full HTTPS `_base` ending in `/`. This follows
the installed Strudel sampler's prefix concatenation. The inspector supports
string, array and pitched sample lists with simple sound names. It shows the
first 200 sounds in larger maps. Unsupported maps may still be loaded manually
using the official Strudel APIs, but their behavior is not verified by this UI.
Local file picker imports of audio/ZIP packs are not implemented yet.

```javascript
// Sample source: My own kit
// Author: Your name | License: Your actual license/permission
await samples('https://your-host.example/my-kit/strudel.json')

$: s("my_kick*4").gain(0.2)
```

`bank("RolandTR808")` selects names from an already registered sample map;
it does not download that bank. A source would have to register names such as
RolandTR808_bd and RolandTR808_oh for that code to work. The app does not bundle
that collection because its redistribution license remains unverified.

## Included piano and licenses

`note("c4 e4 g4").s("piano").gain(0.2)` works offline using the included
Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0. SAMPLES offers a credited
demo, and the piano roll includes attribution when that sound is selected.
See [SAMPLE_LICENSES.md](SAMPLE_LICENSES.md) for provenance and license links.

The source manager records user-supplied credits; it cannot certify rights or
availability. Sharing a URL is not the same as granting permission to use the
audio. Keep required attribution when publishing recordings, code or packs.
Bundled sample assets retain their own license, separate from AGPL app code.
The matching source and notices remain necessary when distributing through Steam.
