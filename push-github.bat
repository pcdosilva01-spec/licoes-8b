@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "REPO_URL=https://github.com/pcdosilva01-spec/licoes-8b"
set "BRANCH=master"
set "MESSAGE=Atualiza plataforma do 8o B"
set "EXIT_CODE=1"

echo.
echo ================================================
echo   Publicar plataforma do 8o B no GitHub
echo ================================================
echo Repositorio: %REPO_URL%
echo Branch: %BRANCH%
echo.

:confirm
echo Este script executara git push --force para o branch master.
set "CONFIRM="
set /p "CONFIRM=Continuar? Digite S ou N: "
if /I "%CONFIRM%"=="S" goto :continue
if /I "%CONFIRM%"=="N" goto :cancel
echo Resposta invalida. Digite somente S ou N.
echo.
goto :confirm

:continue
where git >nul 2>nul
if errorlevel 1 (
  echo ERRO: Git nao foi encontrado no PATH.
  goto :error
)

echo Verificando arquivos de ambiente rastreados...
for /f "delims=" %%F in ('git ls-files ^| findstr /R /I /C:"^\.env$" /C:"^\.env\." /C:"/\.env$" /C:"/\.env\." /C:"\\.env$" /C:"\\.env\."') do (
  echo ERRO DE SEGURANCA: arquivo de ambiente ja rastreado: %%F
  goto :error
)
echo Um .env local ignorado pelo Git pode permanecer na pasta; ele nao sera enviado.

if not exist .git (
  echo Inicializando o repositorio Git local...
  git init
  if errorlevel 1 goto :error
)

git branch -M "%BRANCH%"
git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin "%REPO_URL%"
) else (
  git remote set-url origin "%REPO_URL%"
)
if errorlevel 1 goto :error

git add -A
if errorlevel 1 goto :error

for /f "delims=" %%F in ('git diff --cached --name-only ^| findstr /R /I /C:"^\.env$" /C:"/\.env$" /C:"\\.env$" /C:"\.env\."') do (
  echo ERRO DE SEGURANCA: arquivo de ambiente no stage: %%F
  git reset --quiet
  goto :error
)

git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma alteracao nova para publicar.
  goto :done
)

git commit -m "%MESSAGE%"
if errorlevel 1 goto :error

echo Enviando para master com push forcado...
git push --force -u origin "%BRANCH%"
if errorlevel 1 (
  echo O push falhou. Verifique o login e as permissoes do repositorio.
  goto :error
)

echo.
echo Push concluido para %REPO_URL% no branch %BRANCH%.
goto :done

:cancel
echo Operacao cancelada.
set "EXIT_CODE=1"
goto :finish

:error
echo.
echo Processo interrompido. Nenhum push foi concluido.
set "EXIT_CODE=1"
goto :finish

:done
set "EXIT_CODE=0"

echo.
echo Pressione qualquer tecla para fechar esta janela.

:finish
pause >nul
endlocal & exit /b %EXIT_CODE%
