
window.APP={}

export default class APP_Properties {
  constructor() {

    APP = {};

    //////////////////////////////////////////// PRESET config

    const PRESETS = {
    /////////////////////////////// developer settings
      dev: {

        protocol: window.location.protocol,
        host: window.location.hostname,
        port: window.location.port,

        directory: {
          media: 'media'
        }

      },
    //////////////////////////////// production settings
      production: {

      }

    };

    APP.preset = PRESETS['dev'];

    /////////////////////////////////////////// APP properties
    APP.properties = {
      version:'0.0.1'
    };

    /////////////////////////////////////////// APP settings

    APP.host =  APP.preset.protocol + '//' + APP.preset.host + ':' + APP.preset.port;

    APP.directory = {
      media: APP.host + "/" + APP.preset.directory.media
    }

    APP.running = false;

    /////

  }
}

//window.APP.log = function() {

//};
