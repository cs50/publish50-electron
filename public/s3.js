const { shell } = require('electron')
const AWS = require('aws-sdk')
const fetch = require('node-fetch')

const preferences = require('./preferences')

module.exports = {
  openBucket() {
    const accessKeyId = preferences.get('awsCredentials.accessKeyId')
    const secretAccessKey = preferences.get('awsCredentials.secretAccessKey')
    const stsClient = new AWS.STS({
      accessKeyId,
      secretAccessKey
    })

    const { bucket, durationSeconds, region, roleArn, roleSessionName } = preferences.get('s3')
    stsClient.assumeRole(
      {
        DurationSeconds: durationSeconds,
        RoleArn: roleArn,
        RoleSessionName: roleSessionName
      },
      async (err, data) => {
        if (err) {
          dialog.showMessageBox({
            type: 'error',
            buttons: [ 'OK' ],
            message: 'Failed to assume role',
            detail: err.toString()
          })

          return logger.error(err)
        }

        const { Credentials } = data
        const {
          AccessKeyId: sessionId,
          SecretAccessKey: sessionKey,
          SessionToken: sessionToken
        } = Credentials

        const session = JSON.stringify({
          sessionId,
          sessionKey,
          sessionToken
        })

        const { SigninToken } = await fetch(
          `https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=${encodeURIComponent(session)}`
        ).then((result) => result.json())

        const destination = encodeURIComponent(`https://s3.console.aws.amazon.com/s3/buckets/${bucket}/?region=${region}&tab=overview`)
        shell.openExternal(
          'https://signin.aws.amazon.com/federation?' +
          'Action=login&' +
          'Issuer=cs50.io&' +
          `SigninToken=${SigninToken}&` +
          `Destination=${destination}`
        )
      }
    )
  }
}
