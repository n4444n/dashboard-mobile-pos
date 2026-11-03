@echo off
chcp 65001 >nul
title Tally Mobile 1.0.0
cd /d "%~dp0"

rem ติดตั้งแพ็กเกจครั้งแรก (แล้วปรับเวอร์ชันให้ตรงกับ Expo SDK 54)
if not exist node_modules (
  echo [Tally] กำลังติดตั้งแพ็กเกจ ครั้งแรกใช้เวลาสักครู่...
  call npm install || goto :fail
  call npx expo install --fix
)

if /i "%1"=="web" (
  call npx expo start --web
) else if /i "%1"=="tunnel" (
  call npx expo start --tunnel
) else (
  echo [Tally] สแกน QR ด้วยแอป Expo Go บนมือถือ ^(Wi-Fi เดียวกับ PC^)
  call npx expo start
)
goto :eof

:fail
echo [Tally] ติดตั้งแพ็กเกจไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่
pause
