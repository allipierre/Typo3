
/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */


Element.addMethods({
	pngHack: function(element) {
		element = $(element);
		var transparentGifPath = 'clear.gif';

			// If there is valid element, it is an image and the image file ends with png:
		if (Object.isElement(element) && element.tagName === 'IMG' && element.src.endsWith('.png')) {
			var alphaImgSrc = element.src;
			var sizingMethod = 'scale';
			element.src = transparentGifPath;
		}

		if (alphaImgSrc) {
			element.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="#{alphaImgSrc}",sizingMethod="#{sizingMethod}")'.interpolate(
			{
				alphaImgSrc: alphaImgSrc,
				sizingMethod: sizingMethod
			});
		}

		return element;
	}
});

var IECompatibility = Class.create({

	/**
	 * initializes the compatibility class
	 */
	initialize: function() {
		Event.observe(document, 'dom:loaded', function() {
			$$('input[type="checkbox"]').invoke('addClassName', 'checkbox');
		}.bind(this));

		Event.observe(window, 'load', function() {
			if (Prototype.Browser.IE) {
				var version = parseFloat(navigator.appVersion.split(';')[1].strip().split(' ')[1]);
				if (version === 6) {
					$$('img').each(function(img) {
						img.pngHack();
					});
					$$('#typo3-menu li ul li').each(function(li) {
						li.setStyle({height: '21px'});
					});
				}
			}
		});
	}
});

if (Prototype.Browser.IE) {
	var TYPO3IECompatibilty = new IECompatibility();
}

/* CodeMirror main module (http://codemirror.net/)
 *
 * Implements the CodeMirror constructor and prototype, which take care
 * of initializing the editor frame, and providing the outside interface.
 */

// The CodeMirrorConfig object is used to specify a default
// configuration. If you specify such an object before loading this
// file, the values you put into it will override the defaults given
// below. You can also assign to it after loading.
var CodeMirrorConfig = window.CodeMirrorConfig || {};

var CodeMirror = (function(){
  function setDefaults(object, defaults) {
    for (var option in defaults) {
      if (!object.hasOwnProperty(option))
        object[option] = defaults[option];
    }
  }
  function forEach(array, action) {
    for (var i = 0; i < array.length; i++)
      action(array[i]);
  }
  function createHTMLElement(el) {
    if (document.createElementNS && document.documentElement.namespaceURI !== null)
      return document.createElementNS("http://www.w3.org/1999/xhtml", el)
    else
      return document.createElement(el)
  }

  // These default options can be overridden by passing a set of
  // options to a specific CodeMirror constructor. See manual.html for
  // their meaning.
  setDefaults(CodeMirrorConfig, {
    stylesheet: [],
    path: "",
    parserfile: [],
    basefiles: ["util.js", "stringstream.js", "select.js", "undo.js", "editor.js", "tokenize.js"],
    iframeClass: null,
    passDelay: 200,
    passTime: 50,
    lineNumberDelay: 200,
    lineNumberTime: 50,
    continuousScanning: false,
    saveFunction: null,
    onLoad: null,
    onChange: null,
    undoDepth: 50,
    undoDelay: 800,
    disableSpellcheck: true,
    textWrapping: true,
    readOnly: false,
    width: "",
    height: "300px",
    minHeight: 100,
    autoMatchParens: false,
    markParen: null,
    unmarkParen: null,
    parserConfig: null,
    tabMode: "indent", // or "spaces", "default", "shift"
    enterMode: "indent", // or "keep", "flat"
    electricChars: true,
    reindentOnLoad: false,
    activeTokens: null,
    onCursorActivity: null,
    lineNumbers: false,
    firstLineNumber: 1,
    onLineNumberClick: null,
    indentUnit: 2,
    domain: null,
    noScriptCaching: false,
    incrementalLoading: false
  });

  function addLineNumberDiv(container, firstNum) {
    var nums = createHTMLElement("div"),
        scroller = createHTMLElement("div");
    nums.style.position = "absolute";
    nums.style.height = "100%";
    if (nums.style.setExpression) {
      try {nums.style.setExpression("height", "this.previousSibling.offsetHeight + 'px'");}
      catch(e) {} // Seems to throw 'Not Implemented' on some IE8 versions
    }
    nums.style.top = "0px";
    nums.style.left = "0px";
    nums.style.overflow = "hidden";
    container.appendChild(nums);
    scroller.className = "CodeMirror-line-numbers";
    nums.appendChild(scroller);
    scroller.innerHTML = "<div>" + firstNum + "</div>";
    return nums;
  }

  function frameHTML(options) {
    if (typeof options.parserfile == "string")
      options.parserfile = [options.parserfile];
    if (typeof options.basefiles == "string")
      options.basefiles = [options.basefiles];
    if (typeof options.stylesheet == "string")
      options.stylesheet = [options.stylesheet];

    var sp = " spellcheck=\"" + (options.disableSpellcheck ? "false" : "true") + "\"";
    var html = ["<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.0 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\"><html" + sp + "><head>"];
    // Hack to work around a bunch of IE8-specific problems.
    html.push("<meta http-equiv=\"X-UA-Compatible\" content=\"IE=EmulateIE7\"/>");
    var queryStr = options.noScriptCaching ? "?nocache=" + new Date().getTime().toString(16) : "";
    forEach(options.stylesheet, function(file) {
      html.push("<link rel=\"stylesheet\" type=\"text/css\" href=\"" + file + queryStr + "\"/>");
    });
    forEach(options.basefiles.concat(options.parserfile), function(file) {
      if (!/^https?:/.test(file)) file = options.path + file;
      html.push("<script type=\"text/javascript\" src=\"" + file + queryStr + "\"><" + "/script>");
    });
    html.push("</head><body style=\"border-width: 0;\" class=\"editbox\"" + sp + "></body></html>");
    return html.join("");
  }

  var internetExplorer = document.selection && window.ActiveXObject && /MSIE/.test(navigator.userAgent);

  function CodeMirror(place, options) {
    // Use passed options, if any, to override defaults.
    this.options = options = options || {};
    setDefaults(options, CodeMirrorConfig);

    // Backward compatibility for deprecated options.
    if (options.dumbTabs) options.tabMode = "spaces";
    else if (options.normalTab) options.tabMode = "default";
    if (options.cursorActivity) options.onCursorActivity = options.cursorActivity;

    var frame = this.frame = createHTMLElement("iframe");
    if (options.iframeClass) frame.className = options.iframeClass;
    frame.frameBorder = 0;
    frame.style.border = "0";
    frame.style.width = '100%';
    frame.style.height = '100%';
    // display: block occasionally suppresses some Firefox bugs, so we
    // always add it, redundant as it sounds.
    frame.style.display = "block";

    var div = this.wrapping = createHTMLElement("div");
    div.style.position = "relative";
    div.className = "CodeMirror-wrapping";
    div.style.width = options.width;
    div.style.height = (options.height == "dynamic") ? options.minHeight + "px" : options.height;
    // This is used by Editor.reroutePasteEvent
    var teHack = this.textareaHack = createHTMLElement("textarea");
    div.appendChild(teHack);
    teHack.style.position = "absolute";
    teHack.style.left = "-10000px";
    teHack.style.width = "10px";
    teHack.tabIndex = 100000;

    // Link back to this object, so that the editor can fetch options
    // and add a reference to itself.
    frame.CodeMirror = this;
    if (options.domain && internetExplorer) {
      this.html = frameHTML(options);
      frame.src = "javascript:(function(){document.open();" +
        (options.domain ? "document.domain=\"" + options.domain + "\";" : "") +
        "document.write(window.frameElement.CodeMirror.html);document.close();})()";
    }
    else {
      frame.src = "javascript:;";
    }

    if (place.appendChild) place.appendChild(div);
    else place(div);
    div.appendChild(frame);
    if (options.lineNumbers) this.lineNumbers = addLineNumberDiv(div, options.firstLineNumber);

    this.win = frame.contentWindow;
    if (!options.domain || !internetExplorer) {
      this.win.document.open();
      this.win.document.write(frameHTML(options));
      this.win.document.close();
    }
  }

  CodeMirror.prototype = {
    init: function() {
      // Deprecated, but still supported.
      if (this.options.initCallback) this.options.initCallback(this);
      if (this.options.onLoad) this.options.onLoad(this);
      if (this.options.lineNumbers) this.activateLineNumbers();
      if (this.options.reindentOnLoad) this.reindent();
      if (this.options.height == "dynamic") this.setDynamicHeight();
    },

    getCode: function() {return this.editor.getCode();},
    setCode: function(code) {this.editor.importCode(code);},
    selection: function() {this.focusIfIE(); return this.editor.selectedText();},
    reindent: function() {this.editor.reindent();},
    reindentSelection: function() {this.focusIfIE(); this.editor.reindentSelection(null);},

    focusIfIE: function() {
      // in IE, a lot of selection-related functionality only works when the frame is focused
      if (this.win.select.ie_selection && document.activeElement != this.frame)
        this.focus();
    },
    focus: function() {
      this.win.focus();
      if (this.editor.selectionSnapshot) // IE hack
        this.win.select.setBookmark(this.win.document.body, this.editor.selectionSnapshot);
    },
    replaceSelection: function(text) {
      this.focus();
      this.editor.replaceSelection(text);
      return true;
    },
    replaceChars: function(text, start, end) {
      this.editor.replaceChars(text, start, end);
    },
    getSearchCursor: function(string, fromCursor, caseFold) {
      return this.editor.getSearchCursor(string, fromCursor, caseFold);
    },

    undo: function() {this.editor.history.undo();},
    redo: function() {this.editor.history.redo();},
    historySize: function() {return this.editor.history.historySize();},
    clearHistory: function() {this.editor.history.clear();},

    grabKeys: function(callback, filter) {this.editor.grabKeys(callback, filter);},
    ungrabKeys: function() {this.editor.ungrabKeys();},

    setParser: function(name, parserConfig) {this.editor.setParser(name, parserConfig);},
    setSpellcheck: function(on) {this.win.document.body.spellcheck = on;},
    setStylesheet: function(names) {
      if (typeof names === "string") names = [names];
      var activeStylesheets = {};
      var matchedNames = {};
      var links = this.win.document.getElementsByTagName("link");
      // Create hashes of active stylesheets and matched names.
      // This is O(n^2) but n is expected to be very small.
      for (var x = 0, link; link = links[x]; x++) {
        if (link.rel.indexOf("stylesheet") !== -1) {
          for (var y = 0; y < names.length; y++) {
            var name = names[y];
            if (link.href.substring(link.href.length - name.length) === name) {
              activeStylesheets[link.href] = true;
              matchedNames[name] = true;
            }
          }
        }
      }
      // Activate the selected stylesheets and disable the rest.
      for (var x = 0, link; link = links[x]; x++) {
        if (link.rel.indexOf("stylesheet") !== -1) {
          link.disabled = !(link.href in activeStylesheets);
        }
      }
      // Create any new stylesheets.
      for (var y = 0; y < names.length; y++) {
        var name = names[y];
        if (!(name in matchedNames)) {
          var link = this.win.document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = name;
          this.win.document.getElementsByTagName('head')[0].appendChild(link);
        }
      }
    },
    setTextWrapping: function(on) {
      if (on == this.options.textWrapping) return;
      this.win.document.body.style.whiteSpace = on ? "" : "nowrap";
      this.options.textWrapping = on;
      if (this.lineNumbers) {
        this.setLineNumbers(false);
        this.setLineNumbers(true);
      }
    },
    setIndentUnit: function(unit) {this.win.indentUnit = unit;},
    setUndoDepth: function(depth) {this.editor.history.maxDepth = depth;},
    setTabMode: function(mode) {this.options.tabMode = mode;},
    setEnterMode: function(mode) {this.options.enterMode = mode;},
    setLineNumbers: function(on) {
      if (on && !this.lineNumbers) {
        this.lineNumbers = addLineNumberDiv(this.wrapping,this.options.firstLineNumber);
        this.activateLineNumbers();
      }
      else if (!on && this.lineNumbers) {
        this.wrapping.removeChild(this.lineNumbers);
        this.wrapping.style.paddingLeft = "";
        this.lineNumbers = null;
      }
    },

    cursorPosition: function(start) {this.focusIfIE(); return this.editor.cursorPosition(start);},
    firstLine: function() {return this.editor.firstLine();},
    lastLine: function() {return this.editor.lastLine();},
    nextLine: function(line) {return this.editor.nextLine(line);},
    prevLine: function(line) {return this.editor.prevLine(line);},
    lineContent: function(line) {return this.editor.lineContent(line);},
    setLineContent: function(line, content) {this.editor.setLineContent(line, content);},
    removeLine: function(line){this.editor.removeLine(line);},
    insertIntoLine: function(line, position, content) {this.editor.insertIntoLine(line, position, content);},
    selectLines: function(startLine, startOffset, endLine, endOffset) {
      this.win.focus();
      this.editor.selectLines(startLine, startOffset, endLine, endOffset);
    },
    nthLine: function(n) {
      var line = this.firstLine();
      for (; n > 1 && line !== false; n--)
        line = this.nextLine(line);
      return line;
    },
    lineNumber: function(line) {
      var num = 0;
      while (line !== false) {
        num++;
        line = this.prevLine(line);
      }
      return num;
    },
    jumpToLine: function(line) {
      if (typeof line == "number") line = this.nthLine(line);
      this.selectLines(line, 0);
      this.win.focus();
    },
    currentLine: function() { // Deprecated, but still there for backward compatibility
      return this.lineNumber(this.cursorLine());
    },
    cursorLine: function() {
      return this.cursorPosition().line;
    },
    cursorCoords: function(start) {return this.editor.cursorCoords(start);},

    activateLineNumbers: function() {
      var frame = this.frame, win = frame.contentWindow, doc = win.document, body = doc.body,
          nums = this.lineNumbers, scroller = nums.firstChild, self = this;
      var barWidth = null;

      nums.onclick = function(e) {
        var handler = self.options.onLineNumberClick;
        if (handler) {
          var div = (e || window.event).target || (e || window.event).srcElement;
          var num = div == nums ? NaN : Number(div.innerHTML);
          if (!isNaN(num)) handler(num, div);
        }
      };

      function sizeBar() {
        if (frame.offsetWidth == 0) return;
        for (var root = frame; root.parentNode; root = root.parentNode){}
        if (!nums.parentNode || root != document || !win.Editor) {
          // Clear event handlers (their nodes might already be collected, so try/catch)
          try{clear();}catch(e){}
          clearInterval(sizeInterval);
          return;
        }

        if (nums.offsetWidth != barWidth) {
          barWidth = nums.offsetWidth;
          frame.parentNode.style.paddingLeft = barWidth + "px";
        }
      }
      function doScroll() {
        nums.scrollTop = body.scrollTop || doc.documentElement.scrollTop || 0;
      }
      // Cleanup function, registered by nonWrapping and wrapping.
      var clear = function(){};
      sizeBar();
      var sizeInterval = setInterval(sizeBar, 500);

      function ensureEnoughLineNumbers(fill) {
        var lineHeight = scroller.firstChild.offsetHeight;
        if (lineHeight == 0) return;
        var targetHeight = 50 + Math.max(body.offsetHeight, Math.max(frame.offsetHeight, body.scrollHeight || 0)),
            lastNumber = Math.ceil(targetHeight / lineHeight);
        for (var i = scroller.childNodes.length; i <= lastNumber; i++) {
          var div = createHTMLElement("div");
          div.appendChild(document.createTextNode(fill ? String(i + self.options.firstLineNumber) : "\u00a0"));
          scroller.appendChild(div);
        }
      }

      function nonWrapping() {
        function update() {
          ensureEnoughLineNumbers(true);
          doScroll();
        }
        self.updateNumbers = update;
        var onScroll = win.addEventHandler(win, "scroll", doScroll, true),
            onResize = win.addEventHandler(win, "resize", update, true);
        clear = function(){
          onScroll(); onResize();
          if (self.updateNumbers == update) self.updateNumbers = null;
        };
        update();
      }

      function wrapping() {
        var node, lineNum, next, pos, changes = [], styleNums = self.options.styleNumbers;

        function setNum(n, node) {
          // Does not typically happen (but can, if you mess with the
          // document during the numbering)
          if (!lineNum) lineNum = scroller.appendChild(createHTMLElement("div"));
          if (styleNums) styleNums(lineNum, node, n);
          // Changes are accumulated, so that the document layout
          // doesn't have to be recomputed during the pass
          changes.push(lineNum); changes.push(n);
          pos = lineNum.offsetHeight + lineNum.offsetTop;
          lineNum = lineNum.nextSibling;
        }
        function commitChanges() {
          for (var i = 0; i < changes.length; i += 2)
            changes[i].innerHTML = changes[i + 1];
          changes = [];
        }
        function work() {
          if (!scroller.parentNode || scroller.parentNode != self.lineNumbers) return;

          var endTime = new Date().getTime() + self.options.lineNumberTime;
          while (node) {
            setNum(next++, node.previousSibling);
            for (; node && !win.isBR(node); node = node.nextSibling) {
              var bott = node.offsetTop + node.offsetHeight;
              while (scroller.offsetHeight && bott - 3 > pos) {
                var oldPos = pos;
                setNum("&nbsp;");
                if (pos <= oldPos) break;
              }
            }
            if (node) node = node.nextSibling;
            if (new Date().getTime() > endTime) {
              commitChanges();
              pending = setTimeout(work, self.options.lineNumberDelay);
              return;
            }
          }
          while (lineNum) setNum(next++);
          commitChanges();
          doScroll();
        }
        function start(firstTime) {
          doScroll();
          ensureEnoughLineNumbers(firstTime);
          node = body.firstChild;
          lineNum = scroller.firstChild;
          pos = 0;
          next = self.options.firstLineNumber;
          work();
        }

        start(true);
        var pending = null;
        function update() {
          if (pending) clearTimeout(pending);
          if (self.editor.allClean()) start();
          else pending = setTimeout(update, 200);
        }
        self.updateNumbers = update;
        var onScroll = win.addEventHandler(win, "scroll", doScroll, true),
            onResize = win.addEventHandler(win, "resize", update, true);
        clear = function(){
          if (pending) clearTimeout(pending);
          if (self.updateNumbers == update) self.updateNumbers = null;
          onScroll();
          onResize();
        };
      }
      (this.options.textWrapping || this.options.styleNumbers ? wrapping : nonWrapping)();
    },

    setDynamicHeight: function() {
      var self = this, activity = self.options.onCursorActivity, win = self.win, body = win.document.body,
          lineHeight = null, timeout = null, vmargin = 2 * self.frame.offsetTop;
      body.style.overflowY = "hidden";
      win.document.documentElement.style.overflowY = "hidden";
      this.frame.scrolling = "no";

      function updateHeight() {
        var trailingLines = 0, node = body.lastChild, computedHeight;
        while (node && win.isBR(node)) {
          if (!node.hackBR) trailingLines++;
          node = node.previousSibling;
        }
        if (node) {
          lineHeight = node.offsetHeight;
          computedHeight = node.offsetTop + (1 + trailingLines) * lineHeight;
        }
        else if (lineHeight) {
          computedHeight = trailingLines * lineHeight;
        }
        if (computedHeight)
          self.wrapping.style.height = Math.max(vmargin + computedHeight, self.options.minHeight) + "px";
      }
      setTimeout(updateHeight, 300);
      self.options.onCursorActivity = function(x) {
        if (activity) activity(x);
        clearTimeout(timeout);
        timeout = setTimeout(updateHeight, 100);
      };
    }
  };

  CodeMirror.InvalidLineHandle = {toString: function(){return "CodeMirror.InvalidLineHandle";}};

  CodeMirror.replace = function(element) {
    if (typeof element == "string")
      element = document.getElementById(element);
    return function(newElement) {
      element.parentNode.replaceChild(newElement, element);
    };
  };

  CodeMirror.fromTextArea = function(area, options) {
    if (typeof area == "string")
      area = document.getElementById(area);

    options = options || {};
    if (area.style.width && options.width == null)
      options.width = area.style.width;
    if (area.style.height && options.height == null)
      options.height = area.style.height;
    if (options.content == null) options.content = area.value;

    function updateField() {
      area.value = mirror.getCode();
    }
    if (area.form) {
      if (typeof area.form.addEventListener == "function")
        area.form.addEventListener("submit", updateField, false);
      else
        area.form.attachEvent("onsubmit", updateField);
      var realSubmit = area.form.submit;
      function wrapSubmit() {
        updateField();
        // Can't use realSubmit.apply because IE6 is too stupid
        area.form.submit = realSubmit;
        area.form.submit();
        area.form.submit = wrapSubmit;
      }
      try {area.form.submit = wrapSubmit;} catch(e){}
    }

    function insert(frame) {
      if (area.nextSibling)
        area.parentNode.insertBefore(frame, area.nextSibling);
      else
        area.parentNode.appendChild(frame);
    }

    area.style.display = "none";
    var mirror = new CodeMirror(insert, options);
    mirror.save = updateField;
    mirror.toTextArea = function() {
      updateField();
      area.parentNode.removeChild(mirror.wrapping);
      area.style.display = "";
      if (area.form) {
        try {area.form.submit = realSubmit;} catch(e) {}
        if (typeof area.form.removeEventListener == "function")
          area.form.removeEventListener("submit", updateField, false);
        else
          area.form.detachEvent("onsubmit", updateField);
      }
    };

    return mirror;
  };

  CodeMirror.isProbablySupported = function() {
    // This is rather awful, but can be useful.
    var match;
    if (window.opera)
      return Number(window.opera.version()) >= 9.52;
    else if (/Apple Computer, Inc/.test(navigator.vendor) && (match = navigator.userAgent.match(/Version\/(\d+(?:\.\d+)?)\./)))
      return Number(match[1]) >= 3;
    else if (document.selection && window.ActiveXObject && (match = navigator.userAgent.match(/MSIE (\d+(?:\.\d*)?)\b/)))
      return Number(match[1]) >= 6;
    else if (match = navigator.userAgent.match(/gecko\/(\d{8})/i))
      return Number(match[1]) >= 20050901;
    else if (match = navigator.userAgent.match(/AppleWebKit\/(\d+)/))
      return Number(match[1]) >= 525;
    else
      return null;
  };

  return CodeMirror;
})();

/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */
/* t3editor.js uses the Codemirror editor.
 */

T3editor = T3editor || {};

// collection of all t3editor instances on the current page
T3editor.instances = {};

// path to the editor ext dir
// can be overwritten in class.tx_t3editor.php
T3editor.PATH_t3e = "../../../sysext/t3editor/";
T3editor.PATH_codemirror = "../../../contrib/codemirror/js/";


function T3editor(textarea) {
	var self = this;

		// memorize the textarea
	this.textarea = $(textarea);
	var textareaDim = $(this.textarea).getDimensions();
	this.textarea.hide();

		// outer wrap around the whole t3editor
	this.outerdiv = new Element("DIV", {
		"class": "t3e_wrap"
	});

		// place the div before the textarea
	this.textarea.parentNode.insertBefore(this.outerdiv, $(this.textarea));

	this.outerdiv.update(T3editor.template);

	this.modalOverlay = this.outerdiv.down('.t3e_modalOverlay');
	this.modalOverlay.setStyle(this.outerdiv.getDimensions());
	this.modalOverlay.setStyle({
		opacity: 0.8
	});

	this.mirror_wrap = this.outerdiv.down('.t3e_iframe_wrap');
	this.statusbar_wrap = this.outerdiv.down('.t3e_statusbar_wrap');
	this.statusbar_title = this.outerdiv.down('.t3e_statusbar_title');
	this.statusbar_status = this.outerdiv.down('.t3e_statusbar_status');

	this.statusbar_title.update( this.textarea.readAttribute('alt') );
	this.statusbar_status.update( '' );

		// setting options
	var options = {
		height: ( textareaDim.height ) + 'px',
		width: ( textareaDim.width + this.adjustWidth ) + 'px',
		content: $(this.textarea).value,
		parserfile: T3editor.parserfile,
		stylesheet: T3editor.stylesheet,
		path: T3editor.PATH_codemirror,
		outerEditor: this,
		saveFunction: this.saveFunction.bind(this),
		initCallback: this.init.bind(this),
		autoMatchParens: true,
		lineNumbers: true,
		onChange: this.onChange.bind(this)
	};

		// get the editor
	this.mirror = new CodeMirror(this.mirror_wrap, options);
	$(this.outerdiv).fire('t3editor:init', {t3editor: this});
}

T3editor.prototype = {
		saveFunctionEvent: null,
		saveButtons: null,
		updateTextareaEvent: null,
		adjustWidth: -30,
		disabled: false,

		init: function() {
			var textareaDim = $(this.textarea).getDimensions();
			// hide the textarea
			this.textarea.hide();

			this.attachEvents();
			this.resize(textareaDim.width + this.adjustWidth, textareaDim.height );

			this.modalOverlay.hide();
			$(this.outerdiv).fire('t3editor:initFinished', {t3editor: this});
		},

		attachEvents: function() {
			var that = this;

			// get the form object
			var form = $(this.textarea.form);
			this.saveButtons = form.getInputs('image', 'submit');

			// initialize ajax saving events
			this.saveFunctionEvent = this.saveFunction.bind(this);
			this.saveButtons.each(function(button) {
				Event.observe(button,'click',this.saveFunctionEvent);
			}.bind(this));

			this.updateTextareaEvent = this.updateTextarea.bind(this);

			Event.observe($(this.textarea.form), 'submit', this.updateTextareaEvent);

			Event.observe(this.mirror.win.document, 'keyup', function(event) {
				$(that.outerdiv).fire('t3editor:keyup', {t3editor: that, actualEvent: event});
			});
			Event.observe(this.mirror.win.document, 'keydown', function(event) {
				$(that.outerdiv).fire('t3editor:keydown', {t3editor: that, actualEvent: event});

				if ((event.ctrlKey || event.metaKey) && event.keyCode == 122) {
					that.toggleFullscreen();
					event.stop();
				}
			});
			Event.observe(this.mirror.win.document, 'click', function(event) {
				$(that.outerdiv).fire('t3editor:click', {t3editor: that, actualEvent: event});
			});
		},

		// indicates is content is modified and not safed yet
		textModified: false,

		// check if code in editor has been modified since last saving
		checkTextModified: function() {
			if (!this.textModified) {
				this.textModified = true;
			}
		},

		updateTextarea: function(event) {
			this.textarea.value = this.mirror.getCode();
		},

		onChange: function() {
			var that = this;
			this.checkTextModified();
			$(that.outerdiv).fire('t3editor:change', {t3editor: that});
		},

		saveFunction: function(event) {
			if (!T3editor.ajaxSavetype || T3editor.ajaxSavetype == '') {
				return;
			}
			this.modalOverlay.show();
			this.updateTextarea(event);

			if (event) {
				Event.stop(event);
			}

			var params = $(this.textarea.form).serialize(true);
			params = Object.extend( {t3editor_disableEditor: 'false'}, params);

			$(this.outerdiv).fire('t3editor:save', {parameters: params, t3editor: this});

		},

		// callback if saving was successful
		saveFunctionComplete: function(wasSuccessful,returnedData) {
			if (wasSuccessful) {
				this.textModified = false;
			} else {
				if (typeof returnedData.exceptionMessage != 'undefined') {
					TYPO3.Flashmessage.display(4, T3editor.lang.errorWhileSaving[0]['target'], returnedData.exceptionMessage);
				} else {
					TYPO3.Flashmessage.display(4, T3editor.lang.errorWhileSaving[0]['target']);
				}
			}
			this.modalOverlay.hide();
		},

		// toggle between the textarea and t3editor
		toggleView: function(disable) {
			$(this.outerdiv).fire('t3editor:toggleView', {t3editor: this, disable: disable});
			this.disabled = disable;
			if (disable) {
				this.textarea.value = this.mirror.editor.getCode();
				this.outerdiv.hide();
				this.textarea.show();
				this.saveButtons.each(function(button) {
					Event.stopObserving(button,'click',this.saveFunctionEvent);
				}.bind(this));
				Event.stopObserving($(this.textarea.form), 'submit', this.updateTextareaEvent);

			} else {
				this.mirror.editor.importCode(this.textarea.value);
				this.textarea.hide();
				this.outerdiv.show();
				this.saveButtons.each(function(button) {
					this.saveFunctionEvent = this.saveFunction.bind(this);
					Event.observe(button,'click',this.saveFunctionEvent);
				}.bind(this));
				Event.observe($(this.textarea.form), 'submit', this.updateTextareaEvent);
			}
		},

		resize: function(width, height) {
			if (this.outerdiv) {
				newheight = (height - 1);
				newwidth = (width + 11);
				if (Prototype.Browser.IE) newwidth = newwidth + 8;

				$(this.outerdiv).setStyle({
					height: newheight + 'px',
					width: newwidth + 'px'
				});

				$(this.mirror_wrap.firstChild).setStyle({
					'height': ((height - 22) + 'px'),
					'width': ((width - 13) + 'px')
				});

				$(this.modalOverlay).setStyle(this.outerdiv.getDimensions());

			}

		},

		// toggle between normal view and fullscreen mode
		toggleFullscreen: function() {
			if (this.outerdiv.hasClassName('t3e_fullscreen')) {
				// turn fullscreen off

				// unhide the scrollbar of the body
				this.outerdiv.offsetParent.setStyle({
					overflow: ''
				});

				this.outerdiv.removeClassName('t3e_fullscreen');
				h = this.textarea.getDimensions().height;
				w = this.textarea.getDimensions().width;

			} else {
					// turn fullscreen on
				this.outerdiv.addClassName('t3e_fullscreen');
				h = this.outerdiv.offsetParent.getHeight();
				w = this.outerdiv.offsetParent.getWidth();

				// less scrollbar width
				w = w - 13;

				// hide the scrollbar of the body
				this.outerdiv.offsetParent.setStyle({
					overflow: 'hidden'
				});
				this.outerdiv.offsetParent.scrollTop = 0;
			}
			this.resize(w, h);
		}

} // T3editor.prototype


// ------------------------------------------------------------------------


/**
 * toggle between enhanced editor (t3editor) and simple textarea
 */
T3editor.toggleEditor = function(checkbox, index) {
	if (!Prototype.Browser.MobileSafari) {
		if (index == undefined) {
			if (top.TYPO3.BackendUserSettings) {
				top.TYPO3.BackendUserSettings.ExtDirect.set(
					'disableT3Editor',
					checkbox.checked,
					function(response) {}
				);
			}
			$$('textarea.t3editor').each(
				function(textarea, i) {
					T3editor.toggleEditor(checkbox, i);
				}
			);
		} else {
			if (T3editor.instances[index] != undefined) {
				var t3e = T3editor.instances[index];
				t3e.toggleView(checkbox.checked);
			} else if (!checkbox.checked) {
				var t3e = new T3editor($$('textarea.t3editor')[index], index);
				T3editor.instances[index] = t3e;
			}
		}
	}
}

// ------------------------------------------------------------------------

if (!Prototype.Browser.MobileSafari) {
	// everything ready: turn textarea's into fancy editors
	Event.observe(window, 'load',
		function() {
			$$('textarea.t3editor').each(
				function(textarea, i) {
					if ($('t3editor_disableEditor_' + (i + 1) + '_checkbox')
					&& !$('t3editor_disableEditor_' + (i + 1) + '_checkbox').checked) {
						var t3e = new T3editor(textarea);
						T3editor.instances[i] = t3e;
					}
				}
			);

			if (T3editor.ajaxSavetype != "") {
				Event.observe(document, 't3editor:save',
					function(event) {
						var params = Object.extend({
							t3editor_savetype: T3editor.ajaxSavetype
						}, event.memo.parameters);

						new Ajax.Request(
							T3editor.URL_typo3 + TYPO3.settings.ajaxUrls['T3Editor::saveCode'], {
								parameters: params,
								onComplete: function(ajaxrequest) {
									var wasSuccessful = ajaxrequest.status == 200
									&& ajaxrequest.headerJSON.result == true;
									event.memo.t3editor.saveFunctionComplete(wasSuccessful,ajaxrequest.headerJSON);
								}
							}
						);
					}
				);
			}
		}
	);
}
/*
 * This code has been copied from Project_CMS
 * Copyright (c) 2005 by Phillip Berndt (www.pberndt.com)
 *
 * Extended Textarea for IE and Firefox browsers
 * Features:
 *  - Possibility to place tabs in <textarea> elements using a simply <TAB> key
 *  - Auto-indenting of new lines
 *
 * License: GNU General Public License
 */

function checkBrowser() {
	browserName = navigator.appName;
	browserVer = parseInt(navigator.appVersion);

	ok = false;
	if (browserName == "Microsoft Internet Explorer" && browserVer >= 4) {
		ok = true;
	} else if (browserName == "Netscape" && browserVer >= 3) {
		ok = true;
	}

	return ok;
}

	// Automatically change all textarea elements
function changeTextareaElements() {
	if (!checkBrowser()) {
			// Stop unless we're using IE or Netscape (includes Mozilla family)
		return false;
	}

	document.textAreas = document.getElementsByTagName("textarea");

	for (i = 0; i < document.textAreas.length; i++) {
			// Only change if the class parameter contains "enable-tab"
		if (document.textAreas[i].className && document.textAreas[i].className.search(/(^| )enable-tab( |$)/) != -1) {
			document.textAreas[i].textAreaID = i;
			makeAdvancedTextArea(document.textAreas[i]);
		}
	}
}

	// Wait until the document is completely loaded.
	// Set a timeout instead of using the onLoad() event because it could be used by something else already.
window.setTimeout("changeTextareaElements();", 200);

	// Turn textarea elements into "better" ones. Actually this is just adding some lines of JavaScript...
function makeAdvancedTextArea(textArea) {
	if (textArea.tagName.toLowerCase() != "textarea") {
		return false;
	}

		// On attempt to leave the element:
		// Do not leave if this.dontLeave is true
	textArea.onblur = function(e) {
		if (!this.dontLeave) {
			return;
		}
		this.dontLeave = null;
		window.setTimeout("document.textAreas[" + this.textAreaID + "].restoreFocus()", 1);
		return false;
	}

		// Set the focus back to the element and move the cursor to the correct position.
	textArea.restoreFocus = function() {
		this.focus();

		if (this.caretPos) {
			this.caretPos.collapse(false);
			this.caretPos.select();
		}
	}

		// Determine the current cursor position
	textArea.getCursorPos = function() {
		if (this.selectionStart) {
			currPos = this.selectionStart;
		} else if (this.caretPos) {	// This is very tricky in IE :-(
			oldText = this.caretPos.text;
			finder = "--getcurrpos" + Math.round(Math.random() * 10000) + "--";
			this.caretPos.text += finder;
			currPos = this.value.indexOf(finder);

			this.caretPos.moveStart('character', -finder.length);
			this.caretPos.text = "";

			this.caretPos.scrollIntoView(true);
		} else {
			return;
		}

		return currPos;
	}

		// On tab, insert a tabulator. Otherwise, check if a slash (/) was pressed.
	textArea.onkeydown = function(e) {
		if (this.selectionStart == null &! this.createTextRange) {
			return;
		}
		if (!e) {
			e = window.event;
		}

			// Tabulator
		if (e.keyCode == 9) {
			this.dontLeave = true;
			this.textInsert(String.fromCharCode(9));
		}

			// Newline
		if (e.keyCode == 13) {
				// Get the cursor position
			currPos = this.getCursorPos();

				// Search the last line
			lastLine = "";
			for (i = currPos - 1; i >= 0; i--) {
				if(this.value.substring(i, i + 1) == '\n') {
					break;
				}
			}
			lastLine = this.value.substring(i + 1, currPos);

				// Search for whitespaces in the current line
			whiteSpace = "";
			for (i = 0; i < lastLine.length; i++) {
				if (lastLine.substring(i, i + 1) == '\t') {
					whiteSpace += "\t";
				} else if (lastLine.substring(i, i + 1) == ' ') {
					whiteSpace += " ";
				} else {
					break;
				}
			}

				// Another ugly IE hack
			if (navigator.appVersion.match(/MSIE/)) {
				whiteSpace = "\\n" + whiteSpace;
			}

				// Insert whitespaces
			window.setTimeout("document.textAreas["+this.textAreaID+"].textInsert(\""+whiteSpace+"\");", 1);
		}
	}

		// Save the current cursor position in IE
	textArea.onkeyup = textArea.onclick = textArea.onselect = function(e) {
		if (this.createTextRange) {
			this.caretPos = document.selection.createRange().duplicate();
		}
	}

		// Insert text at the current cursor position
	textArea.textInsert = function(insertText) {
		if (this.selectionStart != null) {
			var savedScrollTop = this.scrollTop;
			var begin = this.selectionStart;
			var end = this.selectionEnd;
			if (end > begin + 1) {
				this.value = this.value.substr(0, begin) + insertText + this.value.substr(end);
			} else {
				this.value = this.value.substr(0, begin) + insertText + this.value.substr(begin);
			}

			this.selectionStart = begin + insertText.length;
			this.selectionEnd = begin + insertText.length;
			this.scrollTop = savedScrollTop;
		} else if (this.caretPos) {
			this.caretPos.text = insertText;
			this.caretPos.scrollIntoView(true);
		} else {
			text.value += insertText;
		}

		this.focus();
	}
}
/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

Ext.ns('TYPO3', 'TYPO3.CSH.ExtDirect');

/**
 * Class to show tooltips for links that have the css t3-help-link
 * need the tags data-table and data-field (HTML5)
 */


TYPO3.ContextHelp = function() {

	/**
	 * Cache for CSH
	 * @type {Ext.util.MixedCollection}
	 */
	var cshHelp = new Ext.util.MixedCollection(true),
	tip;

	/**
	 * Shows the tooltip, triggered from mouseover event handler
	 *
	 */
	function showToolTipHelp() {
		var link = tip.triggerElement;
		if (!link) {
			return false;
		}
		var table = link.getAttribute('data-table');
		var field = link.getAttribute('data-field');
		var key = table + '.' + field;
		var response = cshHelp.key(key);
		tip.target = tip.triggerElement;
		if (response) {
			updateTip(response);
		} else {
				// If a table is defined, use ExtDirect call to get the tooltip's content
			if (table) {
				var description = '';
				if (typeof(top.TYPO3.LLL) !== 'undefined') {
					description = top.TYPO3.LLL.core.csh_tooltip_loading;
				} else if (opener && typeof(opener.top.TYPO3.LLL) !== 'undefined') {
					description = opener.top.TYPO3.LLL.core.csh_tooltip_loading;
				}

					// Clear old tooltip contents
				updateTip({
					description: description,
					cshLink: '',
					moreInfo: '',
					title: ''
				});
					// Load content
				TYPO3.CSH.ExtDirect.getTableContextHelp(table, function(response, options) {
					Ext.iterate(response, function(key, value){
						cshHelp.add(value);
						if (key === field) {
							updateTip(value);
								// Need to re-position because the height may have increased
							tip.show();
						}
					});
				}, this);

				// No table was given, use directly title and description
			} else {
				updateTip({
					description: link.getAttribute('data-description'),
					cshLink: '',
					moreInfo: '',
					title: link.getAttribute('data-title')
				});
			}
		}
	}

	/**
	 * Update tooltip message
	 *
	 * @param {Object} response
	 */
	function updateTip(response) {
		tip.body.dom.innerHTML = response.description;
		tip.cshLink = response.id;
		tip.moreInfo = response.moreInfo;
		if (tip.moreInfo) {
			tip.addClass('tipIsLinked');
		}
		tip.setTitle(response.title);
		tip.doAutoWidth();
	}

	return {
		/**
		 * Constructor
		 */
		init: function() {
			tip = new Ext.ToolTip({
				title: 'CSH', // needs a title for init because of the markup
				html: '',
					// The tooltip will appear above the label, if viewport allows
				anchor: 'bottom',
				minWidth: 160,
				maxWidth: 240,
				target: Ext.getBody(),
				delegate: 'span.t3-help-link',
				renderTo: Ext.getBody(),
				cls: 'typo3-csh-tooltip',
				shadow: false,
				dismissDelay: 0, // tooltip stays while mouse is over target
				autoHide: true,
				showDelay: 1000, // show after 1 second
				hideDelay: 300, // hide after 0.3 seconds
				closable: true,
				isMouseOver: false,
				listeners: {
					beforeshow: showToolTipHelp,
					render: function(tip) {
						tip.body.on({
							'click': {
								fn: function(event) {
									event.stopEvent();
									if (tip.moreInfo) {
										try {
											top.TYPO3.ContextHelpWindow.open(tip.cshLink);
										} catch(e) {
											// do nothing
										}
									}
									tip.hide();
								}
							}
						});
						tip.el.on({
							'mouseover': {
								fn: function() {
									if (tip.moreInfo) {
										tip.isMouseOver = true;
									}
								}
							},
							'mouseout': {
								fn: function() {
									if (tip.moreInfo) {
										tip.isMouseOver = false;
										tip.hide.defer(tip.hideDelay, tip, []);
									}
								}
							}
						});
					},
					hide: function(tip) {
						tip.setTitle('');
						tip.body.dom.innerHTML = '';
					},
					beforehide: function(tip) {
						return !tip.isMouseOver;
					},
					scope: this
				}
			});

			Ext.getBody().on({
				'keydown': {
					fn: function() {
						tip.hide();
					}
				},
				'click': {
					fn: function() {
						tip.hide();
					}
				}
			});

			/**
			 * Adds a sequence to Ext.TooltTip::showAt so as to increase vertical offset when anchor position is 'bottom'
			 * This positions the tip box closer to the target element when the anchor is on the bottom side of the box
			 * When anchor position is 'top' or 'bottom', the anchor is pushed slightly to the left in order to align with the help icon, if any
			 *
			 */
			Ext.ToolTip.prototype.showAt = Ext.ToolTip.prototype.showAt.createSequence(
				function() {
					var ap = this.getAnchorPosition().charAt(0);
					if (this.anchorToTarget && !this.trackMouse) {
						switch (ap) {
							case 'b':
								var xy = this.getPosition();
								this.setPagePosition(xy[0]-10, xy[1]+5);
								break;
							case 't':
								var xy = this.getPosition();
								this.setPagePosition(xy[0]-10, xy[1]);
								break;
						}
					}
				}
			);

		},

		/**
		 * Opens the help window, triggered from click event handler
		 *
		 * @param {Event} event
		 * @param {Node} link
		 */
		openHelpWindow: function(event, link) {
			var id = link.getAttribute('data-table') + '.' + link.getAttribute('data-field');
			event.stopEvent();
			top.TYPO3.ContextHelpWindow.open(id);
		}
	}
}();

/**
 * Calls the init on Ext.onReady
 */
Ext.onReady(TYPO3.ContextHelp.init, TYPO3.ContextHelp);

/**
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

/**
 * Flashmessage rendered by ExtJS
 *
 *
 * @author Steffen Kamper <info@sk-typo3.de>
 */
Ext.ns('TYPO3');

/**
 * Object for named severities
 */
TYPO3.Severity = {
	notice: 0,
	information: 1,
	ok: 2,
	warning: 3,
	error: 4
};

/**
 * @class TYPO3.Flashmessage
 * Passive popup box singleton
 * @singleton
 *
 * Example (Information message):
 * TYPO3.Flashmessage.display(1, 'TYPO3 Backend - Version 4.4', 'Ready for take off', 3);
 */
TYPO3.Flashmessage = function() {
	var messageContainer;
	var severities = ['notice', 'information', 'ok', 'warning', 'error'];

	function createBox(severity, title, message) {
		return ['<div class="typo3-message message-', severity, '" style="width: 400px">',
				'<div class="t3-icon t3-icon-actions t3-icon-actions-message t3-icon-actions-message-close t3-icon-message-' + severity + '-close"></div>',
				'<div class="header-container">',
				'<div class="message-header">', title, '</div>',
				'</div>',
				'<div class="message-body">', message, '</div>',
				'</div>'].join('');
	}

	return {
		/**
		 * Shows popup
		 * @member TYPO3.Flashmessage
		 * @param int severity (0=notice, 1=information, 2=ok, 3=warning, 4=error)
		 * @param string title
		 * @param string message
		 * @param float duration in sec (default 5)
		 */
		display : function(severity, title, message, duration) {
			duration = duration || 5;
			if (!messageContainer) {
				messageContainer = Ext.DomHelper.insertFirst(document.body, {
					id   : 'msg-div',
					style: 'position:absolute;z-index:10000'
				}, true);
			}

			var box = Ext.DomHelper.append(messageContainer, {
				html: createBox(severities[severity], title, message)
			}, true);
			messageContainer.alignTo(document, 't-t');
			box.child('.t3-icon-actions-message-close').on('click',	function (e, t, o) {
				var node;
				node = new Ext.Element(Ext.get(t).findParent('div.typo3-message'));
				node.hide();
				Ext.removeNode(node.dom);
			}, box);
			box.slideIn('t').pause(duration).ghost('t', {remove: true});
		}
	};
}();
