const parseCookie = require('cookie').parse
const request = require('request')
const jsdom = require('jsdom')

function getRoll20SessionCookie(username, password) {
  return new Promise((resolve, reject) => {
    console.log('Authenticating with Roll20.net...')

    request.post('https://app.roll20.net/sessions/create', {
      form: {
        email: username,
        password: password
      }
    }, (err, httpResponse) => {
      if (err) {
        return reject(err)
      }

      if (httpResponse.statusCode !== 303 || httpResponse.headers['location'] !== 'https://app.roll20.net/home/') {
        return reject(new Error('Invalid Roll20 credentials!'))
      }

      const cookies = httpResponse.headers['set-cookie']
        .reduce((cookies, setCookie) => {
          const cookie = parseCookie(setCookie)
          delete cookie.domain
          delete cookie.path
          delete cookie.expires

          return [
            ...cookies,
            ...Object.keys(cookie).map(value => `${value}=${cookie[value]}`)
          ]
        }, [])
        .filter((cookie, index, cookies) => {
          const cookieName = cookie.slice(0, cookie.indexOf('=') + 1);

          if (cookies.some(otherCookie => otherCookie.startsWith(cookieName))) {
            return cookies.filter(otherCookie => otherCookie.startsWith(cookieName)).sort().reverse()[0] === cookie
          }

          return true
        })
        .join('; ')

      resolve(cookies)
    })
  })
}

function getRoll20ScriptsForCampaign(cookie, campaignId) {
  console.log('Loading existing Roll20 campaign scripts...')

  return new Promise((resolve, reject) => {
    request.get({
      url: `https://app.roll20.net/campaigns/scripts/${campaignId}`,
      headers: {
        'Cookie': cookie
      }
    }, (err, httpResponse, body) => {
      if (err) {
        return reject(err)
      }

      resolve(body)
    })
  })
}

function getScriptFromDOM(html, campaignId, name) {
  const virtualConsole = new jsdom.VirtualConsole();
  const dom = new jsdom.JSDOM(html, {
    url: `https://app.roll20.net/campaigns/scripts/${campaignId}`,
    runScripts: 'dangerously',
    virtualConsole
  })

  const scriptNode = dom.window.document.querySelector(`[data-scriptname="${name}"]`)
  if (scriptNode === null) {
    console.log('No existing Roll20 campaign script found.')
    console.log('Creating a new Roll20 campaign script...')
    return 'new'
  }

  const scriptId = scriptNode.id.slice('script-'.length)

  dom.window.close()

  console.log('Existing Roll20 campaign script found!')

  return scriptId
}

function saveScriptToRoll20(code, campaignId, scriptId, cookie, name) {
  console.log(`Deploying script #${scriptId}...`)

  return new Promise((resolve, reject) => {
    request.post({
      url: `https://app.roll20.net/campaigns/save_script/${campaignId}/${scriptId}`,
      headers: {
        'Cookie': cookie
      },
      formData: {
        name,
        content: code
      }
    }, (err, httpResponse, body) => {
      if (err) {
        return reject(err)
      }

      resolve(body)
    })
  })
}

module.exports = function deploy(code, options) {
  return getRoll20SessionCookie(options.roll20.username, options.roll20.password)
    .then(cookie => {
      return getRoll20ScriptsForCampaign(cookie, options.roll20.campaign)
        .then(html => getScriptFromDOM(html, options.roll20.campaign, options.name))
        .then(scriptId => saveScriptToRoll20(code, options.roll20.campaign, scriptId, cookie, options.name))
    })
    .then(() => {
      console.log('Deployed script to Roll20!')
    })
}
