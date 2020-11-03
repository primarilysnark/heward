#!/usr/bin/env node

(function() {
  require('dotenv').config()

  require('yargs').usage(`heward ${require('../package.json').version}`)
    .help('help')
    .alias('help', 'h')
    .version()
    .alias('version', 'v')
    .options({
      name: {
        type: 'string',
        describe: 'Name for your script on Roll20.'
      },
      script: {
        type: 'string',
        describe: 'Path to your Roll20 script',
        demand: true,
        requiresArg: true
      },
      campaign: {
        type: 'string',
        describe: 'Campaign ID for your Roll20 campaign. Can be specified in a .env file.'
      },
      username: {
        type: 'string',
        describe: 'Username for your Roll20 account. Can be specified in a .env file.'
      },
      password: {
        type: 'string',
        describe: 'Password for your Roll20 account. Can be specified in a .env file.'
      }
    })
    .parse(process.argv.slice(2), (err, argv, output) => {
      if (err && output) {
        console.error(output)
        process.exitCode = 1
        return
      }

      if (output) {
        console.log(output)
        return
      }

      console.log(`heward ${require('../package.json').version}\n`)

      require('../src/index')({
        script: argv.script,
        name: argv.name || 'heward.js',
        roll20: {
          campaign: argv.campaign || process.env.ROLL20_CAMPAIGN,
          username: argv.username || process.env.ROLL20_USERNAME,
          password: argv.password || process.env.ROLL20_PASSWORD
        }
      })
    })
})()
