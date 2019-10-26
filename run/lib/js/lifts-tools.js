(function () {
  'use strict';

  window.APP = {};
  class APP_Properties {
    constructor() {
      APP = {}; //////////////////////////////////////////// PRESET config

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
        production: {}
      };
      APP.preset = PRESETS['dev']; /////////////////////////////////////////// APP properties

      APP.properties = {
        version: '0.0.1'
      }; /////////////////////////////////////////// APP settings

      APP.host = APP.preset.protocol + '//' + APP.preset.host + ':' + APP.preset.port;
      APP.directory = {
        media: APP.host + "/" + APP.preset.directory.media
      };
      APP.running = false;
    }

  }

  class UTIL_FileURLLoader {
    constructor(p, u) {
      this.parent = p;
      this.id = p.id;
      this.init(u);
    }

    init(u) {
      this.URL = u;
      this.URLp = '';
      this.URLtext = "";
      this.URLready = false;
      this.URLMediaready = false;
      this.URLTimeout = 1000;
      this.URLTimeoutCount = 0;
      this.URLTimer = Date.now();
    } //////////////////////////////////URL


    checkURLReady() {
      if (this.URLready == false) {
        if (this.URLTimer != 0) {
          if (this.URL != undefined) {
            if (this.URL != '') {
              //    if (this.media.agent.active == false) {
              if (this.checkURLTimeout() == true) {
                this.checkURL();
              } //    }

            }
          }
        }
      } else {
        ///check start
        if (this.URLMediaready == false) {
          if (this.URLTimer != 0) {
            if (this.URL != undefined) {
              if (this.URL != '') {
                //    if (this.media.agent.active == false) {
                if (this.checkURLTimeout() == true) {
                  this.checkMediaURL();
                } //    }

              }
            }
          }
        }
      }
    }

    checkURL() {
      console.log('util-fileURL (checkurl):' + this.id + ' ' + this.URL);
      this.URLTimer = 0;
      this.fileExistsCall(this.URL, this, this.fileExistsCallback);
    }

    checkURLCallback(status) {
      if (status == true) {
        console.log('util-fileURL (checkurl-call-ok):' + this.id + ' ' + this.URL);
        this.setURL();
      } else {
        console.log('util-fileURL (checkurl-call-timeout):' + this.id + ' ' + this.URL);
        this.setURLTimeout();
      }
    }

    checkURL2() {
      console.log('util-fileURL (checkurl):' + this.id + ' ' + this.URL);

      const _me = this;

      if (this.fileExists(this.URL)) {
        _me.setURL();
      } else {
        _me.setURLTimeout();
      }
    }

    setURL() {
      console.log('util-fileURL (set):' + this.id + ' ' + this.URL);
      if (this.URL == '') console.log('util-fileURL (set-null):' + this.id + ' ' + this.URL);

      if (this.URLready == false) {
        this.URLready = true;
        this.parent.setURLMedia();
        this.URLTimeoutCount = 0;
        this.URLTimer = Date.now();
      }
    }

    checkMediaURL() {
      console.log('util-fileURL (checkmedia):' + this.id + ' ' + this.URL);

      const _me = this;

      if (this.parent.checkURLMedia(this.URL, this.URLp)) {
        _me.startURL();
      } else {
        _me.setURLTimeout();
      }
    }

    startURL() {
      console.log('util-fileURL (startmedia):' + this.id + ' ' + this.URL);

      if (this.URLMediaready == false) {
        this.URLMediaready = true;
        this.parent.startURLMedia();
      }
    }

    setURLTimeout() {
      this.URLTimeoutCount++;
      this.URLTimer = Date.now();
      console.log('util-fileURL (timer):' + this.id + ' ' + this.URLTimeoutCount);

      if (this.URLTimeoutCount > 3) {
        this.URLTimeoutCount = 0;
        this.URLTimer = 0;
        this.parent.failURLMedia();
      }
    }

    checkURLTimeout() {
      const elapsed = Date.now() - this.URLTimer;

      if (elapsed > this.URLTimeout) {
        this.URLTimer = 0;
        console.log('util-fileURL (timeout):' + this.id + ' ' + elapsed);
        return true;
      }

      return false;
    }

    fileExistsCall(url, index, callback) {
      var _me = this;

      if (url == '') {
        callback(false, index);
      } else {
        var http = new XMLHttpRequest();

        http.onreadystatechange = function () {
          if (http.readyState == 4) {
            console.log('autil: (exists-call):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);

            if (http.status == 200 || http.status == 206) {
              _me.URLtext = http.responseText;
              console.log('autil: (ok):');
              callback(true, index);
            } else {
              callback(false, index);
            }
          }
        };

        http.open('GET', url, true);
        http.send(null);
      }

      console.log('autil: (exists):' + url + ' ' + http.status);
    }

    fileExistsCallback(status, obj) {
      //  var nobj = anetSystem.nodes[id];
      console.log('autil: (exists-callback):' + obj + ' ' + status); //  if (nobj != undefined) {

      obj.checkURLCallback(status); //  }
    }

    fileExists(url) {
      var http = new XMLHttpRequest();
      http.open('HEAD', url, false);
      http.send(null);
      console.log('autil: (exists-test):' + url + ' ' + http.status);

      if (http.status == 404) {
        console.log('autil: (exists-nup):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);
        return false;
      }

      console.log('autil: (exists-yep):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);
      return true;
    }

  }

  class UTIL_fileio {
    constructor(parent) {
      this.callback = parent;
    }

    read(filename) {
      console.log('fileio (get) ', filename);
      this.urlLoader = new UTIL_FileURLLoader(this, filename);
    }

    cycle() {
      this.urlLoader.checkURLReady();
    } ////////////////////////////////////////////URL loader callbacks


    setURLMedia() {
      //  console.log('seturl',this.urlLoader.URLtext);
      this.callback.call('fileio_text', this.urlLoader.URLtext);
    }

    checkURLMedia() {
      return true;
    }

    startURLMedia() {}

  }
  /*
    async load(filename) {
        console.log('fileio (await) ',filename)
        const readme = await this.promiseReader(filename);
        console.log(readme);
    }


    promise(path) {
      return new Promise((resolve, reject) => {
        fs.readFileSync(path, 'utf8', function (err, data) {
          if (err) {
            reject(err);
          }
          resolve(data);
          console.log(data)
        });
      });
    }*/

  /*

      promiseReader (inputFile)  {

                  const temporaryFileReader = new FileReader();

                  const file = inputFile.files[0];

                console.log('promiseReader',temporaryFileReader,file);

                  return new Promise((resolve, reject) => {
                    temporaryFileReader.onerror = () => {
                      temporaryFileReader.abort();
                      reject(new DOMException("Problem parsing input file."));
                    };

                    temporaryFileReader.onload = () => {
                      resolve(temporaryFileReader.result);
                      console.log(temporaryFileReader.result);
                    };


                        console.log('onchange');

                        console.log('onchange',file);
                      temporaryFileReader.readAsDataURL(file);

                  //  temporaryFileReader.readAsText(inputFile);
                  });


      }



    async read(file) {

        try {
          const fileContents = await this.readTextFile(file);
          console.log(fileContents);
        //  fileContentDiv.innerHTML = fileContents
        } catch (e) {
            console.log(e.message);
        //  fileContentDiv.innerHTML = e.message
        }

    }
  */

  //// lift-tools - md2html
  class LIFTS_MD2html {
    constructor() {
      this.dir_media = APP.directory.media;
    } /////  init


    init() {
      this.init_converter();
      this.fileio = new UTIL_fileio(this);
      console.log('LIFTS-md2html (init)  ' + 'v:' + APP.properties.version + '  dir:' + this.dir_media);
    }

    cycle() {
      this.fileio.cycle();
    }

    call(op, arg) {
      if (op == 'fileio_text') this.publish(arg);
    }

    publish(arg) {
      let html = this.convert_text_md(arg);
      let html_target = document.getElementById('iframe');
      console.log('pub:', html_target);
    } //////////////////////////////////showdown
    ///  global settings for showdown


    init_converter() {
      this.converter2HTML = new showdown.Converter();
    }

    convert_text_md(text) {
      let html = this.md2html(text); //    console.log('LIFTS-md2html (html)  ' + html)

      return html;
    } //////////////////////////////////unit tests


    test() {
      console.log('LIFTS-md2html (tests)  ' + 'v:' + APP.properties.version + '  dir:' + this.dir_media);
      this.test_md2html();
    }

    test_md2html() {
      var test = this.mdfile2html('ict221', 'ICT221_Week01_Java_Intro');
      console.log('LIFTS-md2html (test-md2html)  ' + test);
    } ////////////////////////////////////md2html


    mdfile2html(directory, filename) {
      var fn = this.media_file_name_get(directory, filename);
      this.media_file_read(fn);
    }

    md2html(mdtext) {
      return this.converter2HTML.makeHtml(mdtext);
    } //////////////////////////////////////////////media file


    media_file_read(filename) {
      this.fileio.read(filename);
    }

    media_file_set_text(text) {}

    media_file_name_get(directory, filename) {
      let fn = this.dir_media + '/' + directory + '/' + filename + ".md";
      return fn;
    }

  }

  //// lift-tools - md2html
  class APP_run {
    constructor() {
      this.properties = new APP_Properties();
      console.log(APP);
    } /////  init


    init() {
      this.md2html = new LIFTS_MD2html();
      this.md2html.init();
      this.run();
      APP.running = true;
    }

    run() {
      setInterval(function () {
        step();
      }, 1000 / 29.97);
    }

    cycle() {
      this.md2html.cycle();
    } //////////////////////////////////convert


    setPresentation(html) {
      let html_target = document.getElementById('lifts-html'); //

      var makeIframe = document.createElement("iframe");
      makeIframe.setAttribute("src", "reveal.html");
      makeIframe.setAttribute("scrolling", "no");
      makeIframe.style.border = "none"; //    makeIframe.style.left =  "0px";
      //  makeIframe.style.top = "-70px";

      makeIframe.style.position = "absolute";
      console.log(makeIframe);
      html_target.appendChild(makeIframe); //  html_target.innerHTML = makeIframe.innerHTML
    } //////////////////////////////////unit tests


    test() {
      this.md2html.test();
    }

    test_run() {
      console.log('LIFTS-tools (test-run)  ' + 'v:' + APP.properties.version);
      this.setPresentation();
    }

    test_html() {
      return '<div class="reveal"><div class="slides">	<section>Slide 1</section>	<section>Slide 2</section>	</div></div>';
    } //  target = document.getElementById('targetDiv'),
    //    converter = new showdown.Converter(),
    //    html = converter.makeHtml(text);
    //  target.innerHTML = html;


  }

  function step() {
    if (APP.running) {
      window.app.cycle();
    }
  }

  //// lift-tools - md2html
  window.app = new APP_run();

}());
