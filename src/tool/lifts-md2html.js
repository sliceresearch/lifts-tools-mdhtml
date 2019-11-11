//// lift-tools - md2html

//taking a markdown file as input (you can use my ICT221 lecture as an example
// manually add a slide/page for an interactive quiz and maybe another one for a YouTube video)

//running it as an interactive web-based presentation

//integrating some external interactive components, such as an MS Forms quiz.

import UTIL_fileio from '../util/util-fileio.js';

import html_parser from 'node-html-parser'

export default class LIFTS_MD2html {
  constructor() {

    this.dir_media = APP.directory.media;
    this.markdown="";
    this.html="";
    this.max_list_nodes=2;

    this.headerTag='h5'
  }

  /////  init
  init() {
    this.init_converter();

    this.fileio = new UTIL_fileio(this);

    console.log('LIFTS-md2html (init)  ' + 'v:' + APP.properties.version + '  dir:'+this.dir_media)

  }

  cycle() {
    this.fileio.cycle();
  }

  call(op,arg) {
        if (op=='fileio_text')
          this.publish(arg);
  }

  publish(arg) {
    this.markdown=arg;
    let html = this.convert_text_md(arg);
    this.html = this.html_parse(html);

    app.presentation_update();
  }


//////////////////////////////////showdown
  ///  global settings for showdown
  init_converter() {
      this.converter2HTML = new showdown.Converter();
  }

  convert_text_md(text) {
      let html = this.md2html(text);
      return html;
  }

//////////////////////////////////html parser
/////// create specific HTML rules here - expand into class later

  html_parse(html) {
    const root = html_parser.parse(html);

    var nnodes = this.process_nodes(root)
    //console.log(nnodes)
    var onodes =this.organise_nodes(nnodes);

    return onodes;
  }

  organise_nodes(html_nodes) {

    var nroot = html_parser.parse();
    var snodes = html_nodes.childNodes;

    let header_node;

     for (let i = 0; i < snodes.length; i++) {
       let snode = snodes[i];
       var section_node = this.add_section_node(nroot);

       /// organise section
       var nodes = snode.childNodes;

        for (let j = 0; j < nodes.length; j++) {
          let node = nodes[j];

        //  console.log(node.tagName,node)

          if (node.tagName==this.headerTag) {
              header_node = node;
          }

          if (node.tagName=='ul') {

              let list_node = this.organise_node_list(node)

              for (let k = 0; k < list_node.length; k++) {
                section_node.appendChild(header_node);
                section_node.appendChild(list_node[k]);
                nroot.appendChild(section_node);
                section_node = this.add_section_node(nroot);
              }

           } else  if (node.tagName=='p') {

             if (header_node!=undefined) {
               section_node.appendChild(header_node);
               section_node.appendChild(node);
               nroot.appendChild(section_node);
               section_node = this.add_section_node(nroot);
             }
           }

          }

     }

     return nroot;
  }




  organise_node_list(list_node) {

    var list_nodes=[]
    var list_item=[]
    var list_node_new = this.add_node('ul');

    let lnodelist = list_node.childNodes;

    let counter=0
    for (let i = 0; i < lnodelist.length; i++) {
        let node = lnodelist[i];

        list_item.push(node);
        counter++;
        if (counter> this.max_list_nodes) {    /// rule max bullet points per page 3
            counter=0;
            list_node_new.childNodes = list_item
            list_nodes.push(list_node_new)
          //  console.log(i,list_node_new,list_item)
            list_item=[]
            list_node_new = this.add_node('ul');
        }
      }

      list_node_new.childNodes = list_item
      list_nodes.push(list_node_new)
    //  console.log('last:',list_node_new,list_item)
      return list_nodes
  }



  process_nodes(html_nodes) {

   var nroot = html_parser.parse();
   var nodes = html_nodes.childNodes;
   var section_node = this.add_section_node(nroot);

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];


      if (this.isvalid_node(node)) {

      //  console.log(node.tagName,node)

        if (this.isheader_node(node)) {
          node=this.swap_node_tag(node,this.headerTag)
          nroot.appendChild(section_node);
          section_node = this.add_section_node(nroot);
        } else {
          node = this.process_node(node)
        }
        if (node!=undefined)
          section_node.appendChild(node);
      }

    }

    nroot.appendChild(section_node);

  //  console.log('nroot',nroot);

    return nroot;
  }

  swap_node_tag(node,node1) {
    node.tagName=node1
    return node
  }

  isvalid_node(node) {
  /////// HTMLNode only - top level
      if (node.nodeType==1) {
        return true;
      }
      return false;
  }

  isvalid_node_tag(node) {

      if (node.tagName=='h1' || node.tagName=='h2' || node.tagName=='h3' || node.tagName=='h4')
          return true;

      return false;
  }

  add_section_node(root) {

    let section = html_parser.parse();
    section.tagName='section'
  //  console.log('section',section)
    return section;
  }

  add_node(type) {
    let n = html_parser.parse();
    n.tagName=type
    return n;
  }

  process_node(node) {

    if (node.tagName=='ul') {
      node=this.process_node_list(node)
      return node;
    } else if (node.tagName=='li') {
      node=this.process_node_item(node)
      return node;
    } else if (node.tagName=='p') {
    //  console.log('paragraph node:',node.tagName,node)
       return node;
    } else {
      //  console.log('ignored node:',node.tagName,node)
      //  return node
      }
  }

  process_node_list(node_list) {
    var nodes = node_list.childNodes;
     var list_node = this.add_node('ul');

     for (let i = 0; i < nodes.length; i++) {
       let node = nodes[i];
        node = this.process_node(node)
        if (node!=undefined)
          list_node.appendChild(node);
     }

     return list_node
  }

  process_node_item(node_item) {
  //  console.log(node_item)

    var nodes = node_item.childNodes;
    var item_node = this.add_node('li');

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
       node = this.process_node_item_text(node)
       if (node!=undefined) {
         item_node.appendChild(node);
      //   return item_node;
       }
    }

    return item_node
  }

  process_node_item_text(node) {

    if (node.nodeType==1) {
      node = this.process_node_item_text_extract(node);
      node=this.process_node_item_text_format(node)
      return node;
    } else if (node.nodeType==3) {
        node=this.process_node_item_text_format(node)
        return node;
    } else {
        console.log('ignored node item:',node.nodeType,node)
    }

  }

  process_node_item_text_format(node) {
  //  console.log(node)
    return node;
  }

  process_node_item_text_extract(node_item) {

    var nodes = node_item.childNodes;
    var text_node=""
    var sub_item_node=[]

    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      if (node.tagName=='li') {
         node=this.process_node_item(node)
         sub_item_node.push(node);
      } else   if (node.nodeType==3) {
          text_node=node
       } else {
            console.log('ignored node item text:',node)
       }
    }

    if (sub_item_node.length>0) {
        node_item.childNodes=sub_item_node
        return node_item
    } else if (text_node!="") {
      return text_node
    }

    return node_item;
  }

  isheader_node(node) {
    if (node.tagName=='h1' || node.tagName=='h2' || node.tagName=='h3' || node.tagName=='h4')
      return true;
    return false;
  }


//////////////////////////////////unit tests
  test() {
    console.log('LIFTS-md2html (tests)  ' + 'v:' + APP.properties.version + '  dir:'+this.dir_media)
    this.test_md2html();
  }

  test_md2html() {
    var test = this.mdfile2html('ict221','ICT221_Week01_Java_Intro')
    console.log('LIFTS-md2html (test-md2html)  ' + test)
  }

  ////////////////////////////////////md2html

  mdfile2html(directory,filename) {
    var fn = this.media_file_name_get(directory,filename);
    this.media_file_read(fn);
  }

  md2html(mdtext) {
    return this.converter2HTML.makeHtml(mdtext);
  }

//////////////////////////////////////////////media file
  media_file_read(filename) {
    this.fileio.read(filename);
  }

  media_file_set_text(text) {

  }

  media_file_name_get(directory,filename) {
    let fn = this.dir_media + '/' + directory + '/' + filename + ".md";
    return fn;
  }


}
