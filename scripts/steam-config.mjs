/** SteamPipe preview files only: no login, upload, SDK linking or SetLive. */
export function steamBuildFiles({ appId, appName, windowsDepotId }, version) {
  const id = value => typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value);
  if (!id(appId) || !id(windowsDepotId)) throw new Error('Provide the actual App ID and Windows depot ID from Steamworks.');
  const safeText = value => typeof value === 'string' && value.length > 0 && value.length <= 120 && !/["\\\r\n\x00-\x1f]/.test(value);
  if (!safeText(appName) || !safeText(version)) throw new Error('Name/version cannot contain quotes, backslashes or control characters.');
  return {
    app: `"AppBuild"\n{\n  "AppID" "${appId}"\n  "Desc" "${appName} ${version} Windows preview"\n  "Preview" "1"\n  "ContentRoot" "../content"\n  "BuildOutput" "../build-output"\n  "Depots"\n  {\n    "${windowsDepotId}" "depot_build_${windowsDepotId}.vdf"\n  }\n}\n`,
    depot: `"DepotBuild"\n{\n  "DepotID" "${windowsDepotId}"\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "Recursive" "1"\n  }\n}\n`,
  };
}

/** Separate Linux preview: never activate a branch or silently replace Windows. */
export function steamLinuxBuildFiles(project, version) {
  // Reuse validation for all text fields, using the Linux ID as the depot.
  const files = steamBuildFiles({ ...project, windowsDepotId: project.linuxDepotId }, version);
  if (project.linuxDepotId === project.windowsDepotId || project.linuxDepotId === project.appId) throw new Error('Linux needs its own depot ID.');
  // SteamCMD preview verifies flag 0x20 even when the uploader is Windows.
  const properties = ['musico-3', 'chrome_crashpad_handler', 'chrome-sandbox']
    .map(name => `  "FileProperties"\n  {\n    "LocalPath" "MusiCo-3/${name}"\n    "Attributes" "executable"\n  }\n`).join('');
  return { app: files.app.replace('Windows preview', 'Linux preview'), depot: files.depot.replace(/}\n$/, properties + '}\n') };
}
