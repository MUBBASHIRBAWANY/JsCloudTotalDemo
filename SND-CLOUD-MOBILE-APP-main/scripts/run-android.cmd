@echo off
setlocal EnableExtensions

REM Native Android build for JSERP.
REM Windows CMake/ninja embeds the FULL source path into object dirs.
REM Paths under "Saeed Gul Data" (and even F:\jserp) are too long and fail.
REM Build from a very short mirror path: F:\j

set "ANDROID_HOME=C:\Users\Mubashir\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "GRADLE_USER_HOME=F:\g"
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"
set "APP_ID=com.jaffarsons.jserp"

set "SRC=%~dp0.."
for %%I in ("%SRC%") do set "SRC=%%~fI"
set "DST=F:\j"

if not exist "%GRADLE_USER_HOME%" mkdir "%GRADLE_USER_HOME%"
if not exist "%DST%" mkdir "%DST%"
if /I "%SRC%"=="%DST%" goto build

echo [1/4] Syncing project files to %DST% ...
robocopy "%SRC%" "%DST%" /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XF .deps-stamp /XD "%SRC%\node_modules" "%DST%\node_modules" "%SRC%\android" "%DST%\android" "%SRC%\.git" "%DST%\.git" "%SRC%\.expo" "%DST%\.expo" "%SRC%\oldCode" "%DST%\oldCode" >nul
if errorlevel 8 goto syncfail

robocopy "%SRC%\android" "%DST%\android" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD build .cxx .gradle .kotlin >nul
if errorlevel 8 goto syncfail

REM node_modules is only re-synced when dependencies changed.
fc /b "%SRC%\package-lock.json" "%DST%\.deps-stamp" >nul 2>&1
if not errorlevel 1 goto build

echo [2/4] Dependencies changed - syncing node_modules (takes a few minutes) ...
robocopy "%SRC%\node_modules" "%DST%\node_modules" /MIR /MT:16 /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD .cxx >nul
if errorlevel 8 goto syncfail
for /d %%D in ("%DST%\node_modules\*") do if exist "%%D\android\build" rmdir /s /q "%%D\android\build"
for /d %%D in ("%DST%\node_modules\*") do if exist "%%D\android\.cxx" rmdir /s /q "%%D\android\.cxx"
for /d %%S in ("%DST%\node_modules\@*") do for /d %%D in ("%%S\*") do if exist "%%D\android\build" rmdir /s /q "%%D\android\build"
for /d %%S in ("%DST%\node_modules\@*") do for /d %%D in ("%%S\*") do if exist "%%D\android\.cxx" rmdir /s /q "%%D\android\.cxx"
copy /y "%SRC%\package-lock.json" "%DST%\.deps-stamp" >nul

:build
echo [3/4] Building and installing from %DST% ...
cd /d "%DST%"
if not exist "android\local.properties" (
  >"android\local.properties" echo sdk.dir=C\:\\Users\\Mubashir\\AppData\\Local\\Android\\Sdk
)
call npx expo run:android --no-bundler %*
if errorlevel 1 goto buildfail

echo [4/4] Starting Metro from %SRC% ...
cd /d "%SRC%"
adb reverse tcp:8081 tcp:8081 >nul 2>&1
REM Local backends: Cloud :3001, SND :3005 (app uses http://localhost via these tunnels)
adb reverse tcp:3001 tcp:3001 >nul 2>&1
adb reverse tcp:3005 tcp:3005 >nul 2>&1
start "" /b cmd /c "ping -n 25 127.0.0.1 >nul & adb shell am force-stop %APP_ID% >nul 2>&1 & adb shell monkey -p %APP_ID% -c android.intent.category.LAUNCHER 1 >nul 2>&1"
call npx expo start
exit /b %errorlevel%

:syncfail
echo Sync to %DST% failed.
exit /b 1

:buildfail
echo Android build failed.
exit /b 1
