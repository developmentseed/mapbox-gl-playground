const qs = require('querystring')

module.exports = function getAccessToken (opts) {
  if (!opts) {
    const query = window.location.search || '?'
    opts = qs.parse(query.substring(1))
  }
  var accessToken =
      opts.access_token ||
      localStorage.getItem('accessToken')
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken)
  }
  return accessToken
}
