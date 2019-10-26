//// lift-tools - md2html

//taking a markdown file as input (you can use my ICT221 lecture as an example
// manually add a slide/page for an interactive quiz and maybe another one for a YouTube video)

//running it as an interactive web-based presentation

//integrating some external interactive components, such as an MS Forms quiz.

import CodeMirror from 'codemirror';

import APP_Properties from './app-properties.js';

import LIFTS_md2html from './tool/lifts-md2html.js';

//import * as $ from 'jquery';

export default class APP_run {
  constructor() {

    this.properties = new APP_Properties();

    console.log(APP)

  }

  /////  init
  init() {
    this.md2html = new LIFTS_md2html();
    this.md2html.init();

    this.codemirror_init();


    this.run();


    APP.running = true;

  }

  run() {
    setInterval(function() {
    step();
  }, 5000 / 29.97);
  }

  cycle() {

      this.md2html.cycle();

  }

  //////////////////////////////////codemirror

  codemirror_init() {

    let html_element = document.getElementById('lifts-markdown');

    this.codemirror = CodeMirror(html_element, {
          value: "\n",
          mode:  "javascript"
      });

  //    console.log(myCodeMirror,html_element,document.body)

  }


  codemirror_value(v) {
    this.codemirror.setValue(v)
  }

  //////////////////////////////////reveal

  presentation_set() {
    this.presentation_frame_set()
    this.presentation_target_set()

  }

  presentation_update() {
    this.presentation_frame_update()
  //  document.getElementById('lifts-reveal').contentDocument.location.reload(true);
  }

  presentation_target_set() {
    let html_target = document.getElementById('lifts-html');
    html_target.appendChild(this.iframe_reveal);
  }

  presentation_frame_set() {

    this.iframe_reveal = document.createElement("iframe");
    this.iframe_reveal.setAttribute("id", "lifts-reveal");
    this.iframe_reveal.setAttribute("src", "reveal.html");
    this.iframe_reveal.setAttribute("scrolling", "no");
    this.iframe_reveal.style.border = "0";
    this.iframe_reveal.style.left =  "5";
    this.iframe_reveal.style.top = "0";
    this.iframe_reveal.style.right = "0";
    this.iframe_reveal.style.bottom = "0";
    this.iframe_reveal.style.width = "100%";
    this.iframe_reveal.style.height = "100%";
    this.iframe_reveal.style.position = "absolute";

  }

  presentation_frame_update() {

      this.codemirror_value(this.md2html.markdown);

        let html_target = document.getElementById('lifts-reveal');

        var html_target_inner = (html_target.contentDocument)
                   ? html_target.contentDocument
                   : html_target.contentWindow.document;

        let html_tag = html_target_inner.getElementById('lifts-slides');

    //    let html_tag = this.iframe_reveal.getElementById('lifts-slides');

        //  html_tag.innerHTML=	"<section>Slide 1</section><section>Slide 2</section>";
         html_tag.innerHTML=this.md2html.html;
         //html_target_inner.getElementById('lifts-slides').innerHTML=html;
         console.log('pub:',html_target_inner,html_tag)

    }

    reveal_footer() {


    }


    reveal_init() {

      Reveal.initialize({
        dependencies: [
          { src: 'plugin/markdown/marked.js' },
          { src: 'plugin/markdown/markdown.js' },
          { src: 'plugin/notes/notes.js', async: true },
          { src: 'plugin/highlight/highlight.js', async: true }
        ]
      });

    }
//////////////////////////////////unit tests
  test() {
    //  this.codemirror();
  //  this.md2html.test();

  }

  test_run() {

      console.log('LIFTS-tools (test-run)  ' + 'v:' + APP.properties.version)

        this.presentation_set();
        this.md2html.test();
      //  this.setPresentationTarget();

  }

  test_html() {

    return '<div class="reveal"><div class="slides">	<section>Slide 1</section>	<section>Slide 2</section>	</div></div>'

  }
//  target = document.getElementById('targetDiv'),
//    converter = new showdown.Converter(),
//    html = converter.makeHtml(text);

//  target.innerHTML = html;



}

function test_run() {
  window.app.test_run();
}


function step() {
  if (APP.running) {
    window.app.cycle();
  }
}
