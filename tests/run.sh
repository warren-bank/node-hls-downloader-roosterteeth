#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
workspace="${DIR}/workspace"

[ -d "$workspace" ] && rm -rf "$workspace"
mkdir "$workspace"
cd "$workspace"

npm init -y
npm install --save "${DIR}/.."
clear

PATH="${workspace}/node_modules/.bin:${PATH}"

# ------------------------------------------------------------------------------

# =================================
# download an episode
# (subtitles not available)
# =================================

rtdl -q -mc 5 -u 'https://roosterteeth.com/watch/red-vs-blue-psa-2019-cultural-appreciation'

# ------------------------------------------------------------------------------

# =================================
# download an episode
# (subtitles are available)
# =================================

rtdl -q -mc 5 -u 'https://roosterteeth.com/watch/gary-and-his-demons-season-1-still-the-one'

# ------------------------------------------------------------------------------

# =================================
# download a series
# =================================

rtdl -mc 5 -u 'https://roosterteeth.com/series/rwby'

# ------------------------------------------------------------------------------

# =================================
# print a trace of the operations
# that would occur IF a series
# were to be downloaded
# =================================

rtdl -dr -ll 1 -u 'https://roosterteeth.com/series/rwby'
rtdl -dr -ll 2 -u 'https://roosterteeth.com/series/rwby'
rtdl -dr -ll 3 -u 'https://roosterteeth.com/series/rwby'

# ------------------------------------------------------------------------------

# =================================
# download a series (advanced)
# =================================

rtdl -dr -ll 1 -u 'https://roosterteeth.com/series/rwby' >'episode_urls.txt'
rtdl -dr -ll 2 -u 'https://roosterteeth.com/series/rwby' >'convert_mp4s.sh'

rtdl -nm -mc 5 -i 'episode_urls.txt' >'log.txt' 2>&1

./convert_mp4s.sh

# ------------------------------------------------------------------------------
