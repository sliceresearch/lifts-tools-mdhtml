(function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var codemirror = createCommonjsModule(function (module, exports) {
	// CodeMirror, copyright (c) by Marijn Haverbeke and others
	// Distributed under an MIT license: https://codemirror.net/LICENSE

	// This is CodeMirror (https://codemirror.net), a code editor
	// implemented in JavaScript on top of the browser's DOM.
	//
	// You can find some technical background for some of the code below
	// at http://marijnhaverbeke.nl/blog/#cm-internals .

	(function (global, factory) {
	   module.exports = factory() ;
	}(commonjsGlobal, (function () {
	  // Kludges for bugs and behavior differences that can't be feature
	  // detected are enabled based on userAgent etc sniffing.
	  var userAgent = navigator.userAgent;
	  var platform = navigator.platform;

	  var gecko = /gecko\/\d/i.test(userAgent);
	  var ie_upto10 = /MSIE \d/.test(userAgent);
	  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
	  var edge = /Edge\/(\d+)/.exec(userAgent);
	  var ie = ie_upto10 || ie_11up || edge;
	  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
	  var webkit = !edge && /WebKit\//.test(userAgent);
	  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
	  var chrome = !edge && /Chrome\//.test(userAgent);
	  var presto = /Opera\//.test(userAgent);
	  var safari = /Apple Computer/.test(navigator.vendor);
	  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
	  var phantom = /PhantomJS/.test(userAgent);

	  var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
	  var android = /Android/.test(userAgent);
	  // This is woefully incomplete. Suggestions for alternative methods welcome.
	  var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
	  var mac = ios || /Mac/.test(platform);
	  var chromeOS = /\bCrOS\b/.test(userAgent);
	  var windows = /win/i.test(platform);

	  var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
	  if (presto_version) { presto_version = Number(presto_version[1]); }
	  if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
	  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
	  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
	  var captureRightClick = gecko || (ie && ie_version >= 9);

	  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

	  var rmClass = function(node, cls) {
	    var current = node.className;
	    var match = classTest(cls).exec(current);
	    if (match) {
	      var after = current.slice(match.index + match[0].length);
	      node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
	    }
	  };

	  function removeChildren(e) {
	    for (var count = e.childNodes.length; count > 0; --count)
	      { e.removeChild(e.firstChild); }
	    return e
	  }

	  function removeChildrenAndAdd(parent, e) {
	    return removeChildren(parent).appendChild(e)
	  }

	  function elt(tag, content, className, style) {
	    var e = document.createElement(tag);
	    if (className) { e.className = className; }
	    if (style) { e.style.cssText = style; }
	    if (typeof content == "string") { e.appendChild(document.createTextNode(content)); }
	    else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]); } }
	    return e
	  }
	  // wrapper for elt, which removes the elt from the accessibility tree
	  function eltP(tag, content, className, style) {
	    var e = elt(tag, content, className, style);
	    e.setAttribute("role", "presentation");
	    return e
	  }

	  var range;
	  if (document.createRange) { range = function(node, start, end, endNode) {
	    var r = document.createRange();
	    r.setEnd(endNode || node, end);
	    r.setStart(node, start);
	    return r
	  }; }
	  else { range = function(node, start, end) {
	    var r = document.body.createTextRange();
	    try { r.moveToElementText(node.parentNode); }
	    catch(e) { return r }
	    r.collapse(true);
	    r.moveEnd("character", end);
	    r.moveStart("character", start);
	    return r
	  }; }

	  function contains(parent, child) {
	    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
	      { child = child.parentNode; }
	    if (parent.contains)
	      { return parent.contains(child) }
	    do {
	      if (child.nodeType == 11) { child = child.host; }
	      if (child == parent) { return true }
	    } while (child = child.parentNode)
	  }

	  function activeElt() {
	    // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
	    // IE < 10 will throw when accessed while the page is loading or in an iframe.
	    // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
	    var activeElement;
	    try {
	      activeElement = document.activeElement;
	    } catch(e) {
	      activeElement = document.body || null;
	    }
	    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
	      { activeElement = activeElement.shadowRoot.activeElement; }
	    return activeElement
	  }

	  function addClass(node, cls) {
	    var current = node.className;
	    if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls; }
	  }
	  function joinClasses(a, b) {
	    var as = a.split(" ");
	    for (var i = 0; i < as.length; i++)
	      { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i]; } }
	    return b
	  }

	  var selectInput = function(node) { node.select(); };
	  if (ios) // Mobile Safari apparently has a bug where select() is broken.
	    { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; }; }
	  else if (ie) // Suppress mysterious IE10 errors
	    { selectInput = function(node) { try { node.select(); } catch(_e) {} }; }

	  function bind(f) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    return function(){return f.apply(null, args)}
	  }

	  function copyObj(obj, target, overwrite) {
	    if (!target) { target = {}; }
	    for (var prop in obj)
	      { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
	        { target[prop] = obj[prop]; } }
	    return target
	  }

	  // Counts the column offset in a string, taking tabs into account.
	  // Used mostly to find indentation.
	  function countColumn(string, end, tabSize, startIndex, startValue) {
	    if (end == null) {
	      end = string.search(/[^\s\u00a0]/);
	      if (end == -1) { end = string.length; }
	    }
	    for (var i = startIndex || 0, n = startValue || 0;;) {
	      var nextTab = string.indexOf("\t", i);
	      if (nextTab < 0 || nextTab >= end)
	        { return n + (end - i) }
	      n += nextTab - i;
	      n += tabSize - (n % tabSize);
	      i = nextTab + 1;
	    }
	  }

	  var Delayed = function() {this.id = null;};
	  Delayed.prototype.set = function (ms, f) {
	    clearTimeout(this.id);
	    this.id = setTimeout(f, ms);
	  };

	  function indexOf(array, elt) {
	    for (var i = 0; i < array.length; ++i)
	      { if (array[i] == elt) { return i } }
	    return -1
	  }

	  // Number of pixels added to scroller and sizer to hide scrollbar
	  var scrollerGap = 30;

	  // Returned or thrown by various protocols to signal 'I'm not
	  // handling this'.
	  var Pass = {toString: function(){return "CodeMirror.Pass"}};

	  // Reused option objects for setSelection & friends
	  var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

	  // The inverse of countColumn -- find the offset that corresponds to
	  // a particular column.
	  function findColumn(string, goal, tabSize) {
	    for (var pos = 0, col = 0;;) {
	      var nextTab = string.indexOf("\t", pos);
	      if (nextTab == -1) { nextTab = string.length; }
	      var skipped = nextTab - pos;
	      if (nextTab == string.length || col + skipped >= goal)
	        { return pos + Math.min(skipped, goal - col) }
	      col += nextTab - pos;
	      col += tabSize - (col % tabSize);
	      pos = nextTab + 1;
	      if (col >= goal) { return pos }
	    }
	  }

	  var spaceStrs = [""];
	  function spaceStr(n) {
	    while (spaceStrs.length <= n)
	      { spaceStrs.push(lst(spaceStrs) + " "); }
	    return spaceStrs[n]
	  }

	  function lst(arr) { return arr[arr.length-1] }

	  function map(array, f) {
	    var out = [];
	    for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i); }
	    return out
	  }

	  function insertSorted(array, value, score) {
	    var pos = 0, priority = score(value);
	    while (pos < array.length && score(array[pos]) <= priority) { pos++; }
	    array.splice(pos, 0, value);
	  }

	  function nothing() {}

	  function createObj(base, props) {
	    var inst;
	    if (Object.create) {
	      inst = Object.create(base);
	    } else {
	      nothing.prototype = base;
	      inst = new nothing();
	    }
	    if (props) { copyObj(props, inst); }
	    return inst
	  }

	  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
	  function isWordCharBasic(ch) {
	    return /\w/.test(ch) || ch > "\x80" &&
	      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
	  }
	  function isWordChar(ch, helper) {
	    if (!helper) { return isWordCharBasic(ch) }
	    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
	    return helper.test(ch)
	  }

	  function isEmpty(obj) {
	    for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
	    return true
	  }

	  // Extending unicode characters. A series of a non-extending char +
	  // any number of extending chars is treated as a single unit as far
	  // as editing and measuring is concerned. This is not fully correct,
	  // since some scripts/fonts/browsers also treat other configurations
	  // of code points as a group.
	  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
	  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

	  // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
	  function skipExtendingChars(str, pos, dir) {
	    while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir; }
	    return pos
	  }

	  // Returns the value from the range [`from`; `to`] that satisfies
	  // `pred` and is closest to `from`. Assumes that at least `to`
	  // satisfies `pred`. Supports `from` being greater than `to`.
	  function findFirst(pred, from, to) {
	    // At any point we are certain `to` satisfies `pred`, don't know
	    // whether `from` does.
	    var dir = from > to ? -1 : 1;
	    for (;;) {
	      if (from == to) { return from }
	      var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
	      if (mid == from) { return pred(mid) ? from : to }
	      if (pred(mid)) { to = mid; }
	      else { from = mid + dir; }
	    }
	  }

	  // BIDI HELPERS

	  function iterateBidiSections(order, from, to, f) {
	    if (!order) { return f(from, to, "ltr", 0) }
	    var found = false;
	    for (var i = 0; i < order.length; ++i) {
	      var part = order[i];
	      if (part.from < to && part.to > from || from == to && part.to == from) {
	        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
	        found = true;
	      }
	    }
	    if (!found) { f(from, to, "ltr"); }
	  }

	  var bidiOther = null;
	  function getBidiPartAt(order, ch, sticky) {
	    var found;
	    bidiOther = null;
	    for (var i = 0; i < order.length; ++i) {
	      var cur = order[i];
	      if (cur.from < ch && cur.to > ch) { return i }
	      if (cur.to == ch) {
	        if (cur.from != cur.to && sticky == "before") { found = i; }
	        else { bidiOther = i; }
	      }
	      if (cur.from == ch) {
	        if (cur.from != cur.to && sticky != "before") { found = i; }
	        else { bidiOther = i; }
	      }
	    }
	    return found != null ? found : bidiOther
	  }

	  // Bidirectional ordering algorithm
	  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
	  // that this (partially) implements.

	  // One-char codes used for character types:
	  // L (L):   Left-to-Right
	  // R (R):   Right-to-Left
	  // r (AL):  Right-to-Left Arabic
	  // 1 (EN):  European Number
	  // + (ES):  European Number Separator
	  // % (ET):  European Number Terminator
	  // n (AN):  Arabic Number
	  // , (CS):  Common Number Separator
	  // m (NSM): Non-Spacing Mark
	  // b (BN):  Boundary Neutral
	  // s (B):   Paragraph Separator
	  // t (S):   Segment Separator
	  // w (WS):  Whitespace
	  // N (ON):  Other Neutrals

	  // Returns null if characters are ordered as they appear
	  // (left-to-right), or an array of sections ({from, to, level}
	  // objects) in the order in which they occur visually.
	  var bidiOrdering = (function() {
	    // Character types for codepoints 0 to 0xff
	    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
	    // Character types for codepoints 0x600 to 0x6f9
	    var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
	    function charType(code) {
	      if (code <= 0xf7) { return lowTypes.charAt(code) }
	      else if (0x590 <= code && code <= 0x5f4) { return "R" }
	      else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
	      else if (0x6ee <= code && code <= 0x8ac) { return "r" }
	      else if (0x2000 <= code && code <= 0x200b) { return "w" }
	      else if (code == 0x200c) { return "b" }
	      else { return "L" }
	    }

	    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
	    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;

	    function BidiSpan(level, from, to) {
	      this.level = level;
	      this.from = from; this.to = to;
	    }

	    return function(str, direction) {
	      var outerType = direction == "ltr" ? "L" : "R";

	      if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
	      var len = str.length, types = [];
	      for (var i = 0; i < len; ++i)
	        { types.push(charType(str.charCodeAt(i))); }

	      // W1. Examine each non-spacing mark (NSM) in the level run, and
	      // change the type of the NSM to the type of the previous
	      // character. If the NSM is at the start of the level run, it will
	      // get the type of sor.
	      for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
	        var type = types[i$1];
	        if (type == "m") { types[i$1] = prev; }
	        else { prev = type; }
	      }

	      // W2. Search backwards from each instance of a European number
	      // until the first strong type (R, L, AL, or sor) is found. If an
	      // AL is found, change the type of the European number to Arabic
	      // number.
	      // W3. Change all ALs to R.
	      for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
	        var type$1 = types[i$2];
	        if (type$1 == "1" && cur == "r") { types[i$2] = "n"; }
	        else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R"; } }
	      }

	      // W4. A single European separator between two European numbers
	      // changes to a European number. A single common separator between
	      // two numbers of the same type changes to that type.
	      for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
	        var type$2 = types[i$3];
	        if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1"; }
	        else if (type$2 == "," && prev$1 == types[i$3+1] &&
	                 (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1; }
	        prev$1 = type$2;
	      }

	      // W5. A sequence of European terminators adjacent to European
	      // numbers changes to all European numbers.
	      // W6. Otherwise, separators and terminators change to Other
	      // Neutral.
	      for (var i$4 = 0; i$4 < len; ++i$4) {
	        var type$3 = types[i$4];
	        if (type$3 == ",") { types[i$4] = "N"; }
	        else if (type$3 == "%") {
	          var end = (void 0);
	          for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
	          var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
	          for (var j = i$4; j < end; ++j) { types[j] = replace; }
	          i$4 = end - 1;
	        }
	      }

	      // W7. Search backwards from each instance of a European number
	      // until the first strong type (R, L, or sor) is found. If an L is
	      // found, then change the type of the European number to L.
	      for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
	        var type$4 = types[i$5];
	        if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L"; }
	        else if (isStrong.test(type$4)) { cur$1 = type$4; }
	      }

	      // N1. A sequence of neutrals takes the direction of the
	      // surrounding strong text if the text on both sides has the same
	      // direction. European and Arabic numbers act as if they were R in
	      // terms of their influence on neutrals. Start-of-level-run (sor)
	      // and end-of-level-run (eor) are used at level run boundaries.
	      // N2. Any remaining neutrals take the embedding direction.
	      for (var i$6 = 0; i$6 < len; ++i$6) {
	        if (isNeutral.test(types[i$6])) {
	          var end$1 = (void 0);
	          for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
	          var before = (i$6 ? types[i$6-1] : outerType) == "L";
	          var after = (end$1 < len ? types[end$1] : outerType) == "L";
	          var replace$1 = before == after ? (before ? "L" : "R") : outerType;
	          for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1; }
	          i$6 = end$1 - 1;
	        }
	      }

	      // Here we depart from the documented algorithm, in order to avoid
	      // building up an actual levels array. Since there are only three
	      // levels (0, 1, 2) in an implementation that doesn't take
	      // explicit embedding into account, we can build up the order on
	      // the fly, without following the level-based algorithm.
	      var order = [], m;
	      for (var i$7 = 0; i$7 < len;) {
	        if (countsAsLeft.test(types[i$7])) {
	          var start = i$7;
	          for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
	          order.push(new BidiSpan(0, start, i$7));
	        } else {
	          var pos = i$7, at = order.length;
	          for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
	          for (var j$2 = pos; j$2 < i$7;) {
	            if (countsAsNum.test(types[j$2])) {
	              if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)); }
	              var nstart = j$2;
	              for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
	              order.splice(at, 0, new BidiSpan(2, nstart, j$2));
	              pos = j$2;
	            } else { ++j$2; }
	          }
	          if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)); }
	        }
	      }
	      if (direction == "ltr") {
	        if (order[0].level == 1 && (m = str.match(/^\s+/))) {
	          order[0].from = m[0].length;
	          order.unshift(new BidiSpan(0, 0, m[0].length));
	        }
	        if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
	          lst(order).to -= m[0].length;
	          order.push(new BidiSpan(0, len - m[0].length, len));
	        }
	      }

	      return direction == "rtl" ? order.reverse() : order
	    }
	  })();

	  // Get the bidi ordering for the given line (and cache it). Returns
	  // false for lines that are fully left-to-right, and an array of
	  // BidiSpan objects otherwise.
	  function getOrder(line, direction) {
	    var order = line.order;
	    if (order == null) { order = line.order = bidiOrdering(line.text, direction); }
	    return order
	  }

	  // EVENT HANDLING

	  // Lightweight event framework. on/off also work on DOM nodes,
	  // registering native DOM handlers.

	  var noHandlers = [];

	  var on = function(emitter, type, f) {
	    if (emitter.addEventListener) {
	      emitter.addEventListener(type, f, false);
	    } else if (emitter.attachEvent) {
	      emitter.attachEvent("on" + type, f);
	    } else {
	      var map$$1 = emitter._handlers || (emitter._handlers = {});
	      map$$1[type] = (map$$1[type] || noHandlers).concat(f);
	    }
	  };

	  function getHandlers(emitter, type) {
	    return emitter._handlers && emitter._handlers[type] || noHandlers
	  }

	  function off(emitter, type, f) {
	    if (emitter.removeEventListener) {
	      emitter.removeEventListener(type, f, false);
	    } else if (emitter.detachEvent) {
	      emitter.detachEvent("on" + type, f);
	    } else {
	      var map$$1 = emitter._handlers, arr = map$$1 && map$$1[type];
	      if (arr) {
	        var index = indexOf(arr, f);
	        if (index > -1)
	          { map$$1[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
	      }
	    }
	  }

	  function signal(emitter, type /*, values...*/) {
	    var handlers = getHandlers(emitter, type);
	    if (!handlers.length) { return }
	    var args = Array.prototype.slice.call(arguments, 2);
	    for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
	  }

	  // The DOM events that CodeMirror handles can be overridden by
	  // registering a (non-DOM) handler on the editor for the event name,
	  // and preventDefault-ing the event in that handler.
	  function signalDOMEvent(cm, e, override) {
	    if (typeof e == "string")
	      { e = {type: e, preventDefault: function() { this.defaultPrevented = true; }}; }
	    signal(cm, override || e.type, cm, e);
	    return e_defaultPrevented(e) || e.codemirrorIgnore
	  }

	  function signalCursorActivity(cm) {
	    var arr = cm._handlers && cm._handlers.cursorActivity;
	    if (!arr) { return }
	    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
	    for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
	      { set.push(arr[i]); } }
	  }

	  function hasHandler(emitter, type) {
	    return getHandlers(emitter, type).length > 0
	  }

	  // Add on and off methods to a constructor's prototype, to make
	  // registering events on such objects more convenient.
	  function eventMixin(ctor) {
	    ctor.prototype.on = function(type, f) {on(this, type, f);};
	    ctor.prototype.off = function(type, f) {off(this, type, f);};
	  }

	  // Due to the fact that we still support jurassic IE versions, some
	  // compatibility wrappers are needed.

	  function e_preventDefault(e) {
	    if (e.preventDefault) { e.preventDefault(); }
	    else { e.returnValue = false; }
	  }
	  function e_stopPropagation(e) {
	    if (e.stopPropagation) { e.stopPropagation(); }
	    else { e.cancelBubble = true; }
	  }
	  function e_defaultPrevented(e) {
	    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
	  }
	  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}

	  function e_target(e) {return e.target || e.srcElement}
	  function e_button(e) {
	    var b = e.which;
	    if (b == null) {
	      if (e.button & 1) { b = 1; }
	      else if (e.button & 2) { b = 3; }
	      else if (e.button & 4) { b = 2; }
	    }
	    if (mac && e.ctrlKey && b == 1) { b = 3; }
	    return b
	  }

	  // Detect drag-and-drop
	  var dragAndDrop = function() {
	    // There is *some* kind of drag-and-drop support in IE6-8, but I
	    // couldn't get it to work yet.
	    if (ie && ie_version < 9) { return false }
	    var div = elt('div');
	    return "draggable" in div || "dragDrop" in div
	  }();

	  var zwspSupported;
	  function zeroWidthElement(measure) {
	    if (zwspSupported == null) {
	      var test = elt("span", "\u200b");
	      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
	      if (measure.firstChild.offsetHeight != 0)
	        { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8); }
	    }
	    var node = zwspSupported ? elt("span", "\u200b") :
	      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
	    node.setAttribute("cm-text", "");
	    return node
	  }

	  // Feature-detect IE's crummy client rect reporting for bidi text
	  var badBidiRects;
	  function hasBadBidiRects(measure) {
	    if (badBidiRects != null) { return badBidiRects }
	    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
	    var r0 = range(txt, 0, 1).getBoundingClientRect();
	    var r1 = range(txt, 1, 2).getBoundingClientRect();
	    removeChildren(measure);
	    if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
	    return badBidiRects = (r1.right - r0.right < 3)
	  }

	  // See if "".split is the broken IE version, if so, provide an
	  // alternative way to split lines.
	  var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
	    var pos = 0, result = [], l = string.length;
	    while (pos <= l) {
	      var nl = string.indexOf("\n", pos);
	      if (nl == -1) { nl = string.length; }
	      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
	      var rt = line.indexOf("\r");
	      if (rt != -1) {
	        result.push(line.slice(0, rt));
	        pos += rt + 1;
	      } else {
	        result.push(line);
	        pos = nl + 1;
	      }
	    }
	    return result
	  } : function (string) { return string.split(/\r\n?|\n/); };

	  var hasSelection = window.getSelection ? function (te) {
	    try { return te.selectionStart != te.selectionEnd }
	    catch(e) { return false }
	  } : function (te) {
	    var range$$1;
	    try {range$$1 = te.ownerDocument.selection.createRange();}
	    catch(e) {}
	    if (!range$$1 || range$$1.parentElement() != te) { return false }
	    return range$$1.compareEndPoints("StartToEnd", range$$1) != 0
	  };

	  var hasCopyEvent = (function () {
	    var e = elt("div");
	    if ("oncopy" in e) { return true }
	    e.setAttribute("oncopy", "return;");
	    return typeof e.oncopy == "function"
	  })();

	  var badZoomedRects = null;
	  function hasBadZoomedRects(measure) {
	    if (badZoomedRects != null) { return badZoomedRects }
	    var node = removeChildrenAndAdd(measure, elt("span", "x"));
	    var normal = node.getBoundingClientRect();
	    var fromRange = range(node, 0, 1).getBoundingClientRect();
	    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
	  }

	  // Known modes, by name and by MIME
	  var modes = {}, mimeModes = {};

	  // Extra arguments are stored as the mode's dependencies, which is
	  // used by (legacy) mechanisms like loadmode.js to automatically
	  // load a mode. (Preferred mechanism is the require/define calls.)
	  function defineMode(name, mode) {
	    if (arguments.length > 2)
	      { mode.dependencies = Array.prototype.slice.call(arguments, 2); }
	    modes[name] = mode;
	  }

	  function defineMIME(mime, spec) {
	    mimeModes[mime] = spec;
	  }

	  // Given a MIME type, a {name, ...options} config object, or a name
	  // string, return a mode config object.
	  function resolveMode(spec) {
	    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
	      spec = mimeModes[spec];
	    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
	      var found = mimeModes[spec.name];
	      if (typeof found == "string") { found = {name: found}; }
	      spec = createObj(found, spec);
	      spec.name = found.name;
	    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
	      return resolveMode("application/xml")
	    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
	      return resolveMode("application/json")
	    }
	    if (typeof spec == "string") { return {name: spec} }
	    else { return spec || {name: "null"} }
	  }

	  // Given a mode spec (anything that resolveMode accepts), find and
	  // initialize an actual mode object.
	  function getMode(options, spec) {
	    spec = resolveMode(spec);
	    var mfactory = modes[spec.name];
	    if (!mfactory) { return getMode(options, "text/plain") }
	    var modeObj = mfactory(options, spec);
	    if (modeExtensions.hasOwnProperty(spec.name)) {
	      var exts = modeExtensions[spec.name];
	      for (var prop in exts) {
	        if (!exts.hasOwnProperty(prop)) { continue }
	        if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop]; }
	        modeObj[prop] = exts[prop];
	      }
	    }
	    modeObj.name = spec.name;
	    if (spec.helperType) { modeObj.helperType = spec.helperType; }
	    if (spec.modeProps) { for (var prop$1 in spec.modeProps)
	      { modeObj[prop$1] = spec.modeProps[prop$1]; } }

	    return modeObj
	  }

	  // This can be used to attach properties to mode objects from
	  // outside the actual mode definition.
	  var modeExtensions = {};
	  function extendMode(mode, properties) {
	    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
	    copyObj(properties, exts);
	  }

	  function copyState(mode, state) {
	    if (state === true) { return state }
	    if (mode.copyState) { return mode.copyState(state) }
	    var nstate = {};
	    for (var n in state) {
	      var val = state[n];
	      if (val instanceof Array) { val = val.concat([]); }
	      nstate[n] = val;
	    }
	    return nstate
	  }

	  // Given a mode and a state (for that mode), find the inner mode and
	  // state at the position that the state refers to.
	  function innerMode(mode, state) {
	    var info;
	    while (mode.innerMode) {
	      info = mode.innerMode(state);
	      if (!info || info.mode == mode) { break }
	      state = info.state;
	      mode = info.mode;
	    }
	    return info || {mode: mode, state: state}
	  }

	  function startState(mode, a1, a2) {
	    return mode.startState ? mode.startState(a1, a2) : true
	  }

	  // STRING STREAM

	  // Fed to the mode parsers, provides helper functions to make
	  // parsers more succinct.

	  var StringStream = function(string, tabSize, lineOracle) {
	    this.pos = this.start = 0;
	    this.string = string;
	    this.tabSize = tabSize || 8;
	    this.lastColumnPos = this.lastColumnValue = 0;
	    this.lineStart = 0;
	    this.lineOracle = lineOracle;
	  };

	  StringStream.prototype.eol = function () {return this.pos >= this.string.length};
	  StringStream.prototype.sol = function () {return this.pos == this.lineStart};
	  StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
	  StringStream.prototype.next = function () {
	    if (this.pos < this.string.length)
	      { return this.string.charAt(this.pos++) }
	  };
	  StringStream.prototype.eat = function (match) {
	    var ch = this.string.charAt(this.pos);
	    var ok;
	    if (typeof match == "string") { ok = ch == match; }
	    else { ok = ch && (match.test ? match.test(ch) : match(ch)); }
	    if (ok) {++this.pos; return ch}
	  };
	  StringStream.prototype.eatWhile = function (match) {
	    var start = this.pos;
	    while (this.eat(match)){}
	    return this.pos > start
	  };
	  StringStream.prototype.eatSpace = function () {
	      var this$1 = this;

	    var start = this.pos;
	    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos; }
	    return this.pos > start
	  };
	  StringStream.prototype.skipToEnd = function () {this.pos = this.string.length;};
	  StringStream.prototype.skipTo = function (ch) {
	    var found = this.string.indexOf(ch, this.pos);
	    if (found > -1) {this.pos = found; return true}
	  };
	  StringStream.prototype.backUp = function (n) {this.pos -= n;};
	  StringStream.prototype.column = function () {
	    if (this.lastColumnPos < this.start) {
	      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
	      this.lastColumnPos = this.start;
	    }
	    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
	  };
	  StringStream.prototype.indentation = function () {
	    return countColumn(this.string, null, this.tabSize) -
	      (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
	  };
	  StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
	    if (typeof pattern == "string") {
	      var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
	      var substr = this.string.substr(this.pos, pattern.length);
	      if (cased(substr) == cased(pattern)) {
	        if (consume !== false) { this.pos += pattern.length; }
	        return true
	      }
	    } else {
	      var match = this.string.slice(this.pos).match(pattern);
	      if (match && match.index > 0) { return null }
	      if (match && consume !== false) { this.pos += match[0].length; }
	      return match
	    }
	  };
	  StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
	  StringStream.prototype.hideFirstChars = function (n, inner) {
	    this.lineStart += n;
	    try { return inner() }
	    finally { this.lineStart -= n; }
	  };
	  StringStream.prototype.lookAhead = function (n) {
	    var oracle = this.lineOracle;
	    return oracle && oracle.lookAhead(n)
	  };
	  StringStream.prototype.baseToken = function () {
	    var oracle = this.lineOracle;
	    return oracle && oracle.baseToken(this.pos)
	  };

	  // Find the line object corresponding to the given line number.
	  function getLine(doc, n) {
	    n -= doc.first;
	    if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
	    var chunk = doc;
	    while (!chunk.lines) {
	      for (var i = 0;; ++i) {
	        var child = chunk.children[i], sz = child.chunkSize();
	        if (n < sz) { chunk = child; break }
	        n -= sz;
	      }
	    }
	    return chunk.lines[n]
	  }

	  // Get the part of a document between two positions, as an array of
	  // strings.
	  function getBetween(doc, start, end) {
	    var out = [], n = start.line;
	    doc.iter(start.line, end.line + 1, function (line) {
	      var text = line.text;
	      if (n == end.line) { text = text.slice(0, end.ch); }
	      if (n == start.line) { text = text.slice(start.ch); }
	      out.push(text);
	      ++n;
	    });
	    return out
	  }
	  // Get the lines between from and to, as array of strings.
	  function getLines(doc, from, to) {
	    var out = [];
	    doc.iter(from, to, function (line) { out.push(line.text); }); // iter aborts when callback returns truthy value
	    return out
	  }

	  // Update the height of a line, propagating the height change
	  // upwards to parent nodes.
	  function updateLineHeight(line, height) {
	    var diff = height - line.height;
	    if (diff) { for (var n = line; n; n = n.parent) { n.height += diff; } }
	  }

	  // Given a line object, find its line number by walking up through
	  // its parent links.
	  function lineNo(line) {
	    if (line.parent == null) { return null }
	    var cur = line.parent, no = indexOf(cur.lines, line);
	    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
	      for (var i = 0;; ++i) {
	        if (chunk.children[i] == cur) { break }
	        no += chunk.children[i].chunkSize();
	      }
	    }
	    return no + cur.first
	  }

	  // Find the line at the given vertical position, using the height
	  // information in the document tree.
	  function lineAtHeight(chunk, h) {
	    var n = chunk.first;
	    outer: do {
	      for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
	        var child = chunk.children[i$1], ch = child.height;
	        if (h < ch) { chunk = child; continue outer }
	        h -= ch;
	        n += child.chunkSize();
	      }
	      return n
	    } while (!chunk.lines)
	    var i = 0;
	    for (; i < chunk.lines.length; ++i) {
	      var line = chunk.lines[i], lh = line.height;
	      if (h < lh) { break }
	      h -= lh;
	    }
	    return n + i
	  }

	  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

	  function lineNumberFor(options, i) {
	    return String(options.lineNumberFormatter(i + options.firstLineNumber))
	  }

	  // A Pos instance represents a position within the text.
	  function Pos(line, ch, sticky) {
	    if ( sticky === void 0 ) sticky = null;

	    if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
	    this.line = line;
	    this.ch = ch;
	    this.sticky = sticky;
	  }

	  // Compare two positions, return 0 if they are the same, a negative
	  // number when a is less, and a positive number otherwise.
	  function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

	  function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

	  function copyPos(x) {return Pos(x.line, x.ch)}
	  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
	  function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

	  // Most of the external API clips given positions to make sure they
	  // actually exist within the document.
	  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
	  function clipPos(doc, pos) {
	    if (pos.line < doc.first) { return Pos(doc.first, 0) }
	    var last = doc.first + doc.size - 1;
	    if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
	    return clipToLen(pos, getLine(doc, pos.line).text.length)
	  }
	  function clipToLen(pos, linelen) {
	    var ch = pos.ch;
	    if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
	    else if (ch < 0) { return Pos(pos.line, 0) }
	    else { return pos }
	  }
	  function clipPosArray(doc, array) {
	    var out = [];
	    for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]); }
	    return out
	  }

	  var SavedContext = function(state, lookAhead) {
	    this.state = state;
	    this.lookAhead = lookAhead;
	  };

	  var Context = function(doc, state, line, lookAhead) {
	    this.state = state;
	    this.doc = doc;
	    this.line = line;
	    this.maxLookAhead = lookAhead || 0;
	    this.baseTokens = null;
	    this.baseTokenPos = 1;
	  };

	  Context.prototype.lookAhead = function (n) {
	    var line = this.doc.getLine(this.line + n);
	    if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n; }
	    return line
	  };

	  Context.prototype.baseToken = function (n) {
	      var this$1 = this;

	    if (!this.baseTokens) { return null }
	    while (this.baseTokens[this.baseTokenPos] <= n)
	      { this$1.baseTokenPos += 2; }
	    var type = this.baseTokens[this.baseTokenPos + 1];
	    return {type: type && type.replace(/( |^)overlay .*/, ""),
	            size: this.baseTokens[this.baseTokenPos] - n}
	  };

	  Context.prototype.nextLine = function () {
	    this.line++;
	    if (this.maxLookAhead > 0) { this.maxLookAhead--; }
	  };

	  Context.fromSaved = function (doc, saved, line) {
	    if (saved instanceof SavedContext)
	      { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
	    else
	      { return new Context(doc, copyState(doc.mode, saved), line) }
	  };

	  Context.prototype.save = function (copy) {
	    var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
	    return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
	  };


	  // Compute a style array (an array starting with a mode generation
	  // -- for invalidation -- followed by pairs of end positions and
	  // style strings), which is used to highlight the tokens on the
	  // line.
	  function highlightLine(cm, line, context, forceToEnd) {
	    // A styles array always starts with a number identifying the
	    // mode/overlays that it is based on (for easy invalidation).
	    var st = [cm.state.modeGen], lineClasses = {};
	    // Compute the base array of styles
	    runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
	            lineClasses, forceToEnd);
	    var state = context.state;

	    // Run overlays, adjust style array.
	    var loop = function ( o ) {
	      context.baseTokens = st;
	      var overlay = cm.state.overlays[o], i = 1, at = 0;
	      context.state = true;
	      runMode(cm, line.text, overlay.mode, context, function (end, style) {
	        var start = i;
	        // Ensure there's a token end at the current position, and that i points at it
	        while (at < end) {
	          var i_end = st[i];
	          if (i_end > end)
	            { st.splice(i, 1, end, st[i+1], i_end); }
	          i += 2;
	          at = Math.min(end, i_end);
	        }
	        if (!style) { return }
	        if (overlay.opaque) {
	          st.splice(start, i - start, end, "overlay " + style);
	          i = start + 2;
	        } else {
	          for (; start < i; start += 2) {
	            var cur = st[start+1];
	            st[start+1] = (cur ? cur + " " : "") + "overlay " + style;
	          }
	        }
	      }, lineClasses);
	      context.state = state;
	      context.baseTokens = null;
	      context.baseTokenPos = 1;
	    };

	    for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

	    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
	  }

	  function getLineStyles(cm, line, updateFrontier) {
	    if (!line.styles || line.styles[0] != cm.state.modeGen) {
	      var context = getContextBefore(cm, lineNo(line));
	      var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
	      var result = highlightLine(cm, line, context);
	      if (resetState) { context.state = resetState; }
	      line.stateAfter = context.save(!resetState);
	      line.styles = result.styles;
	      if (result.classes) { line.styleClasses = result.classes; }
	      else if (line.styleClasses) { line.styleClasses = null; }
	      if (updateFrontier === cm.doc.highlightFrontier)
	        { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier); }
	    }
	    return line.styles
	  }

	  function getContextBefore(cm, n, precise) {
	    var doc = cm.doc, display = cm.display;
	    if (!doc.mode.startState) { return new Context(doc, true, n) }
	    var start = findStartLine(cm, n, precise);
	    var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
	    var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

	    doc.iter(start, n, function (line) {
	      processLine(cm, line.text, context);
	      var pos = context.line;
	      line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
	      context.nextLine();
	    });
	    if (precise) { doc.modeFrontier = context.line; }
	    return context
	  }

	  // Lightweight form of highlight -- proceed over this line and
	  // update state, but don't save a style array. Used for lines that
	  // aren't currently visible.
	  function processLine(cm, text, context, startAt) {
	    var mode = cm.doc.mode;
	    var stream = new StringStream(text, cm.options.tabSize, context);
	    stream.start = stream.pos = startAt || 0;
	    if (text == "") { callBlankLine(mode, context.state); }
	    while (!stream.eol()) {
	      readToken(mode, stream, context.state);
	      stream.start = stream.pos;
	    }
	  }

	  function callBlankLine(mode, state) {
	    if (mode.blankLine) { return mode.blankLine(state) }
	    if (!mode.innerMode) { return }
	    var inner = innerMode(mode, state);
	    if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
	  }

	  function readToken(mode, stream, state, inner) {
	    for (var i = 0; i < 10; i++) {
	      if (inner) { inner[0] = innerMode(mode, state).mode; }
	      var style = mode.token(stream, state);
	      if (stream.pos > stream.start) { return style }
	    }
	    throw new Error("Mode " + mode.name + " failed to advance stream.")
	  }

	  var Token = function(stream, type, state) {
	    this.start = stream.start; this.end = stream.pos;
	    this.string = stream.current();
	    this.type = type || null;
	    this.state = state;
	  };

	  // Utility for getTokenAt and getLineTokens
	  function takeToken(cm, pos, precise, asArray) {
	    var doc = cm.doc, mode = doc.mode, style;
	    pos = clipPos(doc, pos);
	    var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise);
	    var stream = new StringStream(line.text, cm.options.tabSize, context), tokens;
	    if (asArray) { tokens = []; }
	    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
	      stream.start = stream.pos;
	      style = readToken(mode, stream, context.state);
	      if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))); }
	    }
	    return asArray ? tokens : new Token(stream, style, context.state)
	  }

	  function extractLineClasses(type, output) {
	    if (type) { for (;;) {
	      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
	      if (!lineClass) { break }
	      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
	      var prop = lineClass[1] ? "bgClass" : "textClass";
	      if (output[prop] == null)
	        { output[prop] = lineClass[2]; }
	      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
	        { output[prop] += " " + lineClass[2]; }
	    } }
	    return type
	  }

	  // Run the given mode's parser over a line, calling f for each token.
	  function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
	    var flattenSpans = mode.flattenSpans;
	    if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans; }
	    var curStart = 0, curStyle = null;
	    var stream = new StringStream(text, cm.options.tabSize, context), style;
	    var inner = cm.options.addModeClass && [null];
	    if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses); }
	    while (!stream.eol()) {
	      if (stream.pos > cm.options.maxHighlightLength) {
	        flattenSpans = false;
	        if (forceToEnd) { processLine(cm, text, context, stream.pos); }
	        stream.pos = text.length;
	        style = null;
	      } else {
	        style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
	      }
	      if (inner) {
	        var mName = inner[0].name;
	        if (mName) { style = "m-" + (style ? mName + " " + style : mName); }
	      }
	      if (!flattenSpans || curStyle != style) {
	        while (curStart < stream.start) {
	          curStart = Math.min(stream.start, curStart + 5000);
	          f(curStart, curStyle);
	        }
	        curStyle = style;
	      }
	      stream.start = stream.pos;
	    }
	    while (curStart < stream.pos) {
	      // Webkit seems to refuse to render text nodes longer than 57444
	      // characters, and returns inaccurate measurements in nodes
	      // starting around 5000 chars.
	      var pos = Math.min(stream.pos, curStart + 5000);
	      f(pos, curStyle);
	      curStart = pos;
	    }
	  }

	  // Finds the line to start with when starting a parse. Tries to
	  // find a line with a stateAfter, so that it can start with a
	  // valid state. If that fails, it returns the line with the
	  // smallest indentation, which tends to need the least context to
	  // parse correctly.
	  function findStartLine(cm, n, precise) {
	    var minindent, minline, doc = cm.doc;
	    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
	    for (var search = n; search > lim; --search) {
	      if (search <= doc.first) { return doc.first }
	      var line = getLine(doc, search - 1), after = line.stateAfter;
	      if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
	        { return search }
	      var indented = countColumn(line.text, null, cm.options.tabSize);
	      if (minline == null || minindent > indented) {
	        minline = search - 1;
	        minindent = indented;
	      }
	    }
	    return minline
	  }

	  function retreatFrontier(doc, n) {
	    doc.modeFrontier = Math.min(doc.modeFrontier, n);
	    if (doc.highlightFrontier < n - 10) { return }
	    var start = doc.first;
	    for (var line = n - 1; line > start; line--) {
	      var saved = getLine(doc, line).stateAfter;
	      // change is on 3
	      // state on line 1 looked ahead 2 -- so saw 3
	      // test 1 + 2 < 3 should cover this
	      if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
	        start = line + 1;
	        break
	      }
	    }
	    doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
	  }

	  // Optimize some code when these features are not used.
	  var sawReadOnlySpans = false, sawCollapsedSpans = false;

	  function seeReadOnlySpans() {
	    sawReadOnlySpans = true;
	  }

	  function seeCollapsedSpans() {
	    sawCollapsedSpans = true;
	  }

	  // TEXTMARKER SPANS

	  function MarkedSpan(marker, from, to) {
	    this.marker = marker;
	    this.from = from; this.to = to;
	  }

	  // Search an array of spans for a span matching the given marker.
	  function getMarkedSpanFor(spans, marker) {
	    if (spans) { for (var i = 0; i < spans.length; ++i) {
	      var span = spans[i];
	      if (span.marker == marker) { return span }
	    } }
	  }
	  // Remove a span from an array, returning undefined if no spans are
	  // left (we don't store arrays for lines without spans).
	  function removeMarkedSpan(spans, span) {
	    var r;
	    for (var i = 0; i < spans.length; ++i)
	      { if (spans[i] != span) { (r || (r = [])).push(spans[i]); } }
	    return r
	  }
	  // Add a span to a line.
	  function addMarkedSpan(line, span) {
	    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
	    span.marker.attachLine(line);
	  }

	  // Used for the algorithm that adjusts markers for a change in the
	  // document. These functions cut an array of spans at a given
	  // character position, returning an array of remaining chunks (or
	  // undefined if nothing remains).
	  function markedSpansBefore(old, startCh, isInsert) {
	    var nw;
	    if (old) { for (var i = 0; i < old.length; ++i) {
	      var span = old[i], marker = span.marker;
	      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
	      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
	        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
	        ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
	      }
	    } }
	    return nw
	  }
	  function markedSpansAfter(old, endCh, isInsert) {
	    var nw;
	    if (old) { for (var i = 0; i < old.length; ++i) {
	      var span = old[i], marker = span.marker;
	      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
	      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
	        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
	        ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
	                                              span.to == null ? null : span.to - endCh));
	      }
	    } }
	    return nw
	  }

	  // Given a change object, compute the new set of marker spans that
	  // cover the line in which the change took place. Removes spans
	  // entirely within the change, reconnects spans belonging to the
	  // same marker that appear on both sides of the change, and cuts off
	  // spans partially within the change. Returns an array of span
	  // arrays with one element for each line in (after) the change.
	  function stretchSpansOverChange(doc, change) {
	    if (change.full) { return null }
	    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
	    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
	    if (!oldFirst && !oldLast) { return null }

	    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
	    // Get the spans that 'stick out' on both sides
	    var first = markedSpansBefore(oldFirst, startCh, isInsert);
	    var last = markedSpansAfter(oldLast, endCh, isInsert);

	    // Next, merge those two ends
	    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
	    if (first) {
	      // Fix up .to properties of first
	      for (var i = 0; i < first.length; ++i) {
	        var span = first[i];
	        if (span.to == null) {
	          var found = getMarkedSpanFor(last, span.marker);
	          if (!found) { span.to = startCh; }
	          else if (sameLine) { span.to = found.to == null ? null : found.to + offset; }
	        }
	      }
	    }
	    if (last) {
	      // Fix up .from in last (or move them into first in case of sameLine)
	      for (var i$1 = 0; i$1 < last.length; ++i$1) {
	        var span$1 = last[i$1];
	        if (span$1.to != null) { span$1.to += offset; }
	        if (span$1.from == null) {
	          var found$1 = getMarkedSpanFor(first, span$1.marker);
	          if (!found$1) {
	            span$1.from = offset;
	            if (sameLine) { (first || (first = [])).push(span$1); }
	          }
	        } else {
	          span$1.from += offset;
	          if (sameLine) { (first || (first = [])).push(span$1); }
	        }
	      }
	    }
	    // Make sure we didn't create any zero-length spans
	    if (first) { first = clearEmptySpans(first); }
	    if (last && last != first) { last = clearEmptySpans(last); }

	    var newMarkers = [first];
	    if (!sameLine) {
	      // Fill gap with whole-line-spans
	      var gap = change.text.length - 2, gapMarkers;
	      if (gap > 0 && first)
	        { for (var i$2 = 0; i$2 < first.length; ++i$2)
	          { if (first[i$2].to == null)
	            { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)); } } }
	      for (var i$3 = 0; i$3 < gap; ++i$3)
	        { newMarkers.push(gapMarkers); }
	      newMarkers.push(last);
	    }
	    return newMarkers
	  }

	  // Remove spans that are empty and don't have a clearWhenEmpty
	  // option of false.
	  function clearEmptySpans(spans) {
	    for (var i = 0; i < spans.length; ++i) {
	      var span = spans[i];
	      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
	        { spans.splice(i--, 1); }
	    }
	    if (!spans.length) { return null }
	    return spans
	  }

	  // Used to 'clip' out readOnly ranges when making a change.
	  function removeReadOnlyRanges(doc, from, to) {
	    var markers = null;
	    doc.iter(from.line, to.line + 1, function (line) {
	      if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
	        var mark = line.markedSpans[i].marker;
	        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
	          { (markers || (markers = [])).push(mark); }
	      } }
	    });
	    if (!markers) { return null }
	    var parts = [{from: from, to: to}];
	    for (var i = 0; i < markers.length; ++i) {
	      var mk = markers[i], m = mk.find(0);
	      for (var j = 0; j < parts.length; ++j) {
	        var p = parts[j];
	        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
	        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
	        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
	          { newParts.push({from: p.from, to: m.from}); }
	        if (dto > 0 || !mk.inclusiveRight && !dto)
	          { newParts.push({from: m.to, to: p.to}); }
	        parts.splice.apply(parts, newParts);
	        j += newParts.length - 3;
	      }
	    }
	    return parts
	  }

	  // Connect or disconnect spans from a line.
	  function detachMarkedSpans(line) {
	    var spans = line.markedSpans;
	    if (!spans) { return }
	    for (var i = 0; i < spans.length; ++i)
	      { spans[i].marker.detachLine(line); }
	    line.markedSpans = null;
	  }
	  function attachMarkedSpans(line, spans) {
	    if (!spans) { return }
	    for (var i = 0; i < spans.length; ++i)
	      { spans[i].marker.attachLine(line); }
	    line.markedSpans = spans;
	  }

	  // Helpers used when computing which overlapping collapsed span
	  // counts as the larger one.
	  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
	  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

	  // Returns a number indicating which of two overlapping collapsed
	  // spans is larger (and thus includes the other). Falls back to
	  // comparing ids when the spans cover exactly the same range.
	  function compareCollapsedMarkers(a, b) {
	    var lenDiff = a.lines.length - b.lines.length;
	    if (lenDiff != 0) { return lenDiff }
	    var aPos = a.find(), bPos = b.find();
	    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
	    if (fromCmp) { return -fromCmp }
	    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
	    if (toCmp) { return toCmp }
	    return b.id - a.id
	  }

	  // Find out whether a line ends or starts in a collapsed span. If
	  // so, return the marker for that span.
	  function collapsedSpanAtSide(line, start) {
	    var sps = sawCollapsedSpans && line.markedSpans, found;
	    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
	      sp = sps[i];
	      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
	          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
	        { found = sp.marker; }
	    } }
	    return found
	  }
	  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
	  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

	  function collapsedSpanAround(line, ch) {
	    var sps = sawCollapsedSpans && line.markedSpans, found;
	    if (sps) { for (var i = 0; i < sps.length; ++i) {
	      var sp = sps[i];
	      if (sp.marker.collapsed && (sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) &&
	          (!found || compareCollapsedMarkers(found, sp.marker) < 0)) { found = sp.marker; }
	    } }
	    return found
	  }

	  // Test whether there exists a collapsed span that partially
	  // overlaps (covers the start or end, but not both) of a new span.
	  // Such overlap is not allowed.
	  function conflictingCollapsedRange(doc, lineNo$$1, from, to, marker) {
	    var line = getLine(doc, lineNo$$1);
	    var sps = sawCollapsedSpans && line.markedSpans;
	    if (sps) { for (var i = 0; i < sps.length; ++i) {
	      var sp = sps[i];
	      if (!sp.marker.collapsed) { continue }
	      var found = sp.marker.find(0);
	      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
	      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
	      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
	      if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
	          fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
	        { return true }
	    } }
	  }

	  // A visual line is a line as drawn on the screen. Folding, for
	  // example, can cause multiple logical lines to appear on the same
	  // visual line. This finds the start of the visual line that the
	  // given line is part of (usually that is the line itself).
	  function visualLine(line) {
	    var merged;
	    while (merged = collapsedSpanAtStart(line))
	      { line = merged.find(-1, true).line; }
	    return line
	  }

	  function visualLineEnd(line) {
	    var merged;
	    while (merged = collapsedSpanAtEnd(line))
	      { line = merged.find(1, true).line; }
	    return line
	  }

	  // Returns an array of logical lines that continue the visual line
	  // started by the argument, or undefined if there are no such lines.
	  function visualLineContinued(line) {
	    var merged, lines;
	    while (merged = collapsedSpanAtEnd(line)) {
	      line = merged.find(1, true).line
	      ;(lines || (lines = [])).push(line);
	    }
	    return lines
	  }

	  // Get the line number of the start of the visual line that the
	  // given line number is part of.
	  function visualLineNo(doc, lineN) {
	    var line = getLine(doc, lineN), vis = visualLine(line);
	    if (line == vis) { return lineN }
	    return lineNo(vis)
	  }

	  // Get the line number of the start of the next visual line after
	  // the given line.
	  function visualLineEndNo(doc, lineN) {
	    if (lineN > doc.lastLine()) { return lineN }
	    var line = getLine(doc, lineN), merged;
	    if (!lineIsHidden(doc, line)) { return lineN }
	    while (merged = collapsedSpanAtEnd(line))
	      { line = merged.find(1, true).line; }
	    return lineNo(line) + 1
	  }

	  // Compute whether a line is hidden. Lines count as hidden when they
	  // are part of a visual line that starts with another line, or when
	  // they are entirely covered by collapsed, non-widget span.
	  function lineIsHidden(doc, line) {
	    var sps = sawCollapsedSpans && line.markedSpans;
	    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
	      sp = sps[i];
	      if (!sp.marker.collapsed) { continue }
	      if (sp.from == null) { return true }
	      if (sp.marker.widgetNode) { continue }
	      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
	        { return true }
	    } }
	  }
	  function lineIsHiddenInner(doc, line, span) {
	    if (span.to == null) {
	      var end = span.marker.find(1, true);
	      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
	    }
	    if (span.marker.inclusiveRight && span.to == line.text.length)
	      { return true }
	    for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
	      sp = line.markedSpans[i];
	      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
	          (sp.to == null || sp.to != span.from) &&
	          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
	          lineIsHiddenInner(doc, line, sp)) { return true }
	    }
	  }

	  // Find the height above the given line.
	  function heightAtLine(lineObj) {
	    lineObj = visualLine(lineObj);

	    var h = 0, chunk = lineObj.parent;
	    for (var i = 0; i < chunk.lines.length; ++i) {
	      var line = chunk.lines[i];
	      if (line == lineObj) { break }
	      else { h += line.height; }
	    }
	    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
	      for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
	        var cur = p.children[i$1];
	        if (cur == chunk) { break }
	        else { h += cur.height; }
	      }
	    }
	    return h
	  }

	  // Compute the character length of a line, taking into account
	  // collapsed ranges (see markText) that might hide parts, and join
	  // other lines onto it.
	  function lineLength(line) {
	    if (line.height == 0) { return 0 }
	    var len = line.text.length, merged, cur = line;
	    while (merged = collapsedSpanAtStart(cur)) {
	      var found = merged.find(0, true);
	      cur = found.from.line;
	      len += found.from.ch - found.to.ch;
	    }
	    cur = line;
	    while (merged = collapsedSpanAtEnd(cur)) {
	      var found$1 = merged.find(0, true);
	      len -= cur.text.length - found$1.from.ch;
	      cur = found$1.to.line;
	      len += cur.text.length - found$1.to.ch;
	    }
	    return len
	  }

	  // Find the longest line in the document.
	  function findMaxLine(cm) {
	    var d = cm.display, doc = cm.doc;
	    d.maxLine = getLine(doc, doc.first);
	    d.maxLineLength = lineLength(d.maxLine);
	    d.maxLineChanged = true;
	    doc.iter(function (line) {
	      var len = lineLength(line);
	      if (len > d.maxLineLength) {
	        d.maxLineLength = len;
	        d.maxLine = line;
	      }
	    });
	  }

	  // LINE DATA STRUCTURE

	  // Line objects. These hold state related to a line, including
	  // highlighting info (the styles array).
	  var Line = function(text, markedSpans, estimateHeight) {
	    this.text = text;
	    attachMarkedSpans(this, markedSpans);
	    this.height = estimateHeight ? estimateHeight(this) : 1;
	  };

	  Line.prototype.lineNo = function () { return lineNo(this) };
	  eventMixin(Line);

	  // Change the content (text, markers) of a line. Automatically
	  // invalidates cached information and tries to re-estimate the
	  // line's height.
	  function updateLine(line, text, markedSpans, estimateHeight) {
	    line.text = text;
	    if (line.stateAfter) { line.stateAfter = null; }
	    if (line.styles) { line.styles = null; }
	    if (line.order != null) { line.order = null; }
	    detachMarkedSpans(line);
	    attachMarkedSpans(line, markedSpans);
	    var estHeight = estimateHeight ? estimateHeight(line) : 1;
	    if (estHeight != line.height) { updateLineHeight(line, estHeight); }
	  }

	  // Detach a line from the document tree and its markers.
	  function cleanUpLine(line) {
	    line.parent = null;
	    detachMarkedSpans(line);
	  }

	  // Convert a style as returned by a mode (either null, or a string
	  // containing one or more styles) to a CSS style. This is cached,
	  // and also looks for line-wide styles.
	  var styleToClassCache = {}, styleToClassCacheWithMode = {};
	  function interpretTokenStyle(style, options) {
	    if (!style || /^\s*$/.test(style)) { return null }
	    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
	    return cache[style] ||
	      (cache[style] = style.replace(/\S+/g, "cm-$&"))
	  }

	  // Render the DOM representation of the text of a line. Also builds
	  // up a 'line map', which points at the DOM nodes that represent
	  // specific stretches of text, and is used by the measuring code.
	  // The returned object contains the DOM node, this map, and
	  // information about line-wide styles that were set by the mode.
	  function buildLineContent(cm, lineView) {
	    // The padding-right forces the element to have a 'border', which
	    // is needed on Webkit to be able to get line-level bounding
	    // rectangles for it (in measureChar).
	    var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
	    var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
	                   col: 0, pos: 0, cm: cm,
	                   trailingSpace: false,
	                   splitSpaces: cm.getOption("lineWrapping")};
	    lineView.measure = {};

	    // Iterate over the logical lines that make up this visual line.
	    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
	      var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0);
	      builder.pos = 0;
	      builder.addToken = buildToken;
	      // Optionally wire in some hacks into the token-rendering
	      // algorithm, to deal with browser quirks.
	      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
	        { builder.addToken = buildTokenBadBidi(builder.addToken, order); }
	      builder.map = [];
	      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
	      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
	      if (line.styleClasses) {
	        if (line.styleClasses.bgClass)
	          { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || ""); }
	        if (line.styleClasses.textClass)
	          { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || ""); }
	      }

	      // Ensure at least a single node is present, for measuring.
	      if (builder.map.length == 0)
	        { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))); }

	      // Store the map and a cache object for the current logical line
	      if (i == 0) {
	        lineView.measure.map = builder.map;
	        lineView.measure.cache = {};
	      } else {
	  (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
	        ;(lineView.measure.caches || (lineView.measure.caches = [])).push({});
	      }
	    }

	    // See issue #2901
	    if (webkit) {
	      var last = builder.content.lastChild;
	      if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
	        { builder.content.className = "cm-tab-wrap-hack"; }
	    }

	    signal(cm, "renderLine", cm, lineView.line, builder.pre);
	    if (builder.pre.className)
	      { builder.textClass = joinClasses(builder.pre.className, builder.textClass || ""); }

	    return builder
	  }

	  function defaultSpecialCharPlaceholder(ch) {
	    var token = elt("span", "\u2022", "cm-invalidchar");
	    token.title = "\\u" + ch.charCodeAt(0).toString(16);
	    token.setAttribute("aria-label", token.title);
	    return token
	  }

	  // Build up the DOM representation for a single token, and add it to
	  // the line map. Takes care to render special characters separately.
	  function buildToken(builder, text, style, startStyle, endStyle, css, attributes) {
	    if (!text) { return }
	    var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
	    var special = builder.cm.state.specialChars, mustWrap = false;
	    var content;
	    if (!special.test(text)) {
	      builder.col += text.length;
	      content = document.createTextNode(displayText);
	      builder.map.push(builder.pos, builder.pos + text.length, content);
	      if (ie && ie_version < 9) { mustWrap = true; }
	      builder.pos += text.length;
	    } else {
	      content = document.createDocumentFragment();
	      var pos = 0;
	      while (true) {
	        special.lastIndex = pos;
	        var m = special.exec(text);
	        var skipped = m ? m.index - pos : text.length - pos;
	        if (skipped) {
	          var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
	          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])); }
	          else { content.appendChild(txt); }
	          builder.map.push(builder.pos, builder.pos + skipped, txt);
	          builder.col += skipped;
	          builder.pos += skipped;
	        }
	        if (!m) { break }
	        pos += skipped + 1;
	        var txt$1 = (void 0);
	        if (m[0] == "\t") {
	          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
	          txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
	          txt$1.setAttribute("role", "presentation");
	          txt$1.setAttribute("cm-text", "\t");
	          builder.col += tabWidth;
	        } else if (m[0] == "\r" || m[0] == "\n") {
	          txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"));
	          txt$1.setAttribute("cm-text", m[0]);
	          builder.col += 1;
	        } else {
	          txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
	          txt$1.setAttribute("cm-text", m[0]);
	          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])); }
	          else { content.appendChild(txt$1); }
	          builder.col += 1;
	        }
	        builder.map.push(builder.pos, builder.pos + 1, txt$1);
	        builder.pos++;
	      }
	    }
	    builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
	    if (style || startStyle || endStyle || mustWrap || css) {
	      var fullStyle = style || "";
	      if (startStyle) { fullStyle += startStyle; }
	      if (endStyle) { fullStyle += endStyle; }
	      var token = elt("span", [content], fullStyle, css);
	      if (attributes) {
	        for (var attr in attributes) { if (attributes.hasOwnProperty(attr) && attr != "style" && attr != "class")
	          { token.setAttribute(attr, attributes[attr]); } }
	      }
	      return builder.content.appendChild(token)
	    }
	    builder.content.appendChild(content);
	  }

	  // Change some spaces to NBSP to prevent the browser from collapsing
	  // trailing spaces at the end of a line when rendering text (issue #1362).
	  function splitSpaces(text, trailingBefore) {
	    if (text.length > 1 && !/  /.test(text)) { return text }
	    var spaceBefore = trailingBefore, result = "";
	    for (var i = 0; i < text.length; i++) {
	      var ch = text.charAt(i);
	      if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
	        { ch = "\u00a0"; }
	      result += ch;
	      spaceBefore = ch == " ";
	    }
	    return result
	  }

	  // Work around nonsense dimensions being reported for stretches of
	  // right-to-left text.
	  function buildTokenBadBidi(inner, order) {
	    return function (builder, text, style, startStyle, endStyle, css, attributes) {
	      style = style ? style + " cm-force-border" : "cm-force-border";
	      var start = builder.pos, end = start + text.length;
	      for (;;) {
	        // Find the part that overlaps with the start of this text
	        var part = (void 0);
	        for (var i = 0; i < order.length; i++) {
	          part = order[i];
	          if (part.to > start && part.from <= start) { break }
	        }
	        if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, css, attributes) }
	        inner(builder, text.slice(0, part.to - start), style, startStyle, null, css, attributes);
	        startStyle = null;
	        text = text.slice(part.to - start);
	        start = part.to;
	      }
	    }
	  }

	  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
	    var widget = !ignoreWidget && marker.widgetNode;
	    if (widget) { builder.map.push(builder.pos, builder.pos + size, widget); }
	    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
	      if (!widget)
	        { widget = builder.content.appendChild(document.createElement("span")); }
	      widget.setAttribute("cm-marker", marker.id);
	    }
	    if (widget) {
	      builder.cm.display.input.setUneditable(widget);
	      builder.content.appendChild(widget);
	    }
	    builder.pos += size;
	    builder.trailingSpace = false;
	  }

	  // Outputs a number of spans to make up a line, taking highlighting
	  // and marked text into account.
	  function insertLineContent(line, builder, styles) {
	    var spans = line.markedSpans, allText = line.text, at = 0;
	    if (!spans) {
	      for (var i$1 = 1; i$1 < styles.length; i$1+=2)
	        { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)); }
	      return
	    }

	    var len = allText.length, pos = 0, i = 1, text = "", style, css;
	    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, collapsed, attributes;
	    for (;;) {
	      if (nextChange == pos) { // Update current marker set
	        spanStyle = spanEndStyle = spanStartStyle = css = "";
	        attributes = null;
	        collapsed = null; nextChange = Infinity;
	        var foundBookmarks = [], endStyles = (void 0);
	        for (var j = 0; j < spans.length; ++j) {
	          var sp = spans[j], m = sp.marker;
	          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
	            foundBookmarks.push(m);
	          } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
	            if (sp.to != null && sp.to != pos && nextChange > sp.to) {
	              nextChange = sp.to;
	              spanEndStyle = "";
	            }
	            if (m.className) { spanStyle += " " + m.className; }
	            if (m.css) { css = (css ? css + ";" : "") + m.css; }
	            if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle; }
	            if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to); }
	            // support for the old title property
	            // https://github.com/codemirror/CodeMirror/pull/5673
	            if (m.title) { (attributes || (attributes = {})).title = m.title; }
	            if (m.attributes) {
	              for (var attr in m.attributes)
	                { (attributes || (attributes = {}))[attr] = m.attributes[attr]; }
	            }
	            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
	              { collapsed = sp; }
	          } else if (sp.from > pos && nextChange > sp.from) {
	            nextChange = sp.from;
	          }
	        }
	        if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
	          { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1]; } } }

	        if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
	          { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]); } }
	        if (collapsed && (collapsed.from || 0) == pos) {
	          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
	                             collapsed.marker, collapsed.from == null);
	          if (collapsed.to == null) { return }
	          if (collapsed.to == pos) { collapsed = false; }
	        }
	      }
	      if (pos >= len) { break }

	      var upto = Math.min(len, nextChange);
	      while (true) {
	        if (text) {
	          var end = pos + text.length;
	          if (!collapsed) {
	            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
	            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
	                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", css, attributes);
	          }
	          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
	          pos = end;
	          spanStartStyle = "";
	        }
	        text = allText.slice(at, at = styles[i++]);
	        style = interpretTokenStyle(styles[i++], builder.cm.options);
	      }
	    }
	  }


	  // These objects are used to represent the visible (currently drawn)
	  // part of the document. A LineView may correspond to multiple
	  // logical lines, if those are connected by collapsed ranges.
	  function LineView(doc, line, lineN) {
	    // The starting line
	    this.line = line;
	    // Continuing lines, if any
	    this.rest = visualLineContinued(line);
	    // Number of logical lines in this visual line
	    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
	    this.node = this.text = null;
	    this.hidden = lineIsHidden(doc, line);
	  }

	  // Create a range of LineView objects for the given lines.
	  function buildViewArray(cm, from, to) {
	    var array = [], nextPos;
	    for (var pos = from; pos < to; pos = nextPos) {
	      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
	      nextPos = pos + view.size;
	      array.push(view);
	    }
	    return array
	  }

	  var operationGroup = null;

	  function pushOperation(op) {
	    if (operationGroup) {
	      operationGroup.ops.push(op);
	    } else {
	      op.ownsGroup = operationGroup = {
	        ops: [op],
	        delayedCallbacks: []
	      };
	    }
	  }

	  function fireCallbacksForOps(group) {
	    // Calls delayed callbacks and cursorActivity handlers until no
	    // new ones appear
	    var callbacks = group.delayedCallbacks, i = 0;
	    do {
	      for (; i < callbacks.length; i++)
	        { callbacks[i].call(null); }
	      for (var j = 0; j < group.ops.length; j++) {
	        var op = group.ops[j];
	        if (op.cursorActivityHandlers)
	          { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
	            { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm); } }
	      }
	    } while (i < callbacks.length)
	  }

	  function finishOperation(op, endCb) {
	    var group = op.ownsGroup;
	    if (!group) { return }

	    try { fireCallbacksForOps(group); }
	    finally {
	      operationGroup = null;
	      endCb(group);
	    }
	  }

	  var orphanDelayedCallbacks = null;

	  // Often, we want to signal events at a point where we are in the
	  // middle of some work, but don't want the handler to start calling
	  // other methods on the editor, which might be in an inconsistent
	  // state or simply not expect any other events to happen.
	  // signalLater looks whether there are any handlers, and schedules
	  // them to be executed when the last operation ends, or, if no
	  // operation is active, when a timeout fires.
	  function signalLater(emitter, type /*, values...*/) {
	    var arr = getHandlers(emitter, type);
	    if (!arr.length) { return }
	    var args = Array.prototype.slice.call(arguments, 2), list;
	    if (operationGroup) {
	      list = operationGroup.delayedCallbacks;
	    } else if (orphanDelayedCallbacks) {
	      list = orphanDelayedCallbacks;
	    } else {
	      list = orphanDelayedCallbacks = [];
	      setTimeout(fireOrphanDelayed, 0);
	    }
	    var loop = function ( i ) {
	      list.push(function () { return arr[i].apply(null, args); });
	    };

	    for (var i = 0; i < arr.length; ++i)
	      loop( i );
	  }

	  function fireOrphanDelayed() {
	    var delayed = orphanDelayedCallbacks;
	    orphanDelayedCallbacks = null;
	    for (var i = 0; i < delayed.length; ++i) { delayed[i](); }
	  }

	  // When an aspect of a line changes, a string is added to
	  // lineView.changes. This updates the relevant part of the line's
	  // DOM structure.
	  function updateLineForChanges(cm, lineView, lineN, dims) {
	    for (var j = 0; j < lineView.changes.length; j++) {
	      var type = lineView.changes[j];
	      if (type == "text") { updateLineText(cm, lineView); }
	      else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims); }
	      else if (type == "class") { updateLineClasses(cm, lineView); }
	      else if (type == "widget") { updateLineWidgets(cm, lineView, dims); }
	    }
	    lineView.changes = null;
	  }

	  // Lines with gutter elements, widgets or a background class need to
	  // be wrapped, and have the extra elements added to the wrapper div
	  function ensureLineWrapped(lineView) {
	    if (lineView.node == lineView.text) {
	      lineView.node = elt("div", null, null, "position: relative");
	      if (lineView.text.parentNode)
	        { lineView.text.parentNode.replaceChild(lineView.node, lineView.text); }
	      lineView.node.appendChild(lineView.text);
	      if (ie && ie_version < 8) { lineView.node.style.zIndex = 2; }
	    }
	    return lineView.node
	  }

	  function updateLineBackground(cm, lineView) {
	    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
	    if (cls) { cls += " CodeMirror-linebackground"; }
	    if (lineView.background) {
	      if (cls) { lineView.background.className = cls; }
	      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
	    } else if (cls) {
	      var wrap = ensureLineWrapped(lineView);
	      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
	      cm.display.input.setUneditable(lineView.background);
	    }
	  }

	  // Wrapper around buildLineContent which will reuse the structure
	  // in display.externalMeasured when possible.
	  function getLineContent(cm, lineView) {
	    var ext = cm.display.externalMeasured;
	    if (ext && ext.line == lineView.line) {
	      cm.display.externalMeasured = null;
	      lineView.measure = ext.measure;
	      return ext.built
	    }
	    return buildLineContent(cm, lineView)
	  }

	  // Redraw the line's text. Interacts with the background and text
	  // classes because the mode may output tokens that influence these
	  // classes.
	  function updateLineText(cm, lineView) {
	    var cls = lineView.text.className;
	    var built = getLineContent(cm, lineView);
	    if (lineView.text == lineView.node) { lineView.node = built.pre; }
	    lineView.text.parentNode.replaceChild(built.pre, lineView.text);
	    lineView.text = built.pre;
	    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
	      lineView.bgClass = built.bgClass;
	      lineView.textClass = built.textClass;
	      updateLineClasses(cm, lineView);
	    } else if (cls) {
	      lineView.text.className = cls;
	    }
	  }

	  function updateLineClasses(cm, lineView) {
	    updateLineBackground(cm, lineView);
	    if (lineView.line.wrapClass)
	      { ensureLineWrapped(lineView).className = lineView.line.wrapClass; }
	    else if (lineView.node != lineView.text)
	      { lineView.node.className = ""; }
	    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
	    lineView.text.className = textClass || "";
	  }

	  function updateLineGutter(cm, lineView, lineN, dims) {
	    if (lineView.gutter) {
	      lineView.node.removeChild(lineView.gutter);
	      lineView.gutter = null;
	    }
	    if (lineView.gutterBackground) {
	      lineView.node.removeChild(lineView.gutterBackground);
	      lineView.gutterBackground = null;
	    }
	    if (lineView.line.gutterClass) {
	      var wrap = ensureLineWrapped(lineView);
	      lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
	                                      ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"));
	      cm.display.input.setUneditable(lineView.gutterBackground);
	      wrap.insertBefore(lineView.gutterBackground, lineView.text);
	    }
	    var markers = lineView.line.gutterMarkers;
	    if (cm.options.lineNumbers || markers) {
	      var wrap$1 = ensureLineWrapped(lineView);
	      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"));
	      cm.display.input.setUneditable(gutterWrap);
	      wrap$1.insertBefore(gutterWrap, lineView.text);
	      if (lineView.line.gutterClass)
	        { gutterWrap.className += " " + lineView.line.gutterClass; }
	      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
	        { lineView.lineNumber = gutterWrap.appendChild(
	          elt("div", lineNumberFor(cm.options, lineN),
	              "CodeMirror-linenumber CodeMirror-gutter-elt",
	              ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))); }
	      if (markers) { for (var k = 0; k < cm.display.gutterSpecs.length; ++k) {
	        var id = cm.display.gutterSpecs[k].className, found = markers.hasOwnProperty(id) && markers[id];
	        if (found)
	          { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
	                                     ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))); }
	      } }
	    }
	  }

	  function updateLineWidgets(cm, lineView, dims) {
	    if (lineView.alignable) { lineView.alignable = null; }
	    for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
	      next = node.nextSibling;
	      if (node.className == "CodeMirror-linewidget")
	        { lineView.node.removeChild(node); }
	    }
	    insertLineWidgets(cm, lineView, dims);
	  }

	  // Build a line's DOM representation from scratch
	  function buildLineElement(cm, lineView, lineN, dims) {
	    var built = getLineContent(cm, lineView);
	    lineView.text = lineView.node = built.pre;
	    if (built.bgClass) { lineView.bgClass = built.bgClass; }
	    if (built.textClass) { lineView.textClass = built.textClass; }

	    updateLineClasses(cm, lineView);
	    updateLineGutter(cm, lineView, lineN, dims);
	    insertLineWidgets(cm, lineView, dims);
	    return lineView.node
	  }

	  // A lineView may contain multiple logical lines (when merged by
	  // collapsed spans). The widgets for all of them need to be drawn.
	  function insertLineWidgets(cm, lineView, dims) {
	    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
	    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
	      { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false); } }
	  }

	  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
	    if (!line.widgets) { return }
	    var wrap = ensureLineWrapped(lineView);
	    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
	      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
	      if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true"); }
	      positionLineWidget(widget, node, lineView, dims);
	      cm.display.input.setUneditable(node);
	      if (allowAbove && widget.above)
	        { wrap.insertBefore(node, lineView.gutter || lineView.text); }
	      else
	        { wrap.appendChild(node); }
	      signalLater(widget, "redraw");
	    }
	  }

	  function positionLineWidget(widget, node, lineView, dims) {
	    if (widget.noHScroll) {
	  (lineView.alignable || (lineView.alignable = [])).push(node);
	      var width = dims.wrapperWidth;
	      node.style.left = dims.fixedPos + "px";
	      if (!widget.coverGutter) {
	        width -= dims.gutterTotalWidth;
	        node.style.paddingLeft = dims.gutterTotalWidth + "px";
	      }
	      node.style.width = width + "px";
	    }
	    if (widget.coverGutter) {
	      node.style.zIndex = 5;
	      node.style.position = "relative";
	      if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px"; }
	    }
	  }

	  function widgetHeight(widget) {
	    if (widget.height != null) { return widget.height }
	    var cm = widget.doc.cm;
	    if (!cm) { return 0 }
	    if (!contains(document.body, widget.node)) {
	      var parentStyle = "position: relative;";
	      if (widget.coverGutter)
	        { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;"; }
	      if (widget.noHScroll)
	        { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;"; }
	      removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
	    }
	    return widget.height = widget.node.parentNode.offsetHeight
	  }

	  // Return true when the given mouse event happened in a widget
	  function eventInWidget(display, e) {
	    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
	      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
	          (n.parentNode == display.sizer && n != display.mover))
	        { return true }
	    }
	  }

	  // POSITION MEASUREMENT

	  function paddingTop(display) {return display.lineSpace.offsetTop}
	  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
	  function paddingH(display) {
	    if (display.cachedPaddingH) { return display.cachedPaddingH }
	    var e = removeChildrenAndAdd(display.measure, elt("pre", "x", "CodeMirror-line-like"));
	    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
	    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
	    if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data; }
	    return data
	  }

	  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
	  function displayWidth(cm) {
	    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
	  }
	  function displayHeight(cm) {
	    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
	  }

	  // Ensure the lineView.wrapping.heights array is populated. This is
	  // an array of bottom offsets for the lines that make up a drawn
	  // line. When lineWrapping is on, there might be more than one
	  // height.
	  function ensureLineHeights(cm, lineView, rect) {
	    var wrapping = cm.options.lineWrapping;
	    var curWidth = wrapping && displayWidth(cm);
	    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
	      var heights = lineView.measure.heights = [];
	      if (wrapping) {
	        lineView.measure.width = curWidth;
	        var rects = lineView.text.firstChild.getClientRects();
	        for (var i = 0; i < rects.length - 1; i++) {
	          var cur = rects[i], next = rects[i + 1];
	          if (Math.abs(cur.bottom - next.bottom) > 2)
	            { heights.push((cur.bottom + next.top) / 2 - rect.top); }
	        }
	      }
	      heights.push(rect.bottom - rect.top);
	    }
	  }

	  // Find a line map (mapping character offsets to text nodes) and a
	  // measurement cache for the given line number. (A line view might
	  // contain multiple lines when collapsed ranges are present.)
	  function mapFromLineView(lineView, line, lineN) {
	    if (lineView.line == line)
	      { return {map: lineView.measure.map, cache: lineView.measure.cache} }
	    for (var i = 0; i < lineView.rest.length; i++)
	      { if (lineView.rest[i] == line)
	        { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
	    for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
	      { if (lineNo(lineView.rest[i$1]) > lineN)
	        { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
	  }

	  // Render a line into the hidden node display.externalMeasured. Used
	  // when measurement is needed for a line that's not in the viewport.
	  function updateExternalMeasurement(cm, line) {
	    line = visualLine(line);
	    var lineN = lineNo(line);
	    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
	    view.lineN = lineN;
	    var built = view.built = buildLineContent(cm, view);
	    view.text = built.pre;
	    removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
	    return view
	  }

	  // Get a {top, bottom, left, right} box (in line-local coordinates)
	  // for a given character.
	  function measureChar(cm, line, ch, bias) {
	    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
	  }

	  // Find a line view that corresponds to the given line number.
	  function findViewForLine(cm, lineN) {
	    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
	      { return cm.display.view[findViewIndex(cm, lineN)] }
	    var ext = cm.display.externalMeasured;
	    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
	      { return ext }
	  }

	  // Measurement can be split in two steps, the set-up work that
	  // applies to the whole line, and the measurement of the actual
	  // character. Functions like coordsChar, that need to do a lot of
	  // measurements in a row, can thus ensure that the set-up work is
	  // only done once.
	  function prepareMeasureForLine(cm, line) {
	    var lineN = lineNo(line);
	    var view = findViewForLine(cm, lineN);
	    if (view && !view.text) {
	      view = null;
	    } else if (view && view.changes) {
	      updateLineForChanges(cm, view, lineN, getDimensions(cm));
	      cm.curOp.forceUpdate = true;
	    }
	    if (!view)
	      { view = updateExternalMeasurement(cm, line); }

	    var info = mapFromLineView(view, line, lineN);
	    return {
	      line: line, view: view, rect: null,
	      map: info.map, cache: info.cache, before: info.before,
	      hasHeights: false
	    }
	  }

	  // Given a prepared measurement object, measures the position of an
	  // actual character (or fetches it from the cache).
	  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
	    if (prepared.before) { ch = -1; }
	    var key = ch + (bias || ""), found;
	    if (prepared.cache.hasOwnProperty(key)) {
	      found = prepared.cache[key];
	    } else {
	      if (!prepared.rect)
	        { prepared.rect = prepared.view.text.getBoundingClientRect(); }
	      if (!prepared.hasHeights) {
	        ensureLineHeights(cm, prepared.view, prepared.rect);
	        prepared.hasHeights = true;
	      }
	      found = measureCharInner(cm, prepared, ch, bias);
	      if (!found.bogus) { prepared.cache[key] = found; }
	    }
	    return {left: found.left, right: found.right,
	            top: varHeight ? found.rtop : found.top,
	            bottom: varHeight ? found.rbottom : found.bottom}
	  }

	  var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

	  function nodeAndOffsetInLineMap(map$$1, ch, bias) {
	    var node, start, end, collapse, mStart, mEnd;
	    // First, search the line map for the text node corresponding to,
	    // or closest to, the target character.
	    for (var i = 0; i < map$$1.length; i += 3) {
	      mStart = map$$1[i];
	      mEnd = map$$1[i + 1];
	      if (ch < mStart) {
	        start = 0; end = 1;
	        collapse = "left";
	      } else if (ch < mEnd) {
	        start = ch - mStart;
	        end = start + 1;
	      } else if (i == map$$1.length - 3 || ch == mEnd && map$$1[i + 3] > ch) {
	        end = mEnd - mStart;
	        start = end - 1;
	        if (ch >= mEnd) { collapse = "right"; }
	      }
	      if (start != null) {
	        node = map$$1[i + 2];
	        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
	          { collapse = bias; }
	        if (bias == "left" && start == 0)
	          { while (i && map$$1[i - 2] == map$$1[i - 3] && map$$1[i - 1].insertLeft) {
	            node = map$$1[(i -= 3) + 2];
	            collapse = "left";
	          } }
	        if (bias == "right" && start == mEnd - mStart)
	          { while (i < map$$1.length - 3 && map$$1[i + 3] == map$$1[i + 4] && !map$$1[i + 5].insertLeft) {
	            node = map$$1[(i += 3) + 2];
	            collapse = "right";
	          } }
	        break
	      }
	    }
	    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
	  }

	  function getUsefulRect(rects, bias) {
	    var rect = nullRect;
	    if (bias == "left") { for (var i = 0; i < rects.length; i++) {
	      if ((rect = rects[i]).left != rect.right) { break }
	    } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
	      if ((rect = rects[i$1]).left != rect.right) { break }
	    } }
	    return rect
	  }

	  function measureCharInner(cm, prepared, ch, bias) {
	    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
	    var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

	    var rect;
	    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
	      for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
	        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start; }
	        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end; }
	        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
	          { rect = node.parentNode.getBoundingClientRect(); }
	        else
	          { rect = getUsefulRect(range(node, start, end).getClientRects(), bias); }
	        if (rect.left || rect.right || start == 0) { break }
	        end = start;
	        start = start - 1;
	        collapse = "right";
	      }
	      if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect); }
	    } else { // If it is a widget, simply get the box for the whole widget.
	      if (start > 0) { collapse = bias = "right"; }
	      var rects;
	      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
	        { rect = rects[bias == "right" ? rects.length - 1 : 0]; }
	      else
	        { rect = node.getBoundingClientRect(); }
	    }
	    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
	      var rSpan = node.parentNode.getClientRects()[0];
	      if (rSpan)
	        { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom}; }
	      else
	        { rect = nullRect; }
	    }

	    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
	    var mid = (rtop + rbot) / 2;
	    var heights = prepared.view.measure.heights;
	    var i = 0;
	    for (; i < heights.length - 1; i++)
	      { if (mid < heights[i]) { break } }
	    var top = i ? heights[i - 1] : 0, bot = heights[i];
	    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
	                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
	                  top: top, bottom: bot};
	    if (!rect.left && !rect.right) { result.bogus = true; }
	    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

	    return result
	  }

	  // Work around problem with bounding client rects on ranges being
	  // returned incorrectly when zoomed on IE10 and below.
	  function maybeUpdateRectForZooming(measure, rect) {
	    if (!window.screen || screen.logicalXDPI == null ||
	        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
	      { return rect }
	    var scaleX = screen.logicalXDPI / screen.deviceXDPI;
	    var scaleY = screen.logicalYDPI / screen.deviceYDPI;
	    return {left: rect.left * scaleX, right: rect.right * scaleX,
	            top: rect.top * scaleY, bottom: rect.bottom * scaleY}
	  }

	  function clearLineMeasurementCacheFor(lineView) {
	    if (lineView.measure) {
	      lineView.measure.cache = {};
	      lineView.measure.heights = null;
	      if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
	        { lineView.measure.caches[i] = {}; } }
	    }
	  }

	  function clearLineMeasurementCache(cm) {
	    cm.display.externalMeasure = null;
	    removeChildren(cm.display.lineMeasure);
	    for (var i = 0; i < cm.display.view.length; i++)
	      { clearLineMeasurementCacheFor(cm.display.view[i]); }
	  }

	  function clearCaches(cm) {
	    clearLineMeasurementCache(cm);
	    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
	    if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true; }
	    cm.display.lineNumChars = null;
	  }

	  function pageScrollX() {
	    // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
	    // which causes page_Offset and bounding client rects to use
	    // different reference viewports and invalidate our calculations.
	    if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
	    return window.pageXOffset || (document.documentElement || document.body).scrollLeft
	  }
	  function pageScrollY() {
	    if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
	    return window.pageYOffset || (document.documentElement || document.body).scrollTop
	  }

	  function widgetTopHeight(lineObj) {
	    var height = 0;
	    if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
	      { height += widgetHeight(lineObj.widgets[i]); } } }
	    return height
	  }

	  // Converts a {top, bottom, left, right} box from line-local
	  // coordinates into another coordinate system. Context may be one of
	  // "line", "div" (display.lineDiv), "local"./null (editor), "window",
	  // or "page".
	  function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
	    if (!includeWidgets) {
	      var height = widgetTopHeight(lineObj);
	      rect.top += height; rect.bottom += height;
	    }
	    if (context == "line") { return rect }
	    if (!context) { context = "local"; }
	    var yOff = heightAtLine(lineObj);
	    if (context == "local") { yOff += paddingTop(cm.display); }
	    else { yOff -= cm.display.viewOffset; }
	    if (context == "page" || context == "window") {
	      var lOff = cm.display.lineSpace.getBoundingClientRect();
	      yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
	      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
	      rect.left += xOff; rect.right += xOff;
	    }
	    rect.top += yOff; rect.bottom += yOff;
	    return rect
	  }

	  // Coverts a box from "div" coords to another coordinate system.
	  // Context may be "window", "page", "div", or "local"./null.
	  function fromCoordSystem(cm, coords, context) {
	    if (context == "div") { return coords }
	    var left = coords.left, top = coords.top;
	    // First move into "page" coordinate system
	    if (context == "page") {
	      left -= pageScrollX();
	      top -= pageScrollY();
	    } else if (context == "local" || !context) {
	      var localBox = cm.display.sizer.getBoundingClientRect();
	      left += localBox.left;
	      top += localBox.top;
	    }

	    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
	    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
	  }

	  function charCoords(cm, pos, context, lineObj, bias) {
	    if (!lineObj) { lineObj = getLine(cm.doc, pos.line); }
	    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
	  }

	  // Returns a box for a given cursor position, which may have an
	  // 'other' property containing the position of the secondary cursor
	  // on a bidi boundary.
	  // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
	  // and after `char - 1` in writing order of `char - 1`
	  // A cursor Pos(line, char, "after") is on the same visual line as `char`
	  // and before `char` in writing order of `char`
	  // Examples (upper-case letters are RTL, lower-case are LTR):
	  //     Pos(0, 1, ...)
	  //     before   after
	  // ab     a|b     a|b
	  // aB     a|B     aB|
	  // Ab     |Ab     A|b
	  // AB     B|A     B|A
	  // Every position after the last character on a line is considered to stick
	  // to the last character on the line.
	  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
	    lineObj = lineObj || getLine(cm.doc, pos.line);
	    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
	    function get(ch, right) {
	      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
	      if (right) { m.left = m.right; } else { m.right = m.left; }
	      return intoCoordSystem(cm, lineObj, m, context)
	    }
	    var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky;
	    if (ch >= lineObj.text.length) {
	      ch = lineObj.text.length;
	      sticky = "before";
	    } else if (ch <= 0) {
	      ch = 0;
	      sticky = "after";
	    }
	    if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

	    function getBidi(ch, partPos, invert) {
	      var part = order[partPos], right = part.level == 1;
	      return get(invert ? ch - 1 : ch, right != invert)
	    }
	    var partPos = getBidiPartAt(order, ch, sticky);
	    var other = bidiOther;
	    var val = getBidi(ch, partPos, sticky == "before");
	    if (other != null) { val.other = getBidi(ch, other, sticky != "before"); }
	    return val
	  }

	  // Used to cheaply estimate the coordinates for a position. Used for
	  // intermediate scroll updates.
	  function estimateCoords(cm, pos) {
	    var left = 0;
	    pos = clipPos(cm.doc, pos);
	    if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch; }
	    var lineObj = getLine(cm.doc, pos.line);
	    var top = heightAtLine(lineObj) + paddingTop(cm.display);
	    return {left: left, right: left, top: top, bottom: top + lineObj.height}
	  }

	  // Positions returned by coordsChar contain some extra information.
	  // xRel is the relative x position of the input coordinates compared
	  // to the found position (so xRel > 0 means the coordinates are to
	  // the right of the character position, for example). When outside
	  // is true, that means the coordinates lie outside the line's
	  // vertical range.
	  function PosWithInfo(line, ch, sticky, outside, xRel) {
	    var pos = Pos(line, ch, sticky);
	    pos.xRel = xRel;
	    if (outside) { pos.outside = outside; }
	    return pos
	  }

	  // Compute the character position closest to the given coordinates.
	  // Input must be lineSpace-local ("div" coordinate system).
	  function coordsChar(cm, x, y) {
	    var doc = cm.doc;
	    y += cm.display.viewOffset;
	    if (y < 0) { return PosWithInfo(doc.first, 0, null, -1, -1) }
	    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
	    if (lineN > last)
	      { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, 1, 1) }
	    if (x < 0) { x = 0; }

	    var lineObj = getLine(doc, lineN);
	    for (;;) {
	      var found = coordsCharInner(cm, lineObj, lineN, x, y);
	      var collapsed = collapsedSpanAround(lineObj, found.ch + (found.xRel > 0 || found.outside > 0 ? 1 : 0));
	      if (!collapsed) { return found }
	      var rangeEnd = collapsed.find(1);
	      if (rangeEnd.line == lineN) { return rangeEnd }
	      lineObj = getLine(doc, lineN = rangeEnd.line);
	    }
	  }

	  function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
	    y -= widgetTopHeight(lineObj);
	    var end = lineObj.text.length;
	    var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0);
	    end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end);
	    return {begin: begin, end: end}
	  }

	  function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
	    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
	    var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
	    return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
	  }

	  // Returns true if the given side of a box is after the given
	  // coordinates, in top-to-bottom, left-to-right order.
	  function boxIsAfter(box, x, y, left) {
	    return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
	  }

	  function coordsCharInner(cm, lineObj, lineNo$$1, x, y) {
	    // Move y into line-local coordinate space
	    y -= heightAtLine(lineObj);
	    var preparedMeasure = prepareMeasureForLine(cm, lineObj);
	    // When directly calling `measureCharPrepared`, we have to adjust
	    // for the widgets at this line.
	    var widgetHeight$$1 = widgetTopHeight(lineObj);
	    var begin = 0, end = lineObj.text.length, ltr = true;

	    var order = getOrder(lineObj, cm.doc.direction);
	    // If the line isn't plain left-to-right text, first figure out
	    // which bidi section the coordinates fall into.
	    if (order) {
	      var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
	                   (cm, lineObj, lineNo$$1, preparedMeasure, order, x, y);
	      ltr = part.level != 1;
	      // The awkward -1 offsets are needed because findFirst (called
	      // on these below) will treat its first bound as inclusive,
	      // second as exclusive, but we want to actually address the
	      // characters in the part's range
	      begin = ltr ? part.from : part.to - 1;
	      end = ltr ? part.to : part.from - 1;
	    }

	    // A binary search to find the first character whose bounding box
	    // starts after the coordinates. If we run across any whose box wrap
	    // the coordinates, store that.
	    var chAround = null, boxAround = null;
	    var ch = findFirst(function (ch) {
	      var box = measureCharPrepared(cm, preparedMeasure, ch);
	      box.top += widgetHeight$$1; box.bottom += widgetHeight$$1;
	      if (!boxIsAfter(box, x, y, false)) { return false }
	      if (box.top <= y && box.left <= x) {
	        chAround = ch;
	        boxAround = box;
	      }
	      return true
	    }, begin, end);

	    var baseX, sticky, outside = false;
	    // If a box around the coordinates was found, use that
	    if (boxAround) {
	      // Distinguish coordinates nearer to the left or right side of the box
	      var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr;
	      ch = chAround + (atStart ? 0 : 1);
	      sticky = atStart ? "after" : "before";
	      baseX = atLeft ? boxAround.left : boxAround.right;
	    } else {
	      // (Adjust for extended bound, if necessary.)
	      if (!ltr && (ch == end || ch == begin)) { ch++; }
	      // To determine which side to associate with, get the box to the
	      // left of the character and compare it's vertical position to the
	      // coordinates
	      sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
	        (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight$$1 <= y) == ltr ?
	        "after" : "before";
	      // Now get accurate coordinates for this place, in order to get a
	      // base X position
	      var coords = cursorCoords(cm, Pos(lineNo$$1, ch, sticky), "line", lineObj, preparedMeasure);
	      baseX = coords.left;
	      outside = y < coords.top ? -1 : y >= coords.bottom ? 1 : 0;
	    }

	    ch = skipExtendingChars(lineObj.text, ch, 1);
	    return PosWithInfo(lineNo$$1, ch, sticky, outside, x - baseX)
	  }

	  function coordsBidiPart(cm, lineObj, lineNo$$1, preparedMeasure, order, x, y) {
	    // Bidi parts are sorted left-to-right, and in a non-line-wrapping
	    // situation, we can take this ordering to correspond to the visual
	    // ordering. This finds the first part whose end is after the given
	    // coordinates.
	    var index = findFirst(function (i) {
	      var part = order[i], ltr = part.level != 1;
	      return boxIsAfter(cursorCoords(cm, Pos(lineNo$$1, ltr ? part.to : part.from, ltr ? "before" : "after"),
	                                     "line", lineObj, preparedMeasure), x, y, true)
	    }, 0, order.length - 1);
	    var part = order[index];
	    // If this isn't the first part, the part's start is also after
	    // the coordinates, and the coordinates aren't on the same line as
	    // that start, move one part back.
	    if (index > 0) {
	      var ltr = part.level != 1;
	      var start = cursorCoords(cm, Pos(lineNo$$1, ltr ? part.from : part.to, ltr ? "after" : "before"),
	                               "line", lineObj, preparedMeasure);
	      if (boxIsAfter(start, x, y, true) && start.top > y)
	        { part = order[index - 1]; }
	    }
	    return part
	  }

	  function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
	    // In a wrapped line, rtl text on wrapping boundaries can do things
	    // that don't correspond to the ordering in our `order` array at
	    // all, so a binary search doesn't work, and we want to return a
	    // part that only spans one line so that the binary search in
	    // coordsCharInner is safe. As such, we first find the extent of the
	    // wrapped line, and then do a flat search in which we discard any
	    // spans that aren't on the line.
	    var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
	    var begin = ref.begin;
	    var end = ref.end;
	    if (/\s/.test(lineObj.text.charAt(end - 1))) { end--; }
	    var part = null, closestDist = null;
	    for (var i = 0; i < order.length; i++) {
	      var p = order[i];
	      if (p.from >= end || p.to <= begin) { continue }
	      var ltr = p.level != 1;
	      var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
	      // Weigh against spans ending before this, so that they are only
	      // picked if nothing ends after
	      var dist = endX < x ? x - endX + 1e9 : endX - x;
	      if (!part || closestDist > dist) {
	        part = p;
	        closestDist = dist;
	      }
	    }
	    if (!part) { part = order[order.length - 1]; }
	    // Clip the part to the wrapped line.
	    if (part.from < begin) { part = {from: begin, to: part.to, level: part.level}; }
	    if (part.to > end) { part = {from: part.from, to: end, level: part.level}; }
	    return part
	  }

	  var measureText;
	  // Compute the default text height.
	  function textHeight(display) {
	    if (display.cachedTextHeight != null) { return display.cachedTextHeight }
	    if (measureText == null) {
	      measureText = elt("pre", null, "CodeMirror-line-like");
	      // Measure a bunch of lines, for browsers that compute
	      // fractional heights.
	      for (var i = 0; i < 49; ++i) {
	        measureText.appendChild(document.createTextNode("x"));
	        measureText.appendChild(elt("br"));
	      }
	      measureText.appendChild(document.createTextNode("x"));
	    }
	    removeChildrenAndAdd(display.measure, measureText);
	    var height = measureText.offsetHeight / 50;
	    if (height > 3) { display.cachedTextHeight = height; }
	    removeChildren(display.measure);
	    return height || 1
	  }

	  // Compute the default character width.
	  function charWidth(display) {
	    if (display.cachedCharWidth != null) { return display.cachedCharWidth }
	    var anchor = elt("span", "xxxxxxxxxx");
	    var pre = elt("pre", [anchor], "CodeMirror-line-like");
	    removeChildrenAndAdd(display.measure, pre);
	    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
	    if (width > 2) { display.cachedCharWidth = width; }
	    return width || 10
	  }

	  // Do a bulk-read of the DOM positions and sizes needed to draw the
	  // view, so that we don't interleave reading and writing to the DOM.
	  function getDimensions(cm) {
	    var d = cm.display, left = {}, width = {};
	    var gutterLeft = d.gutters.clientLeft;
	    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
	      var id = cm.display.gutterSpecs[i].className;
	      left[id] = n.offsetLeft + n.clientLeft + gutterLeft;
	      width[id] = n.clientWidth;
	    }
	    return {fixedPos: compensateForHScroll(d),
	            gutterTotalWidth: d.gutters.offsetWidth,
	            gutterLeft: left,
	            gutterWidth: width,
	            wrapperWidth: d.wrapper.clientWidth}
	  }

	  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
	  // but using getBoundingClientRect to get a sub-pixel-accurate
	  // result.
	  function compensateForHScroll(display) {
	    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
	  }

	  // Returns a function that estimates the height of a line, to use as
	  // first approximation until the line becomes visible (and is thus
	  // properly measurable).
	  function estimateHeight(cm) {
	    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
	    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
	    return function (line) {
	      if (lineIsHidden(cm.doc, line)) { return 0 }

	      var widgetsHeight = 0;
	      if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
	        if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height; }
	      } }

	      if (wrapping)
	        { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
	      else
	        { return widgetsHeight + th }
	    }
	  }

	  function estimateLineHeights(cm) {
	    var doc = cm.doc, est = estimateHeight(cm);
	    doc.iter(function (line) {
	      var estHeight = est(line);
	      if (estHeight != line.height) { updateLineHeight(line, estHeight); }
	    });
	  }

	  // Given a mouse event, find the corresponding position. If liberal
	  // is false, it checks whether a gutter or scrollbar was clicked,
	  // and returns null if it was. forRect is used by rectangular
	  // selections, and tries to estimate a character position even for
	  // coordinates beyond the right of the text.
	  function posFromMouse(cm, e, liberal, forRect) {
	    var display = cm.display;
	    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

	    var x, y, space = display.lineSpace.getBoundingClientRect();
	    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
	    try { x = e.clientX - space.left; y = e.clientY - space.top; }
	    catch (e) { return null }
	    var coords = coordsChar(cm, x, y), line;
	    if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
	      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
	      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
	    }
	    return coords
	  }

	  // Find the view element corresponding to a given line. Return null
	  // when the line isn't visible.
	  function findViewIndex(cm, n) {
	    if (n >= cm.display.viewTo) { return null }
	    n -= cm.display.viewFrom;
	    if (n < 0) { return null }
	    var view = cm.display.view;
	    for (var i = 0; i < view.length; i++) {
	      n -= view[i].size;
	      if (n < 0) { return i }
	    }
	  }

	  // Updates the display.view data structure for a given change to the
	  // document. From and to are in pre-change coordinates. Lendiff is
	  // the amount of lines added or subtracted by the change. This is
	  // used for changes that span multiple lines, or change the way
	  // lines are divided into visual lines. regLineChange (below)
	  // registers single-line changes.
	  function regChange(cm, from, to, lendiff) {
	    if (from == null) { from = cm.doc.first; }
	    if (to == null) { to = cm.doc.first + cm.doc.size; }
	    if (!lendiff) { lendiff = 0; }

	    var display = cm.display;
	    if (lendiff && to < display.viewTo &&
	        (display.updateLineNumbers == null || display.updateLineNumbers > from))
	      { display.updateLineNumbers = from; }

	    cm.curOp.viewChanged = true;

	    if (from >= display.viewTo) { // Change after
	      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
	        { resetView(cm); }
	    } else if (to <= display.viewFrom) { // Change before
	      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
	        resetView(cm);
	      } else {
	        display.viewFrom += lendiff;
	        display.viewTo += lendiff;
	      }
	    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
	      resetView(cm);
	    } else if (from <= display.viewFrom) { // Top overlap
	      var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
	      if (cut) {
	        display.view = display.view.slice(cut.index);
	        display.viewFrom = cut.lineN;
	        display.viewTo += lendiff;
	      } else {
	        resetView(cm);
	      }
	    } else if (to >= display.viewTo) { // Bottom overlap
	      var cut$1 = viewCuttingPoint(cm, from, from, -1);
	      if (cut$1) {
	        display.view = display.view.slice(0, cut$1.index);
	        display.viewTo = cut$1.lineN;
	      } else {
	        resetView(cm);
	      }
	    } else { // Gap in the middle
	      var cutTop = viewCuttingPoint(cm, from, from, -1);
	      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
	      if (cutTop && cutBot) {
	        display.view = display.view.slice(0, cutTop.index)
	          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
	          .concat(display.view.slice(cutBot.index));
	        display.viewTo += lendiff;
	      } else {
	        resetView(cm);
	      }
	    }

	    var ext = display.externalMeasured;
	    if (ext) {
	      if (to < ext.lineN)
	        { ext.lineN += lendiff; }
	      else if (from < ext.lineN + ext.size)
	        { display.externalMeasured = null; }
	    }
	  }

	  // Register a change to a single line. Type must be one of "text",
	  // "gutter", "class", "widget"
	  function regLineChange(cm, line, type) {
	    cm.curOp.viewChanged = true;
	    var display = cm.display, ext = cm.display.externalMeasured;
	    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
	      { display.externalMeasured = null; }

	    if (line < display.viewFrom || line >= display.viewTo) { return }
	    var lineView = display.view[findViewIndex(cm, line)];
	    if (lineView.node == null) { return }
	    var arr = lineView.changes || (lineView.changes = []);
	    if (indexOf(arr, type) == -1) { arr.push(type); }
	  }

	  // Clear the view.
	  function resetView(cm) {
	    cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
	    cm.display.view = [];
	    cm.display.viewOffset = 0;
	  }

	  function viewCuttingPoint(cm, oldN, newN, dir) {
	    var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
	    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
	      { return {index: index, lineN: newN} }
	    var n = cm.display.viewFrom;
	    for (var i = 0; i < index; i++)
	      { n += view[i].size; }
	    if (n != oldN) {
	      if (dir > 0) {
	        if (index == view.length - 1) { return null }
	        diff = (n + view[index].size) - oldN;
	        index++;
	      } else {
	        diff = n - oldN;
	      }
	      oldN += diff; newN += diff;
	    }
	    while (visualLineNo(cm.doc, newN) != newN) {
	      if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
	      newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
	      index += dir;
	    }
	    return {index: index, lineN: newN}
	  }

	  // Force the view to cover a given range, adding empty view element
	  // or clipping off existing ones as needed.
	  function adjustView(cm, from, to) {
	    var display = cm.display, view = display.view;
	    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
	      display.view = buildViewArray(cm, from, to);
	      display.viewFrom = from;
	    } else {
	      if (display.viewFrom > from)
	        { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); }
	      else if (display.viewFrom < from)
	        { display.view = display.view.slice(findViewIndex(cm, from)); }
	      display.viewFrom = from;
	      if (display.viewTo < to)
	        { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); }
	      else if (display.viewTo > to)
	        { display.view = display.view.slice(0, findViewIndex(cm, to)); }
	    }
	    display.viewTo = to;
	  }

	  // Count the number of lines in the view whose DOM representation is
	  // out of date (or nonexistent).
	  function countDirtyView(cm) {
	    var view = cm.display.view, dirty = 0;
	    for (var i = 0; i < view.length; i++) {
	      var lineView = view[i];
	      if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty; }
	    }
	    return dirty
	  }

	  function updateSelection(cm) {
	    cm.display.input.showSelection(cm.display.input.prepareSelection());
	  }

	  function prepareSelection(cm, primary) {
	    if ( primary === void 0 ) primary = true;

	    var doc = cm.doc, result = {};
	    var curFragment = result.cursors = document.createDocumentFragment();
	    var selFragment = result.selection = document.createDocumentFragment();

	    for (var i = 0; i < doc.sel.ranges.length; i++) {
	      if (!primary && i == doc.sel.primIndex) { continue }
	      var range$$1 = doc.sel.ranges[i];
	      if (range$$1.from().line >= cm.display.viewTo || range$$1.to().line < cm.display.viewFrom) { continue }
	      var collapsed = range$$1.empty();
	      if (collapsed || cm.options.showCursorWhenSelecting)
	        { drawSelectionCursor(cm, range$$1.head, curFragment); }
	      if (!collapsed)
	        { drawSelectionRange(cm, range$$1, selFragment); }
	    }
	    return result
	  }

	  // Draws a cursor for the given range
	  function drawSelectionCursor(cm, head, output) {
	    var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

	    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
	    cursor.style.left = pos.left + "px";
	    cursor.style.top = pos.top + "px";
	    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

	    if (pos.other) {
	      // Secondary cursor, shown when on a 'jump' in bi-directional text
	      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
	      otherCursor.style.display = "";
	      otherCursor.style.left = pos.other.left + "px";
	      otherCursor.style.top = pos.other.top + "px";
	      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
	    }
	  }

	  function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

	  // Draws the given range as a highlighted selection
	  function drawSelectionRange(cm, range$$1, output) {
	    var display = cm.display, doc = cm.doc;
	    var fragment = document.createDocumentFragment();
	    var padding = paddingH(cm.display), leftSide = padding.left;
	    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
	    var docLTR = doc.direction == "ltr";

	    function add(left, top, width, bottom) {
	      if (top < 0) { top = 0; }
	      top = Math.round(top);
	      bottom = Math.round(bottom);
	      fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")));
	    }

	    function drawForLine(line, fromArg, toArg) {
	      var lineObj = getLine(doc, line);
	      var lineLen = lineObj.text.length;
	      var start, end;
	      function coords(ch, bias) {
	        return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
	      }

	      function wrapX(pos, dir, side) {
	        var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
	        var prop = (dir == "ltr") == (side == "after") ? "left" : "right";
	        var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
	        return coords(ch, prop)[prop]
	      }

	      var order = getOrder(lineObj, doc.direction);
	      iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
	        var ltr = dir == "ltr";
	        var fromPos = coords(from, ltr ? "left" : "right");
	        var toPos = coords(to - 1, ltr ? "right" : "left");

	        var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen;
	        var first = i == 0, last = !order || i == order.length - 1;
	        if (toPos.top - fromPos.top <= 3) { // Single line
	          var openLeft = (docLTR ? openStart : openEnd) && first;
	          var openRight = (docLTR ? openEnd : openStart) && last;
	          var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
	          var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
	          add(left, fromPos.top, right - left, fromPos.bottom);
	        } else { // Multiple lines
	          var topLeft, topRight, botLeft, botRight;
	          if (ltr) {
	            topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
	            topRight = docLTR ? rightSide : wrapX(from, dir, "before");
	            botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
	            botRight = docLTR && openEnd && last ? rightSide : toPos.right;
	          } else {
	            topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
	            topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
	            botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
	            botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
	          }
	          add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
	          if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top); }
	          add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
	        }

	        if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos; }
	        if (cmpCoords(toPos, start) < 0) { start = toPos; }
	        if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos; }
	        if (cmpCoords(toPos, end) < 0) { end = toPos; }
	      });
	      return {start: start, end: end}
	    }

	    var sFrom = range$$1.from(), sTo = range$$1.to();
	    if (sFrom.line == sTo.line) {
	      drawForLine(sFrom.line, sFrom.ch, sTo.ch);
	    } else {
	      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
	      var singleVLine = visualLine(fromLine) == visualLine(toLine);
	      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
	      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
	      if (singleVLine) {
	        if (leftEnd.top < rightStart.top - 2) {
	          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
	          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
	        } else {
	          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
	        }
	      }
	      if (leftEnd.bottom < rightStart.top)
	        { add(leftSide, leftEnd.bottom, null, rightStart.top); }
	    }

	    output.appendChild(fragment);
	  }

	  // Cursor-blinking
	  function restartBlink(cm) {
	    if (!cm.state.focused) { return }
	    var display = cm.display;
	    clearInterval(display.blinker);
	    var on = true;
	    display.cursorDiv.style.visibility = "";
	    if (cm.options.cursorBlinkRate > 0)
	      { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
	        cm.options.cursorBlinkRate); }
	    else if (cm.options.cursorBlinkRate < 0)
	      { display.cursorDiv.style.visibility = "hidden"; }
	  }

	  function ensureFocus(cm) {
	    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
	  }

	  function delayBlurEvent(cm) {
	    cm.state.delayingBlurEvent = true;
	    setTimeout(function () { if (cm.state.delayingBlurEvent) {
	      cm.state.delayingBlurEvent = false;
	      onBlur(cm);
	    } }, 100);
	  }

	  function onFocus(cm, e) {
	    if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false; }

	    if (cm.options.readOnly == "nocursor") { return }
	    if (!cm.state.focused) {
	      signal(cm, "focus", cm, e);
	      cm.state.focused = true;
	      addClass(cm.display.wrapper, "CodeMirror-focused");
	      // This test prevents this from firing when a context
	      // menu is closed (since the input reset would kill the
	      // select-all detection hack)
	      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
	        cm.display.input.reset();
	        if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20); } // Issue #1730
	      }
	      cm.display.input.receivedFocus();
	    }
	    restartBlink(cm);
	  }
	  function onBlur(cm, e) {
	    if (cm.state.delayingBlurEvent) { return }

	    if (cm.state.focused) {
	      signal(cm, "blur", cm, e);
	      cm.state.focused = false;
	      rmClass(cm.display.wrapper, "CodeMirror-focused");
	    }
	    clearInterval(cm.display.blinker);
	    setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false; } }, 150);
	  }

	  // Read the actual heights of the rendered lines, and update their
	  // stored heights to match.
	  function updateHeightsInViewport(cm) {
	    var display = cm.display;
	    var prevBottom = display.lineDiv.offsetTop;
	    for (var i = 0; i < display.view.length; i++) {
	      var cur = display.view[i], wrapping = cm.options.lineWrapping;
	      var height = (void 0), width = 0;
	      if (cur.hidden) { continue }
	      if (ie && ie_version < 8) {
	        var bot = cur.node.offsetTop + cur.node.offsetHeight;
	        height = bot - prevBottom;
	        prevBottom = bot;
	      } else {
	        var box = cur.node.getBoundingClientRect();
	        height = box.bottom - box.top;
	        // Check that lines don't extend past the right of the current
	        // editor width
	        if (!wrapping && cur.text.firstChild)
	          { width = cur.text.firstChild.getBoundingClientRect().right - box.left - 1; }
	      }
	      var diff = cur.line.height - height;
	      if (diff > .005 || diff < -.005) {
	        updateLineHeight(cur.line, height);
	        updateWidgetHeight(cur.line);
	        if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
	          { updateWidgetHeight(cur.rest[j]); } }
	      }
	      if (width > cm.display.sizerWidth) {
	        var chWidth = Math.ceil(width / charWidth(cm.display));
	        if (chWidth > cm.display.maxLineLength) {
	          cm.display.maxLineLength = chWidth;
	          cm.display.maxLine = cur.line;
	          cm.display.maxLineChanged = true;
	        }
	      }
	    }
	  }

	  // Read and store the height of line widgets associated with the
	  // given line.
	  function updateWidgetHeight(line) {
	    if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
	      var w = line.widgets[i], parent = w.node.parentNode;
	      if (parent) { w.height = parent.offsetHeight; }
	    } }
	  }

	  // Compute the lines that are visible in a given viewport (defaults
	  // the the current scroll position). viewport may contain top,
	  // height, and ensure (see op.scrollToPos) properties.
	  function visibleLines(display, doc, viewport) {
	    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
	    top = Math.floor(top - paddingTop(display));
	    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

	    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
	    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
	    // forces those lines into the viewport (if possible).
	    if (viewport && viewport.ensure) {
	      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
	      if (ensureFrom < from) {
	        from = ensureFrom;
	        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
	      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
	        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
	        to = ensureTo;
	      }
	    }
	    return {from: from, to: Math.max(to, from + 1)}
	  }

	  // SCROLLING THINGS INTO VIEW

	  // If an editor sits on the top or bottom of the window, partially
	  // scrolled out of view, this ensures that the cursor is visible.
	  function maybeScrollWindow(cm, rect) {
	    if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

	    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
	    if (rect.top + box.top < 0) { doScroll = true; }
	    else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false; }
	    if (doScroll != null && !phantom) {
	      var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"));
	      cm.display.lineSpace.appendChild(scrollNode);
	      scrollNode.scrollIntoView(doScroll);
	      cm.display.lineSpace.removeChild(scrollNode);
	    }
	  }

	  // Scroll a given position into view (immediately), verifying that
	  // it actually became visible (as line heights are accurately
	  // measured, the position of something may 'drift' during drawing).
	  function scrollPosIntoView(cm, pos, end, margin) {
	    if (margin == null) { margin = 0; }
	    var rect;
	    if (!cm.options.lineWrapping && pos == end) {
	      // Set pos and end to the cursor positions around the character pos sticks to
	      // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
	      // If pos == Pos(_, 0, "before"), pos and end are unchanged
	      pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
	      end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
	    }
	    for (var limit = 0; limit < 5; limit++) {
	      var changed = false;
	      var coords = cursorCoords(cm, pos);
	      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
	      rect = {left: Math.min(coords.left, endCoords.left),
	              top: Math.min(coords.top, endCoords.top) - margin,
	              right: Math.max(coords.left, endCoords.left),
	              bottom: Math.max(coords.bottom, endCoords.bottom) + margin};
	      var scrollPos = calculateScrollPos(cm, rect);
	      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
	      if (scrollPos.scrollTop != null) {
	        updateScrollTop(cm, scrollPos.scrollTop);
	        if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true; }
	      }
	      if (scrollPos.scrollLeft != null) {
	        setScrollLeft(cm, scrollPos.scrollLeft);
	        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true; }
	      }
	      if (!changed) { break }
	    }
	    return rect
	  }

	  // Scroll a given set of coordinates into view (immediately).
	  function scrollIntoView(cm, rect) {
	    var scrollPos = calculateScrollPos(cm, rect);
	    if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop); }
	    if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft); }
	  }

	  // Calculate a new scroll position needed to scroll the given
	  // rectangle into view. Returns an object with scrollTop and
	  // scrollLeft properties. When these are undefined, the
	  // vertical/horizontal position does not need to be adjusted.
	  function calculateScrollPos(cm, rect) {
	    var display = cm.display, snapMargin = textHeight(cm.display);
	    if (rect.top < 0) { rect.top = 0; }
	    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
	    var screen = displayHeight(cm), result = {};
	    if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen; }
	    var docBottom = cm.doc.height + paddingVert(display);
	    var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin;
	    if (rect.top < screentop) {
	      result.scrollTop = atTop ? 0 : rect.top;
	    } else if (rect.bottom > screentop + screen) {
	      var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
	      if (newTop != screentop) { result.scrollTop = newTop; }
	    }

	    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
	    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
	    var tooWide = rect.right - rect.left > screenw;
	    if (tooWide) { rect.right = rect.left + screenw; }
	    if (rect.left < 10)
	      { result.scrollLeft = 0; }
	    else if (rect.left < screenleft)
	      { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)); }
	    else if (rect.right > screenw + screenleft - 3)
	      { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw; }
	    return result
	  }

	  // Store a relative adjustment to the scroll position in the current
	  // operation (to be applied when the operation finishes).
	  function addToScrollTop(cm, top) {
	    if (top == null) { return }
	    resolveScrollToPos(cm);
	    cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
	  }

	  // Make sure that at the end of the operation the current cursor is
	  // shown.
	  function ensureCursorVisible(cm) {
	    resolveScrollToPos(cm);
	    var cur = cm.getCursor();
	    cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin};
	  }

	  function scrollToCoords(cm, x, y) {
	    if (x != null || y != null) { resolveScrollToPos(cm); }
	    if (x != null) { cm.curOp.scrollLeft = x; }
	    if (y != null) { cm.curOp.scrollTop = y; }
	  }

	  function scrollToRange(cm, range$$1) {
	    resolveScrollToPos(cm);
	    cm.curOp.scrollToPos = range$$1;
	  }

	  // When an operation has its scrollToPos property set, and another
	  // scroll action is applied before the end of the operation, this
	  // 'simulates' scrolling that position into view in a cheap way, so
	  // that the effect of intermediate scroll commands is not ignored.
	  function resolveScrollToPos(cm) {
	    var range$$1 = cm.curOp.scrollToPos;
	    if (range$$1) {
	      cm.curOp.scrollToPos = null;
	      var from = estimateCoords(cm, range$$1.from), to = estimateCoords(cm, range$$1.to);
	      scrollToCoordsRange(cm, from, to, range$$1.margin);
	    }
	  }

	  function scrollToCoordsRange(cm, from, to, margin) {
	    var sPos = calculateScrollPos(cm, {
	      left: Math.min(from.left, to.left),
	      top: Math.min(from.top, to.top) - margin,
	      right: Math.max(from.right, to.right),
	      bottom: Math.max(from.bottom, to.bottom) + margin
	    });
	    scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
	  }

	  // Sync the scrollable area and scrollbars, ensure the viewport
	  // covers the visible area.
	  function updateScrollTop(cm, val) {
	    if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
	    if (!gecko) { updateDisplaySimple(cm, {top: val}); }
	    setScrollTop(cm, val, true);
	    if (gecko) { updateDisplaySimple(cm); }
	    startWorker(cm, 100);
	  }

	  function setScrollTop(cm, val, forceScroll) {
	    val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val);
	    if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
	    cm.doc.scrollTop = val;
	    cm.display.scrollbars.setScrollTop(val);
	    if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val; }
	  }

	  // Sync scroller and scrollbar, ensure the gutter elements are
	  // aligned.
	  function setScrollLeft(cm, val, isScroller, forceScroll) {
	    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
	    if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
	    cm.doc.scrollLeft = val;
	    alignHorizontally(cm);
	    if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val; }
	    cm.display.scrollbars.setScrollLeft(val);
	  }

	  // SCROLLBARS

	  // Prepare DOM reads needed to update the scrollbars. Done in one
	  // shot to minimize update/measure roundtrips.
	  function measureForScrollbars(cm) {
	    var d = cm.display, gutterW = d.gutters.offsetWidth;
	    var docH = Math.round(cm.doc.height + paddingVert(cm.display));
	    return {
	      clientHeight: d.scroller.clientHeight,
	      viewHeight: d.wrapper.clientHeight,
	      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
	      viewWidth: d.wrapper.clientWidth,
	      barLeft: cm.options.fixedGutter ? gutterW : 0,
	      docHeight: docH,
	      scrollHeight: docH + scrollGap(cm) + d.barHeight,
	      nativeBarWidth: d.nativeBarWidth,
	      gutterWidth: gutterW
	    }
	  }

	  var NativeScrollbars = function(place, scroll, cm) {
	    this.cm = cm;
	    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
	    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
	    vert.tabIndex = horiz.tabIndex = -1;
	    place(vert); place(horiz);

	    on(vert, "scroll", function () {
	      if (vert.clientHeight) { scroll(vert.scrollTop, "vertical"); }
	    });
	    on(horiz, "scroll", function () {
	      if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal"); }
	    });

	    this.checkedZeroWidth = false;
	    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
	    if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px"; }
	  };

	  NativeScrollbars.prototype.update = function (measure) {
	    var needsH = measure.scrollWidth > measure.clientWidth + 1;
	    var needsV = measure.scrollHeight > measure.clientHeight + 1;
	    var sWidth = measure.nativeBarWidth;

	    if (needsV) {
	      this.vert.style.display = "block";
	      this.vert.style.bottom = needsH ? sWidth + "px" : "0";
	      var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
	      // A bug in IE8 can cause this value to be negative, so guard it.
	      this.vert.firstChild.style.height =
	        Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
	    } else {
	      this.vert.style.display = "";
	      this.vert.firstChild.style.height = "0";
	    }

	    if (needsH) {
	      this.horiz.style.display = "block";
	      this.horiz.style.right = needsV ? sWidth + "px" : "0";
	      this.horiz.style.left = measure.barLeft + "px";
	      var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
	      this.horiz.firstChild.style.width =
	        Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
	    } else {
	      this.horiz.style.display = "";
	      this.horiz.firstChild.style.width = "0";
	    }

	    if (!this.checkedZeroWidth && measure.clientHeight > 0) {
	      if (sWidth == 0) { this.zeroWidthHack(); }
	      this.checkedZeroWidth = true;
	    }

	    return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
	  };

	  NativeScrollbars.prototype.setScrollLeft = function (pos) {
	    if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos; }
	    if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz"); }
	  };

	  NativeScrollbars.prototype.setScrollTop = function (pos) {
	    if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos; }
	    if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert"); }
	  };

	  NativeScrollbars.prototype.zeroWidthHack = function () {
	    var w = mac && !mac_geMountainLion ? "12px" : "18px";
	    this.horiz.style.height = this.vert.style.width = w;
	    this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
	    this.disableHoriz = new Delayed;
	    this.disableVert = new Delayed;
	  };

	  NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
	    bar.style.pointerEvents = "auto";
	    function maybeDisable() {
	      // To find out whether the scrollbar is still visible, we
	      // check whether the element under the pixel in the bottom
	      // right corner of the scrollbar box is the scrollbar box
	      // itself (when the bar is still visible) or its filler child
	      // (when the bar is hidden). If it is still visible, we keep
	      // it enabled, if it's hidden, we disable pointer events.
	      var box = bar.getBoundingClientRect();
	      var elt$$1 = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
	          : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
	      if (elt$$1 != bar) { bar.style.pointerEvents = "none"; }
	      else { delay.set(1000, maybeDisable); }
	    }
	    delay.set(1000, maybeDisable);
	  };

	  NativeScrollbars.prototype.clear = function () {
	    var parent = this.horiz.parentNode;
	    parent.removeChild(this.horiz);
	    parent.removeChild(this.vert);
	  };

	  var NullScrollbars = function () {};

	  NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
	  NullScrollbars.prototype.setScrollLeft = function () {};
	  NullScrollbars.prototype.setScrollTop = function () {};
	  NullScrollbars.prototype.clear = function () {};

	  function updateScrollbars(cm, measure) {
	    if (!measure) { measure = measureForScrollbars(cm); }
	    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
	    updateScrollbarsInner(cm, measure);
	    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
	      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
	        { updateHeightsInViewport(cm); }
	      updateScrollbarsInner(cm, measureForScrollbars(cm));
	      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
	    }
	  }

	  // Re-synchronize the fake scrollbars with the actual size of the
	  // content.
	  function updateScrollbarsInner(cm, measure) {
	    var d = cm.display;
	    var sizes = d.scrollbars.update(measure);

	    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
	    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
	    d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

	    if (sizes.right && sizes.bottom) {
	      d.scrollbarFiller.style.display = "block";
	      d.scrollbarFiller.style.height = sizes.bottom + "px";
	      d.scrollbarFiller.style.width = sizes.right + "px";
	    } else { d.scrollbarFiller.style.display = ""; }
	    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
	      d.gutterFiller.style.display = "block";
	      d.gutterFiller.style.height = sizes.bottom + "px";
	      d.gutterFiller.style.width = measure.gutterWidth + "px";
	    } else { d.gutterFiller.style.display = ""; }
	  }

	  var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

	  function initScrollbars(cm) {
	    if (cm.display.scrollbars) {
	      cm.display.scrollbars.clear();
	      if (cm.display.scrollbars.addClass)
	        { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
	    }

	    cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
	      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
	      // Prevent clicks in the scrollbars from killing focus
	      on(node, "mousedown", function () {
	        if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0); }
	      });
	      node.setAttribute("cm-not-content", "true");
	    }, function (pos, axis) {
	      if (axis == "horizontal") { setScrollLeft(cm, pos); }
	      else { updateScrollTop(cm, pos); }
	    }, cm);
	    if (cm.display.scrollbars.addClass)
	      { addClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
	  }

	  // Operations are used to wrap a series of changes to the editor
	  // state in such a way that each change won't have to update the
	  // cursor and display (which would be awkward, slow, and
	  // error-prone). Instead, display updates are batched and then all
	  // combined and executed at once.

	  var nextOpId = 0;
	  // Start a new operation.
	  function startOperation(cm) {
	    cm.curOp = {
	      cm: cm,
	      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
	      startHeight: cm.doc.height, // Used to detect need to update scrollbar
	      forceUpdate: false,      // Used to force a redraw
	      updateInput: 0,       // Whether to reset the input textarea
	      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
	      changeObjs: null,        // Accumulated changes, for firing change events
	      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
	      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
	      selectionChanged: false, // Whether the selection needs to be redrawn
	      updateMaxLine: false,    // Set when the widest line needs to be determined anew
	      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
	      scrollToPos: null,       // Used to scroll to a specific position
	      focus: false,
	      id: ++nextOpId           // Unique ID
	    };
	    pushOperation(cm.curOp);
	  }

	  // Finish an operation, updating the display and signalling delayed events
	  function endOperation(cm) {
	    var op = cm.curOp;
	    if (op) { finishOperation(op, function (group) {
	      for (var i = 0; i < group.ops.length; i++)
	        { group.ops[i].cm.curOp = null; }
	      endOperations(group);
	    }); }
	  }

	  // The DOM updates done when an operation finishes are batched so
	  // that the minimum number of relayouts are required.
	  function endOperations(group) {
	    var ops = group.ops;
	    for (var i = 0; i < ops.length; i++) // Read DOM
	      { endOperation_R1(ops[i]); }
	    for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
	      { endOperation_W1(ops[i$1]); }
	    for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
	      { endOperation_R2(ops[i$2]); }
	    for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
	      { endOperation_W2(ops[i$3]); }
	    for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
	      { endOperation_finish(ops[i$4]); }
	  }

	  function endOperation_R1(op) {
	    var cm = op.cm, display = cm.display;
	    maybeClipScrollbars(cm);
	    if (op.updateMaxLine) { findMaxLine(cm); }

	    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
	      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
	                         op.scrollToPos.to.line >= display.viewTo) ||
	      display.maxLineChanged && cm.options.lineWrapping;
	    op.update = op.mustUpdate &&
	      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
	  }

	  function endOperation_W1(op) {
	    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
	  }

	  function endOperation_R2(op) {
	    var cm = op.cm, display = cm.display;
	    if (op.updatedDisplay) { updateHeightsInViewport(cm); }

	    op.barMeasure = measureForScrollbars(cm);

	    // If the max line changed since it was last measured, measure it,
	    // and ensure the document's width matches it.
	    // updateDisplay_W2 will use these properties to do the actual resizing
	    if (display.maxLineChanged && !cm.options.lineWrapping) {
	      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
	      cm.display.sizerWidth = op.adjustWidthTo;
	      op.barMeasure.scrollWidth =
	        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
	      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
	    }

	    if (op.updatedDisplay || op.selectionChanged)
	      { op.preparedSelection = display.input.prepareSelection(); }
	  }

	  function endOperation_W2(op) {
	    var cm = op.cm;

	    if (op.adjustWidthTo != null) {
	      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
	      if (op.maxScrollLeft < cm.doc.scrollLeft)
	        { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true); }
	      cm.display.maxLineChanged = false;
	    }

	    var takeFocus = op.focus && op.focus == activeElt();
	    if (op.preparedSelection)
	      { cm.display.input.showSelection(op.preparedSelection, takeFocus); }
	    if (op.updatedDisplay || op.startHeight != cm.doc.height)
	      { updateScrollbars(cm, op.barMeasure); }
	    if (op.updatedDisplay)
	      { setDocumentHeight(cm, op.barMeasure); }

	    if (op.selectionChanged) { restartBlink(cm); }

	    if (cm.state.focused && op.updateInput)
	      { cm.display.input.reset(op.typing); }
	    if (takeFocus) { ensureFocus(op.cm); }
	  }

	  function endOperation_finish(op) {
	    var cm = op.cm, display = cm.display, doc = cm.doc;

	    if (op.updatedDisplay) { postUpdateDisplay(cm, op.update); }

	    // Abort mouse wheel delta measurement, when scrolling explicitly
	    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
	      { display.wheelStartX = display.wheelStartY = null; }

	    // Propagate the scroll position to the actual DOM scroller
	    if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll); }

	    if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true); }
	    // If we need to scroll a specific position into view, do so.
	    if (op.scrollToPos) {
	      var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
	                                   clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
	      maybeScrollWindow(cm, rect);
	    }

	    // Fire events for markers that are hidden/unidden by editing or
	    // undoing
	    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
	    if (hidden) { for (var i = 0; i < hidden.length; ++i)
	      { if (!hidden[i].lines.length) { signal(hidden[i], "hide"); } } }
	    if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
	      { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide"); } } }

	    if (display.wrapper.offsetHeight)
	      { doc.scrollTop = cm.display.scroller.scrollTop; }

	    // Fire change events, and delayed event handlers
	    if (op.changeObjs)
	      { signal(cm, "changes", cm, op.changeObjs); }
	    if (op.update)
	      { op.update.finish(); }
	  }

	  // Run the given function in an operation
	  function runInOp(cm, f) {
	    if (cm.curOp) { return f() }
	    startOperation(cm);
	    try { return f() }
	    finally { endOperation(cm); }
	  }
	  // Wraps a function in an operation. Returns the wrapped function.
	  function operation(cm, f) {
	    return function() {
	      if (cm.curOp) { return f.apply(cm, arguments) }
	      startOperation(cm);
	      try { return f.apply(cm, arguments) }
	      finally { endOperation(cm); }
	    }
	  }
	  // Used to add methods to editor and doc instances, wrapping them in
	  // operations.
	  function methodOp(f) {
	    return function() {
	      if (this.curOp) { return f.apply(this, arguments) }
	      startOperation(this);
	      try { return f.apply(this, arguments) }
	      finally { endOperation(this); }
	    }
	  }
	  function docMethodOp(f) {
	    return function() {
	      var cm = this.cm;
	      if (!cm || cm.curOp) { return f.apply(this, arguments) }
	      startOperation(cm);
	      try { return f.apply(this, arguments) }
	      finally { endOperation(cm); }
	    }
	  }

	  // HIGHLIGHT WORKER

	  function startWorker(cm, time) {
	    if (cm.doc.highlightFrontier < cm.display.viewTo)
	      { cm.state.highlight.set(time, bind(highlightWorker, cm)); }
	  }

	  function highlightWorker(cm) {
	    var doc = cm.doc;
	    if (doc.highlightFrontier >= cm.display.viewTo) { return }
	    var end = +new Date + cm.options.workTime;
	    var context = getContextBefore(cm, doc.highlightFrontier);
	    var changedLines = [];

	    doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
	      if (context.line >= cm.display.viewFrom) { // Visible
	        var oldStyles = line.styles;
	        var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
	        var highlighted = highlightLine(cm, line, context, true);
	        if (resetState) { context.state = resetState; }
	        line.styles = highlighted.styles;
	        var oldCls = line.styleClasses, newCls = highlighted.classes;
	        if (newCls) { line.styleClasses = newCls; }
	        else if (oldCls) { line.styleClasses = null; }
	        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
	          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
	        for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i]; }
	        if (ischange) { changedLines.push(context.line); }
	        line.stateAfter = context.save();
	        context.nextLine();
	      } else {
	        if (line.text.length <= cm.options.maxHighlightLength)
	          { processLine(cm, line.text, context); }
	        line.stateAfter = context.line % 5 == 0 ? context.save() : null;
	        context.nextLine();
	      }
	      if (+new Date > end) {
	        startWorker(cm, cm.options.workDelay);
	        return true
	      }
	    });
	    doc.highlightFrontier = context.line;
	    doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
	    if (changedLines.length) { runInOp(cm, function () {
	      for (var i = 0; i < changedLines.length; i++)
	        { regLineChange(cm, changedLines[i], "text"); }
	    }); }
	  }

	  // DISPLAY DRAWING

	  var DisplayUpdate = function(cm, viewport, force) {
	    var display = cm.display;

	    this.viewport = viewport;
	    // Store some values that we'll need later (but don't want to force a relayout for)
	    this.visible = visibleLines(display, cm.doc, viewport);
	    this.editorIsHidden = !display.wrapper.offsetWidth;
	    this.wrapperHeight = display.wrapper.clientHeight;
	    this.wrapperWidth = display.wrapper.clientWidth;
	    this.oldDisplayWidth = displayWidth(cm);
	    this.force = force;
	    this.dims = getDimensions(cm);
	    this.events = [];
	  };

	  DisplayUpdate.prototype.signal = function (emitter, type) {
	    if (hasHandler(emitter, type))
	      { this.events.push(arguments); }
	  };
	  DisplayUpdate.prototype.finish = function () {
	      var this$1 = this;

	    for (var i = 0; i < this.events.length; i++)
	      { signal.apply(null, this$1.events[i]); }
	  };

	  function maybeClipScrollbars(cm) {
	    var display = cm.display;
	    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
	      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
	      display.heightForcer.style.height = scrollGap(cm) + "px";
	      display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
	      display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
	      display.scrollbarsClipped = true;
	    }
	  }

	  function selectionSnapshot(cm) {
	    if (cm.hasFocus()) { return null }
	    var active = activeElt();
	    if (!active || !contains(cm.display.lineDiv, active)) { return null }
	    var result = {activeElt: active};
	    if (window.getSelection) {
	      var sel = window.getSelection();
	      if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
	        result.anchorNode = sel.anchorNode;
	        result.anchorOffset = sel.anchorOffset;
	        result.focusNode = sel.focusNode;
	        result.focusOffset = sel.focusOffset;
	      }
	    }
	    return result
	  }

	  function restoreSelection(snapshot) {
	    if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
	    snapshot.activeElt.focus();
	    if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
	      var sel = window.getSelection(), range$$1 = document.createRange();
	      range$$1.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
	      range$$1.collapse(false);
	      sel.removeAllRanges();
	      sel.addRange(range$$1);
	      sel.extend(snapshot.focusNode, snapshot.focusOffset);
	    }
	  }

	  // Does the actual updating of the line display. Bails out
	  // (returning false) when there is nothing to be done and forced is
	  // false.
	  function updateDisplayIfNeeded(cm, update) {
	    var display = cm.display, doc = cm.doc;

	    if (update.editorIsHidden) {
	      resetView(cm);
	      return false
	    }

	    // Bail out if the visible area is already rendered and nothing changed.
	    if (!update.force &&
	        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
	        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
	        display.renderedView == display.view && countDirtyView(cm) == 0)
	      { return false }

	    if (maybeUpdateLineNumberWidth(cm)) {
	      resetView(cm);
	      update.dims = getDimensions(cm);
	    }

	    // Compute a suitable new viewport (from & to)
	    var end = doc.first + doc.size;
	    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
	    var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
	    if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom); }
	    if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo); }
	    if (sawCollapsedSpans) {
	      from = visualLineNo(cm.doc, from);
	      to = visualLineEndNo(cm.doc, to);
	    }

	    var different = from != display.viewFrom || to != display.viewTo ||
	      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
	    adjustView(cm, from, to);

	    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
	    // Position the mover div to align with the current scroll position
	    cm.display.mover.style.top = display.viewOffset + "px";

	    var toUpdate = countDirtyView(cm);
	    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
	        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
	      { return false }

	    // For big changes, we hide the enclosing element during the
	    // update, since that speeds up the operations on most browsers.
	    var selSnapshot = selectionSnapshot(cm);
	    if (toUpdate > 4) { display.lineDiv.style.display = "none"; }
	    patchDisplay(cm, display.updateLineNumbers, update.dims);
	    if (toUpdate > 4) { display.lineDiv.style.display = ""; }
	    display.renderedView = display.view;
	    // There might have been a widget with a focused element that got
	    // hidden or updated, if so re-focus it.
	    restoreSelection(selSnapshot);

	    // Prevent selection and cursors from interfering with the scroll
	    // width and height.
	    removeChildren(display.cursorDiv);
	    removeChildren(display.selectionDiv);
	    display.gutters.style.height = display.sizer.style.minHeight = 0;

	    if (different) {
	      display.lastWrapHeight = update.wrapperHeight;
	      display.lastWrapWidth = update.wrapperWidth;
	      startWorker(cm, 400);
	    }

	    display.updateLineNumbers = null;

	    return true
	  }

	  function postUpdateDisplay(cm, update) {
	    var viewport = update.viewport;

	    for (var first = true;; first = false) {
	      if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
	        // Clip forced viewport to actual scrollable area.
	        if (viewport && viewport.top != null)
	          { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)}; }
	        // Updated line heights might result in the drawn area not
	        // actually covering the viewport. Keep looping until it does.
	        update.visible = visibleLines(cm.display, cm.doc, viewport);
	        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
	          { break }
	      }
	      if (!updateDisplayIfNeeded(cm, update)) { break }
	      updateHeightsInViewport(cm);
	      var barMeasure = measureForScrollbars(cm);
	      updateSelection(cm);
	      updateScrollbars(cm, barMeasure);
	      setDocumentHeight(cm, barMeasure);
	      update.force = false;
	    }

	    update.signal(cm, "update", cm);
	    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
	      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
	      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
	    }
	  }

	  function updateDisplaySimple(cm, viewport) {
	    var update = new DisplayUpdate(cm, viewport);
	    if (updateDisplayIfNeeded(cm, update)) {
	      updateHeightsInViewport(cm);
	      postUpdateDisplay(cm, update);
	      var barMeasure = measureForScrollbars(cm);
	      updateSelection(cm);
	      updateScrollbars(cm, barMeasure);
	      setDocumentHeight(cm, barMeasure);
	      update.finish();
	    }
	  }

	  // Sync the actual display DOM structure with display.view, removing
	  // nodes for lines that are no longer in view, and creating the ones
	  // that are not there yet, and updating the ones that are out of
	  // date.
	  function patchDisplay(cm, updateNumbersFrom, dims) {
	    var display = cm.display, lineNumbers = cm.options.lineNumbers;
	    var container = display.lineDiv, cur = container.firstChild;

	    function rm(node) {
	      var next = node.nextSibling;
	      // Works around a throw-scroll bug in OS X Webkit
	      if (webkit && mac && cm.display.currentWheelTarget == node)
	        { node.style.display = "none"; }
	      else
	        { node.parentNode.removeChild(node); }
	      return next
	    }

	    var view = display.view, lineN = display.viewFrom;
	    // Loop over the elements in the view, syncing cur (the DOM nodes
	    // in display.lineDiv) with the view as we go.
	    for (var i = 0; i < view.length; i++) {
	      var lineView = view[i];
	      if (lineView.hidden) ; else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
	        var node = buildLineElement(cm, lineView, lineN, dims);
	        container.insertBefore(node, cur);
	      } else { // Already drawn
	        while (cur != lineView.node) { cur = rm(cur); }
	        var updateNumber = lineNumbers && updateNumbersFrom != null &&
	          updateNumbersFrom <= lineN && lineView.lineNumber;
	        if (lineView.changes) {
	          if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false; }
	          updateLineForChanges(cm, lineView, lineN, dims);
	        }
	        if (updateNumber) {
	          removeChildren(lineView.lineNumber);
	          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
	        }
	        cur = lineView.node.nextSibling;
	      }
	      lineN += lineView.size;
	    }
	    while (cur) { cur = rm(cur); }
	  }

	  function updateGutterSpace(display) {
	    var width = display.gutters.offsetWidth;
	    display.sizer.style.marginLeft = width + "px";
	  }

	  function setDocumentHeight(cm, measure) {
	    cm.display.sizer.style.minHeight = measure.docHeight + "px";
	    cm.display.heightForcer.style.top = measure.docHeight + "px";
	    cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px";
	  }

	  // Re-align line numbers and gutter marks to compensate for
	  // horizontal scrolling.
	  function alignHorizontally(cm) {
	    var display = cm.display, view = display.view;
	    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
	    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
	    var gutterW = display.gutters.offsetWidth, left = comp + "px";
	    for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
	      if (cm.options.fixedGutter) {
	        if (view[i].gutter)
	          { view[i].gutter.style.left = left; }
	        if (view[i].gutterBackground)
	          { view[i].gutterBackground.style.left = left; }
	      }
	      var align = view[i].alignable;
	      if (align) { for (var j = 0; j < align.length; j++)
	        { align[j].style.left = left; } }
	    } }
	    if (cm.options.fixedGutter)
	      { display.gutters.style.left = (comp + gutterW) + "px"; }
	  }

	  // Used to ensure that the line number gutter is still the right
	  // size for the current document size. Returns true when an update
	  // is needed.
	  function maybeUpdateLineNumberWidth(cm) {
	    if (!cm.options.lineNumbers) { return false }
	    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
	    if (last.length != display.lineNumChars) {
	      var test = display.measure.appendChild(elt("div", [elt("div", last)],
	                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
	      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
	      display.lineGutter.style.width = "";
	      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
	      display.lineNumWidth = display.lineNumInnerWidth + padding;
	      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
	      display.lineGutter.style.width = display.lineNumWidth + "px";
	      updateGutterSpace(cm.display);
	      return true
	    }
	    return false
	  }

	  function getGutters(gutters, lineNumbers) {
	    var result = [], sawLineNumbers = false;
	    for (var i = 0; i < gutters.length; i++) {
	      var name = gutters[i], style = null;
	      if (typeof name != "string") { style = name.style; name = name.className; }
	      if (name == "CodeMirror-linenumbers") {
	        if (!lineNumbers) { continue }
	        else { sawLineNumbers = true; }
	      }
	      result.push({className: name, style: style});
	    }
	    if (lineNumbers && !sawLineNumbers) { result.push({className: "CodeMirror-linenumbers", style: null}); }
	    return result
	  }

	  // Rebuild the gutter elements, ensure the margin to the left of the
	  // code matches their width.
	  function renderGutters(display) {
	    var gutters = display.gutters, specs = display.gutterSpecs;
	    removeChildren(gutters);
	    display.lineGutter = null;
	    for (var i = 0; i < specs.length; ++i) {
	      var ref = specs[i];
	      var className = ref.className;
	      var style = ref.style;
	      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + className));
	      if (style) { gElt.style.cssText = style; }
	      if (className == "CodeMirror-linenumbers") {
	        display.lineGutter = gElt;
	        gElt.style.width = (display.lineNumWidth || 1) + "px";
	      }
	    }
	    gutters.style.display = specs.length ? "" : "none";
	    updateGutterSpace(display);
	  }

	  function updateGutters(cm) {
	    renderGutters(cm.display);
	    regChange(cm);
	    alignHorizontally(cm);
	  }

	  // The display handles the DOM integration, both for input reading
	  // and content drawing. It holds references to DOM nodes and
	  // display-related state.

	  function Display(place, doc, input, options) {
	    var d = this;
	    this.input = input;

	    // Covers bottom-right square when both scrollbars are present.
	    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
	    d.scrollbarFiller.setAttribute("cm-not-content", "true");
	    // Covers bottom of gutter when coverGutterNextToScrollbar is on
	    // and h scrollbar is present.
	    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
	    d.gutterFiller.setAttribute("cm-not-content", "true");
	    // Will contain the actual code, positioned to cover the viewport.
	    d.lineDiv = eltP("div", null, "CodeMirror-code");
	    // Elements are added to these to represent selection and cursors.
	    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
	    d.cursorDiv = elt("div", null, "CodeMirror-cursors");
	    // A visibility: hidden element used to find the size of things.
	    d.measure = elt("div", null, "CodeMirror-measure");
	    // When lines outside of the viewport are measured, they are drawn in this.
	    d.lineMeasure = elt("div", null, "CodeMirror-measure");
	    // Wraps everything that needs to exist inside the vertically-padded coordinate system
	    d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
	                      null, "position: relative; outline: none");
	    var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
	    // Moved around its parent to cover visible view.
	    d.mover = elt("div", [lines], null, "position: relative");
	    // Set to the height of the document, allowing scrolling.
	    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
	    d.sizerWidth = null;
	    // Behavior of elts with overflow: auto and padding is
	    // inconsistent across browsers. This is used to ensure the
	    // scrollable area is big enough.
	    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
	    // Will contain the gutters, if any.
	    d.gutters = elt("div", null, "CodeMirror-gutters");
	    d.lineGutter = null;
	    // Actual scrollable element.
	    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
	    d.scroller.setAttribute("tabIndex", "-1");
	    // The element in which the editor lives.
	    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

	    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
	    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
	    if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true; }

	    if (place) {
	      if (place.appendChild) { place.appendChild(d.wrapper); }
	      else { place(d.wrapper); }
	    }

	    // Current rendered range (may be bigger than the view window).
	    d.viewFrom = d.viewTo = doc.first;
	    d.reportedViewFrom = d.reportedViewTo = doc.first;
	    // Information about the rendered lines.
	    d.view = [];
	    d.renderedView = null;
	    // Holds info about a single rendered line when it was rendered
	    // for measurement, while not in view.
	    d.externalMeasured = null;
	    // Empty space (in pixels) above the view
	    d.viewOffset = 0;
	    d.lastWrapHeight = d.lastWrapWidth = 0;
	    d.updateLineNumbers = null;

	    d.nativeBarWidth = d.barHeight = d.barWidth = 0;
	    d.scrollbarsClipped = false;

	    // Used to only resize the line number gutter when necessary (when
	    // the amount of lines crosses a boundary that makes its width change)
	    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
	    // Set to true when a non-horizontal-scrolling line widget is
	    // added. As an optimization, line widget aligning is skipped when
	    // this is false.
	    d.alignWidgets = false;

	    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

	    // Tracks the maximum line length so that the horizontal scrollbar
	    // can be kept static when scrolling.
	    d.maxLine = null;
	    d.maxLineLength = 0;
	    d.maxLineChanged = false;

	    // Used for measuring wheel scrolling granularity
	    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

	    // True when shift is held down.
	    d.shift = false;

	    // Used to track whether anything happened since the context menu
	    // was opened.
	    d.selForContextMenu = null;

	    d.activeTouch = null;

	    d.gutterSpecs = getGutters(options.gutters, options.lineNumbers);
	    renderGutters(d);

	    input.init(d);
	  }

	  // Since the delta values reported on mouse wheel events are
	  // unstandardized between browsers and even browser versions, and
	  // generally horribly unpredictable, this code starts by measuring
	  // the scroll effect that the first few mouse wheel events have,
	  // and, from that, detects the way it can convert deltas to pixel
	  // offsets afterwards.
	  //
	  // The reason we want to know the amount a wheel event will scroll
	  // is that it gives us a chance to update the display before the
	  // actual scrolling happens, reducing flickering.

	  var wheelSamples = 0, wheelPixelsPerUnit = null;
	  // Fill in a browser-detected starting value on browsers where we
	  // know one. These don't have to be accurate -- the result of them
	  // being wrong would just be a slight flicker on the first wheel
	  // scroll (if it is large enough).
	  if (ie) { wheelPixelsPerUnit = -.53; }
	  else if (gecko) { wheelPixelsPerUnit = 15; }
	  else if (chrome) { wheelPixelsPerUnit = -.7; }
	  else if (safari) { wheelPixelsPerUnit = -1/3; }

	  function wheelEventDelta(e) {
	    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
	    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail; }
	    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail; }
	    else if (dy == null) { dy = e.wheelDelta; }
	    return {x: dx, y: dy}
	  }
	  function wheelEventPixels(e) {
	    var delta = wheelEventDelta(e);
	    delta.x *= wheelPixelsPerUnit;
	    delta.y *= wheelPixelsPerUnit;
	    return delta
	  }

	  function onScrollWheel(cm, e) {
	    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

	    var display = cm.display, scroll = display.scroller;
	    // Quit if there's nothing to scroll here
	    var canScrollX = scroll.scrollWidth > scroll.clientWidth;
	    var canScrollY = scroll.scrollHeight > scroll.clientHeight;
	    if (!(dx && canScrollX || dy && canScrollY)) { return }

	    // Webkit browsers on OS X abort momentum scrolls when the target
	    // of the scroll event is removed from the scrollable element.
	    // This hack (see related code in patchDisplay) makes sure the
	    // element is kept around.
	    if (dy && mac && webkit) {
	      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
	        for (var i = 0; i < view.length; i++) {
	          if (view[i].node == cur) {
	            cm.display.currentWheelTarget = cur;
	            break outer
	          }
	        }
	      }
	    }

	    // On some browsers, horizontal scrolling will cause redraws to
	    // happen before the gutter has been realigned, causing it to
	    // wriggle around in a most unseemly way. When we have an
	    // estimated pixels/delta value, we just handle horizontal
	    // scrolling entirely here. It'll be slightly off from native, but
	    // better than glitching out.
	    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
	      if (dy && canScrollY)
	        { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)); }
	      setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
	      // Only prevent default scrolling if vertical scrolling is
	      // actually possible. Otherwise, it causes vertical scroll
	      // jitter on OSX trackpads when deltaX is small and deltaY
	      // is large (issue #3579)
	      if (!dy || (dy && canScrollY))
	        { e_preventDefault(e); }
	      display.wheelStartX = null; // Abort measurement, if in progress
	      return
	    }

	    // 'Project' the visible viewport to cover the area that is being
	    // scrolled into view (if we know enough to estimate it).
	    if (dy && wheelPixelsPerUnit != null) {
	      var pixels = dy * wheelPixelsPerUnit;
	      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
	      if (pixels < 0) { top = Math.max(0, top + pixels - 50); }
	      else { bot = Math.min(cm.doc.height, bot + pixels + 50); }
	      updateDisplaySimple(cm, {top: top, bottom: bot});
	    }

	    if (wheelSamples < 20) {
	      if (display.wheelStartX == null) {
	        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
	        display.wheelDX = dx; display.wheelDY = dy;
	        setTimeout(function () {
	          if (display.wheelStartX == null) { return }
	          var movedX = scroll.scrollLeft - display.wheelStartX;
	          var movedY = scroll.scrollTop - display.wheelStartY;
	          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
	            (movedX && display.wheelDX && movedX / display.wheelDX);
	          display.wheelStartX = display.wheelStartY = null;
	          if (!sample) { return }
	          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
	          ++wheelSamples;
	        }, 200);
	      } else {
	        display.wheelDX += dx; display.wheelDY += dy;
	      }
	    }
	  }

	  // Selection objects are immutable. A new one is created every time
	  // the selection changes. A selection is one or more non-overlapping
	  // (and non-touching) ranges, sorted, and an integer that indicates
	  // which one is the primary selection (the one that's scrolled into
	  // view, that getCursor returns, etc).
	  var Selection = function(ranges, primIndex) {
	    this.ranges = ranges;
	    this.primIndex = primIndex;
	  };

	  Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

	  Selection.prototype.equals = function (other) {
	      var this$1 = this;

	    if (other == this) { return true }
	    if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
	    for (var i = 0; i < this.ranges.length; i++) {
	      var here = this$1.ranges[i], there = other.ranges[i];
	      if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
	    }
	    return true
	  };

	  Selection.prototype.deepCopy = function () {
	      var this$1 = this;

	    var out = [];
	    for (var i = 0; i < this.ranges.length; i++)
	      { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)); }
	    return new Selection(out, this.primIndex)
	  };

	  Selection.prototype.somethingSelected = function () {
	      var this$1 = this;

	    for (var i = 0; i < this.ranges.length; i++)
	      { if (!this$1.ranges[i].empty()) { return true } }
	    return false
	  };

	  Selection.prototype.contains = function (pos, end) {
	      var this$1 = this;

	    if (!end) { end = pos; }
	    for (var i = 0; i < this.ranges.length; i++) {
	      var range = this$1.ranges[i];
	      if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
	        { return i }
	    }
	    return -1
	  };

	  var Range = function(anchor, head) {
	    this.anchor = anchor; this.head = head;
	  };

	  Range.prototype.from = function () { return minPos(this.anchor, this.head) };
	  Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
	  Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

	  // Take an unsorted, potentially overlapping set of ranges, and
	  // build a selection out of it. 'Consumes' ranges array (modifying
	  // it).
	  function normalizeSelection(cm, ranges, primIndex) {
	    var mayTouch = cm && cm.options.selectionsMayTouch;
	    var prim = ranges[primIndex];
	    ranges.sort(function (a, b) { return cmp(a.from(), b.from()); });
	    primIndex = indexOf(ranges, prim);
	    for (var i = 1; i < ranges.length; i++) {
	      var cur = ranges[i], prev = ranges[i - 1];
	      var diff = cmp(prev.to(), cur.from());
	      if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
	        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
	        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
	        if (i <= primIndex) { --primIndex; }
	        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
	      }
	    }
	    return new Selection(ranges, primIndex)
	  }

	  function simpleSelection(anchor, head) {
	    return new Selection([new Range(anchor, head || anchor)], 0)
	  }

	  // Compute the position of the end of a change (its 'to' property
	  // refers to the pre-change end).
	  function changeEnd(change) {
	    if (!change.text) { return change.to }
	    return Pos(change.from.line + change.text.length - 1,
	               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
	  }

	  // Adjust a position to refer to the post-change position of the
	  // same text, or the end of the change if the change covers it.
	  function adjustForChange(pos, change) {
	    if (cmp(pos, change.from) < 0) { return pos }
	    if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

	    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
	    if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch; }
	    return Pos(line, ch)
	  }

	  function computeSelAfterChange(doc, change) {
	    var out = [];
	    for (var i = 0; i < doc.sel.ranges.length; i++) {
	      var range = doc.sel.ranges[i];
	      out.push(new Range(adjustForChange(range.anchor, change),
	                         adjustForChange(range.head, change)));
	    }
	    return normalizeSelection(doc.cm, out, doc.sel.primIndex)
	  }

	  function offsetPos(pos, old, nw) {
	    if (pos.line == old.line)
	      { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
	    else
	      { return Pos(nw.line + (pos.line - old.line), pos.ch) }
	  }

	  // Used by replaceSelections to allow moving the selection to the
	  // start or around the replaced test. Hint may be "start" or "around".
	  function computeReplacedSel(doc, changes, hint) {
	    var out = [];
	    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
	    for (var i = 0; i < changes.length; i++) {
	      var change = changes[i];
	      var from = offsetPos(change.from, oldPrev, newPrev);
	      var to = offsetPos(changeEnd(change), oldPrev, newPrev);
	      oldPrev = change.to;
	      newPrev = to;
	      if (hint == "around") {
	        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
	        out[i] = new Range(inv ? to : from, inv ? from : to);
	      } else {
	        out[i] = new Range(from, from);
	      }
	    }
	    return new Selection(out, doc.sel.primIndex)
	  }

	  // Used to get the editor into a consistent state again when options change.

	  function loadMode(cm) {
	    cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
	    resetModeState(cm);
	  }

	  function resetModeState(cm) {
	    cm.doc.iter(function (line) {
	      if (line.stateAfter) { line.stateAfter = null; }
	      if (line.styles) { line.styles = null; }
	    });
	    cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
	    startWorker(cm, 100);
	    cm.state.modeGen++;
	    if (cm.curOp) { regChange(cm); }
	  }

	  // DOCUMENT DATA STRUCTURE

	  // By default, updates that start and end at the beginning of a line
	  // are treated specially, in order to make the association of line
	  // widgets and marker elements with the text behave more intuitive.
	  function isWholeLineUpdate(doc, change) {
	    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
	      (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
	  }

	  // Perform a change on the document data structure.
	  function updateDoc(doc, change, markedSpans, estimateHeight$$1) {
	    function spansFor(n) {return markedSpans ? markedSpans[n] : null}
	    function update(line, text, spans) {
	      updateLine(line, text, spans, estimateHeight$$1);
	      signalLater(line, "change", line, change);
	    }
	    function linesFor(start, end) {
	      var result = [];
	      for (var i = start; i < end; ++i)
	        { result.push(new Line(text[i], spansFor(i), estimateHeight$$1)); }
	      return result
	    }

	    var from = change.from, to = change.to, text = change.text;
	    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
	    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

	    // Adjust the line structure
	    if (change.full) {
	      doc.insert(0, linesFor(0, text.length));
	      doc.remove(text.length, doc.size - text.length);
	    } else if (isWholeLineUpdate(doc, change)) {
	      // This is a whole-line replace. Treated specially to make
	      // sure line objects move the way they are supposed to.
	      var added = linesFor(0, text.length - 1);
	      update(lastLine, lastLine.text, lastSpans);
	      if (nlines) { doc.remove(from.line, nlines); }
	      if (added.length) { doc.insert(from.line, added); }
	    } else if (firstLine == lastLine) {
	      if (text.length == 1) {
	        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
	      } else {
	        var added$1 = linesFor(1, text.length - 1);
	        added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight$$1));
	        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
	        doc.insert(from.line + 1, added$1);
	      }
	    } else if (text.length == 1) {
	      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
	      doc.remove(from.line + 1, nlines);
	    } else {
	      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
	      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
	      var added$2 = linesFor(1, text.length - 1);
	      if (nlines > 1) { doc.remove(from.line + 1, nlines - 1); }
	      doc.insert(from.line + 1, added$2);
	    }

	    signalLater(doc, "change", doc, change);
	  }

	  // Call f for all linked documents.
	  function linkedDocs(doc, f, sharedHistOnly) {
	    function propagate(doc, skip, sharedHist) {
	      if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
	        var rel = doc.linked[i];
	        if (rel.doc == skip) { continue }
	        var shared = sharedHist && rel.sharedHist;
	        if (sharedHistOnly && !shared) { continue }
	        f(rel.doc, shared);
	        propagate(rel.doc, doc, shared);
	      } }
	    }
	    propagate(doc, null, true);
	  }

	  // Attach a document to an editor.
	  function attachDoc(cm, doc) {
	    if (doc.cm) { throw new Error("This document is already in use.") }
	    cm.doc = doc;
	    doc.cm = cm;
	    estimateLineHeights(cm);
	    loadMode(cm);
	    setDirectionClass(cm);
	    if (!cm.options.lineWrapping) { findMaxLine(cm); }
	    cm.options.mode = doc.modeOption;
	    regChange(cm);
	  }

	  function setDirectionClass(cm) {
	  (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
	  }

	  function directionChanged(cm) {
	    runInOp(cm, function () {
	      setDirectionClass(cm);
	      regChange(cm);
	    });
	  }

	  function History(startGen) {
	    // Arrays of change events and selections. Doing something adds an
	    // event to done and clears undo. Undoing moves events from done
	    // to undone, redoing moves them in the other direction.
	    this.done = []; this.undone = [];
	    this.undoDepth = Infinity;
	    // Used to track when changes can be merged into a single undo
	    // event
	    this.lastModTime = this.lastSelTime = 0;
	    this.lastOp = this.lastSelOp = null;
	    this.lastOrigin = this.lastSelOrigin = null;
	    // Used by the isClean() method
	    this.generation = this.maxGeneration = startGen || 1;
	  }

	  // Create a history change event from an updateDoc-style change
	  // object.
	  function historyChangeFromChange(doc, change) {
	    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
	    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
	    linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true);
	    return histChange
	  }

	  // Pop all selection events off the end of a history array. Stop at
	  // a change event.
	  function clearSelectionEvents(array) {
	    while (array.length) {
	      var last = lst(array);
	      if (last.ranges) { array.pop(); }
	      else { break }
	    }
	  }

	  // Find the top change event in the history. Pop off selection
	  // events that are in the way.
	  function lastChangeEvent(hist, force) {
	    if (force) {
	      clearSelectionEvents(hist.done);
	      return lst(hist.done)
	    } else if (hist.done.length && !lst(hist.done).ranges) {
	      return lst(hist.done)
	    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
	      hist.done.pop();
	      return lst(hist.done)
	    }
	  }

	  // Register a change in the history. Merges changes that are within
	  // a single operation, or are close together with an origin that
	  // allows merging (starting with "+") into a single event.
	  function addChangeToHistory(doc, change, selAfter, opId) {
	    var hist = doc.history;
	    hist.undone.length = 0;
	    var time = +new Date, cur;
	    var last;

	    if ((hist.lastOp == opId ||
	         hist.lastOrigin == change.origin && change.origin &&
	         ((change.origin.charAt(0) == "+" && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500)) ||
	          change.origin.charAt(0) == "*")) &&
	        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
	      // Merge this change into the last event
	      last = lst(cur.changes);
	      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
	        // Optimized case for simple insertion -- don't want to add
	        // new changesets for every character typed
	        last.to = changeEnd(change);
	      } else {
	        // Add new sub-event
	        cur.changes.push(historyChangeFromChange(doc, change));
	      }
	    } else {
	      // Can not be merged, start a new event.
	      var before = lst(hist.done);
	      if (!before || !before.ranges)
	        { pushSelectionToHistory(doc.sel, hist.done); }
	      cur = {changes: [historyChangeFromChange(doc, change)],
	             generation: hist.generation};
	      hist.done.push(cur);
	      while (hist.done.length > hist.undoDepth) {
	        hist.done.shift();
	        if (!hist.done[0].ranges) { hist.done.shift(); }
	      }
	    }
	    hist.done.push(selAfter);
	    hist.generation = ++hist.maxGeneration;
	    hist.lastModTime = hist.lastSelTime = time;
	    hist.lastOp = hist.lastSelOp = opId;
	    hist.lastOrigin = hist.lastSelOrigin = change.origin;

	    if (!last) { signal(doc, "historyAdded"); }
	  }

	  function selectionEventCanBeMerged(doc, origin, prev, sel) {
	    var ch = origin.charAt(0);
	    return ch == "*" ||
	      ch == "+" &&
	      prev.ranges.length == sel.ranges.length &&
	      prev.somethingSelected() == sel.somethingSelected() &&
	      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
	  }

	  // Called whenever the selection changes, sets the new selection as
	  // the pending selection in the history, and pushes the old pending
	  // selection into the 'done' array when it was significantly
	  // different (in number of selected ranges, emptiness, or time).
	  function addSelectionToHistory(doc, sel, opId, options) {
	    var hist = doc.history, origin = options && options.origin;

	    // A new event is started when the previous origin does not match
	    // the current, or the origins don't allow matching. Origins
	    // starting with * are always merged, those starting with + are
	    // merged when similar and close together in time.
	    if (opId == hist.lastSelOp ||
	        (origin && hist.lastSelOrigin == origin &&
	         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
	          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
	      { hist.done[hist.done.length - 1] = sel; }
	    else
	      { pushSelectionToHistory(sel, hist.done); }

	    hist.lastSelTime = +new Date;
	    hist.lastSelOrigin = origin;
	    hist.lastSelOp = opId;
	    if (options && options.clearRedo !== false)
	      { clearSelectionEvents(hist.undone); }
	  }

	  function pushSelectionToHistory(sel, dest) {
	    var top = lst(dest);
	    if (!(top && top.ranges && top.equals(sel)))
	      { dest.push(sel); }
	  }

	  // Used to store marked span information in the history.
	  function attachLocalSpans(doc, change, from, to) {
	    var existing = change["spans_" + doc.id], n = 0;
	    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
	      if (line.markedSpans)
	        { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans; }
	      ++n;
	    });
	  }

	  // When un/re-doing restores text containing marked spans, those
	  // that have been explicitly cleared should not be restored.
	  function removeClearedSpans(spans) {
	    if (!spans) { return null }
	    var out;
	    for (var i = 0; i < spans.length; ++i) {
	      if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i); } }
	      else if (out) { out.push(spans[i]); }
	    }
	    return !out ? spans : out.length ? out : null
	  }

	  // Retrieve and filter the old marked spans stored in a change event.
	  function getOldSpans(doc, change) {
	    var found = change["spans_" + doc.id];
	    if (!found) { return null }
	    var nw = [];
	    for (var i = 0; i < change.text.length; ++i)
	      { nw.push(removeClearedSpans(found[i])); }
	    return nw
	  }

	  // Used for un/re-doing changes from the history. Combines the
	  // result of computing the existing spans with the set of spans that
	  // existed in the history (so that deleting around a span and then
	  // undoing brings back the span).
	  function mergeOldSpans(doc, change) {
	    var old = getOldSpans(doc, change);
	    var stretched = stretchSpansOverChange(doc, change);
	    if (!old) { return stretched }
	    if (!stretched) { return old }

	    for (var i = 0; i < old.length; ++i) {
	      var oldCur = old[i], stretchCur = stretched[i];
	      if (oldCur && stretchCur) {
	        spans: for (var j = 0; j < stretchCur.length; ++j) {
	          var span = stretchCur[j];
	          for (var k = 0; k < oldCur.length; ++k)
	            { if (oldCur[k].marker == span.marker) { continue spans } }
	          oldCur.push(span);
	        }
	      } else if (stretchCur) {
	        old[i] = stretchCur;
	      }
	    }
	    return old
	  }

	  // Used both to provide a JSON-safe object in .getHistory, and, when
	  // detaching a document, to split the history in two
	  function copyHistoryArray(events, newGroup, instantiateSel) {
	    var copy = [];
	    for (var i = 0; i < events.length; ++i) {
	      var event = events[i];
	      if (event.ranges) {
	        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
	        continue
	      }
	      var changes = event.changes, newChanges = [];
	      copy.push({changes: newChanges});
	      for (var j = 0; j < changes.length; ++j) {
	        var change = changes[j], m = (void 0);
	        newChanges.push({from: change.from, to: change.to, text: change.text});
	        if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
	          if (indexOf(newGroup, Number(m[1])) > -1) {
	            lst(newChanges)[prop] = change[prop];
	            delete change[prop];
	          }
	        } } }
	      }
	    }
	    return copy
	  }

	  // The 'scroll' parameter given to many of these indicated whether
	  // the new cursor position should be scrolled into view after
	  // modifying the selection.

	  // If shift is held or the extend flag is set, extends a range to
	  // include a given position (and optionally a second position).
	  // Otherwise, simply returns the range between the given positions.
	  // Used for cursor motion and such.
	  function extendRange(range, head, other, extend) {
	    if (extend) {
	      var anchor = range.anchor;
	      if (other) {
	        var posBefore = cmp(head, anchor) < 0;
	        if (posBefore != (cmp(other, anchor) < 0)) {
	          anchor = head;
	          head = other;
	        } else if (posBefore != (cmp(head, other) < 0)) {
	          head = other;
	        }
	      }
	      return new Range(anchor, head)
	    } else {
	      return new Range(other || head, head)
	    }
	  }

	  // Extend the primary selection range, discard the rest.
	  function extendSelection(doc, head, other, options, extend) {
	    if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend); }
	    setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
	  }

	  // Extend all selections (pos is an array of selections with length
	  // equal the number of selections)
	  function extendSelections(doc, heads, options) {
	    var out = [];
	    var extend = doc.cm && (doc.cm.display.shift || doc.extend);
	    for (var i = 0; i < doc.sel.ranges.length; i++)
	      { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend); }
	    var newSel = normalizeSelection(doc.cm, out, doc.sel.primIndex);
	    setSelection(doc, newSel, options);
	  }

	  // Updates a single range in the selection.
	  function replaceOneSelection(doc, i, range, options) {
	    var ranges = doc.sel.ranges.slice(0);
	    ranges[i] = range;
	    setSelection(doc, normalizeSelection(doc.cm, ranges, doc.sel.primIndex), options);
	  }

	  // Reset the selection to a single range.
	  function setSimpleSelection(doc, anchor, head, options) {
	    setSelection(doc, simpleSelection(anchor, head), options);
	  }

	  // Give beforeSelectionChange handlers a change to influence a
	  // selection update.
	  function filterSelectionChange(doc, sel, options) {
	    var obj = {
	      ranges: sel.ranges,
	      update: function(ranges) {
	        var this$1 = this;

	        this.ranges = [];
	        for (var i = 0; i < ranges.length; i++)
	          { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
	                                     clipPos(doc, ranges[i].head)); }
	      },
	      origin: options && options.origin
	    };
	    signal(doc, "beforeSelectionChange", doc, obj);
	    if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj); }
	    if (obj.ranges != sel.ranges) { return normalizeSelection(doc.cm, obj.ranges, obj.ranges.length - 1) }
	    else { return sel }
	  }

	  function setSelectionReplaceHistory(doc, sel, options) {
	    var done = doc.history.done, last = lst(done);
	    if (last && last.ranges) {
	      done[done.length - 1] = sel;
	      setSelectionNoUndo(doc, sel, options);
	    } else {
	      setSelection(doc, sel, options);
	    }
	  }

	  // Set a new selection.
	  function setSelection(doc, sel, options) {
	    setSelectionNoUndo(doc, sel, options);
	    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
	  }

	  function setSelectionNoUndo(doc, sel, options) {
	    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
	      { sel = filterSelectionChange(doc, sel, options); }

	    var bias = options && options.bias ||
	      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
	    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

	    if (!(options && options.scroll === false) && doc.cm)
	      { ensureCursorVisible(doc.cm); }
	  }

	  function setSelectionInner(doc, sel) {
	    if (sel.equals(doc.sel)) { return }

	    doc.sel = sel;

	    if (doc.cm) {
	      doc.cm.curOp.updateInput = 1;
	      doc.cm.curOp.selectionChanged = true;
	      signalCursorActivity(doc.cm);
	    }
	    signalLater(doc, "cursorActivity", doc);
	  }

	  // Verify that the selection does not partially select any atomic
	  // marked ranges.
	  function reCheckSelection(doc) {
	    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
	  }

	  // Return a selection that does not partially select any atomic
	  // ranges.
	  function skipAtomicInSelection(doc, sel, bias, mayClear) {
	    var out;
	    for (var i = 0; i < sel.ranges.length; i++) {
	      var range = sel.ranges[i];
	      var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
	      var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
	      var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
	      if (out || newAnchor != range.anchor || newHead != range.head) {
	        if (!out) { out = sel.ranges.slice(0, i); }
	        out[i] = new Range(newAnchor, newHead);
	      }
	    }
	    return out ? normalizeSelection(doc.cm, out, sel.primIndex) : sel
	  }

	  function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
	    var line = getLine(doc, pos.line);
	    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
	      var sp = line.markedSpans[i], m = sp.marker;

	      // Determine if we should prevent the cursor being placed to the left/right of an atomic marker
	      // Historically this was determined using the inclusiveLeft/Right option, but the new way to control it
	      // is with selectLeft/Right
	      var preventCursorLeft = ("selectLeft" in m) ? !m.selectLeft : m.inclusiveLeft;
	      var preventCursorRight = ("selectRight" in m) ? !m.selectRight : m.inclusiveRight;

	      if ((sp.from == null || (preventCursorLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
	          (sp.to == null || (preventCursorRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
	        if (mayClear) {
	          signal(m, "beforeCursorEnter");
	          if (m.explicitlyCleared) {
	            if (!line.markedSpans) { break }
	            else {--i; continue}
	          }
	        }
	        if (!m.atomic) { continue }

	        if (oldPos) {
	          var near = m.find(dir < 0 ? 1 : -1), diff = (void 0);
	          if (dir < 0 ? preventCursorRight : preventCursorLeft)
	            { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null); }
	          if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
	            { return skipAtomicInner(doc, near, pos, dir, mayClear) }
	        }

	        var far = m.find(dir < 0 ? -1 : 1);
	        if (dir < 0 ? preventCursorLeft : preventCursorRight)
	          { far = movePos(doc, far, dir, far.line == pos.line ? line : null); }
	        return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
	      }
	    } }
	    return pos
	  }

	  // Ensure a given position is not inside an atomic range.
	  function skipAtomic(doc, pos, oldPos, bias, mayClear) {
	    var dir = bias || 1;
	    var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
	        (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
	        skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
	        (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true));
	    if (!found) {
	      doc.cantEdit = true;
	      return Pos(doc.first, 0)
	    }
	    return found
	  }

	  function movePos(doc, pos, dir, line) {
	    if (dir < 0 && pos.ch == 0) {
	      if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
	      else { return null }
	    } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
	      if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
	      else { return null }
	    } else {
	      return new Pos(pos.line, pos.ch + dir)
	    }
	  }

	  function selectAll(cm) {
	    cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
	  }

	  // UPDATING

	  // Allow "beforeChange" event handlers to influence a change
	  function filterChange(doc, change, update) {
	    var obj = {
	      canceled: false,
	      from: change.from,
	      to: change.to,
	      text: change.text,
	      origin: change.origin,
	      cancel: function () { return obj.canceled = true; }
	    };
	    if (update) { obj.update = function (from, to, text, origin) {
	      if (from) { obj.from = clipPos(doc, from); }
	      if (to) { obj.to = clipPos(doc, to); }
	      if (text) { obj.text = text; }
	      if (origin !== undefined) { obj.origin = origin; }
	    }; }
	    signal(doc, "beforeChange", doc, obj);
	    if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj); }

	    if (obj.canceled) {
	      if (doc.cm) { doc.cm.curOp.updateInput = 2; }
	      return null
	    }
	    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
	  }

	  // Apply a change to a document, and add it to the document's
	  // history, and propagating it to all linked documents.
	  function makeChange(doc, change, ignoreReadOnly) {
	    if (doc.cm) {
	      if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
	      if (doc.cm.state.suppressEdits) { return }
	    }

	    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
	      change = filterChange(doc, change, true);
	      if (!change) { return }
	    }

	    // Possibly split or suppress the update based on the presence
	    // of read-only spans in its range.
	    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
	    if (split) {
	      for (var i = split.length - 1; i >= 0; --i)
	        { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}); }
	    } else {
	      makeChangeInner(doc, change);
	    }
	  }

	  function makeChangeInner(doc, change) {
	    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
	    var selAfter = computeSelAfterChange(doc, change);
	    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

	    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
	    var rebased = [];

	    linkedDocs(doc, function (doc, sharedHist) {
	      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
	        rebaseHist(doc.history, change);
	        rebased.push(doc.history);
	      }
	      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
	    });
	  }

	  // Revert a change stored in a document's history.
	  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
	    var suppress = doc.cm && doc.cm.state.suppressEdits;
	    if (suppress && !allowSelectionOnly) { return }

	    var hist = doc.history, event, selAfter = doc.sel;
	    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

	    // Verify that there is a useable event (so that ctrl-z won't
	    // needlessly clear selection events)
	    var i = 0;
	    for (; i < source.length; i++) {
	      event = source[i];
	      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
	        { break }
	    }
	    if (i == source.length) { return }
	    hist.lastOrigin = hist.lastSelOrigin = null;

	    for (;;) {
	      event = source.pop();
	      if (event.ranges) {
	        pushSelectionToHistory(event, dest);
	        if (allowSelectionOnly && !event.equals(doc.sel)) {
	          setSelection(doc, event, {clearRedo: false});
	          return
	        }
	        selAfter = event;
	      } else if (suppress) {
	        source.push(event);
	        return
	      } else { break }
	    }

	    // Build up a reverse change object to add to the opposite history
	    // stack (redo when undoing, and vice versa).
	    var antiChanges = [];
	    pushSelectionToHistory(selAfter, dest);
	    dest.push({changes: antiChanges, generation: hist.generation});
	    hist.generation = event.generation || ++hist.maxGeneration;

	    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

	    var loop = function ( i ) {
	      var change = event.changes[i];
	      change.origin = type;
	      if (filter && !filterChange(doc, change, false)) {
	        source.length = 0;
	        return {}
	      }

	      antiChanges.push(historyChangeFromChange(doc, change));

	      var after = i ? computeSelAfterChange(doc, change) : lst(source);
	      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
	      if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}); }
	      var rebased = [];

	      // Propagate to the linked documents
	      linkedDocs(doc, function (doc, sharedHist) {
	        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
	          rebaseHist(doc.history, change);
	          rebased.push(doc.history);
	        }
	        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
	      });
	    };

	    for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
	      var returned = loop( i$1 );

	      if ( returned ) return returned.v;
	    }
	  }

	  // Sub-views need their line numbers shifted when text is added
	  // above or below them in the parent document.
	  function shiftDoc(doc, distance) {
	    if (distance == 0) { return }
	    doc.first += distance;
	    doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
	      Pos(range.anchor.line + distance, range.anchor.ch),
	      Pos(range.head.line + distance, range.head.ch)
	    ); }), doc.sel.primIndex);
	    if (doc.cm) {
	      regChange(doc.cm, doc.first, doc.first - distance, distance);
	      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
	        { regLineChange(doc.cm, l, "gutter"); }
	    }
	  }

	  // More lower-level change function, handling only a single document
	  // (not linked ones).
	  function makeChangeSingleDoc(doc, change, selAfter, spans) {
	    if (doc.cm && !doc.cm.curOp)
	      { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

	    if (change.to.line < doc.first) {
	      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
	      return
	    }
	    if (change.from.line > doc.lastLine()) { return }

	    // Clip the change to the size of this doc
	    if (change.from.line < doc.first) {
	      var shift = change.text.length - 1 - (doc.first - change.from.line);
	      shiftDoc(doc, shift);
	      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
	                text: [lst(change.text)], origin: change.origin};
	    }
	    var last = doc.lastLine();
	    if (change.to.line > last) {
	      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
	                text: [change.text[0]], origin: change.origin};
	    }

	    change.removed = getBetween(doc, change.from, change.to);

	    if (!selAfter) { selAfter = computeSelAfterChange(doc, change); }
	    if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans); }
	    else { updateDoc(doc, change, spans); }
	    setSelectionNoUndo(doc, selAfter, sel_dontScroll);

	    if (doc.cantEdit && skipAtomic(doc, Pos(doc.firstLine(), 0)))
	      { doc.cantEdit = false; }
	  }

	  // Handle the interaction of a change to a document with the editor
	  // that this document is part of.
	  function makeChangeSingleDocInEditor(cm, change, spans) {
	    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

	    var recomputeMaxLength = false, checkWidthStart = from.line;
	    if (!cm.options.lineWrapping) {
	      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
	      doc.iter(checkWidthStart, to.line + 1, function (line) {
	        if (line == display.maxLine) {
	          recomputeMaxLength = true;
	          return true
	        }
	      });
	    }

	    if (doc.sel.contains(change.from, change.to) > -1)
	      { signalCursorActivity(cm); }

	    updateDoc(doc, change, spans, estimateHeight(cm));

	    if (!cm.options.lineWrapping) {
	      doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
	        var len = lineLength(line);
	        if (len > display.maxLineLength) {
	          display.maxLine = line;
	          display.maxLineLength = len;
	          display.maxLineChanged = true;
	          recomputeMaxLength = false;
	        }
	      });
	      if (recomputeMaxLength) { cm.curOp.updateMaxLine = true; }
	    }

	    retreatFrontier(doc, from.line);
	    startWorker(cm, 400);

	    var lendiff = change.text.length - (to.line - from.line) - 1;
	    // Remember that these lines changed, for updating the display
	    if (change.full)
	      { regChange(cm); }
	    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
	      { regLineChange(cm, from.line, "text"); }
	    else
	      { regChange(cm, from.line, to.line + 1, lendiff); }

	    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
	    if (changeHandler || changesHandler) {
	      var obj = {
	        from: from, to: to,
	        text: change.text,
	        removed: change.removed,
	        origin: change.origin
	      };
	      if (changeHandler) { signalLater(cm, "change", cm, obj); }
	      if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj); }
	    }
	    cm.display.selForContextMenu = null;
	  }

	  function replaceRange(doc, code, from, to, origin) {
	    var assign;

	    if (!to) { to = from; }
	    if (cmp(to, from) < 0) { (assign = [to, from], from = assign[0], to = assign[1]); }
	    if (typeof code == "string") { code = doc.splitLines(code); }
	    makeChange(doc, {from: from, to: to, text: code, origin: origin});
	  }

	  // Rebasing/resetting history to deal with externally-sourced changes

	  function rebaseHistSelSingle(pos, from, to, diff) {
	    if (to < pos.line) {
	      pos.line += diff;
	    } else if (from < pos.line) {
	      pos.line = from;
	      pos.ch = 0;
	    }
	  }

	  // Tries to rebase an array of history events given a change in the
	  // document. If the change touches the same lines as the event, the
	  // event, and everything 'behind' it, is discarded. If the change is
	  // before the event, the event's positions are updated. Uses a
	  // copy-on-write scheme for the positions, to avoid having to
	  // reallocate them all on every rebase, but also avoid problems with
	  // shared position objects being unsafely updated.
	  function rebaseHistArray(array, from, to, diff) {
	    for (var i = 0; i < array.length; ++i) {
	      var sub = array[i], ok = true;
	      if (sub.ranges) {
	        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
	        for (var j = 0; j < sub.ranges.length; j++) {
	          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
	          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
	        }
	        continue
	      }
	      for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
	        var cur = sub.changes[j$1];
	        if (to < cur.from.line) {
	          cur.from = Pos(cur.from.line + diff, cur.from.ch);
	          cur.to = Pos(cur.to.line + diff, cur.to.ch);
	        } else if (from <= cur.to.line) {
	          ok = false;
	          break
	        }
	      }
	      if (!ok) {
	        array.splice(0, i + 1);
	        i = 0;
	      }
	    }
	  }

	  function rebaseHist(hist, change) {
	    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
	    rebaseHistArray(hist.done, from, to, diff);
	    rebaseHistArray(hist.undone, from, to, diff);
	  }

	  // Utility for applying a change to a line by handle or number,
	  // returning the number and optionally registering the line as
	  // changed.
	  function changeLine(doc, handle, changeType, op) {
	    var no = handle, line = handle;
	    if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)); }
	    else { no = lineNo(handle); }
	    if (no == null) { return null }
	    if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType); }
	    return line
	  }

	  // The document is represented as a BTree consisting of leaves, with
	  // chunk of lines in them, and branches, with up to ten leaves or
	  // other branch nodes below them. The top node is always a branch
	  // node, and is the document object itself (meaning it has
	  // additional methods and properties).
	  //
	  // All nodes have parent links. The tree is used both to go from
	  // line numbers to line objects, and to go from objects to numbers.
	  // It also indexes by height, and is used to convert between height
	  // and line object, and to find the total height of the document.
	  //
	  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

	  function LeafChunk(lines) {
	    var this$1 = this;

	    this.lines = lines;
	    this.parent = null;
	    var height = 0;
	    for (var i = 0; i < lines.length; ++i) {
	      lines[i].parent = this$1;
	      height += lines[i].height;
	    }
	    this.height = height;
	  }

	  LeafChunk.prototype = {
	    chunkSize: function() { return this.lines.length },

	    // Remove the n lines at offset 'at'.
	    removeInner: function(at, n) {
	      var this$1 = this;

	      for (var i = at, e = at + n; i < e; ++i) {
	        var line = this$1.lines[i];
	        this$1.height -= line.height;
	        cleanUpLine(line);
	        signalLater(line, "delete");
	      }
	      this.lines.splice(at, n);
	    },

	    // Helper used to collapse a small branch into a single leaf.
	    collapse: function(lines) {
	      lines.push.apply(lines, this.lines);
	    },

	    // Insert the given array of lines at offset 'at', count them as
	    // having the given height.
	    insertInner: function(at, lines, height) {
	      var this$1 = this;

	      this.height += height;
	      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
	      for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1; }
	    },

	    // Used to iterate over a part of the tree.
	    iterN: function(at, n, op) {
	      var this$1 = this;

	      for (var e = at + n; at < e; ++at)
	        { if (op(this$1.lines[at])) { return true } }
	    }
	  };

	  function BranchChunk(children) {
	    var this$1 = this;

	    this.children = children;
	    var size = 0, height = 0;
	    for (var i = 0; i < children.length; ++i) {
	      var ch = children[i];
	      size += ch.chunkSize(); height += ch.height;
	      ch.parent = this$1;
	    }
	    this.size = size;
	    this.height = height;
	    this.parent = null;
	  }

	  BranchChunk.prototype = {
	    chunkSize: function() { return this.size },

	    removeInner: function(at, n) {
	      var this$1 = this;

	      this.size -= n;
	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at < sz) {
	          var rm = Math.min(n, sz - at), oldHeight = child.height;
	          child.removeInner(at, rm);
	          this$1.height -= oldHeight - child.height;
	          if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null; }
	          if ((n -= rm) == 0) { break }
	          at = 0;
	        } else { at -= sz; }
	      }
	      // If the result is smaller than 25 lines, ensure that it is a
	      // single leaf node.
	      if (this.size - n < 25 &&
	          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
	        var lines = [];
	        this.collapse(lines);
	        this.children = [new LeafChunk(lines)];
	        this.children[0].parent = this;
	      }
	    },

	    collapse: function(lines) {
	      var this$1 = this;

	      for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines); }
	    },

	    insertInner: function(at, lines, height) {
	      var this$1 = this;

	      this.size += lines.length;
	      this.height += height;
	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at <= sz) {
	          child.insertInner(at, lines, height);
	          if (child.lines && child.lines.length > 50) {
	            // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
	            // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
	            var remaining = child.lines.length % 25 + 25;
	            for (var pos = remaining; pos < child.lines.length;) {
	              var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
	              child.height -= leaf.height;
	              this$1.children.splice(++i, 0, leaf);
	              leaf.parent = this$1;
	            }
	            child.lines = child.lines.slice(0, remaining);
	            this$1.maybeSpill();
	          }
	          break
	        }
	        at -= sz;
	      }
	    },

	    // When a node has grown, check whether it should be split.
	    maybeSpill: function() {
	      if (this.children.length <= 10) { return }
	      var me = this;
	      do {
	        var spilled = me.children.splice(me.children.length - 5, 5);
	        var sibling = new BranchChunk(spilled);
	        if (!me.parent) { // Become the parent node
	          var copy = new BranchChunk(me.children);
	          copy.parent = me;
	          me.children = [copy, sibling];
	          me = copy;
	       } else {
	          me.size -= sibling.size;
	          me.height -= sibling.height;
	          var myIndex = indexOf(me.parent.children, me);
	          me.parent.children.splice(myIndex + 1, 0, sibling);
	        }
	        sibling.parent = me.parent;
	      } while (me.children.length > 10)
	      me.parent.maybeSpill();
	    },

	    iterN: function(at, n, op) {
	      var this$1 = this;

	      for (var i = 0; i < this.children.length; ++i) {
	        var child = this$1.children[i], sz = child.chunkSize();
	        if (at < sz) {
	          var used = Math.min(n, sz - at);
	          if (child.iterN(at, used, op)) { return true }
	          if ((n -= used) == 0) { break }
	          at = 0;
	        } else { at -= sz; }
	      }
	    }
	  };

	  // Line widgets are block elements displayed above or below a line.

	  var LineWidget = function(doc, node, options) {
	    var this$1 = this;

	    if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
	      { this$1[opt] = options[opt]; } } }
	    this.doc = doc;
	    this.node = node;
	  };

	  LineWidget.prototype.clear = function () {
	      var this$1 = this;

	    var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
	    if (no == null || !ws) { return }
	    for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1); } }
	    if (!ws.length) { line.widgets = null; }
	    var height = widgetHeight(this);
	    updateLineHeight(line, Math.max(0, line.height - height));
	    if (cm) {
	      runInOp(cm, function () {
	        adjustScrollWhenAboveVisible(cm, line, -height);
	        regLineChange(cm, no, "widget");
	      });
	      signalLater(cm, "lineWidgetCleared", cm, this, no);
	    }
	  };

	  LineWidget.prototype.changed = function () {
	      var this$1 = this;

	    var oldH = this.height, cm = this.doc.cm, line = this.line;
	    this.height = null;
	    var diff = widgetHeight(this) - oldH;
	    if (!diff) { return }
	    if (!lineIsHidden(this.doc, line)) { updateLineHeight(line, line.height + diff); }
	    if (cm) {
	      runInOp(cm, function () {
	        cm.curOp.forceUpdate = true;
	        adjustScrollWhenAboveVisible(cm, line, diff);
	        signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
	      });
	    }
	  };
	  eventMixin(LineWidget);

	  function adjustScrollWhenAboveVisible(cm, line, diff) {
	    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
	      { addToScrollTop(cm, diff); }
	  }

	  function addLineWidget(doc, handle, node, options) {
	    var widget = new LineWidget(doc, node, options);
	    var cm = doc.cm;
	    if (cm && widget.noHScroll) { cm.display.alignWidgets = true; }
	    changeLine(doc, handle, "widget", function (line) {
	      var widgets = line.widgets || (line.widgets = []);
	      if (widget.insertAt == null) { widgets.push(widget); }
	      else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget); }
	      widget.line = line;
	      if (cm && !lineIsHidden(doc, line)) {
	        var aboveVisible = heightAtLine(line) < doc.scrollTop;
	        updateLineHeight(line, line.height + widgetHeight(widget));
	        if (aboveVisible) { addToScrollTop(cm, widget.height); }
	        cm.curOp.forceUpdate = true;
	      }
	      return true
	    });
	    if (cm) { signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle)); }
	    return widget
	  }

	  // TEXTMARKERS

	  // Created with markText and setBookmark methods. A TextMarker is a
	  // handle that can be used to clear or find a marked position in the
	  // document. Line objects hold arrays (markedSpans) containing
	  // {from, to, marker} object pointing to such marker objects, and
	  // indicating that such a marker is present on that line. Multiple
	  // lines may point to the same marker when it spans across lines.
	  // The spans will have null for their from/to properties when the
	  // marker continues beyond the start/end of the line. Markers have
	  // links back to the lines they currently touch.

	  // Collapsed markers have unique ids, in order to be able to order
	  // them, which is needed for uniquely determining an outer marker
	  // when they overlap (they may nest, but not partially overlap).
	  var nextMarkerId = 0;

	  var TextMarker = function(doc, type) {
	    this.lines = [];
	    this.type = type;
	    this.doc = doc;
	    this.id = ++nextMarkerId;
	  };

	  // Clear the marker.
	  TextMarker.prototype.clear = function () {
	      var this$1 = this;

	    if (this.explicitlyCleared) { return }
	    var cm = this.doc.cm, withOp = cm && !cm.curOp;
	    if (withOp) { startOperation(cm); }
	    if (hasHandler(this, "clear")) {
	      var found = this.find();
	      if (found) { signalLater(this, "clear", found.from, found.to); }
	    }
	    var min = null, max = null;
	    for (var i = 0; i < this.lines.length; ++i) {
	      var line = this$1.lines[i];
	      var span = getMarkedSpanFor(line.markedSpans, this$1);
	      if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text"); }
	      else if (cm) {
	        if (span.to != null) { max = lineNo(line); }
	        if (span.from != null) { min = lineNo(line); }
	      }
	      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
	      if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
	        { updateLineHeight(line, textHeight(cm.display)); }
	    }
	    if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
	      var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual);
	      if (len > cm.display.maxLineLength) {
	        cm.display.maxLine = visual;
	        cm.display.maxLineLength = len;
	        cm.display.maxLineChanged = true;
	      }
	    } }

	    if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1); }
	    this.lines.length = 0;
	    this.explicitlyCleared = true;
	    if (this.atomic && this.doc.cantEdit) {
	      this.doc.cantEdit = false;
	      if (cm) { reCheckSelection(cm.doc); }
	    }
	    if (cm) { signalLater(cm, "markerCleared", cm, this, min, max); }
	    if (withOp) { endOperation(cm); }
	    if (this.parent) { this.parent.clear(); }
	  };

	  // Find the position of the marker in the document. Returns a {from,
	  // to} object by default. Side can be passed to get a specific side
	  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
	  // Pos objects returned contain a line object, rather than a line
	  // number (used to prevent looking up the same line twice).
	  TextMarker.prototype.find = function (side, lineObj) {
	      var this$1 = this;

	    if (side == null && this.type == "bookmark") { side = 1; }
	    var from, to;
	    for (var i = 0; i < this.lines.length; ++i) {
	      var line = this$1.lines[i];
	      var span = getMarkedSpanFor(line.markedSpans, this$1);
	      if (span.from != null) {
	        from = Pos(lineObj ? line : lineNo(line), span.from);
	        if (side == -1) { return from }
	      }
	      if (span.to != null) {
	        to = Pos(lineObj ? line : lineNo(line), span.to);
	        if (side == 1) { return to }
	      }
	    }
	    return from && {from: from, to: to}
	  };

	  // Signals that the marker's widget changed, and surrounding layout
	  // should be recomputed.
	  TextMarker.prototype.changed = function () {
	      var this$1 = this;

	    var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
	    if (!pos || !cm) { return }
	    runInOp(cm, function () {
	      var line = pos.line, lineN = lineNo(pos.line);
	      var view = findViewForLine(cm, lineN);
	      if (view) {
	        clearLineMeasurementCacheFor(view);
	        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
	      }
	      cm.curOp.updateMaxLine = true;
	      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
	        var oldHeight = widget.height;
	        widget.height = null;
	        var dHeight = widgetHeight(widget) - oldHeight;
	        if (dHeight)
	          { updateLineHeight(line, line.height + dHeight); }
	      }
	      signalLater(cm, "markerChanged", cm, this$1);
	    });
	  };

	  TextMarker.prototype.attachLine = function (line) {
	    if (!this.lines.length && this.doc.cm) {
	      var op = this.doc.cm.curOp;
	      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
	        { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this); }
	    }
	    this.lines.push(line);
	  };

	  TextMarker.prototype.detachLine = function (line) {
	    this.lines.splice(indexOf(this.lines, line), 1);
	    if (!this.lines.length && this.doc.cm) {
	      var op = this.doc.cm.curOp
	      ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
	    }
	  };
	  eventMixin(TextMarker);

	  // Create a marker, wire it up to the right lines, and
	  function markText(doc, from, to, options, type) {
	    // Shared markers (across linked documents) are handled separately
	    // (markTextShared will call out to this again, once per
	    // document).
	    if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
	    // Ensure we are in an operation.
	    if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

	    var marker = new TextMarker(doc, type), diff = cmp(from, to);
	    if (options) { copyObj(options, marker, false); }
	    // Don't connect empty markers unless clearWhenEmpty is false
	    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
	      { return marker }
	    if (marker.replacedWith) {
	      // Showing up as a widget implies collapsed (widget replaces text)
	      marker.collapsed = true;
	      marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
	      if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true"); }
	      if (options.insertLeft) { marker.widgetNode.insertLeft = true; }
	    }
	    if (marker.collapsed) {
	      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
	          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
	        { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
	      seeCollapsedSpans();
	    }

	    if (marker.addToHistory)
	      { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN); }

	    var curLine = from.line, cm = doc.cm, updateMaxLine;
	    doc.iter(curLine, to.line + 1, function (line) {
	      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
	        { updateMaxLine = true; }
	      if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0); }
	      addMarkedSpan(line, new MarkedSpan(marker,
	                                         curLine == from.line ? from.ch : null,
	                                         curLine == to.line ? to.ch : null));
	      ++curLine;
	    });
	    // lineIsHidden depends on the presence of the spans, so needs a second pass
	    if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
	      if (lineIsHidden(doc, line)) { updateLineHeight(line, 0); }
	    }); }

	    if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }); }

	    if (marker.readOnly) {
	      seeReadOnlySpans();
	      if (doc.history.done.length || doc.history.undone.length)
	        { doc.clearHistory(); }
	    }
	    if (marker.collapsed) {
	      marker.id = ++nextMarkerId;
	      marker.atomic = true;
	    }
	    if (cm) {
	      // Sync editor state
	      if (updateMaxLine) { cm.curOp.updateMaxLine = true; }
	      if (marker.collapsed)
	        { regChange(cm, from.line, to.line + 1); }
	      else if (marker.className || marker.startStyle || marker.endStyle || marker.css ||
	               marker.attributes || marker.title)
	        { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text"); } }
	      if (marker.atomic) { reCheckSelection(cm.doc); }
	      signalLater(cm, "markerAdded", cm, marker);
	    }
	    return marker
	  }

	  // SHARED TEXTMARKERS

	  // A shared marker spans multiple linked documents. It is
	  // implemented as a meta-marker-object controlling multiple normal
	  // markers.
	  var SharedTextMarker = function(markers, primary) {
	    var this$1 = this;

	    this.markers = markers;
	    this.primary = primary;
	    for (var i = 0; i < markers.length; ++i)
	      { markers[i].parent = this$1; }
	  };

	  SharedTextMarker.prototype.clear = function () {
	      var this$1 = this;

	    if (this.explicitlyCleared) { return }
	    this.explicitlyCleared = true;
	    for (var i = 0; i < this.markers.length; ++i)
	      { this$1.markers[i].clear(); }
	    signalLater(this, "clear");
	  };

	  SharedTextMarker.prototype.find = function (side, lineObj) {
	    return this.primary.find(side, lineObj)
	  };
	  eventMixin(SharedTextMarker);

	  function markTextShared(doc, from, to, options, type) {
	    options = copyObj(options);
	    options.shared = false;
	    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
	    var widget = options.widgetNode;
	    linkedDocs(doc, function (doc) {
	      if (widget) { options.widgetNode = widget.cloneNode(true); }
	      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
	      for (var i = 0; i < doc.linked.length; ++i)
	        { if (doc.linked[i].isParent) { return } }
	      primary = lst(markers);
	    });
	    return new SharedTextMarker(markers, primary)
	  }

	  function findSharedMarkers(doc) {
	    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
	  }

	  function copySharedMarkers(doc, markers) {
	    for (var i = 0; i < markers.length; i++) {
	      var marker = markers[i], pos = marker.find();
	      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
	      if (cmp(mFrom, mTo)) {
	        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
	        marker.markers.push(subMark);
	        subMark.parent = marker;
	      }
	    }
	  }

	  function detachSharedMarkers(markers) {
	    var loop = function ( i ) {
	      var marker = markers[i], linked = [marker.primary.doc];
	      linkedDocs(marker.primary.doc, function (d) { return linked.push(d); });
	      for (var j = 0; j < marker.markers.length; j++) {
	        var subMarker = marker.markers[j];
	        if (indexOf(linked, subMarker.doc) == -1) {
	          subMarker.parent = null;
	          marker.markers.splice(j--, 1);
	        }
	      }
	    };

	    for (var i = 0; i < markers.length; i++) loop( i );
	  }

	  var nextDocId = 0;
	  var Doc = function(text, mode, firstLine, lineSep, direction) {
	    if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
	    if (firstLine == null) { firstLine = 0; }

	    BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
	    this.first = firstLine;
	    this.scrollTop = this.scrollLeft = 0;
	    this.cantEdit = false;
	    this.cleanGeneration = 1;
	    this.modeFrontier = this.highlightFrontier = firstLine;
	    var start = Pos(firstLine, 0);
	    this.sel = simpleSelection(start);
	    this.history = new History(null);
	    this.id = ++nextDocId;
	    this.modeOption = mode;
	    this.lineSep = lineSep;
	    this.direction = (direction == "rtl") ? "rtl" : "ltr";
	    this.extend = false;

	    if (typeof text == "string") { text = this.splitLines(text); }
	    updateDoc(this, {from: start, to: start, text: text});
	    setSelection(this, simpleSelection(start), sel_dontScroll);
	  };

	  Doc.prototype = createObj(BranchChunk.prototype, {
	    constructor: Doc,
	    // Iterate over the document. Supports two forms -- with only one
	    // argument, it calls that for each line in the document. With
	    // three, it iterates over the range given by the first two (with
	    // the second being non-inclusive).
	    iter: function(from, to, op) {
	      if (op) { this.iterN(from - this.first, to - from, op); }
	      else { this.iterN(this.first, this.first + this.size, from); }
	    },

	    // Non-public interface for adding and removing lines.
	    insert: function(at, lines) {
	      var height = 0;
	      for (var i = 0; i < lines.length; ++i) { height += lines[i].height; }
	      this.insertInner(at - this.first, lines, height);
	    },
	    remove: function(at, n) { this.removeInner(at - this.first, n); },

	    // From here, the methods are part of the public interface. Most
	    // are also available from CodeMirror (editor) instances.

	    getValue: function(lineSep) {
	      var lines = getLines(this, this.first, this.first + this.size);
	      if (lineSep === false) { return lines }
	      return lines.join(lineSep || this.lineSeparator())
	    },
	    setValue: docMethodOp(function(code) {
	      var top = Pos(this.first, 0), last = this.first + this.size - 1;
	      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
	                        text: this.splitLines(code), origin: "setValue", full: true}, true);
	      if (this.cm) { scrollToCoords(this.cm, 0, 0); }
	      setSelection(this, simpleSelection(top), sel_dontScroll);
	    }),
	    replaceRange: function(code, from, to, origin) {
	      from = clipPos(this, from);
	      to = to ? clipPos(this, to) : from;
	      replaceRange(this, code, from, to, origin);
	    },
	    getRange: function(from, to, lineSep) {
	      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
	      if (lineSep === false) { return lines }
	      return lines.join(lineSep || this.lineSeparator())
	    },

	    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

	    getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
	    getLineNumber: function(line) {return lineNo(line)},

	    getLineHandleVisualStart: function(line) {
	      if (typeof line == "number") { line = getLine(this, line); }
	      return visualLine(line)
	    },

	    lineCount: function() {return this.size},
	    firstLine: function() {return this.first},
	    lastLine: function() {return this.first + this.size - 1},

	    clipPos: function(pos) {return clipPos(this, pos)},

	    getCursor: function(start) {
	      var range$$1 = this.sel.primary(), pos;
	      if (start == null || start == "head") { pos = range$$1.head; }
	      else if (start == "anchor") { pos = range$$1.anchor; }
	      else if (start == "end" || start == "to" || start === false) { pos = range$$1.to(); }
	      else { pos = range$$1.from(); }
	      return pos
	    },
	    listSelections: function() { return this.sel.ranges },
	    somethingSelected: function() {return this.sel.somethingSelected()},

	    setCursor: docMethodOp(function(line, ch, options) {
	      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
	    }),
	    setSelection: docMethodOp(function(anchor, head, options) {
	      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
	    }),
	    extendSelection: docMethodOp(function(head, other, options) {
	      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
	    }),
	    extendSelections: docMethodOp(function(heads, options) {
	      extendSelections(this, clipPosArray(this, heads), options);
	    }),
	    extendSelectionsBy: docMethodOp(function(f, options) {
	      var heads = map(this.sel.ranges, f);
	      extendSelections(this, clipPosArray(this, heads), options);
	    }),
	    setSelections: docMethodOp(function(ranges, primary, options) {
	      var this$1 = this;

	      if (!ranges.length) { return }
	      var out = [];
	      for (var i = 0; i < ranges.length; i++)
	        { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
	                           clipPos(this$1, ranges[i].head)); }
	      if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex); }
	      setSelection(this, normalizeSelection(this.cm, out, primary), options);
	    }),
	    addSelection: docMethodOp(function(anchor, head, options) {
	      var ranges = this.sel.ranges.slice(0);
	      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
	      setSelection(this, normalizeSelection(this.cm, ranges, ranges.length - 1), options);
	    }),

	    getSelection: function(lineSep) {
	      var this$1 = this;

	      var ranges = this.sel.ranges, lines;
	      for (var i = 0; i < ranges.length; i++) {
	        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
	        lines = lines ? lines.concat(sel) : sel;
	      }
	      if (lineSep === false) { return lines }
	      else { return lines.join(lineSep || this.lineSeparator()) }
	    },
	    getSelections: function(lineSep) {
	      var this$1 = this;

	      var parts = [], ranges = this.sel.ranges;
	      for (var i = 0; i < ranges.length; i++) {
	        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
	        if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()); }
	        parts[i] = sel;
	      }
	      return parts
	    },
	    replaceSelection: function(code, collapse, origin) {
	      var dup = [];
	      for (var i = 0; i < this.sel.ranges.length; i++)
	        { dup[i] = code; }
	      this.replaceSelections(dup, collapse, origin || "+input");
	    },
	    replaceSelections: docMethodOp(function(code, collapse, origin) {
	      var this$1 = this;

	      var changes = [], sel = this.sel;
	      for (var i = 0; i < sel.ranges.length; i++) {
	        var range$$1 = sel.ranges[i];
	        changes[i] = {from: range$$1.from(), to: range$$1.to(), text: this$1.splitLines(code[i]), origin: origin};
	      }
	      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
	      for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
	        { makeChange(this$1, changes[i$1]); }
	      if (newSel) { setSelectionReplaceHistory(this, newSel); }
	      else if (this.cm) { ensureCursorVisible(this.cm); }
	    }),
	    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
	    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
	    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
	    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

	    setExtending: function(val) {this.extend = val;},
	    getExtending: function() {return this.extend},

	    historySize: function() {
	      var hist = this.history, done = 0, undone = 0;
	      for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done; } }
	      for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone; } }
	      return {undo: done, redo: undone}
	    },
	    clearHistory: function() {this.history = new History(this.history.maxGeneration);},

	    markClean: function() {
	      this.cleanGeneration = this.changeGeneration(true);
	    },
	    changeGeneration: function(forceSplit) {
	      if (forceSplit)
	        { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null; }
	      return this.history.generation
	    },
	    isClean: function (gen) {
	      return this.history.generation == (gen || this.cleanGeneration)
	    },

	    getHistory: function() {
	      return {done: copyHistoryArray(this.history.done),
	              undone: copyHistoryArray(this.history.undone)}
	    },
	    setHistory: function(histData) {
	      var hist = this.history = new History(this.history.maxGeneration);
	      hist.done = copyHistoryArray(histData.done.slice(0), null, true);
	      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
	    },

	    setGutterMarker: docMethodOp(function(line, gutterID, value) {
	      return changeLine(this, line, "gutter", function (line) {
	        var markers = line.gutterMarkers || (line.gutterMarkers = {});
	        markers[gutterID] = value;
	        if (!value && isEmpty(markers)) { line.gutterMarkers = null; }
	        return true
	      })
	    }),

	    clearGutter: docMethodOp(function(gutterID) {
	      var this$1 = this;

	      this.iter(function (line) {
	        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
	          changeLine(this$1, line, "gutter", function () {
	            line.gutterMarkers[gutterID] = null;
	            if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null; }
	            return true
	          });
	        }
	      });
	    }),

	    lineInfo: function(line) {
	      var n;
	      if (typeof line == "number") {
	        if (!isLine(this, line)) { return null }
	        n = line;
	        line = getLine(this, line);
	        if (!line) { return null }
	      } else {
	        n = lineNo(line);
	        if (n == null) { return null }
	      }
	      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
	              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
	              widgets: line.widgets}
	    },

	    addLineClass: docMethodOp(function(handle, where, cls) {
	      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
	        var prop = where == "text" ? "textClass"
	                 : where == "background" ? "bgClass"
	                 : where == "gutter" ? "gutterClass" : "wrapClass";
	        if (!line[prop]) { line[prop] = cls; }
	        else if (classTest(cls).test(line[prop])) { return false }
	        else { line[prop] += " " + cls; }
	        return true
	      })
	    }),
	    removeLineClass: docMethodOp(function(handle, where, cls) {
	      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
	        var prop = where == "text" ? "textClass"
	                 : where == "background" ? "bgClass"
	                 : where == "gutter" ? "gutterClass" : "wrapClass";
	        var cur = line[prop];
	        if (!cur) { return false }
	        else if (cls == null) { line[prop] = null; }
	        else {
	          var found = cur.match(classTest(cls));
	          if (!found) { return false }
	          var end = found.index + found[0].length;
	          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
	        }
	        return true
	      })
	    }),

	    addLineWidget: docMethodOp(function(handle, node, options) {
	      return addLineWidget(this, handle, node, options)
	    }),
	    removeLineWidget: function(widget) { widget.clear(); },

	    markText: function(from, to, options) {
	      return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
	    },
	    setBookmark: function(pos, options) {
	      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
	                      insertLeft: options && options.insertLeft,
	                      clearWhenEmpty: false, shared: options && options.shared,
	                      handleMouseEvents: options && options.handleMouseEvents};
	      pos = clipPos(this, pos);
	      return markText(this, pos, pos, realOpts, "bookmark")
	    },
	    findMarksAt: function(pos) {
	      pos = clipPos(this, pos);
	      var markers = [], spans = getLine(this, pos.line).markedSpans;
	      if (spans) { for (var i = 0; i < spans.length; ++i) {
	        var span = spans[i];
	        if ((span.from == null || span.from <= pos.ch) &&
	            (span.to == null || span.to >= pos.ch))
	          { markers.push(span.marker.parent || span.marker); }
	      } }
	      return markers
	    },
	    findMarks: function(from, to, filter) {
	      from = clipPos(this, from); to = clipPos(this, to);
	      var found = [], lineNo$$1 = from.line;
	      this.iter(from.line, to.line + 1, function (line) {
	        var spans = line.markedSpans;
	        if (spans) { for (var i = 0; i < spans.length; i++) {
	          var span = spans[i];
	          if (!(span.to != null && lineNo$$1 == from.line && from.ch >= span.to ||
	                span.from == null && lineNo$$1 != from.line ||
	                span.from != null && lineNo$$1 == to.line && span.from >= to.ch) &&
	              (!filter || filter(span.marker)))
	            { found.push(span.marker.parent || span.marker); }
	        } }
	        ++lineNo$$1;
	      });
	      return found
	    },
	    getAllMarks: function() {
	      var markers = [];
	      this.iter(function (line) {
	        var sps = line.markedSpans;
	        if (sps) { for (var i = 0; i < sps.length; ++i)
	          { if (sps[i].from != null) { markers.push(sps[i].marker); } } }
	      });
	      return markers
	    },

	    posFromIndex: function(off) {
	      var ch, lineNo$$1 = this.first, sepSize = this.lineSeparator().length;
	      this.iter(function (line) {
	        var sz = line.text.length + sepSize;
	        if (sz > off) { ch = off; return true }
	        off -= sz;
	        ++lineNo$$1;
	      });
	      return clipPos(this, Pos(lineNo$$1, ch))
	    },
	    indexFromPos: function (coords) {
	      coords = clipPos(this, coords);
	      var index = coords.ch;
	      if (coords.line < this.first || coords.ch < 0) { return 0 }
	      var sepSize = this.lineSeparator().length;
	      this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
	        index += line.text.length + sepSize;
	      });
	      return index
	    },

	    copy: function(copyHistory) {
	      var doc = new Doc(getLines(this, this.first, this.first + this.size),
	                        this.modeOption, this.first, this.lineSep, this.direction);
	      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
	      doc.sel = this.sel;
	      doc.extend = false;
	      if (copyHistory) {
	        doc.history.undoDepth = this.history.undoDepth;
	        doc.setHistory(this.getHistory());
	      }
	      return doc
	    },

	    linkedDoc: function(options) {
	      if (!options) { options = {}; }
	      var from = this.first, to = this.first + this.size;
	      if (options.from != null && options.from > from) { from = options.from; }
	      if (options.to != null && options.to < to) { to = options.to; }
	      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
	      if (options.sharedHist) { copy.history = this.history
	      ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
	      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
	      copySharedMarkers(copy, findSharedMarkers(this));
	      return copy
	    },
	    unlinkDoc: function(other) {
	      var this$1 = this;

	      if (other instanceof CodeMirror) { other = other.doc; }
	      if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
	        var link = this$1.linked[i];
	        if (link.doc != other) { continue }
	        this$1.linked.splice(i, 1);
	        other.unlinkDoc(this$1);
	        detachSharedMarkers(findSharedMarkers(this$1));
	        break
	      } }
	      // If the histories were shared, split them again
	      if (other.history == this.history) {
	        var splitIds = [other.id];
	        linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true);
	        other.history = new History(null);
	        other.history.done = copyHistoryArray(this.history.done, splitIds);
	        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
	      }
	    },
	    iterLinkedDocs: function(f) {linkedDocs(this, f);},

	    getMode: function() {return this.mode},
	    getEditor: function() {return this.cm},

	    splitLines: function(str) {
	      if (this.lineSep) { return str.split(this.lineSep) }
	      return splitLinesAuto(str)
	    },
	    lineSeparator: function() { return this.lineSep || "\n" },

	    setDirection: docMethodOp(function (dir) {
	      if (dir != "rtl") { dir = "ltr"; }
	      if (dir == this.direction) { return }
	      this.direction = dir;
	      this.iter(function (line) { return line.order = null; });
	      if (this.cm) { directionChanged(this.cm); }
	    })
	  });

	  // Public alias.
	  Doc.prototype.eachLine = Doc.prototype.iter;

	  // Kludge to work around strange IE behavior where it'll sometimes
	  // re-fire a series of drag-related events right after the drop (#1551)
	  var lastDrop = 0;

	  function onDrop(e) {
	    var cm = this;
	    clearDragCursor(cm);
	    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
	      { return }
	    e_preventDefault(e);
	    if (ie) { lastDrop = +new Date; }
	    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
	    if (!pos || cm.isReadOnly()) { return }
	    // Might be a file drop, in which case we simply extract the text
	    // and insert it.
	    if (files && files.length && window.FileReader && window.File) {
	      var n = files.length, text = Array(n), read = 0;
	      var loadFile = function (file, i) {
	        if (cm.options.allowDropFileTypes &&
	            indexOf(cm.options.allowDropFileTypes, file.type) == -1)
	          { return }

	        var reader = new FileReader;
	        reader.onload = operation(cm, function () {
	          var content = reader.result;
	          if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = ""; }
	          text[i] = content;
	          if (++read == n) {
	            pos = clipPos(cm.doc, pos);
	            var change = {from: pos, to: pos,
	                          text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
	                          origin: "paste"};
	            makeChange(cm.doc, change);
	            setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
	          }
	        });
	        reader.readAsText(file);
	      };
	      for (var i = 0; i < n; ++i) { loadFile(files[i], i); }
	    } else { // Normal drop
	      // Don't do a replace if the drop happened inside of the selected text.
	      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
	        cm.state.draggingText(e);
	        // Ensure the editor is re-focused
	        setTimeout(function () { return cm.display.input.focus(); }, 20);
	        return
	      }
	      try {
	        var text$1 = e.dataTransfer.getData("Text");
	        if (text$1) {
	          var selected;
	          if (cm.state.draggingText && !cm.state.draggingText.copy)
	            { selected = cm.listSelections(); }
	          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
	          if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
	            { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag"); } }
	          cm.replaceSelection(text$1, "around", "paste");
	          cm.display.input.focus();
	        }
	      }
	      catch(e){}
	    }
	  }

	  function onDragStart(cm, e) {
	    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
	    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

	    e.dataTransfer.setData("Text", cm.getSelection());
	    e.dataTransfer.effectAllowed = "copyMove";

	    // Use dummy image instead of default browsers image.
	    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
	    if (e.dataTransfer.setDragImage && !safari) {
	      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
	      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
	      if (presto) {
	        img.width = img.height = 1;
	        cm.display.wrapper.appendChild(img);
	        // Force a relayout, or Opera won't use our image for some obscure reason
	        img._top = img.offsetTop;
	      }
	      e.dataTransfer.setDragImage(img, 0, 0);
	      if (presto) { img.parentNode.removeChild(img); }
	    }
	  }

	  function onDragOver(cm, e) {
	    var pos = posFromMouse(cm, e);
	    if (!pos) { return }
	    var frag = document.createDocumentFragment();
	    drawSelectionCursor(cm, pos, frag);
	    if (!cm.display.dragCursor) {
	      cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
	      cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
	    }
	    removeChildrenAndAdd(cm.display.dragCursor, frag);
	  }

	  function clearDragCursor(cm) {
	    if (cm.display.dragCursor) {
	      cm.display.lineSpace.removeChild(cm.display.dragCursor);
	      cm.display.dragCursor = null;
	    }
	  }

	  // These must be handled carefully, because naively registering a
	  // handler for each editor will cause the editors to never be
	  // garbage collected.

	  function forEachCodeMirror(f) {
	    if (!document.getElementsByClassName) { return }
	    var byClass = document.getElementsByClassName("CodeMirror"), editors = [];
	    for (var i = 0; i < byClass.length; i++) {
	      var cm = byClass[i].CodeMirror;
	      if (cm) { editors.push(cm); }
	    }
	    if (editors.length) { editors[0].operation(function () {
	      for (var i = 0; i < editors.length; i++) { f(editors[i]); }
	    }); }
	  }

	  var globalsRegistered = false;
	  function ensureGlobalHandlers() {
	    if (globalsRegistered) { return }
	    registerGlobalHandlers();
	    globalsRegistered = true;
	  }
	  function registerGlobalHandlers() {
	    // When the window resizes, we need to refresh active editors.
	    var resizeTimer;
	    on(window, "resize", function () {
	      if (resizeTimer == null) { resizeTimer = setTimeout(function () {
	        resizeTimer = null;
	        forEachCodeMirror(onResize);
	      }, 100); }
	    });
	    // When the window loses focus, we want to show the editor as blurred
	    on(window, "blur", function () { return forEachCodeMirror(onBlur); });
	  }
	  // Called when the window resizes
	  function onResize(cm) {
	    var d = cm.display;
	    // Might be a text scaling operation, clear size caches.
	    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
	    d.scrollbarsClipped = false;
	    cm.setSize();
	  }

	  var keyNames = {
	    3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
	    19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
	    36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
	    46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
	    106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 145: "ScrollLock",
	    173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
	    221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
	    63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
	  };

	  // Number keys
	  for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i); }
	  // Alphabetic keys
	  for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1); }
	  // Function keys
	  for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2; }

	  var keyMap = {};

	  keyMap.basic = {
	    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
	    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
	    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
	    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
	    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
	    "Esc": "singleSelection"
	  };
	  // Note that the save and find-related commands aren't defined by
	  // default. User code or addons can define them. Unknown commands
	  // are simply ignored.
	  keyMap.pcDefault = {
	    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
	    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
	    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
	    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
	    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
	    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
	    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
	    "fallthrough": "basic"
	  };
	  // Very basic readline/emacs-style bindings, which are standard on Mac.
	  keyMap.emacsy = {
	    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
	    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
	    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
	    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
	    "Ctrl-O": "openLine"
	  };
	  keyMap.macDefault = {
	    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
	    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
	    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
	    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
	    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
	    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
	    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
	    "fallthrough": ["basic", "emacsy"]
	  };
	  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

	  // KEYMAP DISPATCH

	  function normalizeKeyName(name) {
	    var parts = name.split(/-(?!$)/);
	    name = parts[parts.length - 1];
	    var alt, ctrl, shift, cmd;
	    for (var i = 0; i < parts.length - 1; i++) {
	      var mod = parts[i];
	      if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; }
	      else if (/^a(lt)?$/i.test(mod)) { alt = true; }
	      else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; }
	      else if (/^s(hift)?$/i.test(mod)) { shift = true; }
	      else { throw new Error("Unrecognized modifier name: " + mod) }
	    }
	    if (alt) { name = "Alt-" + name; }
	    if (ctrl) { name = "Ctrl-" + name; }
	    if (cmd) { name = "Cmd-" + name; }
	    if (shift) { name = "Shift-" + name; }
	    return name
	  }

	  // This is a kludge to keep keymaps mostly working as raw objects
	  // (backwards compatibility) while at the same time support features
	  // like normalization and multi-stroke key bindings. It compiles a
	  // new normalized keymap, and then updates the old object to reflect
	  // this.
	  function normalizeKeyMap(keymap) {
	    var copy = {};
	    for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
	      var value = keymap[keyname];
	      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
	      if (value == "...") { delete keymap[keyname]; continue }

	      var keys = map(keyname.split(" "), normalizeKeyName);
	      for (var i = 0; i < keys.length; i++) {
	        var val = (void 0), name = (void 0);
	        if (i == keys.length - 1) {
	          name = keys.join(" ");
	          val = value;
	        } else {
	          name = keys.slice(0, i + 1).join(" ");
	          val = "...";
	        }
	        var prev = copy[name];
	        if (!prev) { copy[name] = val; }
	        else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
	      }
	      delete keymap[keyname];
	    } }
	    for (var prop in copy) { keymap[prop] = copy[prop]; }
	    return keymap
	  }

	  function lookupKey(key, map$$1, handle, context) {
	    map$$1 = getKeyMap(map$$1);
	    var found = map$$1.call ? map$$1.call(key, context) : map$$1[key];
	    if (found === false) { return "nothing" }
	    if (found === "...") { return "multi" }
	    if (found != null && handle(found)) { return "handled" }

	    if (map$$1.fallthrough) {
	      if (Object.prototype.toString.call(map$$1.fallthrough) != "[object Array]")
	        { return lookupKey(key, map$$1.fallthrough, handle, context) }
	      for (var i = 0; i < map$$1.fallthrough.length; i++) {
	        var result = lookupKey(key, map$$1.fallthrough[i], handle, context);
	        if (result) { return result }
	      }
	    }
	  }

	  // Modifier key presses don't count as 'real' key presses for the
	  // purpose of keymap fallthrough.
	  function isModifierKey(value) {
	    var name = typeof value == "string" ? value : keyNames[value.keyCode];
	    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
	  }

	  function addModifierNames(name, event, noShift) {
	    var base = name;
	    if (event.altKey && base != "Alt") { name = "Alt-" + name; }
	    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name; }
	    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name; }
	    if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name; }
	    return name
	  }

	  // Look up the name of a key as indicated by an event object.
	  function keyName(event, noShift) {
	    if (presto && event.keyCode == 34 && event["char"]) { return false }
	    var name = keyNames[event.keyCode];
	    if (name == null || event.altGraphKey) { return false }
	    // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
	    // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
	    if (event.keyCode == 3 && event.code) { name = event.code; }
	    return addModifierNames(name, event, noShift)
	  }

	  function getKeyMap(val) {
	    return typeof val == "string" ? keyMap[val] : val
	  }

	  // Helper for deleting text near the selection(s), used to implement
	  // backspace, delete, and similar functionality.
	  function deleteNearSelection(cm, compute) {
	    var ranges = cm.doc.sel.ranges, kill = [];
	    // Build up a set of ranges to kill first, merging overlapping
	    // ranges.
	    for (var i = 0; i < ranges.length; i++) {
	      var toKill = compute(ranges[i]);
	      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
	        var replaced = kill.pop();
	        if (cmp(replaced.from, toKill.from) < 0) {
	          toKill.from = replaced.from;
	          break
	        }
	      }
	      kill.push(toKill);
	    }
	    // Next, remove those actual ranges.
	    runInOp(cm, function () {
	      for (var i = kill.length - 1; i >= 0; i--)
	        { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete"); }
	      ensureCursorVisible(cm);
	    });
	  }

	  function moveCharLogically(line, ch, dir) {
	    var target = skipExtendingChars(line.text, ch + dir, dir);
	    return target < 0 || target > line.text.length ? null : target
	  }

	  function moveLogically(line, start, dir) {
	    var ch = moveCharLogically(line, start.ch, dir);
	    return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
	  }

	  function endOfLine(visually, cm, lineObj, lineNo, dir) {
	    if (visually) {
	      var order = getOrder(lineObj, cm.doc.direction);
	      if (order) {
	        var part = dir < 0 ? lst(order) : order[0];
	        var moveInStorageOrder = (dir < 0) == (part.level == 1);
	        var sticky = moveInStorageOrder ? "after" : "before";
	        var ch;
	        // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
	        // it could be that the last bidi part is not on the last visual line,
	        // since visual lines contain content order-consecutive chunks.
	        // Thus, in rtl, we are looking for the first (content-order) character
	        // in the rtl chunk that is on the last line (that is, the same line
	        // as the last (content-order) character).
	        if (part.level > 0 || cm.doc.direction == "rtl") {
	          var prep = prepareMeasureForLine(cm, lineObj);
	          ch = dir < 0 ? lineObj.text.length - 1 : 0;
	          var targetTop = measureCharPrepared(cm, prep, ch).top;
	          ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
	          if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1); }
	        } else { ch = dir < 0 ? part.to : part.from; }
	        return new Pos(lineNo, ch, sticky)
	      }
	    }
	    return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
	  }

	  function moveVisually(cm, line, start, dir) {
	    var bidi = getOrder(line, cm.doc.direction);
	    if (!bidi) { return moveLogically(line, start, dir) }
	    if (start.ch >= line.text.length) {
	      start.ch = line.text.length;
	      start.sticky = "before";
	    } else if (start.ch <= 0) {
	      start.ch = 0;
	      start.sticky = "after";
	    }
	    var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos];
	    if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
	      // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
	      // nothing interesting happens.
	      return moveLogically(line, start, dir)
	    }

	    var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); };
	    var prep;
	    var getWrappedLineExtent = function (ch) {
	      if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
	      prep = prep || prepareMeasureForLine(cm, line);
	      return wrappedLineExtentChar(cm, line, prep, ch)
	    };
	    var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

	    if (cm.doc.direction == "rtl" || part.level == 1) {
	      var moveInStorageOrder = (part.level == 1) == (dir < 0);
	      var ch = mv(start, moveInStorageOrder ? 1 : -1);
	      if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
	        // Case 2: We move within an rtl part or in an rtl editor on the same visual line
	        var sticky = moveInStorageOrder ? "before" : "after";
	        return new Pos(start.line, ch, sticky)
	      }
	    }

	    // Case 3: Could not move within this bidi part in this visual line, so leave
	    // the current bidi part

	    var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
	      var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
	        ? new Pos(start.line, mv(ch, 1), "before")
	        : new Pos(start.line, ch, "after"); };

	      for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
	        var part = bidi[partPos];
	        var moveInStorageOrder = (dir > 0) == (part.level != 1);
	        var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
	        if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
	        ch = moveInStorageOrder ? part.from : mv(part.to, -1);
	        if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
	      }
	    };

	    // Case 3a: Look for other bidi parts on the same visual line
	    var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
	    if (res) { return res }

	    // Case 3b: Look for other bidi parts on the next visual line
	    var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
	    if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
	      res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
	      if (res) { return res }
	    }

	    // Case 4: Nowhere to move
	    return null
	  }

	  // Commands are parameter-less actions that can be performed on an
	  // editor, mostly used for keybindings.
	  var commands = {
	    selectAll: selectAll,
	    singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
	    killLine: function (cm) { return deleteNearSelection(cm, function (range) {
	      if (range.empty()) {
	        var len = getLine(cm.doc, range.head.line).text.length;
	        if (range.head.ch == len && range.head.line < cm.lastLine())
	          { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
	        else
	          { return {from: range.head, to: Pos(range.head.line, len)} }
	      } else {
	        return {from: range.from(), to: range.to()}
	      }
	    }); },
	    deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
	      from: Pos(range.from().line, 0),
	      to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
	    }); }); },
	    delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
	      from: Pos(range.from().line, 0), to: range.from()
	    }); }); },
	    delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
	      var top = cm.charCoords(range.head, "div").top + 5;
	      var leftPos = cm.coordsChar({left: 0, top: top}, "div");
	      return {from: leftPos, to: range.from()}
	    }); },
	    delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
	      var top = cm.charCoords(range.head, "div").top + 5;
	      var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
	      return {from: range.from(), to: rightPos }
	    }); },
	    undo: function (cm) { return cm.undo(); },
	    redo: function (cm) { return cm.redo(); },
	    undoSelection: function (cm) { return cm.undoSelection(); },
	    redoSelection: function (cm) { return cm.redoSelection(); },
	    goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
	    goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
	    goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
	      {origin: "+move", bias: 1}
	    ); },
	    goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
	      {origin: "+move", bias: 1}
	    ); },
	    goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
	      {origin: "+move", bias: -1}
	    ); },
	    goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
	    }, sel_move); },
	    goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      return cm.coordsChar({left: 0, top: top}, "div")
	    }, sel_move); },
	    goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
	      var top = cm.cursorCoords(range.head, "div").top + 5;
	      var pos = cm.coordsChar({left: 0, top: top}, "div");
	      if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
	      return pos
	    }, sel_move); },
	    goLineUp: function (cm) { return cm.moveV(-1, "line"); },
	    goLineDown: function (cm) { return cm.moveV(1, "line"); },
	    goPageUp: function (cm) { return cm.moveV(-1, "page"); },
	    goPageDown: function (cm) { return cm.moveV(1, "page"); },
	    goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
	    goCharRight: function (cm) { return cm.moveH(1, "char"); },
	    goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
	    goColumnRight: function (cm) { return cm.moveH(1, "column"); },
	    goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
	    goGroupRight: function (cm) { return cm.moveH(1, "group"); },
	    goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
	    goWordRight: function (cm) { return cm.moveH(1, "word"); },
	    delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
	    delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
	    delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
	    delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
	    delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
	    delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
	    indentAuto: function (cm) { return cm.indentSelection("smart"); },
	    indentMore: function (cm) { return cm.indentSelection("add"); },
	    indentLess: function (cm) { return cm.indentSelection("subtract"); },
	    insertTab: function (cm) { return cm.replaceSelection("\t"); },
	    insertSoftTab: function (cm) {
	      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
	      for (var i = 0; i < ranges.length; i++) {
	        var pos = ranges[i].from();
	        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
	        spaces.push(spaceStr(tabSize - col % tabSize));
	      }
	      cm.replaceSelections(spaces);
	    },
	    defaultTab: function (cm) {
	      if (cm.somethingSelected()) { cm.indentSelection("add"); }
	      else { cm.execCommand("insertTab"); }
	    },
	    // Swap the two chars left and right of each selection's head.
	    // Move cursor behind the two swapped characters afterwards.
	    //
	    // Doesn't consider line feeds a character.
	    // Doesn't scan more than one line above to find a character.
	    // Doesn't do anything on an empty line.
	    // Doesn't do anything with non-empty selections.
	    transposeChars: function (cm) { return runInOp(cm, function () {
	      var ranges = cm.listSelections(), newSel = [];
	      for (var i = 0; i < ranges.length; i++) {
	        if (!ranges[i].empty()) { continue }
	        var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
	        if (line) {
	          if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1); }
	          if (cur.ch > 0) {
	            cur = new Pos(cur.line, cur.ch + 1);
	            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
	                            Pos(cur.line, cur.ch - 2), cur, "+transpose");
	          } else if (cur.line > cm.doc.first) {
	            var prev = getLine(cm.doc, cur.line - 1).text;
	            if (prev) {
	              cur = new Pos(cur.line, 1);
	              cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
	                              prev.charAt(prev.length - 1),
	                              Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
	            }
	          }
	        }
	        newSel.push(new Range(cur, cur));
	      }
	      cm.setSelections(newSel);
	    }); },
	    newlineAndIndent: function (cm) { return runInOp(cm, function () {
	      var sels = cm.listSelections();
	      for (var i = sels.length - 1; i >= 0; i--)
	        { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input"); }
	      sels = cm.listSelections();
	      for (var i$1 = 0; i$1 < sels.length; i$1++)
	        { cm.indentLine(sels[i$1].from().line, null, true); }
	      ensureCursorVisible(cm);
	    }); },
	    openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
	    toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
	  };


	  function lineStart(cm, lineN) {
	    var line = getLine(cm.doc, lineN);
	    var visual = visualLine(line);
	    if (visual != line) { lineN = lineNo(visual); }
	    return endOfLine(true, cm, visual, lineN, 1)
	  }
	  function lineEnd(cm, lineN) {
	    var line = getLine(cm.doc, lineN);
	    var visual = visualLineEnd(line);
	    if (visual != line) { lineN = lineNo(visual); }
	    return endOfLine(true, cm, line, lineN, -1)
	  }
	  function lineStartSmart(cm, pos) {
	    var start = lineStart(cm, pos.line);
	    var line = getLine(cm.doc, start.line);
	    var order = getOrder(line, cm.doc.direction);
	    if (!order || order[0].level == 0) {
	      var firstNonWS = Math.max(0, line.text.search(/\S/));
	      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
	      return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
	    }
	    return start
	  }

	  // Run a handler that was bound to a key.
	  function doHandleBinding(cm, bound, dropShift) {
	    if (typeof bound == "string") {
	      bound = commands[bound];
	      if (!bound) { return false }
	    }
	    // Ensure previous input has been read, so that the handler sees a
	    // consistent view of the document
	    cm.display.input.ensurePolled();
	    var prevShift = cm.display.shift, done = false;
	    try {
	      if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
	      if (dropShift) { cm.display.shift = false; }
	      done = bound(cm) != Pass;
	    } finally {
	      cm.display.shift = prevShift;
	      cm.state.suppressEdits = false;
	    }
	    return done
	  }

	  function lookupKeyForEditor(cm, name, handle) {
	    for (var i = 0; i < cm.state.keyMaps.length; i++) {
	      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
	      if (result) { return result }
	    }
	    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
	      || lookupKey(name, cm.options.keyMap, handle, cm)
	  }

	  // Note that, despite the name, this function is also used to check
	  // for bound mouse clicks.

	  var stopSeq = new Delayed;

	  function dispatchKey(cm, name, e, handle) {
	    var seq = cm.state.keySeq;
	    if (seq) {
	      if (isModifierKey(name)) { return "handled" }
	      if (/\'$/.test(name))
	        { cm.state.keySeq = null; }
	      else
	        { stopSeq.set(50, function () {
	          if (cm.state.keySeq == seq) {
	            cm.state.keySeq = null;
	            cm.display.input.reset();
	          }
	        }); }
	      if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
	    }
	    return dispatchKeyInner(cm, name, e, handle)
	  }

	  function dispatchKeyInner(cm, name, e, handle) {
	    var result = lookupKeyForEditor(cm, name, handle);

	    if (result == "multi")
	      { cm.state.keySeq = name; }
	    if (result == "handled")
	      { signalLater(cm, "keyHandled", cm, name, e); }

	    if (result == "handled" || result == "multi") {
	      e_preventDefault(e);
	      restartBlink(cm);
	    }

	    return !!result
	  }

	  // Handle a key from the keydown event.
	  function handleKeyBinding(cm, e) {
	    var name = keyName(e, true);
	    if (!name) { return false }

	    if (e.shiftKey && !cm.state.keySeq) {
	      // First try to resolve full name (including 'Shift-'). Failing
	      // that, see if there is a cursor-motion command (starting with
	      // 'go') bound to the keyname without 'Shift-'.
	      return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
	          || dispatchKey(cm, name, e, function (b) {
	               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
	                 { return doHandleBinding(cm, b) }
	             })
	    } else {
	      return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
	    }
	  }

	  // Handle a key from the keypress event
	  function handleCharBinding(cm, e, ch) {
	    return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
	  }

	  var lastStoppedKey = null;
	  function onKeyDown(e) {
	    var cm = this;
	    cm.curOp.focus = activeElt();
	    if (signalDOMEvent(cm, e)) { return }
	    // IE does strange things with escape.
	    if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false; }
	    var code = e.keyCode;
	    cm.display.shift = code == 16 || e.shiftKey;
	    var handled = handleKeyBinding(cm, e);
	    if (presto) {
	      lastStoppedKey = handled ? code : null;
	      // Opera has no cut event... we try to at least catch the key combo
	      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
	        { cm.replaceSelection("", null, "cut"); }
	    }

	    // Turn mouse into crosshair when Alt is held on Mac.
	    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
	      { showCrossHair(cm); }
	  }

	  function showCrossHair(cm) {
	    var lineDiv = cm.display.lineDiv;
	    addClass(lineDiv, "CodeMirror-crosshair");

	    function up(e) {
	      if (e.keyCode == 18 || !e.altKey) {
	        rmClass(lineDiv, "CodeMirror-crosshair");
	        off(document, "keyup", up);
	        off(document, "mouseover", up);
	      }
	    }
	    on(document, "keyup", up);
	    on(document, "mouseover", up);
	  }

	  function onKeyUp(e) {
	    if (e.keyCode == 16) { this.doc.sel.shift = false; }
	    signalDOMEvent(this, e);
	  }

	  function onKeyPress(e) {
	    var cm = this;
	    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
	    var keyCode = e.keyCode, charCode = e.charCode;
	    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
	    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
	    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
	    // Some browsers fire keypress events for backspace
	    if (ch == "\x08") { return }
	    if (handleCharBinding(cm, e, ch)) { return }
	    cm.display.input.onKeyPress(e);
	  }

	  var DOUBLECLICK_DELAY = 400;

	  var PastClick = function(time, pos, button) {
	    this.time = time;
	    this.pos = pos;
	    this.button = button;
	  };

	  PastClick.prototype.compare = function (time, pos, button) {
	    return this.time + DOUBLECLICK_DELAY > time &&
	      cmp(pos, this.pos) == 0 && button == this.button
	  };

	  var lastClick, lastDoubleClick;
	  function clickRepeat(pos, button) {
	    var now = +new Date;
	    if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
	      lastClick = lastDoubleClick = null;
	      return "triple"
	    } else if (lastClick && lastClick.compare(now, pos, button)) {
	      lastDoubleClick = new PastClick(now, pos, button);
	      lastClick = null;
	      return "double"
	    } else {
	      lastClick = new PastClick(now, pos, button);
	      lastDoubleClick = null;
	      return "single"
	    }
	  }

	  // A mouse down can be a single click, double click, triple click,
	  // start of selection drag, start of text drag, new cursor
	  // (ctrl-click), rectangle drag (alt-drag), or xwin
	  // middle-click-paste. Or it might be a click on something we should
	  // not interfere with, such as a scrollbar or widget.
	  function onMouseDown(e) {
	    var cm = this, display = cm.display;
	    if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
	    display.input.ensurePolled();
	    display.shift = e.shiftKey;

	    if (eventInWidget(display, e)) {
	      if (!webkit) {
	        // Briefly turn off draggability, to allow widgets to do
	        // normal dragging things.
	        display.scroller.draggable = false;
	        setTimeout(function () { return display.scroller.draggable = true; }, 100);
	      }
	      return
	    }
	    if (clickInGutter(cm, e)) { return }
	    var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single";
	    window.focus();

	    // #3261: make sure, that we're not starting a second selection
	    if (button == 1 && cm.state.selectingText)
	      { cm.state.selectingText(e); }

	    if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

	    if (button == 1) {
	      if (pos) { leftButtonDown(cm, pos, repeat, e); }
	      else if (e_target(e) == display.scroller) { e_preventDefault(e); }
	    } else if (button == 2) {
	      if (pos) { extendSelection(cm.doc, pos); }
	      setTimeout(function () { return display.input.focus(); }, 20);
	    } else if (button == 3) {
	      if (captureRightClick) { cm.display.input.onContextMenu(e); }
	      else { delayBlurEvent(cm); }
	    }
	  }

	  function handleMappedButton(cm, button, pos, repeat, event) {
	    var name = "Click";
	    if (repeat == "double") { name = "Double" + name; }
	    else if (repeat == "triple") { name = "Triple" + name; }
	    name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

	    return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
	      if (typeof bound == "string") { bound = commands[bound]; }
	      if (!bound) { return false }
	      var done = false;
	      try {
	        if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
	        done = bound(cm, pos) != Pass;
	      } finally {
	        cm.state.suppressEdits = false;
	      }
	      return done
	    })
	  }

	  function configureMouse(cm, repeat, event) {
	    var option = cm.getOption("configureMouse");
	    var value = option ? option(cm, repeat, event) : {};
	    if (value.unit == null) {
	      var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
	      value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
	    }
	    if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey; }
	    if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey; }
	    if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey); }
	    return value
	  }

	  function leftButtonDown(cm, pos, repeat, event) {
	    if (ie) { setTimeout(bind(ensureFocus, cm), 0); }
	    else { cm.curOp.focus = activeElt(); }

	    var behavior = configureMouse(cm, repeat, event);

	    var sel = cm.doc.sel, contained;
	    if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
	        repeat == "single" && (contained = sel.contains(pos)) > -1 &&
	        (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
	        (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
	      { leftButtonStartDrag(cm, event, pos, behavior); }
	    else
	      { leftButtonSelect(cm, event, pos, behavior); }
	  }

	  // Start a text drag. When it ends, see if any dragging actually
	  // happen, and treat as a click if it didn't.
	  function leftButtonStartDrag(cm, event, pos, behavior) {
	    var display = cm.display, moved = false;
	    var dragEnd = operation(cm, function (e) {
	      if (webkit) { display.scroller.draggable = false; }
	      cm.state.draggingText = false;
	      off(display.wrapper.ownerDocument, "mouseup", dragEnd);
	      off(display.wrapper.ownerDocument, "mousemove", mouseMove);
	      off(display.scroller, "dragstart", dragStart);
	      off(display.scroller, "drop", dragEnd);
	      if (!moved) {
	        e_preventDefault(e);
	        if (!behavior.addNew)
	          { extendSelection(cm.doc, pos, null, null, behavior.extend); }
	        // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
	        if (webkit || ie && ie_version == 9)
	          { setTimeout(function () {display.wrapper.ownerDocument.body.focus(); display.input.focus();}, 20); }
	        else
	          { display.input.focus(); }
	      }
	    });
	    var mouseMove = function(e2) {
	      moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
	    };
	    var dragStart = function () { return moved = true; };
	    // Let the drag handler handle this.
	    if (webkit) { display.scroller.draggable = true; }
	    cm.state.draggingText = dragEnd;
	    dragEnd.copy = !behavior.moveOnDrag;
	    // IE's approach to draggable
	    if (display.scroller.dragDrop) { display.scroller.dragDrop(); }
	    on(display.wrapper.ownerDocument, "mouseup", dragEnd);
	    on(display.wrapper.ownerDocument, "mousemove", mouseMove);
	    on(display.scroller, "dragstart", dragStart);
	    on(display.scroller, "drop", dragEnd);

	    delayBlurEvent(cm);
	    setTimeout(function () { return display.input.focus(); }, 20);
	  }

	  function rangeForUnit(cm, pos, unit) {
	    if (unit == "char") { return new Range(pos, pos) }
	    if (unit == "word") { return cm.findWordAt(pos) }
	    if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
	    var result = unit(cm, pos);
	    return new Range(result.from, result.to)
	  }

	  // Normal selection, as opposed to text dragging.
	  function leftButtonSelect(cm, event, start, behavior) {
	    var display = cm.display, doc = cm.doc;
	    e_preventDefault(event);

	    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
	    if (behavior.addNew && !behavior.extend) {
	      ourIndex = doc.sel.contains(start);
	      if (ourIndex > -1)
	        { ourRange = ranges[ourIndex]; }
	      else
	        { ourRange = new Range(start, start); }
	    } else {
	      ourRange = doc.sel.primary();
	      ourIndex = doc.sel.primIndex;
	    }

	    if (behavior.unit == "rectangle") {
	      if (!behavior.addNew) { ourRange = new Range(start, start); }
	      start = posFromMouse(cm, event, true, true);
	      ourIndex = -1;
	    } else {
	      var range$$1 = rangeForUnit(cm, start, behavior.unit);
	      if (behavior.extend)
	        { ourRange = extendRange(ourRange, range$$1.anchor, range$$1.head, behavior.extend); }
	      else
	        { ourRange = range$$1; }
	    }

	    if (!behavior.addNew) {
	      ourIndex = 0;
	      setSelection(doc, new Selection([ourRange], 0), sel_mouse);
	      startSel = doc.sel;
	    } else if (ourIndex == -1) {
	      ourIndex = ranges.length;
	      setSelection(doc, normalizeSelection(cm, ranges.concat([ourRange]), ourIndex),
	                   {scroll: false, origin: "*mouse"});
	    } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
	      setSelection(doc, normalizeSelection(cm, ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
	                   {scroll: false, origin: "*mouse"});
	      startSel = doc.sel;
	    } else {
	      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
	    }

	    var lastPos = start;
	    function extendTo(pos) {
	      if (cmp(lastPos, pos) == 0) { return }
	      lastPos = pos;

	      if (behavior.unit == "rectangle") {
	        var ranges = [], tabSize = cm.options.tabSize;
	        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
	        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
	        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
	        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
	             line <= end; line++) {
	          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
	          if (left == right)
	            { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); }
	          else if (text.length > leftPos)
	            { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))); }
	        }
	        if (!ranges.length) { ranges.push(new Range(start, start)); }
	        setSelection(doc, normalizeSelection(cm, startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
	                     {origin: "*mouse", scroll: false});
	        cm.scrollIntoView(pos);
	      } else {
	        var oldRange = ourRange;
	        var range$$1 = rangeForUnit(cm, pos, behavior.unit);
	        var anchor = oldRange.anchor, head;
	        if (cmp(range$$1.anchor, anchor) > 0) {
	          head = range$$1.head;
	          anchor = minPos(oldRange.from(), range$$1.anchor);
	        } else {
	          head = range$$1.anchor;
	          anchor = maxPos(oldRange.to(), range$$1.head);
	        }
	        var ranges$1 = startSel.ranges.slice(0);
	        ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head));
	        setSelection(doc, normalizeSelection(cm, ranges$1, ourIndex), sel_mouse);
	      }
	    }

	    var editorSize = display.wrapper.getBoundingClientRect();
	    // Used to ensure timeout re-tries don't fire when another extend
	    // happened in the meantime (clearTimeout isn't reliable -- at
	    // least on Chrome, the timeouts still happen even when cleared,
	    // if the clear happens after their scheduled firing time).
	    var counter = 0;

	    function extend(e) {
	      var curCount = ++counter;
	      var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
	      if (!cur) { return }
	      if (cmp(cur, lastPos) != 0) {
	        cm.curOp.focus = activeElt();
	        extendTo(cur);
	        var visible = visibleLines(display, doc);
	        if (cur.line >= visible.to || cur.line < visible.from)
	          { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e); }}), 150); }
	      } else {
	        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
	        if (outside) { setTimeout(operation(cm, function () {
	          if (counter != curCount) { return }
	          display.scroller.scrollTop += outside;
	          extend(e);
	        }), 50); }
	      }
	    }

	    function done(e) {
	      cm.state.selectingText = false;
	      counter = Infinity;
	      // If e is null or undefined we interpret this as someone trying
	      // to explicitly cancel the selection rather than the user
	      // letting go of the mouse button.
	      if (e) {
	        e_preventDefault(e);
	        display.input.focus();
	      }
	      off(display.wrapper.ownerDocument, "mousemove", move);
	      off(display.wrapper.ownerDocument, "mouseup", up);
	      doc.history.lastSelOrigin = null;
	    }

	    var move = operation(cm, function (e) {
	      if (e.buttons === 0 || !e_button(e)) { done(e); }
	      else { extend(e); }
	    });
	    var up = operation(cm, done);
	    cm.state.selectingText = up;
	    on(display.wrapper.ownerDocument, "mousemove", move);
	    on(display.wrapper.ownerDocument, "mouseup", up);
	  }

	  // Used when mouse-selecting to adjust the anchor to the proper side
	  // of a bidi jump depending on the visual position of the head.
	  function bidiSimplify(cm, range$$1) {
	    var anchor = range$$1.anchor;
	    var head = range$$1.head;
	    var anchorLine = getLine(cm.doc, anchor.line);
	    if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range$$1 }
	    var order = getOrder(anchorLine);
	    if (!order) { return range$$1 }
	    var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index];
	    if (part.from != anchor.ch && part.to != anchor.ch) { return range$$1 }
	    var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1);
	    if (boundary == 0 || boundary == order.length) { return range$$1 }

	    // Compute the relative visual position of the head compared to the
	    // anchor (<0 is to the left, >0 to the right)
	    var leftSide;
	    if (head.line != anchor.line) {
	      leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
	    } else {
	      var headIndex = getBidiPartAt(order, head.ch, head.sticky);
	      var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
	      if (headIndex == boundary - 1 || headIndex == boundary)
	        { leftSide = dir < 0; }
	      else
	        { leftSide = dir > 0; }
	    }

	    var usePart = order[boundary + (leftSide ? -1 : 0)];
	    var from = leftSide == (usePart.level == 1);
	    var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before";
	    return anchor.ch == ch && anchor.sticky == sticky ? range$$1 : new Range(new Pos(anchor.line, ch, sticky), head)
	  }


	  // Determines whether an event happened in the gutter, and fires the
	  // handlers for the corresponding event.
	  function gutterEvent(cm, e, type, prevent) {
	    var mX, mY;
	    if (e.touches) {
	      mX = e.touches[0].clientX;
	      mY = e.touches[0].clientY;
	    } else {
	      try { mX = e.clientX; mY = e.clientY; }
	      catch(e) { return false }
	    }
	    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
	    if (prevent) { e_preventDefault(e); }

	    var display = cm.display;
	    var lineBox = display.lineDiv.getBoundingClientRect();

	    if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
	    mY -= lineBox.top - display.viewOffset;

	    for (var i = 0; i < cm.display.gutterSpecs.length; ++i) {
	      var g = display.gutters.childNodes[i];
	      if (g && g.getBoundingClientRect().right >= mX) {
	        var line = lineAtHeight(cm.doc, mY);
	        var gutter = cm.display.gutterSpecs[i];
	        signal(cm, type, cm, line, gutter.className, e);
	        return e_defaultPrevented(e)
	      }
	    }
	  }

	  function clickInGutter(cm, e) {
	    return gutterEvent(cm, e, "gutterClick", true)
	  }

	  // CONTEXT MENU HANDLING

	  // To make the context menu work, we need to briefly unhide the
	  // textarea (making it as unobtrusive as possible) to let the
	  // right-click take effect on it.
	  function onContextMenu(cm, e) {
	    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
	    if (signalDOMEvent(cm, e, "contextmenu")) { return }
	    if (!captureRightClick) { cm.display.input.onContextMenu(e); }
	  }

	  function contextMenuInGutter(cm, e) {
	    if (!hasHandler(cm, "gutterContextMenu")) { return false }
	    return gutterEvent(cm, e, "gutterContextMenu", false)
	  }

	  function themeChanged(cm) {
	    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
	      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
	    clearCaches(cm);
	  }

	  var Init = {toString: function(){return "CodeMirror.Init"}};

	  var defaults = {};
	  var optionHandlers = {};

	  function defineOptions(CodeMirror) {
	    var optionHandlers = CodeMirror.optionHandlers;

	    function option(name, deflt, handle, notOnInit) {
	      CodeMirror.defaults[name] = deflt;
	      if (handle) { optionHandlers[name] =
	        notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old); }} : handle; }
	    }

	    CodeMirror.defineOption = option;

	    // Passed to option handlers when there is no old value.
	    CodeMirror.Init = Init;

	    // These two are, on init, called from the constructor because they
	    // have to be initialized before the editor can start at all.
	    option("value", "", function (cm, val) { return cm.setValue(val); }, true);
	    option("mode", null, function (cm, val) {
	      cm.doc.modeOption = val;
	      loadMode(cm);
	    }, true);

	    option("indentUnit", 2, loadMode, true);
	    option("indentWithTabs", false);
	    option("smartIndent", true);
	    option("tabSize", 4, function (cm) {
	      resetModeState(cm);
	      clearCaches(cm);
	      regChange(cm);
	    }, true);

	    option("lineSeparator", null, function (cm, val) {
	      cm.doc.lineSep = val;
	      if (!val) { return }
	      var newBreaks = [], lineNo = cm.doc.first;
	      cm.doc.iter(function (line) {
	        for (var pos = 0;;) {
	          var found = line.text.indexOf(val, pos);
	          if (found == -1) { break }
	          pos = found + val.length;
	          newBreaks.push(Pos(lineNo, found));
	        }
	        lineNo++;
	      });
	      for (var i = newBreaks.length - 1; i >= 0; i--)
	        { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)); }
	    });
	    option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, function (cm, val, old) {
	      cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
	      if (old != Init) { cm.refresh(); }
	    });
	    option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true);
	    option("electricChars", true);
	    option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
	      throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
	    }, true);
	    option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true);
	    option("autocorrect", false, function (cm, val) { return cm.getInputField().autocorrect = val; }, true);
	    option("autocapitalize", false, function (cm, val) { return cm.getInputField().autocapitalize = val; }, true);
	    option("rtlMoveVisually", !windows);
	    option("wholeLineUpdateBefore", true);

	    option("theme", "default", function (cm) {
	      themeChanged(cm);
	      updateGutters(cm);
	    }, true);
	    option("keyMap", "default", function (cm, val, old) {
	      var next = getKeyMap(val);
	      var prev = old != Init && getKeyMap(old);
	      if (prev && prev.detach) { prev.detach(cm, next); }
	      if (next.attach) { next.attach(cm, prev || null); }
	    });
	    option("extraKeys", null);
	    option("configureMouse", null);

	    option("lineWrapping", false, wrappingChanged, true);
	    option("gutters", [], function (cm, val) {
	      cm.display.gutterSpecs = getGutters(val, cm.options.lineNumbers);
	      updateGutters(cm);
	    }, true);
	    option("fixedGutter", true, function (cm, val) {
	      cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
	      cm.refresh();
	    }, true);
	    option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true);
	    option("scrollbarStyle", "native", function (cm) {
	      initScrollbars(cm);
	      updateScrollbars(cm);
	      cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
	      cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
	    }, true);
	    option("lineNumbers", false, function (cm, val) {
	      cm.display.gutterSpecs = getGutters(cm.options.gutters, val);
	      updateGutters(cm);
	    }, true);
	    option("firstLineNumber", 1, updateGutters, true);
	    option("lineNumberFormatter", function (integer) { return integer; }, updateGutters, true);
	    option("showCursorWhenSelecting", false, updateSelection, true);

	    option("resetSelectionOnContextMenu", true);
	    option("lineWiseCopyCut", true);
	    option("pasteLinesPerSelection", true);
	    option("selectionsMayTouch", false);

	    option("readOnly", false, function (cm, val) {
	      if (val == "nocursor") {
	        onBlur(cm);
	        cm.display.input.blur();
	      }
	      cm.display.input.readOnlyChanged(val);
	    });
	    option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset(); }}, true);
	    option("dragDrop", true, dragDropChanged);
	    option("allowDropFileTypes", null);

	    option("cursorBlinkRate", 530);
	    option("cursorScrollMargin", 0);
	    option("cursorHeight", 1, updateSelection, true);
	    option("singleCursorHeightPerLine", true, updateSelection, true);
	    option("workTime", 100);
	    option("workDelay", 100);
	    option("flattenSpans", true, resetModeState, true);
	    option("addModeClass", false, resetModeState, true);
	    option("pollInterval", 100);
	    option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; });
	    option("historyEventDelay", 1250);
	    option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true);
	    option("maxHighlightLength", 10000, resetModeState, true);
	    option("moveInputWithCursor", true, function (cm, val) {
	      if (!val) { cm.display.input.resetPosition(); }
	    });

	    option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; });
	    option("autofocus", null);
	    option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true);
	    option("phrases", null);
	  }

	  function dragDropChanged(cm, value, old) {
	    var wasOn = old && old != Init;
	    if (!value != !wasOn) {
	      var funcs = cm.display.dragFunctions;
	      var toggle = value ? on : off;
	      toggle(cm.display.scroller, "dragstart", funcs.start);
	      toggle(cm.display.scroller, "dragenter", funcs.enter);
	      toggle(cm.display.scroller, "dragover", funcs.over);
	      toggle(cm.display.scroller, "dragleave", funcs.leave);
	      toggle(cm.display.scroller, "drop", funcs.drop);
	    }
	  }

	  function wrappingChanged(cm) {
	    if (cm.options.lineWrapping) {
	      addClass(cm.display.wrapper, "CodeMirror-wrap");
	      cm.display.sizer.style.minWidth = "";
	      cm.display.sizerWidth = null;
	    } else {
	      rmClass(cm.display.wrapper, "CodeMirror-wrap");
	      findMaxLine(cm);
	    }
	    estimateLineHeights(cm);
	    regChange(cm);
	    clearCaches(cm);
	    setTimeout(function () { return updateScrollbars(cm); }, 100);
	  }

	  // A CodeMirror instance represents an editor. This is the object
	  // that user code is usually dealing with.

	  function CodeMirror(place, options) {
	    var this$1 = this;

	    if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

	    this.options = options = options ? copyObj(options) : {};
	    // Determine effective options based on given values and defaults.
	    copyObj(defaults, options, false);

	    var doc = options.value;
	    if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction); }
	    else if (options.mode) { doc.modeOption = options.mode; }
	    this.doc = doc;

	    var input = new CodeMirror.inputStyles[options.inputStyle](this);
	    var display = this.display = new Display(place, doc, input, options);
	    display.wrapper.CodeMirror = this;
	    themeChanged(this);
	    if (options.lineWrapping)
	      { this.display.wrapper.className += " CodeMirror-wrap"; }
	    initScrollbars(this);

	    this.state = {
	      keyMaps: [],  // stores maps added by addKeyMap
	      overlays: [], // highlighting overlays, as added by addOverlay
	      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
	      overwrite: false,
	      delayingBlurEvent: false,
	      focused: false,
	      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
	      pasteIncoming: -1, cutIncoming: -1, // help recognize paste/cut edits in input.poll
	      selectingText: false,
	      draggingText: false,
	      highlight: new Delayed(), // stores highlight worker timeout
	      keySeq: null,  // Unfinished key sequence
	      specialChars: null
	    };

	    if (options.autofocus && !mobile) { display.input.focus(); }

	    // Override magic textarea content restore that IE sometimes does
	    // on our hidden textarea on reload
	    if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20); }

	    registerEventHandlers(this);
	    ensureGlobalHandlers();

	    startOperation(this);
	    this.curOp.forceUpdate = true;
	    attachDoc(this, doc);

	    if ((options.autofocus && !mobile) || this.hasFocus())
	      { setTimeout(bind(onFocus, this), 20); }
	    else
	      { onBlur(this); }

	    for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
	      { optionHandlers[opt](this$1, options[opt], Init); } }
	    maybeUpdateLineNumberWidth(this);
	    if (options.finishInit) { options.finishInit(this); }
	    for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1); }
	    endOperation(this);
	    // Suppress optimizelegibility in Webkit, since it breaks text
	    // measuring on line wrapping boundaries.
	    if (webkit && options.lineWrapping &&
	        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
	      { display.lineDiv.style.textRendering = "auto"; }
	  }

	  // The default configuration options.
	  CodeMirror.defaults = defaults;
	  // Functions to run when options are changed.
	  CodeMirror.optionHandlers = optionHandlers;

	  // Attach the necessary event handlers when initializing the editor
	  function registerEventHandlers(cm) {
	    var d = cm.display;
	    on(d.scroller, "mousedown", operation(cm, onMouseDown));
	    // Older IE's will not fire a second mousedown for a double click
	    if (ie && ie_version < 11)
	      { on(d.scroller, "dblclick", operation(cm, function (e) {
	        if (signalDOMEvent(cm, e)) { return }
	        var pos = posFromMouse(cm, e);
	        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
	        e_preventDefault(e);
	        var word = cm.findWordAt(pos);
	        extendSelection(cm.doc, word.anchor, word.head);
	      })); }
	    else
	      { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }); }
	    // Some browsers fire contextmenu *after* opening the menu, at
	    // which point we can't mess with it anymore. Context menu is
	    // handled in onMouseDown for these browsers.
	    on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); });

	    // Used to suppress mouse event handling when a touch happens
	    var touchFinished, prevTouch = {end: 0};
	    function finishTouch() {
	      if (d.activeTouch) {
	        touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000);
	        prevTouch = d.activeTouch;
	        prevTouch.end = +new Date;
	      }
	    }
	    function isMouseLikeTouchEvent(e) {
	      if (e.touches.length != 1) { return false }
	      var touch = e.touches[0];
	      return touch.radiusX <= 1 && touch.radiusY <= 1
	    }
	    function farAway(touch, other) {
	      if (other.left == null) { return true }
	      var dx = other.left - touch.left, dy = other.top - touch.top;
	      return dx * dx + dy * dy > 20 * 20
	    }
	    on(d.scroller, "touchstart", function (e) {
	      if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
	        d.input.ensurePolled();
	        clearTimeout(touchFinished);
	        var now = +new Date;
	        d.activeTouch = {start: now, moved: false,
	                         prev: now - prevTouch.end <= 300 ? prevTouch : null};
	        if (e.touches.length == 1) {
	          d.activeTouch.left = e.touches[0].pageX;
	          d.activeTouch.top = e.touches[0].pageY;
	        }
	      }
	    });
	    on(d.scroller, "touchmove", function () {
	      if (d.activeTouch) { d.activeTouch.moved = true; }
	    });
	    on(d.scroller, "touchend", function (e) {
	      var touch = d.activeTouch;
	      if (touch && !eventInWidget(d, e) && touch.left != null &&
	          !touch.moved && new Date - touch.start < 300) {
	        var pos = cm.coordsChar(d.activeTouch, "page"), range;
	        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
	          { range = new Range(pos, pos); }
	        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
	          { range = cm.findWordAt(pos); }
	        else // Triple tap
	          { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))); }
	        cm.setSelection(range.anchor, range.head);
	        cm.focus();
	        e_preventDefault(e);
	      }
	      finishTouch();
	    });
	    on(d.scroller, "touchcancel", finishTouch);

	    // Sync scrolling between fake scrollbars and real scrollable
	    // area, ensure viewport is updated when scrolling.
	    on(d.scroller, "scroll", function () {
	      if (d.scroller.clientHeight) {
	        updateScrollTop(cm, d.scroller.scrollTop);
	        setScrollLeft(cm, d.scroller.scrollLeft, true);
	        signal(cm, "scroll", cm);
	      }
	    });

	    // Listen to wheel events in order to try and update the viewport on time.
	    on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); });
	    on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); });

	    // Prevent wrapper from ever scrolling
	    on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

	    d.dragFunctions = {
	      enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e); }},
	      over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e); }},
	      start: function (e) { return onDragStart(cm, e); },
	      drop: operation(cm, onDrop),
	      leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm); }}
	    };

	    var inp = d.input.getField();
	    on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); });
	    on(inp, "keydown", operation(cm, onKeyDown));
	    on(inp, "keypress", operation(cm, onKeyPress));
	    on(inp, "focus", function (e) { return onFocus(cm, e); });
	    on(inp, "blur", function (e) { return onBlur(cm, e); });
	  }

	  var initHooks = [];
	  CodeMirror.defineInitHook = function (f) { return initHooks.push(f); };

	  // Indent the given line. The how parameter can be "smart",
	  // "add"/null, "subtract", or "prev". When aggressive is false
	  // (typically set to true for forced single-line indents), empty
	  // lines are not indented, and places where the mode returns Pass
	  // are left alone.
	  function indentLine(cm, n, how, aggressive) {
	    var doc = cm.doc, state;
	    if (how == null) { how = "add"; }
	    if (how == "smart") {
	      // Fall back to "prev" when the mode doesn't have an indentation
	      // method.
	      if (!doc.mode.indent) { how = "prev"; }
	      else { state = getContextBefore(cm, n).state; }
	    }

	    var tabSize = cm.options.tabSize;
	    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
	    if (line.stateAfter) { line.stateAfter = null; }
	    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
	    if (!aggressive && !/\S/.test(line.text)) {
	      indentation = 0;
	      how = "not";
	    } else if (how == "smart") {
	      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
	      if (indentation == Pass || indentation > 150) {
	        if (!aggressive) { return }
	        how = "prev";
	      }
	    }
	    if (how == "prev") {
	      if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize); }
	      else { indentation = 0; }
	    } else if (how == "add") {
	      indentation = curSpace + cm.options.indentUnit;
	    } else if (how == "subtract") {
	      indentation = curSpace - cm.options.indentUnit;
	    } else if (typeof how == "number") {
	      indentation = curSpace + how;
	    }
	    indentation = Math.max(0, indentation);

	    var indentString = "", pos = 0;
	    if (cm.options.indentWithTabs)
	      { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";} }
	    if (pos < indentation) { indentString += spaceStr(indentation - pos); }

	    if (indentString != curSpaceString) {
	      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
	      line.stateAfter = null;
	      return true
	    } else {
	      // Ensure that, if the cursor was in the whitespace at the start
	      // of the line, it is moved to the end of that space.
	      for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
	        var range = doc.sel.ranges[i$1];
	        if (range.head.line == n && range.head.ch < curSpaceString.length) {
	          var pos$1 = Pos(n, curSpaceString.length);
	          replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
	          break
	        }
	      }
	    }
	  }

	  // This will be set to a {lineWise: bool, text: [string]} object, so
	  // that, when pasting, we know what kind of selections the copied
	  // text was made out of.
	  var lastCopied = null;

	  function setLastCopied(newLastCopied) {
	    lastCopied = newLastCopied;
	  }

	  function applyTextInput(cm, inserted, deleted, sel, origin) {
	    var doc = cm.doc;
	    cm.display.shift = false;
	    if (!sel) { sel = doc.sel; }

	    var recent = +new Date - 200;
	    var paste = origin == "paste" || cm.state.pasteIncoming > recent;
	    var textLines = splitLinesAuto(inserted), multiPaste = null;
	    // When pasting N lines into N selections, insert one line per selection
	    if (paste && sel.ranges.length > 1) {
	      if (lastCopied && lastCopied.text.join("\n") == inserted) {
	        if (sel.ranges.length % lastCopied.text.length == 0) {
	          multiPaste = [];
	          for (var i = 0; i < lastCopied.text.length; i++)
	            { multiPaste.push(doc.splitLines(lastCopied.text[i])); }
	        }
	      } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
	        multiPaste = map(textLines, function (l) { return [l]; });
	      }
	    }

	    var updateInput = cm.curOp.updateInput;
	    // Normal behavior is to insert the new text into every selection
	    for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
	      var range$$1 = sel.ranges[i$1];
	      var from = range$$1.from(), to = range$$1.to();
	      if (range$$1.empty()) {
	        if (deleted && deleted > 0) // Handle deletion
	          { from = Pos(from.line, from.ch - deleted); }
	        else if (cm.state.overwrite && !paste) // Handle overwrite
	          { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)); }
	        else if (paste && lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
	          { from = to = Pos(from.line, 0); }
	      }
	      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
	                         origin: origin || (paste ? "paste" : cm.state.cutIncoming > recent ? "cut" : "+input")};
	      makeChange(cm.doc, changeEvent);
	      signalLater(cm, "inputRead", cm, changeEvent);
	    }
	    if (inserted && !paste)
	      { triggerElectric(cm, inserted); }

	    ensureCursorVisible(cm);
	    if (cm.curOp.updateInput < 2) { cm.curOp.updateInput = updateInput; }
	    cm.curOp.typing = true;
	    cm.state.pasteIncoming = cm.state.cutIncoming = -1;
	  }

	  function handlePaste(e, cm) {
	    var pasted = e.clipboardData && e.clipboardData.getData("Text");
	    if (pasted) {
	      e.preventDefault();
	      if (!cm.isReadOnly() && !cm.options.disableInput)
	        { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }); }
	      return true
	    }
	  }

	  function triggerElectric(cm, inserted) {
	    // When an 'electric' character is inserted, immediately trigger a reindent
	    if (!cm.options.electricChars || !cm.options.smartIndent) { return }
	    var sel = cm.doc.sel;

	    for (var i = sel.ranges.length - 1; i >= 0; i--) {
	      var range$$1 = sel.ranges[i];
	      if (range$$1.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range$$1.head.line)) { continue }
	      var mode = cm.getModeAt(range$$1.head);
	      var indented = false;
	      if (mode.electricChars) {
	        for (var j = 0; j < mode.electricChars.length; j++)
	          { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
	            indented = indentLine(cm, range$$1.head.line, "smart");
	            break
	          } }
	      } else if (mode.electricInput) {
	        if (mode.electricInput.test(getLine(cm.doc, range$$1.head.line).text.slice(0, range$$1.head.ch)))
	          { indented = indentLine(cm, range$$1.head.line, "smart"); }
	      }
	      if (indented) { signalLater(cm, "electricInput", cm, range$$1.head.line); }
	    }
	  }

	  function copyableRanges(cm) {
	    var text = [], ranges = [];
	    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
	      var line = cm.doc.sel.ranges[i].head.line;
	      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
	      ranges.push(lineRange);
	      text.push(cm.getRange(lineRange.anchor, lineRange.head));
	    }
	    return {text: text, ranges: ranges}
	  }

	  function disableBrowserMagic(field, spellcheck, autocorrect, autocapitalize) {
	    field.setAttribute("autocorrect", autocorrect ? "" : "off");
	    field.setAttribute("autocapitalize", autocapitalize ? "" : "off");
	    field.setAttribute("spellcheck", !!spellcheck);
	  }

	  function hiddenTextarea() {
	    var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
	    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
	    // The textarea is kept positioned near the cursor to prevent the
	    // fact that it'll be scrolled into view on input from scrolling
	    // our fake cursor out of view. On webkit, when wrap=off, paste is
	    // very slow. So make the area wide instead.
	    if (webkit) { te.style.width = "1000px"; }
	    else { te.setAttribute("wrap", "off"); }
	    // If border: 0; -- iOS fails to open keyboard (issue #1287)
	    if (ios) { te.style.border = "1px solid black"; }
	    disableBrowserMagic(te);
	    return div
	  }

	  // The publicly visible API. Note that methodOp(f) means
	  // 'wrap f in an operation, performed on its `this` parameter'.

	  // This is not the complete set of editor methods. Most of the
	  // methods defined on the Doc type are also injected into
	  // CodeMirror.prototype, for backwards compatibility and
	  // convenience.

	  function addEditorMethods(CodeMirror) {
	    var optionHandlers = CodeMirror.optionHandlers;

	    var helpers = CodeMirror.helpers = {};

	    CodeMirror.prototype = {
	      constructor: CodeMirror,
	      focus: function(){window.focus(); this.display.input.focus();},

	      setOption: function(option, value) {
	        var options = this.options, old = options[option];
	        if (options[option] == value && option != "mode") { return }
	        options[option] = value;
	        if (optionHandlers.hasOwnProperty(option))
	          { operation(this, optionHandlers[option])(this, value, old); }
	        signal(this, "optionChange", this, option);
	      },

	      getOption: function(option) {return this.options[option]},
	      getDoc: function() {return this.doc},

	      addKeyMap: function(map$$1, bottom) {
	        this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map$$1));
	      },
	      removeKeyMap: function(map$$1) {
	        var maps = this.state.keyMaps;
	        for (var i = 0; i < maps.length; ++i)
	          { if (maps[i] == map$$1 || maps[i].name == map$$1) {
	            maps.splice(i, 1);
	            return true
	          } }
	      },

	      addOverlay: methodOp(function(spec, options) {
	        var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
	        if (mode.startState) { throw new Error("Overlays may not be stateful.") }
	        insertSorted(this.state.overlays,
	                     {mode: mode, modeSpec: spec, opaque: options && options.opaque,
	                      priority: (options && options.priority) || 0},
	                     function (overlay) { return overlay.priority; });
	        this.state.modeGen++;
	        regChange(this);
	      }),
	      removeOverlay: methodOp(function(spec) {
	        var this$1 = this;

	        var overlays = this.state.overlays;
	        for (var i = 0; i < overlays.length; ++i) {
	          var cur = overlays[i].modeSpec;
	          if (cur == spec || typeof spec == "string" && cur.name == spec) {
	            overlays.splice(i, 1);
	            this$1.state.modeGen++;
	            regChange(this$1);
	            return
	          }
	        }
	      }),

	      indentLine: methodOp(function(n, dir, aggressive) {
	        if (typeof dir != "string" && typeof dir != "number") {
	          if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev"; }
	          else { dir = dir ? "add" : "subtract"; }
	        }
	        if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive); }
	      }),
	      indentSelection: methodOp(function(how) {
	        var this$1 = this;

	        var ranges = this.doc.sel.ranges, end = -1;
	        for (var i = 0; i < ranges.length; i++) {
	          var range$$1 = ranges[i];
	          if (!range$$1.empty()) {
	            var from = range$$1.from(), to = range$$1.to();
	            var start = Math.max(end, from.line);
	            end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
	            for (var j = start; j < end; ++j)
	              { indentLine(this$1, j, how); }
	            var newRanges = this$1.doc.sel.ranges;
	            if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
	              { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll); }
	          } else if (range$$1.head.line > end) {
	            indentLine(this$1, range$$1.head.line, how, true);
	            end = range$$1.head.line;
	            if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1); }
	          }
	        }
	      }),

	      // Fetch the parser token for a given character. Useful for hacks
	      // that want to inspect the mode state (say, for completion).
	      getTokenAt: function(pos, precise) {
	        return takeToken(this, pos, precise)
	      },

	      getLineTokens: function(line, precise) {
	        return takeToken(this, Pos(line), precise, true)
	      },

	      getTokenTypeAt: function(pos) {
	        pos = clipPos(this.doc, pos);
	        var styles = getLineStyles(this, getLine(this.doc, pos.line));
	        var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
	        var type;
	        if (ch == 0) { type = styles[2]; }
	        else { for (;;) {
	          var mid = (before + after) >> 1;
	          if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid; }
	          else if (styles[mid * 2 + 1] < ch) { before = mid + 1; }
	          else { type = styles[mid * 2 + 2]; break }
	        } }
	        var cut = type ? type.indexOf("overlay ") : -1;
	        return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
	      },

	      getModeAt: function(pos) {
	        var mode = this.doc.mode;
	        if (!mode.innerMode) { return mode }
	        return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
	      },

	      getHelper: function(pos, type) {
	        return this.getHelpers(pos, type)[0]
	      },

	      getHelpers: function(pos, type) {
	        var this$1 = this;

	        var found = [];
	        if (!helpers.hasOwnProperty(type)) { return found }
	        var help = helpers[type], mode = this.getModeAt(pos);
	        if (typeof mode[type] == "string") {
	          if (help[mode[type]]) { found.push(help[mode[type]]); }
	        } else if (mode[type]) {
	          for (var i = 0; i < mode[type].length; i++) {
	            var val = help[mode[type][i]];
	            if (val) { found.push(val); }
	          }
	        } else if (mode.helperType && help[mode.helperType]) {
	          found.push(help[mode.helperType]);
	        } else if (help[mode.name]) {
	          found.push(help[mode.name]);
	        }
	        for (var i$1 = 0; i$1 < help._global.length; i$1++) {
	          var cur = help._global[i$1];
	          if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
	            { found.push(cur.val); }
	        }
	        return found
	      },

	      getStateAfter: function(line, precise) {
	        var doc = this.doc;
	        line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
	        return getContextBefore(this, line + 1, precise).state
	      },

	      cursorCoords: function(start, mode) {
	        var pos, range$$1 = this.doc.sel.primary();
	        if (start == null) { pos = range$$1.head; }
	        else if (typeof start == "object") { pos = clipPos(this.doc, start); }
	        else { pos = start ? range$$1.from() : range$$1.to(); }
	        return cursorCoords(this, pos, mode || "page")
	      },

	      charCoords: function(pos, mode) {
	        return charCoords(this, clipPos(this.doc, pos), mode || "page")
	      },

	      coordsChar: function(coords, mode) {
	        coords = fromCoordSystem(this, coords, mode || "page");
	        return coordsChar(this, coords.left, coords.top)
	      },

	      lineAtHeight: function(height, mode) {
	        height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
	        return lineAtHeight(this.doc, height + this.display.viewOffset)
	      },
	      heightAtLine: function(line, mode, includeWidgets) {
	        var end = false, lineObj;
	        if (typeof line == "number") {
	          var last = this.doc.first + this.doc.size - 1;
	          if (line < this.doc.first) { line = this.doc.first; }
	          else if (line > last) { line = last; end = true; }
	          lineObj = getLine(this.doc, line);
	        } else {
	          lineObj = line;
	        }
	        return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
	          (end ? this.doc.height - heightAtLine(lineObj) : 0)
	      },

	      defaultTextHeight: function() { return textHeight(this.display) },
	      defaultCharWidth: function() { return charWidth(this.display) },

	      getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

	      addWidget: function(pos, node, scroll, vert, horiz) {
	        var display = this.display;
	        pos = cursorCoords(this, clipPos(this.doc, pos));
	        var top = pos.bottom, left = pos.left;
	        node.style.position = "absolute";
	        node.setAttribute("cm-ignore-events", "true");
	        this.display.input.setUneditable(node);
	        display.sizer.appendChild(node);
	        if (vert == "over") {
	          top = pos.top;
	        } else if (vert == "above" || vert == "near") {
	          var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
	          hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
	          // Default to positioning above (if specified and possible); otherwise default to positioning below
	          if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
	            { top = pos.top - node.offsetHeight; }
	          else if (pos.bottom + node.offsetHeight <= vspace)
	            { top = pos.bottom; }
	          if (left + node.offsetWidth > hspace)
	            { left = hspace - node.offsetWidth; }
	        }
	        node.style.top = top + "px";
	        node.style.left = node.style.right = "";
	        if (horiz == "right") {
	          left = display.sizer.clientWidth - node.offsetWidth;
	          node.style.right = "0px";
	        } else {
	          if (horiz == "left") { left = 0; }
	          else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2; }
	          node.style.left = left + "px";
	        }
	        if (scroll)
	          { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}); }
	      },

	      triggerOnKeyDown: methodOp(onKeyDown),
	      triggerOnKeyPress: methodOp(onKeyPress),
	      triggerOnKeyUp: onKeyUp,
	      triggerOnMouseDown: methodOp(onMouseDown),

	      execCommand: function(cmd) {
	        if (commands.hasOwnProperty(cmd))
	          { return commands[cmd].call(null, this) }
	      },

	      triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

	      findPosH: function(from, amount, unit, visually) {
	        var this$1 = this;

	        var dir = 1;
	        if (amount < 0) { dir = -1; amount = -amount; }
	        var cur = clipPos(this.doc, from);
	        for (var i = 0; i < amount; ++i) {
	          cur = findPosH(this$1.doc, cur, dir, unit, visually);
	          if (cur.hitSide) { break }
	        }
	        return cur
	      },

	      moveH: methodOp(function(dir, unit) {
	        var this$1 = this;

	        this.extendSelectionsBy(function (range$$1) {
	          if (this$1.display.shift || this$1.doc.extend || range$$1.empty())
	            { return findPosH(this$1.doc, range$$1.head, dir, unit, this$1.options.rtlMoveVisually) }
	          else
	            { return dir < 0 ? range$$1.from() : range$$1.to() }
	        }, sel_move);
	      }),

	      deleteH: methodOp(function(dir, unit) {
	        var sel = this.doc.sel, doc = this.doc;
	        if (sel.somethingSelected())
	          { doc.replaceSelection("", null, "+delete"); }
	        else
	          { deleteNearSelection(this, function (range$$1) {
	            var other = findPosH(doc, range$$1.head, dir, unit, false);
	            return dir < 0 ? {from: other, to: range$$1.head} : {from: range$$1.head, to: other}
	          }); }
	      }),

	      findPosV: function(from, amount, unit, goalColumn) {
	        var this$1 = this;

	        var dir = 1, x = goalColumn;
	        if (amount < 0) { dir = -1; amount = -amount; }
	        var cur = clipPos(this.doc, from);
	        for (var i = 0; i < amount; ++i) {
	          var coords = cursorCoords(this$1, cur, "div");
	          if (x == null) { x = coords.left; }
	          else { coords.left = x; }
	          cur = findPosV(this$1, coords, dir, unit);
	          if (cur.hitSide) { break }
	        }
	        return cur
	      },

	      moveV: methodOp(function(dir, unit) {
	        var this$1 = this;

	        var doc = this.doc, goals = [];
	        var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
	        doc.extendSelectionsBy(function (range$$1) {
	          if (collapse)
	            { return dir < 0 ? range$$1.from() : range$$1.to() }
	          var headPos = cursorCoords(this$1, range$$1.head, "div");
	          if (range$$1.goalColumn != null) { headPos.left = range$$1.goalColumn; }
	          goals.push(headPos.left);
	          var pos = findPosV(this$1, headPos, dir, unit);
	          if (unit == "page" && range$$1 == doc.sel.primary())
	            { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top); }
	          return pos
	        }, sel_move);
	        if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
	          { doc.sel.ranges[i].goalColumn = goals[i]; } }
	      }),

	      // Find the word at the given position (as returned by coordsChar).
	      findWordAt: function(pos) {
	        var doc = this.doc, line = getLine(doc, pos.line).text;
	        var start = pos.ch, end = pos.ch;
	        if (line) {
	          var helper = this.getHelper(pos, "wordChars");
	          if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end; }
	          var startChar = line.charAt(start);
	          var check = isWordChar(startChar, helper)
	            ? function (ch) { return isWordChar(ch, helper); }
	            : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
	            : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); };
	          while (start > 0 && check(line.charAt(start - 1))) { --start; }
	          while (end < line.length && check(line.charAt(end))) { ++end; }
	        }
	        return new Range(Pos(pos.line, start), Pos(pos.line, end))
	      },

	      toggleOverwrite: function(value) {
	        if (value != null && value == this.state.overwrite) { return }
	        if (this.state.overwrite = !this.state.overwrite)
	          { addClass(this.display.cursorDiv, "CodeMirror-overwrite"); }
	        else
	          { rmClass(this.display.cursorDiv, "CodeMirror-overwrite"); }

	        signal(this, "overwriteToggle", this, this.state.overwrite);
	      },
	      hasFocus: function() { return this.display.input.getField() == activeElt() },
	      isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

	      scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y); }),
	      getScrollInfo: function() {
	        var scroller = this.display.scroller;
	        return {left: scroller.scrollLeft, top: scroller.scrollTop,
	                height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
	                width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
	                clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
	      },

	      scrollIntoView: methodOp(function(range$$1, margin) {
	        if (range$$1 == null) {
	          range$$1 = {from: this.doc.sel.primary().head, to: null};
	          if (margin == null) { margin = this.options.cursorScrollMargin; }
	        } else if (typeof range$$1 == "number") {
	          range$$1 = {from: Pos(range$$1, 0), to: null};
	        } else if (range$$1.from == null) {
	          range$$1 = {from: range$$1, to: null};
	        }
	        if (!range$$1.to) { range$$1.to = range$$1.from; }
	        range$$1.margin = margin || 0;

	        if (range$$1.from.line != null) {
	          scrollToRange(this, range$$1);
	        } else {
	          scrollToCoordsRange(this, range$$1.from, range$$1.to, range$$1.margin);
	        }
	      }),

	      setSize: methodOp(function(width, height) {
	        var this$1 = this;

	        var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
	        if (width != null) { this.display.wrapper.style.width = interpret(width); }
	        if (height != null) { this.display.wrapper.style.height = interpret(height); }
	        if (this.options.lineWrapping) { clearLineMeasurementCache(this); }
	        var lineNo$$1 = this.display.viewFrom;
	        this.doc.iter(lineNo$$1, this.display.viewTo, function (line) {
	          if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
	            { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo$$1, "widget"); break } } }
	          ++lineNo$$1;
	        });
	        this.curOp.forceUpdate = true;
	        signal(this, "refresh", this);
	      }),

	      operation: function(f){return runInOp(this, f)},
	      startOperation: function(){return startOperation(this)},
	      endOperation: function(){return endOperation(this)},

	      refresh: methodOp(function() {
	        var oldHeight = this.display.cachedTextHeight;
	        regChange(this);
	        this.curOp.forceUpdate = true;
	        clearCaches(this);
	        scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
	        updateGutterSpace(this.display);
	        if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
	          { estimateLineHeights(this); }
	        signal(this, "refresh", this);
	      }),

	      swapDoc: methodOp(function(doc) {
	        var old = this.doc;
	        old.cm = null;
	        // Cancel the current text selection if any (#5821)
	        if (this.state.selectingText) { this.state.selectingText(); }
	        attachDoc(this, doc);
	        clearCaches(this);
	        this.display.input.reset();
	        scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
	        this.curOp.forceScroll = true;
	        signalLater(this, "swapDoc", this, old);
	        return old
	      }),

	      phrase: function(phraseText) {
	        var phrases = this.options.phrases;
	        return phrases && Object.prototype.hasOwnProperty.call(phrases, phraseText) ? phrases[phraseText] : phraseText
	      },

	      getInputField: function(){return this.display.input.getField()},
	      getWrapperElement: function(){return this.display.wrapper},
	      getScrollerElement: function(){return this.display.scroller},
	      getGutterElement: function(){return this.display.gutters}
	    };
	    eventMixin(CodeMirror);

	    CodeMirror.registerHelper = function(type, name, value) {
	      if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []}; }
	      helpers[type][name] = value;
	    };
	    CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
	      CodeMirror.registerHelper(type, name, value);
	      helpers[type]._global.push({pred: predicate, val: value});
	    };
	  }

	  // Used for horizontal relative motion. Dir is -1 or 1 (left or
	  // right), unit can be "char", "column" (like char, but doesn't
	  // cross line boundaries), "word" (across next word), or "group" (to
	  // the start of next group of word or non-word-non-whitespace
	  // chars). The visually param controls whether, in right-to-left
	  // text, direction 1 means to move towards the next index in the
	  // string, or towards the character to the right of the current
	  // position. The resulting position will have a hitSide=true
	  // property if it reached the end of the document.
	  function findPosH(doc, pos, dir, unit, visually) {
	    var oldPos = pos;
	    var origDir = dir;
	    var lineObj = getLine(doc, pos.line);
	    function findNextLine() {
	      var l = pos.line + dir;
	      if (l < doc.first || l >= doc.first + doc.size) { return false }
	      pos = new Pos(l, pos.ch, pos.sticky);
	      return lineObj = getLine(doc, l)
	    }
	    function moveOnce(boundToLine) {
	      var next;
	      if (visually) {
	        next = moveVisually(doc.cm, lineObj, pos, dir);
	      } else {
	        next = moveLogically(lineObj, pos, dir);
	      }
	      if (next == null) {
	        if (!boundToLine && findNextLine())
	          { pos = endOfLine(visually, doc.cm, lineObj, pos.line, dir); }
	        else
	          { return false }
	      } else {
	        pos = next;
	      }
	      return true
	    }

	    if (unit == "char") {
	      moveOnce();
	    } else if (unit == "column") {
	      moveOnce(true);
	    } else if (unit == "word" || unit == "group") {
	      var sawType = null, group = unit == "group";
	      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
	      for (var first = true;; first = false) {
	        if (dir < 0 && !moveOnce(!first)) { break }
	        var cur = lineObj.text.charAt(pos.ch) || "\n";
	        var type = isWordChar(cur, helper) ? "w"
	          : group && cur == "\n" ? "n"
	          : !group || /\s/.test(cur) ? null
	          : "p";
	        if (group && !first && !type) { type = "s"; }
	        if (sawType && sawType != type) {
	          if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after";}
	          break
	        }

	        if (type) { sawType = type; }
	        if (dir > 0 && !moveOnce(!first)) { break }
	      }
	    }
	    var result = skipAtomic(doc, pos, oldPos, origDir, true);
	    if (equalCursorPos(oldPos, result)) { result.hitSide = true; }
	    return result
	  }

	  // For relative vertical movement. Dir may be -1 or 1. Unit can be
	  // "page" or "line". The resulting position will have a hitSide=true
	  // property if it reached the end of the document.
	  function findPosV(cm, pos, dir, unit) {
	    var doc = cm.doc, x = pos.left, y;
	    if (unit == "page") {
	      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
	      var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
	      y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;

	    } else if (unit == "line") {
	      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
	    }
	    var target;
	    for (;;) {
	      target = coordsChar(cm, x, y);
	      if (!target.outside) { break }
	      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
	      y += dir * 5;
	    }
	    return target
	  }

	  // CONTENTEDITABLE INPUT STYLE

	  var ContentEditableInput = function(cm) {
	    this.cm = cm;
	    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
	    this.polling = new Delayed();
	    this.composing = null;
	    this.gracePeriod = false;
	    this.readDOMTimeout = null;
	  };

	  ContentEditableInput.prototype.init = function (display) {
	      var this$1 = this;

	    var input = this, cm = input.cm;
	    var div = input.div = display.lineDiv;
	    disableBrowserMagic(div, cm.options.spellcheck, cm.options.autocorrect, cm.options.autocapitalize);

	    on(div, "paste", function (e) {
	      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
	      // IE doesn't fire input events, so we schedule a read for the pasted content in this way
	      if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20); }
	    });

	    on(div, "compositionstart", function (e) {
	      this$1.composing = {data: e.data, done: false};
	    });
	    on(div, "compositionupdate", function (e) {
	      if (!this$1.composing) { this$1.composing = {data: e.data, done: false}; }
	    });
	    on(div, "compositionend", function (e) {
	      if (this$1.composing) {
	        if (e.data != this$1.composing.data) { this$1.readFromDOMSoon(); }
	        this$1.composing.done = true;
	      }
	    });

	    on(div, "touchstart", function () { return input.forceCompositionEnd(); });

	    on(div, "input", function () {
	      if (!this$1.composing) { this$1.readFromDOMSoon(); }
	    });

	    function onCopyCut(e) {
	      if (signalDOMEvent(cm, e)) { return }
	      if (cm.somethingSelected()) {
	        setLastCopied({lineWise: false, text: cm.getSelections()});
	        if (e.type == "cut") { cm.replaceSelection("", null, "cut"); }
	      } else if (!cm.options.lineWiseCopyCut) {
	        return
	      } else {
	        var ranges = copyableRanges(cm);
	        setLastCopied({lineWise: true, text: ranges.text});
	        if (e.type == "cut") {
	          cm.operation(function () {
	            cm.setSelections(ranges.ranges, 0, sel_dontScroll);
	            cm.replaceSelection("", null, "cut");
	          });
	        }
	      }
	      if (e.clipboardData) {
	        e.clipboardData.clearData();
	        var content = lastCopied.text.join("\n");
	        // iOS exposes the clipboard API, but seems to discard content inserted into it
	        e.clipboardData.setData("Text", content);
	        if (e.clipboardData.getData("Text") == content) {
	          e.preventDefault();
	          return
	        }
	      }
	      // Old-fashioned briefly-focus-a-textarea hack
	      var kludge = hiddenTextarea(), te = kludge.firstChild;
	      cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
	      te.value = lastCopied.text.join("\n");
	      var hadFocus = document.activeElement;
	      selectInput(te);
	      setTimeout(function () {
	        cm.display.lineSpace.removeChild(kludge);
	        hadFocus.focus();
	        if (hadFocus == div) { input.showPrimarySelection(); }
	      }, 50);
	    }
	    on(div, "copy", onCopyCut);
	    on(div, "cut", onCopyCut);
	  };

	  ContentEditableInput.prototype.prepareSelection = function () {
	    var result = prepareSelection(this.cm, false);
	    result.focus = this.cm.state.focused;
	    return result
	  };

	  ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
	    if (!info || !this.cm.display.view.length) { return }
	    if (info.focus || takeFocus) { this.showPrimarySelection(); }
	    this.showMultipleSelections(info);
	  };

	  ContentEditableInput.prototype.getSelection = function () {
	    return this.cm.display.wrapper.ownerDocument.getSelection()
	  };

	  ContentEditableInput.prototype.showPrimarySelection = function () {
	    var sel = this.getSelection(), cm = this.cm, prim = cm.doc.sel.primary();
	    var from = prim.from(), to = prim.to();

	    if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
	      sel.removeAllRanges();
	      return
	    }

	    var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
	    var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
	    if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
	        cmp(minPos(curAnchor, curFocus), from) == 0 &&
	        cmp(maxPos(curAnchor, curFocus), to) == 0)
	      { return }

	    var view = cm.display.view;
	    var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
	        {node: view[0].measure.map[2], offset: 0};
	    var end = to.line < cm.display.viewTo && posToDOM(cm, to);
	    if (!end) {
	      var measure = view[view.length - 1].measure;
	      var map$$1 = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
	      end = {node: map$$1[map$$1.length - 1], offset: map$$1[map$$1.length - 2] - map$$1[map$$1.length - 3]};
	    }

	    if (!start || !end) {
	      sel.removeAllRanges();
	      return
	    }

	    var old = sel.rangeCount && sel.getRangeAt(0), rng;
	    try { rng = range(start.node, start.offset, end.offset, end.node); }
	    catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
	    if (rng) {
	      if (!gecko && cm.state.focused) {
	        sel.collapse(start.node, start.offset);
	        if (!rng.collapsed) {
	          sel.removeAllRanges();
	          sel.addRange(rng);
	        }
	      } else {
	        sel.removeAllRanges();
	        sel.addRange(rng);
	      }
	      if (old && sel.anchorNode == null) { sel.addRange(old); }
	      else if (gecko) { this.startGracePeriod(); }
	    }
	    this.rememberSelection();
	  };

	  ContentEditableInput.prototype.startGracePeriod = function () {
	      var this$1 = this;

	    clearTimeout(this.gracePeriod);
	    this.gracePeriod = setTimeout(function () {
	      this$1.gracePeriod = false;
	      if (this$1.selectionChanged())
	        { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }); }
	    }, 20);
	  };

	  ContentEditableInput.prototype.showMultipleSelections = function (info) {
	    removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
	    removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
	  };

	  ContentEditableInput.prototype.rememberSelection = function () {
	    var sel = this.getSelection();
	    this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
	    this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
	  };

	  ContentEditableInput.prototype.selectionInEditor = function () {
	    var sel = this.getSelection();
	    if (!sel.rangeCount) { return false }
	    var node = sel.getRangeAt(0).commonAncestorContainer;
	    return contains(this.div, node)
	  };

	  ContentEditableInput.prototype.focus = function () {
	    if (this.cm.options.readOnly != "nocursor") {
	      if (!this.selectionInEditor())
	        { this.showSelection(this.prepareSelection(), true); }
	      this.div.focus();
	    }
	  };
	  ContentEditableInput.prototype.blur = function () { this.div.blur(); };
	  ContentEditableInput.prototype.getField = function () { return this.div };

	  ContentEditableInput.prototype.supportsTouch = function () { return true };

	  ContentEditableInput.prototype.receivedFocus = function () {
	    var input = this;
	    if (this.selectionInEditor())
	      { this.pollSelection(); }
	    else
	      { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }); }

	    function poll() {
	      if (input.cm.state.focused) {
	        input.pollSelection();
	        input.polling.set(input.cm.options.pollInterval, poll);
	      }
	    }
	    this.polling.set(this.cm.options.pollInterval, poll);
	  };

	  ContentEditableInput.prototype.selectionChanged = function () {
	    var sel = this.getSelection();
	    return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
	      sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
	  };

	  ContentEditableInput.prototype.pollSelection = function () {
	    if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
	    var sel = this.getSelection(), cm = this.cm;
	    // On Android Chrome (version 56, at least), backspacing into an
	    // uneditable block element will put the cursor in that element,
	    // and then, because it's not editable, hide the virtual keyboard.
	    // Because Android doesn't allow us to actually detect backspace
	    // presses in a sane way, this code checks for when that happens
	    // and simulates a backspace press in this case.
	    if (android && chrome && this.cm.display.gutterSpecs.length && isInGutter(sel.anchorNode)) {
	      this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs});
	      this.blur();
	      this.focus();
	      return
	    }
	    if (this.composing) { return }
	    this.rememberSelection();
	    var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
	    var head = domToPos(cm, sel.focusNode, sel.focusOffset);
	    if (anchor && head) { runInOp(cm, function () {
	      setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
	      if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true; }
	    }); }
	  };

	  ContentEditableInput.prototype.pollContent = function () {
	    if (this.readDOMTimeout != null) {
	      clearTimeout(this.readDOMTimeout);
	      this.readDOMTimeout = null;
	    }

	    var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
	    var from = sel.from(), to = sel.to();
	    if (from.ch == 0 && from.line > cm.firstLine())
	      { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length); }
	    if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
	      { to = Pos(to.line + 1, 0); }
	    if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

	    var fromIndex, fromLine, fromNode;
	    if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
	      fromLine = lineNo(display.view[0].line);
	      fromNode = display.view[0].node;
	    } else {
	      fromLine = lineNo(display.view[fromIndex].line);
	      fromNode = display.view[fromIndex - 1].node.nextSibling;
	    }
	    var toIndex = findViewIndex(cm, to.line);
	    var toLine, toNode;
	    if (toIndex == display.view.length - 1) {
	      toLine = display.viewTo - 1;
	      toNode = display.lineDiv.lastChild;
	    } else {
	      toLine = lineNo(display.view[toIndex + 1].line) - 1;
	      toNode = display.view[toIndex + 1].node.previousSibling;
	    }

	    if (!fromNode) { return false }
	    var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
	    var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
	    while (newText.length > 1 && oldText.length > 1) {
	      if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
	      else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
	      else { break }
	    }

	    var cutFront = 0, cutEnd = 0;
	    var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
	    while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
	      { ++cutFront; }
	    var newBot = lst(newText), oldBot = lst(oldText);
	    var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
	                             oldBot.length - (oldText.length == 1 ? cutFront : 0));
	    while (cutEnd < maxCutEnd &&
	           newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
	      { ++cutEnd; }
	    // Try to move start of change to start of selection if ambiguous
	    if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
	      while (cutFront && cutFront > from.ch &&
	             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
	        cutFront--;
	        cutEnd++;
	      }
	    }

	    newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
	    newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

	    var chFrom = Pos(fromLine, cutFront);
	    var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
	    if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
	      replaceRange(cm.doc, newText, chFrom, chTo, "+input");
	      return true
	    }
	  };

	  ContentEditableInput.prototype.ensurePolled = function () {
	    this.forceCompositionEnd();
	  };
	  ContentEditableInput.prototype.reset = function () {
	    this.forceCompositionEnd();
	  };
	  ContentEditableInput.prototype.forceCompositionEnd = function () {
	    if (!this.composing) { return }
	    clearTimeout(this.readDOMTimeout);
	    this.composing = null;
	    this.updateFromDOM();
	    this.div.blur();
	    this.div.focus();
	  };
	  ContentEditableInput.prototype.readFromDOMSoon = function () {
	      var this$1 = this;

	    if (this.readDOMTimeout != null) { return }
	    this.readDOMTimeout = setTimeout(function () {
	      this$1.readDOMTimeout = null;
	      if (this$1.composing) {
	        if (this$1.composing.done) { this$1.composing = null; }
	        else { return }
	      }
	      this$1.updateFromDOM();
	    }, 80);
	  };

	  ContentEditableInput.prototype.updateFromDOM = function () {
	      var this$1 = this;

	    if (this.cm.isReadOnly() || !this.pollContent())
	      { runInOp(this.cm, function () { return regChange(this$1.cm); }); }
	  };

	  ContentEditableInput.prototype.setUneditable = function (node) {
	    node.contentEditable = "false";
	  };

	  ContentEditableInput.prototype.onKeyPress = function (e) {
	    if (e.charCode == 0 || this.composing) { return }
	    e.preventDefault();
	    if (!this.cm.isReadOnly())
	      { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0); }
	  };

	  ContentEditableInput.prototype.readOnlyChanged = function (val) {
	    this.div.contentEditable = String(val != "nocursor");
	  };

	  ContentEditableInput.prototype.onContextMenu = function () {};
	  ContentEditableInput.prototype.resetPosition = function () {};

	  ContentEditableInput.prototype.needsContentAttribute = true;

	  function posToDOM(cm, pos) {
	    var view = findViewForLine(cm, pos.line);
	    if (!view || view.hidden) { return null }
	    var line = getLine(cm.doc, pos.line);
	    var info = mapFromLineView(view, line, pos.line);

	    var order = getOrder(line, cm.doc.direction), side = "left";
	    if (order) {
	      var partPos = getBidiPartAt(order, pos.ch);
	      side = partPos % 2 ? "right" : "left";
	    }
	    var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
	    result.offset = result.collapse == "right" ? result.end : result.start;
	    return result
	  }

	  function isInGutter(node) {
	    for (var scan = node; scan; scan = scan.parentNode)
	      { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
	    return false
	  }

	  function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

	  function domTextBetween(cm, from, to, fromLine, toLine) {
	    var text = "", closing = false, lineSep = cm.doc.lineSeparator(), extraLinebreak = false;
	    function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
	    function close() {
	      if (closing) {
	        text += lineSep;
	        if (extraLinebreak) { text += lineSep; }
	        closing = extraLinebreak = false;
	      }
	    }
	    function addText(str) {
	      if (str) {
	        close();
	        text += str;
	      }
	    }
	    function walk(node) {
	      if (node.nodeType == 1) {
	        var cmText = node.getAttribute("cm-text");
	        if (cmText) {
	          addText(cmText);
	          return
	        }
	        var markerID = node.getAttribute("cm-marker"), range$$1;
	        if (markerID) {
	          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
	          if (found.length && (range$$1 = found[0].find(0)))
	            { addText(getBetween(cm.doc, range$$1.from, range$$1.to).join(lineSep)); }
	          return
	        }
	        if (node.getAttribute("contenteditable") == "false") { return }
	        var isBlock = /^(pre|div|p|li|table|br)$/i.test(node.nodeName);
	        if (!/^br$/i.test(node.nodeName) && node.textContent.length == 0) { return }

	        if (isBlock) { close(); }
	        for (var i = 0; i < node.childNodes.length; i++)
	          { walk(node.childNodes[i]); }

	        if (/^(pre|p)$/i.test(node.nodeName)) { extraLinebreak = true; }
	        if (isBlock) { closing = true; }
	      } else if (node.nodeType == 3) {
	        addText(node.nodeValue.replace(/\u200b/g, "").replace(/\u00a0/g, " "));
	      }
	    }
	    for (;;) {
	      walk(from);
	      if (from == to) { break }
	      from = from.nextSibling;
	      extraLinebreak = false;
	    }
	    return text
	  }

	  function domToPos(cm, node, offset) {
	    var lineNode;
	    if (node == cm.display.lineDiv) {
	      lineNode = cm.display.lineDiv.childNodes[offset];
	      if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
	      node = null; offset = 0;
	    } else {
	      for (lineNode = node;; lineNode = lineNode.parentNode) {
	        if (!lineNode || lineNode == cm.display.lineDiv) { return null }
	        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
	      }
	    }
	    for (var i = 0; i < cm.display.view.length; i++) {
	      var lineView = cm.display.view[i];
	      if (lineView.node == lineNode)
	        { return locateNodeInLineView(lineView, node, offset) }
	    }
	  }

	  function locateNodeInLineView(lineView, node, offset) {
	    var wrapper = lineView.text.firstChild, bad = false;
	    if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
	    if (node == wrapper) {
	      bad = true;
	      node = wrapper.childNodes[offset];
	      offset = 0;
	      if (!node) {
	        var line = lineView.rest ? lst(lineView.rest) : lineView.line;
	        return badPos(Pos(lineNo(line), line.text.length), bad)
	      }
	    }

	    var textNode = node.nodeType == 3 ? node : null, topNode = node;
	    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
	      textNode = node.firstChild;
	      if (offset) { offset = textNode.nodeValue.length; }
	    }
	    while (topNode.parentNode != wrapper) { topNode = topNode.parentNode; }
	    var measure = lineView.measure, maps = measure.maps;

	    function find(textNode, topNode, offset) {
	      for (var i = -1; i < (maps ? maps.length : 0); i++) {
	        var map$$1 = i < 0 ? measure.map : maps[i];
	        for (var j = 0; j < map$$1.length; j += 3) {
	          var curNode = map$$1[j + 2];
	          if (curNode == textNode || curNode == topNode) {
	            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
	            var ch = map$$1[j] + offset;
	            if (offset < 0 || curNode != textNode) { ch = map$$1[j + (offset ? 1 : 0)]; }
	            return Pos(line, ch)
	          }
	        }
	      }
	    }
	    var found = find(textNode, topNode, offset);
	    if (found) { return badPos(found, bad) }

	    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
	    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
	      found = find(after, after.firstChild, 0);
	      if (found)
	        { return badPos(Pos(found.line, found.ch - dist), bad) }
	      else
	        { dist += after.textContent.length; }
	    }
	    for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
	      found = find(before, before.firstChild, -1);
	      if (found)
	        { return badPos(Pos(found.line, found.ch + dist$1), bad) }
	      else
	        { dist$1 += before.textContent.length; }
	    }
	  }

	  // TEXTAREA INPUT STYLE

	  var TextareaInput = function(cm) {
	    this.cm = cm;
	    // See input.poll and input.reset
	    this.prevInput = "";

	    // Flag that indicates whether we expect input to appear real soon
	    // now (after some event like 'keypress' or 'input') and are
	    // polling intensively.
	    this.pollingFast = false;
	    // Self-resetting timeout for the poller
	    this.polling = new Delayed();
	    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
	    this.hasSelection = false;
	    this.composing = null;
	  };

	  TextareaInput.prototype.init = function (display) {
	      var this$1 = this;

	    var input = this, cm = this.cm;
	    this.createField(display);
	    var te = this.textarea;

	    display.wrapper.insertBefore(this.wrapper, display.wrapper.firstChild);

	    // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
	    if (ios) { te.style.width = "0px"; }

	    on(te, "input", function () {
	      if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null; }
	      input.poll();
	    });

	    on(te, "paste", function (e) {
	      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

	      cm.state.pasteIncoming = +new Date;
	      input.fastPoll();
	    });

	    function prepareCopyCut(e) {
	      if (signalDOMEvent(cm, e)) { return }
	      if (cm.somethingSelected()) {
	        setLastCopied({lineWise: false, text: cm.getSelections()});
	      } else if (!cm.options.lineWiseCopyCut) {
	        return
	      } else {
	        var ranges = copyableRanges(cm);
	        setLastCopied({lineWise: true, text: ranges.text});
	        if (e.type == "cut") {
	          cm.setSelections(ranges.ranges, null, sel_dontScroll);
	        } else {
	          input.prevInput = "";
	          te.value = ranges.text.join("\n");
	          selectInput(te);
	        }
	      }
	      if (e.type == "cut") { cm.state.cutIncoming = +new Date; }
	    }
	    on(te, "cut", prepareCopyCut);
	    on(te, "copy", prepareCopyCut);

	    on(display.scroller, "paste", function (e) {
	      if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
	      if (!te.dispatchEvent) {
	        cm.state.pasteIncoming = +new Date;
	        input.focus();
	        return
	      }

	      // Pass the `paste` event to the textarea so it's handled by its event listener.
	      var event = new Event("paste");
	      event.clipboardData = e.clipboardData;
	      te.dispatchEvent(event);
	    });

	    // Prevent normal selection in the editor (we handle our own)
	    on(display.lineSpace, "selectstart", function (e) {
	      if (!eventInWidget(display, e)) { e_preventDefault(e); }
	    });

	    on(te, "compositionstart", function () {
	      var start = cm.getCursor("from");
	      if (input.composing) { input.composing.range.clear(); }
	      input.composing = {
	        start: start,
	        range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
	      };
	    });
	    on(te, "compositionend", function () {
	      if (input.composing) {
	        input.poll();
	        input.composing.range.clear();
	        input.composing = null;
	      }
	    });
	  };

	  TextareaInput.prototype.createField = function (_display) {
	    // Wraps and hides input textarea
	    this.wrapper = hiddenTextarea();
	    // The semihidden textarea that is focused when the editor is
	    // focused, and receives input.
	    this.textarea = this.wrapper.firstChild;
	  };

	  TextareaInput.prototype.prepareSelection = function () {
	    // Redraw the selection and/or cursor
	    var cm = this.cm, display = cm.display, doc = cm.doc;
	    var result = prepareSelection(cm);

	    // Move the hidden textarea near the cursor to prevent scrolling artifacts
	    if (cm.options.moveInputWithCursor) {
	      var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
	      var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
	      result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
	                                          headPos.top + lineOff.top - wrapOff.top));
	      result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
	                                           headPos.left + lineOff.left - wrapOff.left));
	    }

	    return result
	  };

	  TextareaInput.prototype.showSelection = function (drawn) {
	    var cm = this.cm, display = cm.display;
	    removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
	    removeChildrenAndAdd(display.selectionDiv, drawn.selection);
	    if (drawn.teTop != null) {
	      this.wrapper.style.top = drawn.teTop + "px";
	      this.wrapper.style.left = drawn.teLeft + "px";
	    }
	  };

	  // Reset the input to correspond to the selection (or to be empty,
	  // when not typing and nothing is selected)
	  TextareaInput.prototype.reset = function (typing) {
	    if (this.contextMenuPending || this.composing) { return }
	    var cm = this.cm;
	    if (cm.somethingSelected()) {
	      this.prevInput = "";
	      var content = cm.getSelection();
	      this.textarea.value = content;
	      if (cm.state.focused) { selectInput(this.textarea); }
	      if (ie && ie_version >= 9) { this.hasSelection = content; }
	    } else if (!typing) {
	      this.prevInput = this.textarea.value = "";
	      if (ie && ie_version >= 9) { this.hasSelection = null; }
	    }
	  };

	  TextareaInput.prototype.getField = function () { return this.textarea };

	  TextareaInput.prototype.supportsTouch = function () { return false };

	  TextareaInput.prototype.focus = function () {
	    if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
	      try { this.textarea.focus(); }
	      catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
	    }
	  };

	  TextareaInput.prototype.blur = function () { this.textarea.blur(); };

	  TextareaInput.prototype.resetPosition = function () {
	    this.wrapper.style.top = this.wrapper.style.left = 0;
	  };

	  TextareaInput.prototype.receivedFocus = function () { this.slowPoll(); };

	  // Poll for input changes, using the normal rate of polling. This
	  // runs as long as the editor is focused.
	  TextareaInput.prototype.slowPoll = function () {
	      var this$1 = this;

	    if (this.pollingFast) { return }
	    this.polling.set(this.cm.options.pollInterval, function () {
	      this$1.poll();
	      if (this$1.cm.state.focused) { this$1.slowPoll(); }
	    });
	  };

	  // When an event has just come in that is likely to add or change
	  // something in the input textarea, we poll faster, to ensure that
	  // the change appears on the screen quickly.
	  TextareaInput.prototype.fastPoll = function () {
	    var missed = false, input = this;
	    input.pollingFast = true;
	    function p() {
	      var changed = input.poll();
	      if (!changed && !missed) {missed = true; input.polling.set(60, p);}
	      else {input.pollingFast = false; input.slowPoll();}
	    }
	    input.polling.set(20, p);
	  };

	  // Read input from the textarea, and update the document to match.
	  // When something is selected, it is present in the textarea, and
	  // selected (unless it is huge, in which case a placeholder is
	  // used). When nothing is selected, the cursor sits after previously
	  // seen text (can be empty), which is stored in prevInput (we must
	  // not reset the textarea when typing, because that breaks IME).
	  TextareaInput.prototype.poll = function () {
	      var this$1 = this;

	    var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
	    // Since this is called a *lot*, try to bail out as cheaply as
	    // possible when it is clear that nothing happened. hasSelection
	    // will be the case when there is a lot of text in the textarea,
	    // in which case reading its value would be expensive.
	    if (this.contextMenuPending || !cm.state.focused ||
	        (hasSelection(input) && !prevInput && !this.composing) ||
	        cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
	      { return false }

	    var text = input.value;
	    // If nothing changed, bail.
	    if (text == prevInput && !cm.somethingSelected()) { return false }
	    // Work around nonsensical selection resetting in IE9/10, and
	    // inexplicable appearance of private area unicode characters on
	    // some key combos in Mac (#2689).
	    if (ie && ie_version >= 9 && this.hasSelection === text ||
	        mac && /[\uf700-\uf7ff]/.test(text)) {
	      cm.display.input.reset();
	      return false
	    }

	    if (cm.doc.sel == cm.display.selForContextMenu) {
	      var first = text.charCodeAt(0);
	      if (first == 0x200b && !prevInput) { prevInput = "\u200b"; }
	      if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
	    }
	    // Find the part of the input that is actually new
	    var same = 0, l = Math.min(prevInput.length, text.length);
	    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same; }

	    runInOp(cm, function () {
	      applyTextInput(cm, text.slice(same), prevInput.length - same,
	                     null, this$1.composing ? "*compose" : null);

	      // Don't leave long text in the textarea, since it makes further polling slow
	      if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = ""; }
	      else { this$1.prevInput = text; }

	      if (this$1.composing) {
	        this$1.composing.range.clear();
	        this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
	                                           {className: "CodeMirror-composing"});
	      }
	    });
	    return true
	  };

	  TextareaInput.prototype.ensurePolled = function () {
	    if (this.pollingFast && this.poll()) { this.pollingFast = false; }
	  };

	  TextareaInput.prototype.onKeyPress = function () {
	    if (ie && ie_version >= 9) { this.hasSelection = null; }
	    this.fastPoll();
	  };

	  TextareaInput.prototype.onContextMenu = function (e) {
	    var input = this, cm = input.cm, display = cm.display, te = input.textarea;
	    if (input.contextMenuPending) { input.contextMenuPending(); }
	    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
	    if (!pos || presto) { return } // Opera is difficult.

	    // Reset the current text selection only if the click is done outside of the selection
	    // and 'resetSelectionOnContextMenu' option is true.
	    var reset = cm.options.resetSelectionOnContextMenu;
	    if (reset && cm.doc.sel.contains(pos) == -1)
	      { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll); }

	    var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText;
	    var wrapperBox = input.wrapper.offsetParent.getBoundingClientRect();
	    input.wrapper.style.cssText = "position: static";
	    te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
	    var oldScrollY;
	    if (webkit) { oldScrollY = window.scrollY; } // Work around Chrome issue (#2712)
	    display.input.focus();
	    if (webkit) { window.scrollTo(null, oldScrollY); }
	    display.input.reset();
	    // Adds "Select all" to context menu in FF
	    if (!cm.somethingSelected()) { te.value = input.prevInput = " "; }
	    input.contextMenuPending = rehide;
	    display.selForContextMenu = cm.doc.sel;
	    clearTimeout(display.detectingSelectAll);

	    // Select-all will be greyed out if there's nothing to select, so
	    // this adds a zero-width space so that we can later check whether
	    // it got selected.
	    function prepareSelectAllHack() {
	      if (te.selectionStart != null) {
	        var selected = cm.somethingSelected();
	        var extval = "\u200b" + (selected ? te.value : "");
	        te.value = "\u21da"; // Used to catch context-menu undo
	        te.value = extval;
	        input.prevInput = selected ? "" : "\u200b";
	        te.selectionStart = 1; te.selectionEnd = extval.length;
	        // Re-set this, in case some other handler touched the
	        // selection in the meantime.
	        display.selForContextMenu = cm.doc.sel;
	      }
	    }
	    function rehide() {
	      if (input.contextMenuPending != rehide) { return }
	      input.contextMenuPending = false;
	      input.wrapper.style.cssText = oldWrapperCSS;
	      te.style.cssText = oldCSS;
	      if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos); }

	      // Try to detect the user choosing select-all
	      if (te.selectionStart != null) {
	        if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack(); }
	        var i = 0, poll = function () {
	          if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
	              te.selectionEnd > 0 && input.prevInput == "\u200b") {
	            operation(cm, selectAll)(cm);
	          } else if (i++ < 10) {
	            display.detectingSelectAll = setTimeout(poll, 500);
	          } else {
	            display.selForContextMenu = null;
	            display.input.reset();
	          }
	        };
	        display.detectingSelectAll = setTimeout(poll, 200);
	      }
	    }

	    if (ie && ie_version >= 9) { prepareSelectAllHack(); }
	    if (captureRightClick) {
	      e_stop(e);
	      var mouseup = function () {
	        off(window, "mouseup", mouseup);
	        setTimeout(rehide, 20);
	      };
	      on(window, "mouseup", mouseup);
	    } else {
	      setTimeout(rehide, 50);
	    }
	  };

	  TextareaInput.prototype.readOnlyChanged = function (val) {
	    if (!val) { this.reset(); }
	    this.textarea.disabled = val == "nocursor";
	  };

	  TextareaInput.prototype.setUneditable = function () {};

	  TextareaInput.prototype.needsContentAttribute = false;

	  function fromTextArea(textarea, options) {
	    options = options ? copyObj(options) : {};
	    options.value = textarea.value;
	    if (!options.tabindex && textarea.tabIndex)
	      { options.tabindex = textarea.tabIndex; }
	    if (!options.placeholder && textarea.placeholder)
	      { options.placeholder = textarea.placeholder; }
	    // Set autofocus to true if this textarea is focused, or if it has
	    // autofocus and no other element is focused.
	    if (options.autofocus == null) {
	      var hasFocus = activeElt();
	      options.autofocus = hasFocus == textarea ||
	        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
	    }

	    function save() {textarea.value = cm.getValue();}

	    var realSubmit;
	    if (textarea.form) {
	      on(textarea.form, "submit", save);
	      // Deplorable hack to make the submit method do the right thing.
	      if (!options.leaveSubmitMethodAlone) {
	        var form = textarea.form;
	        realSubmit = form.submit;
	        try {
	          var wrappedSubmit = form.submit = function () {
	            save();
	            form.submit = realSubmit;
	            form.submit();
	            form.submit = wrappedSubmit;
	          };
	        } catch(e) {}
	      }
	    }

	    options.finishInit = function (cm) {
	      cm.save = save;
	      cm.getTextArea = function () { return textarea; };
	      cm.toTextArea = function () {
	        cm.toTextArea = isNaN; // Prevent this from being ran twice
	        save();
	        textarea.parentNode.removeChild(cm.getWrapperElement());
	        textarea.style.display = "";
	        if (textarea.form) {
	          off(textarea.form, "submit", save);
	          if (!options.leaveSubmitMethodAlone && typeof textarea.form.submit == "function")
	            { textarea.form.submit = realSubmit; }
	        }
	      };
	    };

	    textarea.style.display = "none";
	    var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
	      options);
	    return cm
	  }

	  function addLegacyProps(CodeMirror) {
	    CodeMirror.off = off;
	    CodeMirror.on = on;
	    CodeMirror.wheelEventPixels = wheelEventPixels;
	    CodeMirror.Doc = Doc;
	    CodeMirror.splitLines = splitLinesAuto;
	    CodeMirror.countColumn = countColumn;
	    CodeMirror.findColumn = findColumn;
	    CodeMirror.isWordChar = isWordCharBasic;
	    CodeMirror.Pass = Pass;
	    CodeMirror.signal = signal;
	    CodeMirror.Line = Line;
	    CodeMirror.changeEnd = changeEnd;
	    CodeMirror.scrollbarModel = scrollbarModel;
	    CodeMirror.Pos = Pos;
	    CodeMirror.cmpPos = cmp;
	    CodeMirror.modes = modes;
	    CodeMirror.mimeModes = mimeModes;
	    CodeMirror.resolveMode = resolveMode;
	    CodeMirror.getMode = getMode;
	    CodeMirror.modeExtensions = modeExtensions;
	    CodeMirror.extendMode = extendMode;
	    CodeMirror.copyState = copyState;
	    CodeMirror.startState = startState;
	    CodeMirror.innerMode = innerMode;
	    CodeMirror.commands = commands;
	    CodeMirror.keyMap = keyMap;
	    CodeMirror.keyName = keyName;
	    CodeMirror.isModifierKey = isModifierKey;
	    CodeMirror.lookupKey = lookupKey;
	    CodeMirror.normalizeKeyMap = normalizeKeyMap;
	    CodeMirror.StringStream = StringStream;
	    CodeMirror.SharedTextMarker = SharedTextMarker;
	    CodeMirror.TextMarker = TextMarker;
	    CodeMirror.LineWidget = LineWidget;
	    CodeMirror.e_preventDefault = e_preventDefault;
	    CodeMirror.e_stopPropagation = e_stopPropagation;
	    CodeMirror.e_stop = e_stop;
	    CodeMirror.addClass = addClass;
	    CodeMirror.contains = contains;
	    CodeMirror.rmClass = rmClass;
	    CodeMirror.keyNames = keyNames;
	  }

	  // EDITOR CONSTRUCTOR

	  defineOptions(CodeMirror);

	  addEditorMethods(CodeMirror);

	  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
	  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
	  for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
	    { CodeMirror.prototype[prop] = (function(method) {
	      return function() {return method.apply(this.doc, arguments)}
	    })(Doc.prototype[prop]); } }

	  eventMixin(Doc);
	  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

	  // Extra arguments are stored as the mode's dependencies, which is
	  // used by (legacy) mechanisms like loadmode.js to automatically
	  // load a mode. (Preferred mechanism is the require/define calls.)
	  CodeMirror.defineMode = function(name/*, mode, …*/) {
	    if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name; }
	    defineMode.apply(this, arguments);
	  };

	  CodeMirror.defineMIME = defineMIME;

	  // Minimal default mode.
	  CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); });
	  CodeMirror.defineMIME("text/plain", "null");

	  // EXTENSIONS

	  CodeMirror.defineExtension = function (name, func) {
	    CodeMirror.prototype[name] = func;
	  };
	  CodeMirror.defineDocExtension = function (name, func) {
	    Doc.prototype[name] = func;
	  };

	  CodeMirror.fromTextArea = fromTextArea;

	  addLegacyProps(CodeMirror);

	  CodeMirror.version = "5.49.0";

	  return CodeMirror;

	})));
	});

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
	    APP.running = false; /////
	  }

	} //window.APP.log = function() {
	//};

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
	  }

	  log() {} //////////////////////////////////URL


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
	    this.log('util-fileURL (checkurl):' + this.id + ' ' + this.URL);
	    this.URLTimer = 0;
	    this.fileExistsCall(this.URL, this, this.fileExistsCallback);
	  }

	  checkURLCallback(status) {
	    if (status == true) {
	      this.log('util-fileURL (checkurl-call-ok):' + this.id + ' ' + this.URL);
	      this.setURL();
	    } else {
	      this.log('util-fileURL (checkurl-call-timeout):' + this.id + ' ' + this.URL);
	      this.setURLTimeout();
	    }
	  }

	  checkURL2() {
	    this.log('util-fileURL (checkurl):' + this.id + ' ' + this.URL);

	    const _me = this;

	    if (this.fileExists(this.URL)) {
	      _me.setURL();
	    } else {
	      _me.setURLTimeout();
	    }
	  }

	  setURL() {
	    this.log('util-fileURL (set):' + this.id + ' ' + this.URL);
	    if (this.URL == '') this.log('util-fileURL (set-null):' + this.id + ' ' + this.URL);

	    if (this.URLready == false) {
	      this.URLready = true;
	      this.parent.setURLMedia();
	      this.URLTimeoutCount = 0;
	      this.URLTimer = Date.now();
	    }
	  }

	  checkMediaURL() {
	    this.log('util-fileURL (checkmedia):' + this.id + ' ' + this.URL);

	    const _me = this;

	    if (this.parent.checkURLMedia(this.URL, this.URLp)) {
	      _me.startURL();
	    } else {
	      _me.setURLTimeout();
	    }
	  }

	  startURL() {
	    this.log('util-fileURL (startmedia):' + this.id + ' ' + this.URL);

	    if (this.URLMediaready == false) {
	      this.URLMediaready = true;
	      this.parent.startURLMedia();
	    }
	  }

	  setURLTimeout() {
	    this.URLTimeoutCount++;
	    this.URLTimer = Date.now();
	    this.log('util-fileURL (timer):' + this.id + ' ' + this.URLTimeoutCount);

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
	      this.log('util-fileURL (timeout):' + this.id + ' ' + elapsed);
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
	          _me.log('autil: (exists-call):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);

	          if (http.status == 200 || http.status == 206) {
	            _me.URLtext = http.responseText;

	            _me.log('autil: (ok):');

	            callback(true, index);
	          } else {
	            callback(false, index);
	          }
	        }
	      };

	      http.open('GET', url, true);
	      http.send(null);
	    }

	    this.log('autil: (exists):' + url + ' ' + http.status);
	  }

	  fileExistsCallback(status, obj) {
	    //  var nobj = anetSystem.nodes[id];
	    //  this.log('autil: (exists-callback):' + obj + ' ' + status);
	    //  if (nobj != undefined) {
	    obj.checkURLCallback(status); //  }
	  }

	  fileExists(url) {
	    var http = new XMLHttpRequest();
	    http.open('HEAD', url, false);
	    http.send(null);
	    this.log('autil: (exists-test):' + url + ' ' + http.status);

	    if (http.status == 404) {
	      this.log('autil: (exists-nup):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);
	      return false;
	    }

	    this.log('autil: (exists-yep):' + url + ' ' + ' ' + http.readyState + ' ' + http.status);
	    return true;
	  }

	}

	class UTIL_fileio {
	  constructor(parent) {
	    this.callback = parent;
	  }

	  read(filename) {
	    //console.log('fileio (get) ',filename)
	    this.urlLoader = new UTIL_FileURLLoader(this, filename);
	  }

	  cycle() {
	    if (this.urlLoader != undefined) this.urlLoader.checkURLReady();
	  } ////////////////////////////////////////////URL loader callbacks


	  setURLMedia() {
	    //  //console.log('seturl',this.urlLoader.URLtext);
	    this.callback.call('fileio_text', this.urlLoader.URLtext);
	  }

	  checkURLMedia() {
	    return true;
	  }

	  startURLMedia() {}

	}
	/*
	  async load(filename) {
	      //console.log('fileio (await) ',filename)
	      const readme = await this.promiseReader(filename);
	      //console.log(readme);
	  }


	  promise(path) {
	    return new Promise((resolve, reject) => {
	      fs.readFileSync(path, 'utf8', function (err, data) {
	        if (err) {
	          reject(err);
	        }
	        resolve(data);
	        //console.log(data)
	      });
	    });
	  }*/

	/*

	    promiseReader (inputFile)  {

	                const temporaryFileReader = new FileReader();

	                const file = inputFile.files[0];

	              //console.log('promiseReader',temporaryFileReader,file);

	                return new Promise((resolve, reject) => {
	                  temporaryFileReader.onerror = () => {
	                    temporaryFileReader.abort();
	                    reject(new DOMException("Problem parsing input file."));
	                  };

	                  temporaryFileReader.onload = () => {
	                    resolve(temporaryFileReader.result);
	                    //console.log(temporaryFileReader.result);
	                  };


	                      //console.log('onchange');

	                      //console.log('onchange',file);
	                    temporaryFileReader.readAsDataURL(file);

	                //  temporaryFileReader.readAsText(inputFile);
	                });


	    }



	  async read(file) {

	      try {
	        const fileContents = await this.readTextFile(file);
	        //console.log(fileContents);
	      //  fileContentDiv.innerHTML = fileContents
	      } catch (e) {
	          //console.log(e.message);
	      //  fileContentDiv.innerHTML = e.message
	      }

	  }
	*/

	var he = createCommonjsModule(function (module, exports) {
	(function(root) {

		// Detect free variables `exports`.
		var freeExports =  exports;

		// Detect free variable `module`.
		var freeModule =  module &&
			module.exports == freeExports && module;

		// Detect free variable `global`, from Node.js or Browserified code,
		// and use it as `root`.
		var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal;
		if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
			root = freeGlobal;
		}

		/*--------------------------------------------------------------------------*/

		// All astral symbols.
		var regexAstralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
		// All ASCII symbols (not just printable ASCII) except those listed in the
		// first column of the overrides table.
		// https://html.spec.whatwg.org/multipage/syntax.html#table-charref-overrides
		var regexAsciiWhitelist = /[\x01-\x7F]/g;
		// All BMP symbols that are not ASCII newlines, printable ASCII symbols, or
		// code points listed in the first column of the overrides table on
		// https://html.spec.whatwg.org/multipage/syntax.html#table-charref-overrides.
		var regexBmpWhitelist = /[\x01-\t\x0B\f\x0E-\x1F\x7F\x81\x8D\x8F\x90\x9D\xA0-\uFFFF]/g;

		var regexEncodeNonAscii = /<\u20D2|=\u20E5|>\u20D2|\u205F\u200A|\u219D\u0338|\u2202\u0338|\u2220\u20D2|\u2229\uFE00|\u222A\uFE00|\u223C\u20D2|\u223D\u0331|\u223E\u0333|\u2242\u0338|\u224B\u0338|\u224D\u20D2|\u224E\u0338|\u224F\u0338|\u2250\u0338|\u2261\u20E5|\u2264\u20D2|\u2265\u20D2|\u2266\u0338|\u2267\u0338|\u2268\uFE00|\u2269\uFE00|\u226A\u0338|\u226A\u20D2|\u226B\u0338|\u226B\u20D2|\u227F\u0338|\u2282\u20D2|\u2283\u20D2|\u228A\uFE00|\u228B\uFE00|\u228F\u0338|\u2290\u0338|\u2293\uFE00|\u2294\uFE00|\u22B4\u20D2|\u22B5\u20D2|\u22D8\u0338|\u22D9\u0338|\u22DA\uFE00|\u22DB\uFE00|\u22F5\u0338|\u22F9\u0338|\u2933\u0338|\u29CF\u0338|\u29D0\u0338|\u2A6D\u0338|\u2A70\u0338|\u2A7D\u0338|\u2A7E\u0338|\u2AA1\u0338|\u2AA2\u0338|\u2AAC\uFE00|\u2AAD\uFE00|\u2AAF\u0338|\u2AB0\u0338|\u2AC5\u0338|\u2AC6\u0338|\u2ACB\uFE00|\u2ACC\uFE00|\u2AFD\u20E5|[\xA0-\u0113\u0116-\u0122\u0124-\u012B\u012E-\u014D\u0150-\u017E\u0192\u01B5\u01F5\u0237\u02C6\u02C7\u02D8-\u02DD\u0311\u0391-\u03A1\u03A3-\u03A9\u03B1-\u03C9\u03D1\u03D2\u03D5\u03D6\u03DC\u03DD\u03F0\u03F1\u03F5\u03F6\u0401-\u040C\u040E-\u044F\u0451-\u045C\u045E\u045F\u2002-\u2005\u2007-\u2010\u2013-\u2016\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2025\u2026\u2030-\u2035\u2039\u203A\u203E\u2041\u2043\u2044\u204F\u2057\u205F-\u2063\u20AC\u20DB\u20DC\u2102\u2105\u210A-\u2113\u2115-\u211E\u2122\u2124\u2127-\u2129\u212C\u212D\u212F-\u2131\u2133-\u2138\u2145-\u2148\u2153-\u215E\u2190-\u219B\u219D-\u21A7\u21A9-\u21AE\u21B0-\u21B3\u21B5-\u21B7\u21BA-\u21DB\u21DD\u21E4\u21E5\u21F5\u21FD-\u2205\u2207-\u2209\u220B\u220C\u220F-\u2214\u2216-\u2218\u221A\u221D-\u2238\u223A-\u2257\u2259\u225A\u225C\u225F-\u2262\u2264-\u228B\u228D-\u229B\u229D-\u22A5\u22A7-\u22B0\u22B2-\u22BB\u22BD-\u22DB\u22DE-\u22E3\u22E6-\u22F7\u22F9-\u22FE\u2305\u2306\u2308-\u2310\u2312\u2313\u2315\u2316\u231C-\u231F\u2322\u2323\u232D\u232E\u2336\u233D\u233F\u237C\u23B0\u23B1\u23B4-\u23B6\u23DC-\u23DF\u23E2\u23E7\u2423\u24C8\u2500\u2502\u250C\u2510\u2514\u2518\u251C\u2524\u252C\u2534\u253C\u2550-\u256C\u2580\u2584\u2588\u2591-\u2593\u25A1\u25AA\u25AB\u25AD\u25AE\u25B1\u25B3-\u25B5\u25B8\u25B9\u25BD-\u25BF\u25C2\u25C3\u25CA\u25CB\u25EC\u25EF\u25F8-\u25FC\u2605\u2606\u260E\u2640\u2642\u2660\u2663\u2665\u2666\u266A\u266D-\u266F\u2713\u2717\u2720\u2736\u2758\u2772\u2773\u27C8\u27C9\u27E6-\u27ED\u27F5-\u27FA\u27FC\u27FF\u2902-\u2905\u290C-\u2913\u2916\u2919-\u2920\u2923-\u292A\u2933\u2935-\u2939\u293C\u293D\u2945\u2948-\u294B\u294E-\u2976\u2978\u2979\u297B-\u297F\u2985\u2986\u298B-\u2996\u299A\u299C\u299D\u29A4-\u29B7\u29B9\u29BB\u29BC\u29BE-\u29C5\u29C9\u29CD-\u29D0\u29DC-\u29DE\u29E3-\u29E5\u29EB\u29F4\u29F6\u2A00-\u2A02\u2A04\u2A06\u2A0C\u2A0D\u2A10-\u2A17\u2A22-\u2A27\u2A29\u2A2A\u2A2D-\u2A31\u2A33-\u2A3C\u2A3F\u2A40\u2A42-\u2A4D\u2A50\u2A53-\u2A58\u2A5A-\u2A5D\u2A5F\u2A66\u2A6A\u2A6D-\u2A75\u2A77-\u2A9A\u2A9D-\u2AA2\u2AA4-\u2AB0\u2AB3-\u2AC8\u2ACB\u2ACC\u2ACF-\u2ADB\u2AE4\u2AE6-\u2AE9\u2AEB-\u2AF3\u2AFD\uFB00-\uFB04]|\uD835[\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDD04\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDD6B]/g;
		var encodeMap = {'\xAD':'shy','\u200C':'zwnj','\u200D':'zwj','\u200E':'lrm','\u2063':'ic','\u2062':'it','\u2061':'af','\u200F':'rlm','\u200B':'ZeroWidthSpace','\u2060':'NoBreak','\u0311':'DownBreve','\u20DB':'tdot','\u20DC':'DotDot','\t':'Tab','\n':'NewLine','\u2008':'puncsp','\u205F':'MediumSpace','\u2009':'thinsp','\u200A':'hairsp','\u2004':'emsp13','\u2002':'ensp','\u2005':'emsp14','\u2003':'emsp','\u2007':'numsp','\xA0':'nbsp','\u205F\u200A':'ThickSpace','\u203E':'oline','_':'lowbar','\u2010':'dash','\u2013':'ndash','\u2014':'mdash','\u2015':'horbar',',':'comma',';':'semi','\u204F':'bsemi',':':'colon','\u2A74':'Colone','!':'excl','\xA1':'iexcl','?':'quest','\xBF':'iquest','.':'period','\u2025':'nldr','\u2026':'mldr','\xB7':'middot','\'':'apos','\u2018':'lsquo','\u2019':'rsquo','\u201A':'sbquo','\u2039':'lsaquo','\u203A':'rsaquo','"':'quot','\u201C':'ldquo','\u201D':'rdquo','\u201E':'bdquo','\xAB':'laquo','\xBB':'raquo','(':'lpar',')':'rpar','[':'lsqb',']':'rsqb','{':'lcub','}':'rcub','\u2308':'lceil','\u2309':'rceil','\u230A':'lfloor','\u230B':'rfloor','\u2985':'lopar','\u2986':'ropar','\u298B':'lbrke','\u298C':'rbrke','\u298D':'lbrkslu','\u298E':'rbrksld','\u298F':'lbrksld','\u2990':'rbrkslu','\u2991':'langd','\u2992':'rangd','\u2993':'lparlt','\u2994':'rpargt','\u2995':'gtlPar','\u2996':'ltrPar','\u27E6':'lobrk','\u27E7':'robrk','\u27E8':'lang','\u27E9':'rang','\u27EA':'Lang','\u27EB':'Rang','\u27EC':'loang','\u27ED':'roang','\u2772':'lbbrk','\u2773':'rbbrk','\u2016':'Vert','\xA7':'sect','\xB6':'para','@':'commat','*':'ast','/':'sol','undefined':null,'&':'amp','#':'num','%':'percnt','\u2030':'permil','\u2031':'pertenk','\u2020':'dagger','\u2021':'Dagger','\u2022':'bull','\u2043':'hybull','\u2032':'prime','\u2033':'Prime','\u2034':'tprime','\u2057':'qprime','\u2035':'bprime','\u2041':'caret','`':'grave','\xB4':'acute','\u02DC':'tilde','^':'Hat','\xAF':'macr','\u02D8':'breve','\u02D9':'dot','\xA8':'die','\u02DA':'ring','\u02DD':'dblac','\xB8':'cedil','\u02DB':'ogon','\u02C6':'circ','\u02C7':'caron','\xB0':'deg','\xA9':'copy','\xAE':'reg','\u2117':'copysr','\u2118':'wp','\u211E':'rx','\u2127':'mho','\u2129':'iiota','\u2190':'larr','\u219A':'nlarr','\u2192':'rarr','\u219B':'nrarr','\u2191':'uarr','\u2193':'darr','\u2194':'harr','\u21AE':'nharr','\u2195':'varr','\u2196':'nwarr','\u2197':'nearr','\u2198':'searr','\u2199':'swarr','\u219D':'rarrw','\u219D\u0338':'nrarrw','\u219E':'Larr','\u219F':'Uarr','\u21A0':'Rarr','\u21A1':'Darr','\u21A2':'larrtl','\u21A3':'rarrtl','\u21A4':'mapstoleft','\u21A5':'mapstoup','\u21A6':'map','\u21A7':'mapstodown','\u21A9':'larrhk','\u21AA':'rarrhk','\u21AB':'larrlp','\u21AC':'rarrlp','\u21AD':'harrw','\u21B0':'lsh','\u21B1':'rsh','\u21B2':'ldsh','\u21B3':'rdsh','\u21B5':'crarr','\u21B6':'cularr','\u21B7':'curarr','\u21BA':'olarr','\u21BB':'orarr','\u21BC':'lharu','\u21BD':'lhard','\u21BE':'uharr','\u21BF':'uharl','\u21C0':'rharu','\u21C1':'rhard','\u21C2':'dharr','\u21C3':'dharl','\u21C4':'rlarr','\u21C5':'udarr','\u21C6':'lrarr','\u21C7':'llarr','\u21C8':'uuarr','\u21C9':'rrarr','\u21CA':'ddarr','\u21CB':'lrhar','\u21CC':'rlhar','\u21D0':'lArr','\u21CD':'nlArr','\u21D1':'uArr','\u21D2':'rArr','\u21CF':'nrArr','\u21D3':'dArr','\u21D4':'iff','\u21CE':'nhArr','\u21D5':'vArr','\u21D6':'nwArr','\u21D7':'neArr','\u21D8':'seArr','\u21D9':'swArr','\u21DA':'lAarr','\u21DB':'rAarr','\u21DD':'zigrarr','\u21E4':'larrb','\u21E5':'rarrb','\u21F5':'duarr','\u21FD':'loarr','\u21FE':'roarr','\u21FF':'hoarr','\u2200':'forall','\u2201':'comp','\u2202':'part','\u2202\u0338':'npart','\u2203':'exist','\u2204':'nexist','\u2205':'empty','\u2207':'Del','\u2208':'in','\u2209':'notin','\u220B':'ni','\u220C':'notni','\u03F6':'bepsi','\u220F':'prod','\u2210':'coprod','\u2211':'sum','+':'plus','\xB1':'pm','\xF7':'div','\xD7':'times','<':'lt','\u226E':'nlt','<\u20D2':'nvlt','=':'equals','\u2260':'ne','=\u20E5':'bne','\u2A75':'Equal','>':'gt','\u226F':'ngt','>\u20D2':'nvgt','\xAC':'not','|':'vert','\xA6':'brvbar','\u2212':'minus','\u2213':'mp','\u2214':'plusdo','\u2044':'frasl','\u2216':'setmn','\u2217':'lowast','\u2218':'compfn','\u221A':'Sqrt','\u221D':'prop','\u221E':'infin','\u221F':'angrt','\u2220':'ang','\u2220\u20D2':'nang','\u2221':'angmsd','\u2222':'angsph','\u2223':'mid','\u2224':'nmid','\u2225':'par','\u2226':'npar','\u2227':'and','\u2228':'or','\u2229':'cap','\u2229\uFE00':'caps','\u222A':'cup','\u222A\uFE00':'cups','\u222B':'int','\u222C':'Int','\u222D':'tint','\u2A0C':'qint','\u222E':'oint','\u222F':'Conint','\u2230':'Cconint','\u2231':'cwint','\u2232':'cwconint','\u2233':'awconint','\u2234':'there4','\u2235':'becaus','\u2236':'ratio','\u2237':'Colon','\u2238':'minusd','\u223A':'mDDot','\u223B':'homtht','\u223C':'sim','\u2241':'nsim','\u223C\u20D2':'nvsim','\u223D':'bsim','\u223D\u0331':'race','\u223E':'ac','\u223E\u0333':'acE','\u223F':'acd','\u2240':'wr','\u2242':'esim','\u2242\u0338':'nesim','\u2243':'sime','\u2244':'nsime','\u2245':'cong','\u2247':'ncong','\u2246':'simne','\u2248':'ap','\u2249':'nap','\u224A':'ape','\u224B':'apid','\u224B\u0338':'napid','\u224C':'bcong','\u224D':'CupCap','\u226D':'NotCupCap','\u224D\u20D2':'nvap','\u224E':'bump','\u224E\u0338':'nbump','\u224F':'bumpe','\u224F\u0338':'nbumpe','\u2250':'doteq','\u2250\u0338':'nedot','\u2251':'eDot','\u2252':'efDot','\u2253':'erDot','\u2254':'colone','\u2255':'ecolon','\u2256':'ecir','\u2257':'cire','\u2259':'wedgeq','\u225A':'veeeq','\u225C':'trie','\u225F':'equest','\u2261':'equiv','\u2262':'nequiv','\u2261\u20E5':'bnequiv','\u2264':'le','\u2270':'nle','\u2264\u20D2':'nvle','\u2265':'ge','\u2271':'nge','\u2265\u20D2':'nvge','\u2266':'lE','\u2266\u0338':'nlE','\u2267':'gE','\u2267\u0338':'ngE','\u2268\uFE00':'lvnE','\u2268':'lnE','\u2269':'gnE','\u2269\uFE00':'gvnE','\u226A':'ll','\u226A\u0338':'nLtv','\u226A\u20D2':'nLt','\u226B':'gg','\u226B\u0338':'nGtv','\u226B\u20D2':'nGt','\u226C':'twixt','\u2272':'lsim','\u2274':'nlsim','\u2273':'gsim','\u2275':'ngsim','\u2276':'lg','\u2278':'ntlg','\u2277':'gl','\u2279':'ntgl','\u227A':'pr','\u2280':'npr','\u227B':'sc','\u2281':'nsc','\u227C':'prcue','\u22E0':'nprcue','\u227D':'sccue','\u22E1':'nsccue','\u227E':'prsim','\u227F':'scsim','\u227F\u0338':'NotSucceedsTilde','\u2282':'sub','\u2284':'nsub','\u2282\u20D2':'vnsub','\u2283':'sup','\u2285':'nsup','\u2283\u20D2':'vnsup','\u2286':'sube','\u2288':'nsube','\u2287':'supe','\u2289':'nsupe','\u228A\uFE00':'vsubne','\u228A':'subne','\u228B\uFE00':'vsupne','\u228B':'supne','\u228D':'cupdot','\u228E':'uplus','\u228F':'sqsub','\u228F\u0338':'NotSquareSubset','\u2290':'sqsup','\u2290\u0338':'NotSquareSuperset','\u2291':'sqsube','\u22E2':'nsqsube','\u2292':'sqsupe','\u22E3':'nsqsupe','\u2293':'sqcap','\u2293\uFE00':'sqcaps','\u2294':'sqcup','\u2294\uFE00':'sqcups','\u2295':'oplus','\u2296':'ominus','\u2297':'otimes','\u2298':'osol','\u2299':'odot','\u229A':'ocir','\u229B':'oast','\u229D':'odash','\u229E':'plusb','\u229F':'minusb','\u22A0':'timesb','\u22A1':'sdotb','\u22A2':'vdash','\u22AC':'nvdash','\u22A3':'dashv','\u22A4':'top','\u22A5':'bot','\u22A7':'models','\u22A8':'vDash','\u22AD':'nvDash','\u22A9':'Vdash','\u22AE':'nVdash','\u22AA':'Vvdash','\u22AB':'VDash','\u22AF':'nVDash','\u22B0':'prurel','\u22B2':'vltri','\u22EA':'nltri','\u22B3':'vrtri','\u22EB':'nrtri','\u22B4':'ltrie','\u22EC':'nltrie','\u22B4\u20D2':'nvltrie','\u22B5':'rtrie','\u22ED':'nrtrie','\u22B5\u20D2':'nvrtrie','\u22B6':'origof','\u22B7':'imof','\u22B8':'mumap','\u22B9':'hercon','\u22BA':'intcal','\u22BB':'veebar','\u22BD':'barvee','\u22BE':'angrtvb','\u22BF':'lrtri','\u22C0':'Wedge','\u22C1':'Vee','\u22C2':'xcap','\u22C3':'xcup','\u22C4':'diam','\u22C5':'sdot','\u22C6':'Star','\u22C7':'divonx','\u22C8':'bowtie','\u22C9':'ltimes','\u22CA':'rtimes','\u22CB':'lthree','\u22CC':'rthree','\u22CD':'bsime','\u22CE':'cuvee','\u22CF':'cuwed','\u22D0':'Sub','\u22D1':'Sup','\u22D2':'Cap','\u22D3':'Cup','\u22D4':'fork','\u22D5':'epar','\u22D6':'ltdot','\u22D7':'gtdot','\u22D8':'Ll','\u22D8\u0338':'nLl','\u22D9':'Gg','\u22D9\u0338':'nGg','\u22DA\uFE00':'lesg','\u22DA':'leg','\u22DB':'gel','\u22DB\uFE00':'gesl','\u22DE':'cuepr','\u22DF':'cuesc','\u22E6':'lnsim','\u22E7':'gnsim','\u22E8':'prnsim','\u22E9':'scnsim','\u22EE':'vellip','\u22EF':'ctdot','\u22F0':'utdot','\u22F1':'dtdot','\u22F2':'disin','\u22F3':'isinsv','\u22F4':'isins','\u22F5':'isindot','\u22F5\u0338':'notindot','\u22F6':'notinvc','\u22F7':'notinvb','\u22F9':'isinE','\u22F9\u0338':'notinE','\u22FA':'nisd','\u22FB':'xnis','\u22FC':'nis','\u22FD':'notnivc','\u22FE':'notnivb','\u2305':'barwed','\u2306':'Barwed','\u230C':'drcrop','\u230D':'dlcrop','\u230E':'urcrop','\u230F':'ulcrop','\u2310':'bnot','\u2312':'profline','\u2313':'profsurf','\u2315':'telrec','\u2316':'target','\u231C':'ulcorn','\u231D':'urcorn','\u231E':'dlcorn','\u231F':'drcorn','\u2322':'frown','\u2323':'smile','\u232D':'cylcty','\u232E':'profalar','\u2336':'topbot','\u233D':'ovbar','\u233F':'solbar','\u237C':'angzarr','\u23B0':'lmoust','\u23B1':'rmoust','\u23B4':'tbrk','\u23B5':'bbrk','\u23B6':'bbrktbrk','\u23DC':'OverParenthesis','\u23DD':'UnderParenthesis','\u23DE':'OverBrace','\u23DF':'UnderBrace','\u23E2':'trpezium','\u23E7':'elinters','\u2423':'blank','\u2500':'boxh','\u2502':'boxv','\u250C':'boxdr','\u2510':'boxdl','\u2514':'boxur','\u2518':'boxul','\u251C':'boxvr','\u2524':'boxvl','\u252C':'boxhd','\u2534':'boxhu','\u253C':'boxvh','\u2550':'boxH','\u2551':'boxV','\u2552':'boxdR','\u2553':'boxDr','\u2554':'boxDR','\u2555':'boxdL','\u2556':'boxDl','\u2557':'boxDL','\u2558':'boxuR','\u2559':'boxUr','\u255A':'boxUR','\u255B':'boxuL','\u255C':'boxUl','\u255D':'boxUL','\u255E':'boxvR','\u255F':'boxVr','\u2560':'boxVR','\u2561':'boxvL','\u2562':'boxVl','\u2563':'boxVL','\u2564':'boxHd','\u2565':'boxhD','\u2566':'boxHD','\u2567':'boxHu','\u2568':'boxhU','\u2569':'boxHU','\u256A':'boxvH','\u256B':'boxVh','\u256C':'boxVH','\u2580':'uhblk','\u2584':'lhblk','\u2588':'block','\u2591':'blk14','\u2592':'blk12','\u2593':'blk34','\u25A1':'squ','\u25AA':'squf','\u25AB':'EmptyVerySmallSquare','\u25AD':'rect','\u25AE':'marker','\u25B1':'fltns','\u25B3':'xutri','\u25B4':'utrif','\u25B5':'utri','\u25B8':'rtrif','\u25B9':'rtri','\u25BD':'xdtri','\u25BE':'dtrif','\u25BF':'dtri','\u25C2':'ltrif','\u25C3':'ltri','\u25CA':'loz','\u25CB':'cir','\u25EC':'tridot','\u25EF':'xcirc','\u25F8':'ultri','\u25F9':'urtri','\u25FA':'lltri','\u25FB':'EmptySmallSquare','\u25FC':'FilledSmallSquare','\u2605':'starf','\u2606':'star','\u260E':'phone','\u2640':'female','\u2642':'male','\u2660':'spades','\u2663':'clubs','\u2665':'hearts','\u2666':'diams','\u266A':'sung','\u2713':'check','\u2717':'cross','\u2720':'malt','\u2736':'sext','\u2758':'VerticalSeparator','\u27C8':'bsolhsub','\u27C9':'suphsol','\u27F5':'xlarr','\u27F6':'xrarr','\u27F7':'xharr','\u27F8':'xlArr','\u27F9':'xrArr','\u27FA':'xhArr','\u27FC':'xmap','\u27FF':'dzigrarr','\u2902':'nvlArr','\u2903':'nvrArr','\u2904':'nvHarr','\u2905':'Map','\u290C':'lbarr','\u290D':'rbarr','\u290E':'lBarr','\u290F':'rBarr','\u2910':'RBarr','\u2911':'DDotrahd','\u2912':'UpArrowBar','\u2913':'DownArrowBar','\u2916':'Rarrtl','\u2919':'latail','\u291A':'ratail','\u291B':'lAtail','\u291C':'rAtail','\u291D':'larrfs','\u291E':'rarrfs','\u291F':'larrbfs','\u2920':'rarrbfs','\u2923':'nwarhk','\u2924':'nearhk','\u2925':'searhk','\u2926':'swarhk','\u2927':'nwnear','\u2928':'toea','\u2929':'tosa','\u292A':'swnwar','\u2933':'rarrc','\u2933\u0338':'nrarrc','\u2935':'cudarrr','\u2936':'ldca','\u2937':'rdca','\u2938':'cudarrl','\u2939':'larrpl','\u293C':'curarrm','\u293D':'cularrp','\u2945':'rarrpl','\u2948':'harrcir','\u2949':'Uarrocir','\u294A':'lurdshar','\u294B':'ldrushar','\u294E':'LeftRightVector','\u294F':'RightUpDownVector','\u2950':'DownLeftRightVector','\u2951':'LeftUpDownVector','\u2952':'LeftVectorBar','\u2953':'RightVectorBar','\u2954':'RightUpVectorBar','\u2955':'RightDownVectorBar','\u2956':'DownLeftVectorBar','\u2957':'DownRightVectorBar','\u2958':'LeftUpVectorBar','\u2959':'LeftDownVectorBar','\u295A':'LeftTeeVector','\u295B':'RightTeeVector','\u295C':'RightUpTeeVector','\u295D':'RightDownTeeVector','\u295E':'DownLeftTeeVector','\u295F':'DownRightTeeVector','\u2960':'LeftUpTeeVector','\u2961':'LeftDownTeeVector','\u2962':'lHar','\u2963':'uHar','\u2964':'rHar','\u2965':'dHar','\u2966':'luruhar','\u2967':'ldrdhar','\u2968':'ruluhar','\u2969':'rdldhar','\u296A':'lharul','\u296B':'llhard','\u296C':'rharul','\u296D':'lrhard','\u296E':'udhar','\u296F':'duhar','\u2970':'RoundImplies','\u2971':'erarr','\u2972':'simrarr','\u2973':'larrsim','\u2974':'rarrsim','\u2975':'rarrap','\u2976':'ltlarr','\u2978':'gtrarr','\u2979':'subrarr','\u297B':'suplarr','\u297C':'lfisht','\u297D':'rfisht','\u297E':'ufisht','\u297F':'dfisht','\u299A':'vzigzag','\u299C':'vangrt','\u299D':'angrtvbd','\u29A4':'ange','\u29A5':'range','\u29A6':'dwangle','\u29A7':'uwangle','\u29A8':'angmsdaa','\u29A9':'angmsdab','\u29AA':'angmsdac','\u29AB':'angmsdad','\u29AC':'angmsdae','\u29AD':'angmsdaf','\u29AE':'angmsdag','\u29AF':'angmsdah','\u29B0':'bemptyv','\u29B1':'demptyv','\u29B2':'cemptyv','\u29B3':'raemptyv','\u29B4':'laemptyv','\u29B5':'ohbar','\u29B6':'omid','\u29B7':'opar','\u29B9':'operp','\u29BB':'olcross','\u29BC':'odsold','\u29BE':'olcir','\u29BF':'ofcir','\u29C0':'olt','\u29C1':'ogt','\u29C2':'cirscir','\u29C3':'cirE','\u29C4':'solb','\u29C5':'bsolb','\u29C9':'boxbox','\u29CD':'trisb','\u29CE':'rtriltri','\u29CF':'LeftTriangleBar','\u29CF\u0338':'NotLeftTriangleBar','\u29D0':'RightTriangleBar','\u29D0\u0338':'NotRightTriangleBar','\u29DC':'iinfin','\u29DD':'infintie','\u29DE':'nvinfin','\u29E3':'eparsl','\u29E4':'smeparsl','\u29E5':'eqvparsl','\u29EB':'lozf','\u29F4':'RuleDelayed','\u29F6':'dsol','\u2A00':'xodot','\u2A01':'xoplus','\u2A02':'xotime','\u2A04':'xuplus','\u2A06':'xsqcup','\u2A0D':'fpartint','\u2A10':'cirfnint','\u2A11':'awint','\u2A12':'rppolint','\u2A13':'scpolint','\u2A14':'npolint','\u2A15':'pointint','\u2A16':'quatint','\u2A17':'intlarhk','\u2A22':'pluscir','\u2A23':'plusacir','\u2A24':'simplus','\u2A25':'plusdu','\u2A26':'plussim','\u2A27':'plustwo','\u2A29':'mcomma','\u2A2A':'minusdu','\u2A2D':'loplus','\u2A2E':'roplus','\u2A2F':'Cross','\u2A30':'timesd','\u2A31':'timesbar','\u2A33':'smashp','\u2A34':'lotimes','\u2A35':'rotimes','\u2A36':'otimesas','\u2A37':'Otimes','\u2A38':'odiv','\u2A39':'triplus','\u2A3A':'triminus','\u2A3B':'tritime','\u2A3C':'iprod','\u2A3F':'amalg','\u2A40':'capdot','\u2A42':'ncup','\u2A43':'ncap','\u2A44':'capand','\u2A45':'cupor','\u2A46':'cupcap','\u2A47':'capcup','\u2A48':'cupbrcap','\u2A49':'capbrcup','\u2A4A':'cupcup','\u2A4B':'capcap','\u2A4C':'ccups','\u2A4D':'ccaps','\u2A50':'ccupssm','\u2A53':'And','\u2A54':'Or','\u2A55':'andand','\u2A56':'oror','\u2A57':'orslope','\u2A58':'andslope','\u2A5A':'andv','\u2A5B':'orv','\u2A5C':'andd','\u2A5D':'ord','\u2A5F':'wedbar','\u2A66':'sdote','\u2A6A':'simdot','\u2A6D':'congdot','\u2A6D\u0338':'ncongdot','\u2A6E':'easter','\u2A6F':'apacir','\u2A70':'apE','\u2A70\u0338':'napE','\u2A71':'eplus','\u2A72':'pluse','\u2A73':'Esim','\u2A77':'eDDot','\u2A78':'equivDD','\u2A79':'ltcir','\u2A7A':'gtcir','\u2A7B':'ltquest','\u2A7C':'gtquest','\u2A7D':'les','\u2A7D\u0338':'nles','\u2A7E':'ges','\u2A7E\u0338':'nges','\u2A7F':'lesdot','\u2A80':'gesdot','\u2A81':'lesdoto','\u2A82':'gesdoto','\u2A83':'lesdotor','\u2A84':'gesdotol','\u2A85':'lap','\u2A86':'gap','\u2A87':'lne','\u2A88':'gne','\u2A89':'lnap','\u2A8A':'gnap','\u2A8B':'lEg','\u2A8C':'gEl','\u2A8D':'lsime','\u2A8E':'gsime','\u2A8F':'lsimg','\u2A90':'gsiml','\u2A91':'lgE','\u2A92':'glE','\u2A93':'lesges','\u2A94':'gesles','\u2A95':'els','\u2A96':'egs','\u2A97':'elsdot','\u2A98':'egsdot','\u2A99':'el','\u2A9A':'eg','\u2A9D':'siml','\u2A9E':'simg','\u2A9F':'simlE','\u2AA0':'simgE','\u2AA1':'LessLess','\u2AA1\u0338':'NotNestedLessLess','\u2AA2':'GreaterGreater','\u2AA2\u0338':'NotNestedGreaterGreater','\u2AA4':'glj','\u2AA5':'gla','\u2AA6':'ltcc','\u2AA7':'gtcc','\u2AA8':'lescc','\u2AA9':'gescc','\u2AAA':'smt','\u2AAB':'lat','\u2AAC':'smte','\u2AAC\uFE00':'smtes','\u2AAD':'late','\u2AAD\uFE00':'lates','\u2AAE':'bumpE','\u2AAF':'pre','\u2AAF\u0338':'npre','\u2AB0':'sce','\u2AB0\u0338':'nsce','\u2AB3':'prE','\u2AB4':'scE','\u2AB5':'prnE','\u2AB6':'scnE','\u2AB7':'prap','\u2AB8':'scap','\u2AB9':'prnap','\u2ABA':'scnap','\u2ABB':'Pr','\u2ABC':'Sc','\u2ABD':'subdot','\u2ABE':'supdot','\u2ABF':'subplus','\u2AC0':'supplus','\u2AC1':'submult','\u2AC2':'supmult','\u2AC3':'subedot','\u2AC4':'supedot','\u2AC5':'subE','\u2AC5\u0338':'nsubE','\u2AC6':'supE','\u2AC6\u0338':'nsupE','\u2AC7':'subsim','\u2AC8':'supsim','\u2ACB\uFE00':'vsubnE','\u2ACB':'subnE','\u2ACC\uFE00':'vsupnE','\u2ACC':'supnE','\u2ACF':'csub','\u2AD0':'csup','\u2AD1':'csube','\u2AD2':'csupe','\u2AD3':'subsup','\u2AD4':'supsub','\u2AD5':'subsub','\u2AD6':'supsup','\u2AD7':'suphsub','\u2AD8':'supdsub','\u2AD9':'forkv','\u2ADA':'topfork','\u2ADB':'mlcp','\u2AE4':'Dashv','\u2AE6':'Vdashl','\u2AE7':'Barv','\u2AE8':'vBar','\u2AE9':'vBarv','\u2AEB':'Vbar','\u2AEC':'Not','\u2AED':'bNot','\u2AEE':'rnmid','\u2AEF':'cirmid','\u2AF0':'midcir','\u2AF1':'topcir','\u2AF2':'nhpar','\u2AF3':'parsim','\u2AFD':'parsl','\u2AFD\u20E5':'nparsl','\u266D':'flat','\u266E':'natur','\u266F':'sharp','\xA4':'curren','\xA2':'cent','$':'dollar','\xA3':'pound','\xA5':'yen','\u20AC':'euro','\xB9':'sup1','\xBD':'half','\u2153':'frac13','\xBC':'frac14','\u2155':'frac15','\u2159':'frac16','\u215B':'frac18','\xB2':'sup2','\u2154':'frac23','\u2156':'frac25','\xB3':'sup3','\xBE':'frac34','\u2157':'frac35','\u215C':'frac38','\u2158':'frac45','\u215A':'frac56','\u215D':'frac58','\u215E':'frac78','\uD835\uDCB6':'ascr','\uD835\uDD52':'aopf','\uD835\uDD1E':'afr','\uD835\uDD38':'Aopf','\uD835\uDD04':'Afr','\uD835\uDC9C':'Ascr','\xAA':'ordf','\xE1':'aacute','\xC1':'Aacute','\xE0':'agrave','\xC0':'Agrave','\u0103':'abreve','\u0102':'Abreve','\xE2':'acirc','\xC2':'Acirc','\xE5':'aring','\xC5':'angst','\xE4':'auml','\xC4':'Auml','\xE3':'atilde','\xC3':'Atilde','\u0105':'aogon','\u0104':'Aogon','\u0101':'amacr','\u0100':'Amacr','\xE6':'aelig','\xC6':'AElig','\uD835\uDCB7':'bscr','\uD835\uDD53':'bopf','\uD835\uDD1F':'bfr','\uD835\uDD39':'Bopf','\u212C':'Bscr','\uD835\uDD05':'Bfr','\uD835\uDD20':'cfr','\uD835\uDCB8':'cscr','\uD835\uDD54':'copf','\u212D':'Cfr','\uD835\uDC9E':'Cscr','\u2102':'Copf','\u0107':'cacute','\u0106':'Cacute','\u0109':'ccirc','\u0108':'Ccirc','\u010D':'ccaron','\u010C':'Ccaron','\u010B':'cdot','\u010A':'Cdot','\xE7':'ccedil','\xC7':'Ccedil','\u2105':'incare','\uD835\uDD21':'dfr','\u2146':'dd','\uD835\uDD55':'dopf','\uD835\uDCB9':'dscr','\uD835\uDC9F':'Dscr','\uD835\uDD07':'Dfr','\u2145':'DD','\uD835\uDD3B':'Dopf','\u010F':'dcaron','\u010E':'Dcaron','\u0111':'dstrok','\u0110':'Dstrok','\xF0':'eth','\xD0':'ETH','\u2147':'ee','\u212F':'escr','\uD835\uDD22':'efr','\uD835\uDD56':'eopf','\u2130':'Escr','\uD835\uDD08':'Efr','\uD835\uDD3C':'Eopf','\xE9':'eacute','\xC9':'Eacute','\xE8':'egrave','\xC8':'Egrave','\xEA':'ecirc','\xCA':'Ecirc','\u011B':'ecaron','\u011A':'Ecaron','\xEB':'euml','\xCB':'Euml','\u0117':'edot','\u0116':'Edot','\u0119':'eogon','\u0118':'Eogon','\u0113':'emacr','\u0112':'Emacr','\uD835\uDD23':'ffr','\uD835\uDD57':'fopf','\uD835\uDCBB':'fscr','\uD835\uDD09':'Ffr','\uD835\uDD3D':'Fopf','\u2131':'Fscr','\uFB00':'fflig','\uFB03':'ffilig','\uFB04':'ffllig','\uFB01':'filig','fj':'fjlig','\uFB02':'fllig','\u0192':'fnof','\u210A':'gscr','\uD835\uDD58':'gopf','\uD835\uDD24':'gfr','\uD835\uDCA2':'Gscr','\uD835\uDD3E':'Gopf','\uD835\uDD0A':'Gfr','\u01F5':'gacute','\u011F':'gbreve','\u011E':'Gbreve','\u011D':'gcirc','\u011C':'Gcirc','\u0121':'gdot','\u0120':'Gdot','\u0122':'Gcedil','\uD835\uDD25':'hfr','\u210E':'planckh','\uD835\uDCBD':'hscr','\uD835\uDD59':'hopf','\u210B':'Hscr','\u210C':'Hfr','\u210D':'Hopf','\u0125':'hcirc','\u0124':'Hcirc','\u210F':'hbar','\u0127':'hstrok','\u0126':'Hstrok','\uD835\uDD5A':'iopf','\uD835\uDD26':'ifr','\uD835\uDCBE':'iscr','\u2148':'ii','\uD835\uDD40':'Iopf','\u2110':'Iscr','\u2111':'Im','\xED':'iacute','\xCD':'Iacute','\xEC':'igrave','\xCC':'Igrave','\xEE':'icirc','\xCE':'Icirc','\xEF':'iuml','\xCF':'Iuml','\u0129':'itilde','\u0128':'Itilde','\u0130':'Idot','\u012F':'iogon','\u012E':'Iogon','\u012B':'imacr','\u012A':'Imacr','\u0133':'ijlig','\u0132':'IJlig','\u0131':'imath','\uD835\uDCBF':'jscr','\uD835\uDD5B':'jopf','\uD835\uDD27':'jfr','\uD835\uDCA5':'Jscr','\uD835\uDD0D':'Jfr','\uD835\uDD41':'Jopf','\u0135':'jcirc','\u0134':'Jcirc','\u0237':'jmath','\uD835\uDD5C':'kopf','\uD835\uDCC0':'kscr','\uD835\uDD28':'kfr','\uD835\uDCA6':'Kscr','\uD835\uDD42':'Kopf','\uD835\uDD0E':'Kfr','\u0137':'kcedil','\u0136':'Kcedil','\uD835\uDD29':'lfr','\uD835\uDCC1':'lscr','\u2113':'ell','\uD835\uDD5D':'lopf','\u2112':'Lscr','\uD835\uDD0F':'Lfr','\uD835\uDD43':'Lopf','\u013A':'lacute','\u0139':'Lacute','\u013E':'lcaron','\u013D':'Lcaron','\u013C':'lcedil','\u013B':'Lcedil','\u0142':'lstrok','\u0141':'Lstrok','\u0140':'lmidot','\u013F':'Lmidot','\uD835\uDD2A':'mfr','\uD835\uDD5E':'mopf','\uD835\uDCC2':'mscr','\uD835\uDD10':'Mfr','\uD835\uDD44':'Mopf','\u2133':'Mscr','\uD835\uDD2B':'nfr','\uD835\uDD5F':'nopf','\uD835\uDCC3':'nscr','\u2115':'Nopf','\uD835\uDCA9':'Nscr','\uD835\uDD11':'Nfr','\u0144':'nacute','\u0143':'Nacute','\u0148':'ncaron','\u0147':'Ncaron','\xF1':'ntilde','\xD1':'Ntilde','\u0146':'ncedil','\u0145':'Ncedil','\u2116':'numero','\u014B':'eng','\u014A':'ENG','\uD835\uDD60':'oopf','\uD835\uDD2C':'ofr','\u2134':'oscr','\uD835\uDCAA':'Oscr','\uD835\uDD12':'Ofr','\uD835\uDD46':'Oopf','\xBA':'ordm','\xF3':'oacute','\xD3':'Oacute','\xF2':'ograve','\xD2':'Ograve','\xF4':'ocirc','\xD4':'Ocirc','\xF6':'ouml','\xD6':'Ouml','\u0151':'odblac','\u0150':'Odblac','\xF5':'otilde','\xD5':'Otilde','\xF8':'oslash','\xD8':'Oslash','\u014D':'omacr','\u014C':'Omacr','\u0153':'oelig','\u0152':'OElig','\uD835\uDD2D':'pfr','\uD835\uDCC5':'pscr','\uD835\uDD61':'popf','\u2119':'Popf','\uD835\uDD13':'Pfr','\uD835\uDCAB':'Pscr','\uD835\uDD62':'qopf','\uD835\uDD2E':'qfr','\uD835\uDCC6':'qscr','\uD835\uDCAC':'Qscr','\uD835\uDD14':'Qfr','\u211A':'Qopf','\u0138':'kgreen','\uD835\uDD2F':'rfr','\uD835\uDD63':'ropf','\uD835\uDCC7':'rscr','\u211B':'Rscr','\u211C':'Re','\u211D':'Ropf','\u0155':'racute','\u0154':'Racute','\u0159':'rcaron','\u0158':'Rcaron','\u0157':'rcedil','\u0156':'Rcedil','\uD835\uDD64':'sopf','\uD835\uDCC8':'sscr','\uD835\uDD30':'sfr','\uD835\uDD4A':'Sopf','\uD835\uDD16':'Sfr','\uD835\uDCAE':'Sscr','\u24C8':'oS','\u015B':'sacute','\u015A':'Sacute','\u015D':'scirc','\u015C':'Scirc','\u0161':'scaron','\u0160':'Scaron','\u015F':'scedil','\u015E':'Scedil','\xDF':'szlig','\uD835\uDD31':'tfr','\uD835\uDCC9':'tscr','\uD835\uDD65':'topf','\uD835\uDCAF':'Tscr','\uD835\uDD17':'Tfr','\uD835\uDD4B':'Topf','\u0165':'tcaron','\u0164':'Tcaron','\u0163':'tcedil','\u0162':'Tcedil','\u2122':'trade','\u0167':'tstrok','\u0166':'Tstrok','\uD835\uDCCA':'uscr','\uD835\uDD66':'uopf','\uD835\uDD32':'ufr','\uD835\uDD4C':'Uopf','\uD835\uDD18':'Ufr','\uD835\uDCB0':'Uscr','\xFA':'uacute','\xDA':'Uacute','\xF9':'ugrave','\xD9':'Ugrave','\u016D':'ubreve','\u016C':'Ubreve','\xFB':'ucirc','\xDB':'Ucirc','\u016F':'uring','\u016E':'Uring','\xFC':'uuml','\xDC':'Uuml','\u0171':'udblac','\u0170':'Udblac','\u0169':'utilde','\u0168':'Utilde','\u0173':'uogon','\u0172':'Uogon','\u016B':'umacr','\u016A':'Umacr','\uD835\uDD33':'vfr','\uD835\uDD67':'vopf','\uD835\uDCCB':'vscr','\uD835\uDD19':'Vfr','\uD835\uDD4D':'Vopf','\uD835\uDCB1':'Vscr','\uD835\uDD68':'wopf','\uD835\uDCCC':'wscr','\uD835\uDD34':'wfr','\uD835\uDCB2':'Wscr','\uD835\uDD4E':'Wopf','\uD835\uDD1A':'Wfr','\u0175':'wcirc','\u0174':'Wcirc','\uD835\uDD35':'xfr','\uD835\uDCCD':'xscr','\uD835\uDD69':'xopf','\uD835\uDD4F':'Xopf','\uD835\uDD1B':'Xfr','\uD835\uDCB3':'Xscr','\uD835\uDD36':'yfr','\uD835\uDCCE':'yscr','\uD835\uDD6A':'yopf','\uD835\uDCB4':'Yscr','\uD835\uDD1C':'Yfr','\uD835\uDD50':'Yopf','\xFD':'yacute','\xDD':'Yacute','\u0177':'ycirc','\u0176':'Ycirc','\xFF':'yuml','\u0178':'Yuml','\uD835\uDCCF':'zscr','\uD835\uDD37':'zfr','\uD835\uDD6B':'zopf','\u2128':'Zfr','\u2124':'Zopf','\uD835\uDCB5':'Zscr','\u017A':'zacute','\u0179':'Zacute','\u017E':'zcaron','\u017D':'Zcaron','\u017C':'zdot','\u017B':'Zdot','\u01B5':'imped','\xFE':'thorn','\xDE':'THORN','\u0149':'napos','\u03B1':'alpha','\u0391':'Alpha','\u03B2':'beta','\u0392':'Beta','\u03B3':'gamma','\u0393':'Gamma','\u03B4':'delta','\u0394':'Delta','\u03B5':'epsi','\u03F5':'epsiv','\u0395':'Epsilon','\u03DD':'gammad','\u03DC':'Gammad','\u03B6':'zeta','\u0396':'Zeta','\u03B7':'eta','\u0397':'Eta','\u03B8':'theta','\u03D1':'thetav','\u0398':'Theta','\u03B9':'iota','\u0399':'Iota','\u03BA':'kappa','\u03F0':'kappav','\u039A':'Kappa','\u03BB':'lambda','\u039B':'Lambda','\u03BC':'mu','\xB5':'micro','\u039C':'Mu','\u03BD':'nu','\u039D':'Nu','\u03BE':'xi','\u039E':'Xi','\u03BF':'omicron','\u039F':'Omicron','\u03C0':'pi','\u03D6':'piv','\u03A0':'Pi','\u03C1':'rho','\u03F1':'rhov','\u03A1':'Rho','\u03C3':'sigma','\u03A3':'Sigma','\u03C2':'sigmaf','\u03C4':'tau','\u03A4':'Tau','\u03C5':'upsi','\u03A5':'Upsilon','\u03D2':'Upsi','\u03C6':'phi','\u03D5':'phiv','\u03A6':'Phi','\u03C7':'chi','\u03A7':'Chi','\u03C8':'psi','\u03A8':'Psi','\u03C9':'omega','\u03A9':'ohm','\u0430':'acy','\u0410':'Acy','\u0431':'bcy','\u0411':'Bcy','\u0432':'vcy','\u0412':'Vcy','\u0433':'gcy','\u0413':'Gcy','\u0453':'gjcy','\u0403':'GJcy','\u0434':'dcy','\u0414':'Dcy','\u0452':'djcy','\u0402':'DJcy','\u0435':'iecy','\u0415':'IEcy','\u0451':'iocy','\u0401':'IOcy','\u0454':'jukcy','\u0404':'Jukcy','\u0436':'zhcy','\u0416':'ZHcy','\u0437':'zcy','\u0417':'Zcy','\u0455':'dscy','\u0405':'DScy','\u0438':'icy','\u0418':'Icy','\u0456':'iukcy','\u0406':'Iukcy','\u0457':'yicy','\u0407':'YIcy','\u0439':'jcy','\u0419':'Jcy','\u0458':'jsercy','\u0408':'Jsercy','\u043A':'kcy','\u041A':'Kcy','\u045C':'kjcy','\u040C':'KJcy','\u043B':'lcy','\u041B':'Lcy','\u0459':'ljcy','\u0409':'LJcy','\u043C':'mcy','\u041C':'Mcy','\u043D':'ncy','\u041D':'Ncy','\u045A':'njcy','\u040A':'NJcy','\u043E':'ocy','\u041E':'Ocy','\u043F':'pcy','\u041F':'Pcy','\u0440':'rcy','\u0420':'Rcy','\u0441':'scy','\u0421':'Scy','\u0442':'tcy','\u0422':'Tcy','\u045B':'tshcy','\u040B':'TSHcy','\u0443':'ucy','\u0423':'Ucy','\u045E':'ubrcy','\u040E':'Ubrcy','\u0444':'fcy','\u0424':'Fcy','\u0445':'khcy','\u0425':'KHcy','\u0446':'tscy','\u0426':'TScy','\u0447':'chcy','\u0427':'CHcy','\u045F':'dzcy','\u040F':'DZcy','\u0448':'shcy','\u0428':'SHcy','\u0449':'shchcy','\u0429':'SHCHcy','\u044A':'hardcy','\u042A':'HARDcy','\u044B':'ycy','\u042B':'Ycy','\u044C':'softcy','\u042C':'SOFTcy','\u044D':'ecy','\u042D':'Ecy','\u044E':'yucy','\u042E':'YUcy','\u044F':'yacy','\u042F':'YAcy','\u2135':'aleph','\u2136':'beth','\u2137':'gimel','\u2138':'daleth'};

		var regexEscape = /["&'<>`]/g;
		var escapeMap = {
			'"': '&quot;',
			'&': '&amp;',
			'\'': '&#x27;',
			'<': '&lt;',
			// See https://mathiasbynens.be/notes/ambiguous-ampersands: in HTML, the
			// following is not strictly necessary unless it’s part of a tag or an
			// unquoted attribute value. We’re only escaping it to support those
			// situations, and for XML support.
			'>': '&gt;',
			// In Internet Explorer ≤ 8, the backtick character can be used
			// to break out of (un)quoted attribute values or HTML comments.
			// See http://html5sec.org/#102, http://html5sec.org/#108, and
			// http://html5sec.org/#133.
			'`': '&#x60;'
		};

		var regexInvalidEntity = /&#(?:[xX][^a-fA-F0-9]|[^0-9xX])/;
		var regexInvalidRawCodePoint = /[\0-\x08\x0B\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]|[\uD83F\uD87F\uD8BF\uD8FF\uD93F\uD97F\uD9BF\uD9FF\uDA3F\uDA7F\uDABF\uDAFF\uDB3F\uDB7F\uDBBF\uDBFF][\uDFFE\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
		var regexDecode = /&#([0-9]+)(;?)|&#[xX]([a-fA-F0-9]+)(;?)|&([0-9a-zA-Z]+);|&(Aacute|Agrave|Atilde|Ccedil|Eacute|Egrave|Iacute|Igrave|Ntilde|Oacute|Ograve|Oslash|Otilde|Uacute|Ugrave|Yacute|aacute|agrave|atilde|brvbar|ccedil|curren|divide|eacute|egrave|frac12|frac14|frac34|iacute|igrave|iquest|middot|ntilde|oacute|ograve|oslash|otilde|plusmn|uacute|ugrave|yacute|AElig|Acirc|Aring|Ecirc|Icirc|Ocirc|THORN|Ucirc|acirc|acute|aelig|aring|cedil|ecirc|icirc|iexcl|laquo|micro|ocirc|pound|raquo|szlig|thorn|times|ucirc|Auml|COPY|Euml|Iuml|Ouml|QUOT|Uuml|auml|cent|copy|euml|iuml|macr|nbsp|ordf|ordm|ouml|para|quot|sect|sup1|sup2|sup3|uuml|yuml|AMP|ETH|REG|amp|deg|eth|not|reg|shy|uml|yen|GT|LT|gt|lt)([=a-zA-Z0-9])?/g;
		var decodeMap = {'aacute':'\xE1','Aacute':'\xC1','abreve':'\u0103','Abreve':'\u0102','ac':'\u223E','acd':'\u223F','acE':'\u223E\u0333','acirc':'\xE2','Acirc':'\xC2','acute':'\xB4','acy':'\u0430','Acy':'\u0410','aelig':'\xE6','AElig':'\xC6','af':'\u2061','afr':'\uD835\uDD1E','Afr':'\uD835\uDD04','agrave':'\xE0','Agrave':'\xC0','alefsym':'\u2135','aleph':'\u2135','alpha':'\u03B1','Alpha':'\u0391','amacr':'\u0101','Amacr':'\u0100','amalg':'\u2A3F','amp':'&','AMP':'&','and':'\u2227','And':'\u2A53','andand':'\u2A55','andd':'\u2A5C','andslope':'\u2A58','andv':'\u2A5A','ang':'\u2220','ange':'\u29A4','angle':'\u2220','angmsd':'\u2221','angmsdaa':'\u29A8','angmsdab':'\u29A9','angmsdac':'\u29AA','angmsdad':'\u29AB','angmsdae':'\u29AC','angmsdaf':'\u29AD','angmsdag':'\u29AE','angmsdah':'\u29AF','angrt':'\u221F','angrtvb':'\u22BE','angrtvbd':'\u299D','angsph':'\u2222','angst':'\xC5','angzarr':'\u237C','aogon':'\u0105','Aogon':'\u0104','aopf':'\uD835\uDD52','Aopf':'\uD835\uDD38','ap':'\u2248','apacir':'\u2A6F','ape':'\u224A','apE':'\u2A70','apid':'\u224B','apos':'\'','ApplyFunction':'\u2061','approx':'\u2248','approxeq':'\u224A','aring':'\xE5','Aring':'\xC5','ascr':'\uD835\uDCB6','Ascr':'\uD835\uDC9C','Assign':'\u2254','ast':'*','asymp':'\u2248','asympeq':'\u224D','atilde':'\xE3','Atilde':'\xC3','auml':'\xE4','Auml':'\xC4','awconint':'\u2233','awint':'\u2A11','backcong':'\u224C','backepsilon':'\u03F6','backprime':'\u2035','backsim':'\u223D','backsimeq':'\u22CD','Backslash':'\u2216','Barv':'\u2AE7','barvee':'\u22BD','barwed':'\u2305','Barwed':'\u2306','barwedge':'\u2305','bbrk':'\u23B5','bbrktbrk':'\u23B6','bcong':'\u224C','bcy':'\u0431','Bcy':'\u0411','bdquo':'\u201E','becaus':'\u2235','because':'\u2235','Because':'\u2235','bemptyv':'\u29B0','bepsi':'\u03F6','bernou':'\u212C','Bernoullis':'\u212C','beta':'\u03B2','Beta':'\u0392','beth':'\u2136','between':'\u226C','bfr':'\uD835\uDD1F','Bfr':'\uD835\uDD05','bigcap':'\u22C2','bigcirc':'\u25EF','bigcup':'\u22C3','bigodot':'\u2A00','bigoplus':'\u2A01','bigotimes':'\u2A02','bigsqcup':'\u2A06','bigstar':'\u2605','bigtriangledown':'\u25BD','bigtriangleup':'\u25B3','biguplus':'\u2A04','bigvee':'\u22C1','bigwedge':'\u22C0','bkarow':'\u290D','blacklozenge':'\u29EB','blacksquare':'\u25AA','blacktriangle':'\u25B4','blacktriangledown':'\u25BE','blacktriangleleft':'\u25C2','blacktriangleright':'\u25B8','blank':'\u2423','blk12':'\u2592','blk14':'\u2591','blk34':'\u2593','block':'\u2588','bne':'=\u20E5','bnequiv':'\u2261\u20E5','bnot':'\u2310','bNot':'\u2AED','bopf':'\uD835\uDD53','Bopf':'\uD835\uDD39','bot':'\u22A5','bottom':'\u22A5','bowtie':'\u22C8','boxbox':'\u29C9','boxdl':'\u2510','boxdL':'\u2555','boxDl':'\u2556','boxDL':'\u2557','boxdr':'\u250C','boxdR':'\u2552','boxDr':'\u2553','boxDR':'\u2554','boxh':'\u2500','boxH':'\u2550','boxhd':'\u252C','boxhD':'\u2565','boxHd':'\u2564','boxHD':'\u2566','boxhu':'\u2534','boxhU':'\u2568','boxHu':'\u2567','boxHU':'\u2569','boxminus':'\u229F','boxplus':'\u229E','boxtimes':'\u22A0','boxul':'\u2518','boxuL':'\u255B','boxUl':'\u255C','boxUL':'\u255D','boxur':'\u2514','boxuR':'\u2558','boxUr':'\u2559','boxUR':'\u255A','boxv':'\u2502','boxV':'\u2551','boxvh':'\u253C','boxvH':'\u256A','boxVh':'\u256B','boxVH':'\u256C','boxvl':'\u2524','boxvL':'\u2561','boxVl':'\u2562','boxVL':'\u2563','boxvr':'\u251C','boxvR':'\u255E','boxVr':'\u255F','boxVR':'\u2560','bprime':'\u2035','breve':'\u02D8','Breve':'\u02D8','brvbar':'\xA6','bscr':'\uD835\uDCB7','Bscr':'\u212C','bsemi':'\u204F','bsim':'\u223D','bsime':'\u22CD','bsol':'\\','bsolb':'\u29C5','bsolhsub':'\u27C8','bull':'\u2022','bullet':'\u2022','bump':'\u224E','bumpe':'\u224F','bumpE':'\u2AAE','bumpeq':'\u224F','Bumpeq':'\u224E','cacute':'\u0107','Cacute':'\u0106','cap':'\u2229','Cap':'\u22D2','capand':'\u2A44','capbrcup':'\u2A49','capcap':'\u2A4B','capcup':'\u2A47','capdot':'\u2A40','CapitalDifferentialD':'\u2145','caps':'\u2229\uFE00','caret':'\u2041','caron':'\u02C7','Cayleys':'\u212D','ccaps':'\u2A4D','ccaron':'\u010D','Ccaron':'\u010C','ccedil':'\xE7','Ccedil':'\xC7','ccirc':'\u0109','Ccirc':'\u0108','Cconint':'\u2230','ccups':'\u2A4C','ccupssm':'\u2A50','cdot':'\u010B','Cdot':'\u010A','cedil':'\xB8','Cedilla':'\xB8','cemptyv':'\u29B2','cent':'\xA2','centerdot':'\xB7','CenterDot':'\xB7','cfr':'\uD835\uDD20','Cfr':'\u212D','chcy':'\u0447','CHcy':'\u0427','check':'\u2713','checkmark':'\u2713','chi':'\u03C7','Chi':'\u03A7','cir':'\u25CB','circ':'\u02C6','circeq':'\u2257','circlearrowleft':'\u21BA','circlearrowright':'\u21BB','circledast':'\u229B','circledcirc':'\u229A','circleddash':'\u229D','CircleDot':'\u2299','circledR':'\xAE','circledS':'\u24C8','CircleMinus':'\u2296','CirclePlus':'\u2295','CircleTimes':'\u2297','cire':'\u2257','cirE':'\u29C3','cirfnint':'\u2A10','cirmid':'\u2AEF','cirscir':'\u29C2','ClockwiseContourIntegral':'\u2232','CloseCurlyDoubleQuote':'\u201D','CloseCurlyQuote':'\u2019','clubs':'\u2663','clubsuit':'\u2663','colon':':','Colon':'\u2237','colone':'\u2254','Colone':'\u2A74','coloneq':'\u2254','comma':',','commat':'@','comp':'\u2201','compfn':'\u2218','complement':'\u2201','complexes':'\u2102','cong':'\u2245','congdot':'\u2A6D','Congruent':'\u2261','conint':'\u222E','Conint':'\u222F','ContourIntegral':'\u222E','copf':'\uD835\uDD54','Copf':'\u2102','coprod':'\u2210','Coproduct':'\u2210','copy':'\xA9','COPY':'\xA9','copysr':'\u2117','CounterClockwiseContourIntegral':'\u2233','crarr':'\u21B5','cross':'\u2717','Cross':'\u2A2F','cscr':'\uD835\uDCB8','Cscr':'\uD835\uDC9E','csub':'\u2ACF','csube':'\u2AD1','csup':'\u2AD0','csupe':'\u2AD2','ctdot':'\u22EF','cudarrl':'\u2938','cudarrr':'\u2935','cuepr':'\u22DE','cuesc':'\u22DF','cularr':'\u21B6','cularrp':'\u293D','cup':'\u222A','Cup':'\u22D3','cupbrcap':'\u2A48','cupcap':'\u2A46','CupCap':'\u224D','cupcup':'\u2A4A','cupdot':'\u228D','cupor':'\u2A45','cups':'\u222A\uFE00','curarr':'\u21B7','curarrm':'\u293C','curlyeqprec':'\u22DE','curlyeqsucc':'\u22DF','curlyvee':'\u22CE','curlywedge':'\u22CF','curren':'\xA4','curvearrowleft':'\u21B6','curvearrowright':'\u21B7','cuvee':'\u22CE','cuwed':'\u22CF','cwconint':'\u2232','cwint':'\u2231','cylcty':'\u232D','dagger':'\u2020','Dagger':'\u2021','daleth':'\u2138','darr':'\u2193','dArr':'\u21D3','Darr':'\u21A1','dash':'\u2010','dashv':'\u22A3','Dashv':'\u2AE4','dbkarow':'\u290F','dblac':'\u02DD','dcaron':'\u010F','Dcaron':'\u010E','dcy':'\u0434','Dcy':'\u0414','dd':'\u2146','DD':'\u2145','ddagger':'\u2021','ddarr':'\u21CA','DDotrahd':'\u2911','ddotseq':'\u2A77','deg':'\xB0','Del':'\u2207','delta':'\u03B4','Delta':'\u0394','demptyv':'\u29B1','dfisht':'\u297F','dfr':'\uD835\uDD21','Dfr':'\uD835\uDD07','dHar':'\u2965','dharl':'\u21C3','dharr':'\u21C2','DiacriticalAcute':'\xB4','DiacriticalDot':'\u02D9','DiacriticalDoubleAcute':'\u02DD','DiacriticalGrave':'`','DiacriticalTilde':'\u02DC','diam':'\u22C4','diamond':'\u22C4','Diamond':'\u22C4','diamondsuit':'\u2666','diams':'\u2666','die':'\xA8','DifferentialD':'\u2146','digamma':'\u03DD','disin':'\u22F2','div':'\xF7','divide':'\xF7','divideontimes':'\u22C7','divonx':'\u22C7','djcy':'\u0452','DJcy':'\u0402','dlcorn':'\u231E','dlcrop':'\u230D','dollar':'$','dopf':'\uD835\uDD55','Dopf':'\uD835\uDD3B','dot':'\u02D9','Dot':'\xA8','DotDot':'\u20DC','doteq':'\u2250','doteqdot':'\u2251','DotEqual':'\u2250','dotminus':'\u2238','dotplus':'\u2214','dotsquare':'\u22A1','doublebarwedge':'\u2306','DoubleContourIntegral':'\u222F','DoubleDot':'\xA8','DoubleDownArrow':'\u21D3','DoubleLeftArrow':'\u21D0','DoubleLeftRightArrow':'\u21D4','DoubleLeftTee':'\u2AE4','DoubleLongLeftArrow':'\u27F8','DoubleLongLeftRightArrow':'\u27FA','DoubleLongRightArrow':'\u27F9','DoubleRightArrow':'\u21D2','DoubleRightTee':'\u22A8','DoubleUpArrow':'\u21D1','DoubleUpDownArrow':'\u21D5','DoubleVerticalBar':'\u2225','downarrow':'\u2193','Downarrow':'\u21D3','DownArrow':'\u2193','DownArrowBar':'\u2913','DownArrowUpArrow':'\u21F5','DownBreve':'\u0311','downdownarrows':'\u21CA','downharpoonleft':'\u21C3','downharpoonright':'\u21C2','DownLeftRightVector':'\u2950','DownLeftTeeVector':'\u295E','DownLeftVector':'\u21BD','DownLeftVectorBar':'\u2956','DownRightTeeVector':'\u295F','DownRightVector':'\u21C1','DownRightVectorBar':'\u2957','DownTee':'\u22A4','DownTeeArrow':'\u21A7','drbkarow':'\u2910','drcorn':'\u231F','drcrop':'\u230C','dscr':'\uD835\uDCB9','Dscr':'\uD835\uDC9F','dscy':'\u0455','DScy':'\u0405','dsol':'\u29F6','dstrok':'\u0111','Dstrok':'\u0110','dtdot':'\u22F1','dtri':'\u25BF','dtrif':'\u25BE','duarr':'\u21F5','duhar':'\u296F','dwangle':'\u29A6','dzcy':'\u045F','DZcy':'\u040F','dzigrarr':'\u27FF','eacute':'\xE9','Eacute':'\xC9','easter':'\u2A6E','ecaron':'\u011B','Ecaron':'\u011A','ecir':'\u2256','ecirc':'\xEA','Ecirc':'\xCA','ecolon':'\u2255','ecy':'\u044D','Ecy':'\u042D','eDDot':'\u2A77','edot':'\u0117','eDot':'\u2251','Edot':'\u0116','ee':'\u2147','efDot':'\u2252','efr':'\uD835\uDD22','Efr':'\uD835\uDD08','eg':'\u2A9A','egrave':'\xE8','Egrave':'\xC8','egs':'\u2A96','egsdot':'\u2A98','el':'\u2A99','Element':'\u2208','elinters':'\u23E7','ell':'\u2113','els':'\u2A95','elsdot':'\u2A97','emacr':'\u0113','Emacr':'\u0112','empty':'\u2205','emptyset':'\u2205','EmptySmallSquare':'\u25FB','emptyv':'\u2205','EmptyVerySmallSquare':'\u25AB','emsp':'\u2003','emsp13':'\u2004','emsp14':'\u2005','eng':'\u014B','ENG':'\u014A','ensp':'\u2002','eogon':'\u0119','Eogon':'\u0118','eopf':'\uD835\uDD56','Eopf':'\uD835\uDD3C','epar':'\u22D5','eparsl':'\u29E3','eplus':'\u2A71','epsi':'\u03B5','epsilon':'\u03B5','Epsilon':'\u0395','epsiv':'\u03F5','eqcirc':'\u2256','eqcolon':'\u2255','eqsim':'\u2242','eqslantgtr':'\u2A96','eqslantless':'\u2A95','Equal':'\u2A75','equals':'=','EqualTilde':'\u2242','equest':'\u225F','Equilibrium':'\u21CC','equiv':'\u2261','equivDD':'\u2A78','eqvparsl':'\u29E5','erarr':'\u2971','erDot':'\u2253','escr':'\u212F','Escr':'\u2130','esdot':'\u2250','esim':'\u2242','Esim':'\u2A73','eta':'\u03B7','Eta':'\u0397','eth':'\xF0','ETH':'\xD0','euml':'\xEB','Euml':'\xCB','euro':'\u20AC','excl':'!','exist':'\u2203','Exists':'\u2203','expectation':'\u2130','exponentiale':'\u2147','ExponentialE':'\u2147','fallingdotseq':'\u2252','fcy':'\u0444','Fcy':'\u0424','female':'\u2640','ffilig':'\uFB03','fflig':'\uFB00','ffllig':'\uFB04','ffr':'\uD835\uDD23','Ffr':'\uD835\uDD09','filig':'\uFB01','FilledSmallSquare':'\u25FC','FilledVerySmallSquare':'\u25AA','fjlig':'fj','flat':'\u266D','fllig':'\uFB02','fltns':'\u25B1','fnof':'\u0192','fopf':'\uD835\uDD57','Fopf':'\uD835\uDD3D','forall':'\u2200','ForAll':'\u2200','fork':'\u22D4','forkv':'\u2AD9','Fouriertrf':'\u2131','fpartint':'\u2A0D','frac12':'\xBD','frac13':'\u2153','frac14':'\xBC','frac15':'\u2155','frac16':'\u2159','frac18':'\u215B','frac23':'\u2154','frac25':'\u2156','frac34':'\xBE','frac35':'\u2157','frac38':'\u215C','frac45':'\u2158','frac56':'\u215A','frac58':'\u215D','frac78':'\u215E','frasl':'\u2044','frown':'\u2322','fscr':'\uD835\uDCBB','Fscr':'\u2131','gacute':'\u01F5','gamma':'\u03B3','Gamma':'\u0393','gammad':'\u03DD','Gammad':'\u03DC','gap':'\u2A86','gbreve':'\u011F','Gbreve':'\u011E','Gcedil':'\u0122','gcirc':'\u011D','Gcirc':'\u011C','gcy':'\u0433','Gcy':'\u0413','gdot':'\u0121','Gdot':'\u0120','ge':'\u2265','gE':'\u2267','gel':'\u22DB','gEl':'\u2A8C','geq':'\u2265','geqq':'\u2267','geqslant':'\u2A7E','ges':'\u2A7E','gescc':'\u2AA9','gesdot':'\u2A80','gesdoto':'\u2A82','gesdotol':'\u2A84','gesl':'\u22DB\uFE00','gesles':'\u2A94','gfr':'\uD835\uDD24','Gfr':'\uD835\uDD0A','gg':'\u226B','Gg':'\u22D9','ggg':'\u22D9','gimel':'\u2137','gjcy':'\u0453','GJcy':'\u0403','gl':'\u2277','gla':'\u2AA5','glE':'\u2A92','glj':'\u2AA4','gnap':'\u2A8A','gnapprox':'\u2A8A','gne':'\u2A88','gnE':'\u2269','gneq':'\u2A88','gneqq':'\u2269','gnsim':'\u22E7','gopf':'\uD835\uDD58','Gopf':'\uD835\uDD3E','grave':'`','GreaterEqual':'\u2265','GreaterEqualLess':'\u22DB','GreaterFullEqual':'\u2267','GreaterGreater':'\u2AA2','GreaterLess':'\u2277','GreaterSlantEqual':'\u2A7E','GreaterTilde':'\u2273','gscr':'\u210A','Gscr':'\uD835\uDCA2','gsim':'\u2273','gsime':'\u2A8E','gsiml':'\u2A90','gt':'>','Gt':'\u226B','GT':'>','gtcc':'\u2AA7','gtcir':'\u2A7A','gtdot':'\u22D7','gtlPar':'\u2995','gtquest':'\u2A7C','gtrapprox':'\u2A86','gtrarr':'\u2978','gtrdot':'\u22D7','gtreqless':'\u22DB','gtreqqless':'\u2A8C','gtrless':'\u2277','gtrsim':'\u2273','gvertneqq':'\u2269\uFE00','gvnE':'\u2269\uFE00','Hacek':'\u02C7','hairsp':'\u200A','half':'\xBD','hamilt':'\u210B','hardcy':'\u044A','HARDcy':'\u042A','harr':'\u2194','hArr':'\u21D4','harrcir':'\u2948','harrw':'\u21AD','Hat':'^','hbar':'\u210F','hcirc':'\u0125','Hcirc':'\u0124','hearts':'\u2665','heartsuit':'\u2665','hellip':'\u2026','hercon':'\u22B9','hfr':'\uD835\uDD25','Hfr':'\u210C','HilbertSpace':'\u210B','hksearow':'\u2925','hkswarow':'\u2926','hoarr':'\u21FF','homtht':'\u223B','hookleftarrow':'\u21A9','hookrightarrow':'\u21AA','hopf':'\uD835\uDD59','Hopf':'\u210D','horbar':'\u2015','HorizontalLine':'\u2500','hscr':'\uD835\uDCBD','Hscr':'\u210B','hslash':'\u210F','hstrok':'\u0127','Hstrok':'\u0126','HumpDownHump':'\u224E','HumpEqual':'\u224F','hybull':'\u2043','hyphen':'\u2010','iacute':'\xED','Iacute':'\xCD','ic':'\u2063','icirc':'\xEE','Icirc':'\xCE','icy':'\u0438','Icy':'\u0418','Idot':'\u0130','iecy':'\u0435','IEcy':'\u0415','iexcl':'\xA1','iff':'\u21D4','ifr':'\uD835\uDD26','Ifr':'\u2111','igrave':'\xEC','Igrave':'\xCC','ii':'\u2148','iiiint':'\u2A0C','iiint':'\u222D','iinfin':'\u29DC','iiota':'\u2129','ijlig':'\u0133','IJlig':'\u0132','Im':'\u2111','imacr':'\u012B','Imacr':'\u012A','image':'\u2111','ImaginaryI':'\u2148','imagline':'\u2110','imagpart':'\u2111','imath':'\u0131','imof':'\u22B7','imped':'\u01B5','Implies':'\u21D2','in':'\u2208','incare':'\u2105','infin':'\u221E','infintie':'\u29DD','inodot':'\u0131','int':'\u222B','Int':'\u222C','intcal':'\u22BA','integers':'\u2124','Integral':'\u222B','intercal':'\u22BA','Intersection':'\u22C2','intlarhk':'\u2A17','intprod':'\u2A3C','InvisibleComma':'\u2063','InvisibleTimes':'\u2062','iocy':'\u0451','IOcy':'\u0401','iogon':'\u012F','Iogon':'\u012E','iopf':'\uD835\uDD5A','Iopf':'\uD835\uDD40','iota':'\u03B9','Iota':'\u0399','iprod':'\u2A3C','iquest':'\xBF','iscr':'\uD835\uDCBE','Iscr':'\u2110','isin':'\u2208','isindot':'\u22F5','isinE':'\u22F9','isins':'\u22F4','isinsv':'\u22F3','isinv':'\u2208','it':'\u2062','itilde':'\u0129','Itilde':'\u0128','iukcy':'\u0456','Iukcy':'\u0406','iuml':'\xEF','Iuml':'\xCF','jcirc':'\u0135','Jcirc':'\u0134','jcy':'\u0439','Jcy':'\u0419','jfr':'\uD835\uDD27','Jfr':'\uD835\uDD0D','jmath':'\u0237','jopf':'\uD835\uDD5B','Jopf':'\uD835\uDD41','jscr':'\uD835\uDCBF','Jscr':'\uD835\uDCA5','jsercy':'\u0458','Jsercy':'\u0408','jukcy':'\u0454','Jukcy':'\u0404','kappa':'\u03BA','Kappa':'\u039A','kappav':'\u03F0','kcedil':'\u0137','Kcedil':'\u0136','kcy':'\u043A','Kcy':'\u041A','kfr':'\uD835\uDD28','Kfr':'\uD835\uDD0E','kgreen':'\u0138','khcy':'\u0445','KHcy':'\u0425','kjcy':'\u045C','KJcy':'\u040C','kopf':'\uD835\uDD5C','Kopf':'\uD835\uDD42','kscr':'\uD835\uDCC0','Kscr':'\uD835\uDCA6','lAarr':'\u21DA','lacute':'\u013A','Lacute':'\u0139','laemptyv':'\u29B4','lagran':'\u2112','lambda':'\u03BB','Lambda':'\u039B','lang':'\u27E8','Lang':'\u27EA','langd':'\u2991','langle':'\u27E8','lap':'\u2A85','Laplacetrf':'\u2112','laquo':'\xAB','larr':'\u2190','lArr':'\u21D0','Larr':'\u219E','larrb':'\u21E4','larrbfs':'\u291F','larrfs':'\u291D','larrhk':'\u21A9','larrlp':'\u21AB','larrpl':'\u2939','larrsim':'\u2973','larrtl':'\u21A2','lat':'\u2AAB','latail':'\u2919','lAtail':'\u291B','late':'\u2AAD','lates':'\u2AAD\uFE00','lbarr':'\u290C','lBarr':'\u290E','lbbrk':'\u2772','lbrace':'{','lbrack':'[','lbrke':'\u298B','lbrksld':'\u298F','lbrkslu':'\u298D','lcaron':'\u013E','Lcaron':'\u013D','lcedil':'\u013C','Lcedil':'\u013B','lceil':'\u2308','lcub':'{','lcy':'\u043B','Lcy':'\u041B','ldca':'\u2936','ldquo':'\u201C','ldquor':'\u201E','ldrdhar':'\u2967','ldrushar':'\u294B','ldsh':'\u21B2','le':'\u2264','lE':'\u2266','LeftAngleBracket':'\u27E8','leftarrow':'\u2190','Leftarrow':'\u21D0','LeftArrow':'\u2190','LeftArrowBar':'\u21E4','LeftArrowRightArrow':'\u21C6','leftarrowtail':'\u21A2','LeftCeiling':'\u2308','LeftDoubleBracket':'\u27E6','LeftDownTeeVector':'\u2961','LeftDownVector':'\u21C3','LeftDownVectorBar':'\u2959','LeftFloor':'\u230A','leftharpoondown':'\u21BD','leftharpoonup':'\u21BC','leftleftarrows':'\u21C7','leftrightarrow':'\u2194','Leftrightarrow':'\u21D4','LeftRightArrow':'\u2194','leftrightarrows':'\u21C6','leftrightharpoons':'\u21CB','leftrightsquigarrow':'\u21AD','LeftRightVector':'\u294E','LeftTee':'\u22A3','LeftTeeArrow':'\u21A4','LeftTeeVector':'\u295A','leftthreetimes':'\u22CB','LeftTriangle':'\u22B2','LeftTriangleBar':'\u29CF','LeftTriangleEqual':'\u22B4','LeftUpDownVector':'\u2951','LeftUpTeeVector':'\u2960','LeftUpVector':'\u21BF','LeftUpVectorBar':'\u2958','LeftVector':'\u21BC','LeftVectorBar':'\u2952','leg':'\u22DA','lEg':'\u2A8B','leq':'\u2264','leqq':'\u2266','leqslant':'\u2A7D','les':'\u2A7D','lescc':'\u2AA8','lesdot':'\u2A7F','lesdoto':'\u2A81','lesdotor':'\u2A83','lesg':'\u22DA\uFE00','lesges':'\u2A93','lessapprox':'\u2A85','lessdot':'\u22D6','lesseqgtr':'\u22DA','lesseqqgtr':'\u2A8B','LessEqualGreater':'\u22DA','LessFullEqual':'\u2266','LessGreater':'\u2276','lessgtr':'\u2276','LessLess':'\u2AA1','lesssim':'\u2272','LessSlantEqual':'\u2A7D','LessTilde':'\u2272','lfisht':'\u297C','lfloor':'\u230A','lfr':'\uD835\uDD29','Lfr':'\uD835\uDD0F','lg':'\u2276','lgE':'\u2A91','lHar':'\u2962','lhard':'\u21BD','lharu':'\u21BC','lharul':'\u296A','lhblk':'\u2584','ljcy':'\u0459','LJcy':'\u0409','ll':'\u226A','Ll':'\u22D8','llarr':'\u21C7','llcorner':'\u231E','Lleftarrow':'\u21DA','llhard':'\u296B','lltri':'\u25FA','lmidot':'\u0140','Lmidot':'\u013F','lmoust':'\u23B0','lmoustache':'\u23B0','lnap':'\u2A89','lnapprox':'\u2A89','lne':'\u2A87','lnE':'\u2268','lneq':'\u2A87','lneqq':'\u2268','lnsim':'\u22E6','loang':'\u27EC','loarr':'\u21FD','lobrk':'\u27E6','longleftarrow':'\u27F5','Longleftarrow':'\u27F8','LongLeftArrow':'\u27F5','longleftrightarrow':'\u27F7','Longleftrightarrow':'\u27FA','LongLeftRightArrow':'\u27F7','longmapsto':'\u27FC','longrightarrow':'\u27F6','Longrightarrow':'\u27F9','LongRightArrow':'\u27F6','looparrowleft':'\u21AB','looparrowright':'\u21AC','lopar':'\u2985','lopf':'\uD835\uDD5D','Lopf':'\uD835\uDD43','loplus':'\u2A2D','lotimes':'\u2A34','lowast':'\u2217','lowbar':'_','LowerLeftArrow':'\u2199','LowerRightArrow':'\u2198','loz':'\u25CA','lozenge':'\u25CA','lozf':'\u29EB','lpar':'(','lparlt':'\u2993','lrarr':'\u21C6','lrcorner':'\u231F','lrhar':'\u21CB','lrhard':'\u296D','lrm':'\u200E','lrtri':'\u22BF','lsaquo':'\u2039','lscr':'\uD835\uDCC1','Lscr':'\u2112','lsh':'\u21B0','Lsh':'\u21B0','lsim':'\u2272','lsime':'\u2A8D','lsimg':'\u2A8F','lsqb':'[','lsquo':'\u2018','lsquor':'\u201A','lstrok':'\u0142','Lstrok':'\u0141','lt':'<','Lt':'\u226A','LT':'<','ltcc':'\u2AA6','ltcir':'\u2A79','ltdot':'\u22D6','lthree':'\u22CB','ltimes':'\u22C9','ltlarr':'\u2976','ltquest':'\u2A7B','ltri':'\u25C3','ltrie':'\u22B4','ltrif':'\u25C2','ltrPar':'\u2996','lurdshar':'\u294A','luruhar':'\u2966','lvertneqq':'\u2268\uFE00','lvnE':'\u2268\uFE00','macr':'\xAF','male':'\u2642','malt':'\u2720','maltese':'\u2720','map':'\u21A6','Map':'\u2905','mapsto':'\u21A6','mapstodown':'\u21A7','mapstoleft':'\u21A4','mapstoup':'\u21A5','marker':'\u25AE','mcomma':'\u2A29','mcy':'\u043C','Mcy':'\u041C','mdash':'\u2014','mDDot':'\u223A','measuredangle':'\u2221','MediumSpace':'\u205F','Mellintrf':'\u2133','mfr':'\uD835\uDD2A','Mfr':'\uD835\uDD10','mho':'\u2127','micro':'\xB5','mid':'\u2223','midast':'*','midcir':'\u2AF0','middot':'\xB7','minus':'\u2212','minusb':'\u229F','minusd':'\u2238','minusdu':'\u2A2A','MinusPlus':'\u2213','mlcp':'\u2ADB','mldr':'\u2026','mnplus':'\u2213','models':'\u22A7','mopf':'\uD835\uDD5E','Mopf':'\uD835\uDD44','mp':'\u2213','mscr':'\uD835\uDCC2','Mscr':'\u2133','mstpos':'\u223E','mu':'\u03BC','Mu':'\u039C','multimap':'\u22B8','mumap':'\u22B8','nabla':'\u2207','nacute':'\u0144','Nacute':'\u0143','nang':'\u2220\u20D2','nap':'\u2249','napE':'\u2A70\u0338','napid':'\u224B\u0338','napos':'\u0149','napprox':'\u2249','natur':'\u266E','natural':'\u266E','naturals':'\u2115','nbsp':'\xA0','nbump':'\u224E\u0338','nbumpe':'\u224F\u0338','ncap':'\u2A43','ncaron':'\u0148','Ncaron':'\u0147','ncedil':'\u0146','Ncedil':'\u0145','ncong':'\u2247','ncongdot':'\u2A6D\u0338','ncup':'\u2A42','ncy':'\u043D','Ncy':'\u041D','ndash':'\u2013','ne':'\u2260','nearhk':'\u2924','nearr':'\u2197','neArr':'\u21D7','nearrow':'\u2197','nedot':'\u2250\u0338','NegativeMediumSpace':'\u200B','NegativeThickSpace':'\u200B','NegativeThinSpace':'\u200B','NegativeVeryThinSpace':'\u200B','nequiv':'\u2262','nesear':'\u2928','nesim':'\u2242\u0338','NestedGreaterGreater':'\u226B','NestedLessLess':'\u226A','NewLine':'\n','nexist':'\u2204','nexists':'\u2204','nfr':'\uD835\uDD2B','Nfr':'\uD835\uDD11','nge':'\u2271','ngE':'\u2267\u0338','ngeq':'\u2271','ngeqq':'\u2267\u0338','ngeqslant':'\u2A7E\u0338','nges':'\u2A7E\u0338','nGg':'\u22D9\u0338','ngsim':'\u2275','ngt':'\u226F','nGt':'\u226B\u20D2','ngtr':'\u226F','nGtv':'\u226B\u0338','nharr':'\u21AE','nhArr':'\u21CE','nhpar':'\u2AF2','ni':'\u220B','nis':'\u22FC','nisd':'\u22FA','niv':'\u220B','njcy':'\u045A','NJcy':'\u040A','nlarr':'\u219A','nlArr':'\u21CD','nldr':'\u2025','nle':'\u2270','nlE':'\u2266\u0338','nleftarrow':'\u219A','nLeftarrow':'\u21CD','nleftrightarrow':'\u21AE','nLeftrightarrow':'\u21CE','nleq':'\u2270','nleqq':'\u2266\u0338','nleqslant':'\u2A7D\u0338','nles':'\u2A7D\u0338','nless':'\u226E','nLl':'\u22D8\u0338','nlsim':'\u2274','nlt':'\u226E','nLt':'\u226A\u20D2','nltri':'\u22EA','nltrie':'\u22EC','nLtv':'\u226A\u0338','nmid':'\u2224','NoBreak':'\u2060','NonBreakingSpace':'\xA0','nopf':'\uD835\uDD5F','Nopf':'\u2115','not':'\xAC','Not':'\u2AEC','NotCongruent':'\u2262','NotCupCap':'\u226D','NotDoubleVerticalBar':'\u2226','NotElement':'\u2209','NotEqual':'\u2260','NotEqualTilde':'\u2242\u0338','NotExists':'\u2204','NotGreater':'\u226F','NotGreaterEqual':'\u2271','NotGreaterFullEqual':'\u2267\u0338','NotGreaterGreater':'\u226B\u0338','NotGreaterLess':'\u2279','NotGreaterSlantEqual':'\u2A7E\u0338','NotGreaterTilde':'\u2275','NotHumpDownHump':'\u224E\u0338','NotHumpEqual':'\u224F\u0338','notin':'\u2209','notindot':'\u22F5\u0338','notinE':'\u22F9\u0338','notinva':'\u2209','notinvb':'\u22F7','notinvc':'\u22F6','NotLeftTriangle':'\u22EA','NotLeftTriangleBar':'\u29CF\u0338','NotLeftTriangleEqual':'\u22EC','NotLess':'\u226E','NotLessEqual':'\u2270','NotLessGreater':'\u2278','NotLessLess':'\u226A\u0338','NotLessSlantEqual':'\u2A7D\u0338','NotLessTilde':'\u2274','NotNestedGreaterGreater':'\u2AA2\u0338','NotNestedLessLess':'\u2AA1\u0338','notni':'\u220C','notniva':'\u220C','notnivb':'\u22FE','notnivc':'\u22FD','NotPrecedes':'\u2280','NotPrecedesEqual':'\u2AAF\u0338','NotPrecedesSlantEqual':'\u22E0','NotReverseElement':'\u220C','NotRightTriangle':'\u22EB','NotRightTriangleBar':'\u29D0\u0338','NotRightTriangleEqual':'\u22ED','NotSquareSubset':'\u228F\u0338','NotSquareSubsetEqual':'\u22E2','NotSquareSuperset':'\u2290\u0338','NotSquareSupersetEqual':'\u22E3','NotSubset':'\u2282\u20D2','NotSubsetEqual':'\u2288','NotSucceeds':'\u2281','NotSucceedsEqual':'\u2AB0\u0338','NotSucceedsSlantEqual':'\u22E1','NotSucceedsTilde':'\u227F\u0338','NotSuperset':'\u2283\u20D2','NotSupersetEqual':'\u2289','NotTilde':'\u2241','NotTildeEqual':'\u2244','NotTildeFullEqual':'\u2247','NotTildeTilde':'\u2249','NotVerticalBar':'\u2224','npar':'\u2226','nparallel':'\u2226','nparsl':'\u2AFD\u20E5','npart':'\u2202\u0338','npolint':'\u2A14','npr':'\u2280','nprcue':'\u22E0','npre':'\u2AAF\u0338','nprec':'\u2280','npreceq':'\u2AAF\u0338','nrarr':'\u219B','nrArr':'\u21CF','nrarrc':'\u2933\u0338','nrarrw':'\u219D\u0338','nrightarrow':'\u219B','nRightarrow':'\u21CF','nrtri':'\u22EB','nrtrie':'\u22ED','nsc':'\u2281','nsccue':'\u22E1','nsce':'\u2AB0\u0338','nscr':'\uD835\uDCC3','Nscr':'\uD835\uDCA9','nshortmid':'\u2224','nshortparallel':'\u2226','nsim':'\u2241','nsime':'\u2244','nsimeq':'\u2244','nsmid':'\u2224','nspar':'\u2226','nsqsube':'\u22E2','nsqsupe':'\u22E3','nsub':'\u2284','nsube':'\u2288','nsubE':'\u2AC5\u0338','nsubset':'\u2282\u20D2','nsubseteq':'\u2288','nsubseteqq':'\u2AC5\u0338','nsucc':'\u2281','nsucceq':'\u2AB0\u0338','nsup':'\u2285','nsupe':'\u2289','nsupE':'\u2AC6\u0338','nsupset':'\u2283\u20D2','nsupseteq':'\u2289','nsupseteqq':'\u2AC6\u0338','ntgl':'\u2279','ntilde':'\xF1','Ntilde':'\xD1','ntlg':'\u2278','ntriangleleft':'\u22EA','ntrianglelefteq':'\u22EC','ntriangleright':'\u22EB','ntrianglerighteq':'\u22ED','nu':'\u03BD','Nu':'\u039D','num':'#','numero':'\u2116','numsp':'\u2007','nvap':'\u224D\u20D2','nvdash':'\u22AC','nvDash':'\u22AD','nVdash':'\u22AE','nVDash':'\u22AF','nvge':'\u2265\u20D2','nvgt':'>\u20D2','nvHarr':'\u2904','nvinfin':'\u29DE','nvlArr':'\u2902','nvle':'\u2264\u20D2','nvlt':'<\u20D2','nvltrie':'\u22B4\u20D2','nvrArr':'\u2903','nvrtrie':'\u22B5\u20D2','nvsim':'\u223C\u20D2','nwarhk':'\u2923','nwarr':'\u2196','nwArr':'\u21D6','nwarrow':'\u2196','nwnear':'\u2927','oacute':'\xF3','Oacute':'\xD3','oast':'\u229B','ocir':'\u229A','ocirc':'\xF4','Ocirc':'\xD4','ocy':'\u043E','Ocy':'\u041E','odash':'\u229D','odblac':'\u0151','Odblac':'\u0150','odiv':'\u2A38','odot':'\u2299','odsold':'\u29BC','oelig':'\u0153','OElig':'\u0152','ofcir':'\u29BF','ofr':'\uD835\uDD2C','Ofr':'\uD835\uDD12','ogon':'\u02DB','ograve':'\xF2','Ograve':'\xD2','ogt':'\u29C1','ohbar':'\u29B5','ohm':'\u03A9','oint':'\u222E','olarr':'\u21BA','olcir':'\u29BE','olcross':'\u29BB','oline':'\u203E','olt':'\u29C0','omacr':'\u014D','Omacr':'\u014C','omega':'\u03C9','Omega':'\u03A9','omicron':'\u03BF','Omicron':'\u039F','omid':'\u29B6','ominus':'\u2296','oopf':'\uD835\uDD60','Oopf':'\uD835\uDD46','opar':'\u29B7','OpenCurlyDoubleQuote':'\u201C','OpenCurlyQuote':'\u2018','operp':'\u29B9','oplus':'\u2295','or':'\u2228','Or':'\u2A54','orarr':'\u21BB','ord':'\u2A5D','order':'\u2134','orderof':'\u2134','ordf':'\xAA','ordm':'\xBA','origof':'\u22B6','oror':'\u2A56','orslope':'\u2A57','orv':'\u2A5B','oS':'\u24C8','oscr':'\u2134','Oscr':'\uD835\uDCAA','oslash':'\xF8','Oslash':'\xD8','osol':'\u2298','otilde':'\xF5','Otilde':'\xD5','otimes':'\u2297','Otimes':'\u2A37','otimesas':'\u2A36','ouml':'\xF6','Ouml':'\xD6','ovbar':'\u233D','OverBar':'\u203E','OverBrace':'\u23DE','OverBracket':'\u23B4','OverParenthesis':'\u23DC','par':'\u2225','para':'\xB6','parallel':'\u2225','parsim':'\u2AF3','parsl':'\u2AFD','part':'\u2202','PartialD':'\u2202','pcy':'\u043F','Pcy':'\u041F','percnt':'%','period':'.','permil':'\u2030','perp':'\u22A5','pertenk':'\u2031','pfr':'\uD835\uDD2D','Pfr':'\uD835\uDD13','phi':'\u03C6','Phi':'\u03A6','phiv':'\u03D5','phmmat':'\u2133','phone':'\u260E','pi':'\u03C0','Pi':'\u03A0','pitchfork':'\u22D4','piv':'\u03D6','planck':'\u210F','planckh':'\u210E','plankv':'\u210F','plus':'+','plusacir':'\u2A23','plusb':'\u229E','pluscir':'\u2A22','plusdo':'\u2214','plusdu':'\u2A25','pluse':'\u2A72','PlusMinus':'\xB1','plusmn':'\xB1','plussim':'\u2A26','plustwo':'\u2A27','pm':'\xB1','Poincareplane':'\u210C','pointint':'\u2A15','popf':'\uD835\uDD61','Popf':'\u2119','pound':'\xA3','pr':'\u227A','Pr':'\u2ABB','prap':'\u2AB7','prcue':'\u227C','pre':'\u2AAF','prE':'\u2AB3','prec':'\u227A','precapprox':'\u2AB7','preccurlyeq':'\u227C','Precedes':'\u227A','PrecedesEqual':'\u2AAF','PrecedesSlantEqual':'\u227C','PrecedesTilde':'\u227E','preceq':'\u2AAF','precnapprox':'\u2AB9','precneqq':'\u2AB5','precnsim':'\u22E8','precsim':'\u227E','prime':'\u2032','Prime':'\u2033','primes':'\u2119','prnap':'\u2AB9','prnE':'\u2AB5','prnsim':'\u22E8','prod':'\u220F','Product':'\u220F','profalar':'\u232E','profline':'\u2312','profsurf':'\u2313','prop':'\u221D','Proportion':'\u2237','Proportional':'\u221D','propto':'\u221D','prsim':'\u227E','prurel':'\u22B0','pscr':'\uD835\uDCC5','Pscr':'\uD835\uDCAB','psi':'\u03C8','Psi':'\u03A8','puncsp':'\u2008','qfr':'\uD835\uDD2E','Qfr':'\uD835\uDD14','qint':'\u2A0C','qopf':'\uD835\uDD62','Qopf':'\u211A','qprime':'\u2057','qscr':'\uD835\uDCC6','Qscr':'\uD835\uDCAC','quaternions':'\u210D','quatint':'\u2A16','quest':'?','questeq':'\u225F','quot':'"','QUOT':'"','rAarr':'\u21DB','race':'\u223D\u0331','racute':'\u0155','Racute':'\u0154','radic':'\u221A','raemptyv':'\u29B3','rang':'\u27E9','Rang':'\u27EB','rangd':'\u2992','range':'\u29A5','rangle':'\u27E9','raquo':'\xBB','rarr':'\u2192','rArr':'\u21D2','Rarr':'\u21A0','rarrap':'\u2975','rarrb':'\u21E5','rarrbfs':'\u2920','rarrc':'\u2933','rarrfs':'\u291E','rarrhk':'\u21AA','rarrlp':'\u21AC','rarrpl':'\u2945','rarrsim':'\u2974','rarrtl':'\u21A3','Rarrtl':'\u2916','rarrw':'\u219D','ratail':'\u291A','rAtail':'\u291C','ratio':'\u2236','rationals':'\u211A','rbarr':'\u290D','rBarr':'\u290F','RBarr':'\u2910','rbbrk':'\u2773','rbrace':'}','rbrack':']','rbrke':'\u298C','rbrksld':'\u298E','rbrkslu':'\u2990','rcaron':'\u0159','Rcaron':'\u0158','rcedil':'\u0157','Rcedil':'\u0156','rceil':'\u2309','rcub':'}','rcy':'\u0440','Rcy':'\u0420','rdca':'\u2937','rdldhar':'\u2969','rdquo':'\u201D','rdquor':'\u201D','rdsh':'\u21B3','Re':'\u211C','real':'\u211C','realine':'\u211B','realpart':'\u211C','reals':'\u211D','rect':'\u25AD','reg':'\xAE','REG':'\xAE','ReverseElement':'\u220B','ReverseEquilibrium':'\u21CB','ReverseUpEquilibrium':'\u296F','rfisht':'\u297D','rfloor':'\u230B','rfr':'\uD835\uDD2F','Rfr':'\u211C','rHar':'\u2964','rhard':'\u21C1','rharu':'\u21C0','rharul':'\u296C','rho':'\u03C1','Rho':'\u03A1','rhov':'\u03F1','RightAngleBracket':'\u27E9','rightarrow':'\u2192','Rightarrow':'\u21D2','RightArrow':'\u2192','RightArrowBar':'\u21E5','RightArrowLeftArrow':'\u21C4','rightarrowtail':'\u21A3','RightCeiling':'\u2309','RightDoubleBracket':'\u27E7','RightDownTeeVector':'\u295D','RightDownVector':'\u21C2','RightDownVectorBar':'\u2955','RightFloor':'\u230B','rightharpoondown':'\u21C1','rightharpoonup':'\u21C0','rightleftarrows':'\u21C4','rightleftharpoons':'\u21CC','rightrightarrows':'\u21C9','rightsquigarrow':'\u219D','RightTee':'\u22A2','RightTeeArrow':'\u21A6','RightTeeVector':'\u295B','rightthreetimes':'\u22CC','RightTriangle':'\u22B3','RightTriangleBar':'\u29D0','RightTriangleEqual':'\u22B5','RightUpDownVector':'\u294F','RightUpTeeVector':'\u295C','RightUpVector':'\u21BE','RightUpVectorBar':'\u2954','RightVector':'\u21C0','RightVectorBar':'\u2953','ring':'\u02DA','risingdotseq':'\u2253','rlarr':'\u21C4','rlhar':'\u21CC','rlm':'\u200F','rmoust':'\u23B1','rmoustache':'\u23B1','rnmid':'\u2AEE','roang':'\u27ED','roarr':'\u21FE','robrk':'\u27E7','ropar':'\u2986','ropf':'\uD835\uDD63','Ropf':'\u211D','roplus':'\u2A2E','rotimes':'\u2A35','RoundImplies':'\u2970','rpar':')','rpargt':'\u2994','rppolint':'\u2A12','rrarr':'\u21C9','Rrightarrow':'\u21DB','rsaquo':'\u203A','rscr':'\uD835\uDCC7','Rscr':'\u211B','rsh':'\u21B1','Rsh':'\u21B1','rsqb':']','rsquo':'\u2019','rsquor':'\u2019','rthree':'\u22CC','rtimes':'\u22CA','rtri':'\u25B9','rtrie':'\u22B5','rtrif':'\u25B8','rtriltri':'\u29CE','RuleDelayed':'\u29F4','ruluhar':'\u2968','rx':'\u211E','sacute':'\u015B','Sacute':'\u015A','sbquo':'\u201A','sc':'\u227B','Sc':'\u2ABC','scap':'\u2AB8','scaron':'\u0161','Scaron':'\u0160','sccue':'\u227D','sce':'\u2AB0','scE':'\u2AB4','scedil':'\u015F','Scedil':'\u015E','scirc':'\u015D','Scirc':'\u015C','scnap':'\u2ABA','scnE':'\u2AB6','scnsim':'\u22E9','scpolint':'\u2A13','scsim':'\u227F','scy':'\u0441','Scy':'\u0421','sdot':'\u22C5','sdotb':'\u22A1','sdote':'\u2A66','searhk':'\u2925','searr':'\u2198','seArr':'\u21D8','searrow':'\u2198','sect':'\xA7','semi':';','seswar':'\u2929','setminus':'\u2216','setmn':'\u2216','sext':'\u2736','sfr':'\uD835\uDD30','Sfr':'\uD835\uDD16','sfrown':'\u2322','sharp':'\u266F','shchcy':'\u0449','SHCHcy':'\u0429','shcy':'\u0448','SHcy':'\u0428','ShortDownArrow':'\u2193','ShortLeftArrow':'\u2190','shortmid':'\u2223','shortparallel':'\u2225','ShortRightArrow':'\u2192','ShortUpArrow':'\u2191','shy':'\xAD','sigma':'\u03C3','Sigma':'\u03A3','sigmaf':'\u03C2','sigmav':'\u03C2','sim':'\u223C','simdot':'\u2A6A','sime':'\u2243','simeq':'\u2243','simg':'\u2A9E','simgE':'\u2AA0','siml':'\u2A9D','simlE':'\u2A9F','simne':'\u2246','simplus':'\u2A24','simrarr':'\u2972','slarr':'\u2190','SmallCircle':'\u2218','smallsetminus':'\u2216','smashp':'\u2A33','smeparsl':'\u29E4','smid':'\u2223','smile':'\u2323','smt':'\u2AAA','smte':'\u2AAC','smtes':'\u2AAC\uFE00','softcy':'\u044C','SOFTcy':'\u042C','sol':'/','solb':'\u29C4','solbar':'\u233F','sopf':'\uD835\uDD64','Sopf':'\uD835\uDD4A','spades':'\u2660','spadesuit':'\u2660','spar':'\u2225','sqcap':'\u2293','sqcaps':'\u2293\uFE00','sqcup':'\u2294','sqcups':'\u2294\uFE00','Sqrt':'\u221A','sqsub':'\u228F','sqsube':'\u2291','sqsubset':'\u228F','sqsubseteq':'\u2291','sqsup':'\u2290','sqsupe':'\u2292','sqsupset':'\u2290','sqsupseteq':'\u2292','squ':'\u25A1','square':'\u25A1','Square':'\u25A1','SquareIntersection':'\u2293','SquareSubset':'\u228F','SquareSubsetEqual':'\u2291','SquareSuperset':'\u2290','SquareSupersetEqual':'\u2292','SquareUnion':'\u2294','squarf':'\u25AA','squf':'\u25AA','srarr':'\u2192','sscr':'\uD835\uDCC8','Sscr':'\uD835\uDCAE','ssetmn':'\u2216','ssmile':'\u2323','sstarf':'\u22C6','star':'\u2606','Star':'\u22C6','starf':'\u2605','straightepsilon':'\u03F5','straightphi':'\u03D5','strns':'\xAF','sub':'\u2282','Sub':'\u22D0','subdot':'\u2ABD','sube':'\u2286','subE':'\u2AC5','subedot':'\u2AC3','submult':'\u2AC1','subne':'\u228A','subnE':'\u2ACB','subplus':'\u2ABF','subrarr':'\u2979','subset':'\u2282','Subset':'\u22D0','subseteq':'\u2286','subseteqq':'\u2AC5','SubsetEqual':'\u2286','subsetneq':'\u228A','subsetneqq':'\u2ACB','subsim':'\u2AC7','subsub':'\u2AD5','subsup':'\u2AD3','succ':'\u227B','succapprox':'\u2AB8','succcurlyeq':'\u227D','Succeeds':'\u227B','SucceedsEqual':'\u2AB0','SucceedsSlantEqual':'\u227D','SucceedsTilde':'\u227F','succeq':'\u2AB0','succnapprox':'\u2ABA','succneqq':'\u2AB6','succnsim':'\u22E9','succsim':'\u227F','SuchThat':'\u220B','sum':'\u2211','Sum':'\u2211','sung':'\u266A','sup':'\u2283','Sup':'\u22D1','sup1':'\xB9','sup2':'\xB2','sup3':'\xB3','supdot':'\u2ABE','supdsub':'\u2AD8','supe':'\u2287','supE':'\u2AC6','supedot':'\u2AC4','Superset':'\u2283','SupersetEqual':'\u2287','suphsol':'\u27C9','suphsub':'\u2AD7','suplarr':'\u297B','supmult':'\u2AC2','supne':'\u228B','supnE':'\u2ACC','supplus':'\u2AC0','supset':'\u2283','Supset':'\u22D1','supseteq':'\u2287','supseteqq':'\u2AC6','supsetneq':'\u228B','supsetneqq':'\u2ACC','supsim':'\u2AC8','supsub':'\u2AD4','supsup':'\u2AD6','swarhk':'\u2926','swarr':'\u2199','swArr':'\u21D9','swarrow':'\u2199','swnwar':'\u292A','szlig':'\xDF','Tab':'\t','target':'\u2316','tau':'\u03C4','Tau':'\u03A4','tbrk':'\u23B4','tcaron':'\u0165','Tcaron':'\u0164','tcedil':'\u0163','Tcedil':'\u0162','tcy':'\u0442','Tcy':'\u0422','tdot':'\u20DB','telrec':'\u2315','tfr':'\uD835\uDD31','Tfr':'\uD835\uDD17','there4':'\u2234','therefore':'\u2234','Therefore':'\u2234','theta':'\u03B8','Theta':'\u0398','thetasym':'\u03D1','thetav':'\u03D1','thickapprox':'\u2248','thicksim':'\u223C','ThickSpace':'\u205F\u200A','thinsp':'\u2009','ThinSpace':'\u2009','thkap':'\u2248','thksim':'\u223C','thorn':'\xFE','THORN':'\xDE','tilde':'\u02DC','Tilde':'\u223C','TildeEqual':'\u2243','TildeFullEqual':'\u2245','TildeTilde':'\u2248','times':'\xD7','timesb':'\u22A0','timesbar':'\u2A31','timesd':'\u2A30','tint':'\u222D','toea':'\u2928','top':'\u22A4','topbot':'\u2336','topcir':'\u2AF1','topf':'\uD835\uDD65','Topf':'\uD835\uDD4B','topfork':'\u2ADA','tosa':'\u2929','tprime':'\u2034','trade':'\u2122','TRADE':'\u2122','triangle':'\u25B5','triangledown':'\u25BF','triangleleft':'\u25C3','trianglelefteq':'\u22B4','triangleq':'\u225C','triangleright':'\u25B9','trianglerighteq':'\u22B5','tridot':'\u25EC','trie':'\u225C','triminus':'\u2A3A','TripleDot':'\u20DB','triplus':'\u2A39','trisb':'\u29CD','tritime':'\u2A3B','trpezium':'\u23E2','tscr':'\uD835\uDCC9','Tscr':'\uD835\uDCAF','tscy':'\u0446','TScy':'\u0426','tshcy':'\u045B','TSHcy':'\u040B','tstrok':'\u0167','Tstrok':'\u0166','twixt':'\u226C','twoheadleftarrow':'\u219E','twoheadrightarrow':'\u21A0','uacute':'\xFA','Uacute':'\xDA','uarr':'\u2191','uArr':'\u21D1','Uarr':'\u219F','Uarrocir':'\u2949','ubrcy':'\u045E','Ubrcy':'\u040E','ubreve':'\u016D','Ubreve':'\u016C','ucirc':'\xFB','Ucirc':'\xDB','ucy':'\u0443','Ucy':'\u0423','udarr':'\u21C5','udblac':'\u0171','Udblac':'\u0170','udhar':'\u296E','ufisht':'\u297E','ufr':'\uD835\uDD32','Ufr':'\uD835\uDD18','ugrave':'\xF9','Ugrave':'\xD9','uHar':'\u2963','uharl':'\u21BF','uharr':'\u21BE','uhblk':'\u2580','ulcorn':'\u231C','ulcorner':'\u231C','ulcrop':'\u230F','ultri':'\u25F8','umacr':'\u016B','Umacr':'\u016A','uml':'\xA8','UnderBar':'_','UnderBrace':'\u23DF','UnderBracket':'\u23B5','UnderParenthesis':'\u23DD','Union':'\u22C3','UnionPlus':'\u228E','uogon':'\u0173','Uogon':'\u0172','uopf':'\uD835\uDD66','Uopf':'\uD835\uDD4C','uparrow':'\u2191','Uparrow':'\u21D1','UpArrow':'\u2191','UpArrowBar':'\u2912','UpArrowDownArrow':'\u21C5','updownarrow':'\u2195','Updownarrow':'\u21D5','UpDownArrow':'\u2195','UpEquilibrium':'\u296E','upharpoonleft':'\u21BF','upharpoonright':'\u21BE','uplus':'\u228E','UpperLeftArrow':'\u2196','UpperRightArrow':'\u2197','upsi':'\u03C5','Upsi':'\u03D2','upsih':'\u03D2','upsilon':'\u03C5','Upsilon':'\u03A5','UpTee':'\u22A5','UpTeeArrow':'\u21A5','upuparrows':'\u21C8','urcorn':'\u231D','urcorner':'\u231D','urcrop':'\u230E','uring':'\u016F','Uring':'\u016E','urtri':'\u25F9','uscr':'\uD835\uDCCA','Uscr':'\uD835\uDCB0','utdot':'\u22F0','utilde':'\u0169','Utilde':'\u0168','utri':'\u25B5','utrif':'\u25B4','uuarr':'\u21C8','uuml':'\xFC','Uuml':'\xDC','uwangle':'\u29A7','vangrt':'\u299C','varepsilon':'\u03F5','varkappa':'\u03F0','varnothing':'\u2205','varphi':'\u03D5','varpi':'\u03D6','varpropto':'\u221D','varr':'\u2195','vArr':'\u21D5','varrho':'\u03F1','varsigma':'\u03C2','varsubsetneq':'\u228A\uFE00','varsubsetneqq':'\u2ACB\uFE00','varsupsetneq':'\u228B\uFE00','varsupsetneqq':'\u2ACC\uFE00','vartheta':'\u03D1','vartriangleleft':'\u22B2','vartriangleright':'\u22B3','vBar':'\u2AE8','Vbar':'\u2AEB','vBarv':'\u2AE9','vcy':'\u0432','Vcy':'\u0412','vdash':'\u22A2','vDash':'\u22A8','Vdash':'\u22A9','VDash':'\u22AB','Vdashl':'\u2AE6','vee':'\u2228','Vee':'\u22C1','veebar':'\u22BB','veeeq':'\u225A','vellip':'\u22EE','verbar':'|','Verbar':'\u2016','vert':'|','Vert':'\u2016','VerticalBar':'\u2223','VerticalLine':'|','VerticalSeparator':'\u2758','VerticalTilde':'\u2240','VeryThinSpace':'\u200A','vfr':'\uD835\uDD33','Vfr':'\uD835\uDD19','vltri':'\u22B2','vnsub':'\u2282\u20D2','vnsup':'\u2283\u20D2','vopf':'\uD835\uDD67','Vopf':'\uD835\uDD4D','vprop':'\u221D','vrtri':'\u22B3','vscr':'\uD835\uDCCB','Vscr':'\uD835\uDCB1','vsubne':'\u228A\uFE00','vsubnE':'\u2ACB\uFE00','vsupne':'\u228B\uFE00','vsupnE':'\u2ACC\uFE00','Vvdash':'\u22AA','vzigzag':'\u299A','wcirc':'\u0175','Wcirc':'\u0174','wedbar':'\u2A5F','wedge':'\u2227','Wedge':'\u22C0','wedgeq':'\u2259','weierp':'\u2118','wfr':'\uD835\uDD34','Wfr':'\uD835\uDD1A','wopf':'\uD835\uDD68','Wopf':'\uD835\uDD4E','wp':'\u2118','wr':'\u2240','wreath':'\u2240','wscr':'\uD835\uDCCC','Wscr':'\uD835\uDCB2','xcap':'\u22C2','xcirc':'\u25EF','xcup':'\u22C3','xdtri':'\u25BD','xfr':'\uD835\uDD35','Xfr':'\uD835\uDD1B','xharr':'\u27F7','xhArr':'\u27FA','xi':'\u03BE','Xi':'\u039E','xlarr':'\u27F5','xlArr':'\u27F8','xmap':'\u27FC','xnis':'\u22FB','xodot':'\u2A00','xopf':'\uD835\uDD69','Xopf':'\uD835\uDD4F','xoplus':'\u2A01','xotime':'\u2A02','xrarr':'\u27F6','xrArr':'\u27F9','xscr':'\uD835\uDCCD','Xscr':'\uD835\uDCB3','xsqcup':'\u2A06','xuplus':'\u2A04','xutri':'\u25B3','xvee':'\u22C1','xwedge':'\u22C0','yacute':'\xFD','Yacute':'\xDD','yacy':'\u044F','YAcy':'\u042F','ycirc':'\u0177','Ycirc':'\u0176','ycy':'\u044B','Ycy':'\u042B','yen':'\xA5','yfr':'\uD835\uDD36','Yfr':'\uD835\uDD1C','yicy':'\u0457','YIcy':'\u0407','yopf':'\uD835\uDD6A','Yopf':'\uD835\uDD50','yscr':'\uD835\uDCCE','Yscr':'\uD835\uDCB4','yucy':'\u044E','YUcy':'\u042E','yuml':'\xFF','Yuml':'\u0178','zacute':'\u017A','Zacute':'\u0179','zcaron':'\u017E','Zcaron':'\u017D','zcy':'\u0437','Zcy':'\u0417','zdot':'\u017C','Zdot':'\u017B','zeetrf':'\u2128','ZeroWidthSpace':'\u200B','zeta':'\u03B6','Zeta':'\u0396','zfr':'\uD835\uDD37','Zfr':'\u2128','zhcy':'\u0436','ZHcy':'\u0416','zigrarr':'\u21DD','zopf':'\uD835\uDD6B','Zopf':'\u2124','zscr':'\uD835\uDCCF','Zscr':'\uD835\uDCB5','zwj':'\u200D','zwnj':'\u200C'};
		var decodeMapLegacy = {'aacute':'\xE1','Aacute':'\xC1','acirc':'\xE2','Acirc':'\xC2','acute':'\xB4','aelig':'\xE6','AElig':'\xC6','agrave':'\xE0','Agrave':'\xC0','amp':'&','AMP':'&','aring':'\xE5','Aring':'\xC5','atilde':'\xE3','Atilde':'\xC3','auml':'\xE4','Auml':'\xC4','brvbar':'\xA6','ccedil':'\xE7','Ccedil':'\xC7','cedil':'\xB8','cent':'\xA2','copy':'\xA9','COPY':'\xA9','curren':'\xA4','deg':'\xB0','divide':'\xF7','eacute':'\xE9','Eacute':'\xC9','ecirc':'\xEA','Ecirc':'\xCA','egrave':'\xE8','Egrave':'\xC8','eth':'\xF0','ETH':'\xD0','euml':'\xEB','Euml':'\xCB','frac12':'\xBD','frac14':'\xBC','frac34':'\xBE','gt':'>','GT':'>','iacute':'\xED','Iacute':'\xCD','icirc':'\xEE','Icirc':'\xCE','iexcl':'\xA1','igrave':'\xEC','Igrave':'\xCC','iquest':'\xBF','iuml':'\xEF','Iuml':'\xCF','laquo':'\xAB','lt':'<','LT':'<','macr':'\xAF','micro':'\xB5','middot':'\xB7','nbsp':'\xA0','not':'\xAC','ntilde':'\xF1','Ntilde':'\xD1','oacute':'\xF3','Oacute':'\xD3','ocirc':'\xF4','Ocirc':'\xD4','ograve':'\xF2','Ograve':'\xD2','ordf':'\xAA','ordm':'\xBA','oslash':'\xF8','Oslash':'\xD8','otilde':'\xF5','Otilde':'\xD5','ouml':'\xF6','Ouml':'\xD6','para':'\xB6','plusmn':'\xB1','pound':'\xA3','quot':'"','QUOT':'"','raquo':'\xBB','reg':'\xAE','REG':'\xAE','sect':'\xA7','shy':'\xAD','sup1':'\xB9','sup2':'\xB2','sup3':'\xB3','szlig':'\xDF','thorn':'\xFE','THORN':'\xDE','times':'\xD7','uacute':'\xFA','Uacute':'\xDA','ucirc':'\xFB','Ucirc':'\xDB','ugrave':'\xF9','Ugrave':'\xD9','uml':'\xA8','uuml':'\xFC','Uuml':'\xDC','yacute':'\xFD','Yacute':'\xDD','yen':'\xA5','yuml':'\xFF'};
		var decodeMapNumeric = {'0':'\uFFFD','128':'\u20AC','130':'\u201A','131':'\u0192','132':'\u201E','133':'\u2026','134':'\u2020','135':'\u2021','136':'\u02C6','137':'\u2030','138':'\u0160','139':'\u2039','140':'\u0152','142':'\u017D','145':'\u2018','146':'\u2019','147':'\u201C','148':'\u201D','149':'\u2022','150':'\u2013','151':'\u2014','152':'\u02DC','153':'\u2122','154':'\u0161','155':'\u203A','156':'\u0153','158':'\u017E','159':'\u0178'};
		var invalidReferenceCodePoints = [1,2,3,4,5,6,7,8,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,64976,64977,64978,64979,64980,64981,64982,64983,64984,64985,64986,64987,64988,64989,64990,64991,64992,64993,64994,64995,64996,64997,64998,64999,65000,65001,65002,65003,65004,65005,65006,65007,65534,65535,131070,131071,196606,196607,262142,262143,327678,327679,393214,393215,458750,458751,524286,524287,589822,589823,655358,655359,720894,720895,786430,786431,851966,851967,917502,917503,983038,983039,1048574,1048575,1114110,1114111];

		/*--------------------------------------------------------------------------*/

		var stringFromCharCode = String.fromCharCode;

		var object = {};
		var hasOwnProperty = object.hasOwnProperty;
		var has = function(object, propertyName) {
			return hasOwnProperty.call(object, propertyName);
		};

		var contains = function(array, value) {
			var index = -1;
			var length = array.length;
			while (++index < length) {
				if (array[index] == value) {
					return true;
				}
			}
			return false;
		};

		var merge = function(options, defaults) {
			if (!options) {
				return defaults;
			}
			var result = {};
			var key;
			for (key in defaults) {
				// A `hasOwnProperty` check is not needed here, since only recognized
				// option names are used anyway. Any others are ignored.
				result[key] = has(options, key) ? options[key] : defaults[key];
			}
			return result;
		};

		// Modified version of `ucs2encode`; see https://mths.be/punycode.
		var codePointToSymbol = function(codePoint, strict) {
			var output = '';
			if ((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF) {
				// See issue #4:
				// “Otherwise, if the number is in the range 0xD800 to 0xDFFF or is
				// greater than 0x10FFFF, then this is a parse error. Return a U+FFFD
				// REPLACEMENT CHARACTER.”
				if (strict) {
					parseError('character reference outside the permissible Unicode range');
				}
				return '\uFFFD';
			}
			if (has(decodeMapNumeric, codePoint)) {
				if (strict) {
					parseError('disallowed character reference');
				}
				return decodeMapNumeric[codePoint];
			}
			if (strict && contains(invalidReferenceCodePoints, codePoint)) {
				parseError('disallowed character reference');
			}
			if (codePoint > 0xFFFF) {
				codePoint -= 0x10000;
				output += stringFromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
				codePoint = 0xDC00 | codePoint & 0x3FF;
			}
			output += stringFromCharCode(codePoint);
			return output;
		};

		var hexEscape = function(codePoint) {
			return '&#x' + codePoint.toString(16).toUpperCase() + ';';
		};

		var decEscape = function(codePoint) {
			return '&#' + codePoint + ';';
		};

		var parseError = function(message) {
			throw Error('Parse error: ' + message);
		};

		/*--------------------------------------------------------------------------*/

		var encode = function(string, options) {
			options = merge(options, encode.options);
			var strict = options.strict;
			if (strict && regexInvalidRawCodePoint.test(string)) {
				parseError('forbidden code point');
			}
			var encodeEverything = options.encodeEverything;
			var useNamedReferences = options.useNamedReferences;
			var allowUnsafeSymbols = options.allowUnsafeSymbols;
			var escapeCodePoint = options.decimal ? decEscape : hexEscape;

			var escapeBmpSymbol = function(symbol) {
				return escapeCodePoint(symbol.charCodeAt(0));
			};

			if (encodeEverything) {
				// Encode ASCII symbols.
				string = string.replace(regexAsciiWhitelist, function(symbol) {
					// Use named references if requested & possible.
					if (useNamedReferences && has(encodeMap, symbol)) {
						return '&' + encodeMap[symbol] + ';';
					}
					return escapeBmpSymbol(symbol);
				});
				// Shorten a few escapes that represent two symbols, of which at least one
				// is within the ASCII range.
				if (useNamedReferences) {
					string = string
						.replace(/&gt;\u20D2/g, '&nvgt;')
						.replace(/&lt;\u20D2/g, '&nvlt;')
						.replace(/&#x66;&#x6A;/g, '&fjlig;');
				}
				// Encode non-ASCII symbols.
				if (useNamedReferences) {
					// Encode non-ASCII symbols that can be replaced with a named reference.
					string = string.replace(regexEncodeNonAscii, function(string) {
						// Note: there is no need to check `has(encodeMap, string)` here.
						return '&' + encodeMap[string] + ';';
					});
				}
				// Note: any remaining non-ASCII symbols are handled outside of the `if`.
			} else if (useNamedReferences) {
				// Apply named character references.
				// Encode `<>"'&` using named character references.
				if (!allowUnsafeSymbols) {
					string = string.replace(regexEscape, function(string) {
						return '&' + encodeMap[string] + ';'; // no need to check `has()` here
					});
				}
				// Shorten escapes that represent two symbols, of which at least one is
				// `<>"'&`.
				string = string
					.replace(/&gt;\u20D2/g, '&nvgt;')
					.replace(/&lt;\u20D2/g, '&nvlt;');
				// Encode non-ASCII symbols that can be replaced with a named reference.
				string = string.replace(regexEncodeNonAscii, function(string) {
					// Note: there is no need to check `has(encodeMap, string)` here.
					return '&' + encodeMap[string] + ';';
				});
			} else if (!allowUnsafeSymbols) {
				// Encode `<>"'&` using hexadecimal escapes, now that they’re not handled
				// using named character references.
				string = string.replace(regexEscape, escapeBmpSymbol);
			}
			return string
				// Encode astral symbols.
				.replace(regexAstralSymbols, function($0) {
					// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
					var high = $0.charCodeAt(0);
					var low = $0.charCodeAt(1);
					var codePoint = (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
					return escapeCodePoint(codePoint);
				})
				// Encode any remaining BMP symbols that are not printable ASCII symbols
				// using a hexadecimal escape.
				.replace(regexBmpWhitelist, escapeBmpSymbol);
		};
		// Expose default options (so they can be overridden globally).
		encode.options = {
			'allowUnsafeSymbols': false,
			'encodeEverything': false,
			'strict': false,
			'useNamedReferences': false,
			'decimal' : false
		};

		var decode = function(html, options) {
			options = merge(options, decode.options);
			var strict = options.strict;
			if (strict && regexInvalidEntity.test(html)) {
				parseError('malformed character reference');
			}
			return html.replace(regexDecode, function($0, $1, $2, $3, $4, $5, $6, $7) {
				var codePoint;
				var semicolon;
				var decDigits;
				var hexDigits;
				var reference;
				var next;
				if ($1) {
					// Decode decimal escapes, e.g. `&#119558;`.
					decDigits = $1;
					semicolon = $2;
					if (strict && !semicolon) {
						parseError('character reference was not terminated by a semicolon');
					}
					codePoint = parseInt(decDigits, 10);
					return codePointToSymbol(codePoint, strict);
				}
				if ($3) {
					// Decode hexadecimal escapes, e.g. `&#x1D306;`.
					hexDigits = $3;
					semicolon = $4;
					if (strict && !semicolon) {
						parseError('character reference was not terminated by a semicolon');
					}
					codePoint = parseInt(hexDigits, 16);
					return codePointToSymbol(codePoint, strict);
				}
				if ($5) {
					// Decode named character references with trailing `;`, e.g. `&copy;`.
					reference = $5;
					if (has(decodeMap, reference)) {
						return decodeMap[reference];
					} else {
						// Ambiguous ampersand. https://mths.be/notes/ambiguous-ampersands
						if (strict) {
							parseError(
								'named character reference was not terminated by a semicolon'
							);
						}
						return $0;
					}
				}
				// If we’re still here, it’s a legacy reference for sure. No need for an
				// extra `if` check.
				// Decode named character references without trailing `;`, e.g. `&amp`
				// This is only a parse error if it gets converted to `&`, or if it is
				// followed by `=` in an attribute context.
				reference = $6;
				next = $7;
				if (next && options.isAttributeValue) {
					if (strict && next == '=') {
						parseError('`&` did not start a character reference');
					}
					return $0;
				} else {
					if (strict) {
						parseError(
							'named character reference was not terminated by a semicolon'
						);
					}
					// Note: there is no need to check `has(decodeMapLegacy, reference)`.
					return decodeMapLegacy[reference] + (next || '');
				}
			});
		};
		// Expose default options (so they can be overridden globally).
		decode.options = {
			'isAttributeValue': false,
			'strict': false
		};

		var escape = function(string) {
			return string.replace(regexEscape, function($0) {
				// Note: there is no need to check `has(escapeMap, $0)` here.
				return escapeMap[$0];
			});
		};

		/*--------------------------------------------------------------------------*/

		var he = {
			'version': '1.1.1',
			'encode': encode,
			'decode': decode,
			'escape': escape,
			'unescape': decode
		};

		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (freeExports && !freeExports.nodeType) {
			if (freeModule) { // in Node.js, io.js, or RingoJS v0.8.0+
				freeModule.exports = he;
			} else { // in Narwhal or RingoJS v0.7.0-
				for (var key in he) {
					has(he, key) && (freeExports[key] = he[key]);
				}
			}
		} else { // in Rhino or a web browser
			root.he = he;
		}

	}(commonjsGlobal));
	});

	var dist = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	var NodeType;
	(function (NodeType) {
	    NodeType[NodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
	    NodeType[NodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
	})(NodeType = exports.NodeType || (exports.NodeType = {}));
	/**
	 * Node Class as base class for TextNode and HTMLElement.
	 */
	class Node {
	    constructor() {
	        this.childNodes = [];
	    }
	}
	exports.Node = Node;
	/**
	 * TextNode to contain a text element in DOM tree.
	 * @param {string} value [description]
	 */
	class TextNode extends Node {
	    constructor(value) {
	        super();
	        /**
	         * Node Type declaration.
	         * @type {Number}
	         */
	        this.nodeType = NodeType.TEXT_NODE;
	        this.rawText = value;
	    }
	    /**
	     * Get unescaped text value of current node and its children.
	     * @return {string} text content
	     */
	    get text() {
	        return he.decode(this.rawText);
	    }
	    /**
	     * Detect if the node contains only white space.
	     * @return {bool}
	     */
	    get isWhitespace() {
	        return /^(\s|&nbsp;)*$/.test(this.rawText);
	    }
	    toString() {
	        return this.text;
	    }
	}
	exports.TextNode = TextNode;
	const kBlockElements = {
	    div: true,
	    p: true,
	    // ul: true,
	    // ol: true,
	    li: true,
	    // table: true,
	    // tr: true,
	    td: true,
	    section: true,
	    br: true
	};
	function arr_back(arr) {
	    return arr[arr.length - 1];
	}
	/**
	 * HTMLElement, which contains a set of children.
	 *
	 * Note: this is a minimalist implementation, no complete tree
	 *   structure provided (no parentNode, nextSibling,
	 *   previousSibling etc).
	 * @class HTMLElement
	 * @extends {Node}
	 */
	class HTMLElement extends Node {
	    /**
	     * Creates an instance of HTMLElement.
	     * @param keyAttrs	id and class attribute
	     * @param [rawAttrs]	attributes in string
	     *
	     * @memberof HTMLElement
	     */
	    constructor(tagName, keyAttrs, rawAttrs = '', parentNode = null) {
	        super();
	        this.tagName = tagName;
	        this.rawAttrs = rawAttrs;
	        this.parentNode = parentNode;
	        this.classNames = [];
	        /**
	         * Node Type declaration.
	         */
	        this.nodeType = NodeType.ELEMENT_NODE;
	        this.rawAttrs = rawAttrs || '';
	        this.parentNode = parentNode || null;
	        this.childNodes = [];
	        if (keyAttrs.id) {
	            this.id = keyAttrs.id;
	        }
	        if (keyAttrs.class) {
	            this.classNames = keyAttrs.class.split(/\s+/);
	        }
	    }
	    /**
	     * Remove Child element from childNodes array
	     * @param {HTMLElement} node     node to remove
	     */
	    removeChild(node) {
	        this.childNodes = this.childNodes.filter((child) => {
	            return (child !== node);
	        });
	    }
	    /**
	     * Exchanges given child with new child
	     * @param {HTMLElement} oldNode     node to exchange
	     * @param {HTMLElement} newNode     new node
	     */
	    exchangeChild(oldNode, newNode) {
	        let idx = -1;
	        for (let i = 0; i < this.childNodes.length; i++) {
	            if (this.childNodes[i] === oldNode) {
	                idx = i;
	                break;
	            }
	        }
	        this.childNodes[idx] = newNode;
	    }
	    /**
	     * Get escpaed (as-it) text value of current node and its children.
	     * @return {string} text content
	     */
	    get rawText() {
	        let res = '';
	        for (let i = 0; i < this.childNodes.length; i++)
	            res += this.childNodes[i].rawText;
	        return res;
	    }
	    /**
	     * Get unescaped text value of current node and its children.
	     * @return {string} text content
	     */
	    get text() {
	        return he.decode(this.rawText);
	    }
	    /**
	     * Get structured Text (with '\n' etc.)
	     * @return {string} structured text
	     */
	    get structuredText() {
	        let currentBlock = [];
	        const blocks = [currentBlock];
	        function dfs(node) {
	            if (node.nodeType === NodeType.ELEMENT_NODE) {
	                if (kBlockElements[node.tagName]) {
	                    if (currentBlock.length > 0) {
	                        blocks.push(currentBlock = []);
	                    }
	                    node.childNodes.forEach(dfs);
	                    if (currentBlock.length > 0) {
	                        blocks.push(currentBlock = []);
	                    }
	                }
	                else {
	                    node.childNodes.forEach(dfs);
	                }
	            }
	            else if (node.nodeType === NodeType.TEXT_NODE) {
	                if (node.isWhitespace) {
	                    // Whitespace node, postponed output
	                    currentBlock.prependWhitespace = true;
	                }
	                else {
	                    let text = node.text;
	                    if (currentBlock.prependWhitespace) {
	                        text = ' ' + text;
	                        currentBlock.prependWhitespace = false;
	                    }
	                    currentBlock.push(text);
	                }
	            }
	        }
	        dfs(this);
	        return blocks
	            .map(function (block) {
	            // Normalize each line's whitespace
	            return block.join('').trim().replace(/\s{2,}/g, ' ');
	        })
	            .join('\n').replace(/\s+$/, ''); // trimRight;
	    }
	    toString() {
	        const tag = this.tagName;
	        if (tag) {
	            const is_un_closed = /^meta$/i.test(tag);
	            const is_self_closed = /^(img|br|hr|area|base|input|doctype|link)$/i.test(tag);
	            const attrs = this.rawAttrs ? ' ' + this.rawAttrs : '';
	            if (is_un_closed) {
	                return `<${tag}${attrs}>`;
	            }
	            else if (is_self_closed) {
	                return `<${tag}${attrs} />`;
	            }
	            else {
	                return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
	            }
	        }
	        else {
	            return this.innerHTML;
	        }
	    }
	    get innerHTML() {
	        return this.childNodes.map((child) => {
	            return child.toString();
	        }).join('');
	    }
	    set_content(content) {
	        if (content instanceof Node) {
	            content = [content];
	        }
	        else if (typeof content == 'string') {
	            const r = parse(content);
	            content = r.childNodes.length ? r.childNodes : [new TextNode(content)];
	        }
	        this.childNodes = content;
	    }
	    get outerHTML() {
	        return this.toString();
	    }
	    /**
	     * Trim element from right (in block) after seeing pattern in a TextNode.
	     * @param  {RegExp} pattern pattern to find
	     * @return {HTMLElement}    reference to current node
	     */
	    trimRight(pattern) {
	        for (let i = 0; i < this.childNodes.length; i++) {
	            const childNode = this.childNodes[i];
	            if (childNode.nodeType === NodeType.ELEMENT_NODE) {
	                childNode.trimRight(pattern);
	            }
	            else {
	                const index = childNode.rawText.search(pattern);
	                if (index > -1) {
	                    childNode.rawText = childNode.rawText.substr(0, index);
	                    // trim all following nodes.
	                    this.childNodes.length = i + 1;
	                }
	            }
	        }
	        return this;
	    }
	    /**
	     * Get DOM structure
	     * @return {string} strucutre
	     */
	    get structure() {
	        const res = [];
	        let indention = 0;
	        function write(str) {
	            res.push('  '.repeat(indention) + str);
	        }
	        function dfs(node) {
	            const idStr = node.id ? ('#' + node.id) : '';
	            const classStr = node.classNames.length ? ('.' + node.classNames.join('.')) : '';
	            write(node.tagName + idStr + classStr);
	            indention++;
	            for (let i = 0; i < node.childNodes.length; i++) {
	                const childNode = node.childNodes[i];
	                if (childNode.nodeType === NodeType.ELEMENT_NODE) {
	                    dfs(childNode);
	                }
	                else if (childNode.nodeType === NodeType.TEXT_NODE) {
	                    if (!childNode.isWhitespace)
	                        write('#text');
	                }
	            }
	            indention--;
	        }
	        dfs(this);
	        return res.join('\n');
	    }
	    /**
	     * Remove whitespaces in this sub tree.
	     * @return {HTMLElement} pointer to this
	     */
	    removeWhitespace() {
	        let o = 0;
	        for (let i = 0; i < this.childNodes.length; i++) {
	            const node = this.childNodes[i];
	            if (node.nodeType === NodeType.TEXT_NODE) {
	                if (node.isWhitespace)
	                    continue;
	                node.rawText = node.rawText.trim();
	            }
	            else if (node.nodeType === NodeType.ELEMENT_NODE) {
	                node.removeWhitespace();
	            }
	            this.childNodes[o++] = node;
	        }
	        this.childNodes.length = o;
	        return this;
	    }
	    /**
	     * Query CSS selector to find matching nodes.
	     * @param  {string}         selector Simplified CSS selector
	     * @param  {Matcher}        selector A Matcher instance
	     * @return {HTMLElement[]}  matching elements
	     */
	    querySelectorAll(selector) {
	        let matcher;
	        if (selector instanceof Matcher) {
	            matcher = selector;
	            matcher.reset();
	        }
	        else {
	            matcher = new Matcher(selector);
	        }
	        const res = [];
	        const stack = [];
	        for (let i = 0; i < this.childNodes.length; i++) {
	            stack.push([this.childNodes[i], 0, false]);
	            while (stack.length) {
	                const state = arr_back(stack);
	                const el = state[0];
	                if (state[1] === 0) {
	                    // Seen for first time.
	                    if (el.nodeType !== NodeType.ELEMENT_NODE) {
	                        stack.pop();
	                        continue;
	                    }
	                    if (state[2] = matcher.advance(el)) {
	                        if (matcher.matched) {
	                            res.push(el);
	                            // no need to go further.
	                            matcher.rewind();
	                            stack.pop();
	                            continue;
	                        }
	                    }
	                }
	                if (state[1] < el.childNodes.length) {
	                    stack.push([el.childNodes[state[1]++], 0, false]);
	                }
	                else {
	                    if (state[2])
	                        matcher.rewind();
	                    stack.pop();
	                }
	            }
	        }
	        return res;
	    }
	    /**
	     * Query CSS Selector to find matching node.
	     * @param  {string}         selector Simplified CSS selector
	     * @param  {Matcher}        selector A Matcher instance
	     * @return {HTMLElement}    matching node
	     */
	    querySelector(selector) {
	        let matcher;
	        if (selector instanceof Matcher) {
	            matcher = selector;
	            matcher.reset();
	        }
	        else {
	            matcher = new Matcher(selector);
	        }
	        const stack = [];
	        for (let i = 0; i < this.childNodes.length; i++) {
	            stack.push([this.childNodes[i], 0, false]);
	            while (stack.length) {
	                const state = arr_back(stack);
	                const el = state[0];
	                if (state[1] === 0) {
	                    // Seen for first time.
	                    if (el.nodeType !== NodeType.ELEMENT_NODE) {
	                        stack.pop();
	                        continue;
	                    }
	                    if (state[2] = matcher.advance(el)) {
	                        if (matcher.matched) {
	                            return el;
	                        }
	                    }
	                }
	                if (state[1] < el.childNodes.length) {
	                    stack.push([el.childNodes[state[1]++], 0, false]);
	                }
	                else {
	                    if (state[2])
	                        matcher.rewind();
	                    stack.pop();
	                }
	            }
	        }
	        return null;
	    }
	    /**
	     * Append a child node to childNodes
	     * @param  {Node} node node to append
	     * @return {Node}      node appended
	     */
	    appendChild(node) {
	        // node.parentNode = this;
	        this.childNodes.push(node);
	        if (node instanceof HTMLElement) {
	            node.parentNode = this;
	        }
	        return node;
	    }
	    /**
	     * Get first child node
	     * @return {Node} first child node
	     */
	    get firstChild() {
	        return this.childNodes[0];
	    }
	    /**
	     * Get last child node
	     * @return {Node} last child node
	     */
	    get lastChild() {
	        return arr_back(this.childNodes);
	    }
	    /**
	     * Get attributes
	     * @return {Object} parsed and unescaped attributes
	     */
	    get attributes() {
	        if (this._attrs)
	            return this._attrs;
	        this._attrs = {};
	        const attrs = this.rawAttributes;
	        for (const key in attrs) {
	            this._attrs[key] = he.decode(attrs[key]);
	        }
	        return this._attrs;
	    }
	    /**
	     * Get escaped (as-it) attributes
	     * @return {Object} parsed attributes
	     */
	    get rawAttributes() {
	        if (this._rawAttrs)
	            return this._rawAttrs;
	        const attrs = {};
	        if (this.rawAttrs) {
	            const re = /\b([a-z][a-z0-9\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/ig;
	            let match;
	            while (match = re.exec(this.rawAttrs)) {
	                attrs[match[1]] = match[2] || match[3] || match[4] || "";
	            }
	        }
	        this._rawAttrs = attrs;
	        return attrs;
	    }
	}
	exports.HTMLElement = HTMLElement;
	/**
	 * Cache to store generated match functions
	 * @type {Object}
	 */
	let pMatchFunctionCache = {};
	/**
	 * Function cache
	 */
	const functionCache = {
	    "f145": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        classes = classes || [];
	        if (el.id != tagName.substr(1))
	            return false;
	        for (let cls = classes, i = 0; i < cls.length; i++)
	            if (el.classNames.indexOf(cls[i]) === -1)
	                return false;
	        return true;
	    },
	    "f45": function (el, tagName, classes, attr_key, value) {
	        classes = classes || [];
	        for (let cls = classes, i = 0; i < cls.length; i++)
	            if (el.classNames.indexOf(cls[i]) === -1)
	                return false;
	        return true;
	    },
	    "f15": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        if (el.id != tagName.substr(1))
	            return false;
	        return true;
	    },
	    "f1": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        if (el.id != tagName.substr(1))
	            return false;
	    },
	    "f5": function (el, tagName, classes, attr_key, value) {
	        return true;
	    },
	    "f245": function (el, tagName, classes, attr_key, value) {
	        attr_key = attr_key || "";
	        value = value || "";
	        let attrs = el.attributes;
	        for (let key in attrs) {
	            const val = attrs[key];
	            if (key == attr_key && val == value) {
	                return true;
	            }
	        }
	        return false;
	        // for (let cls = classes, i = 0; i < cls.length; i++) {if (el.classNames.indexOf(cls[i]) === -1){ return false;}}
	        // return true;
	    },
	    "f25": function (el, tagName, classes, attr_key, value) {
	        attr_key = attr_key || "";
	        value = value || "";
	        let attrs = el.attributes;
	        for (let key in attrs) {
	            const val = attrs[key];
	            if (key == attr_key && val == value) {
	                return true;
	            }
	        }
	        return false;
	        //return true;
	    },
	    "f2": function (el, tagName, classes, attr_key, value) {
	        attr_key = attr_key || "";
	        value = value || "";
	        let attrs = el.attributes;
	        for (let key in attrs) {
	            const val = attrs[key];
	            if (key == attr_key && val == value) {
	                return true;
	            }
	        }
	        return false;
	    },
	    "f345": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        classes = classes || [];
	        if (el.tagName != tagName)
	            return false;
	        for (let cls = classes, i = 0; i < cls.length; i++)
	            if (el.classNames.indexOf(cls[i]) === -1)
	                return false;
	        return true;
	    },
	    "f35": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        if (el.tagName != tagName)
	            return false;
	        return true;
	    },
	    "f3": function (el, tagName, classes, attr_key, value) {
	        tagName = tagName || "";
	        if (el.tagName != tagName)
	            return false;
	    }
	};
	/**
	 * Matcher class to make CSS match
	 *
	 * @class Matcher
	 */
	class Matcher {
	    /**
	     * Creates an instance of Matcher.
	     * @param {string} selector
	     *
	     * @memberof Matcher
	     */
	    constructor(selector) {
	        this.nextMatch = 0;
	        functionCache["f5"] = functionCache["f5"];
	        this.matchers = selector.split(' ').map((matcher) => {
	            if (pMatchFunctionCache[matcher])
	                return pMatchFunctionCache[matcher];
	            const parts = matcher.split('.');
	            const tagName = parts[0];
	            const classes = parts.slice(1).sort();
	            let source = '"use strict";';
	            let function_name = 'f';
	            let attr_key = "";
	            let value = "";
	            if (tagName && tagName != '*') {
	                let matcher;
	                if (tagName[0] == '#') {
	                    source += 'if (el.id != ' + JSON.stringify(tagName.substr(1)) + ') return false;'; //1
	                    function_name += '1';
	                }
	                else if (matcher = tagName.match(/^\[\s*(\S+)\s*(=|!=)\s*((((["'])([^\6]*)\6))|(\S*?))\]\s*/)) {
	                    attr_key = matcher[1];
	                    let method = matcher[2];
	                    if (method !== '=' && method !== '!=') {
	                        throw new Error('Selector not supported, Expect [key${op}value].op must be =,!=');
	                    }
	                    if (method === '=') {
	                        method = '==';
	                    }
	                    value = matcher[7] || matcher[8];
	                    source += `let attrs = el.attributes;for (let key in attrs){const val = attrs[key]; if (key == "${attr_key}" && val == "${value}"){return true;}} return false;`; //2
	                    function_name += '2';
	                }
	                else {
	                    source += 'if (el.tagName != ' + JSON.stringify(tagName) + ') return false;'; //3
	                    function_name += '3';
	                }
	            }
	            if (classes.length > 0) {
	                source += 'for (let cls = ' + JSON.stringify(classes) + ', i = 0; i < cls.length; i++) if (el.classNames.indexOf(cls[i]) === -1) return false;'; //4
	                function_name += '4';
	            }
	            source += 'return true;'; //5
	            function_name += '5';
	            let obj = {
	                func: functionCache[function_name],
	                tagName: tagName || "",
	                classes: classes || "",
	                attr_key: attr_key || "",
	                value: value || ""
	            };
	            source = source || "";
	            return pMatchFunctionCache[matcher] = obj;
	        });
	    }
	    /**
	     * Trying to advance match pointer
	     * @param  {HTMLElement} el element to make the match
	     * @return {bool}           true when pointer advanced.
	     */
	    advance(el) {
	        if (this.nextMatch < this.matchers.length &&
	            this.matchers[this.nextMatch].func(el, this.matchers[this.nextMatch].tagName, this.matchers[this.nextMatch].classes, this.matchers[this.nextMatch].attr_key, this.matchers[this.nextMatch].value)) {
	            this.nextMatch++;
	            return true;
	        }
	        return false;
	    }
	    /**
	     * Rewind the match pointer
	     */
	    rewind() {
	        this.nextMatch--;
	    }
	    /**
	     * Trying to determine if match made.
	     * @return {bool} true when the match is made
	     */
	    get matched() {
	        return this.nextMatch == this.matchers.length;
	    }
	    /**
	     * Rest match pointer.
	     * @return {[type]} [description]
	     */
	    reset() {
	        this.nextMatch = 0;
	    }
	    /**
	     * flush cache to free memory
	     */
	    flushCache() {
	        pMatchFunctionCache = {};
	    }
	}
	exports.Matcher = Matcher;
	// https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
	const kMarkupPattern = /<!--[^]*?(?=-->)-->|<(\/?)([a-z][-.0-9_a-z]*)\s*([^>]*?)(\/?)>/ig;
	const kAttributePattern = /(^|\s)(id|class)\s*=\s*("([^"]+)"|'([^']+)'|(\S+))/ig;
	const kSelfClosingElements = {
	    area: true,
	    base: true,
	    br: true,
	    col: true,
	    hr: true,
	    img: true,
	    input: true,
	    link: true,
	    meta: true,
	    source: true
	};
	const kElementsClosedByOpening = {
	    li: { li: true },
	    p: { p: true, div: true },
	    b: { div: true },
	    td: { td: true, th: true },
	    th: { td: true, th: true },
	    h1: { h1: true },
	    h2: { h2: true },
	    h3: { h3: true },
	    h4: { h4: true },
	    h5: { h5: true },
	    h6: { h6: true }
	};
	const kElementsClosedByClosing = {
	    li: { ul: true, ol: true },
	    a: { div: true },
	    b: { div: true },
	    i: { div: true },
	    p: { div: true },
	    td: { tr: true, table: true },
	    th: { tr: true, table: true }
	};
	const kBlockTextElements = {
	    script: true,
	    noscript: true,
	    style: true,
	    pre: true
	};
	/**
	 * Parses HTML and returns a root element
	 * Parse a chuck of HTML source.
	 * @param  {string} data      html
	 * @return {HTMLElement}      root element
	 */
	function parse(data, options) {
	    const root = new HTMLElement(null, {});
	    let currentParent = root;
	    const stack = [root];
	    let lastTextPos = -1;
	    options = options || {};
	    let match;
	    while (match = kMarkupPattern.exec(data)) {
	        if (lastTextPos > -1) {
	            if (lastTextPos + match[0].length < kMarkupPattern.lastIndex) {
	                // if has content
	                const text = data.substring(lastTextPos, kMarkupPattern.lastIndex - match[0].length);
	                currentParent.appendChild(new TextNode(text));
	            }
	        }
	        lastTextPos = kMarkupPattern.lastIndex;
	        if (match[0][1] == '!') {
	            // this is a comment
	            continue;
	        }
	        if (options.lowerCaseTagName)
	            match[2] = match[2].toLowerCase();
	        if (!match[1]) {
	            // not </ tags
	            let attrs = {};
	            for (let attMatch; attMatch = kAttributePattern.exec(match[3]);) {
	                attrs[attMatch[2]] = attMatch[4] || attMatch[5] || attMatch[6];
	            }
	            if (!match[4] && kElementsClosedByOpening[currentParent.tagName]) {
	                if (kElementsClosedByOpening[currentParent.tagName][match[2]]) {
	                    stack.pop();
	                    currentParent = arr_back(stack);
	                }
	            }
	            currentParent = currentParent.appendChild(new HTMLElement(match[2], attrs, match[3]));
	            stack.push(currentParent);
	            if (kBlockTextElements[match[2]]) {
	                // a little test to find next </script> or </style> ...
	                let closeMarkup = '</' + match[2] + '>';
	                let index = data.indexOf(closeMarkup, kMarkupPattern.lastIndex);
	                if (options[match[2]]) {
	                    let text;
	                    if (index == -1) {
	                        // there is no matching ending for the text element.
	                        text = data.substr(kMarkupPattern.lastIndex);
	                    }
	                    else {
	                        text = data.substring(kMarkupPattern.lastIndex, index);
	                    }
	                    if (text.length > 0) {
	                        currentParent.appendChild(new TextNode(text));
	                    }
	                }
	                if (index == -1) {
	                    lastTextPos = kMarkupPattern.lastIndex = data.length + 1;
	                }
	                else {
	                    lastTextPos = kMarkupPattern.lastIndex = index + closeMarkup.length;
	                    match[1] = 'true';
	                }
	            }
	        }
	        if (match[1] || match[4] ||
	            kSelfClosingElements[match[2]]) {
	            // </ or /> or <br> etc.
	            while (true) {
	                if (currentParent.tagName == match[2]) {
	                    stack.pop();
	                    currentParent = arr_back(stack);
	                    break;
	                }
	                else {
	                    // Trying to close current tag, and move on
	                    if (kElementsClosedByClosing[currentParent.tagName]) {
	                        if (kElementsClosedByClosing[currentParent.tagName][match[2]]) {
	                            stack.pop();
	                            currentParent = arr_back(stack);
	                            continue;
	                        }
	                    }
	                    // Use aggressive strategy to handle unmatching markups.
	                    break;
	                }
	            }
	        }
	    }
	    const valid = !!(stack.length === 1);
	    if (!options.noFix) {
	        const response = root;
	        response.valid = valid;
	        while (stack.length > 1) {
	            // Handle each error elements.
	            const last = stack.pop();
	            const oneBefore = arr_back(stack);
	            if (last.parentNode && last.parentNode.parentNode) {
	                if (last.parentNode === oneBefore && last.tagName === oneBefore.tagName) {
	                    // Pair error case <h3> <h3> handle : Fixes to <h3> </h3>
	                    oneBefore.removeChild(last);
	                    last.childNodes.forEach((child) => {
	                        oneBefore.parentNode.appendChild(child);
	                    });
	                    stack.pop();
	                }
	                else {
	                    // Single error  <div> <h3> </div> handle: Just removes <h3>
	                    oneBefore.removeChild(last);
	                    last.childNodes.forEach((child) => {
	                        oneBefore.appendChild(child);
	                    });
	                }
	            }
	        }
	        response.childNodes.forEach((node) => {
	            if (node instanceof HTMLElement) {
	                node.parentNode = null;
	            }
	        });
	        return response;
	    }
	    else {
	        const response = new TextNode(data);
	        response.valid = valid;
	        return response;
	    }
	}
	exports.parse = parse;
	});

	var html_parser = unwrapExports(dist);
	var dist_1 = dist.NodeType;
	var dist_2 = dist.Node;
	var dist_3 = dist.TextNode;
	var dist_4 = dist.HTMLElement;
	var dist_5 = dist.Matcher;
	var dist_6 = dist.parse;

	//// lift-tools - md2html
	class LIFTS_MD2html {
	  constructor() {
	    this.dir_media = APP.directory.media;
	    this.markdown = "";
	    this.html = "";
	    this.max_list_nodes = 2;
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
	    this.markdown = arg;
	    let html = this.convert_text_md(arg);
	    this.html = this.html_parse(html);
	    app.presentation_update();
	  } //////////////////////////////////showdown
	  ///  global settings for showdown


	  init_converter() {
	    this.converter2HTML = new showdown.Converter();
	  }

	  convert_text_md(text) {
	    let html = this.md2html(text);
	    return html;
	  } //////////////////////////////////html parser
	  /////// create specific HTML rules here - expand into class later


	  html_parse(html) {
	    const root = html_parser.parse(html);
	    var nnodes = this.process_nodes(root); //  var onodes =this.organise_nodes(nnodes);

	    return nnodes;
	  }

	  organise_nodes(html_nodes) {
	    var nroot = html_parser.parse();
	    var snodes = html_nodes.childNodes;

	    for (let i = 0; i < snodes.length; i++) {
	      let snode = snodes[i];
	      var section_node = this.add_section_node(nroot); /// organise section

	      var nodes = snode.childNodes;

	      for (let j = 0; j < nodes.length; j++) {
	        let node = nodes[j];

	        if (node.tagName == 'ul') {
	          let list_node = this.organise_node_list(node);

	          for (let k = 0; k < list_node.length; k++) {
	            section_node.appendChild(list_node[k]);
	            nroot.appendChild(section_node);
	          }
	        }
	      }
	    }

	    return nroot;
	  }

	  organise_node_list(list_node) {
	    var list_nodes = [];
	    var list_item = [];
	    var list_node_new = this.add_node('ul');
	    let lnodelist = list_node.childNodes;
	    let counter = 0;

	    for (let i = 0; i < lnodelist.length; i++) {
	      let node = lnodelist[i];
	      list_item.push(node);
	      counter++;

	      if (counter > this.max_list_nodes) {
	        /// rule max bullet points per page 3
	        counter = 0;
	        list_node_new.childNodes = list_item;
	        list_nodes.push(list_node_new);
	        list_item = [];
	        list_node_new = this.add_node('ul');
	      }
	    }

	    list_node_new.childNodes = list_item;
	    list_nodes.push(list_node_new);
	    return list_nodes;
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
	          node = this.swap_node_tag(node, 'h5');
	          nroot.appendChild(section_node);
	          section_node = this.add_section_node(nroot);
	        } else {
	          node = this.process_node(node);
	        }

	        if (node != undefined) section_node.appendChild(node);
	      }
	    }

	    nroot.appendChild(section_node); //  console.log('nroot',nroot);

	    return nroot;
	  }

	  swap_node_tag(node, node1) {
	    node.tagName = node1;
	    return node;
	  }

	  isvalid_node(node) {
	    /////// HTMLNode only - top level
	    if (node.nodeType == 1) {
	      return true;
	    }

	    return false;
	  }

	  isvalid_node_tag(node) {
	    if (node.tagName == 'h1' || node.tagName == 'h2' || node.tagName == 'h3' || node.tagName == 'h4') return true;
	    return false;
	  }

	  add_section_node(root) {
	    let section = html_parser.parse();
	    section.tagName = 'section'; //  console.log('section',section)

	    return section;
	  }

	  add_node(type) {
	    let n = html_parser.parse();
	    n.tagName = type;
	    return n;
	  }

	  process_node(node) {
	    if (node.tagName == 'ul') {
	      node = this.process_node_list(node);
	      return node;
	    } else if (node.tagName == 'li') {
	      node = this.process_node_item(node);
	      return node;
	    } else if (node.tagName == 'p') {
	      //  console.log('paragraph node:',node.tagName,node)
	      return node;
	    }
	  }

	  process_node_list(node_list) {
	    var nodes = node_list.childNodes;
	    var list_node = this.add_node('ul');

	    for (let i = 0; i < nodes.length; i++) {
	      let node = nodes[i];
	      node = this.process_node(node);
	      if (node != undefined) list_node.appendChild(node);
	    }

	    return list_node;
	  }

	  process_node_item(node_item) {
	    //  console.log(node_item)
	    var nodes = node_item.childNodes;
	    var item_node = this.add_node('li');

	    for (let i = 0; i < nodes.length; i++) {
	      let node = nodes[i];
	      node = this.process_node_item_text(node);

	      if (node != undefined) {
	        item_node.appendChild(node); //   return item_node;
	      }
	    }

	    return item_node;
	  }

	  process_node_item_text(node) {
	    if (node.nodeType == 1) {
	      node = this.process_node_item_text_extract(node);
	      node = this.process_node_item_text_format(node);
	      return node;
	    } else if (node.nodeType == 3) {
	      node = this.process_node_item_text_format(node);
	      return node;
	    } else {
	      console.log('ignored node item:', node.nodeType, node);
	    }
	  }

	  process_node_item_text_format(node) {
	    //  console.log(node)
	    return node;
	  }

	  process_node_item_text_extract(node_item) {
	    var nodes = node_item.childNodes;
	    var text_node = "";
	    var sub_item_node = [];

	    for (let i = 0; i < nodes.length; i++) {
	      let node = nodes[i];

	      if (node.tagName == 'li') {
	        node = this.process_node_item(node);
	        sub_item_node.push(node);
	      } else if (node.nodeType == 3) {
	        text_node = node;
	      } else {
	        console.log('ignored node item text:', node);
	      }
	    }

	    if (sub_item_node.length > 0) {
	      node_item.childNodes = sub_item_node;
	      return node_item;
	    } else if (text_node != "") {
	      return text_node;
	    }

	    return node_item;
	  }

	  isheader_node(node) {
	    if (node.tagName == 'h1' || node.tagName == 'h2' || node.tagName == 'h3' || node.tagName == 'h4') return true;
	    return false;
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
	    this.codemirror_init();
	    this.run();
	    APP.running = true;
	  }

	  run() {
	    setInterval(function () {
	      step();
	    }, 5000 / 29.97);
	  }

	  cycle() {
	    this.md2html.cycle();
	  } //////////////////////////////////codemirror


	  codemirror_init() {
	    let html_element = document.getElementById('lifts-markdown');
	    this.codemirror = codemirror(html_element, {
	      value: "\n",
	      mode: "javascript"
	    }); //    console.log(myCodeMirror,html_element,document.body)
	  }

	  codemirror_value(v) {
	    this.codemirror.setValue(v);
	  } //////////////////////////////////reveal


	  presentation_set() {
	    this.presentation_frame_set();
	    this.presentation_target_set();
	  }

	  presentation_update() {
	    this.presentation_frame_update(); //  document.getElementById('lifts-reveal').contentDocument.location.reload(true);
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
	    this.iframe_reveal.style.left = "5";
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
	    var html_target_inner = html_target.contentDocument ? html_target.contentDocument : html_target.contentWindow.document;
	    let html_tag = html_target_inner.getElementById('lifts-slides'); //    let html_tag = this.iframe_reveal.getElementById('lifts-slides');
	    //  html_tag.innerHTML=	"<section>Slide 1</section><section>Slide 2</section>";

	    html_tag.innerHTML = this.md2html.html; //html_target_inner.getElementById('lifts-slides').innerHTML=html;

	    console.log('pub:', html_target_inner, html_tag);
	  }

	  reveal_footer() {}

	  reveal_init() {
	    Reveal.initialize({
	      dependencies: [{
	        src: 'plugin/markdown/marked.js'
	      }, {
	        src: 'plugin/markdown/markdown.js'
	      }, {
	        src: 'plugin/notes/notes.js',
	        async: true
	      }, {
	        src: 'plugin/highlight/highlight.js',
	        async: true
	      }]
	    });
	  } //////////////////////////////////unit tests


	  test() {//  this.codemirror();
	    //  this.md2html.test();
	  }

	  test_run() {
	    console.log('LIFTS-tools (test-run)  ' + 'v:' + APP.properties.version);
	    this.presentation_set();
	    this.md2html.test(); //  this.setPresentationTarget();
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
