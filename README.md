### [_Rooster Teeth_ Downloader](https://github.com/warren-bank/node-hls-downloader-roosterteeth)

Command-line utility for downloading an offline copy of [_Rooster Teeth_](https://roosterteeth.com/series?title_order=asc) HLS video streams.

#### Features:

* accepts URLs that identify:
  - a single episode contained in a series
  - an entire series
    * includes all episodes in every seasons
* downloads:
  - the highest available quality for each video stream
  - _vtt_ subtitles for all available languages
  - will continue upon restart after an abrupt interruption
* resulting file structure:
  ```bash
    |- {title_series}/
    |  |- {title_episode}/
    |  |  |- hls/
    |  |  |  |- video/
    |  |  |  |  |- *.ts
    |  |  |  |- audio/
    |  |  |  |  |- {language}/
    |  |  |  |  |  |- *.ts
    |  |  |  |  |- {language}.m3u8
    |  |  |  |- subtitles/
    |  |  |  |  |- {language}/
    |  |  |  |  |  |- *.vtt
    |  |  |  |  |- {language}.m3u8
    |  |  |  |- video.m3u8
    |  |  |  |- master.m3u8
    |  |  |- mp4/
    |  |  |  |- video.mp4
    |  |  |  |- video.{language}.srt
  ```

- - - -

#### Installation:

```bash
npm install --global @warren-bank/node-hls-downloader-roosterteeth
```

#### Usage:

```bash
rtdl <options>

options:
========
"-h"
"--help"
    Print a help message describing all command-line options.

"-v"
"--version"
    Display the version.

"-q"
"--quiet"
    Do not print a verbose log of operations.

"-ll" <integer>
"--log-level" <integer>
    Specify the log verbosity level.
      0 = no output (same as --quiet)
      1 = include only episode Rooster Teeth URLs
      2 = include only episode ffmpeg commands
      3 = include all operational metadata (default)

"-dr"
"--dry-run"
    Do not write to the file system.

"-nm"
"--no-mp4"
    Do not use "ffmpeg" to bundle the downloaded video stream into an .mp4 file container.

"-mc" <integer>
"--max-concurrency" <integer>
"--threads" <integer>
    Specify the maximum number of URLs to download in parallel.
    The default is 1, which processes the download queue sequentially.

"-P" <dirpath>
"--directory-prefix" <dirpath>
    Specifies the directory where the resulting file structure will be saved to.
    The default is "." (the current directory).

"-u" <URL>
"--url" <URL>
    Specify a Rooster Teeth URL. (episode or series)

"-i <filepath>"
"--input-file <filepath>"
    Read Rooster Teeth URLs from a local text file. Format is one URL per line.
```

#### Example:

* download an episode (subtitles not available):
  ```bash
    rtdl -q -mc 5 -u 'https://roosterteeth.com/watch/red-vs-blue-psa-2019-cultural-appreciation'
  ```
* download an episode (subtitles are available):
  ```bash
    rtdl -q -mc 5 -u 'https://roosterteeth.com/watch/gary-and-his-demons-season-1-still-the-one'
  ```
* download a series:
  ```bash
    rtdl -mc 5 -u 'https://roosterteeth.com/series/rwby'
  ```
* print a trace of the operations that would occur IF a series were to be downloaded:
  ```bash
    rtdl -dr -ll 1 -u 'https://roosterteeth.com/series/rwby'
    rtdl -dr -ll 2 -u 'https://roosterteeth.com/series/rwby'
    rtdl -dr -ll 3 -u 'https://roosterteeth.com/series/rwby'
  ```
* download a series (advanced):
  ```bash
    rtdl -dr -ll 1 -u 'https://roosterteeth.com/series/rwby' >'episode_urls.txt'
    rtdl -dr -ll 2 -u 'https://roosterteeth.com/series/rwby' >'convert_mp4s.sh'

    rtdl -nm -mc 5 -i 'episode_urls.txt' >'log.txt' 2>&1

    ./convert_mp4s.sh
  ```

##### Suggestions:

1. download with options: `--no-mp4 --log-level 3`
   * redirect stdout to a log file
   * when download completes, check the log file for any error messages
   * if any _.ts_ chunks encountered a download problem
     - identify the url of the _Rooster Teeth_ page that was being processed when this error occurred
     - redownload that page (using the same `--directory-prefix`)
       * all previously downloaded data __not__ be modified or deleted
       * only missing data will be retrieved
2. repeat the above process until the log file shows no download errors
3. finally, convert the HLS stream to _mp4_
   * to only convert the video and audio streams to _mp4_
     - the `ffmpeg` command to perform this conversion is included in the log file
     - when converting the episodes in a series, a list of all `ffmpeg` commands can be generated with the options: `--dry-run --log-level 2`
   * to convert the video and audio streams to _mp4_, and convert all _vtt_ subtitle streams to _srt_
     - redownload (using the same `--directory-prefix`) without the option: `--no-mp4`
       * all previously downloaded data __not__ be modified or deleted

- - - -

#### Requirements:

* Node.js version: v8.6.0 (and higher)
  * [ES6 support](http://node.green/)
    * v0.12.18+: [Promise](https://node.green/#ES2015-built-ins-Promise)
    * v4.08.03+: [Object shorthand methods](https://node.green/#ES2015-syntax-object-literal-extensions)
    * v5.12.00+: [spread syntax for iterable objects](https://node.green/#ES2015-syntax-spread-syntax-for-iterable-objects)
    * v6.04.00+: [rest parameters](https://node.green/#ES2015-syntax-rest-parameters)
    * v6.04.00+: [destructuring, declarations](https://node.green/#ES2015-syntax-destructuring--declarations)
    * v6.04.00+: [Proxy constructor](https://node.green/#ES2015-built-ins-Proxy)
    * v6.04.00+: [Proxy 'apply' handler](https://node.green/#ES2015-built-ins-Proxy)
    * v6.04.00+: [Reflect.apply](https://node.green/#ES2015-built-ins-Reflect)
    * v7.10.01+: [async functions](https://node.green/#ES2017-features-async-functions)
    * v8.06.00+: [object rest/spread properties](https://node.green/#ES2018-features-object-rest-spread-properties)
  * libraries and dependencies
    * v6.13.00+: [Browser-compatible `URL` class](https://nodejs.org/api/url.html#url_class_url)
* FFmpeg
  * not required in `PATH` when using the `--no-mp4` CLI option
    * successfully tested with version: 4.1.3

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
