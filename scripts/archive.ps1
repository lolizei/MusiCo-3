param([Parameter(Mandatory=$true)][string]$SourcePath, [Parameter(Mandatory=$true)][string]$ArchivePath)
$ErrorActionPreference = 'Stop'
Compress-Archive -LiteralPath $SourcePath -DestinationPath $ArchivePath -Force
