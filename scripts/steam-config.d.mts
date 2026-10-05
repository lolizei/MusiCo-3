/** Untrusted JSON values are validated before emitting executable VDF config. */
export interface SteamBuildInput {
  appId: unknown;
  appName: unknown;
  windowsDepotId: unknown;
}
export function steamBuildFiles(project: SteamBuildInput, version: unknown): { app: string; depot: string };
export function steamLinuxBuildFiles(project: SteamBuildInput & { linuxDepotId: unknown }, version: unknown): { app: string; depot: string };
