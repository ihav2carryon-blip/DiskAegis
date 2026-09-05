[Setup]
AppId={{E66E533F-11B4-4B78-A979-46788A96740B}
AppName=DiskAegis
AppVersion=1.0.0
AppPublisher=DiskAegis Team
AppPublisherURL=https://github.com/ihav2carryon-blip/DiskAegis
AppSupportURL=https://github.com/ihav2carryon-blip/DiskAegis/issues
AppUpdatesURL=https://github.com/ihav2carryon-blip/DiskAegis/releases
DefaultDirName={autopf}\DiskAegis
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=DiskAegis-Setup-1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\DiskAegis.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\DiskAegis-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\DiskAegis"; Filename: "{app}\DiskAegis.exe"
Name: "{autodesktop}\DiskAegis"; Filename: "{app}\DiskAegis.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\DiskAegis.exe"; Description: "{cm:LaunchProgram,DiskAegis}"; Flags: nowait postinstall skipifsilent
