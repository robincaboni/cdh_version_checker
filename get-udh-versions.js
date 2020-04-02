#!/usr/bin/env node

// reference: https://medium.freecodecamp.org/writing-command-line-applications-in-nodejs-2cf8327eee2
'use strict';
(function () {
  const program = require('commander'),
    fs = require('fs'),
    RateLimiter = require('request-rate-limiter')

  const limiter = new RateLimiter({
    rate: 80, // requests per interval period
    interval: 1, // interval period (seconds)
    maxWaitingTime: 30000 // max wait time for queued requests (seconds) - default is 300 (5min)
  })


  program
    .version('0.0.1')
    .command('get-versions')
    .description('Helps UDH debugging by checking settings')
    .action()

  program.parse(process.argv)

  const account = "services-robin-caboni"
  const profile = "main"
  const jsessionid = "772b12bd-6231-4d9a-9d72-4f97999382ef"
  const utk = "3f0ed9338e7d1dbdbed0ab507035a93448cdc16f72ea81c867"
  const startDate = "2019-12-01"
  const endDate = "2020-03-05"


  /*
  if (program.args.length === 0) {
    console.log("ERROR: Please provide a file name.")
    return false;
  }
  */


  //https://my.tealiumiq.com/urest/datacloud/1und1/main/profile/version/name?utk=0551d7fc0838538d90e4b4365771981a7faabdf56f8222a318
  const getVersionNames = function () {
    return {
      method: 'GET',
      uri: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/profile/version/name?utk=${utk}`,
      headers: {
        'Cookie': `JSESSIONID=${jsessionid}`,
        'Accept': 'application/json'
      }
    }
  }

  // https://my.tealiumiq.com/urest/datacloud/1und1/main/profile/revision?utk=0551d7fc0838538d90e4b4365771981a7faabdf56f8222a318&versions=2019-03-28+Tealium+Cleanup&versions=2019-04-08+Android+Pit+Removal&start=2019-03-16T00%3A00%3A00.000Z
  // expects a string
  const getRevisions = function (versionNameArray) {
    function generateVersionString(names) {
      let versionString = ""
      names.forEach(function (name) {
        name = encodeURIComponent(name)
        versionString += `&versions=${name}`
      });
      return versionString
    }
    return {
      method: 'GET',
      uri: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/profile/revision?utk=${utk}&${generateVersionString(versionNameArray)}&start=${startDate}T00%3A00%3A00.000Z&end=${endDate}T23%3A59%3A59.999Z`,
      headers: {
        'Cookie': `JSESSIONID=${jsessionid}`,
        'Accept': 'application/json'
      }
    }
  }

  const getRevisionProfile = function (revision) {
    return {
      method: 'GET',
      uri: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/profile/revision/${revision}?utk=${utk}`,
      headers: {
        'Cookie': `JSESSIONID=${jsessionid}`,
        'Accept': 'application/json'
      }
    }
  }

  const addRightPadding = function (inputString, targetLength) {
    inputString = String(inputString)
    targetLength = targetLength || 30;
    let outputString = inputString;
    if (inputString.length > targetLength - 1) outputString = inputString.slice(0, targetLength - 4) + "..."
    while (outputString.length < targetLength) {
      outputString += " ";
    }
    return outputString;
  }

  const formatAndOutputSummary = function (summaryArray) {
    // sort by revision time
    summaryArray.sort((a, b) => (a.revisionTime > b.revisionTime) ? -1 : ((b.revisionTime > a.revisionTime) ? 1 : 0));
    summaryArray.forEach(function (summary) {
      let keys = Object.keys(summary)
      if (summary === summaryArray[0]) {
        let headerRow = ""
        keys.forEach(function (key) {
          headerRow += addRightPadding(key)
        })
        console.log(headerRow + "\n")
      }
      let outputString = "";
      keys.forEach(function (key) {
        outputString += addRightPadding(summary[key])
      })
      console.log(outputString)
    })
  }


  console.log(`START!  sent first request!`)

  let summaries = [];

  let sendVersionNamesRequest = function () {
    // could use 'finally' but it's not supported by default in the rate limiter
    let onResponse = function (success, error) {
      error && console.log("Got error response: " + error)
      success && console.log("Got success response" + success + "\n")
      //success && console.log(`SUCCESS: ${JSON.stringify(success)}`)
      error && console.log(`ERROR: ${JSON.stringify(error)}`)
    }
    let getVersionNamesRequest = getVersionNames();
    
    limiter.request(getVersionNamesRequest)
      .then(function (response) {
        onResponse(response, null);
        let namesArr = [];
        var allNames = JSON.parse(response.body).names;
        allNames.forEach(function (nameObj) {
          namesArr.push(nameObj.version);
        })
        //namesArr.push(JSON.parse(response.body).names[2].version)
        let getRevisionsRequests = getRevisions(namesArr);
        return limiter.request(getRevisionsRequests);
      })
      .then(function (response) {
        onResponse(response, null);
        var responseBody = JSON.parse(response.body);
        let revisionRequests = [];
        let versions = Object.keys(responseBody);
        versions.forEach(function (version) {
          responseBody[version].forEach(function (el) {
            revisionRequests.push(getRevisionProfile(el.revision));
          })
        })
        let promises = []
        revisionRequests.forEach(function (req) {
          promises.push(limiter.request(req));
        })
        return Promise.all(promises)
      })
      .then(function (response) {
        onResponse(response, null)
        response.forEach(function (resp) {
          let body = JSON.parse(resp.body)
          let revisionSummary = {
            "revisionTime": body.version_info.revision,
            "stitchingEnabled": body.settings.stitchingEnabled,
            "eventDbEnabled": body.settings.eventDBEnabled,
            "audienceDbEnabled": body.settings.audienceDBEnabled,
            "versionTitle": body.version_info.version,
            "visitorRetentionDays": body.settings.visitorRetentionDays,
            "lastModifiedBy": body.version_info.lastModifiedBy,
            "hasBeenPublished": body.version_info.hasBeenPublished,
            "versionDescription": body.version_info.description,
            "collectClientIp": body.settings.collectClientIp
          }
          summaries.push(revisionSummary)
        })
        return true;
      })
      .then(function (response) {
        //console.log(JSON.stringify(summaries))
        //console.log("\n\n\n")
        formatAndOutputSummary(summaries)
      })
      .catch(function error(err) {
        onResponse(null, err)
      })
  }

  sendVersionNamesRequest()

}())