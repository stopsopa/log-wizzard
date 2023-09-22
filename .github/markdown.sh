

_SHELL="$(ps "${$}" | grep "${$} " | grep -v grep | sed -rn "s/.*[-\/]+(bash|z?sh) .*/\1/p")"; # bash || sh || zsh
case ${_SHELL} in
  zsh)
    _DIR="$( cd "$( dirname "${(%):-%N}" )" && pwd -P )"
    ;;
  sh)
    _DIR="$( cd "$( dirname "${0}" )" && pwd -P )"
    ;;
  *)
    _DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd -P )"
    ;;
esac

ROOT="${_DIR}/.."

cd "${ROOT}"

set -e
set -x

echo "{}" > package.json

yarn add marked

ls -la

set -x

node node_modules/.bin/marked -i GITHUBPAGE.md -o index-raw.html

node .github/combine.js --placeholder %% --template .github/markdown.html --topaste index-raw.html --output index.html

rm -rf index-raw.html

