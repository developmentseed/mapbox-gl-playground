'use strict'

const choo = require('choo')
const mapboxgl = require('mapbox-gl')
const validate = require('mapbox-gl-style-spec/lib/validate_style.min')
const CodeMirror = require('codemirror')
const debounce = require('lodash.debounce')
const getAccessToken = require('./access-token')

// load javascript mode for code mirror
require('codemirror/mode/javascript/javascript')

document.head.appendChild(choo.view`<link href='https://api.tiles.mapbox.com/mapbox-gl-js/v0.20.1/mapbox-gl.css' rel='stylesheet' />`)
document.head.appendChild(choo.view`<link href='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/codemirror.css' rel='stylesheet' />`)
document.head.appendChild(choo.view`<style>
  body { margin:0; padding:0; }
  #map { position:absolute; top:0; bottom:0; width:60%; }
  #style { position: absolute; top: 0; bottom: 20px; right: 0; width: 40%; overflow: auto; }
  #download { position: absolute; bottom: 0; right: 0; }
  .CodeMirror { height: auto; }
</style>`)

mapboxgl.accessToken = getAccessToken()
const app = choo()

app.model({
  state: { style: null },
  reducers: {
    setStyle: (action, state) => extend(state, { style: action.payload })
  },
  effects: {
    init: (action, state, send) => {
      codeMirror = window.cm = CodeMirror(document.getElementById('style'), {
        mode: { name: 'javascript', json: true },
        value: JSON.stringify(state.style)
      })
      codeMirror.on('change', debounce(onChange, 300))

      var style = getStyle(action)
      map = window.map = new mapboxgl.Map({
        container: 'map',
        style: style,
        zoom: 3.7,
        center: [0, 0]
      })
      map.on('style.load', () => {
        send('setStyle', { payload: map.getStyle() })
      })

      function onChange (cm, change) {
        if (change.origin === 'setValue') { return }
        try {
          var newStyle = JSON.parse(codeMirror.getValue())
          var errors = validate(newStyle)
          if (errors.length > 0) {
            errors.forEach(e => { console.warn(e) })
            return
          }
          console.log('updating style', newStyle)
          send('setStyle', { payload: newStyle })
        } catch (e) { }
      }
    }
  }
})

// mapbox-gl map
var map
var mapContainer = choo.view`<div id='map'></div>`

// codemirror
var codeMirror
var codeContainer = choo.view`<div id='style'></div>`

var hash = null
const mainView = (params, state, send, prevState) => {
  if (!map) { send('init', params) }
  if (hash && hash !== state.app.location) {
    map.setStyle(getStyle(params))
    codeMirror.setValue('null')
  }
  hash = state.app.location
  var text = JSON.stringify(state.style, null, 2)
  if (state.style && (!prevState || state.style !== prevState.style)) {
    if (/^null/.test(codeMirror.getValue())) {
      codeMirror.setValue(text)
    }
    if (text !== JSON.stringify(map.getStyle(), null, 2)) {
      map.setStyle(state.style)
    }
  }
  return choo.view`
    <main>
      ${mapContainer}
      <div id='download'>
      <a href=${'data:application/octet-stream,' + encodeURIComponent(text)}>Download style JSON</a>
      </div>
    </main>
  `
}

app.router((route) => [
  route('/', mainView),
  route('/style/:account/:style', mainView),
])

const tree = app.start({ hash: true })

document.body.appendChild(tree)
document.body.appendChild(codeContainer)

function extend (o1, o2) { return Object.assign({}, o1, o2) }

function getStyle (options) {
  return options.style ? `mapbox://styles/${options.account}/${options.style}`
    : 'mapbox://styles/mapbox/streets-v9'
}
