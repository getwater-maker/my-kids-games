@echo off
chcp 65001 >nul
echo.
echo ==============================================
echo       마법의 색칠공부 게임을 실행합니다!
echo ==============================================
echo.
echo 기본 웹 브라우저가 열릴 때까지 잠시만 기다려주세요...
timeout /t 2 >nul
start index.html
exit
