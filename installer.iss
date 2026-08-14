; ============================================================
; 莱茵生命生态科 ECO — Inno Setup 安装脚本
; 构建：npm run dist（由 scripts/dist.js 传入 /DMyAppVersion）
; 手动编译：ISCC /DMyAppVersion=0.1.0 installer.iss
; ============================================================

#ifndef MyAppVersion
#define MyAppVersion "0.1.0"
#endif

#define MyAppName "莱茵生命生态科 ECO"
#define MyAppNameEn "Rhine Lab Ecological Section"
#define MyAppExeName "ECO.exe"
#define MyAppId "{{8FA3C1D6-52B7-4E60-9C42-B3D10E7A11C4}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher=Rhine Lab Ecological Section
AppComments=莱茵生命生态科 — 个人项目集合与启动器
AppSupportURL=https://github.com/Muelsyselove/Rhine-Lab-Ecological-Section
; 安装位置与开始菜单组均可自定义；privileges 可选“所有用户/仅当前用户”
DefaultDirName={autopf}\{#MyAppNameEn}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=no
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayName={#MyAppName}
UninstallDisplayIcon={app}\{#MyAppExeName}
LicenseFile=LICENSE
; 产物
OutputDir=dist
OutputBaseFilename=ECO-Setup-{#MyAppVersion}
SetupIconFile=assets\icon.ico
; 压缩与外观
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; 运行中的 ECO 会提示关闭后再复制文件
CloseApplications=yes
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
VersionInfoVersion={#MyAppVersion}.0
VersionInfoProductTextVersion={#MyAppVersion}

[Languages]
Name: "chs"; MessagesFile: "installer\ChineseSimplified.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[Tasks]
; 附加图标任务（可勾选/取消）
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\ECO-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Languages: chs en

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; 安装完成后可直接运行（静默安装时跳过）
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
