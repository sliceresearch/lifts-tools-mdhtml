//// lift-tools - md2html


//taking a markdown file as input (you can use my ICT221 lecture as an example
// manually add a slide/page for an interactive quiz and maybe another one for a YouTube video)

//running it as an interactive web-based presentation

//integrating some external interactive components, such as an MS Forms quiz.

// import * as fs from 'fs';

import APP_run from './app-run.js';

window.app = new APP_run();
