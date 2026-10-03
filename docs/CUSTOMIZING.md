# Customize MusiCo-3

## Inside the app

Use the terminal at the bottom or Ctrl+Shift+P to choose a theme:

    theme amber
    theme matrix
    theme midnight
    set fontsize 18
    set crt off
    set animations off
    set mode advanced

Settings persist in your own profile. `theme` lists available themes; `settings`
lists current values. Start from EXAMPLES, edit the music, and press Ctrl+Enter
to update playback. Ctrl+S saves; `export` and `import` share `.beat.json` songs.
CodeMirror supports Ctrl+F search/replace, Ctrl+Z undo, Ctrl+Shift+Z redo and
method completion after `.`. Tabs, custom shortcut mappings and theme JSON
import/export are not implemented in this version.

## Customize the application source

The source archive includes the exact dependency lockfile and build scripts.
Useful files:

- `src/themes/themes.ts`: color palettes and CSS variable mapping.
- `src/settings/settings.ts`: default theme, font size and effects.
- `src/styles/global.css`: layout, terminal appearance and CRT effects.
- `src/projects/examples.ts`: bundled music and new-project template.
- `src/tutorials/content.ts`: beginner guide and snippets.
- `src/ui/ascii.ts` and `index.html`: boot art and window title.
- `electron-builder.yml`: desktop name, application ID and output filename.

Modify source files, then rebuild with `npm run desktop:build`. Editing an
exported `.beat.json` changes a song; editing the application source and
rebuilding changes the app. There is no built-in theme JSON loader yet.
Changing defaults does not overwrite already persisted user preferences.

Keep singleton/serialized engine behavior when modifying playback. Preserve
AGPL-3.0-or-later licensing and dependency notices when sharing your build.
