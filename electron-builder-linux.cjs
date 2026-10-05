// Keep the Windows runtime cache out of Linux builds. electron-builder fetches
// the official Linux Electron distribution for the pinned package version.
module.exports = {
  extends: './electron-builder.yml',
  electronDist: async () => undefined,
  directories: { output: 'release/linux' },
  linux: { target: [{ target: 'dir', arch: ['x64'] }], executableName: 'musico-3', category: 'AudioVideo' },
};
