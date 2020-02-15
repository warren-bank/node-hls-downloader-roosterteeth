const {requestHTTP, downloadHTTP, downloadHLS} = require('@warren-bank/node-hls-downloader')

const mkdir = require('./mkdir')
const path  = require('path')
const fs    = require('fs')

// -----------------------------------------------------------------------------
// returns a Promise that resolves after all downloads are complete.

const process_cli = function(argv_vals){

  const download_file = async function(url){
    let file
    try {
      file = await requestHTTP(url)
      file = file.response.toString()
    }
    catch(err) {
      file = ""
    }
    return file
  }

  const download_json = async function(url){
    const json = await download_file(url)
    let data
    try {
      data = JSON.parse(json)
    }
    catch(err) {
      data = null
    }
    return data
  }

  // ---------------------------------------------------------------------------
  // API

  const API = {
    // -------------------------------------------------------------------------

    regex_url: /^https?:\/\/(?:[^\.]+\.)*roosterteeth\.com\/(watch|series)\/([^\/\?]+)(?:[\/\?].*)?$/i,

    get_url_type: (url) => {
      let url_type = API.regex_url.test(url)
        ? url.replace(API.regex_url, '$1')
        : null

      if (!url_type)
        throw new Error(`Error: cannot parse format of Rooster Teeth URL: '${url}'`)

      switch(url_type.toLowerCase()) {
        case 'watch':
          url_type = 'episode'
          break
        case 'series':
          url_type = 'series'
          break
      }

      return url_type
    },

    get_url_slug: (url) => {
      const url_slug = API.regex_url.test(url)
        ? url.replace(API.regex_url, '$2')
        : null

      if (!url_slug)
        throw new Error(`Error: cannot parse format of Rooster Teeth URL: '${url}'`)

      return url_slug
    },

    get_episode_slug: (url) => API.get_url_slug(url),
    get_series_slug:  (url) => API.get_url_slug(url),

    // -------------------------------------------------------------------------

    get_seasons_in_series: async (series_slug) => {
      const url  = `https://svod-be.roosterteeth.com/api/v1/shows/${series_slug}/seasons?order=asc`
      const data = await download_json(url)

      if (!data || !(data instanceof Object) || !data.data || !data.data.length)
        throw new Error(`Error: cannot obtain list of seasons in series: '${series_slug}'`)

      const  season_slugs = data.data.map(obj => ((obj instanceof Object) && (obj.type === 'season') && (obj.attributes instanceof Object) && obj.attributes.slug) ? obj.attributes.slug : null).filter(slug => !!slug)
      return season_slugs
    },

    get_episodes_in_season: async (season_slug) => {
      const url  = `https://svod-be.roosterteeth.com/api/v1/seasons/${season_slug}/episodes?order=asc&per_page=100`
      const data = await download_json(url)

      if (!data || !(data instanceof Object) || !data.data || !data.data.length)
        throw new Error(`Error: cannot obtain list of episodes in season: '${season_slug}'`)

      const  episode_slugs = data.data.map(obj => ((obj instanceof Object) && (obj.type === 'episode') && (obj.attributes instanceof Object) && obj.attributes.slug) ? obj.attributes.slug : null).filter(slug => !!slug)
      return episode_slugs
    },

    get_episode_urls_in_series: async (series_slug) => {
      let episode_urls = []

      const season_slugs = await API.get_seasons_in_series(series_slug)

      for (const season_slug of season_slugs) {
        const episode_slugs = await API.get_episodes_in_season(season_slug)
        const urls = episode_slugs.map(episode_slug => `https://roosterteeth.com/watch/${episode_slug}`)

        episode_urls = [
          ...episode_urls,
          ...urls
        ]
      }

      return episode_urls
    },

    process_series_url: async (series_url) => {
      const series_slug  = API.get_series_slug(series_url)
      const episode_urls = await API.get_episode_urls_in_series(series_slug)

      // assertion
      if (!episode_urls.length)
        throw new Error(`Assertion Error: no episodes are available in series at Rooster Teeth URL: '${series_url}'`)

      return {episode_urls}
    },

    // -------------------------------------------------------------------------

    get_episode_metadata: async (episode_slug) => {
      const url  = `https://svod-be.roosterteeth.com/api/v1/watch/${episode_slug}`
      const data = await download_json(url)

      if (!data || !(data instanceof Object) || !data.data || !data.data.length)
        throw new Error(`Error: cannot obtain metadata for episode: '${episode_slug}'`)

      const pad_zeros = (num, len) => {
        let str = num.toString()
        let pad = len - str.length
        if (pad > 0)
          str = ('0').repeat(pad) + str
        return str
      }

      const episode_metadata = {}
      data.data.forEach(obj => {
        if (!(obj instanceof Object) || (obj.type !== 'episode') || !(obj.attributes instanceof Object))
          return

        if (!episode_metadata.series_title && obj.attributes.show_title)
          episode_metadata["series_title"] = obj.attributes.show_title
        if (!episode_metadata.episode_title && (obj.attributes.title || obj.attributes.display_title))
          episode_metadata["episode_title"] = obj.attributes.title || obj.attributes.display_title
        if (!episode_metadata.episode_number && obj.attributes.season_number && obj.attributes.number)
          episode_metadata["episode_number"] = `S${pad_zeros(obj.attributes.season_number, 2)}E${pad_zeros(obj.attributes.number, 2)}`
      })

      if (episode_metadata.episode_number && episode_metadata.episode_title) {
        episode_metadata["episode_title"] = `${episode_metadata.episode_number} ${episode_metadata.episode_title}`
        delete episode_metadata.episode_number
      }

      return (episode_metadata.series_title && episode_metadata.episode_title)
        ? episode_metadata
        : null
    },

    get_episode_m3u8_url: async (episode_slug) => {
      const url  = `https://svod-be.roosterteeth.com/api/v1/watch/${episode_slug}/videos`
      const data = await download_json(url)

      if (!data || !(data instanceof Object))
        throw new Error(`Error: cannot obtain list of videos in episode: '${episode_slug}'`)
      if (data.access === false)
        throw new Error(`Error: cannot access non-public episode: '${episode_slug}'`)
      if (!data.data || !data.data.length)
        throw new Error(`Error: cannot obtain list of videos in episode: '${episode_slug}'`)

      const m3u8_urls = []
      data.data.forEach(obj => {
        if (!(obj instanceof Object) || (obj.type !== 'video'))
          return
        if ((obj.attributes instanceof Object) && obj.attributes.url)
          m3u8_urls.push(obj.attributes.url)
        if ((obj.links instanceof Object) && obj.links.download)
          m3u8_urls.push(obj.links.download)
      })

      return (m3u8_urls.length) ? m3u8_urls[0] : null
    },

    process_episode_url: async (episode_url) => {
      const episode_slug = API.get_episode_slug(episode_url)
      const metadata     = await API.get_episode_metadata(episode_slug)
      const m3u8_url     = await API.get_episode_m3u8_url(episode_slug)

      // assertion
      if (!metadata)
        throw new Error(`Assertion Error: no metadata is available for episode at Rooster Teeth URL: '${episode_url}'`)

      // assertion
      if (!m3u8_url)
        throw new Error(`Assertion Error: no m3u8 video streams are available for episode at Rooster Teeth URL: '${episode_url}'`)

      return {...metadata, m3u8_url}
    },

    // -------------------------------------------------------------------------
  }

  // ---------------------------------------------------------------------------

  const process_url = async function(url, type){
    if (!type)
      type = API.get_url_type(url)

    // short-circuit optimization
    if (argv_vals["--dry-run"] && (argv_vals["--log-level"] === 1)) {
      if (type === 'episode') console.log(url)
      if (type !== 'series')  return
    }

    switch(type) {
      case 'episode':
        await process_episode_url(url)
        break
      case 'series':
        await process_series_url(url)
        break
    }
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all downloads complete (HLS video, HLS audio, VTT subtitles) for a single movie or TV episode

  const process_episode_url = async function(url){
    const {series_title, episode_title, m3u8_url} = await API.process_episode_url(url)

    const outputdir = path.join(argv_vals["--directory-prefix"], sanitize_title(series_title), sanitize_title(episode_title))

    const configHLS = {
      "--no-clobber":        false,
      "--continue":          true,
    
      "--url":               m3u8_url,
      "--max-concurrency":   argv_vals["--max-concurrency"],
    
      "--directory-prefix":  path.join(outputdir, 'hls'),
      "--mp4":               ((!argv_vals["--no-mp4"]) ? path.join(outputdir, 'mp4') : null),
    
      "--skip-video":        false,
      "--skip-audio":        false,
      "--skip-subtitles":    false,
    
      "--min-bandwidth":     null,
      "--max-bandwidth":     null,
      "--highest-quality":   true,
      "--lowest-quality":    false,
    
      "--all-audio":         true,
      "--all-subtitles":     true,
      "--filter-audio":      null,
      "--filter-subtitles":  null
    }

    if (!argv_vals["--quiet"]) {
      let ffmpegcmd = `cd "${configHLS["--directory-prefix"]}" && mkdir "${path.join('..', 'mp4')}" & ffmpeg -allowed_extensions ALL -i "master.m3u8" -c copy -movflags +faststart "${path.join('..', 'mp4', 'video.mp4')}"`

      switch(argv_vals["--log-level"]) {
        case 1:
          console.log(url)
          break
        case 2:
          console.log(ffmpegcmd)
          break
        case 3:
          console.log(`processing page:\n  ${url}\ntype:\n  episode\nHLS manifest:\n  ${m3u8_url}\noutput directory:\n  ${outputdir}\nmp4 conversion${argv_vals["--no-mp4"] ? ' (skipped)' : ''}:\n  ${ffmpegcmd}`)
          break
        case 0:
        default:
          // noop
          break
      }
    }

    if (!argv_vals["--dry-run"])
      await start_downloadHLS(configHLS)
  }

  const sanitize_title = (title) => title.replace(/[\\\/\*\?:"<>|]+/g, '')

  const start_downloadHLS = (configHLS) => {
    if (configHLS["--directory-prefix"]) {
      mkdir(configHLS["--directory-prefix"])

      // files
      ;["master.m3u8","video.m3u8"].forEach(child => {
        let childpath = path.join(configHLS["--directory-prefix"], child)
        if (fs.existsSync(childpath))
          fs.unlinkSync(childpath)
      })
    }

    if (configHLS["--mp4"]) {
      mkdir(configHLS["--mp4"])

      configHLS["--mp4"] = path.join(configHLS["--mp4"], 'video.mp4')

      if (fs.existsSync(configHLS["--mp4"]))
        fs.unlinkSync(configHLS["--mp4"])
    }

    // Promise
    return downloadHLS(configHLS)
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all downloads complete for all episodes in all seasons of a series

  const process_series_url = async function(url){
    const {episode_urls} = await API.process_series_url(url)

    while(episode_urls.length) {
      let url  = episode_urls.shift()
      let type = 'episode'
      await process_url(url, type)
    }
  }

  // ---------------------------------------------------------------------------
  // returns a Promise that resolves after all URLs in command-line have been processed

  const process_argv = async function(){
    if (argv_vals["--input-file"] && argv_vals["--input-file"].length) {
      while(argv_vals["--input-file"].length) {
        let url = argv_vals["--input-file"].shift()
        await process_url(url)
      }
    }
    else {
      let url = argv_vals["--url"]
      await process_url(url)
    }
  }

  return process_argv()
}

// -----------------------------------------------------------------------------

module.exports = {requestHTTP, downloadHTTP, downloadHLS, downloadTV: process_cli}
