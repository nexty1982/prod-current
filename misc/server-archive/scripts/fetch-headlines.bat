@echo off
REM Orthodox Headlines Aggregator - Windows Batch File
REM Usage: fetch-headlines.bat [test|help|interactive]

cd /d "%~dp0\.."

if "%1"=="test" (
    echo Testing Orthodox Headlines RSS feeds...
    node scripts\fetch-headlines.js --test --language en
    goto :end
)

if "%1"=="help" (
    node scripts\fetch-headlines.js --help
    goto :end
)

if "%1"=="interactive" (
    echo Starting interactive mode...
    node scripts\fetch-headlines.js
    goto :end
)

if "%1"=="dbtest" (
    echo Testing database connection...
    node scripts\test-headlines-db.js
    goto :end
)

REM Default: show options
echo.
echo Orthodox Headlines Aggregator - Windows
echo =======================================
echo.
echo Usage: fetch-headlines.bat [option]
echo.
echo Options:
echo   test        - Test RSS feeds without database
echo   dbtest      - Test database connection only
echo   help        - Show detailed help
echo   interactive - Run with database credential prompts
echo.
echo Examples:
echo   fetch-headlines.bat test
echo   fetch-headlines.bat dbtest
echo   fetch-headlines.bat interactive
echo.
echo For advanced options, use:
echo   node scripts\fetch-headlines.js --help
echo.

:end
pause 