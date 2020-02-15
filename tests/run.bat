@echo off

set DIR=%~dp0.
set workspace=%DIR%\workspace

if exist "%workspace%" rmdir /Q /S "%workspace%"
mkdir "%workspace%"
cd "%workspace%"

call npm init -y
call npm install --save "%DIR%\.."
cls

set PATH=%workspace%\node_modules\.bin;%PATH%

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download an episode
rem :: (subtitles not available)
rem :: =================================

call rtdl -q -mc 5 -u "https://roosterteeth.com/watch/red-vs-blue-psa-2019-cultural-appreciation"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download an episode
rem :: (subtitles are available)
rem :: =================================

call rtdl -q -mc 5 -u "https://roosterteeth.com/watch/gary-and-his-demons-season-1-still-the-one"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a series
rem :: =================================

call rtdl -mc 5 -u "https://roosterteeth.com/series/rwby"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: print a trace of the operations
rem :: that would occur IF a series
rem :: were to be downloaded
rem :: =================================

call rtdl -dr -ll 1 -u "https://roosterteeth.com/series/rwby"
call rtdl -dr -ll 2 -u "https://roosterteeth.com/series/rwby"
call rtdl -dr -ll 3 -u "https://roosterteeth.com/series/rwby"

rem :: -------------------------------------------------------------------------

rem :: =================================
rem :: download a series (advanced)
rem :: =================================

call rtdl -dr -ll 1 -u "https://roosterteeth.com/series/rwby" >"episode_urls.txt"
call rtdl -dr -ll 2 -u "https://roosterteeth.com/series/rwby" >"convert_mp4s.bat"

call rtdl -nm -mc 5 -i "episode_urls.txt" >"log.txt" 2>&1

call "convert_mp4s.bat"

rem :: -------------------------------------------------------------------------

echo.
pause
