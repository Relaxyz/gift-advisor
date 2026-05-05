@echo off
call "D:\APPs\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
cd /d "%~dp0"
npx tauri build
pause
