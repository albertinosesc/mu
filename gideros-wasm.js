// include: shell.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != "undefined" ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).
// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = typeof window == "object";

var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";

// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";

if (ENVIRONMENT_IS_NODE) {}

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: W:\Git\gideros\emscripten\gidjs.js
Module.preRun.push(function() {
  __ATPRERUN__.push(function() {
    Module.JSPlugins.forEach(function(p) {
      var xhr = new Module.XMLHttpRequest;
      var tag = document.createElement("script");
      xhr.open("GET", p, true);
      xhr.onload = function(e) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            tag.text = xhr.response;
            document.head.appendChild(tag);
          } else {
            console.error(xhr.response);
          }
          Module["removeRunDependency"](p);
        }
      };
      Module["addRunDependency"](p);
      xhr.send();
    });
    var loader = new Promise(function(resolve, reject) {
      resolve();
    });
    Module["addRunDependency"]("gidPlugins");
    var directLoader = {
      "cache": {}
    };
    directLoader.findObject = function(name) {
      return name in directLoader.cache;
    };
    directLoader.readFile = function(name, enc) {
      return directLoader.cache[name];
    };
    Module.GiderosPlugins.forEach(function(p) {
      if (p.endsWith(".gidz")) {
        loader = loader.then(function() {
          console.log("Loading plugin:" + p);
          return JZPLoadPromise(p, "array");
        }).then(function(c) {
          console.log("Instanciating plugin:" + p);
          directLoader.cache[p] = c;
          var so = loadDynamicLibrary(p, {
            global: true,
            nodelete: true,
            loadAsync: true,
            fs: directLoader
          });
          directLoader.cache[p] = undefined;
          return so;
        });
      } else {
        loader = loader.then(function() {
          return new Promise(function(resolve, reject) {
            console.log("Loading plugin:" + p);
            var xhr = new Module.XMLHttpRequest;
            xhr.open("GET", p, true);
            xhr.onload = function(e) {
              if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                  resolve(xhr.response);
                } else {
                  reject(xhr.response);
                }
              }
            };
            xhr.responseType = "arraybuffer";
            xhr.send();
          });
        });
        loader = loader.then(function(c) {
          console.log("Instanciating plugin:" + p);
          directLoader.cache[p] = new Uint8Array(c);
          var so = loadDynamicLibrary(p, {
            global: true,
            nodelete: true,
            loadAsync: true,
            fs: directLoader
          });
          directLoader.cache[p] = undefined;
          return so;
        });
      }
    });
    loader = loader.then(function() {
      console.log("Plugins loaded");
      Module["removeRunDependency"]("gidPlugins");
    });
  });
  Module.setStatus("Loading application...");
  // Load GAPP if supplied
  Module.hasGApp = ((typeof (GAPP_URL) != "undefined") && (GAPP_URL != null));
  if (Module.hasGApp) {
    if (GAPP_URL.endsWith(".gidz")) {
      Module["addRunDependency"]("gidLoadGApp");
      var loader = JZPLoadPromise(GAPP_URL, "array").then(function(c) {
        console.log("Copying application");
        FS.createPreloadedFile("/", "main.gapp", c, true, false);
        console.log("Application ready");
        Module["removeRunDependency"]("gidLoadGApp");
      });
    } else FS.createPreloadedFile("/", "main.gapp", GAPP_URL, true, false);
  }
  // Initial syncfs to get existing saved files.
  Module["addRunDependency"]("syncfs");
  FS.gidSyncing = false;
  FS.mkdir("/documents");
  FS.mount(IDBFS, {}, "/documents");
  FS.documentsOk = true;
  FS.syncfs(true, function(err) {
    if (err) {
      FS.unmount("/documents");
      FS.rmdir("/documents");
      console.warn("IndexedDB not available, persistant storage disabled");
      FS.documentsOk = false;
    }
    Module["removeRunDependency"]("syncfs");
  });
  GiderosNetplayerWS = null;
});

Module.registerPlugins = function() {
  Module.GiderosPlugins.forEach(function(p) {
    var pname = p.split(".")[0].split("/").pop();
    var pentry = "g_pluginMain_" + pname;
    // var pp=getCFunc(pentry);
    Module.ccall("main_registerPlugin", "number", [ "string", "string" ], [ p, pentry ]);
    // g_registerPlugin(g_pluginMain_##symbol);
    console.log(pname);
  });
};

Module.gplatformLanguage = function() {
  var lang;
  if (navigator && navigator.userAgent && (lang = navigator.userAgent.match(/android.*\W(\w\w)-(\w\w)\W/i))) {
    lang = lang[1];
  }
  if (!lang && navigator) {
    if (navigator.language) {
      lang = navigator.language;
    } else if (navigator.browserLanguage) {
      lang = navigator.browserLanguage;
    } else if (navigator.systemLanguage) {
      lang = navigator.systemLanguage;
    } else if (navigator.userLanguage) {
      lang = navigator.userLanguage;
    }
    lang = lang.substr(0, 2);
  }
  return lang;
};

Module.gnetplayerSend = function(data) {
  if ((GiderosNetplayerWS != null) && (GiderosNetplayerWS.readyState == 1)) GiderosNetplayerWS.send(data);
};

var gid_wget = {
  wgetRequests: {},
  nextWgetRequestHandle: 0,
  getNextWgetRequestHandle: function() {
    var handle = gid_wget.nextWgetRequestHandle;
    gid_wget.nextWgetRequestHandle++;
    return handle;
  }
};

Module.ghttpjs_urlload = function(url, request, rhdr, param, arg, free, onload, onerror, onprogress) {
  var _url = url;
  var _request = request;
  var _param = param;
  var http = new XMLHttpRequest;
  http.open(_request, _url, true);
  http.responseType = "arraybuffer";
  while (rhdr) {
    var rk = Module.getValue(rhdr, "*");
    if (!rk) break;
    rhdr += 4;
    //Assuming 32bit
    var rv = Module.getValue(rhdr, "*");
    rhdr += 4;
    //Assuming 32bit
    http.setRequestHeader(Module.UTF8ToString(rk), Module.UTF8ToString(rv));
  }
  var handle = gid_wget.getNextWgetRequestHandle();
  // LOAD
  http.onload = function http_onload(e) {
    // if (http.status == 200 || _url.substr(0,4).toLowerCase() != "http") {
    // console.log("rhdr:"+http.getAllResponseHeaders());
    var hdrs = allocate(intArrayFromString(http.getAllResponseHeaders()), ALLOC_STACK);
    var byteArray = new Uint8Array(http.response);
    var buffer = _malloc(byteArray.length);
    HEAPU8.set(byteArray, buffer);
    if (onload) dynCall("viiiiiii", onload, [ handle, arg, buffer, byteArray.length, http.status, hdrs, 0 ]);
    if (free) _free(buffer);
    /*
		 * } else { console.log(url+" ERROR"); if (onerror)
		 * dynCall('viiii', onerror, [handle, arg, http.status,
		 * http.statusText]); }
		 */ delete gid_wget.wgetRequests[handle];
  };
  // ERROR
  http.onerror = function http_onerror(e) {
    if (onerror) {
      dynCall("viiii", onerror, [ handle, arg, http.status, http.statusText ]);
    }
    delete gid_wget.wgetRequests[handle];
  };
  // PROGRESS
  http.onprogress = function http_onprogress(e) {
    if (onprogress) dynCall("viiiiii", onprogress, [ handle, arg, e.loaded, e.lengthComputable || e.lengthComputable === undefined ? e.total : 0, 0, 0 ]);
  };
  // ABORT
  http.onabort = function http_onabort(e) {
    delete gid_wget.wgetRequests[handle];
  };
  // Useful because the browser can limit the number of redirection
  try {
    if (http.channel instanceof Ci.nsIHttpChannel) http.channel.redirectionLimit = 0;
  } catch (ex) {}
  /* whatever */ if ((_request == "POST") || (_request == "PUT")) {
    http.send(_param);
  } else {
    http.send(null);
  }
  gid_wget.wgetRequests[handle] = http;
  return handle;
};

Module.ghttpjs_urlstream = function(url, request, rhdr, param, arg, free, onload, onerror, onprogress) {
  var _url = url;
  var _request = request;
  var _param = param;
  var handle = 0;
  var gHeaders = new Headers;
  gHeaders.append("Content-Type", "image/jpeg");
  while (rhdr) {
    var rk = Module.getValue(rhdr, "*");
    if (!rk) break;
    rhdr += 4;
    //Assuming 32bit
    var rv = Module.getValue(rhdr, "*");
    rhdr += 4;
    //Assuming 32bit
    gHeaders.append(Module.UTF8ToString(rk), Module.UTF8ToString(rv));
  }
  var gInit = {
    method: _request,
    headers: gHeaders,
    mode: "cors",
    cache: "no-cache",
    body: _param
  };
  var http = new Request(_url, gInit);
  fetch(http).then(function(res) {
    if (res) {
      var ahdr = "";
      res.headers.forEach(function(value, key) {
        ahdr = ahdr + key + ": " + value + "\r\n";
      });
      var hdrs = allocate(intArrayFromString(ahdr), ALLOC_STACK);
      if (onload) dynCall("viiiiiii", onload, [ handle, arg, 0, 0, res.status, hdrs, 1 ]);
      var reader = res.body.getReader();
      let charsReceived = 0;
      reader.read().then(function processText({done, value}) {
        // Result objects contain two properties:
        // done  - true if the stream has already given you all its data.
        // value - some data. Always undefined when done is true.
        if (done) {
          if (onload) dynCall("viiiiiii", onload, [ handle, arg, 0, 0, res.status, hdrs, 0 ]);
          return;
        }
        // value for fetch streams is a Uint8Array
        charsReceived += value.length;
        var buffer = _malloc(value.length);
        HEAPU8.set(value, buffer);
        if (onprogress) dynCall("viiiiii", onprogress, [ handle, arg, charsReceived, 0, buffer, value.length ]);
        _free(buffer);
        // Read some more, and call this function again
        return reader.read().then(processText);
      });
    } else {
      if (onerror) {
        dynCall("viiii", onerror, [ handle, arg, res.status, res.statusText ]);
      }
    }
  });
  return handle;
};

Module.checkALMuted = function() {
  var actx = _WebAudio_ALSoft;
  if ((actx == undefined) && window.AL && window.AL.currentCtx) actx = window.AL.currentCtx.audioCtx;
  if (actx && (!Module.GidAudioUnlocked)) {
    actx.resume();
    Module.GidAudioUnlocked = true;
  }
};

Module.GiderosJSEvent = function(type, context, value, data) {
  var etype = "number";
  var len = data.length;
  var dataPtr;
  if (typeof data == "string") {
    etype = "string";
    len = -1;
  } else {
    if (len == undefined) len = data.byteLength;
    var dataPtr = Module._malloc(len);
    var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, len);
    dataHeap.set(data);
    data = dataPtr;
  }
  Module.ccall("JSNative_enqueueEvent", "number", [ "string", "number", "number", etype, "number" ], [ type, context, value, data, len ]);
  if (etype == "number") Module._free(dataPtr);
};

Module.GiderosPlayer_Play = function(project) {
  Module.ccall("JSPlayer_play", "number", [ "string" ], [ project ]);
};

Module.GiderosPlayer_Stop = function() {
  Module.ccall("JSPlayer_stop", "number", [], []);
};

Module.GiderosPlayer_WriteFile = function(project, path, data) {
  var etype = "number";
  var len = data.length;
  if (typeof data == "string") etype = "string"; else {
    var dataPtr = Module._malloc(len);
    var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, len);
    dataHeap.set(data);
    data = dataPtr;
  }
  Module.ccall("JSPlayer_writeFile", "number", [ "string", "string", etype, "number" ], [ project, path, data, len ]);
  if (etype == "number") Module._free(dataPtr);
};

Module.JSCallJS = function(mtd, ja) {
  return JSON.stringify(eval(mtd).apply(null, JSON.parse(ja)));
};

// end include: W:\Git\gideros\emscripten\gidjs.js
// include: W:\Git\gideros\emscripten\gui.js
Module.gui_displayDialog = function(gid, title, message, text, cancelButton, Button1, Button2, isSecure, callback) {
  var container = document.createElement("div");
  container.setAttribute("id", "giddialog_" + gid);
  container.className = "gid_dialog_container";
  /*    document.getElementById("canvas").onmouseup = function(event){event.preventDefault()};
    document.getElementById("canvas").onmousedown = function(event){event.preventDefault()};
    document.getElementById("canvas").onclick = function(event){event.preventDefault()};
 */ var overlay = document.createElement("div");
  overlay.className = "gid_dialog_overlay";
  container.appendChild(overlay);
  var dialog_wrapper = document.createElement("div");
  dialog_wrapper.className = "gid_dialog_wrapper";
  container.appendChild(dialog_wrapper);
  var dialog = document.createElement("div");
  dialog.className = "gid_dialog";
  dialog_wrapper.appendChild(dialog);
  var titleEl = document.createElement("h1");
  titleEl.className = "gid_dialog_title";
  titleEl.innerHTML = title || "";
  dialog.appendChild(titleEl);
  var messageEl = document.createElement("p");
  messageEl.className = "gid_dialog_message";
  messageEl.innerHTML = message || "";
  dialog.appendChild(messageEl);
  if (text != null) {
    var input = document.createElement("input");
    input.className = "gid_dialog_input";
    input.value = text || "";
    if (isSecure) input.setAttribute("type", "password"); else input.setAttribute("type", "text");
    dialog.appendChild(input);
  }
  var buttons = document.createElement("div");
  buttons.className = "gid_dialog_buttons";
  dialog.appendChild(buttons);
  var button_handler = function() {
    if (callback) {
      callback(gid, parseInt(this.getAttribute("id").replace("index_", "")), this.value, (input) ? input.value : null);
    }
    Module.gui_hideDialog(gid);
  };
  //Redundant normally
  var cancel = document.createElement("input");
  cancel.className = "gid_dialog_button gid_dialog_btn_cancel";
  cancel.setAttribute("id", "index_0");
  cancel.setAttribute("type", "button");
  cancel.value = cancelButton || "Cancel";
  cancel.onclick = button_handler;
  buttons.appendChild(cancel);
  if (Button1) {
    var button1 = document.createElement("input");
    button1.className = "gid_dialog_button gid_dialog_btn_1";
    button1.setAttribute("id", "index_1");
    button1.setAttribute("type", "button");
    button1.value = Button1 || "";
    button1.onclick = button_handler;
    buttons.appendChild(button1);
  }
  if (Button2) {
    var button2 = document.createElement("input");
    button2.className = "gid_dialog_button gid_dialog_btn_2";
    button2.setAttribute("id", "index_2");
    button2.setAttribute("type", "button");
    button2.value = Button2 || "";
    button2.onclick = button_handler;
    buttons.appendChild(button2);
  }
  document.body.appendChild(container);
};

Module.gui_hideDialog = function(gid) {
  if (document.getElementById("giddialog_" + gid)) {
    document.body.removeChild(document.getElementById("giddialog_" + gid));
  }
};

// end include: W:\Git\gideros\emscripten\gui.js
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = Object.assign({}, Module);

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = (status, toThrow) => {
  throw toThrow;
};

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = "";

function locateFile(path) {
  if (Module["locateFile"]) {
    return Module["locateFile"](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require("fs");
  var nodePath = require("path");
  scriptDirectory = __dirname + "/";
  // include: node_shell_read.js
  readBinary = filename => {
    // We need to re-wrap `file://` strings to URLs. Normalizing isn't
    // necessary in that case, the path should already be absolute.
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
    var ret = fs.readFileSync(filename);
    return ret;
  };
  readAsync = (filename, binary = true) => {
    // See the comment in the `readBinary` function.
    filename = isFileURI(filename) ? new URL(filename) : nodePath.normalize(filename);
    return new Promise((resolve, reject) => {
      fs.readFile(filename, binary ? undefined : "utf8", (err, data) => {
        if (err) reject(err); else resolve(binary ? data.buffer : data);
      });
    });
  };
  // end include: node_shell_read.js
  if (!Module["thisProgram"] && process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, "/");
  }
  arguments_ = process.argv.slice(2);
  if (typeof module != "undefined") {
    module["exports"] = Module;
  }
  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };
} else // Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) {
    // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (typeof document != "undefined" && document.currentScript) {
    // web
    scriptDirectory = document.currentScript.src;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  // If scriptDirectory contains a query (starting with ?) or a fragment (starting with #),
  // they are removed because they could contain a slash.
  if (scriptDirectory.startsWith("blob:")) {
    scriptDirectory = "";
  } else {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
  }
  {
    // include: web_or_worker_shell_read.js
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = url => {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
      };
    }
    readAsync = url => {
      // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
      // See https://github.com/github/fetch/pull/92#issuecomment-140665932
      // Cordova or Electron apps are typically loaded from a file:// url.
      // So use XHR on webview if URL is a file URL.
      if (isFileURI(url)) {
        return new Promise((resolve, reject) => {
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
              // file URLs can return 0
              resolve(xhr.response);
              return;
            }
            reject(xhr.status);
          };
          xhr.onerror = reject;
          xhr.send(null);
        });
      }
      return fetch(url, {
        credentials: "same-origin"
      }).then(response => {
        if (response.ok) {
          return response.arrayBuffer();
        }
        return Promise.reject(new Error(response.status + " : " + response.url));
      });
    };
  }
} else // end include: web_or_worker_shell_read.js
{}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.error.bind(console);

// Merge back in the overrides
Object.assign(Module, moduleOverrides);

// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message
// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===
// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
var dynamicLibraries = Module["dynamicLibraries"] || [];

var wasmBinary = Module["wasmBinary"];

// include: base64Utils.js
// Converts a string of base64 into a byte array (Uint8Array).
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE != "undefined" && ENVIRONMENT_IS_NODE) {
    var buf = Buffer.from(s, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  var decoded = atob(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0; i < decoded.length; ++i) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

// end include: base64Utils.js
// Wasm globals
var wasmMemory;

//========================================
// Runtime essentials
//========================================
// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */ function assert(condition, text) {
  if (!condition) {
    // This build was created without ASSERTIONS defined.  `assert()` should not
    // ever be called in this configuration but in case there are callers in
    // the wild leave this simple abort() implementation here for now.
    abort(text);
  }
}

// Memory management
var /** @type {!Int8Array} */ HEAP8, /** @type {!Uint8Array} */ HEAPU8, /** @type {!Int16Array} */ HEAP16, /** @type {!Uint16Array} */ HEAPU16, /** @type {!Int32Array} */ HEAP32, /** @type {!Uint32Array} */ HEAPU32, /** @type {!Float32Array} */ HEAPF32, /** @type {!Float64Array} */ HEAPF64;

// include: runtime_shared.js
function updateMemoryViews() {
  var b = wasmMemory.buffer;
  Module["HEAP8"] = HEAP8 = new Int8Array(b);
  Module["HEAP16"] = HEAP16 = new Int16Array(b);
  Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
  Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
  Module["HEAP32"] = HEAP32 = new Int32Array(b);
  Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
  Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
  Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
}

// end include: runtime_shared.js
// In non-standalone/normal mode, we create the memory here.
// include: runtime_init_memory.js
// Create the wasm memory. (Note: this only applies if IMPORTED_MEMORY is defined)
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
if (Module["wasmMemory"]) {
  wasmMemory = Module["wasmMemory"];
} else {
  var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 268435456;
  wasmMemory = new WebAssembly.Memory({
    "initial": INITIAL_MEMORY / 65536,
    // In theory we should not need to emit the maximum if we want "unlimited"
    // or 4GB of memory, but VMs error on that atm, see
    // https://github.com/emscripten-core/emscripten/issues/14130
    // And in the pthreads case we definitely need to emit a maximum. So
    // always emit one.
    "maximum": 32768
  });
}

updateMemoryViews();

// end include: runtime_init_memory.js
// include: runtime_stack_check.js
// end include: runtime_stack_check.js
var __ATPRERUN__ = [];

// functions called before the runtime is initialized
var __ATINIT__ = [];

// functions called during startup
var __ATMAIN__ = [];

// functions called during shutdown
var __ATPOSTRUN__ = [];

// functions called after the main() is called
var __RELOC_FUNCS__ = [];

var runtimeInitialized = false;

function preRun() {
  if (Module["preRun"]) {
    if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
    while (Module["preRun"].length) {
      addOnPreRun(Module["preRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;
  callRuntimeCallbacks(__RELOC_FUNCS__);
  if (!Module["noFSInit"] && !FS.initialized) FS.init();
  FS.ignorePermissions = false;
  TTY.init();
  SOCKFS.root = FS.mount(SOCKFS, {}, null);
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function postRun() {
  if (Module["postRun"]) {
    if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
    while (Module["postRun"].length) {
      addOnPostRun(Module["postRun"].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

// include: runtime_math.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc
// end include: runtime_math.js
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

// overridden to take different actions when all run dependencies are fulfilled
function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  Module["monitorRunDependencies"]?.(runDependencies);
}

function removeRunDependency(id) {
  runDependencies--;
  Module["monitorRunDependencies"]?.(runDependencies);
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback();
    }
  }
}

/** @param {string|number=} what */ function abort(what) {
  Module["onAbort"]?.(what);
  what = "Aborted(" + what + ")";
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);
  ABORT = true;
  what += ". Build with -sASSERTIONS for more info.";
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  // See above, in the meantime, we resort to wasm code for trapping.
  // In case abort() is called before the module is initialized, wasmExports
  // and its exported '__trap' function is not available, in which case we throw
  // a RuntimeError.
  // We trap instead of throwing RuntimeError to prevent infinite-looping in
  // Wasm EH code (because RuntimeError is considered as a foreign exception and
  // caught by 'catch_all'), but in case throwing RuntimeError is fine because
  // the module has not even been instantiated, even less running.
  if (runtimeInitialized) {
    ___trap();
  }
  /** @suppress {checkTypes} */ var e = new WebAssembly.RuntimeError(what);
  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// include: URIUtils.js
// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = "data:application/octet-stream;base64,";

/**
 * Indicates whether filename is a base64 data URI.
 * @noinline
 */ var isDataURI = filename => filename.startsWith(dataURIPrefix);

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */ var isFileURI = filename => filename.startsWith("file://");

// end include: URIUtils.js
// include: runtime_exceptions.js
// end include: runtime_exceptions.js
function findWasmBinary() {
  var f = "gideros-wasm.wasm";
  if (!isDataURI(f)) {
    return locateFile(f);
  }
  return f;
}

var wasmBinaryFile;

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  throw "both async and sync fetching of the wasm failed";
}

function getBinaryPromise(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    return readAsync(binaryFile).then(response => new Uint8Array(/** @type{!ArrayBuffer} */ (response)), // Fall back to getBinarySync if readAsync fails
    () => getBinarySync(binaryFile));
  }
  // Otherwise, getBinarySync should be able to get it synchronously
  return Promise.resolve().then(() => getBinarySync(binaryFile));
}

function instantiateArrayBuffer(binaryFile, imports, receiver) {
  return getBinaryPromise(binaryFile).then(binary => WebAssembly.instantiate(binary, imports)).then(receiver, reason => {
    err(`failed to asynchronously prepare wasm: ${reason}`);
    abort(reason);
  });
}

function instantiateAsync(binary, binaryFile, imports, callback) {
  if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
  !isFileURI(binaryFile) && // Avoid instantiateStreaming() on Node.js environment for now, as while
  // Node.js v18.1.0 implements it, it does not have a full fetch()
  // implementation yet.
  // Reference:
  //   https://github.com/emscripten-core/emscripten/pull/16917
  !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
    return fetch(binaryFile, {
      credentials: "same-origin"
    }).then(response => {
      // Suppress closure warning here since the upstream definition for
      // instantiateStreaming only allows Promise<Repsponse> rather than
      // an actual Response.
      // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure is fixed.
      /** @suppress {checkTypes} */ var result = WebAssembly.instantiateStreaming(response, imports);
      return result.then(callback, function(reason) {
        // We expect the most common failure cause to be a bad MIME type for the binary,
        // in which case falling back to ArrayBuffer instantiation should work.
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
        return instantiateArrayBuffer(binaryFile, imports, callback);
      });
    });
  }
  return instantiateArrayBuffer(binaryFile, imports, callback);
}

function getWasmImports() {
  // prepare imports
  return {
    "env": wasmImports,
    "wasi_snapshot_preview1": wasmImports,
    "GOT.mem": new Proxy(wasmImports, GOTHandler),
    "GOT.func": new Proxy(wasmImports, GOTHandler)
  };
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  var info = getWasmImports();
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/ function receiveInstance(instance, module) {
    wasmExports = instance.exports;
    wasmExports = relocateExports(wasmExports, 1024);
    var metadata = getDylinkMetadata(module);
    if (metadata.neededDynlibs) {
      dynamicLibraries = metadata.neededDynlibs.concat(dynamicLibraries);
    }
    mergeLibSymbols(wasmExports, "main");
    LDSO.init();
    loadDylibs();
    addOnInit(wasmExports["__wasm_call_ctors"]);
    __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
    removeRunDependency("wasm-instantiate");
    return wasmExports;
  }
  // wait for the pthread pool (if any)
  addRunDependency("wasm-instantiate");
  // Prefer streaming instantiation if available.
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    receiveInstance(result["instance"], result["module"]);
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module["instantiateWasm"]) {
    try {
      return Module["instantiateWasm"](info, receiveInstance);
    } catch (e) {
      err(`Module.instantiateWasm callback failed with error: ${e}`);
      return false;
    }
  }
  wasmBinaryFile ??= findWasmBinary();
  instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult);
  return {};
}

// Globals used by JS i64 conversions (see makeSetValue)
var tempDouble;

var tempI64;

// include: runtime_debug.js
// end include: runtime_debug.js
// === Body ===
var ASM_CONSTS = {
  380812: () => {
    if (GiderosNetplayerWS) GiderosNetplayerWS.close();
  },
  380868: () => {
    try {
      if (typeof GiderosNetplayerWSHost === "undefined") {
        GiderosNetplayerWSHost = "127.0.0.1";
      }
      if ((GiderosNetplayerWS == null) && (GiderosNetplayerWSHost != null)) {
        if (typeof MozWebSocket == "function") WebSocket = MozWebSocket;
        GiderosNetplayerWSQ = [];
        GiderosNetplayerWS = new WebSocket("ws://" + GiderosNetplayerWSHost + ":15001");
        GiderosNetplayerWS.binaryType = "arraybuffer";
        GiderosNetplayerWS.onmessage = function(evt) {
          GiderosNetplayerWSQ.push(evt.data);
        };
        GiderosNetplayerWS.onclose = function(evt) {
          GiderosNetplayerWS = null;
        };
        GiderosNetplayerWS.onerror = function(evt) {
          GiderosNetplayerWS = null;
        };
      }
    } catch (exception) {
      GiderosNetplayerWS = null;
    }
  },
  381542: () => {
    var buffer = 0;
    if (GiderosNetplayerWS != null) {
      var data = GiderosNetplayerWSQ.shift();
      if (data) {
        var byteArray = new Uint8Array(data);
        buffer = _malloc(byteArray.length);
        HEAPU8.set(byteArray, buffer);
        GiderosNetplayerWSR = byteArray.length;
      }
    }
    return buffer;
  },
  381804: () => GiderosNetplayerWSR,
  381835: ($0, $1) => {
    Module["gnetplayerSend"](Module.HEAPU8.subarray($0, $0 + $1));
  },
  381899: ($0, $1, $2, $3, $4, $5, $6) => ($6 ? Module.ghttpjs_urlstream : Module.ghttpjs_urlload)(Module.UTF8ToString($0), "GET", $1, null, $2, true, $3, $4, $5),
  382020: ($0, $1, $2, $3, $4, $5, $6, $7, $8) => ($8 ? Module.ghttpjs_urlstream : Module.ghttpjs_urlload)(Module.UTF8ToString($0), "POST", $1, Module.HEAPU8.subarray($6, $6 + $7), $2, true, $3, $4, $5),
  382170: ($0, $1, $2, $3, $4, $5, $6) => ($6 ? Module.ghttpjs_urlstream : Module.ghttpjs_urlload)(Module.UTF8ToString($0), "DELETE", $1, null, $2, true, $3, $4, $5),
  382294: ($0, $1, $2, $3, $4, $5, $6, $7, $8) => ($8 ? Module.ghttpjs_urlstream : Module.ghttpjs_urlload)(Module.UTF8ToString($0), "PUT", $1, Module.HEAPU8.subarray($6, $6 + $7), $2, true, $3, $4, $5),
  382443: ($0, $1, $2, $3, $4, $5, $6, $7) => {
    var cb = $7;
    Module.gui_displayDialog($0, UTF8ToString($1), UTF8ToString($2), null, UTF8ToString($3), $4 ? UTF8ToString($4) : null, $5 ? UTF8ToString($5) : null, $6, function(gid, bi, bt, t) {
      var btj = allocate(intArrayFromString(bt), ALLOC_STACK);
      dynCall("viii", cb, [ gid, bi, btj ]);
    });
  },
  382720: ($0, $1, $2, $3, $4, $5, $6, $7, $8) => {
    var cb = $7;
    Module.gui_displayDialog($0, UTF8ToString($1), UTF8ToString($2), UTF8ToString($8), UTF8ToString($3), $4 ? UTF8ToString($4) : null, $5 ? UTF8ToString($5) : null, $6, function(gid, bi, bt, t) {
      var btj = allocate(intArrayFromString(bt), ALLOC_STACK);
      var tj = allocate(intArrayFromString(t), ALLOC_STACK);
      dynCall("viiii", cb, [ gid, bi, btj, tj ]);
    });
  },
  383066: $0 => {
    Module.gui_hideDialog($0);
  },
  383097: () => {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    _WebAudio_ALSoft = new AudioContext;
    return _WebAudio_ALSoft.sampleRate;
  },
  383245: () => {
    if (_WebAudio_ALSoft) _WebAudio_ALSoft.resume();
  },
  383298: () => {
    if (_WebAudio_ALSoft) _WebAudio_ALSoft.suspend();
  },
  383352: () => _WebAudio_ALSoft.currentTime,
  383393: ($0, $1, $2, $3) => {
    var audioBuf = _WebAudio_ALSoft.createBuffer(2, $1, $2);
    var channel0 = audioBuf.getChannelData(0);
    var channel1 = audioBuf.getChannelData(1);
    var pData = $0;
    pData >>= 2;
    for (var i = 0; i < $1; ++i) {
      channel0[i] = HEAPF32[pData++];
      channel1[i] = HEAPF32[pData++];
    }
    var audioSrc = _WebAudio_ALSoft.createBufferSource();
    audioSrc.buffer = audioBuf;
    audioSrc.connect(_WebAudio_ALSoft.destination);
    audioSrc.start($3);
  },
  383814: () => {
    if (_WebAudio_ALSoft) _WebAudio_ALSoft.close();
    _WebAudio_ALSoft = undefined;
  },
  383894: $0 => Module.requestFile(UTF8ToString($0)),
  383943: () => FS.documentsOk,
  383968: $0 => {
    Module.luaError(UTF8ToString($0));
  },
  384006: $0 => {
    Module.luaError(UTF8ToString($0));
  },
  384044: () => {
    Module.setStatus("Running");
  },
  384072: $0 => {
    Module.luaPrint(UTF8ToString($0));
  },
  384110: $0 => {
    Module.luaPrint(UTF8ToString($0));
  },
  384148: $0 => stringToNewUTF8(String(eval(UTF8ToString($0)))),
  384208: () => window.innerWidth,
  384236: () => window.innerHeight,
  384265: () => {
    Module.checkALMuted();
  },
  384288: () => {
    Module.showGLContextLost(1);
  },
  384321: () => {
    Module.showGLContextLost(0);
  },
  384354: () => {
    Module.setStatus("Initializing");
  },
  384387: () => stringToNewUTF8(location.href),
  384430: () => {
    Module.registerPlugins();
  },
  384455: () => window.innerWidth,
  384485: () => window.innerHeight,
  384516: () => Module.hasGApp,
  384543: () => {
    if (!FS.gidSyncing) {
      FS.gidSyncing = true;
      FS.syncfs(function(err) {
        FS.gidSyncing = false;
      });
    }
  },
  384643: ($0, $1) => stringToNewUTF8(Module.JSCallJS(UTF8ToString($0), UTF8ToString($1)) || "null"),
  384731: ($0, $1) => {
    Module.showError(UTF8ToString($0), UTF8ToString($1));
  },
  384787: ($0, $1) => {
    Module.showError(UTF8ToString($0), UTF8ToString($1));
  },
  384843: () => stringToNewUTF8(navigator.userAgent),
  384892: ($0, $1) => {
    if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
      window.navigator.clipboard.writeText(UTF8ToString($1)).then(function() {
        Module._gapplication_clipboardCallback($0, 1, 0, 0);
      }).catch(function() {
        Module._gapplication_clipboardCallback($0, -1, 0, 0);
      });
    } else Module._gapplication_clipboardCallback($0, -1, "", "");
  },
  385232: $0 => {
    if (window.navigator.clipboard && window.navigator.clipboard.readText) {
      window.navigator.clipboard.readText().then(function(clipText) {
        var cClip = stringToNewUTF8(clipText);
        var cMime = stringToNewUTF8("text/plain");
        Module._gapplication_clipboardCallback($0, 1, cClip, cMime);
        _free(cClip);
        _free(cMime);
      }).catch(err => Module._gapplication_clipboardCallback($0, -1, 0, 0));
    } else Module._gapplication_clipboardCallback($0, -1, 0, 0);
  },
  385669: $0 => {
    window.navigator.vibrate($0);
  },
  385703: () => stringToNewUTF8(Module.gplatformLanguage()),
  385759: $0 => {
    window.open(UTF8ToString($0));
  },
  385794: $0 => {
    document.getElementById("canvas").style.cursor = UTF8ToString($0);
  }
};

// end include: preamble.js
var ALLOC_STACK = 1;

class ExitStatus {
  name="ExitStatus";
  constructor(status) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}

var GOT = {};

var currentModuleWeakSymbols = new Set([]);

var GOTHandler = {
  get(obj, symName) {
    var rtn = GOT[symName];
    if (!rtn) {
      rtn = GOT[symName] = new WebAssembly.Global({
        "value": "i32",
        "mutable": true
      });
    }
    if (!currentModuleWeakSymbols.has(symName)) {
      // Any non-weak reference to a symbol marks it as `required`, which
      // enabled `reportUndefinedSymbols` to report undefeind symbol errors
      // correctly.
      rtn.required = true;
    }
    return rtn;
  }
};

var stackAlloc = sz => __emscripten_stack_alloc(sz);

var allocate = (slab, allocator) => {
  var ret;
  if (allocator == ALLOC_STACK) {
    ret = stackAlloc(slab.length);
  } else {
    ret = _malloc(slab.length);
  }
  if (!slab.subarray && !slab.slice) {
    slab = new Uint8Array(slab);
  }
  HEAPU8.set(slab, ret);
  return ret;
};

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module);
  }
};

var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder : undefined;

/**
     * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
     * array that contains uint8 values, returns a copy of that string as a
     * Javascript String object.
     * heapOrArray is either a regular array, or a JavaScript typed array view.
     * @param {number=} idx
     * @param {number=} maxBytesToRead
     * @return {string}
     */ var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.  Also, use the length info to avoid running tiny
  // strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation,
  // so that undefined/NaN means Infinity)
  while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = "";
  // If building with TextDecoder, we have already computed the string length
  // above, so test loop end condition against that
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};

var getDylinkMetadata = binary => {
  var offset = 0;
  var end = 0;
  function getU8() {
    return binary[offset++];
  }
  function getLEB() {
    var ret = 0;
    var mul = 1;
    while (1) {
      var byte = binary[offset++];
      ret += ((byte & 127) * mul);
      mul *= 128;
      if (!(byte & 128)) break;
    }
    return ret;
  }
  function getString() {
    var len = getLEB();
    offset += len;
    return UTF8ArrayToString(binary, offset - len, len);
  }
  /** @param {string=} message */ function failIf(condition, message) {
    if (condition) throw new Error(message);
  }
  var name = "dylink.0";
  if (binary instanceof WebAssembly.Module) {
    var dylinkSection = WebAssembly.Module.customSections(binary, name);
    if (dylinkSection.length === 0) {
      name = "dylink";
      dylinkSection = WebAssembly.Module.customSections(binary, name);
    }
    failIf(dylinkSection.length === 0, "need dylink section");
    binary = new Uint8Array(dylinkSection[0]);
    end = binary.length;
  } else {
    var int32View = new Uint32Array(new Uint8Array(binary.subarray(0, 24)).buffer);
    var magicNumberFound = int32View[0] == 1836278016;
    failIf(!magicNumberFound, "need to see wasm magic number");
    // \0asm
    // we should see the dylink custom section right after the magic number and wasm version
    failIf(binary[8] !== 0, "need the dylink section to be first");
    offset = 9;
    var section_size = getLEB();
    //section size
    end = offset + section_size;
    name = getString();
  }
  var customSection = {
    neededDynlibs: [],
    tlsExports: new Set,
    weakImports: new Set
  };
  if (name == "dylink") {
    customSection.memorySize = getLEB();
    customSection.memoryAlign = getLEB();
    customSection.tableSize = getLEB();
    customSection.tableAlign = getLEB();
    // shared libraries this module needs. We need to load them first, so that
    // current module could resolve its imports. (see tools/shared.py
    // WebAssembly.make_shared_library() for "dylink" section extension format)
    var neededDynlibsCount = getLEB();
    for (var i = 0; i < neededDynlibsCount; ++i) {
      var libname = getString();
      customSection.neededDynlibs.push(libname);
    }
  } else {
    failIf(name !== "dylink.0");
    var WASM_DYLINK_MEM_INFO = 1;
    var WASM_DYLINK_NEEDED = 2;
    var WASM_DYLINK_EXPORT_INFO = 3;
    var WASM_DYLINK_IMPORT_INFO = 4;
    var WASM_SYMBOL_TLS = 256;
    var WASM_SYMBOL_BINDING_MASK = 3;
    var WASM_SYMBOL_BINDING_WEAK = 1;
    while (offset < end) {
      var subsectionType = getU8();
      var subsectionSize = getLEB();
      if (subsectionType === WASM_DYLINK_MEM_INFO) {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
      } else if (subsectionType === WASM_DYLINK_NEEDED) {
        var neededDynlibsCount = getLEB();
        for (var i = 0; i < neededDynlibsCount; ++i) {
          libname = getString();
          customSection.neededDynlibs.push(libname);
        }
      } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var symname = getString();
          var flags = getLEB();
          if (flags & WASM_SYMBOL_TLS) {
            customSection.tlsExports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
        var count = getLEB();
        while (count--) {
          var modname = getString();
          var symname = getString();
          var flags = getLEB();
          if ((flags & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
            customSection.weakImports.add(symname);
          }
        }
      } else {
        // unknown subsection
        offset += subsectionSize;
      }
    }
  }
  return customSection;
};

/**
     * @param {number} ptr
     * @param {string} type
     */ function getValue(ptr, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    return HEAP8[ptr];

   case "i8":
    return HEAP8[ptr];

   case "i16":
    return HEAP16[((ptr) >> 1)];

   case "i32":
    return HEAP32[((ptr) >> 2)];

   case "i64":
    abort("to do getValue(i64) use WASM_BIGINT");

   case "float":
    return HEAPF32[((ptr) >> 2)];

   case "double":
    return HEAPF64[((ptr) >> 3)];

   case "*":
    return HEAPU32[((ptr) >> 2)];

   default:
    abort(`invalid type for getValue: ${type}`);
  }
}

var newDSO = (name, handle, syms) => {
  var dso = {
    refcount: Infinity,
    name,
    exports: syms,
    global: true
  };
  LDSO.loadedLibsByName[name] = dso;
  if (handle != undefined) {
    LDSO.loadedLibsByHandle[handle] = dso;
  }
  return dso;
};

var LDSO = {
  loadedLibsByName: {},
  loadedLibsByHandle: {},
  init() {
    newDSO("__main__", 0, wasmImports);
  }
};

var ___heap_base = 9420848;

var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;

var getMemory = size => {
  // After the runtime is initialized, we must only use sbrk() normally.
  if (runtimeInitialized) {
    // Currently we don't support freeing of static data when modules are
    // unloaded via dlclose.  This function is tagged as `noleakcheck` to
    // avoid having this reported as leak.
    return _calloc(size, 1);
  }
  var ret = ___heap_base;
  // Keep __heap_base stack aligned.
  var end = ret + alignMemory(size, 16);
  ___heap_base = end;
  GOT["__heap_base"].value = end;
  return ret;
};

var isInternalSym = symName => [ "__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js" ].includes(symName) || symName.startsWith("__em_js__");

var uleb128Encode = (n, target) => {
  if (n < 128) {
    target.push(n);
  } else {
    target.push((n % 128) | 128, n >> 7);
  }
};

var sigToWasmTypes = sig => {
  var typeNames = {
    "i": "i32",
    "j": "i64",
    "f": "f32",
    "d": "f64",
    "e": "externref",
    "p": "i32"
  };
  var type = {
    parameters: [],
    results: sig[0] == "v" ? [] : [ typeNames[sig[0]] ]
  };
  for (var i = 1; i < sig.length; ++i) {
    type.parameters.push(typeNames[sig[i]]);
  }
  return type;
};

var generateFuncType = (sig, target) => {
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {
    "i": 127,
    // i32
    "p": 127,
    // i32
    "j": 126,
    // i64
    "f": 125,
    // f32
    "d": 124,
    // f64
    "e": 111
  };
  // Parameters, length + signatures
  target.push(96);
  /* form: func */ uleb128Encode(sigParam.length, target);
  for (var i = 0; i < sigParam.length; ++i) {
    target.push(typeCodes[sigParam[i]]);
  }
  // Return values, length + signatures
  // With no multi-return in MVP, either 0 (void) or 1 (anything else)
  if (sigRet == "v") {
    target.push(0);
  } else {
    target.push(1, typeCodes[sigRet]);
  }
};

var convertJsFunctionToWasm = (func, sig) => {
  // If the type reflection proposal is available, use the new
  // "WebAssembly.Function" constructor.
  // Otherwise, construct a minimal wasm module importing the JS function and
  // re-exporting it.
  if (typeof WebAssembly.Function == "function") {
    return new WebAssembly.Function(sigToWasmTypes(sig), func);
  }
  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  var typeSectionBody = [ 1 ];
  // count: 1
  generateFuncType(sig, typeSectionBody);
  // Rest of the module is static
  var bytes = [ 0, 97, 115, 109, // magic ("\0asm")
  1, 0, 0, 0, // version: 1
  1 ];
  // Write the overall length of the type section followed by the body
  uleb128Encode(typeSectionBody.length, bytes);
  bytes.push(...typeSectionBody);
  // The rest of the module is static
  bytes.push(2, 7, // import section
  // (import "e" "f" (func 0 (type 0)))
  1, 1, 101, 1, 102, 0, 0, 7, 5, // export section
  // (export "f" (func 0 (type 0)))
  1, 1, 102, 0, 0);
  // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(new Uint8Array(bytes));
  var instance = new WebAssembly.Instance(module, {
    "e": {
      "f": func
    }
  });
  var wrappedFunc = instance.exports["f"];
  return wrappedFunc;
};

var wasmTableMirror = [];

/** @type {WebAssembly.Table} */ var wasmTable = new WebAssembly.Table({
  "initial": 3401,
  "element": "anyfunc"
});

var getWasmTableEntry = funcPtr => {
  var func = wasmTableMirror[funcPtr];
  if (!func) {
    if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
    wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
  }
  return func;
};

var updateTableMap = (offset, count) => {
  if (functionsInTableMap) {
    for (var i = offset; i < offset + count; i++) {
      var item = getWasmTableEntry(i);
      // Ignore null values.
      if (item) {
        functionsInTableMap.set(item, i);
      }
    }
  }
};

var functionsInTableMap;

var getFunctionAddress = func => {
  // First, create the map if this is the first use.
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap;
    updateTableMap(0, wasmTable.length);
  }
  return functionsInTableMap.get(func) || 0;
};

var freeTableIndexes = [];

var getEmptyTableSlot = () => {
  // Reuse a free index if there is one, otherwise grow.
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop();
  }
  // Grow the table
  try {
    wasmTable.grow(1);
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err;
    }
    throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
  }
  return wasmTable.length - 1;
};

var setWasmTableEntry = (idx, func) => {
  wasmTable.set(idx, func);
  // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overridden to return wrapped
  // functions so we need to call it here to retrieve the potential wrapper correctly
  // instead of just storing 'func' directly into wasmTableMirror
  wasmTableMirror[idx] = wasmTable.get(idx);
};

/** @param {string=} sig */ var addFunction = (func, sig) => {
  // Check if the function is already in the table, to ensure each function
  // gets a unique index.
  var rtn = getFunctionAddress(func);
  if (rtn) {
    return rtn;
  }
  // It's not in the table, add it now.
  var ret = getEmptyTableSlot();
  // Set the new value.
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    setWasmTableEntry(ret, func);
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err;
    }
    var wrapped = convertJsFunctionToWasm(func, sig);
    setWasmTableEntry(ret, wrapped);
  }
  functionsInTableMap.set(func, ret);
  return ret;
};

var updateGOT = (exports, replace) => {
  for (var symName in exports) {
    if (isInternalSym(symName)) {
      continue;
    }
    var value = exports[symName];
    if (symName.startsWith("orig$")) {
      symName = symName.split("$")[1];
      replace = true;
    }
    GOT[symName] ||= new WebAssembly.Global({
      "value": "i32",
      "mutable": true
    });
    if (replace || GOT[symName].value == 0) {
      if (typeof value == "function") {
        GOT[symName].value = addFunction(value);
      } else if (typeof value == "number") {
        GOT[symName].value = value;
      } else {
        err(`unhandled export type for '${symName}': ${typeof value}`);
      }
    }
  }
};

/** @param {boolean=} replace */ var relocateExports = (exports, memoryBase, replace) => {
  var relocated = {};
  for (var e in exports) {
    var value = exports[e];
    if (typeof value == "object") {
      // a breaking change in the wasm spec, globals are now objects
      // https://github.com/WebAssembly/mutable-global/issues/1
      value = value.value;
    }
    if (typeof value == "number") {
      value += memoryBase;
    }
    relocated[e] = value;
  }
  updateGOT(relocated, replace);
  return relocated;
};

var isSymbolDefined = symName => {
  // Ignore 'stub' symbols that are auto-generated as part of the original
  // `wasmImports` used to instantiate the main module.
  var existing = wasmImports[symName];
  if (!existing || existing.stub) {
    return false;
  }
  return true;
};

var resolveGlobalSymbol = (symName, direct = false) => {
  var sym;
  // First look for the orig$ symbol which is the symbol without i64
  // legalization performed.
  if (direct && ("orig$" + symName in wasmImports)) {
    symName = "orig$" + symName;
  }
  if (isSymbolDefined(symName)) {
    sym = wasmImports[symName];
  }
  return {
    sym,
    name: symName
  };
};

/**
     * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
     * emscripten HEAP, returns a copy of that string as a Javascript String object.
     *
     * @param {number} ptr
     * @param {number=} maxBytesToRead - An optional length that specifies the
     *   maximum number of bytes to read. You can omit this parameter to scan the
     *   string until the first 0 byte. If maxBytesToRead is passed, and the string
     *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
     *   string will cut short at that byte index (i.e. maxBytesToRead will not
     *   produce a string of exact length [ptr, ptr+maxBytesToRead[) N.B. mixing
     *   frequent uses of UTF8ToString() with and without maxBytesToRead may throw
     *   JS JIT optimizations off, so it is worth to consider consistently using one
     * @return {string}
     */ var UTF8ToString = (ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";

/**
      * @param {string=} libName
      * @param {Object=} localScope
      * @param {number=} handle
      */ var loadWebAssemblyModule = (binary, flags, libName, localScope, handle) => {
  var metadata = getDylinkMetadata(binary);
  currentModuleWeakSymbols = metadata.weakImports;
  // loadModule loads the wasm module after all its dependencies have been loaded.
  // can be called both sync/async.
  function loadModule() {
    // The first thread to load a given module needs to allocate the static
    // table and memory regions.  Later threads re-use the same table region
    // and can ignore the memory region (since memory is shared between
    // threads already).
    // If `handle` is specified than it is assumed that the calling thread has
    // exclusive access to it for the duration of this function.  See the
    // locking in `dynlink.c`.
    var firstLoad = !handle || !HEAP8[(handle) + (8)];
    if (firstLoad) {
      // alignments are powers of 2
      var memAlign = Math.pow(2, metadata.memoryAlign);
      // prepare memory
      var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
      // TODO: add to cleanups
      var tableBase = metadata.tableSize ? wasmTable.length : 0;
      if (handle) {
        HEAP8[(handle) + (8)] = 1;
        HEAPU32[(((handle) + (12)) >> 2)] = memoryBase;
        HEAP32[(((handle) + (16)) >> 2)] = metadata.memorySize;
        HEAPU32[(((handle) + (20)) >> 2)] = tableBase;
        HEAP32[(((handle) + (24)) >> 2)] = metadata.tableSize;
      }
    } else {
      memoryBase = HEAPU32[(((handle) + (12)) >> 2)];
      tableBase = HEAPU32[(((handle) + (20)) >> 2)];
    }
    var tableGrowthNeeded = tableBase + metadata.tableSize - wasmTable.length;
    if (tableGrowthNeeded > 0) {
      wasmTable.grow(tableGrowthNeeded);
    }
    // This is the export map that we ultimately return.  We declare it here
    // so it can be used within resolveSymbol.  We resolve symbols against
    // this local symbol map in the case there they are not present on the
    // global Module object.  We need this fallback because Modules sometime
    // need to import their own symbols
    var moduleExports;
    function resolveSymbol(sym) {
      var resolved = resolveGlobalSymbol(sym).sym;
      if (!resolved && localScope) {
        resolved = localScope[sym];
      }
      if (!resolved) {
        resolved = moduleExports[sym];
      }
      return resolved;
    }
    // TODO kill ↓↓↓ (except "symbols local to this module", it will likely be
    // not needed if we require that if A wants symbols from B it has to link
    // to B explicitly: similarly to -Wl,--no-undefined)
    // wasm dynamic libraries are pure wasm, so they cannot assist in
    // their own loading. When side module A wants to import something
    // provided by a side module B that is loaded later, we need to
    // add a layer of indirection, but worse, we can't even tell what
    // to add the indirection for, without inspecting what A's imports
    // are. To do that here, we use a JS proxy (another option would
    // be to inspect the binary directly).
    var proxyHandler = {
      get(stubs, prop) {
        // symbols that should be local to this module
        switch (prop) {
         case "__memory_base":
          return memoryBase;

         case "__table_base":
          return tableBase;
        }
        if (prop in wasmImports && !wasmImports[prop].stub) {
          // No stub needed, symbol already exists in symbol table
          return wasmImports[prop];
        }
        // Return a stub function that will resolve the symbol
        // when first called.
        if (!(prop in stubs)) {
          var resolved;
          stubs[prop] = (...args) => {
            resolved ||= resolveSymbol(prop);
            return resolved(...args);
          };
        }
        return stubs[prop];
      }
    };
    var proxy = new Proxy({}, proxyHandler);
    var info = {
      "GOT.mem": new Proxy({}, GOTHandler),
      "GOT.func": new Proxy({}, GOTHandler),
      "env": proxy,
      "wasi_snapshot_preview1": proxy
    };
    function postInstantiation(module, instance) {
      // add new entries to functionsInTableMap
      updateTableMap(tableBase, metadata.tableSize);
      moduleExports = relocateExports(instance.exports, memoryBase);
      if (!flags.allowUndefined) {
        reportUndefinedSymbols();
      }
      function addEmAsm(addr, body) {
        var args = [];
        var arity = 0;
        for (;arity < 16; arity++) {
          if (body.indexOf("$" + arity) != -1) {
            args.push("$" + arity);
          } else {
            break;
          }
        }
        args = args.join(",");
        var func = `(${args}) => { ${body} };`;
        ASM_CONSTS[start] = eval(func);
      }
      // Add any EM_ASM function that exist in the side module
      if ("__start_em_asm" in moduleExports) {
        var start = moduleExports["__start_em_asm"];
        var stop = moduleExports["__stop_em_asm"];
        while (start < stop) {
          var jsString = UTF8ToString(start);
          addEmAsm(start, jsString);
          start = HEAPU8.indexOf(0, start) + 1;
        }
      }
      function addEmJs(name, cSig, body) {
        // The signature here is a C signature (e.g. "(int foo, char* bar)").
        // See `create_em_js` in emcc.py` for the build-time version of this
        // code.
        var jsArgs = [];
        cSig = cSig.slice(1, -1);
        if (cSig != "void") {
          cSig = cSig.split(",");
          for (var i in cSig) {
            var jsArg = cSig[i].split(" ").pop();
            jsArgs.push(jsArg.replace("*", ""));
          }
        }
        var func = `(${jsArgs}) => ${body};`;
        moduleExports[name] = eval(func);
      }
      for (var name in moduleExports) {
        if (name.startsWith("__em_js__")) {
          var start = moduleExports[name];
          var jsString = UTF8ToString(start);
          // EM_JS strings are stored in the data section in the form
          // SIG<::>BODY.
          var parts = jsString.split("<::>");
          addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
          delete moduleExports[name];
        }
      }
      // initialize the module
      var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
      if (applyRelocs) {
        if (runtimeInitialized) {
          applyRelocs();
        } else {
          __RELOC_FUNCS__.push(applyRelocs);
        }
      }
      var init = moduleExports["__wasm_call_ctors"];
      if (init) {
        if (runtimeInitialized) {
          init();
        } else {
          // we aren't ready to run compiled code yet
          __ATINIT__.push(init);
        }
      }
      return moduleExports;
    }
    if (flags.loadAsync) {
      if (binary instanceof WebAssembly.Module) {
        var instance = new WebAssembly.Instance(binary, info);
        return Promise.resolve(postInstantiation(binary, instance));
      }
      return WebAssembly.instantiate(binary, info).then(result => postInstantiation(result.module, result.instance));
    }
    var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
    var instance = new WebAssembly.Instance(module, info);
    return postInstantiation(module, instance);
  }
  // now load needed libraries and the module itself.
  if (flags.loadAsync) {
    return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
  }
  metadata.neededDynlibs.forEach(needed => loadDynamicLibrary(needed, flags, localScope));
  return loadModule();
};

var mergeLibSymbols = (exports, libName) => {
  registerDynCallSymbols(exports);
  // add symbols into global namespace TODO: weak linking etc.
  for (var [sym, exp] of Object.entries(exports)) {
    // When RTLD_GLOBAL is enabled, the symbols defined by this shared object
    // will be made available for symbol resolution of subsequently loaded
    // shared objects.
    // We should copy the symbols (which include methods and variables) from
    // SIDE_MODULE to MAIN_MODULE.
    const setImport = target => {
      if (!isSymbolDefined(target)) {
        wasmImports[target] = exp;
      }
    };
    setImport(sym);
  }
};

/** @param {boolean=} noRunDep */ var asyncLoad = (url, onload, onerror, noRunDep) => {
  var dep = !noRunDep ? getUniqueRunDependency(`al ${url}`) : "";
  readAsync(url).then(arrayBuffer => {
    onload(new Uint8Array(arrayBuffer));
    if (dep) removeRunDependency(dep);
  }, err => {
    if (onerror) {
      onerror();
    } else {
      throw `Loading data file "${url}" failed.`;
    }
  });
  if (dep) addRunDependency(dep);
};

var preloadPlugins = Module["preloadPlugins"] || [];

var registerWasmPlugin = () => {
  // Use string keys here to avoid minification since the plugin consumer
  // also uses string keys.
  var wasmPlugin = {
    "promiseChainEnd": Promise.resolve(),
    "canHandle": name => !Module["noWasmDecoding"] && name.endsWith(".so"),
    "handle": (byteArray, name, onload, onerror) => {
      // loadWebAssemblyModule can not load modules out-of-order, so rather
      // than just running the promises in parallel, this makes a chain of
      // promises to run in series.
      wasmPlugin["promiseChainEnd"] = wasmPlugin["promiseChainEnd"].then(() => loadWebAssemblyModule(byteArray, {
        loadAsync: true,
        nodelete: true
      }, name, {})).then(exports => {
        preloadedWasm[name] = exports;
        onload(byteArray);
      }, error => {
        err(`failed to instantiate wasm: ${name}: ${error}`);
        onerror();
      });
    }
  };
  preloadPlugins.push(wasmPlugin);
};

var preloadedWasm = {};

var registerDynCallSymbols = exports => {
  for (var [sym, exp] of Object.entries(exports)) {
    if (sym.startsWith("dynCall_") && !Module.hasOwnProperty(sym)) {
      Module[sym] = exp;
    }
  }
};

/**
       * @param {number=} handle
       * @param {Object=} localScope
       */ function loadDynamicLibrary(libName, flags = {
  global: true,
  nodelete: true
}, localScope, handle) {
  // when loadDynamicLibrary did not have flags, libraries were loaded
  // globally & permanently
  var dso = LDSO.loadedLibsByName[libName];
  if (dso) {
    // the library is being loaded or has been loaded already.
    if (!flags.global) {
      if (localScope) {
        Object.assign(localScope, dso.exports);
      }
      registerDynCallSymbols(dso.exports);
    } else if (!dso.global) {
      // The library was previously loaded only locally but not
      // we have a request with global=true.
      dso.global = true;
      mergeLibSymbols(dso.exports, libName);
    }
    // same for "nodelete"
    if (flags.nodelete && dso.refcount !== Infinity) {
      dso.refcount = Infinity;
    }
    dso.refcount++;
    if (handle) {
      LDSO.loadedLibsByHandle[handle] = dso;
    }
    return flags.loadAsync ? Promise.resolve(true) : true;
  }
  // allocate new DSO
  dso = newDSO(libName, handle, "loading");
  dso.refcount = flags.nodelete ? Infinity : 1;
  dso.global = flags.global;
  // libName -> libData
  function loadLibData() {
    // for wasm, we can use fetch for async, but for fs mode we can only imitate it
    if (handle) {
      var data = HEAPU32[(((handle) + (28)) >> 2)];
      var dataSize = HEAPU32[(((handle) + (32)) >> 2)];
      if (data && dataSize) {
        var libData = HEAP8.slice(data, data + dataSize);
        return flags.loadAsync ? Promise.resolve(libData) : libData;
      }
    }
    var libFile = locateFile(libName);
    if (flags.loadAsync) {
      return new Promise((resolve, reject) => asyncLoad(libFile, resolve, reject));
    }
    // load the binary synchronously
    if (!readBinary) {
      throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
    }
    return readBinary(libFile);
  }
  // libName -> exports
  function getExports() {
    // lookup preloaded cache first
    var preloaded = preloadedWasm[libName];
    if (preloaded) {
      return flags.loadAsync ? Promise.resolve(preloaded) : preloaded;
    }
    // module not preloaded - load lib data and create new module from it
    if (flags.loadAsync) {
      return loadLibData().then(libData => loadWebAssemblyModule(libData, flags, libName, localScope, handle));
    }
    return loadWebAssemblyModule(loadLibData(), flags, libName, localScope, handle);
  }
  // module for lib is loaded - update the dso & global namespace
  function moduleLoaded(exports) {
    if (dso.global) {
      mergeLibSymbols(exports, libName);
    } else if (localScope) {
      Object.assign(localScope, exports);
      registerDynCallSymbols(exports);
    }
    dso.exports = exports;
  }
  if (flags.loadAsync) {
    return getExports().then(exports => {
      moduleLoaded(exports);
      return true;
    });
  }
  moduleLoaded(getExports());
  return true;
}

var reportUndefinedSymbols = () => {
  for (var [symName, entry] of Object.entries(GOT)) {
    if (entry.value == 0) {
      var value = resolveGlobalSymbol(symName, true).sym;
      if (!value && !entry.required) {
        // Ignore undefined symbols that are imported as weak.
        continue;
      }
      if (typeof value == "function") {
        /** @suppress {checkTypes} */ entry.value = addFunction(value, value.sig);
      } else if (typeof value == "number") {
        entry.value = value;
      } else {
        throw new Error(`bad export type for '${symName}': ${typeof value}`);
      }
    }
  }
};

var loadDylibs = () => {
  if (!dynamicLibraries.length) {
    reportUndefinedSymbols();
    return;
  }
  // Load binaries asynchronously
  addRunDependency("loadDylibs");
  dynamicLibraries.reduce((chain, lib) => chain.then(() => loadDynamicLibrary(lib, {
    loadAsync: true,
    global: true,
    nodelete: true,
    allowUndefined: true
  })), Promise.resolve()).then(() => {
    // we got them all, wonderful
    reportUndefinedSymbols();
    removeRunDependency("loadDylibs");
  });
};

var noExitRuntime = Module["noExitRuntime"] || true;

/**
     * @param {number} ptr
     * @param {number} value
     * @param {string} type
     */ function setValue(ptr, value, type = "i8") {
  if (type.endsWith("*")) type = "*";
  switch (type) {
   case "i1":
    HEAP8[ptr] = value;
    break;

   case "i8":
    HEAP8[ptr] = value;
    break;

   case "i16":
    HEAP16[((ptr) >> 1)] = value;
    break;

   case "i32":
    HEAP32[((ptr) >> 2)] = value;
    break;

   case "i64":
    abort("to do setValue(i64) use WASM_BIGINT");

   case "float":
    HEAPF32[((ptr) >> 2)] = value;
    break;

   case "double":
    HEAPF64[((ptr) >> 3)] = value;
    break;

   case "*":
    HEAPU32[((ptr) >> 2)] = value;
    break;

   default:
    abort(`invalid type for setValue: ${type}`);
  }
}

var ___assert_fail = (condition, filename, line, func) => {
  abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
};

Module["___assert_fail"] = ___assert_fail;

___assert_fail.sig = "vppip";

var ___c_longjmp = new WebAssembly.Tag({
  "parameters": [ "i32" ]
});

var ___call_sighandler = (fp, sig) => getWasmTableEntry(fp)(sig);

___call_sighandler.sig = "vpi";

var ___cpp_exception = new WebAssembly.Tag({
  "parameters": [ "i32" ]
});

var ___memory_base = new WebAssembly.Global({
  "value": "i32",
  "mutable": false
}, 1024);

Module["___memory_base"] = ___memory_base;

var ___stack_pointer = new WebAssembly.Global({
  "value": "i32",
  "mutable": true
}, 9420848);

Module["___stack_pointer"] = ___stack_pointer;

var PATH = {
  isAbs: path => path.charAt(0) === "/",
  splitPath: filename => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  },
  normalizeArray: (parts, allowAboveRoot) => {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (;up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  },
  normalize: path => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
    // Normalize the path
    path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  },
  dirname: path => {
    var result = PATH.splitPath(path), root = result[0], dir = result[1];
    if (!root && !dir) {
      // No dirname whatsoever
      return ".";
    }
    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1);
    }
    return root + dir;
  },
  basename: path => {
    // EMSCRIPTEN return '/'' for '/', not an empty string
    if (path === "/") return "/";
    path = PATH.normalize(path);
    path = path.replace(/\/$/, "");
    var lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1);
  },
  join: (...paths) => PATH.normalize(paths.join("/")),
  join2: (l, r) => PATH.normalize(l + "/" + r)
};

var initRandomFill = () => {
  if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
    // for modern web browsers
    return view => crypto.getRandomValues(view);
  } else if (ENVIRONMENT_IS_NODE) {
    // for nodejs with or without crypto support included
    try {
      var crypto_module = require("crypto");
      var randomFillSync = crypto_module["randomFillSync"];
      if (randomFillSync) {
        // nodejs with LTS crypto support
        return view => crypto_module["randomFillSync"](view);
      }
      // very old nodejs with the original crypto API
      var randomBytes = crypto_module["randomBytes"];
      return view => (view.set(randomBytes(view.byteLength)), // Return the original view to match modern native implementations.
      view);
    } catch (e) {}
  }
  // we couldn't find a proper implementation, as Math.random() is not suitable for /dev/random, see emscripten-core/emscripten/pull/7096
  abort("initRandomDevice");
};

var randomFill = view => (randomFill = initRandomFill())(view);

var PATH_FS = {
  resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? args[i] : FS.cwd();
      // Skip empty and invalid entries
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      // an invalid portion invalidates the whole thing
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
    return ((resolvedAbsolute ? "/" : "") + resolvedPath) || ".";
  },
  relative: (from, to) => {
    from = PATH_FS.resolve(from).substr(1);
    to = PATH_FS.resolve(to).substr(1);
    function trim(arr) {
      var start = 0;
      for (;start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (;end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  }
};

var FS_stdin_getChar_buffer = [];

var lengthBytesUTF8 = str => {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var c = str.charCodeAt(i);
    // possibly a lead surrogate
    if (c <= 127) {
      len++;
    } else if (c <= 2047) {
      len += 2;
    } else if (c >= 55296 && c <= 57343) {
      len += 4;
      ++i;
    } else {
      len += 3;
    }
  }
  return len;
};

var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
  // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
  // undefined and false each don't write out any bytes.
  if (!(maxBytesToWrite > 0)) return 0;
  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1;
  // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
    // unit, not a Unicode code point of the character! So decode
    // UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
    // and https://www.ietf.org/rfc/rfc2279.txt
    // and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i);
    // possibly a lead surrogate
    if (u >= 55296 && u <= 57343) {
      var u1 = str.charCodeAt(++i);
      u = 65536 + ((u & 1023) << 10) | (u1 & 1023);
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break;
      heap[outIdx++] = u;
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break;
      heap[outIdx++] = 192 | (u >> 6);
      heap[outIdx++] = 128 | (u & 63);
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break;
      heap[outIdx++] = 224 | (u >> 12);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      heap[outIdx++] = 240 | (u >> 18);
      heap[outIdx++] = 128 | ((u >> 12) & 63);
      heap[outIdx++] = 128 | ((u >> 6) & 63);
      heap[outIdx++] = 128 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  heap[outIdx] = 0;
  return outIdx - startIdx;
};

/** @type {function(string, boolean=, number=)} */ function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

var FS_stdin_getChar = () => {
  if (!FS_stdin_getChar_buffer.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
      // we will read data by chunks of BUFSIZE
      var BUFSIZE = 256;
      var buf = Buffer.alloc(BUFSIZE);
      var bytesRead = 0;
      // For some reason we must suppress a closure warning here, even though
      // fd definitely exists on process.stdin, and is even the proper way to
      // get the fd of stdin,
      // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
      // This started to happen after moving this logic out of library_tty.js,
      // so it is related to the surrounding code in some unclear manner.
      /** @suppress {missingProperties} */ var fd = process.stdin.fd;
      try {
        bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
      } catch (e) {
        // Cross-platform differences: on Windows, reading EOF throws an
        // exception, but on other OSes, reading EOF returns 0. Uniformize
        // behavior by treating the EOF exception to return 0.
        if (e.toString().includes("EOF")) bytesRead = 0; else throw e;
      }
      if (bytesRead > 0) {
        result = buf.slice(0, bytesRead).toString("utf-8");
      }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
      // Browser.
      result = window.prompt("Input: ");
      // returns null on cancel
      if (result !== null) {
        result += "\n";
      }
    } else {}
    if (!result) {
      return null;
    }
    FS_stdin_getChar_buffer = intArrayFromString(result, true);
  }
  return FS_stdin_getChar_buffer.shift();
};

var TTY = {
  ttys: [],
  init() {},
  // https://github.com/emscripten-core/emscripten/pull/1555
  // if (ENVIRONMENT_IS_NODE) {
  //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
  //   // device, it always assumes it's a TTY device. because of this, we're forcing
  //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
  //   // with text files until FS.init can be refactored.
  //   process.stdin.setEncoding('utf8');
  // }
  shutdown() {},
  // https://github.com/emscripten-core/emscripten/pull/1555
  // if (ENVIRONMENT_IS_NODE) {
  //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
  //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
  //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
  //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
  //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
  //   process.stdin.pause();
  // }
  register(dev, ops) {
    TTY.ttys[dev] = {
      input: [],
      output: [],
      ops
    };
    FS.registerDevice(dev, TTY.stream_ops);
  },
  stream_ops: {
    open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    },
    close(stream) {
      // flush any pending line data
      stream.tty.ops.fsync(stream.tty);
    },
    fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    },
    read(stream, buffer, offset, length, pos) {
      /* ignored */ if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === undefined && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === undefined) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now();
      }
      return bytesRead;
    },
    write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.timestamp = Date.now();
      }
      return i;
    }
  },
  default_tty_ops: {
    get_char(tty) {
      return FS_stdin_getChar();
    },
    put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    // val == 0 would cut text output off in the middle.
    fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    },
    ioctl_tcgets(tty) {
      // typical setting
      return {
        c_iflag: 25856,
        c_oflag: 5,
        c_cflag: 191,
        c_lflag: 35387,
        c_cc: [ 3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
      };
    },
    ioctl_tcsets(tty, optional_actions, data) {
      // currently just ignore
      return 0;
    },
    ioctl_tiocgwinsz(tty) {
      return [ 24, 80 ];
    }
  },
  default_tty1_ops: {
    put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    },
    fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    }
  }
};

var zeroMemory = (address, size) => {
  HEAPU8.fill(0, address, address + size);
};

var mmapAlloc = size => {
  size = alignMemory(size, 65536);
  var ptr = _emscripten_builtin_memalign(65536, size);
  if (ptr) zeroMemory(ptr, size);
  return ptr;
};

var MEMFS = {
  ops_table: null,
  mount(mount) {
    return MEMFS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
  },
  createNode(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      // no supported
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table ||= {
      dir: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          lookup: MEMFS.node_ops.lookup,
          mknod: MEMFS.node_ops.mknod,
          rename: MEMFS.node_ops.rename,
          unlink: MEMFS.node_ops.unlink,
          rmdir: MEMFS.node_ops.rmdir,
          readdir: MEMFS.node_ops.readdir,
          symlink: MEMFS.node_ops.symlink
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek
        }
      },
      file: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: {
          llseek: MEMFS.stream_ops.llseek,
          read: MEMFS.stream_ops.read,
          write: MEMFS.stream_ops.write,
          allocate: MEMFS.stream_ops.allocate,
          mmap: MEMFS.stream_ops.mmap,
          msync: MEMFS.stream_ops.msync
        }
      },
      link: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr,
          readlink: MEMFS.node_ops.readlink
        },
        stream: {}
      },
      chrdev: {
        node: {
          getattr: MEMFS.node_ops.getattr,
          setattr: MEMFS.node_ops.setattr
        },
        stream: FS.chrdev_stream_ops
      }
    };
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      // The actual number of bytes used in the typed array, as opposed to contents.length which gives the whole capacity.
      // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
      // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
      // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
      node.contents = null;
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.timestamp = Date.now();
    // add the new node to the parent
    if (parent) {
      parent.contents[name] = node;
      parent.timestamp = node.timestamp;
    }
    return node;
  },
  getFileDataAsTypedArray(node) {
    if (!node.contents) return new Uint8Array(0);
    if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
    // Make sure to not return excess unused bytes.
    return new Uint8Array(node.contents);
  },
  expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents ? node.contents.length : 0;
    if (prevCapacity >= newCapacity) return;
    // No need to expand, the storage was already large enough.
    // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
    // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
    // avoid overshooting the allocation cap by a very large margin.
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125)) >>> 0);
    if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
    // At minimum allocate 256b for each file when expanding.
    var oldContents = node.contents;
    node.contents = new Uint8Array(newCapacity);
    // Allocate new storage.
    if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
  },
  // Copy old data over to the new storage.
  resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    if (newSize == 0) {
      node.contents = null;
      // Fully decommit when requesting a resize to zero.
      node.usedBytes = 0;
    } else {
      var oldContents = node.contents;
      node.contents = new Uint8Array(newSize);
      // Allocate new storage.
      if (oldContents) {
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
      }
      // Copy old data over to the new storage.
      node.usedBytes = newSize;
    }
  },
  node_ops: {
    getattr(node) {
      var attr = {};
      // device numbers reuse inode numbers.
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
      //       but this is not required by the standard.
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    },
    setattr(node, attr) {
      if (attr.mode !== undefined) {
        node.mode = attr.mode;
      }
      if (attr.timestamp !== undefined) {
        node.timestamp = attr.timestamp;
      }
      if (attr.size !== undefined) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    },
    lookup(parent, name) {
      throw FS.genericErrors[44];
    },
    mknod(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    },
    rename(old_node, new_dir, new_name) {
      // if we're overwriting a directory at new_name, make sure it's empty.
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {}
        if (new_node) {
          for (var i in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
      }
      // do the internal rewiring
      delete old_node.parent.contents[old_node.name];
      old_node.parent.timestamp = Date.now();
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      new_dir.timestamp = old_node.parent.timestamp;
    },
    unlink(parent, name) {
      delete parent.contents[name];
      parent.timestamp = Date.now();
    },
    rmdir(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.timestamp = Date.now();
    },
    readdir(node) {
      var entries = [ ".", ".." ];
      for (var key of Object.keys(node.contents)) {
        entries.push(key);
      }
      return entries;
    },
    symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | /* 0777 */ 40960, 0);
      node.link = oldpath;
      return node;
    },
    readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    }
  },
  stream_ops: {
    read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        // non-trivial, and typed array
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
      }
      return size;
    },
    write(stream, buffer, offset, length, position, canOwn) {
      // If the buffer is located in main memory (HEAP), and if
      // memory can grow, we can't hold on to references of the
      // memory buffer, as they may get invalidated. That means we
      // need to do copy its contents.
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false;
      }
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        // This write is from a typed array to a typed array?
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          // Writing to an already allocated and used subrange of the file?
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }
      // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) {
        // Use typed array write which is available.
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer[offset + i];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    },
    llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    },
    allocate(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    },
    mmap(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      // Only make a new copy when MAP_PRIVATE is specified.
      if (!(flags & 2) && contents && contents.buffer === HEAP8.buffer) {
        // We can't emulate MAP_SHARED when the file is not backed by the
        // buffer we're mapping to (e.g. the HEAP buffer).
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        if (contents) {
          // Try to avoid unnecessary slices.
          if (position > 0 || position + length < contents.length) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length);
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length);
            }
          }
          HEAP8.set(contents, ptr);
        }
      }
      return {
        ptr,
        allocated
      };
    },
    msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      // should we check if bytesWritten and length are the same?
      return 0;
    }
  }
};

var FS_createDataFile = (parent, name, fileData, canRead, canWrite, canOwn) => {
  FS.createDataFile(parent, name, fileData, canRead, canWrite, canOwn);
};

var FS_handledByPreloadPlugin = (byteArray, fullname, finish, onerror) => {
  // Ensure plugins are ready.
  if (typeof Browser != "undefined") Browser.init();
  var handled = false;
  preloadPlugins.forEach(plugin => {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
      plugin["handle"](byteArray, fullname, finish, onerror);
      handled = true;
    }
  });
  return handled;
};

var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
  // TODO we should allow people to just pass in a complete filename instead
  // of parent and name being that we just join them anyways
  var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency(`cp ${fullname}`);
  // might have several active requests for the same fullname
  function processData(byteArray) {
    function finish(byteArray) {
      preFinish?.();
      if (!dontCreateFile) {
        FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
      }
      onload?.();
      removeRunDependency(dep);
    }
    if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
      onerror?.();
      removeRunDependency(dep);
    })) {
      return;
    }
    finish(byteArray);
  }
  addRunDependency(dep);
  if (typeof url == "string") {
    asyncLoad(url, processData, onerror);
  } else {
    processData(url);
  }
};

var FS_modeStringToFlags = str => {
  var flagModes = {
    "r": 0,
    "r+": 2,
    "w": 512 | 64 | 1,
    "w+": 512 | 64 | 2,
    "a": 1024 | 64 | 1,
    "a+": 1024 | 64 | 2
  };
  var flags = flagModes[str];
  if (typeof flags == "undefined") {
    throw new Error(`Unknown file open mode: ${str}`);
  }
  return flags;
};

var FS_getMode = (canRead, canWrite) => {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
};

var IDBFS = {
  dbs: {},
  indexedDB: () => {
    if (typeof indexedDB != "undefined") return indexedDB;
    var ret = null;
    if (typeof window == "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    return ret;
  },
  DB_VERSION: 21,
  DB_STORE_NAME: "FILE_DATA",
  queuePersist: mount => {
    function onPersistComplete() {
      if (mount.idbPersistState === "again") startPersist(); else // If a new sync request has appeared in between, kick off a new sync
      mount.idbPersistState = 0;
    }
    // Otherwise reset sync state back to idle to wait for a new sync later
    function startPersist() {
      mount.idbPersistState = "idb";
      // Mark that we are currently running a sync operation
      IDBFS.syncfs(mount, /*populate:*/ false, onPersistComplete);
    }
    if (!mount.idbPersistState) {
      // Programs typically write/copy/move multiple files in the in-memory
      // filesystem within a single app frame, so when a filesystem sync
      // command is triggered, do not start it immediately, but only after
      // the current frame is finished. This way all the modified files
      // inside the main loop tick will be batched up to the same sync.
      mount.idbPersistState = setTimeout(startPersist, 0);
    } else if (mount.idbPersistState === "idb") {
      // There is an active IndexedDB sync operation in-flight, but we now
      // have accumulated more files to sync. We should therefore queue up
      // a new sync after the current one finishes so that all writes
      // will be properly persisted.
      mount.idbPersistState = "again";
    }
  },
  mount: mount => {
    // reuse core MEMFS functionality
    var mnt = MEMFS.mount(mount);
    // If the automatic IDBFS persistence option has been selected, then automatically persist
    // all modifications to the filesystem as they occur.
    if (mount?.opts?.autoPersist) {
      mnt.idbPersistState = 0;
      // IndexedDB sync starts in idle state
      var memfs_node_ops = mnt.node_ops;
      mnt.node_ops = Object.assign({}, mnt.node_ops);
      // Clone node_ops to inject write tracking
      mnt.node_ops.mknod = (parent, name, mode, dev) => {
        var node = memfs_node_ops.mknod(parent, name, mode, dev);
        // Propagate injected node_ops to the newly created child node
        node.node_ops = mnt.node_ops;
        // Remember for each IDBFS node which IDBFS mount point they came from so we know which mount to persist on modification.
        node.idbfs_mount = mnt.mount;
        // Remember original MEMFS stream_ops for this node
        node.memfs_stream_ops = node.stream_ops;
        // Clone stream_ops to inject write tracking
        node.stream_ops = Object.assign({}, node.stream_ops);
        // Track all file writes
        node.stream_ops.write = (stream, buffer, offset, length, position, canOwn) => {
          // This file has been modified, we must persist IndexedDB when this file closes
          stream.node.isModified = true;
          return node.memfs_stream_ops.write(stream, buffer, offset, length, position, canOwn);
        };
        // Persist IndexedDB on file close
        node.stream_ops.close = stream => {
          var n = stream.node;
          if (n.isModified) {
            IDBFS.queuePersist(n.idbfs_mount);
            n.isModified = false;
          }
          if (n.memfs_stream_ops.close) return n.memfs_stream_ops.close(stream);
        };
        return node;
      };
      // Also kick off persisting the filesystem on other operations that modify the filesystem.
      mnt.node_ops.mkdir = (...args) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.mkdir(...args));
      mnt.node_ops.rmdir = (...args) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.rmdir(...args));
      mnt.node_ops.symlink = (...args) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.symlink(...args));
      mnt.node_ops.unlink = (...args) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.unlink(...args));
      mnt.node_ops.rename = (...args) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.rename(...args));
    }
    return mnt;
  },
  syncfs: (mount, populate, callback) => {
    IDBFS.getLocalSet(mount, (err, local) => {
      if (err) return callback(err);
      IDBFS.getRemoteSet(mount, (err, remote) => {
        if (err) return callback(err);
        var src = populate ? remote : local;
        var dst = populate ? local : remote;
        IDBFS.reconcile(src, dst, callback);
      });
    });
  },
  quit: () => {
    Object.values(IDBFS.dbs).forEach(value => value.close());
    IDBFS.dbs = {};
  },
  getDB: (name, callback) => {
    // check the cache first
    var db = IDBFS.dbs[name];
    if (db) {
      return callback(null, db);
    }
    var req;
    try {
      req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
    } catch (e) {
      return callback(e);
    }
    if (!req) {
      return callback("Unable to connect to IndexedDB");
    }
    req.onupgradeneeded = e => {
      var db = /** @type {IDBDatabase} */ (e.target.result);
      var transaction = e.target.transaction;
      var fileStore;
      if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
        fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
      } else {
        fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
      }
      if (!fileStore.indexNames.contains("timestamp")) {
        fileStore.createIndex("timestamp", "timestamp", {
          unique: false
        });
      }
    };
    req.onsuccess = () => {
      db = /** @type {IDBDatabase} */ (req.result);
      // add to the cache
      IDBFS.dbs[name] = db;
      callback(null, db);
    };
    req.onerror = e => {
      callback(e.target.error);
      e.preventDefault();
    };
  },
  getLocalSet: (mount, callback) => {
    var entries = {};
    function isRealDir(p) {
      return p !== "." && p !== "..";
    }
    function toAbsolute(root) {
      return p => PATH.join2(root, p);
    }
    var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
    while (check.length) {
      var path = check.pop();
      var stat;
      try {
        stat = FS.stat(path);
      } catch (e) {
        return callback(e);
      }
      if (FS.isDir(stat.mode)) {
        check.push(...FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
      }
      entries[path] = {
        "timestamp": stat.mtime
      };
    }
    return callback(null, {
      type: "local",
      entries
    });
  },
  getRemoteSet: (mount, callback) => {
    var entries = {};
    IDBFS.getDB(mount.mountpoint, (err, db) => {
      if (err) return callback(err);
      try {
        var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
        transaction.onerror = e => {
          callback(e.target.error);
          e.preventDefault();
        };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        var index = store.index("timestamp");
        index.openKeyCursor().onsuccess = event => {
          var cursor = event.target.result;
          if (!cursor) {
            return callback(null, {
              type: "remote",
              db,
              entries
            });
          }
          entries[cursor.primaryKey] = {
            "timestamp": cursor.key
          };
          cursor.continue();
        };
      } catch (e) {
        return callback(e);
      }
    });
  },
  loadLocalEntry: (path, callback) => {
    var stat, node;
    try {
      var lookup = FS.lookupPath(path);
      node = lookup.node;
      stat = FS.stat(path);
    } catch (e) {
      return callback(e);
    }
    if (FS.isDir(stat.mode)) {
      return callback(null, {
        "timestamp": stat.mtime,
        "mode": stat.mode
      });
    } else if (FS.isFile(stat.mode)) {
      // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
      // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
      node.contents = MEMFS.getFileDataAsTypedArray(node);
      return callback(null, {
        "timestamp": stat.mtime,
        "mode": stat.mode,
        "contents": node.contents
      });
    } else {
      return callback(new Error("node type not supported"));
    }
  },
  storeLocalEntry: (path, entry, callback) => {
    try {
      if (FS.isDir(entry["mode"])) {
        FS.mkdirTree(path, entry["mode"]);
      } else if (FS.isFile(entry["mode"])) {
        FS.writeFile(path, entry["contents"], {
          canOwn: true
        });
      } else {
        return callback(new Error("node type not supported"));
      }
      FS.chmod(path, entry["mode"]);
      FS.utime(path, entry["timestamp"], entry["timestamp"]);
    } catch (e) {
      return callback(e);
    }
    callback(null);
  },
  removeLocalEntry: (path, callback) => {
    try {
      var stat = FS.stat(path);
      if (FS.isDir(stat.mode)) {
        FS.rmdir(path);
      } else if (FS.isFile(stat.mode)) {
        FS.unlink(path);
      }
    } catch (e) {
      return callback(e);
    }
    callback(null);
  },
  loadRemoteEntry: (store, path, callback) => {
    var req = store.get(path);
    req.onsuccess = event => callback(null, event.target.result);
    req.onerror = e => {
      callback(e.target.error);
      e.preventDefault();
    };
  },
  storeRemoteEntry: (store, path, entry, callback) => {
    try {
      var req = store.put(entry, path);
    } catch (e) {
      callback(e);
      return;
    }
    req.onsuccess = event => callback();
    req.onerror = e => {
      callback(e.target.error);
      e.preventDefault();
    };
  },
  removeRemoteEntry: (store, path, callback) => {
    var req = store.delete(path);
    req.onsuccess = event => callback();
    req.onerror = e => {
      callback(e.target.error);
      e.preventDefault();
    };
  },
  reconcile: (src, dst, callback) => {
    var total = 0;
    var create = [];
    Object.keys(src.entries).forEach(key => {
      var e = src.entries[key];
      var e2 = dst.entries[key];
      if (!e2 || e["timestamp"].getTime() != e2["timestamp"].getTime()) {
        create.push(key);
        total++;
      }
    });
    var remove = [];
    Object.keys(dst.entries).forEach(key => {
      if (!src.entries[key]) {
        remove.push(key);
        total++;
      }
    });
    if (!total) {
      return callback(null);
    }
    var errored = false;
    var db = src.type === "remote" ? src.db : dst.db;
    var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
    function done(err) {
      if (err && !errored) {
        errored = true;
        return callback(err);
      }
    }
    // transaction may abort if (for example) there is a QuotaExceededError
    transaction.onerror = transaction.onabort = e => {
      done(e.target.error);
      e.preventDefault();
    };
    transaction.oncomplete = e => {
      if (!errored) {
        callback(null);
      }
    };
    // sort paths in ascending order so directory entries are created
    // before the files inside them
    create.sort().forEach(path => {
      if (dst.type === "local") {
        IDBFS.loadRemoteEntry(store, path, (err, entry) => {
          if (err) return done(err);
          IDBFS.storeLocalEntry(path, entry, done);
        });
      } else {
        IDBFS.loadLocalEntry(path, (err, entry) => {
          if (err) return done(err);
          IDBFS.storeRemoteEntry(store, path, entry, done);
        });
      }
    });
    // sort paths in descending order so files are deleted before their
    // parent directories
    remove.sort().reverse().forEach(path => {
      if (dst.type === "local") {
        IDBFS.removeLocalEntry(path, done);
      } else {
        IDBFS.removeRemoteEntry(store, path, done);
      }
    });
  }
};

var FS = {
  root: null,
  mounts: [],
  devices: {},
  streams: [],
  nextInode: 1,
  nameTable: null,
  currentPath: "/",
  initialized: false,
  ignorePermissions: true,
  ErrnoError: class {
    name="ErrnoError";
    // We set the `name` property to be able to identify `FS.ErrnoError`
    // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
    // - when using PROXYFS, an error can come from an underlying FS
    // as different FS objects have their own FS.ErrnoError each,
    // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
    // we'll use the reliable test `err.name == "ErrnoError"` instead
    constructor(errno) {
      this.errno = errno;
    }
  },
  genericErrors: {},
  filesystems: null,
  syncFSRequests: 0,
  readFiles: {},
  FSStream: class {
    shared={};
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return (this.flags & 1024);
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  },
  FSNode: class {
    node_ops={};
    stream_ops={};
    readMode=292 | 73;
    writeMode=146;
    mounted=null;
    constructor(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      // root node sets parent to itself
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.rdev = rdev;
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
  },
  lookupPath(path, opts = {}) {
    path = PATH_FS.resolve(path);
    if (!path) return {
      path: "",
      node: null
    };
    var defaults = {
      follow_mount: true,
      recurse_count: 0
    };
    opts = Object.assign(defaults, opts);
    if (opts.recurse_count > 8) {
      // max recursive lookup of 8
      throw new FS.ErrnoError(32);
    }
    // split the absolute path
    var parts = path.split("/").filter(p => !!p);
    // start at the root
    var current = FS.root;
    var current_path = "/";
    for (var i = 0; i < parts.length; i++) {
      var islast = (i === parts.length - 1);
      if (islast && opts.parent) {
        // stop resolving
        break;
      }
      current = FS.lookupNode(current, parts[i]);
      current_path = PATH.join2(current_path, parts[i]);
      // jump to the mount's root node if this is a mountpoint
      if (FS.isMountpoint(current)) {
        if (!islast || (islast && opts.follow_mount)) {
          current = current.mounted.root;
        }
      }
      // by default, lookupPath will not follow a symlink if it is the final path component.
      // setting opts.follow = true will override this behavior.
      if (!islast || opts.follow) {
        var count = 0;
        while (FS.isLink(current.mode)) {
          var link = FS.readlink(current_path);
          current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
          var lookup = FS.lookupPath(current_path, {
            recurse_count: opts.recurse_count + 1
          });
          current = lookup.node;
          if (count++ > 40) {
            // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
            throw new FS.ErrnoError(32);
          }
        }
      }
    }
    return {
      path: current_path,
      node: current
    };
  },
  getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  },
  hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return ((parentid + hash) >>> 0) % FS.nameTable.length;
  },
  hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  },
  hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  },
  lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    // if we failed to find it in the cache, call into the VFS
    return FS.lookup(parent, name);
  },
  createNode(parent, name, mode, rdev) {
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node;
  },
  destroyNode(node) {
    FS.hashRemoveNode(node);
  },
  isRoot(node) {
    return node === node.parent;
  },
  isMountpoint(node) {
    return !!node.mounted;
  },
  isFile(mode) {
    return (mode & 61440) === 32768;
  },
  isDir(mode) {
    return (mode & 61440) === 16384;
  },
  isLink(mode) {
    return (mode & 61440) === 40960;
  },
  isChrdev(mode) {
    return (mode & 61440) === 8192;
  },
  isBlkdev(mode) {
    return (mode & 61440) === 24576;
  },
  isFIFO(mode) {
    return (mode & 61440) === 4096;
  },
  isSocket(mode) {
    return (mode & 49152) === 49152;
  },
  flagsToPermissionString(flag) {
    var perms = [ "r", "w", "rw" ][flag & 3];
    if ((flag & 512)) {
      perms += "w";
    }
    return perms;
  },
  nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    // return 0 if any user, group or owner bits are set.
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    } else if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    } else if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  },
  mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  },
  mayCreate(dir, name) {
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {}
    return FS.nodePermissions(dir, "wx");
  },
  mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else {
      if (FS.isDir(node.mode)) {
        return 31;
      }
    }
    return 0;
  },
  mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    } else if (FS.isDir(node.mode)) {
      if (FS.flagsToPermissionString(flags) !== "r" || // opening for write
      (flags & 512)) {
        // TODO: check for O_SEARCH? (== search for dir only)
        return 31;
      }
    }
    return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
  },
  MAX_OPEN_FDS: 4096,
  nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  },
  getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  },
  getStream: fd => FS.streams[fd],
  createStream(stream, fd = -1) {
    // clone it, so we can return an instance of FSStream
    stream = Object.assign(new FS.FSStream, stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  },
  closeStream(fd) {
    FS.streams[fd] = null;
  },
  dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  },
  chrdev_stream_ops: {
    open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      // override node's stream ops with the device's
      stream.stream_ops = device.stream_ops;
      // forward the open call
      stream.stream_ops.open?.(stream);
    },
    llseek() {
      throw new FS.ErrnoError(70);
    }
  },
  major: dev => ((dev) >> 8),
  minor: dev => ((dev) & 255),
  makedev: (ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
    FS.devices[dev] = {
      stream_ops: ops
    };
  },
  getDevice: dev => FS.devices[dev],
  getMounts(mount) {
    var mounts = [];
    var check = [ mount ];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  },
  syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    // sync all mounts
    mounts.forEach(mount => {
      if (!mount.type.syncfs) {
        return done(null);
      }
      mount.type.syncfs(mount, populate, done);
    });
  },
  mount(type, opts, mountpoint) {
    var root = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, {
        follow_mount: false
      });
      mountpoint = lookup.path;
      // use the absolute path
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
    }
    var mount = {
      type,
      opts,
      mountpoint,
      mounts: []
    };
    // create a root node for the fs
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root) {
      FS.root = mountRoot;
    } else if (node) {
      // set as a mountpoint
      node.mounted = mount;
      // add the new mount to the current mount's children
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  },
  unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, {
      follow_mount: false
    });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    // destroy the nodes for this mount, and all its child mounts
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    Object.keys(FS.nameTable).forEach(hash => {
      var current = FS.nameTable[hash];
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    });
    // no longer a mountpoint
    node.mounted = null;
    // remove this mount from the child mounts
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1);
  },
  lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  },
  mknod(path, mode, dev) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name || name === "." || name === "..") {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode, dev);
  },
  create(path, mode) {
    mode = mode !== undefined ? mode : 438;
    /* 0666 */ mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0);
  },
  mkdir(path, mode) {
    mode = mode !== undefined ? mode : 511;
    /* 0777 */ mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0);
  },
  mkdirTree(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var i = 0; i < dirs.length; ++i) {
      if (!dirs[i]) continue;
      d += "/" + dirs[i];
      try {
        FS.mkdir(d, mode);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  },
  mkdev(path, mode, dev) {
    if (typeof dev == "undefined") {
      dev = mode;
      mode = 438;
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev);
  },
  symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  },
  rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    // parents must exist
    var lookup, old_dir, new_dir;
    // let the errors from non existent directories percolate up
    lookup = FS.lookupPath(old_path, {
      parent: true
    });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, {
      parent: true
    });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    // need to be part of the same mount
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    // source must exist
    var old_node = FS.lookupNode(old_dir, old_name);
    // old path should not be an ancestor of the new path
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    // new path should not be an ancestor of the old path
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    // see if the new path already exists
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    // early out if nothing needs to change
    if (old_node === new_node) {
      return;
    }
    // we'll need to delete the old entry
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    // need delete permissions if we'll be overwriting.
    // need create permissions if new doesn't already exist.
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
      throw new FS.ErrnoError(10);
    }
    // if we are going to change the parent, check write permissions
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // remove the node from the lookup hash
    FS.hashRemoveNode(old_node);
    // do the underlying fs rename
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      // update old node (we do this here to avoid each backend 
      // needing to)
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      // add the node back to the hash (in case node_ops.rename
      // changed its name)
      FS.hashAddNode(old_node);
    }
  },
  rmdir(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  },
  readdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node.node_ops.readdir) {
      throw new FS.ErrnoError(54);
    }
    return node.node_ops.readdir(node);
  },
  unlink(path) {
    var lookup = FS.lookupPath(path, {
      parent: true
    });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      // According to POSIX, we should map EISDIR to EPERM, but
      // we instead do what Linux does (and we must, as we use
      // the musl linux libc).
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  },
  readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
  },
  stat(path, dontFollow) {
    var lookup = FS.lookupPath(path, {
      follow: !dontFollow
    });
    var node = lookup.node;
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    if (!node.node_ops.getattr) {
      throw new FS.ErrnoError(63);
    }
    return node.node_ops.getattr(node);
  },
  lstat(path) {
    return FS.stat(path, true);
  },
  chmod(path, mode, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63);
    }
    node.node_ops.setattr(node, {
      mode: (mode & 4095) | (node.mode & ~4095),
      timestamp: Date.now()
    });
  },
  lchmod(path, mode) {
    FS.chmod(path, mode, true);
  },
  fchmod(fd, mode) {
    var stream = FS.getStreamChecked(fd);
    FS.chmod(stream.node, mode);
  },
  chown(path, uid, gid, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: !dontFollow
      });
      node = lookup.node;
    } else {
      node = path;
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63);
    }
    node.node_ops.setattr(node, {
      timestamp: Date.now()
    });
  },
  // we ignore the uid / gid for now
  lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  },
  fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.chown(stream.node, uid, gid);
  },
  truncate(path, len) {
    if (len < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, {
        follow: true
      });
      node = lookup.node;
    } else {
      node = path;
    }
    if (!node.node_ops.setattr) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    node.node_ops.setattr(node, {
      size: len,
      timestamp: Date.now()
    });
  },
  ftruncate(fd, len) {
    var stream = FS.getStreamChecked(fd);
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.truncate(stream.node, len);
  },
  utime(path, atime, mtime) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    node.node_ops.setattr(node, {
      timestamp: Math.max(atime, mtime)
    });
  },
  open(path, flags, mode) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = typeof flags == "string" ? FS_modeStringToFlags(flags) : flags;
    if ((flags & 64)) {
      mode = typeof mode == "undefined" ? 438 : /* 0666 */ mode;
      mode = (mode & 4095) | 32768;
    } else {
      mode = 0;
    }
    var node;
    if (typeof path == "object") {
      node = path;
    } else {
      path = PATH.normalize(path);
      try {
        var lookup = FS.lookupPath(path, {
          follow: !(flags & 131072)
        });
        node = lookup.node;
      } catch (e) {}
    }
    // perhaps we need to create the node
    var created = false;
    if ((flags & 64)) {
      if (node) {
        // if O_CREAT and O_EXCL are set, error out if the node already exists
        if ((flags & 128)) {
          throw new FS.ErrnoError(20);
        }
      } else {
        // node doesn't exist, try to create it
        node = FS.mknod(path, mode, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    // can't truncate a device
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    // if asked only for a directory, then this must be one
    if ((flags & 65536) && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    // check permissions, if this is not a file we just created now (it is ok to
    // create and write to a file with read-only permissions; it is read-only
    // for later use)
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    // do truncation if necessary
    if ((flags & 512) && !created) {
      FS.truncate(node, 0);
    }
    // we've already handled these, don't pass down to the underlying vfs
    flags &= ~(128 | 512 | 131072);
    // register the stream with the filesystem
    var stream = FS.createStream({
      node,
      path: FS.getPath(node),
      // we want the absolute path to the node
      flags,
      seekable: true,
      position: 0,
      stream_ops: node.stream_ops,
      // used by the file family libc calls (fopen, fwrite, ferror, etc.)
      ungotten: [],
      error: false
    });
    // call the new stream's open function
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (Module["logReadFiles"] && !(flags & 1)) {
      if (!(path in FS.readFiles)) {
        FS.readFiles[path] = 1;
      }
    }
    return stream;
  },
  close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    // free readdir state
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  },
  isClosed(stream) {
    return stream.fd === null;
  },
  llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  },
  read(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  },
  write(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      // seek to the end before writing in append mode
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  },
  allocate(stream, offset, length) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (offset < 0 || length <= 0) {
      throw new FS.ErrnoError(28);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (!stream.stream_ops.allocate) {
      throw new FS.ErrnoError(138);
    }
    stream.stream_ops.allocate(stream, offset, length);
  },
  mmap(stream, length, position, prot, flags) {
    // User requests writing to file (prot & PROT_WRITE != 0).
    // Checking if we have permissions to write to the file unless
    // MAP_PRIVATE flag is set. According to POSIX spec it is possible
    // to write to file opened in read-only mode with MAP_PRIVATE flag,
    // as all modifications will be visible only in the memory of
    // the current process.
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  },
  msync(stream, buffer, offset, length, mmapFlags) {
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  },
  ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  },
  readFile(path, opts = {}) {
    opts.flags = opts.flags || 0;
    opts.encoding = opts.encoding || "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      throw new Error(`Invalid encoding type "${opts.encoding}"`);
    }
    var ret;
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      ret = UTF8ArrayToString(buf);
    } else if (opts.encoding === "binary") {
      ret = buf;
    }
    FS.close(stream);
    return ret;
  },
  writeFile(path, data, opts = {}) {
    opts.flags = opts.flags || 577;
    var stream = FS.open(path, opts.flags, opts.mode);
    if (typeof data == "string") {
      var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
      var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
      FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
    } else if (ArrayBuffer.isView(data)) {
      FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
    } else {
      throw new Error("Unsupported data type");
    }
    FS.close(stream);
  },
  cwd: () => FS.currentPath,
  chdir(path) {
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  },
  createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  },
  createDefaultDevices() {
    // create /dev
    FS.mkdir("/dev");
    // setup /dev/null
    FS.registerDevice(FS.makedev(1, 3), {
      read: () => 0,
      write: (stream, buffer, offset, length, pos) => length
    });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    // setup /dev/tty and /dev/tty1
    // stderr needs to print output using err() rather than out()
    // so we register a second tty just for it.
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    // setup /dev/[u]random
    // use a buffer to avoid overhead of individual crypto calls per byte
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (randomLeft === 0) {
        randomLeft = randomFill(randomBuffer).byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    // we're not going to emulate the actual shm device,
    // just create the tmp dirs that reside in it commonly
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  },
  createSpecialDirectories() {
    // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
    // name of the stream for fd 6 (see test_unistd_ttyname)
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({
      mount() {
        var node = FS.createNode(proc_self, "fd", 16384 | 511, /* 0777 */ 73);
        node.node_ops = {
          lookup(parent, name) {
            var fd = +name;
            var stream = FS.getStreamChecked(fd);
            var ret = {
              parent: null,
              mount: {
                mountpoint: "fake"
              },
              node_ops: {
                readlink: () => stream.path
              }
            };
            ret.parent = ret;
            // make it look like a simple root node
            return ret;
          }
        };
        return node;
      }
    }, {}, "/proc/self/fd");
  },
  createStandardStreams(input, output, error) {
    // TODO deprecate the old functionality of a single
    // input / output callback and that utilizes FS.createDevice
    // and instead require a unique set of stream ops
    // by default, we symlink the standard streams to the
    // default tty devices. however, if the standard streams
    // have been overwritten we create a unique device for
    // them instead.
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    // open default streams for the stdin, stdout and stderr devices
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
  },
  staticInit() {
    // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
    [ 44 ].forEach(code => {
      FS.genericErrors[code] = new FS.ErrnoError(code);
      FS.genericErrors[code].stack = "<generic error, no stack>";
    });
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = {
      "MEMFS": MEMFS,
      "IDBFS": IDBFS
    };
  },
  init(input, output, error) {
    FS.initialized = true;
    // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
    input ??= Module["stdin"];
    output ??= Module["stdout"];
    error ??= Module["stderr"];
    FS.createStandardStreams(input, output, error);
  },
  quit() {
    FS.initialized = false;
    // force-flush all streams, so we get musl std streams printed out
    // close all of our streams
    for (var i = 0; i < FS.streams.length; i++) {
      var stream = FS.streams[i];
      if (!stream) {
        continue;
      }
      FS.close(stream);
    }
  },
  findObject(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (!ret.exists) {
      return null;
    }
    return ret.object;
  },
  analyzePath(path, dontResolveLastLink) {
    // operate from within the context of the symlink's target
    try {
      var lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      path = lookup.path;
    } catch (e) {}
    var ret = {
      isRoot: false,
      exists: false,
      error: 0,
      name: null,
      path: null,
      object: null,
      parentExists: false,
      parentPath: null,
      parentObject: null
    };
    try {
      var lookup = FS.lookupPath(path, {
        parent: true
      });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, {
        follow: !dontResolveLastLink
      });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  },
  createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {}
      // ignore EEXIST
      parent = current;
    }
    return current;
  },
  createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(canRead, canWrite);
    return FS.create(path, mode);
  },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      if (typeof data == "string") {
        var arr = new Array(data.length);
        for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
        data = arr;
      }
      // make sure we can write to the file
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode);
    }
  },
  createDevice(parent, name, input, output) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(!!input, !!output);
    FS.createDevice.major ??= 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    // Create a fake device that a set of stream ops to emulate
    // the old behavior.
    FS.registerDevice(dev, {
      open(stream) {
        stream.seekable = false;
      },
      close(stream) {
        // flush any pending line data
        if (output?.buffer?.length) {
          output(10);
        }
      },
      read(stream, buffer, offset, length, pos) {
        /* ignored */ var bytesRead = 0;
        for (var i = 0; i < length; i++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === undefined && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === undefined) break;
          bytesRead++;
          buffer[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now();
        }
        return bytesRead;
      },
      write(stream, buffer, offset, length, pos) {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.timestamp = Date.now();
        }
        return i;
      }
    });
    return FS.mkdev(path, mode, dev);
  },
  forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (typeof XMLHttpRequest != "undefined") {
      throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      // Command-line.
      try {
        obj.contents = readBinary(obj.url);
        obj.usedBytes = obj.contents.length;
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  },
  createLazyFile(parent, name, url, canRead, canWrite) {
    // Lazy chunked Uint8Array (implements get and length from Uint8Array).
    // Actual getting is abstracted away for eventual reuse.
    class LazyUint8Array {
      lengthKnown=false;
      chunks=[];
      // Loaded chunks. Index is the chunk number
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return undefined;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = (idx / this.chunkSize) | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        // Find length
        var xhr = new XMLHttpRequest;
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        // Chunk size in bytes
        if (!hasByteServing) chunkSize = datalength;
        // Function to get a range from the remote URL.
        var doXHR = (from, to) => {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
          var xhr = new XMLHttpRequest;
          xhr.open("GET", url, false);
          if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
          // Some hints to the browser that we want binary data.
          xhr.responseType = "arraybuffer";
          if (xhr.overrideMimeType) {
            xhr.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          if (xhr.response !== undefined) {
            return new Uint8Array(/** @type{Array<number>} */ (xhr.response || []));
          }
          return intArrayFromString(xhr.responseText || "", true);
        };
        var lazyArray = this;
        lazyArray.setDataGetter(chunkNum => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          // including this byte
          end = Math.min(end, datalength - 1);
          // if datalength-1 is selected, this is the last block
          if (typeof lazyArray.chunks[chunkNum] == "undefined") {
            lazyArray.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
          return lazyArray.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
          chunkSize = datalength = 1;
          // this will force getter(0)/doXHR do download the whole file
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (typeof XMLHttpRequest != "undefined") {
      if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
      var lazyArray = new LazyUint8Array;
      var properties = {
        isDevice: false,
        contents: lazyArray
      };
    } else {
      var properties = {
        isDevice: false,
        url
      };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    // This is a total hack, but I want to get this lazy file code out of the
    // core of MEMFS. If we want to keep this lazy file concept I feel it should
    // be its own thin LAZYFS proxying calls to MEMFS.
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    // Add a function that defers querying the file size until it is asked the first time.
    Object.defineProperties(node, {
      usedBytes: {
        get: function() {
          return this.contents.length;
        }
      }
    });
    // override each stream op with one that tries to force load the lazy file first
    var stream_ops = {};
    var keys = Object.keys(node.stream_ops);
    keys.forEach(key => {
      var fn = node.stream_ops[key];
      stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    });
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {
        // normal array
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          // LazyUint8Array from sync binary XHR
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    // use a custom read function
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    // use a custom mmap function
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, HEAP8, ptr, length, position);
      return {
        ptr,
        allocated: true
      };
    };
    node.stream_ops = stream_ops;
    return node;
  }
};

var SYSCALLS = {
  DEFAULT_POLLMASK: 5,
  calculateAt(dirfd, path, allowEmpty) {
    if (PATH.isAbs(path)) {
      return path;
    }
    // relative path
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return PATH.join2(dir, path);
  },
  doStat(func, path, buf) {
    var stat = func(path);
    HEAP32[((buf) >> 2)] = stat.dev;
    HEAP32[(((buf) + (4)) >> 2)] = stat.mode;
    HEAPU32[(((buf) + (8)) >> 2)] = stat.nlink;
    HEAP32[(((buf) + (12)) >> 2)] = stat.uid;
    HEAP32[(((buf) + (16)) >> 2)] = stat.gid;
    HEAP32[(((buf) + (20)) >> 2)] = stat.rdev;
    (tempI64 = [ stat.size >>> 0, (tempDouble = stat.size, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((buf) + (24)) >> 2)] = tempI64[0], HEAP32[(((buf) + (28)) >> 2)] = tempI64[1]);
    HEAP32[(((buf) + (32)) >> 2)] = 4096;
    HEAP32[(((buf) + (36)) >> 2)] = stat.blocks;
    var atime = stat.atime.getTime();
    var mtime = stat.mtime.getTime();
    var ctime = stat.ctime.getTime();
    (tempI64 = [ Math.floor(atime / 1e3) >>> 0, (tempDouble = Math.floor(atime / 1e3), 
    (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((buf) + (40)) >> 2)] = tempI64[0], HEAP32[(((buf) + (44)) >> 2)] = tempI64[1]);
    HEAPU32[(((buf) + (48)) >> 2)] = (atime % 1e3) * 1e3 * 1e3;
    (tempI64 = [ Math.floor(mtime / 1e3) >>> 0, (tempDouble = Math.floor(mtime / 1e3), 
    (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((buf) + (56)) >> 2)] = tempI64[0], HEAP32[(((buf) + (60)) >> 2)] = tempI64[1]);
    HEAPU32[(((buf) + (64)) >> 2)] = (mtime % 1e3) * 1e3 * 1e3;
    (tempI64 = [ Math.floor(ctime / 1e3) >>> 0, (tempDouble = Math.floor(ctime / 1e3), 
    (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((buf) + (72)) >> 2)] = tempI64[0], HEAP32[(((buf) + (76)) >> 2)] = tempI64[1]);
    HEAPU32[(((buf) + (80)) >> 2)] = (ctime % 1e3) * 1e3 * 1e3;
    (tempI64 = [ stat.ino >>> 0, (tempDouble = stat.ino, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((buf) + (88)) >> 2)] = tempI64[0], HEAP32[(((buf) + (92)) >> 2)] = tempI64[1]);
    return 0;
  },
  doMsync(addr, stream, len, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      // MAP_PRIVATE calls need not to be synced back to underlying fs
      return 0;
    }
    var buffer = HEAPU8.slice(addr, addr + len);
    FS.msync(stream, buffer, offset, len, flags);
  },
  getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  },
  varargs: undefined,
  getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  }
};

var ___syscall__newselect = function(nfds, readfds, writefds, exceptfds, timeout) {
  try {
    // readfds are supported,
    // writefds checks socket open status
    // exceptfds are supported, although on web, such exceptional conditions never arise in web sockets
    //                          and so the exceptfds list will always return empty.
    // timeout is supported, although on SOCKFS and PIPEFS these are ignored and always treated as 0 - fully async
    var total = 0;
    var srcReadLow = (readfds ? HEAP32[((readfds) >> 2)] : 0), srcReadHigh = (readfds ? HEAP32[(((readfds) + (4)) >> 2)] : 0);
    var srcWriteLow = (writefds ? HEAP32[((writefds) >> 2)] : 0), srcWriteHigh = (writefds ? HEAP32[(((writefds) + (4)) >> 2)] : 0);
    var srcExceptLow = (exceptfds ? HEAP32[((exceptfds) >> 2)] : 0), srcExceptHigh = (exceptfds ? HEAP32[(((exceptfds) + (4)) >> 2)] : 0);
    var dstReadLow = 0, dstReadHigh = 0;
    var dstWriteLow = 0, dstWriteHigh = 0;
    var dstExceptLow = 0, dstExceptHigh = 0;
    var allLow = (readfds ? HEAP32[((readfds) >> 2)] : 0) | (writefds ? HEAP32[((writefds) >> 2)] : 0) | (exceptfds ? HEAP32[((exceptfds) >> 2)] : 0);
    var allHigh = (readfds ? HEAP32[(((readfds) + (4)) >> 2)] : 0) | (writefds ? HEAP32[(((writefds) + (4)) >> 2)] : 0) | (exceptfds ? HEAP32[(((exceptfds) + (4)) >> 2)] : 0);
    var check = (fd, low, high, val) => fd < 32 ? (low & val) : (high & val);
    for (var fd = 0; fd < nfds; fd++) {
      var mask = 1 << (fd % 32);
      if (!(check(fd, allLow, allHigh, mask))) {
        continue;
      }
      // index isn't in the set
      var stream = SYSCALLS.getStreamFromFD(fd);
      var flags = SYSCALLS.DEFAULT_POLLMASK;
      if (stream.stream_ops.poll) {
        var timeoutInMillis = -1;
        if (timeout) {
          // select(2) is declared to accept "struct timeval { time_t tv_sec; suseconds_t tv_usec; }".
          // However, musl passes the two values to the syscall as an array of long values.
          // Note that sizeof(time_t) != sizeof(long) in wasm32. The former is 8, while the latter is 4.
          // This means using "C_STRUCTS.timeval.tv_usec" leads to a wrong offset.
          // So, instead, we use POINTER_SIZE.
          var tv_sec = (readfds ? HEAP32[((timeout) >> 2)] : 0), tv_usec = (readfds ? HEAP32[(((timeout) + (4)) >> 2)] : 0);
          timeoutInMillis = (tv_sec + tv_usec / 1e6) * 1e3;
        }
        flags = stream.stream_ops.poll(stream, timeoutInMillis);
      }
      if ((flags & 1) && check(fd, srcReadLow, srcReadHigh, mask)) {
        fd < 32 ? (dstReadLow = dstReadLow | mask) : (dstReadHigh = dstReadHigh | mask);
        total++;
      }
      if ((flags & 4) && check(fd, srcWriteLow, srcWriteHigh, mask)) {
        fd < 32 ? (dstWriteLow = dstWriteLow | mask) : (dstWriteHigh = dstWriteHigh | mask);
        total++;
      }
      if ((flags & 2) && check(fd, srcExceptLow, srcExceptHigh, mask)) {
        fd < 32 ? (dstExceptLow = dstExceptLow | mask) : (dstExceptHigh = dstExceptHigh | mask);
        total++;
      }
    }
    if (readfds) {
      HEAP32[((readfds) >> 2)] = dstReadLow;
      HEAP32[(((readfds) + (4)) >> 2)] = dstReadHigh;
    }
    if (writefds) {
      HEAP32[((writefds) >> 2)] = dstWriteLow;
      HEAP32[(((writefds) + (4)) >> 2)] = dstWriteHigh;
    }
    if (exceptfds) {
      HEAP32[((exceptfds) >> 2)] = dstExceptLow;
      HEAP32[(((exceptfds) + (4)) >> 2)] = dstExceptHigh;
    }
    return total;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
};

___syscall__newselect.sig = "iipppp";

var SOCKFS = {
  websocketArgs: {},
  callbacks: {},
  on(event, callback) {
    SOCKFS.callbacks[event] = callback;
  },
  emit(event, param) {
    SOCKFS.callbacks[event]?.(param);
  },
  mount(mount) {
    // The incomming Module['websocket'] can be used for configuring 
    // configuring subprotocol/url, etc
    SOCKFS.websocketArgs = Module["websocket"] || {};
    // Add the Event registration mechanism to the exported websocket configuration
    // object so we can register network callbacks from native JavaScript too.
    // For more documentation see system/include/emscripten/emscripten.h
    (Module["websocket"] ??= {})["on"] = SOCKFS.on;
    return FS.createNode(null, "/", 16384 | 511, /* 0777 */ 0);
  },
  createSocket(family, type, protocol) {
    type &= ~526336;
    // Some applications may pass it; it makes no sense for a single process.
    var streaming = type == 1;
    if (streaming && protocol && protocol != 6) {
      throw new FS.ErrnoError(66);
    }
    // create our internal socket structure
    var sock = {
      family,
      type,
      protocol,
      server: null,
      error: null,
      // Used in getsockopt for SOL_SOCKET/SO_ERROR test
      peers: {},
      pending: [],
      recv_queue: [],
      sock_ops: SOCKFS.websocket_sock_ops
    };
    // create the filesystem node to store the socket structure
    var name = SOCKFS.nextname();
    var node = FS.createNode(SOCKFS.root, name, 49152, 0);
    node.sock = sock;
    // and the wrapping stream that enables library functions such
    // as read and write to indirectly interact with the socket
    var stream = FS.createStream({
      path: name,
      node,
      flags: 2,
      seekable: false,
      stream_ops: SOCKFS.stream_ops
    });
    // map the new stream to the socket structure (sockets have a 1:1
    // relationship with a stream)
    sock.stream = stream;
    return sock;
  },
  getSocket(fd) {
    var stream = FS.getStream(fd);
    if (!stream || !FS.isSocket(stream.node.mode)) {
      return null;
    }
    return stream.node.sock;
  },
  stream_ops: {
    poll(stream) {
      var sock = stream.node.sock;
      return sock.sock_ops.poll(sock);
    },
    ioctl(stream, request, varargs) {
      var sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs);
    },
    read(stream, buffer, offset, length, position) {
      /* ignored */ var sock = stream.node.sock;
      var msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {
        // socket is closed
        return 0;
      }
      buffer.set(msg.buffer, offset);
      return msg.buffer.length;
    },
    write(stream, buffer, offset, length, position) {
      /* ignored */ var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length);
    },
    close(stream) {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock);
    }
  },
  nextname() {
    if (!SOCKFS.nextname.current) {
      SOCKFS.nextname.current = 0;
    }
    return "socket[" + (SOCKFS.nextname.current++) + "]";
  },
  websocket_sock_ops: {
    createPeer(sock, addr, port) {
      var ws;
      if (typeof addr == "object") {
        ws = addr;
        addr = null;
        port = null;
      }
      if (ws) {
        // for sockets that've already connected (e.g. we're the server)
        // we can inspect the _socket property for the address
        if (ws._socket) {
          addr = ws._socket.remoteAddress;
          port = ws._socket.remotePort;
        } else // if we're just now initializing a connection to the remote,
        // inspect the url property
        {
          var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {
            throw new Error("WebSocket URL must be in the format ws(s)://address:port");
          }
          addr = result[1];
          port = parseInt(result[2], 10);
        }
      } else {
        // create the actual websocket object and connect
        try {
          // The default value is 'ws://' the replace is needed because the compiler replaces '//' comments with '#'
          // comments without checking context, so we'd end up with ws:#, the replace swaps the '#' for '//' again.
          var url = "ws:#".replace("#", "//");
          // Make the WebSocket subprotocol (Sec-WebSocket-Protocol) default to binary if no configuration is set.
          var subProtocols = "binary";
          // The default value is 'binary'
          // The default WebSocket options
          var opts = undefined;
          // Fetch runtime WebSocket URL config.
          if (SOCKFS.websocketArgs["url"]) {
            url = SOCKFS.websocketArgs["url"];
          }
          // Fetch runtime WebSocket subprotocol config.
          if (SOCKFS.websocketArgs["subprotocol"]) {
            subProtocols = SOCKFS.websocketArgs["subprotocol"];
          } else if (SOCKFS.websocketArgs["subprotocol"] === null) {
            subProtocols = "null";
          }
          if (url === "ws://" || url === "wss://") {
            // Is the supplied URL config just a prefix, if so complete it.
            var parts = addr.split("/");
            url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/");
          }
          if (subProtocols !== "null") {
            // The regex trims the string (removes spaces at the beginning and end, then splits the string by
            // <any space>,<any space> into an Array. Whitespace removal is important for Websockify and ws.
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            opts = subProtocols;
          }
          // If node we use the ws library.
          var WebSocketConstructor;
          if (ENVIRONMENT_IS_NODE) {
            WebSocketConstructor = /** @type{(typeof WebSocket)} */ (require("ws"));
          } else {
            WebSocketConstructor = WebSocket;
          }
          ws = new WebSocketConstructor(url, opts);
          ws.binaryType = "arraybuffer";
        } catch (e) {
          throw new FS.ErrnoError(23);
        }
      }
      var peer = {
        addr,
        port,
        socket: ws,
        msg_send_queue: []
      };
      SOCKFS.websocket_sock_ops.addPeer(sock, peer);
      SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
      // if this is a bound dgram socket, send the port number first to allow
      // us to override the ephemeral port reported to us by remotePort on the
      // remote end.
      if (sock.type === 2 && typeof sock.sport != "undefined") {
        peer.msg_send_queue.push(new Uint8Array([ 255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), ((sock.sport & 65280) >> 8), (sock.sport & 255) ]));
      }
      return peer;
    },
    getPeer(sock, addr, port) {
      return sock.peers[addr + ":" + port];
    },
    addPeer(sock, peer) {
      sock.peers[peer.addr + ":" + peer.port] = peer;
    },
    removePeer(sock, peer) {
      delete sock.peers[peer.addr + ":" + peer.port];
    },
    handlePeerEvents(sock, peer) {
      var first = true;
      var handleOpen = function() {
        sock.connecting = false;
        SOCKFS.emit("open", sock.stream.fd);
        try {
          var queued = peer.msg_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.msg_send_queue.shift();
          }
        } catch (e) {
          // not much we can do here in the way of proper error handling as we've already
          // lied and said this data was sent. shut it down.
          peer.socket.close();
        }
      };
      function handleMessage(data) {
        if (typeof data == "string") {
          var encoder = new TextEncoder;
          // should be utf-8
          data = encoder.encode(data);
        } else // make a typed array from the string
        {
          assert(data.byteLength !== undefined);
          // must receive an ArrayBuffer
          if (data.byteLength == 0) {
            // An empty ArrayBuffer will emit a pseudo disconnect event
            // as recv/recvmsg will return zero which indicates that a socket
            // has performed a shutdown although the connection has not been disconnected yet.
            return;
          }
          data = new Uint8Array(data);
        }
        // if this is the port message, override the peer's port with it
        var wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
          // update the peer's port and it's key in the peer map
          var newport = ((data[8] << 8) | data[9]);
          SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          return;
        }
        sock.recv_queue.push({
          addr: peer.addr,
          port: peer.port,
          data
        });
        SOCKFS.emit("message", sock.stream.fd);
      }
      if (ENVIRONMENT_IS_NODE) {
        peer.socket.on("open", handleOpen);
        peer.socket.on("message", function(data, isBinary) {
          if (!isBinary) {
            return;
          }
          handleMessage((new Uint8Array(data)).buffer);
        });
        // copy from node Buffer -> ArrayBuffer
        peer.socket.on("close", function() {
          SOCKFS.emit("close", sock.stream.fd);
        });
        peer.socket.on("error", function(error) {
          // Although the ws library may pass errors that may be more descriptive than
          // ECONNREFUSED they are not necessarily the expected error code e.g.
          // ENOTFOUND on getaddrinfo seems to be node.js specific, so using ECONNREFUSED
          // is still probably the most useful thing to do.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        });
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = function() {
          SOCKFS.emit("close", sock.stream.fd);
        };
        peer.socket.onmessage = function peer_socket_onmessage(event) {
          handleMessage(event.data);
        };
        peer.socket.onerror = function(error) {
          // The WebSocket spec only allows a 'simple event' to be thrown on error,
          // so we only really know as much as ECONNREFUSED.
          sock.error = 14;
          // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
          SOCKFS.emit("error", [ sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused" ]);
        };
      }
    },
    poll(sock) {
      if (sock.type === 1 && sock.server) {
        // listen sockets should only say they're available for reading
        // if there are pending clients.
        return sock.pending.length ? (64 | 1) : 0;
      }
      var mask = 0;
      var dest = sock.type === 1 ? // we only care about the socket state for connection-based sockets
      SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || // connection-less sockets are always ready to read
      (dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // let recv return 0 once closed
        mask |= (64 | 1);
      }
      if (!dest || // connection-less sockets are always ready to write
      (dest && dest.socket.readyState === dest.socket.OPEN)) {
        mask |= 4;
      }
      if ((dest && dest.socket.readyState === dest.socket.CLOSING) || (dest && dest.socket.readyState === dest.socket.CLOSED)) {
        // When an non-blocking connect fails mark the socket as writable.
        // Its up to the calling code to then use getsockopt with SO_ERROR to
        // retrieve the error.
        // See https://man7.org/linux/man-pages/man2/connect.2.html
        if (sock.connecting) {
          mask |= 4;
        } else {
          mask |= 16;
        }
      }
      return mask;
    },
    ioctl(sock, request, arg) {
      switch (request) {
       case 21531:
        var bytes = 0;
        if (sock.recv_queue.length) {
          bytes = sock.recv_queue[0].data.length;
        }
        HEAP32[((arg) >> 2)] = bytes;
        return 0;

       default:
        return 28;
      }
    },
    close(sock) {
      // if we've spawned a listen server, close it
      if (sock.server) {
        try {
          sock.server.close();
        } catch (e) {}
        sock.server = null;
      }
      // close any peer connections
      var peers = Object.keys(sock.peers);
      for (var i = 0; i < peers.length; i++) {
        var peer = sock.peers[peers[i]];
        try {
          peer.socket.close();
        } catch (e) {}
        SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      }
      return 0;
    },
    bind(sock, addr, port) {
      if (typeof sock.saddr != "undefined" || typeof sock.sport != "undefined") {
        throw new FS.ErrnoError(28);
      }
      // already bound
      sock.saddr = addr;
      sock.sport = port;
      // in order to emulate dgram sockets, we need to launch a listen server when
      // binding on a connection-less socket
      // note: this is only required on the server side
      if (sock.type === 2) {
        // close the existing server if it exists
        if (sock.server) {
          sock.server.close();
          sock.server = null;
        }
        // swallow error operation not supported error that occurs when binding in the
        // browser where this isn't supported
        try {
          sock.sock_ops.listen(sock, 0);
        } catch (e) {
          if (!(e.name === "ErrnoError")) throw e;
          if (e.errno !== 138) throw e;
        }
      }
    },
    connect(sock, addr, port) {
      if (sock.server) {
        throw new FS.ErrnoError(138);
      }
      // TODO autobind
      // if (!sock.addr && sock.type == 2) {
      // }
      // early out if we're already connected / in the middle of connecting
      if (typeof sock.daddr != "undefined" && typeof sock.dport != "undefined") {
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {
          if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(7);
          } else {
            throw new FS.ErrnoError(30);
          }
        }
      }
      // add the socket to our peer list and set our
      // destination address / port to match
      var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      // because we cannot synchronously block to wait for the WebSocket
      // connection to complete, we return here pretending that the connection
      // was a success.
      sock.connecting = true;
    },
    listen(sock, backlog) {
      if (!ENVIRONMENT_IS_NODE) {
        throw new FS.ErrnoError(138);
      }
      if (sock.server) {
        throw new FS.ErrnoError(28);
      }
      // already listening
      var WebSocketServer = require("ws").Server;
      var host = sock.saddr;
      sock.server = new WebSocketServer({
        host,
        port: sock.sport
      });
      // TODO support backlog
      SOCKFS.emit("listen", sock.stream.fd);
      // Send Event with listen fd.
      sock.server.on("connection", function(ws) {
        if (sock.type === 1) {
          var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
          // create a peer on the new socket
          var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          // push to queue for accept to pick up
          sock.pending.push(newsock);
          SOCKFS.emit("connection", newsock.stream.fd);
        } else {
          // create a peer on the listen socket so calling sendto
          // with the listen socket and an address will resolve
          // to the correct client
          SOCKFS.websocket_sock_ops.createPeer(sock, ws);
          SOCKFS.emit("connection", sock.stream.fd);
        }
      });
      sock.server.on("close", function() {
        SOCKFS.emit("close", sock.stream.fd);
        sock.server = null;
      });
      sock.server.on("error", function(error) {
        // Although the ws library may pass errors that may be more descriptive than
        // ECONNREFUSED they are not necessarily the expected error code e.g.
        // ENOTFOUND on getaddrinfo seems to be node.js specific, so using EHOSTUNREACH
        // is still probably the most useful thing to do. This error shouldn't
        // occur in a well written app as errors should get trapped in the compiled
        // app's own getaddrinfo call.
        sock.error = 23;
        // Used in getsockopt for SOL_SOCKET/SO_ERROR test.
        SOCKFS.emit("error", [ sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable" ]);
      });
    },
    // don't throw
    accept(listensock) {
      if (!listensock.server || !listensock.pending.length) {
        throw new FS.ErrnoError(28);
      }
      var newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock;
    },
    getname(sock, peer) {
      var addr, port;
      if (peer) {
        if (sock.daddr === undefined || sock.dport === undefined) {
          throw new FS.ErrnoError(53);
        }
        addr = sock.daddr;
        port = sock.dport;
      } else {
        // TODO saddr and sport will be set for bind()'d UDP sockets, but what
        // should we be returning for TCP sockets that've been connect()'d?
        addr = sock.saddr || 0;
        port = sock.sport || 0;
      }
      return {
        addr,
        port
      };
    },
    sendmsg(sock, buffer, offset, length, addr, port) {
      if (sock.type === 2) {
        // connection-less sockets will honor the message address,
        // and otherwise fall back to the bound destination address
        if (addr === undefined || port === undefined) {
          addr = sock.daddr;
          port = sock.dport;
        }
        // if there was no address to fall back to, error out
        if (addr === undefined || port === undefined) {
          throw new FS.ErrnoError(17);
        }
      } else {
        // connection-based sockets will only use the bound
        addr = sock.daddr;
        port = sock.dport;
      }
      // find the peer for the destination address
      var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
      // early out if not connected with a connection-based socket
      if (sock.type === 1) {
        if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
          throw new FS.ErrnoError(53);
        }
      }
      // create a copy of the incoming data to send, as the WebSocket API
      // doesn't work entirely with an ArrayBufferView, it'll just send
      // the entire underlying buffer
      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer;
      }
      var data;
      data = buffer.slice(offset, offset + length);
      // if we don't have a cached connectionless UDP datagram connection, or
      // the TCP socket is still connecting, queue the message to be sent upon
      // connect, and lie, saying the data was sent now.
      if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
        // if we're not connected, open a new connection
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
          }
        }
        dest.msg_send_queue.push(data);
        return length;
      }
      try {
        // send the actual data
        dest.socket.send(data);
        return length;
      } catch (e) {
        throw new FS.ErrnoError(28);
      }
    },
    recvmsg(sock, length) {
      // http://pubs.opengroup.org/onlinepubs/7908799/xns/recvmsg.html
      if (sock.type === 1 && sock.server) {
        // tcp servers should not be recv()'ing on the listen socket
        throw new FS.ErrnoError(53);
      }
      var queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {
            // if we have a destination address but are not connected, error out
            throw new FS.ErrnoError(53);
          }
          if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            // return null if the socket has closed
            return null;
          }
          // else, our socket is in a valid state but truly has nothing available
          throw new FS.ErrnoError(6);
        }
        throw new FS.ErrnoError(6);
      }
      // queued.data will be an ArrayBuffer if it's unadulterated, but if it's
      // requeued TCP data it'll be an ArrayBufferView
      var queuedLength = queued.data.byteLength || queued.data.length;
      var queuedOffset = queued.data.byteOffset || 0;
      var queuedBuffer = queued.data.buffer || queued.data;
      var bytesRead = Math.min(length, queuedLength);
      var res = {
        buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
        addr: queued.addr,
        port: queued.port
      };
      // push back any unread data for TCP connections
      if (sock.type === 1 && bytesRead < queuedLength) {
        var bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
        sock.recv_queue.unshift(queued);
      }
      return res;
    }
  }
};

var getSocketFromFD = fd => {
  var socket = SOCKFS.getSocket(fd);
  if (!socket) throw new FS.ErrnoError(8);
  return socket;
};

var inetPton4 = str => {
  var b = str.split(".");
  for (var i = 0; i < 4; i++) {
    var tmp = Number(b[i]);
    if (isNaN(tmp)) return null;
    b[i] = tmp;
  }
  return (b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)) >>> 0;
};

/** @suppress {checkTypes} */ var jstoi_q = str => parseInt(str);

var inetPton6 = str => {
  var words;
  var w, offset, z;
  /* http://home.deds.nl/~aeron/regex/ */ var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
  var parts = [];
  if (!valid6regx.test(str)) {
    return null;
  }
  if (str === "::") {
    return [ 0, 0, 0, 0, 0, 0, 0, 0 ];
  }
  // Z placeholder to keep track of zeros when splitting the string on ":"
  if (str.startsWith("::")) {
    str = str.replace("::", "Z:");
  } else // leading zeros case
  {
    str = str.replace("::", ":Z:");
  }
  if (str.indexOf(".") > 0) {
    // parse IPv4 embedded stress
    str = str.replace(new RegExp("[.]", "g"), ":");
    words = str.split(":");
    words[words.length - 4] = jstoi_q(words[words.length - 4]) + jstoi_q(words[words.length - 3]) * 256;
    words[words.length - 3] = jstoi_q(words[words.length - 2]) + jstoi_q(words[words.length - 1]) * 256;
    words = words.slice(0, words.length - 2);
  } else {
    words = str.split(":");
  }
  offset = 0;
  z = 0;
  for (w = 0; w < words.length; w++) {
    if (typeof words[w] == "string") {
      if (words[w] === "Z") {
        // compressed zeros - write appropriate number of zero words
        for (z = 0; z < (8 - words.length + 1); z++) {
          parts[w + z] = 0;
        }
        offset = z - 1;
      } else {
        // parse hex to field to 16-bit value and write it in network byte-order
        parts[w + offset] = _htons(parseInt(words[w], 16));
      }
    } else {
      // parsed IPv4 words
      parts[w + offset] = words[w];
    }
  }
  return [ (parts[1] << 16) | parts[0], (parts[3] << 16) | parts[2], (parts[5] << 16) | parts[4], (parts[7] << 16) | parts[6] ];
};

/** @param {number=} addrlen */ var writeSockaddr = (sa, family, addr, port, addrlen) => {
  switch (family) {
   case 2:
    addr = inetPton4(addr);
    zeroMemory(sa, 16);
    if (addrlen) {
      HEAP32[((addrlen) >> 2)] = 16;
    }
    HEAP16[((sa) >> 1)] = family;
    HEAP32[(((sa) + (4)) >> 2)] = addr;
    HEAP16[(((sa) + (2)) >> 1)] = _htons(port);
    break;

   case 10:
    addr = inetPton6(addr);
    zeroMemory(sa, 28);
    if (addrlen) {
      HEAP32[((addrlen) >> 2)] = 28;
    }
    HEAP32[((sa) >> 2)] = family;
    HEAP32[(((sa) + (8)) >> 2)] = addr[0];
    HEAP32[(((sa) + (12)) >> 2)] = addr[1];
    HEAP32[(((sa) + (16)) >> 2)] = addr[2];
    HEAP32[(((sa) + (20)) >> 2)] = addr[3];
    HEAP16[(((sa) + (2)) >> 1)] = _htons(port);
    break;

   default:
    return 5;
  }
  return 0;
};

var DNS = {
  address_map: {
    id: 1,
    addrs: {},
    names: {}
  },
  lookup_name(name) {
    // If the name is already a valid ipv4 / ipv6 address, don't generate a fake one.
    var res = inetPton4(name);
    if (res !== null) {
      return name;
    }
    res = inetPton6(name);
    if (res !== null) {
      return name;
    }
    // See if this name is already mapped.
    var addr;
    if (DNS.address_map.addrs[name]) {
      addr = DNS.address_map.addrs[name];
    } else {
      var id = DNS.address_map.id++;
      assert(id < 65535, "exceeded max address mappings of 65535");
      addr = "172.29." + (id & 255) + "." + (id & 65280);
      DNS.address_map.names[addr] = name;
      DNS.address_map.addrs[name] = addr;
    }
    return addr;
  },
  lookup_addr(addr) {
    if (DNS.address_map.names[addr]) {
      return DNS.address_map.names[addr];
    }
    return null;
  }
};

function ___syscall_accept4(fd, addr, addrlen, flags, d1, d2) {
  try {
    var sock = getSocketFromFD(fd);
    var newsock = sock.sock_ops.accept(sock);
    if (addr) {
      var errno = writeSockaddr(addr, newsock.family, DNS.lookup_name(newsock.daddr), newsock.dport, addrlen);
    }
    return newsock.stream.fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_accept4.sig = "iippiii";

var inetNtop4 = addr => (addr & 255) + "." + ((addr >> 8) & 255) + "." + ((addr >> 16) & 255) + "." + ((addr >> 24) & 255);

var inetNtop6 = ints => {
  //  ref:  http://www.ietf.org/rfc/rfc2373.txt - section 2.5.4
  //  Format for IPv4 compatible and mapped  128-bit IPv6 Addresses
  //  128-bits are split into eight 16-bit words
  //  stored in network byte order (big-endian)
  //  |                80 bits               | 16 |      32 bits        |
  //  +-----------------------------------------------------------------+
  //  |               10 bytes               |  2 |      4 bytes        |
  //  +--------------------------------------+--------------------------+
  //  +               5 words                |  1 |      2 words        |
  //  +--------------------------------------+--------------------------+
  //  |0000..............................0000|0000|    IPv4 ADDRESS     | (compatible)
  //  +--------------------------------------+----+---------------------+
  //  |0000..............................0000|FFFF|    IPv4 ADDRESS     | (mapped)
  //  +--------------------------------------+----+---------------------+
  var str = "";
  var word = 0;
  var longest = 0;
  var lastzero = 0;
  var zstart = 0;
  var len = 0;
  var i = 0;
  var parts = [ ints[0] & 65535, (ints[0] >> 16), ints[1] & 65535, (ints[1] >> 16), ints[2] & 65535, (ints[2] >> 16), ints[3] & 65535, (ints[3] >> 16) ];
  // Handle IPv4-compatible, IPv4-mapped, loopback and any/unspecified addresses
  var hasipv4 = true;
  var v4part = "";
  // check if the 10 high-order bytes are all zeros (first 5 words)
  for (i = 0; i < 5; i++) {
    if (parts[i] !== 0) {
      hasipv4 = false;
      break;
    }
  }
  if (hasipv4) {
    // low-order 32-bits store an IPv4 address (bytes 13 to 16) (last 2 words)
    v4part = inetNtop4(parts[6] | (parts[7] << 16));
    // IPv4-mapped IPv6 address if 16-bit value (bytes 11 and 12) == 0xFFFF (6th word)
    if (parts[5] === -1) {
      str = "::ffff:";
      str += v4part;
      return str;
    }
    // IPv4-compatible IPv6 address if 16-bit value (bytes 11 and 12) == 0x0000 (6th word)
    if (parts[5] === 0) {
      str = "::";
      //special case IPv6 addresses
      if (v4part === "0.0.0.0") v4part = "";
      // any/unspecified address
      if (v4part === "0.0.0.1") v4part = "1";
      // loopback address
      str += v4part;
      return str;
    }
  }
  // Handle all other IPv6 addresses
  // first run to find the longest contiguous zero words
  for (word = 0; word < 8; word++) {
    if (parts[word] === 0) {
      if (word - lastzero > 1) {
        len = 0;
      }
      lastzero = word;
      len++;
    }
    if (len > longest) {
      longest = len;
      zstart = word - longest + 1;
    }
  }
  for (word = 0; word < 8; word++) {
    if (longest > 1) {
      // compress contiguous zeros - to produce "::"
      if (parts[word] === 0 && word >= zstart && word < (zstart + longest)) {
        if (word === zstart) {
          str += ":";
          if (zstart === 0) str += ":";
        }
        //leading zeros case
        continue;
      }
    }
    // converts 16-bit words from big-endian to little-endian before converting to hex string
    str += Number(_ntohs(parts[word] & 65535)).toString(16);
    str += word < 7 ? ":" : "";
  }
  return str;
};

var readSockaddr = (sa, salen) => {
  // family / port offsets are common to both sockaddr_in and sockaddr_in6
  var family = HEAP16[((sa) >> 1)];
  var port = _ntohs(HEAPU16[(((sa) + (2)) >> 1)]);
  var addr;
  switch (family) {
   case 2:
    if (salen !== 16) {
      return {
        errno: 28
      };
    }
    addr = HEAP32[(((sa) + (4)) >> 2)];
    addr = inetNtop4(addr);
    break;

   case 10:
    if (salen !== 28) {
      return {
        errno: 28
      };
    }
    addr = [ HEAP32[(((sa) + (8)) >> 2)], HEAP32[(((sa) + (12)) >> 2)], HEAP32[(((sa) + (16)) >> 2)], HEAP32[(((sa) + (20)) >> 2)] ];
    addr = inetNtop6(addr);
    break;

   default:
    return {
      errno: 5
    };
  }
  return {
    family,
    addr,
    port
  };
};

var getSocketAddress = (addrp, addrlen) => {
  var info = readSockaddr(addrp, addrlen);
  if (info.errno) throw new FS.ErrnoError(info.errno);
  info.addr = DNS.lookup_addr(info.addr) || info.addr;
  return info;
};

function ___syscall_bind(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.bind(sock, info.addr, info.port);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_bind.sig = "iippiii";

function ___syscall_chdir(path) {
  try {
    path = SYSCALLS.getStr(path);
    FS.chdir(path);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_chdir.sig = "ip";

function ___syscall_chmod(path, mode) {
  try {
    path = SYSCALLS.getStr(path);
    FS.chmod(path, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_chmod.sig = "ipi";

function ___syscall_connect(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    var info = getSocketAddress(addr, addrlen);
    sock.sock_ops.connect(sock, info.addr, info.port);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_connect.sig = "iippiii";

function ___syscall_faccessat(dirfd, path, amode, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (amode & ~7) {
      // need a valid mode
      return -28;
    }
    var lookup = FS.lookupPath(path, {
      follow: true
    });
    var node = lookup.node;
    if (!node) {
      return -44;
    }
    var perms = "";
    if (amode & 4) perms += "r";
    if (amode & 2) perms += "w";
    if (amode & 1) perms += "x";
    if (perms && /* otherwise, they've just passed F_OK */ FS.nodePermissions(node, perms)) {
      return -2;
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_faccessat.sig = "iipii";

function ___syscall_fchmod(fd, mode) {
  try {
    FS.fchmod(fd, mode);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchmod.sig = "iii";

function ___syscall_fchown32(fd, owner, group) {
  try {
    FS.fchown(fd, owner, group);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fchown32.sig = "iiii";

/** @suppress {duplicate } */ var syscallGetVarargI = () => {
  // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
  var ret = HEAP32[((+SYSCALLS.varargs) >> 2)];
  SYSCALLS.varargs += 4;
  return ret;
};

var syscallGetVarargP = syscallGetVarargI;

function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (cmd) {
     case 0:
      {
        var arg = syscallGetVarargI();
        if (arg < 0) {
          return -28;
        }
        while (FS.streams[arg]) {
          arg++;
        }
        var newStream;
        newStream = FS.dupStream(stream, arg);
        return newStream.fd;
      }

     case 1:
     case 2:
      return 0;

     // FD_CLOEXEC makes no sense for a single process.
      case 3:
      return stream.flags;

     case 4:
      {
        var arg = syscallGetVarargI();
        stream.flags |= arg;
        return 0;
      }

     case 12:
      {
        var arg = syscallGetVarargP();
        var offset = 0;
        // We're always unlocked.
        HEAP16[(((arg) + (offset)) >> 1)] = 2;
        return 0;
      }

     case 13:
     case 14:
      return 0;
    }
    // Pretend that the locking is successful.
    return -28;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fcntl64.sig = "iiip";

function ___syscall_fstat64(fd, buf) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    return SYSCALLS.doStat(FS.stat, stream.path, buf);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_fstat64.sig = "iip";

var convertI32PairToI53Checked = (lo, hi) => ((hi + 2097152) >>> 0 < 4194305 - !!lo) ? (lo >>> 0) + hi * 4294967296 : NaN;

function ___syscall_ftruncate64(fd, length_low, length_high) {
  var length = convertI32PairToI53Checked(length_low, length_high);
  try {
    if (isNaN(length)) return 61;
    FS.ftruncate(fd, length);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_ftruncate64.sig = "iiii";

var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);

function ___syscall_getcwd(buf, size) {
  try {
    if (size === 0) return -28;
    var cwd = FS.cwd();
    var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
    if (size < cwdLengthInBytes) return -68;
    stringToUTF8(cwd, buf, size);
    return cwdLengthInBytes;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getcwd.sig = "ipp";

function ___syscall_getdents64(fd, dirp, count) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    stream.getdents ||= FS.readdir(stream.path);
    var struct_size = 280;
    var pos = 0;
    var off = FS.llseek(stream, 0, 1);
    var idx = Math.floor(off / struct_size);
    while (idx < stream.getdents.length && pos + struct_size <= count) {
      var id;
      var type;
      var name = stream.getdents[idx];
      if (name === ".") {
        id = stream.node.id;
        type = 4;
      } else // DT_DIR
      if (name === "..") {
        var lookup = FS.lookupPath(stream.path, {
          parent: true
        });
        id = lookup.node.id;
        type = 4;
      } else // DT_DIR
      {
        var child = FS.lookupNode(stream.node, name);
        id = child.id;
        type = FS.isChrdev(child.mode) ? 2 : // DT_CHR, character device.
        FS.isDir(child.mode) ? 4 : // DT_DIR, directory.
        FS.isLink(child.mode) ? 10 : // DT_LNK, symbolic link.
        8;
      }
      // DT_REG, regular file.
      (tempI64 = [ id >>> 0, (tempDouble = id, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
      HEAP32[((dirp + pos) >> 2)] = tempI64[0], HEAP32[(((dirp + pos) + (4)) >> 2)] = tempI64[1]);
      (tempI64 = [ (idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, 
      (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
      HEAP32[(((dirp + pos) + (8)) >> 2)] = tempI64[0], HEAP32[(((dirp + pos) + (12)) >> 2)] = tempI64[1]);
      HEAP16[(((dirp + pos) + (16)) >> 1)] = 280;
      HEAP8[(dirp + pos) + (18)] = type;
      stringToUTF8(name, dirp + pos + 19, 256);
      pos += struct_size;
      idx += 1;
    }
    FS.llseek(stream, idx * struct_size, 0);
    return pos;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getdents64.sig = "iipp";

function ___syscall_getpeername(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    if (!sock.daddr) {
      return -53;
    }
    // The socket is not connected.
    var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.daddr), sock.dport, addrlen);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getpeername.sig = "iippiii";

function ___syscall_getsockname(fd, addr, addrlen, d1, d2, d3) {
  try {
    var sock = getSocketFromFD(fd);
    // TODO: sock.saddr should never be undefined, see TODO in websocket_sock_ops.getname
    var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(sock.saddr || "0.0.0.0"), sock.sport, addrlen);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getsockname.sig = "iippiii";

function ___syscall_getsockopt(fd, level, optname, optval, optlen, d1) {
  try {
    var sock = getSocketFromFD(fd);
    // Minimal getsockopt aimed at resolving https://github.com/emscripten-core/emscripten/issues/2211
    // so only supports SOL_SOCKET with SO_ERROR.
    if (level === 1) {
      if (optname === 4) {
        HEAP32[((optval) >> 2)] = sock.error;
        HEAP32[((optlen) >> 2)] = 4;
        sock.error = null;
        // Clear the error (The SO_ERROR option obtains and then clears this field).
        return 0;
      }
    }
    return -50;
  } // The option is unknown at the level indicated.
  catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_getsockopt.sig = "iiiippi";

function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    switch (op) {
     case 21509:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     case 21505:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcgets) {
          var termios = stream.tty.ops.ioctl_tcgets(stream);
          var argp = syscallGetVarargP();
          HEAP32[((argp) >> 2)] = termios.c_iflag || 0;
          HEAP32[(((argp) + (4)) >> 2)] = termios.c_oflag || 0;
          HEAP32[(((argp) + (8)) >> 2)] = termios.c_cflag || 0;
          HEAP32[(((argp) + (12)) >> 2)] = termios.c_lflag || 0;
          for (var i = 0; i < 32; i++) {
            HEAP8[(argp + i) + (17)] = termios.c_cc[i] || 0;
          }
          return 0;
        }
        return 0;
      }

     case 21510:
     case 21511:
     case 21512:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     // no-op, not actually adjusting terminal settings
      case 21506:
     case 21507:
     case 21508:
      {
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tcsets) {
          var argp = syscallGetVarargP();
          var c_iflag = HEAP32[((argp) >> 2)];
          var c_oflag = HEAP32[(((argp) + (4)) >> 2)];
          var c_cflag = HEAP32[(((argp) + (8)) >> 2)];
          var c_lflag = HEAP32[(((argp) + (12)) >> 2)];
          var c_cc = [];
          for (var i = 0; i < 32; i++) {
            c_cc.push(HEAP8[(argp + i) + (17)]);
          }
          return stream.tty.ops.ioctl_tcsets(stream.tty, op, {
            c_iflag,
            c_oflag,
            c_cflag,
            c_lflag,
            c_cc
          });
        }
        return 0;
      }

     // no-op, not actually adjusting terminal settings
      case 21519:
      {
        if (!stream.tty) return -59;
        var argp = syscallGetVarargP();
        HEAP32[((argp) >> 2)] = 0;
        return 0;
      }

     case 21520:
      {
        if (!stream.tty) return -59;
        return -28;
      }

     // not supported
      case 21531:
      {
        var argp = syscallGetVarargP();
        return FS.ioctl(stream, op, argp);
      }

     case 21523:
      {
        // TODO: in theory we should write to the winsize struct that gets
        // passed in, but for now musl doesn't read anything on it
        if (!stream.tty) return -59;
        if (stream.tty.ops.ioctl_tiocgwinsz) {
          var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
          var argp = syscallGetVarargP();
          HEAP16[((argp) >> 1)] = winsize[0];
          HEAP16[(((argp) + (2)) >> 1)] = winsize[1];
        }
        return 0;
      }

     case 21524:
      {
        // TODO: technically, this ioctl call should change the window size.
        // but, since emscripten doesn't have any concept of a terminal window
        // yet, we'll just silently throw it away as we do TIOCGWINSZ
        if (!stream.tty) return -59;
        return 0;
      }

     case 21515:
      {
        if (!stream.tty) return -59;
        return 0;
      }

     default:
      return -28;
    }
  } // not supported
  catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_ioctl.sig = "iiip";

function ___syscall_listen(fd, backlog) {
  try {
    var sock = getSocketFromFD(fd);
    sock.sock_ops.listen(sock, backlog);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_listen.sig = "iiiiiii";

function ___syscall_lstat64(path, buf) {
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.doStat(FS.lstat, path, buf);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_lstat64.sig = "ipp";

function ___syscall_mkdirat(dirfd, path, mode) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    // remove a trailing slash, if one - /a/b/ has basename of '', but
    // we want to create b in the context of this function
    path = PATH.normalize(path);
    if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
    FS.mkdir(path, mode, 0);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_mkdirat.sig = "iipi";

function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
    path = SYSCALLS.getStr(path);
    var nofollow = flags & 256;
    var allowEmpty = flags & 4096;
    flags = flags & (~6400);
    path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
    return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_newfstatat.sig = "iippi";

function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    var mode = varargs ? syscallGetVarargI() : 0;
    return FS.open(path, flags, mode).fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_openat.sig = "iipip";

function ___syscall_poll(fds, nfds, timeout) {
  try {
    var nonzero = 0;
    for (var i = 0; i < nfds; i++) {
      var pollfd = fds + 8 * i;
      var fd = HEAP32[((pollfd) >> 2)];
      var events = HEAP16[(((pollfd) + (4)) >> 1)];
      var mask = 32;
      var stream = FS.getStream(fd);
      if (stream) {
        mask = SYSCALLS.DEFAULT_POLLMASK;
        if (stream.stream_ops.poll) {
          mask = stream.stream_ops.poll(stream, -1);
        }
      }
      mask &= events | 8 | 16;
      if (mask) nonzero++;
      HEAP16[(((pollfd) + (6)) >> 1)] = mask;
    }
    return nonzero;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_poll.sig = "ipii";

function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (bufsize <= 0) return -28;
    var ret = FS.readlink(path);
    var len = Math.min(bufsize, lengthBytesUTF8(ret));
    var endChar = HEAP8[buf + len];
    stringToUTF8(ret, buf, bufsize + 1);
    // readlink is one of the rare functions that write out a C string, but does never append a null to the output buffer(!)
    // stringToUTF8() always appends a null byte, so restore the character under the null byte after the write.
    HEAP8[buf + len] = endChar;
    return len;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_readlinkat.sig = "iippp";

function ___syscall_recvfrom(fd, buf, len, flags, addr, addrlen) {
  try {
    var sock = getSocketFromFD(fd);
    var msg = sock.sock_ops.recvmsg(sock, len);
    if (!msg) return 0;
    // socket is closed
    if (addr) {
      var errno = writeSockaddr(addr, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
    }
    HEAPU8.set(msg.buffer, buf);
    return msg.buffer.byteLength;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_recvfrom.sig = "iippipp";

function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
  try {
    oldpath = SYSCALLS.getStr(oldpath);
    newpath = SYSCALLS.getStr(newpath);
    oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
    newpath = SYSCALLS.calculateAt(newdirfd, newpath);
    FS.rename(oldpath, newpath);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_renameat.sig = "iipip";

function ___syscall_rmdir(path) {
  try {
    path = SYSCALLS.getStr(path);
    FS.rmdir(path);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_rmdir.sig = "ip";

function ___syscall_sendto(fd, message, length, flags, addr, addr_len) {
  try {
    var sock = getSocketFromFD(fd);
    if (!addr) {
      // send, no address provided
      return FS.write(sock.stream, HEAP8, message, length);
    }
    var dest = getSocketAddress(addr, addr_len);
    // sendto an address
    return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_sendto.sig = "iippipp";

function ___syscall_socket(domain, type, protocol) {
  try {
    var sock = SOCKFS.createSocket(domain, type, protocol);
    return sock.stream.fd;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_socket.sig = "iiiiiii";

function ___syscall_stat64(path, buf) {
  try {
    path = SYSCALLS.getStr(path);
    return SYSCALLS.doStat(FS.stat, path, buf);
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_stat64.sig = "ipp";

function ___syscall_symlink(target, linkpath) {
  try {
    target = SYSCALLS.getStr(target);
    linkpath = SYSCALLS.getStr(linkpath);
    FS.symlink(target, linkpath);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_symlink.sig = "ipp";

function ___syscall_unlinkat(dirfd, path, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path);
    if (flags === 0) {
      FS.unlink(path);
    } else if (flags === 512) {
      FS.rmdir(path);
    } else {
      abort("Invalid flags passed to unlinkat");
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_unlinkat.sig = "iipi";

var readI53FromI64 = ptr => HEAPU32[((ptr) >> 2)] + HEAP32[(((ptr) + (4)) >> 2)] * 4294967296;

function ___syscall_utimensat(dirfd, path, times, flags) {
  try {
    path = SYSCALLS.getStr(path);
    path = SYSCALLS.calculateAt(dirfd, path, true);
    var now = Date.now(), atime, mtime;
    if (!times) {
      atime = now;
      mtime = now;
    } else {
      var seconds = readI53FromI64(times);
      var nanoseconds = HEAP32[(((times) + (8)) >> 2)];
      if (nanoseconds == 1073741823) {
        atime = now;
      } else if (nanoseconds == 1073741822) {
        atime = -1;
      } else {
        atime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
      times += 16;
      seconds = readI53FromI64(times);
      nanoseconds = HEAP32[(((times) + (8)) >> 2)];
      if (nanoseconds == 1073741823) {
        mtime = now;
      } else if (nanoseconds == 1073741822) {
        mtime = -1;
      } else {
        mtime = (seconds * 1e3) + (nanoseconds / (1e3 * 1e3));
      }
    }
    // -1 here means UTIME_OMIT was passed.  FS.utime tables the max of these
    // two values and sets the timestamp to that single value.  If both were
    // set to UTIME_OMIT then we can skip the call completely.
    if (mtime != -1 || atime != -1) {
      FS.utime(path, atime, mtime);
    }
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

___syscall_utimensat.sig = "iippi";

var ___table_base = new WebAssembly.Global({
  "value": "i32",
  "mutable": false
}, 1);

Module["___table_base"] = ___table_base;

var __abort_js = () => {
  abort("");
};

__abort_js.sig = "v";

var ENV = {};

var stringToUTF8OnStack = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8(str, ret, size);
  return ret;
};

var stackSave = () => _emscripten_stack_get_current();

var stackRestore = val => __emscripten_stack_restore(val);

var dlSetError = msg => {
  var sp = stackSave();
  var cmsg = stringToUTF8OnStack(msg);
  ___dl_seterr(cmsg, 0);
  stackRestore(sp);
};

var dlopenInternal = (handle, jsflags) => {
  // void *dlopen(const char *file, int mode);
  // http://pubs.opengroup.org/onlinepubs/009695399/functions/dlopen.html
  var filename = UTF8ToString(handle + 36);
  var flags = HEAP32[(((handle) + (4)) >> 2)];
  filename = PATH.normalize(filename);
  var global = Boolean(flags & 256);
  var localScope = global ? null : {};
  // We don't care about RTLD_NOW and RTLD_LAZY.
  var combinedFlags = {
    global,
    nodelete: Boolean(flags & 4096),
    loadAsync: jsflags.loadAsync
  };
  if (jsflags.loadAsync) {
    return loadDynamicLibrary(filename, combinedFlags, localScope, handle);
  }
  try {
    return loadDynamicLibrary(filename, combinedFlags, localScope, handle);
  } catch (e) {
    dlSetError(`Could not load dynamic lib: ${filename}\n${e}`);
    return 0;
  }
};

var __dlopen_js = handle => dlopenInternal(handle, {
  loadAsync: false
});

__dlopen_js.sig = "pp";

var __dlsym_js = (handle, symbol, symbolIndex) => {
  // void *dlsym(void *restrict handle, const char *restrict name);
  // http://pubs.opengroup.org/onlinepubs/009695399/functions/dlsym.html
  symbol = UTF8ToString(symbol);
  var result;
  var newSymIndex;
  var lib = LDSO.loadedLibsByHandle[handle];
  if (!lib.exports.hasOwnProperty(symbol) || lib.exports[symbol].stub) {
    dlSetError(`Tried to lookup unknown symbol "${symbol}" in dynamic lib: ${lib.name}`);
    return 0;
  }
  newSymIndex = Object.keys(lib.exports).indexOf(symbol);
  var origSym = "orig$" + symbol;
  result = lib.exports[origSym];
  if (result) {
    newSymIndex = Object.keys(lib.exports).indexOf(origSym);
  } else result = lib.exports[symbol];
  if (typeof result == "function") {
    var addr = getFunctionAddress(result);
    if (addr) {
      result = addr;
    } else {
      // Insert the function into the wasm table.  If its a direct wasm
      // function the second argument will not be needed.  If its a JS
      // function we rely on the `sig` attribute being set based on the
      // `<func>__sig` specified in library JS file.
      result = addFunction(result, result.sig);
      HEAPU32[((symbolIndex) >> 2)] = newSymIndex;
    }
  }
  return result;
};

__dlsym_js.sig = "pppp";

var nowIsMonotonic = 1;

var __emscripten_get_now_is_monotonic = () => nowIsMonotonic;

__emscripten_get_now_is_monotonic.sig = "i";

var __emscripten_lookup_name = name => {
  // uint32_t _emscripten_lookup_name(const char *name);
  var nameString = UTF8ToString(name);
  return inetPton4(DNS.lookup_name(nameString));
};

__emscripten_lookup_name.sig = "ip";

var __emscripten_memcpy_js = (dest, src, num) => HEAPU8.copyWithin(dest, src, src + num);

__emscripten_memcpy_js.sig = "vppp";

var runtimeKeepaliveCounter = 0;

var __emscripten_runtime_keepalive_clear = () => {
  noExitRuntime = false;
  runtimeKeepaliveCounter = 0;
};

__emscripten_runtime_keepalive_clear.sig = "v";

function __gmtime_js(time_low, time_high, tmPtr) {
  var time = convertI32PairToI53Checked(time_low, time_high);
  var date = new Date(time * 1e3);
  HEAP32[((tmPtr) >> 2)] = date.getUTCSeconds();
  HEAP32[(((tmPtr) + (4)) >> 2)] = date.getUTCMinutes();
  HEAP32[(((tmPtr) + (8)) >> 2)] = date.getUTCHours();
  HEAP32[(((tmPtr) + (12)) >> 2)] = date.getUTCDate();
  HEAP32[(((tmPtr) + (16)) >> 2)] = date.getUTCMonth();
  HEAP32[(((tmPtr) + (20)) >> 2)] = date.getUTCFullYear() - 1900;
  HEAP32[(((tmPtr) + (24)) >> 2)] = date.getUTCDay();
  var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
  var yday = ((date.getTime() - start) / (1e3 * 60 * 60 * 24)) | 0;
  HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
}

__gmtime_js.sig = "viip";

var isLeapYear = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

var MONTH_DAYS_LEAP_CUMULATIVE = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

var MONTH_DAYS_REGULAR_CUMULATIVE = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];

var ydayFromDate = date => {
  var leap = isLeapYear(date.getFullYear());
  var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
  var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
  // -1 since it's days since Jan 1
  return yday;
};

function __localtime_js(time_low, time_high, tmPtr) {
  var time = convertI32PairToI53Checked(time_low, time_high);
  var date = new Date(time * 1e3);
  HEAP32[((tmPtr) >> 2)] = date.getSeconds();
  HEAP32[(((tmPtr) + (4)) >> 2)] = date.getMinutes();
  HEAP32[(((tmPtr) + (8)) >> 2)] = date.getHours();
  HEAP32[(((tmPtr) + (12)) >> 2)] = date.getDate();
  HEAP32[(((tmPtr) + (16)) >> 2)] = date.getMonth();
  HEAP32[(((tmPtr) + (20)) >> 2)] = date.getFullYear() - 1900;
  HEAP32[(((tmPtr) + (24)) >> 2)] = date.getDay();
  var yday = ydayFromDate(date) | 0;
  HEAP32[(((tmPtr) + (28)) >> 2)] = yday;
  HEAP32[(((tmPtr) + (36)) >> 2)] = -(date.getTimezoneOffset() * 60);
  // Attention: DST is in December in South, and some regions don't have DST at all.
  var start = new Date(date.getFullYear(), 0, 1);
  var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  var winterOffset = start.getTimezoneOffset();
  var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
  HEAP32[(((tmPtr) + (32)) >> 2)] = dst;
}

__localtime_js.sig = "viip";

function __mmap_js(len, prot, flags, fd, offset_low, offset_high, allocated, addr) {
  var offset = convertI32PairToI53Checked(offset_low, offset_high);
  try {
    if (isNaN(offset)) return 61;
    var stream = SYSCALLS.getStreamFromFD(fd);
    var res = FS.mmap(stream, len, offset, prot, flags);
    var ptr = res.ptr;
    HEAP32[((allocated) >> 2)] = res.allocated;
    HEAPU32[((addr) >> 2)] = ptr;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

__mmap_js.sig = "ipiiiiipp";

function __munmap_js(addr, len, prot, flags, fd, offset_low, offset_high) {
  var offset = convertI32PairToI53Checked(offset_low, offset_high);
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    if (prot & 2) {
      SYSCALLS.doMsync(addr, stream, len, flags, offset);
    }
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return -e.errno;
  }
}

__munmap_js.sig = "ippiiiii";

var __tzset_js = (timezone, daylight, std_name, dst_name) => {
  // TODO: Use (malleable) environment variables instead of system settings.
  var currentYear = (new Date).getFullYear();
  var winter = new Date(currentYear, 0, 1);
  var summer = new Date(currentYear, 6, 1);
  var winterOffset = winter.getTimezoneOffset();
  var summerOffset = summer.getTimezoneOffset();
  // Local standard timezone offset. Local standard time is not adjusted for
  // daylight savings.  This code uses the fact that getTimezoneOffset returns
  // a greater value during Standard Time versus Daylight Saving Time (DST).
  // Thus it determines the expected output during Standard Time, and it
  // compares whether the output of the given date the same (Standard) or less
  // (DST).
  var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  // timezone is specified as seconds west of UTC ("The external variable
  // `timezone` shall be set to the difference, in seconds, between
  // Coordinated Universal Time (UTC) and local standard time."), the same
  // as returned by stdTimezoneOffset.
  // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
  HEAPU32[((timezone) >> 2)] = stdTimezoneOffset * 60;
  HEAP32[((daylight) >> 2)] = Number(winterOffset != summerOffset);
  var extractZone = timezoneOffset => {
    // Why inverse sign?
    // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
    var sign = timezoneOffset >= 0 ? "-" : "+";
    var absOffset = Math.abs(timezoneOffset);
    var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    var minutes = String(absOffset % 60).padStart(2, "0");
    return `UTC${sign}${hours}${minutes}`;
  };
  var winterName = extractZone(winterOffset);
  var summerName = extractZone(summerOffset);
  if (summerOffset < winterOffset) {
    // Northern hemisphere
    stringToUTF8(winterName, std_name, 17);
    stringToUTF8(summerName, dst_name, 17);
  } else {
    stringToUTF8(winterName, dst_name, 17);
    stringToUTF8(summerName, std_name, 17);
  }
};

__tzset_js.sig = "vpppp";

var readEmAsmArgsArray = [];

var readEmAsmArgs = (sigPtr, buf) => {
  readEmAsmArgsArray.length = 0;
  var ch;
  // Most arguments are i32s, so shift the buffer pointer so it is a plain
  // index into HEAP32.
  while (ch = HEAPU8[sigPtr++]) {
    // Floats are always passed as doubles, so all types except for 'i'
    // are 8 bytes and require alignment.
    var wide = (ch != 105);
    wide &= (ch != 112);
    buf += wide && (buf % 8) ? 4 : 0;
    readEmAsmArgsArray.push(// Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
    ch == 112 ? HEAPU32[((buf) >> 2)] : ch == 105 ? HEAP32[((buf) >> 2)] : HEAPF64[((buf) >> 3)]);
    buf += wide ? 8 : 4;
  }
  return readEmAsmArgsArray;
};

var runEmAsmFunction = (code, sigPtr, argbuf) => {
  var args = readEmAsmArgs(sigPtr, argbuf);
  return ASM_CONSTS[code](...args);
};

var _emscripten_asm_const_double = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);

_emscripten_asm_const_double.sig = "dppp";

var _emscripten_asm_const_int = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);

_emscripten_asm_const_int.sig = "ippp";

var _emscripten_asm_const_ptr = (code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf);

_emscripten_asm_const_ptr.sig = "pppp";

var _emscripten_date_now = () => Date.now();

_emscripten_date_now.sig = "d";

var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;

var _proc_exit = code => {
  EXITSTATUS = code;
  if (!keepRuntimeAlive()) {
    Module["onExit"]?.(code);
    ABORT = true;
  }
  quit_(code, new ExitStatus(code));
};

_proc_exit.sig = "vi";

/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {
  EXITSTATUS = status;
  _proc_exit(status);
};

var _exit = exitJS;

Module["_exit"] = _exit;

_exit.sig = "vi";

var _emscripten_force_exit = status => {
  __emscripten_runtime_keepalive_clear();
  _exit(status);
};

_emscripten_force_exit.sig = "vi";

var _emscripten_get_device_pixel_ratio = () => (typeof devicePixelRatio == "number" && devicePixelRatio) || 1;

_emscripten_get_device_pixel_ratio.sig = "d";

var _emscripten_get_now = () => performance.now();

_emscripten_get_now.sig = "d";

var handleException = e => {
  // Certain exception types we do not treat as errors since they are used for
  // internal control flow.
  // 1. ExitStatus, which is thrown by exit()
  // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
  //    that wish to return to JS event loop.
  if (e instanceof ExitStatus || e == "unwind") {
    return EXITSTATUS;
  }
  quit_(1, e);
};

var maybeExit = () => {
  if (!keepRuntimeAlive()) {
    try {
      _exit(EXITSTATUS);
    } catch (e) {
      handleException(e);
    }
  }
};

var callUserCallback = func => {
  if (ABORT) {
    return;
  }
  try {
    func();
    maybeExit();
  } catch (e) {
    handleException(e);
  }
};

/** @param {number=} timeout */ var safeSetTimeout = (func, timeout) => setTimeout(() => {
  callUserCallback(func);
}, timeout);

var warnOnce = text => {
  warnOnce.shown ||= {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
    err(text);
  }
};

var Browser = {
  useWebGL: false,
  isFullscreen: false,
  pointerLock: false,
  moduleContextCreatedCallbacks: [],
  workers: [],
  init() {
    if (Browser.initted) return;
    Browser.initted = true;
    // Support for plugins that can process preloaded files. You can add more of these to
    // your app by creating and appending to preloadPlugins.
    // Each plugin is asked if it can handle a file based on the file's name. If it can,
    // it is given the file's raw data. When it is done, it calls a callback with the file's
    // (possibly modified) data. For example, a plugin might decompress a file, or it
    // might create some side data structure for use later (like an Image element, etc.).
    var imagePlugin = {};
    imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
      return !Module["noImageDecoding"] && /\.(jpg|jpeg|png|bmp|webp)$/i.test(name);
    };
    imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
      var b = new Blob([ byteArray ], {
        type: Browser.getMimetype(name)
      });
      if (b.size !== byteArray.length) {
        // Safari bug #118630
        // Safari's Blob can only take an ArrayBuffer
        b = new Blob([ (new Uint8Array(byteArray)).buffer ], {
          type: Browser.getMimetype(name)
        });
      }
      var url = URL.createObjectURL(b);
      var img = new Image;
      img.onload = () => {
        var canvas = /** @type {!HTMLCanvasElement} */ (document.createElement("canvas"));
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        preloadedImages[name] = canvas;
        URL.revokeObjectURL(url);
        onload?.(byteArray);
      };
      img.onerror = event => {
        err(`Image ${url} could not be decoded`);
        onerror?.();
      };
      img.src = url;
    };
    preloadPlugins.push(imagePlugin);
    var audioPlugin = {};
    audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
      return !Module["noAudioDecoding"] && name.substr(-4) in {
        ".ogg": 1,
        ".wav": 1,
        ".mp3": 1
      };
    };
    audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
      var done = false;
      function finish(audio) {
        if (done) return;
        done = true;
        preloadedAudios[name] = audio;
        onload?.(byteArray);
      }
      var b = new Blob([ byteArray ], {
        type: Browser.getMimetype(name)
      });
      var url = URL.createObjectURL(b);
      // XXX we never revoke this!
      var audio = new Audio;
      audio.addEventListener("canplaythrough", () => finish(audio), false);
      // use addEventListener due to chromium bug 124926
      audio.onerror = function audio_onerror(event) {
        if (done) return;
        err(`warning: browser could not fully decode audio ${name}, trying slower base64 approach`);
        function encode64(data) {
          var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
          var PAD = "=";
          var ret = "";
          var leftchar = 0;
          var leftbits = 0;
          for (var i = 0; i < data.length; i++) {
            leftchar = (leftchar << 8) | data[i];
            leftbits += 8;
            while (leftbits >= 6) {
              var curr = (leftchar >> (leftbits - 6)) & 63;
              leftbits -= 6;
              ret += BASE[curr];
            }
          }
          if (leftbits == 2) {
            ret += BASE[(leftchar & 3) << 4];
            ret += PAD + PAD;
          } else if (leftbits == 4) {
            ret += BASE[(leftchar & 15) << 2];
            ret += PAD;
          }
          return ret;
        }
        audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
        finish(audio);
      };
      // we don't wait for confirmation this worked - but it's worth trying
      audio.src = url;
      // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
      safeSetTimeout(() => {
        finish(audio);
      }, // try to use it even though it is not necessarily ready to play
      1e4);
    };
    preloadPlugins.push(audioPlugin);
    // Canvas event setup
    function pointerLockChange() {
      Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"];
    }
    var canvas = Module["canvas"];
    if (canvas) {
      // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
      // Module['forcedAspectRatio'] = 4 / 3;
      canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (() => {});
      canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (() => {});
      // no-op if function does not exist
      canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
      document.addEventListener("pointerlockchange", pointerLockChange, false);
      document.addEventListener("mozpointerlockchange", pointerLockChange, false);
      document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
      document.addEventListener("mspointerlockchange", pointerLockChange, false);
      if (Module["elementPointerLock"]) {
        canvas.addEventListener("click", ev => {
          if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
            Module["canvas"].requestPointerLock();
            ev.preventDefault();
          }
        }, false);
      }
    }
  },
  createContext(/** @type {HTMLCanvasElement} */ canvas, useWebGL, setInModule, webGLContextAttributes) {
    if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
    // no need to recreate GL context if it's already been created for this canvas.
    var ctx;
    var contextHandle;
    if (useWebGL) {
      // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
      var contextAttributes = {
        antialias: false,
        alpha: false,
        majorVersion: (typeof WebGL2RenderingContext != "undefined") ? 2 : 1
      };
      if (webGLContextAttributes) {
        for (var attribute in webGLContextAttributes) {
          contextAttributes[attribute] = webGLContextAttributes[attribute];
        }
      }
      // This check of existence of GL is here to satisfy Closure compiler, which yells if variable GL is referenced below but GL object is not
      // actually compiled in because application is not doing any GL operations. TODO: Ideally if GL is not being used, this function
      // Browser.createContext() should not even be emitted.
      if (typeof GL != "undefined") {
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {
          ctx = GL.getContext(contextHandle).GLctx;
        }
      }
    } else {
      ctx = canvas.getContext("2d");
    }
    if (!ctx) return null;
    if (setInModule) {
      Module.ctx = ctx;
      if (useWebGL) GL.makeContextCurrent(contextHandle);
      Browser.useWebGL = useWebGL;
      Browser.moduleContextCreatedCallbacks.forEach(callback => callback());
      Browser.init();
    }
    return ctx;
  },
  fullscreenHandlersInstalled: false,
  lockPointer: undefined,
  resizeCanvas: undefined,
  requestFullscreen(lockPointer, resizeCanvas) {
    Browser.lockPointer = lockPointer;
    Browser.resizeCanvas = resizeCanvas;
    if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
    if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
    var canvas = Module["canvas"];
    function fullscreenChange() {
      Browser.isFullscreen = false;
      var canvasContainer = canvas.parentNode;
      if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
        canvas.exitFullscreen = Browser.exitFullscreen;
        if (Browser.lockPointer) canvas.requestPointerLock();
        Browser.isFullscreen = true;
        if (Browser.resizeCanvas) {
          Browser.setFullscreenCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      } else {
        // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
        canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
        canvasContainer.parentNode.removeChild(canvasContainer);
        if (Browser.resizeCanvas) {
          Browser.setWindowedCanvasSize();
        } else {
          Browser.updateCanvasDimensions(canvas);
        }
      }
      Module["onFullScreen"]?.(Browser.isFullscreen);
      Module["onFullscreen"]?.(Browser.isFullscreen);
    }
    if (!Browser.fullscreenHandlersInstalled) {
      Browser.fullscreenHandlersInstalled = true;
      document.addEventListener("fullscreenchange", fullscreenChange, false);
      document.addEventListener("mozfullscreenchange", fullscreenChange, false);
      document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
      document.addEventListener("MSFullscreenChange", fullscreenChange, false);
    }
    // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
    var canvasContainer = document.createElement("div");
    canvas.parentNode.insertBefore(canvasContainer, canvas);
    canvasContainer.appendChild(canvas);
    // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
    canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
    canvasContainer.requestFullscreen();
  },
  exitFullscreen() {
    // This is workaround for chrome. Trying to exit from fullscreen
    // not in fullscreen state will cause "TypeError: Document not active"
    // in chrome. See https://github.com/emscripten-core/emscripten/pull/8236
    if (!Browser.isFullscreen) {
      return false;
    }
    var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || (() => {});
    CFS.apply(document, []);
    return true;
  },
  safeSetTimeout(func, timeout) {
    // Legacy function, this is used by the SDL2 port so we need to keep it
    // around at least until that is updated.
    // See https://github.com/libsdl-org/SDL/pull/6304
    return safeSetTimeout(func, timeout);
  },
  getMimetype(name) {
    return {
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "bmp": "image/bmp",
      "ogg": "audio/ogg",
      "wav": "audio/wav",
      "mp3": "audio/mpeg"
    }[name.substr(name.lastIndexOf(".") + 1)];
  },
  getUserMedia(func) {
    window.getUserMedia ||= navigator["getUserMedia"] || navigator["mozGetUserMedia"];
    window.getUserMedia(func);
  },
  getMovementX(event) {
    return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
  },
  getMovementY(event) {
    return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
  },
  getMouseWheelDelta(event) {
    var delta = 0;
    switch (event.type) {
     case "DOMMouseScroll":
      // 3 lines make up a step
      delta = event.detail / 3;
      break;

     case "mousewheel":
      // 120 units make up a step
      delta = event.wheelDelta / 120;
      break;

     case "wheel":
      delta = event.deltaY;
      switch (event.deltaMode) {
       case 0:
        // DOM_DELTA_PIXEL: 100 pixels make up a step
        delta /= 100;
        break;

       case 1:
        // DOM_DELTA_LINE: 3 lines make up a step
        delta /= 3;
        break;

       case 2:
        // DOM_DELTA_PAGE: A page makes up 80 steps
        delta *= 80;
        break;

       default:
        throw "unrecognized mouse wheel delta mode: " + event.deltaMode;
      }
      break;

     default:
      throw "unrecognized mouse wheel event: " + event.type;
    }
    return delta;
  },
  mouseX: 0,
  mouseY: 0,
  mouseMovementX: 0,
  mouseMovementY: 0,
  touches: {},
  lastTouches: {},
  calculateMouseCoords(pageX, pageY) {
    // Calculate the movement based on the changes
    // in the coordinates.
    var rect = Module["canvas"].getBoundingClientRect();
    var cw = Module["canvas"].width;
    var ch = Module["canvas"].height;
    // Neither .scrollX or .pageXOffset are defined in a spec, but
    // we prefer .scrollX because it is currently in a spec draft.
    // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
    var scrollX = ((typeof window.scrollX != "undefined") ? window.scrollX : window.pageXOffset);
    var scrollY = ((typeof window.scrollY != "undefined") ? window.scrollY : window.pageYOffset);
    var adjustedX = pageX - (scrollX + rect.left);
    var adjustedY = pageY - (scrollY + rect.top);
    // the canvas might be CSS-scaled compared to its backbuffer;
    // SDL-using content will want mouse coordinates in terms
    // of backbuffer units.
    adjustedX = adjustedX * (cw / rect.width);
    adjustedY = adjustedY * (ch / rect.height);
    return {
      x: adjustedX,
      y: adjustedY
    };
  },
  setMouseCoords(pageX, pageY) {
    const {x, y} = Browser.calculateMouseCoords(pageX, pageY);
    Browser.mouseMovementX = x - Browser.mouseX;
    Browser.mouseMovementY = y - Browser.mouseY;
    Browser.mouseX = x;
    Browser.mouseY = y;
  },
  calculateMouseEvent(event) {
    // event should be mousemove, mousedown or mouseup
    if (Browser.pointerLock) {
      // When the pointer is locked, calculate the coordinates
      // based on the movement of the mouse.
      // Workaround for Firefox bug 764498
      if (event.type != "mousemove" && ("mozMovementX" in event)) {
        Browser.mouseMovementX = Browser.mouseMovementY = 0;
      } else {
        Browser.mouseMovementX = Browser.getMovementX(event);
        Browser.mouseMovementY = Browser.getMovementY(event);
      }
      // add the mouse delta to the current absolute mouse position
      Browser.mouseX += Browser.mouseMovementX;
      Browser.mouseY += Browser.mouseMovementY;
    } else {
      if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
        var touch = event.touch;
        if (touch === undefined) {
          return;
        }
        // the "touch" property is only defined in SDL
        var coords = Browser.calculateMouseCoords(touch.pageX, touch.pageY);
        if (event.type === "touchstart") {
          Browser.lastTouches[touch.identifier] = coords;
          Browser.touches[touch.identifier] = coords;
        } else if (event.type === "touchend" || event.type === "touchmove") {
          var last = Browser.touches[touch.identifier];
          last ||= coords;
          Browser.lastTouches[touch.identifier] = last;
          Browser.touches[touch.identifier] = coords;
        }
        return;
      }
      Browser.setMouseCoords(event.pageX, event.pageY);
    }
  },
  resizeListeners: [],
  updateResizeListeners() {
    var canvas = Module["canvas"];
    Browser.resizeListeners.forEach(listener => listener(canvas.width, canvas.height));
  },
  setCanvasSize(width, height, noUpdates) {
    var canvas = Module["canvas"];
    Browser.updateCanvasDimensions(canvas, width, height);
    if (!noUpdates) Browser.updateResizeListeners();
  },
  windowedWidth: 0,
  windowedHeight: 0,
  setFullscreenCanvasSize() {
    // check if SDL is available
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[((SDL.screen) >> 2)];
      flags = flags | 8388608;
      // set SDL_FULLSCREEN flag
      HEAP32[((SDL.screen) >> 2)] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  setWindowedCanvasSize() {
    // check if SDL is available
    if (typeof SDL != "undefined") {
      var flags = HEAPU32[((SDL.screen) >> 2)];
      flags = flags & ~8388608;
      // clear SDL_FULLSCREEN flag
      HEAP32[((SDL.screen) >> 2)] = flags;
    }
    Browser.updateCanvasDimensions(Module["canvas"]);
    Browser.updateResizeListeners();
  },
  updateCanvasDimensions(canvas, wNative, hNative) {
    if (wNative && hNative) {
      canvas.widthNative = wNative;
      canvas.heightNative = hNative;
    } else {
      wNative = canvas.widthNative;
      hNative = canvas.heightNative;
    }
    var w = wNative;
    var h = hNative;
    if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
      if (w / h < Module["forcedAspectRatio"]) {
        w = Math.round(h * Module["forcedAspectRatio"]);
      } else {
        h = Math.round(w / Module["forcedAspectRatio"]);
      }
    }
    if (((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode) && (typeof screen != "undefined")) {
      var factor = Math.min(screen.width / w, screen.height / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }
    if (Browser.resizeCanvas) {
      if (canvas.width != w) canvas.width = w;
      if (canvas.height != h) canvas.height = h;
      if (typeof canvas.style != "undefined") {
        canvas.style.removeProperty("width");
        canvas.style.removeProperty("height");
      }
    } else {
      if (canvas.width != wNative) canvas.width = wNative;
      if (canvas.height != hNative) canvas.height = hNative;
      if (typeof canvas.style != "undefined") {
        if (w != wNative || h != hNative) {
          canvas.style.setProperty("width", w + "px", "important");
          canvas.style.setProperty("height", h + "px", "important");
        } else {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");
        }
      }
    }
  }
};

var _emscripten_get_screen_size = (width, height) => {
  HEAP32[((width) >> 2)] = screen.width;
  HEAP32[((height) >> 2)] = screen.height;
};

_emscripten_get_screen_size.sig = "vpp";

var _emscripten_get_window_title = () => {
  var buflen = 256;
  if (!_emscripten_get_window_title.buffer) {
    _emscripten_get_window_title.buffer = _malloc(buflen);
  }
  stringToUTF8(document.title, _emscripten_get_window_title.buffer, buflen);
  return _emscripten_get_window_title.buffer;
};

_emscripten_get_window_title.sig = "p";

var GLctx;

var webgl_enable_ANGLE_instanced_arrays = ctx => {
  // Extension available in WebGL 1 from Firefox 26 and Google Chrome 30 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("ANGLE_instanced_arrays");
  // Because this extension is a core function in WebGL 2, assign the extension entry points in place of
  // where the core functions will reside in WebGL 2. This way the calling code can call these without
  // having to dynamically branch depending if running against WebGL 1 or WebGL 2.
  if (ext) {
    ctx["vertexAttribDivisor"] = (index, divisor) => ext["vertexAttribDivisorANGLE"](index, divisor);
    ctx["drawArraysInstanced"] = (mode, first, count, primcount) => ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
    ctx["drawElementsInstanced"] = (mode, count, type, indices, primcount) => ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
    return 1;
  }
};

var webgl_enable_OES_vertex_array_object = ctx => {
  // Extension available in WebGL 1 from Firefox 25 and WebKit 536.28/desktop Safari 6.0.3 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("OES_vertex_array_object");
  if (ext) {
    ctx["createVertexArray"] = () => ext["createVertexArrayOES"]();
    ctx["deleteVertexArray"] = vao => ext["deleteVertexArrayOES"](vao);
    ctx["bindVertexArray"] = vao => ext["bindVertexArrayOES"](vao);
    ctx["isVertexArray"] = vao => ext["isVertexArrayOES"](vao);
    return 1;
  }
};

var webgl_enable_WEBGL_draw_buffers = ctx => {
  // Extension available in WebGL 1 from Firefox 28 onwards. Core feature in WebGL 2.
  var ext = ctx.getExtension("WEBGL_draw_buffers");
  if (ext) {
    ctx["drawBuffers"] = (n, bufs) => ext["drawBuffersWEBGL"](n, bufs);
    return 1;
  }
};

var webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance = ctx => // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
!!(ctx.dibvbi = ctx.getExtension("WEBGL_draw_instanced_base_vertex_base_instance"));

var webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance = ctx => !!(ctx.mdibvbi = ctx.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance"));

var webgl_enable_EXT_polygon_offset_clamp = ctx => !!(ctx.extPolygonOffsetClamp = ctx.getExtension("EXT_polygon_offset_clamp"));

var webgl_enable_EXT_clip_control = ctx => !!(ctx.extClipControl = ctx.getExtension("EXT_clip_control"));

var webgl_enable_WEBGL_polygon_mode = ctx => !!(ctx.webglPolygonMode = ctx.getExtension("WEBGL_polygon_mode"));

var webgl_enable_WEBGL_multi_draw = ctx => !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));

var getEmscriptenSupportedExtensions = ctx => {
  // Restrict the list of advertised extensions to those that we actually
  // support.
  var supportedExtensions = [ // WebGL 1 extensions
  "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_disjoint_timer_query", "EXT_frag_depth", "EXT_shader_texture_lod", "EXT_sRGB", "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float", "OES_texture_half_float", "OES_texture_half_float_linear", "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_depth_texture", "WEBGL_draw_buffers", // WebGL 2 extensions
  "EXT_color_buffer_float", "EXT_conservative_depth", "EXT_disjoint_timer_query_webgl2", "EXT_texture_norm16", "NV_shader_noperspective_interpolation", "WEBGL_clip_cull_distance", // WebGL 1 and WebGL 2 extensions
  "EXT_clip_control", "EXT_color_buffer_half_float", "EXT_depth_clamp", "EXT_float_blend", "EXT_polygon_offset_clamp", "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc", "EXT_texture_filter_anisotropic", "KHR_parallel_shader_compile", "OES_texture_float_linear", "WEBGL_blend_func_extended", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_etc1", "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info", "WEBGL_debug_shaders", "WEBGL_lose_context", "WEBGL_multi_draw", "WEBGL_polygon_mode" ];
  // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
  return (ctx.getSupportedExtensions() || []).filter(ext => supportedExtensions.includes(ext));
};

var GL = {
  counter: 1,
  buffers: [],
  programs: [],
  framebuffers: [],
  renderbuffers: [],
  textures: [],
  shaders: [],
  vaos: [],
  contexts: [],
  offscreenCanvases: {},
  queries: [],
  samplers: [],
  transformFeedbacks: [],
  syncs: [],
  stringCache: {},
  stringiCache: {},
  unpackAlignment: 4,
  unpackRowLength: 0,
  recordError: errorCode => {
    if (!GL.lastError) {
      GL.lastError = errorCode;
    }
  },
  getNewId: table => {
    var ret = GL.counter++;
    for (var i = table.length; i < ret; i++) {
      table[i] = null;
    }
    return ret;
  },
  genObject: (n, buffers, createFunction, objectTable) => {
    for (var i = 0; i < n; i++) {
      var buffer = GLctx[createFunction]();
      var id = buffer && GL.getNewId(objectTable);
      if (buffer) {
        buffer.name = id;
        objectTable[id] = buffer;
      } else {
        GL.recordError(1282);
      }
      HEAP32[(((buffers) + (i * 4)) >> 2)] = id;
    }
  },
  getSource: (shader, count, string, length) => {
    var source = "";
    for (var i = 0; i < count; ++i) {
      var len = length ? HEAPU32[(((length) + (i * 4)) >> 2)] : undefined;
      source += UTF8ToString(HEAPU32[(((string) + (i * 4)) >> 2)], len);
    }
    return source;
  },
  createContext: (/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) => {
    // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL
    // context on a canvas, calling .getContext() will always return that
    // context independent of which 'webgl' or 'webgl2'
    // context version was passed. See:
    //   https://bugs.webkit.org/show_bug.cgi?id=222758
    // and:
    //   https://github.com/emscripten-core/emscripten/issues/13295.
    // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari
    // version field in above check.
    if (!canvas.getContextSafariWebGL2Fixed) {
      canvas.getContextSafariWebGL2Fixed = canvas.getContext;
      /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */ function fixedGetContext(ver, attrs) {
        var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
        return ((ver == "webgl") == (gl instanceof WebGLRenderingContext)) ? gl : null;
      }
      canvas.getContext = fixedGetContext;
    }
    var ctx = (webGLContextAttributes.majorVersion > 1) ? canvas.getContext("webgl2", webGLContextAttributes) : (canvas.getContext("webgl", webGLContextAttributes));
    // https://caniuse.com/#feat=webgl
    if (!ctx) return 0;
    var handle = GL.registerContext(ctx, webGLContextAttributes);
    return handle;
  },
  registerContext: (ctx, webGLContextAttributes) => {
    // without pthreads a context is just an integer ID
    var handle = GL.getNewId(GL.contexts);
    var context = {
      handle,
      attributes: webGLContextAttributes,
      version: webGLContextAttributes.majorVersion,
      GLctx: ctx
    };
    // Store the created context object so that we can access the context
    // given a canvas without having to pass the parameters again.
    if (ctx.canvas) ctx.canvas.GLctxObject = context;
    GL.contexts[handle] = context;
    if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
      GL.initExtensions(context);
    }
    return handle;
  },
  makeContextCurrent: contextHandle => {
    // Active Emscripten GL layer context object.
    GL.currentContext = GL.contexts[contextHandle];
    // Active WebGL context object.
    Module.ctx = GLctx = GL.currentContext?.GLctx;
    return !(contextHandle && !GLctx);
  },
  getContext: contextHandle => GL.contexts[contextHandle],
  deleteContext: contextHandle => {
    if (GL.currentContext === GL.contexts[contextHandle]) {
      GL.currentContext = null;
    }
    if (typeof JSEvents == "object") {
      // Release all JS event handlers on the DOM element that the GL context is
      // associated with since the context is now deleted.
      JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
    }
    // Make sure the canvas object no longer refers to the context object so
    // there are no GC surprises.
    if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) {
      GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
    }
    GL.contexts[contextHandle] = null;
  },
  initExtensions: context => {
    // If this function is called without a specific context object, init the
    // extensions of the currently active context.
    context ||= GL.currentContext;
    if (context.initExtensionsDone) return;
    context.initExtensionsDone = true;
    var GLctx = context.GLctx;
    // Detect the presence of a few extensions manually, ction GL interop
    // layer itself will need to know if they exist.
    // Extensions that are available in both WebGL 1 and WebGL 2
    webgl_enable_WEBGL_multi_draw(GLctx);
    webgl_enable_EXT_polygon_offset_clamp(GLctx);
    webgl_enable_EXT_clip_control(GLctx);
    webgl_enable_WEBGL_polygon_mode(GLctx);
    // Extensions that are only available in WebGL 1 (the calls will be no-ops
    // if called on a WebGL 2 context active)
    webgl_enable_ANGLE_instanced_arrays(GLctx);
    webgl_enable_OES_vertex_array_object(GLctx);
    webgl_enable_WEBGL_draw_buffers(GLctx);
    // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
    webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
    webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);
    // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
    // that's based on core APIs, and exposes only the queryCounterEXT()
    // entrypoint.
    if (context.version >= 2) {
      GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2");
    }
    // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
    // thus we look for the WebGL 1 version again if the WebGL 2 version
    // isn't present. https://bugzilla.mozilla.org/show_bug.cgi?id=1328882
    if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
      GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
    }
    getEmscriptenSupportedExtensions(GLctx).forEach(ext => {
      // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders
      // are not enabled by default.
      if (!ext.includes("lose_context") && !ext.includes("debug")) {
        // Call .getExtension() to enable that extension permanently.
        GLctx.getExtension(ext);
      }
    });
  }
};

var _emscripten_is_webgl_context_lost = contextHandle => !GL.contexts[contextHandle] || GL.contexts[contextHandle].GLctx.isContextLost();

// No context ~> lost context.
_emscripten_is_webgl_context_lost.sig = "ip";

var JSEvents = {
  removeAllEventListeners() {
    while (JSEvents.eventHandlers.length) {
      JSEvents._removeHandler(JSEvents.eventHandlers.length - 1);
    }
    JSEvents.deferredCalls = [];
  },
  inEventHandler: 0,
  deferredCalls: [],
  deferCall(targetFunction, precedence, argsList) {
    function arraysHaveEqualContent(arrA, arrB) {
      if (arrA.length != arrB.length) return false;
      for (var i in arrA) {
        if (arrA[i] != arrB[i]) return false;
      }
      return true;
    }
    // Test if the given call was already queued, and if so, don't add it again.
    for (var call of JSEvents.deferredCalls) {
      if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
        return;
      }
    }
    JSEvents.deferredCalls.push({
      targetFunction,
      precedence,
      argsList
    });
    JSEvents.deferredCalls.sort((x, y) => x.precedence < y.precedence);
  },
  removeDeferredCalls(targetFunction) {
    JSEvents.deferredCalls = JSEvents.deferredCalls.filter(call => call.targetFunction != targetFunction);
  },
  canPerformEventHandlerRequests() {
    if (navigator.userActivation) {
      // Verify against transient activation status from UserActivation API
      // whether it is possible to perform a request here without needing to defer. See
      // https://developer.mozilla.org/en-US/docs/Web/Security/User_activation#transient_activation
      // and https://caniuse.com/mdn-api_useractivation
      // At the time of writing, Firefox does not support this API: https://bugzilla.mozilla.org/show_bug.cgi?id=1791079
      return navigator.userActivation.isActive;
    }
    return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
  },
  runDeferredCalls() {
    if (!JSEvents.canPerformEventHandlerRequests()) {
      return;
    }
    var deferredCalls = JSEvents.deferredCalls;
    JSEvents.deferredCalls = [];
    for (var call of deferredCalls) {
      call.targetFunction(...call.argsList);
    }
  },
  eventHandlers: [],
  removeAllHandlersOnTarget: (target, eventTypeString) => {
    for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
      if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
        JSEvents._removeHandler(i--);
      }
    }
  },
  _removeHandler(i) {
    var h = JSEvents.eventHandlers[i];
    h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
    JSEvents.eventHandlers.splice(i, 1);
  },
  registerOrRemoveHandler(eventHandler) {
    if (!eventHandler.target) {
      return -4;
    }
    if (eventHandler.callbackfunc) {
      eventHandler.eventListenerFunc = function(event) {
        // Increment nesting count for the event handler.
        ++JSEvents.inEventHandler;
        JSEvents.currentEventHandler = eventHandler;
        // Process any old deferred calls the user has placed.
        JSEvents.runDeferredCalls();
        // Process the actual event, calls back to user C code handler.
        eventHandler.handlerFunc(event);
        // Process any new deferred calls that were placed right now from this event handler.
        JSEvents.runDeferredCalls();
        // Out of event handler - restore nesting count.
        --JSEvents.inEventHandler;
      };
      eventHandler.target.addEventListener(eventHandler.eventTypeString, eventHandler.eventListenerFunc, eventHandler.useCapture);
      JSEvents.eventHandlers.push(eventHandler);
    } else {
      for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
        if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
          JSEvents._removeHandler(i--);
        }
      }
    }
    return 0;
  },
  getNodeNameForTarget(target) {
    if (!target) return "";
    if (target == window) return "#window";
    if (target == screen) return "#screen";
    return target?.nodeName || "";
  },
  fullscreenEnabled() {
    return document.fullscreenEnabled || // Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitFullscreenEnabled.
    // TODO: If Safari at some point ships with unprefixed version, update the version check above.
    document.webkitFullscreenEnabled;
  }
};

var setLetterbox = (element, topBottom, leftRight) => {
  // Cannot use margin to specify letterboxes in FF or Chrome, since those ignore margins in fullscreen mode.
  element.style.paddingLeft = element.style.paddingRight = leftRight + "px";
  element.style.paddingTop = element.style.paddingBottom = topBottom + "px";
};

var maybeCStringToJsString = cString => cString > 2 ? UTF8ToString(cString) : cString;

/** @type {Object} */ var specialHTMLTargets = [ 0, typeof document != "undefined" ? document : 0, typeof window != "undefined" ? window : 0 ];

/** @suppress {duplicate } */ var findEventTarget = target => {
  target = maybeCStringToJsString(target);
  var domElement = specialHTMLTargets[target] || (typeof document != "undefined" ? document.querySelector(target) : undefined);
  return domElement;
};

var findCanvasEventTarget = findEventTarget;

var _emscripten_set_canvas_element_size = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  canvas.width = width;
  canvas.height = height;
  return 0;
};

_emscripten_set_canvas_element_size.sig = "ipii";

var _emscripten_get_canvas_element_size = (target, width, height) => {
  var canvas = findCanvasEventTarget(target);
  if (!canvas) return -4;
  HEAP32[((width) >> 2)] = canvas.width;
  HEAP32[((height) >> 2)] = canvas.height;
};

_emscripten_get_canvas_element_size.sig = "ippp";

var getCanvasElementSize = target => {
  var sp = stackSave();
  var w = stackAlloc(8);
  var h = w + 4;
  var targetInt = stringToUTF8OnStack(target.id);
  var ret = _emscripten_get_canvas_element_size(targetInt, w, h);
  var size = [ HEAP32[((w) >> 2)], HEAP32[((h) >> 2)] ];
  stackRestore(sp);
  return size;
};

var setCanvasElementSize = (target, width, height) => {
  if (!target.controlTransferredOffscreen) {
    target.width = width;
    target.height = height;
  } else {
    // This function is being called from high-level JavaScript code instead of asm.js/Wasm,
    // and it needs to synchronously proxy over to another thread, so marshal the string onto the heap to do the call.
    var sp = stackSave();
    var targetInt = stringToUTF8OnStack(target.id);
    _emscripten_set_canvas_element_size(targetInt, width, height);
    stackRestore(sp);
  }
};

var registerRestoreOldStyle = canvas => {
  var canvasSize = getCanvasElementSize(canvas);
  var oldWidth = canvasSize[0];
  var oldHeight = canvasSize[1];
  var oldCssWidth = canvas.style.width;
  var oldCssHeight = canvas.style.height;
  var oldBackgroundColor = canvas.style.backgroundColor;
  // Chrome reads color from here.
  var oldDocumentBackgroundColor = document.body.style.backgroundColor;
  // IE11 reads color from here.
  // Firefox always has black background color.
  var oldPaddingLeft = canvas.style.paddingLeft;
  // Chrome, FF, Safari
  var oldPaddingRight = canvas.style.paddingRight;
  var oldPaddingTop = canvas.style.paddingTop;
  var oldPaddingBottom = canvas.style.paddingBottom;
  var oldMarginLeft = canvas.style.marginLeft;
  // IE11
  var oldMarginRight = canvas.style.marginRight;
  var oldMarginTop = canvas.style.marginTop;
  var oldMarginBottom = canvas.style.marginBottom;
  var oldDocumentBodyMargin = document.body.style.margin;
  var oldDocumentOverflow = document.documentElement.style.overflow;
  // Chrome, Firefox
  var oldDocumentScroll = document.body.scroll;
  // IE
  var oldImageRendering = canvas.style.imageRendering;
  function restoreOldStyle() {
    var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement) {
      document.removeEventListener("fullscreenchange", restoreOldStyle);
      // Unprefixed Fullscreen API shipped in Chromium 71 (https://bugs.chromium.org/p/chromium/issues/detail?id=383813)
      // As of Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitfullscreenchange. TODO: revisit this check once Safari ships unprefixed version.
      document.removeEventListener("webkitfullscreenchange", restoreOldStyle);
      setCanvasElementSize(canvas, oldWidth, oldHeight);
      canvas.style.width = oldCssWidth;
      canvas.style.height = oldCssHeight;
      canvas.style.backgroundColor = oldBackgroundColor;
      // Chrome
      // IE11 hack: assigning 'undefined' or an empty string to document.body.style.backgroundColor has no effect, so first assign back the default color
      // before setting the undefined value. Setting undefined value is also important, or otherwise we would later treat that as something that the user
      // had explicitly set so subsequent fullscreen transitions would not set background color properly.
      if (!oldDocumentBackgroundColor) document.body.style.backgroundColor = "white";
      document.body.style.backgroundColor = oldDocumentBackgroundColor;
      // IE11
      canvas.style.paddingLeft = oldPaddingLeft;
      // Chrome, FF, Safari
      canvas.style.paddingRight = oldPaddingRight;
      canvas.style.paddingTop = oldPaddingTop;
      canvas.style.paddingBottom = oldPaddingBottom;
      canvas.style.marginLeft = oldMarginLeft;
      // IE11
      canvas.style.marginRight = oldMarginRight;
      canvas.style.marginTop = oldMarginTop;
      canvas.style.marginBottom = oldMarginBottom;
      document.body.style.margin = oldDocumentBodyMargin;
      document.documentElement.style.overflow = oldDocumentOverflow;
      // Chrome, Firefox
      document.body.scroll = oldDocumentScroll;
      // IE
      canvas.style.imageRendering = oldImageRendering;
      if (canvas.GLctxObject) canvas.GLctxObject.GLctx.viewport(0, 0, oldWidth, oldHeight);
      if (currentFullscreenStrategy.canvasResizedCallback) {
        getWasmTableEntry(currentFullscreenStrategy.canvasResizedCallback)(37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData);
      }
    }
  }
  document.addEventListener("fullscreenchange", restoreOldStyle);
  // Unprefixed Fullscreen API shipped in Chromium 71 (https://bugs.chromium.org/p/chromium/issues/detail?id=383813)
  // As of Safari 13.0.3 on macOS Catalina 10.15.1 still ships with prefixed webkitfullscreenchange. TODO: revisit this check once Safari ships unprefixed version.
  document.addEventListener("webkitfullscreenchange", restoreOldStyle);
  return restoreOldStyle;
};

var getBoundingClientRect = e => specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
  "left": 0,
  "top": 0
};

var JSEvents_resizeCanvasForFullscreen = (target, strategy) => {
  var restoreOldStyle = registerRestoreOldStyle(target);
  var cssWidth = strategy.softFullscreen ? innerWidth : screen.width;
  var cssHeight = strategy.softFullscreen ? innerHeight : screen.height;
  var rect = getBoundingClientRect(target);
  var windowedCssWidth = rect.width;
  var windowedCssHeight = rect.height;
  var canvasSize = getCanvasElementSize(target);
  var windowedRttWidth = canvasSize[0];
  var windowedRttHeight = canvasSize[1];
  if (strategy.scaleMode == 3) {
    setLetterbox(target, (cssHeight - windowedCssHeight) / 2, (cssWidth - windowedCssWidth) / 2);
    cssWidth = windowedCssWidth;
    cssHeight = windowedCssHeight;
  } else if (strategy.scaleMode == 2) {
    if (cssWidth * windowedRttHeight < windowedRttWidth * cssHeight) {
      var desiredCssHeight = windowedRttHeight * cssWidth / windowedRttWidth;
      setLetterbox(target, (cssHeight - desiredCssHeight) / 2, 0);
      cssHeight = desiredCssHeight;
    } else {
      var desiredCssWidth = windowedRttWidth * cssHeight / windowedRttHeight;
      setLetterbox(target, 0, (cssWidth - desiredCssWidth) / 2);
      cssWidth = desiredCssWidth;
    }
  }
  // If we are adding padding, must choose a background color or otherwise Chrome will give the
  // padding a default white color. Do it only if user has not customized their own background color.
  target.style.backgroundColor ||= "black";
  // IE11 does the same, but requires the color to be set in the document body.
  document.body.style.backgroundColor ||= "black";
  // IE11
  // Firefox always shows black letterboxes independent of style color.
  target.style.width = cssWidth + "px";
  target.style.height = cssHeight + "px";
  if (strategy.filteringMode == 1) {
    target.style.imageRendering = "optimizeSpeed";
    target.style.imageRendering = "-moz-crisp-edges";
    target.style.imageRendering = "-o-crisp-edges";
    target.style.imageRendering = "-webkit-optimize-contrast";
    target.style.imageRendering = "optimize-contrast";
    target.style.imageRendering = "crisp-edges";
    target.style.imageRendering = "pixelated";
  }
  var dpiScale = (strategy.canvasResolutionScaleMode == 2) ? devicePixelRatio : 1;
  if (strategy.canvasResolutionScaleMode != 0) {
    var newWidth = (cssWidth * dpiScale) | 0;
    var newHeight = (cssHeight * dpiScale) | 0;
    setCanvasElementSize(target, newWidth, newHeight);
    if (target.GLctxObject) target.GLctxObject.GLctx.viewport(0, 0, newWidth, newHeight);
  }
  return restoreOldStyle;
};

var JSEvents_requestFullscreen = (target, strategy) => {
  // EMSCRIPTEN_FULLSCREEN_SCALE_DEFAULT + EMSCRIPTEN_FULLSCREEN_CANVAS_SCALE_NONE is a mode where no extra logic is performed to the DOM elements.
  if (strategy.scaleMode != 0 || strategy.canvasResolutionScaleMode != 0) {
    JSEvents_resizeCanvasForFullscreen(target, strategy);
  }
  if (target.requestFullscreen) {
    target.requestFullscreen();
  } else if (target.webkitRequestFullscreen) {
    target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    return JSEvents.fullscreenEnabled() ? -3 : -1;
  }
  currentFullscreenStrategy = strategy;
  if (strategy.canvasResizedCallback) {
    getWasmTableEntry(strategy.canvasResizedCallback)(37, 0, strategy.canvasResizedCallbackUserData);
  }
  return 0;
};

var doRequestFullscreen = (target, strategy) => {
  if (!JSEvents.fullscreenEnabled()) return -1;
  target = findEventTarget(target);
  if (!target) return -4;
  if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
    return -3;
  }
  // Queue this function call if we're not currently in an event handler and
  // the user saw it appropriate to do so.
  if (!JSEvents.canPerformEventHandlerRequests()) {
    if (strategy.deferUntilInEventHandler) {
      JSEvents.deferCall(JSEvents_requestFullscreen, 1, /* priority over pointer lock */ [ target, strategy ]);
      return 1;
    }
    return -2;
  }
  return JSEvents_requestFullscreen(target, strategy);
};

var _emscripten_request_fullscreen = (target, deferUntilInEventHandler) => {
  var strategy = {
    // These options perform no added logic, but just bare request fullscreen.
    scaleMode: 0,
    canvasResolutionScaleMode: 0,
    filteringMode: 0,
    deferUntilInEventHandler,
    canvasResizedCallbackTargetThread: 2
  };
  return doRequestFullscreen(target, strategy);
};

_emscripten_request_fullscreen.sig = "ipi";

var getHeapMax = () => // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
// full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
// for any code that deals with heap sizes, which would require special
// casing all heap size related code to treat 0 specially.
2147483648;

var growMemory = size => {
  var b = wasmMemory.buffer;
  var pages = ((size - b.byteLength + 65535) / 65536) | 0;
  try {
    // round size grow request up to wasm page size (fixed 64KB per spec)
    wasmMemory.grow(pages);
    // .grow() takes a delta compared to the previous size
    updateMemoryViews();
    return 1;
  } /*success*/ catch (e) {}
};

// implicit 0 return to save code size (caller will cast "undefined" into 0
// anyhow)
var _emscripten_resize_heap = requestedSize => {
  var oldSize = HEAPU8.length;
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0;
  // With multithreaded builds, races can happen (another thread might increase the size
  // in between), so return a failure, and let the caller retry.
  // Memory resize rules:
  // 1.  Always increase heap size to at least the requested size, rounded up
  //     to next page multiple.
  // 2a. If MEMORY_GROWTH_LINEAR_STEP == -1, excessively resize the heap
  //     geometrically: increase the heap size according to
  //     MEMORY_GROWTH_GEOMETRIC_STEP factor (default +20%), At most
  //     overreserve by MEMORY_GROWTH_GEOMETRIC_CAP bytes (default 96MB).
  // 2b. If MEMORY_GROWTH_LINEAR_STEP != -1, excessively resize the heap
  //     linearly: increase the heap size by at least
  //     MEMORY_GROWTH_LINEAR_STEP bytes.
  // 3.  Max size for the heap is capped at 2048MB-WASM_PAGE_SIZE, or by
  //     MAXIMUM_MEMORY, or by ASAN limit, depending on which is smallest
  // 4.  If we were unable to allocate as much memory, it may be due to
  //     over-eager decision to excessively reserve due to (3) above.
  //     Hence if an allocation fails, cut down on the amount of excess
  //     growth, in an attempt to succeed to perform a smaller allocation.
  // A limit is set for how much we can grow. We should not exceed that
  // (the wasm binary specifies it, so if we tried, we'd fail anyhow).
  var maxHeapSize = getHeapMax();
  if (requestedSize > maxHeapSize) {
    return false;
  }
  // Loop through potential heap size increases. If we attempt a too eager
  // reservation that fails, cut down on the attempted size and reserve a
  // smaller bump instead. (max 3 times, chosen somewhat arbitrarily)
  for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
    var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
    // ensure geometric growth
    // but limit overreserving (default to capping at +96MB overgrowth at most)
    overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
    var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
    var replacement = growMemory(newSize);
    if (replacement) {
      return true;
    }
  }
  return false;
};

_emscripten_resize_heap.sig = "ip";

var registerKeyEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  JSEvents.keyEvent ||= _malloc(160);
  var keyEventHandlerFunc = e => {
    var keyEventData = JSEvents.keyEvent;
    HEAPF64[((keyEventData) >> 3)] = e.timeStamp;
    var idx = ((keyEventData) >> 2);
    HEAP32[idx + 2] = e.location;
    HEAP8[keyEventData + 12] = e.ctrlKey;
    HEAP8[keyEventData + 13] = e.shiftKey;
    HEAP8[keyEventData + 14] = e.altKey;
    HEAP8[keyEventData + 15] = e.metaKey;
    HEAP8[keyEventData + 16] = e.repeat;
    HEAP32[idx + 5] = e.charCode;
    HEAP32[idx + 6] = e.keyCode;
    HEAP32[idx + 7] = e.which;
    stringToUTF8(e.key || "", keyEventData + 32, 32);
    stringToUTF8(e.code || "", keyEventData + 64, 32);
    stringToUTF8(e.char || "", keyEventData + 96, 32);
    stringToUTF8(e.locale || "", keyEventData + 128, 32);
    if (getWasmTableEntry(callbackfunc)(eventTypeId, keyEventData, userData)) e.preventDefault();
  };
  var eventHandler = {
    target: findEventTarget(target),
    eventTypeString,
    callbackfunc,
    handlerFunc: keyEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_keydown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);

_emscripten_set_keydown_callback_on_thread.sig = "ippipp";

var _emscripten_set_keypress_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, "keypress", targetThread);

_emscripten_set_keypress_callback_on_thread.sig = "ippipp";

var _emscripten_set_keyup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);

_emscripten_set_keyup_callback_on_thread.sig = "ippipp";

var _emscripten_set_main_loop_timing = (mode, value) => {
  MainLoop.timingMode = mode;
  MainLoop.timingValue = value;
  if (!MainLoop.func) {
    return 1;
  }
  // Return non-zero on failure, can't set timing mode when there is no main loop.
  if (!MainLoop.running) {
    MainLoop.running = true;
  }
  if (mode == 0) {
    MainLoop.scheduler = function MainLoop_scheduler_setTimeout() {
      var timeUntilNextTick = Math.max(0, MainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
      setTimeout(MainLoop.runner, timeUntilNextTick);
    };
    // doing this each time means that on exception, we stop
    MainLoop.method = "timeout";
  } else if (mode == 1) {
    MainLoop.scheduler = function MainLoop_scheduler_rAF() {
      MainLoop.requestAnimationFrame(MainLoop.runner);
    };
    MainLoop.method = "rAF";
  } else if (mode == 2) {
    if (typeof MainLoop.setImmediate == "undefined") {
      if (typeof setImmediate == "undefined") {
        // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
        var setImmediates = [];
        var emscriptenMainLoopMessageId = "setimmediate";
        /** @param {Event} event */ var MainLoop_setImmediate_messageHandler = event => {
          // When called in current thread or Worker, the main loop ID is structured slightly different to accommodate for --proxy-to-worker runtime listening to Worker events,
          // so check for both cases.
          if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
            event.stopPropagation();
            setImmediates.shift()();
          }
        };
        addEventListener("message", MainLoop_setImmediate_messageHandler, true);
        MainLoop.setImmediate = /** @type{function(function(): ?, ...?): number} */ (func => {
          setImmediates.push(func);
          if (ENVIRONMENT_IS_WORKER) {
            Module["setImmediates"] ??= [];
            Module["setImmediates"].push(func);
            postMessage({
              target: emscriptenMainLoopMessageId
            });
          } else // In --proxy-to-worker, route the message via proxyClient.js
          postMessage(emscriptenMainLoopMessageId, "*");
        });
      } else {
        MainLoop.setImmediate = setImmediate;
      }
    }
    MainLoop.scheduler = function MainLoop_scheduler_setImmediate() {
      MainLoop.setImmediate(MainLoop.runner);
    };
    MainLoop.method = "immediate";
  }
  return 0;
};

_emscripten_set_main_loop_timing.sig = "iii";

var MainLoop = {
  running: false,
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  preMainLoop: [],
  postMainLoop: [],
  pause() {
    MainLoop.scheduler = null;
    // Incrementing this signals the previous main loop that it's now become old, and it must return.
    MainLoop.currentlyRunningMainloop++;
  },
  resume() {
    MainLoop.currentlyRunningMainloop++;
    var timingMode = MainLoop.timingMode;
    var timingValue = MainLoop.timingValue;
    var func = MainLoop.func;
    MainLoop.func = null;
    // do not set timing and call scheduler, we will do it on the next lines
    setMainLoop(func, 0, false, MainLoop.arg, true);
    _emscripten_set_main_loop_timing(timingMode, timingValue);
    MainLoop.scheduler();
  },
  updateStatus() {
    if (Module["setStatus"]) {
      var message = Module["statusMessage"] || "Please wait...";
      var remaining = MainLoop.remainingBlockers ?? 0;
      var expected = MainLoop.expectedBlockers ?? 0;
      if (remaining) {
        if (remaining < expected) {
          Module["setStatus"](`{message} ({expected - remaining}/{expected})`);
        } else {
          Module["setStatus"](message);
        }
      } else {
        Module["setStatus"]("");
      }
    }
  },
  init() {
    Module["preMainLoop"] && MainLoop.preMainLoop.push(Module["preMainLoop"]);
    Module["postMainLoop"] && MainLoop.postMainLoop.push(Module["postMainLoop"]);
  },
  runIter(func) {
    if (ABORT) return;
    for (var pre of MainLoop.preMainLoop) {
      if (pre() === false) {
        return;
      }
    }
    callUserCallback(func);
    for (var post of MainLoop.postMainLoop) {
      post();
    }
  },
  nextRAF: 0,
  fakeRequestAnimationFrame(func) {
    // try to keep 60fps between calls to here
    var now = Date.now();
    if (MainLoop.nextRAF === 0) {
      MainLoop.nextRAF = now + 1e3 / 60;
    } else {
      while (now + 2 >= MainLoop.nextRAF) {
        // fudge a little, to avoid timer jitter causing us to do lots of delay:0
        MainLoop.nextRAF += 1e3 / 60;
      }
    }
    var delay = Math.max(MainLoop.nextRAF - now, 0);
    setTimeout(func, delay);
  },
  requestAnimationFrame(func) {
    if (typeof requestAnimationFrame == "function") {
      requestAnimationFrame(func);
      return;
    }
    var RAF = MainLoop.fakeRequestAnimationFrame;
    RAF(func);
  }
};

/**
     * @param {number=} arg
     * @param {boolean=} noSetTiming
     */ var setMainLoop = (iterFunc, fps, simulateInfiniteLoop, arg, noSetTiming) => {
  MainLoop.func = iterFunc;
  MainLoop.arg = arg;
  var thisMainLoopId = MainLoop.currentlyRunningMainloop;
  function checkIsRunning() {
    if (thisMainLoopId < MainLoop.currentlyRunningMainloop) {
      maybeExit();
      return false;
    }
    return true;
  }
  // We create the loop runner here but it is not actually running until
  // _emscripten_set_main_loop_timing is called (which might happen a
  // later time).  This member signifies that the current runner has not
  // yet been started so that we can call runtimeKeepalivePush when it
  // gets it timing set for the first time.
  MainLoop.running = false;
  MainLoop.runner = function MainLoop_runner() {
    if (ABORT) return;
    if (MainLoop.queue.length > 0) {
      var start = Date.now();
      var blocker = MainLoop.queue.shift();
      blocker.func(blocker.arg);
      if (MainLoop.remainingBlockers) {
        var remaining = MainLoop.remainingBlockers;
        var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
        if (blocker.counted) {
          MainLoop.remainingBlockers = next;
        } else {
          // not counted, but move the progress along a tiny bit
          next = next + .5;
          // do not steal all the next one's progress
          MainLoop.remainingBlockers = (8 * remaining + next) / 9;
        }
      }
      MainLoop.updateStatus();
      // catches pause/resume main loop from blocker execution
      if (!checkIsRunning()) return;
      setTimeout(MainLoop.runner, 0);
      return;
    }
    // catch pauses from non-main loop sources
    if (!checkIsRunning()) return;
    // Implement very basic swap interval control
    MainLoop.currentFrameNumber = MainLoop.currentFrameNumber + 1 | 0;
    if (MainLoop.timingMode == 1 && MainLoop.timingValue > 1 && MainLoop.currentFrameNumber % MainLoop.timingValue != 0) {
      // Not the scheduled time to render this frame - skip.
      MainLoop.scheduler();
      return;
    } else if (MainLoop.timingMode == 0) {
      MainLoop.tickStartTime = _emscripten_get_now();
    }
    MainLoop.runIter(iterFunc);
    // catch pauses from the main loop itself
    if (!checkIsRunning()) return;
    MainLoop.scheduler();
  };
  if (!noSetTiming) {
    if (fps && fps > 0) {
      _emscripten_set_main_loop_timing(0, 1e3 / fps);
    } else {
      // Do rAF by rendering each frame (no decimating)
      _emscripten_set_main_loop_timing(1, 1);
    }
    MainLoop.scheduler();
  }
  if (simulateInfiniteLoop) {
    throw "unwind";
  }
};

var _emscripten_set_main_loop_arg = (func, arg, fps, simulateInfiniteLoop) => {
  var iterFunc = () => getWasmTableEntry(func)(arg);
  setMainLoop(iterFunc, fps, simulateInfiniteLoop, arg);
};

_emscripten_set_main_loop_arg.sig = "vppii";

var fillMouseEventData = (eventStruct, e, target) => {
  HEAPF64[((eventStruct) >> 3)] = e.timeStamp;
  var idx = ((eventStruct) >> 2);
  HEAP32[idx + 2] = e.screenX;
  HEAP32[idx + 3] = e.screenY;
  HEAP32[idx + 4] = e.clientX;
  HEAP32[idx + 5] = e.clientY;
  HEAP8[eventStruct + 24] = e.ctrlKey;
  HEAP8[eventStruct + 25] = e.shiftKey;
  HEAP8[eventStruct + 26] = e.altKey;
  HEAP8[eventStruct + 27] = e.metaKey;
  HEAP16[idx * 2 + 14] = e.button;
  HEAP16[idx * 2 + 15] = e.buttons;
  HEAP32[idx + 8] = e["movementX"];
  HEAP32[idx + 9] = e["movementY"];
  // Note: rect contains doubles (truncated to placate SAFE_HEAP, which is the same behaviour when writing to HEAP32 anyway)
  var rect = getBoundingClientRect(target);
  HEAP32[idx + 10] = e.clientX - (rect.left | 0);
  HEAP32[idx + 11] = e.clientY - (rect.top | 0);
};

var registerMouseEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  JSEvents.mouseEvent ||= _malloc(64);
  target = findEventTarget(target);
  var mouseEventHandlerFunc = (e = event) => {
    // TODO: Make this access thread safe, or this could update live while app is reading it.
    fillMouseEventData(JSEvents.mouseEvent, e, target);
    if (getWasmTableEntry(callbackfunc)(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
    // Mouse move events do not allow fullscreen/pointer lock requests to be handled in them!
    eventTypeString,
    callbackfunc,
    handlerFunc: mouseEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_mousedown_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);

_emscripten_set_mousedown_callback_on_thread.sig = "ippipp";

var _emscripten_set_mouseenter_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, "mouseenter", targetThread);

_emscripten_set_mouseenter_callback_on_thread.sig = "ippipp";

var _emscripten_set_mouseleave_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, "mouseleave", targetThread);

_emscripten_set_mouseleave_callback_on_thread.sig = "ippipp";

var _emscripten_set_mousemove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);

_emscripten_set_mousemove_callback_on_thread.sig = "ippipp";

var _emscripten_set_mouseup_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);

_emscripten_set_mouseup_callback_on_thread.sig = "ippipp";

var registerTouchEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  JSEvents.touchEvent ||= _malloc(1552);
  target = findEventTarget(target);
  var touchEventHandlerFunc = e => {
    var t, touches = {}, et = e.touches;
    // To ease marshalling different kinds of touches that browser reports (all touches are listed in e.touches,
    // only changed touches in e.changedTouches, and touches on target at a.targetTouches), mark a boolean in
    // each Touch object so that we can later loop only once over all touches we see to marshall over to Wasm.
    for (let t of et) {
      // Browser might recycle the generated Touch objects between each frame (Firefox on Android), so reset any
      // changed/target states we may have set from previous frame.
      t.isChanged = t.onTarget = 0;
      touches[t.identifier] = t;
    }
    // Mark which touches are part of the changedTouches list.
    for (let t of e.changedTouches) {
      t.isChanged = 1;
      touches[t.identifier] = t;
    }
    // Mark which touches are part of the targetTouches list.
    for (let t of e.targetTouches) {
      touches[t.identifier].onTarget = 1;
    }
    var touchEvent = JSEvents.touchEvent;
    HEAPF64[((touchEvent) >> 3)] = e.timeStamp;
    HEAP8[touchEvent + 12] = e.ctrlKey;
    HEAP8[touchEvent + 13] = e.shiftKey;
    HEAP8[touchEvent + 14] = e.altKey;
    HEAP8[touchEvent + 15] = e.metaKey;
    var idx = touchEvent + 16;
    var targetRect = getBoundingClientRect(target);
    var numTouches = 0;
    for (let t of Object.values(touches)) {
      var idx32 = ((idx) >> 2);
      // Pre-shift the ptr to index to HEAP32 to save code size
      HEAP32[idx32 + 0] = t.identifier;
      HEAP32[idx32 + 1] = t.screenX;
      HEAP32[idx32 + 2] = t.screenY;
      HEAP32[idx32 + 3] = t.clientX;
      HEAP32[idx32 + 4] = t.clientY;
      HEAP32[idx32 + 5] = t.pageX;
      HEAP32[idx32 + 6] = t.pageY;
      HEAP8[idx + 28] = t.isChanged;
      HEAP8[idx + 29] = t.onTarget;
      HEAP32[idx32 + 8] = t.clientX - (targetRect.left | 0);
      HEAP32[idx32 + 9] = t.clientY - (targetRect.top | 0);
      idx += 48;
      if (++numTouches > 31) {
        break;
      }
    }
    HEAP32[(((touchEvent) + (8)) >> 2)] = numTouches;
    if (getWasmTableEntry(callbackfunc)(eventTypeId, touchEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: eventTypeString == "touchstart" || eventTypeString == "touchend",
    eventTypeString,
    callbackfunc,
    handlerFunc: touchEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_touchcancel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, "touchcancel", targetThread);

_emscripten_set_touchcancel_callback_on_thread.sig = "ippipp";

var _emscripten_set_touchend_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, "touchend", targetThread);

_emscripten_set_touchend_callback_on_thread.sig = "ippipp";

var _emscripten_set_touchmove_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, "touchmove", targetThread);

_emscripten_set_touchmove_callback_on_thread.sig = "ippipp";

var _emscripten_set_touchstart_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, "touchstart", targetThread);

_emscripten_set_touchstart_callback_on_thread.sig = "ippipp";

var fillVisibilityChangeEventData = eventStruct => {
  var visibilityStates = [ "hidden", "visible", "prerender", "unloaded" ];
  var visibilityState = visibilityStates.indexOf(document.visibilityState);
  // Assigning a boolean to HEAP32 with expected type coercion.
  /** @suppress{checkTypes} */ HEAP8[eventStruct] = document.hidden;
  HEAP32[(((eventStruct) + (4)) >> 2)] = visibilityState;
};

var registerVisibilityChangeEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  JSEvents.visibilityChangeEvent ||= _malloc(8);
  var visibilityChangeEventHandlerFunc = (e = event) => {
    var visibilityChangeEvent = JSEvents.visibilityChangeEvent;
    fillVisibilityChangeEventData(visibilityChangeEvent);
    if (getWasmTableEntry(callbackfunc)(eventTypeId, visibilityChangeEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    eventTypeString,
    callbackfunc,
    handlerFunc: visibilityChangeEventHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_visibilitychange_callback_on_thread = (userData, useCapture, callbackfunc, targetThread) => {
  if (!specialHTMLTargets[1]) {
    return -4;
  }
  return registerVisibilityChangeEventCallback(specialHTMLTargets[1], userData, useCapture, callbackfunc, 21, "visibilitychange", targetThread);
};

_emscripten_set_visibilitychange_callback_on_thread.sig = "ipipp";

var registerWebGlEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  var webGlEventHandlerFunc = (e = event) => {
    if (getWasmTableEntry(callbackfunc)(eventTypeId, 0, userData)) e.preventDefault();
  };
  var eventHandler = {
    target: findEventTarget(target),
    eventTypeString,
    callbackfunc,
    handlerFunc: webGlEventHandlerFunc,
    useCapture
  };
  JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_webglcontextlost_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
  registerWebGlEventCallback(target, userData, useCapture, callbackfunc, 31, "webglcontextlost", targetThread);
  return 0;
};

_emscripten_set_webglcontextlost_callback_on_thread.sig = "ippipp";

var _emscripten_set_webglcontextrestored_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
  registerWebGlEventCallback(target, userData, useCapture, callbackfunc, 32, "webglcontextrestored", targetThread);
  return 0;
};

_emscripten_set_webglcontextrestored_callback_on_thread.sig = "ippipp";

var registerWheelEventCallback = (target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) => {
  JSEvents.wheelEvent ||= _malloc(96);
  // The DOM Level 3 events spec event 'wheel'
  var wheelHandlerFunc = (e = event) => {
    var wheelEvent = JSEvents.wheelEvent;
    fillMouseEventData(wheelEvent, e, target);
    HEAPF64[(((wheelEvent) + (64)) >> 3)] = e["deltaX"];
    HEAPF64[(((wheelEvent) + (72)) >> 3)] = e["deltaY"];
    HEAPF64[(((wheelEvent) + (80)) >> 3)] = e["deltaZ"];
    HEAP32[(((wheelEvent) + (88)) >> 2)] = e["deltaMode"];
    if (getWasmTableEntry(callbackfunc)(eventTypeId, wheelEvent, userData)) e.preventDefault();
  };
  var eventHandler = {
    target,
    allowsDeferredCalls: true,
    eventTypeString,
    callbackfunc,
    handlerFunc: wheelHandlerFunc,
    useCapture
  };
  return JSEvents.registerOrRemoveHandler(eventHandler);
};

var _emscripten_set_wheel_callback_on_thread = (target, userData, useCapture, callbackfunc, targetThread) => {
  target = findEventTarget(target);
  if (!target) return -4;
  if (typeof target.onwheel != "undefined") {
    return registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
  } else {
    return -1;
  }
};

_emscripten_set_wheel_callback_on_thread.sig = "ippipp";

var _emscripten_set_window_title = title => document.title = UTF8ToString(title);

_emscripten_set_window_title.sig = "vp";

var webglPowerPreferences = [ "default", "low-power", "high-performance" ];

/** @suppress {duplicate } */ var _emscripten_webgl_do_create_context = (target, attributes) => {
  var attr32 = ((attributes) >> 2);
  var powerPreference = HEAP32[attr32 + (8 >> 2)];
  var contextAttributes = {
    "alpha": !!HEAP8[attributes + 0],
    "depth": !!HEAP8[attributes + 1],
    "stencil": !!HEAP8[attributes + 2],
    "antialias": !!HEAP8[attributes + 3],
    "premultipliedAlpha": !!HEAP8[attributes + 4],
    "preserveDrawingBuffer": !!HEAP8[attributes + 5],
    "powerPreference": webglPowerPreferences[powerPreference],
    "failIfMajorPerformanceCaveat": !!HEAP8[attributes + 12],
    // The following are not predefined WebGL context attributes in the WebGL specification, so the property names can be minified by Closure.
    majorVersion: HEAP32[attr32 + (16 >> 2)],
    minorVersion: HEAP32[attr32 + (20 >> 2)],
    enableExtensionsByDefault: HEAP8[attributes + 24],
    explicitSwapControl: HEAP8[attributes + 25],
    proxyContextToMainThread: HEAP32[attr32 + (28 >> 2)],
    renderViaOffscreenBackBuffer: HEAP8[attributes + 32]
  };
  var canvas = findCanvasEventTarget(target);
  if (!canvas) {
    return 0;
  }
  if (contextAttributes.explicitSwapControl) {
    return 0;
  }
  var contextHandle = GL.createContext(canvas, contextAttributes);
  return contextHandle;
};

_emscripten_webgl_do_create_context.sig = "ppp";

var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

_emscripten_webgl_create_context.sig = "ppp";

var _emscripten_webgl_make_context_current = contextHandle => {
  var success = GL.makeContextCurrent(contextHandle);
  return success ? 0 : -5;
};

_emscripten_webgl_make_context_current.sig = "ip";

var getExecutableName = () => thisProgram || "./this.program";

var getEnvStrings = () => {
  if (!getEnvStrings.strings) {
    // Default values.
    // Browser language detection #8751
    var lang = ((typeof navigator == "object" && navigator.languages && navigator.languages[0]) || "C").replace("-", "_") + ".UTF-8";
    var env = {
      "USER": "web_user",
      "LOGNAME": "web_user",
      "PATH": "/",
      "PWD": "/",
      "HOME": "/home/web_user",
      "LANG": lang,
      "_": getExecutableName()
    };
    // Apply the user-provided values, if any.
    for (var x in ENV) {
      // x is a key in ENV; if ENV[x] is undefined, that means it was
      // explicitly set to be so. We allow user code to do that to
      // force variables with default values to remain unset.
      if (ENV[x] === undefined) delete env[x]; else env[x] = ENV[x];
    }
    var strings = [];
    for (var x in env) {
      strings.push(`${x}=${env[x]}`);
    }
    getEnvStrings.strings = strings;
  }
  return getEnvStrings.strings;
};

var stringToAscii = (str, buffer) => {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[buffer++] = str.charCodeAt(i);
  }
  // Null-terminate the string
  HEAP8[buffer] = 0;
};

var _environ_get = (__environ, environ_buf) => {
  var bufSize = 0;
  getEnvStrings().forEach((string, i) => {
    var ptr = environ_buf + bufSize;
    HEAPU32[(((__environ) + (i * 4)) >> 2)] = ptr;
    stringToAscii(string, ptr);
    bufSize += string.length + 1;
  });
  return 0;
};

_environ_get.sig = "ipp";

var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
  var strings = getEnvStrings();
  HEAPU32[((penviron_count) >> 2)] = strings.length;
  var bufSize = 0;
  strings.forEach(string => bufSize += string.length + 1);
  HEAPU32[((penviron_buf_size) >> 2)] = bufSize;
  return 0;
};

_environ_sizes_get.sig = "ipp";

function _fd_close(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.close(stream);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_close.sig = "ii";

function _fd_fdstat_get(fd, pbuf) {
  try {
    var rightsBase = 0;
    var rightsInheriting = 0;
    var flags = 0;
    {
      var stream = SYSCALLS.getStreamFromFD(fd);
      // All character devices are terminals (other things a Linux system would
      // assume is a character device, like the mouse, we have special APIs for).
      var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
    }
    HEAP8[pbuf] = type;
    HEAP16[(((pbuf) + (2)) >> 1)] = flags;
    (tempI64 = [ rightsBase >>> 0, (tempDouble = rightsBase, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((pbuf) + (8)) >> 2)] = tempI64[0], HEAP32[(((pbuf) + (12)) >> 2)] = tempI64[1]);
    (tempI64 = [ rightsInheriting >>> 0, (tempDouble = rightsInheriting, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[(((pbuf) + (16)) >> 2)] = tempI64[0], HEAP32[(((pbuf) + (20)) >> 2)] = tempI64[1]);
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_fdstat_get.sig = "iip";

/** @param {number=} offset */ var doReadv = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[((iov) >> 2)];
    var len = HEAPU32[(((iov) + (4)) >> 2)];
    iov += 8;
    var curr = FS.read(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) break;
    // nothing more to read
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_read(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doReadv(stream, iov, iovcnt);
    HEAPU32[((pnum) >> 2)] = num;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_read.sig = "iippp";

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
  var offset = convertI32PairToI53Checked(offset_low, offset_high);
  try {
    if (isNaN(offset)) return 61;
    var stream = SYSCALLS.getStreamFromFD(fd);
    FS.llseek(stream, offset, whence);
    (tempI64 = [ stream.position >>> 0, (tempDouble = stream.position, (+(Math.abs(tempDouble))) >= 1 ? (tempDouble > 0 ? (+(Math.floor((tempDouble) / 4294967296))) >>> 0 : (~~((+(Math.ceil((tempDouble - +(((~~(tempDouble))) >>> 0)) / 4294967296))))) >>> 0) : 0) ], 
    HEAP32[((newOffset) >> 2)] = tempI64[0], HEAP32[(((newOffset) + (4)) >> 2)] = tempI64[1]);
    if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
    // reset readdir state
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_seek.sig = "iiiiip";

function _fd_sync(fd) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    if (stream.stream_ops?.fsync) {
      return stream.stream_ops.fsync(stream);
    }
    return 0;
  } // we can't do anything synchronously; the in-memory FS is already synced to
  catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_sync.sig = "ii";

/** @param {number=} offset */ var doWritev = (stream, iov, iovcnt, offset) => {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
    var ptr = HEAPU32[((iov) >> 2)];
    var len = HEAPU32[(((iov) + (4)) >> 2)];
    iov += 8;
    var curr = FS.write(stream, HEAP8, ptr, len, offset);
    if (curr < 0) return -1;
    ret += curr;
    if (curr < len) {
      // No more space to write.
      break;
    }
    if (typeof offset != "undefined") {
      offset += curr;
    }
  }
  return ret;
};

function _fd_write(fd, iov, iovcnt, pnum) {
  try {
    var stream = SYSCALLS.getStreamFromFD(fd);
    var num = doWritev(stream, iov, iovcnt);
    HEAPU32[((pnum) >> 2)] = num;
    return 0;
  } catch (e) {
    if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
    return e.errno;
  }
}

_fd_write.sig = "iippp";

var _getaddrinfo = (node, service, hint, out) => {
  var addr = 0;
  var port = 0;
  var flags = 0;
  var family = 0;
  var type = 0;
  var proto = 0;
  var ai;
  function allocaddrinfo(family, type, proto, canon, addr, port) {
    var sa, salen, ai;
    var errno;
    salen = family === 10 ? 28 : 16;
    addr = family === 10 ? inetNtop6(addr) : inetNtop4(addr);
    sa = _malloc(salen);
    errno = writeSockaddr(sa, family, addr, port);
    assert(!errno);
    ai = _malloc(32);
    HEAP32[(((ai) + (4)) >> 2)] = family;
    HEAP32[(((ai) + (8)) >> 2)] = type;
    HEAP32[(((ai) + (12)) >> 2)] = proto;
    HEAPU32[(((ai) + (24)) >> 2)] = canon;
    HEAPU32[(((ai) + (20)) >> 2)] = sa;
    if (family === 10) {
      HEAP32[(((ai) + (16)) >> 2)] = 28;
    } else {
      HEAP32[(((ai) + (16)) >> 2)] = 16;
    }
    HEAP32[(((ai) + (28)) >> 2)] = 0;
    return ai;
  }
  if (hint) {
    flags = HEAP32[((hint) >> 2)];
    family = HEAP32[(((hint) + (4)) >> 2)];
    type = HEAP32[(((hint) + (8)) >> 2)];
    proto = HEAP32[(((hint) + (12)) >> 2)];
  }
  if (type && !proto) {
    proto = type === 2 ? 17 : 6;
  }
  if (!type && proto) {
    type = proto === 17 ? 2 : 1;
  }
  // If type or proto are set to zero in hints we should really be returning multiple addrinfo values, but for
  // now default to a TCP STREAM socket so we can at least return a sensible addrinfo given NULL hints.
  if (proto === 0) {
    proto = 6;
  }
  if (type === 0) {
    type = 1;
  }
  if (!node && !service) {
    return -2;
  }
  if (flags & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
    return -1;
  }
  if (hint !== 0 && (HEAP32[((hint) >> 2)] & 2) && !node) {
    return -1;
  }
  if (flags & 32) {
    // TODO
    return -2;
  }
  if (type !== 0 && type !== 1 && type !== 2) {
    return -7;
  }
  if (family !== 0 && family !== 2 && family !== 10) {
    return -6;
  }
  if (service) {
    service = UTF8ToString(service);
    port = parseInt(service, 10);
    if (isNaN(port)) {
      if (flags & 1024) {
        return -2;
      }
      // TODO support resolving well-known service names from:
      // http://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.txt
      return -8;
    }
  }
  if (!node) {
    if (family === 0) {
      family = 2;
    }
    if ((flags & 1) === 0) {
      if (family === 2) {
        addr = _htonl(2130706433);
      } else {
        addr = [ 0, 0, 0, _htonl(1) ];
      }
    }
    ai = allocaddrinfo(family, type, proto, null, addr, port);
    HEAPU32[((out) >> 2)] = ai;
    return 0;
  }
  // try as a numeric address
  node = UTF8ToString(node);
  addr = inetPton4(node);
  if (addr !== null) {
    // incoming node is a valid ipv4 address
    if (family === 0 || family === 2) {
      family = 2;
    } else if (family === 10 && (flags & 8)) {
      addr = [ 0, 0, _htonl(65535), addr ];
      family = 10;
    } else {
      return -2;
    }
  } else {
    addr = inetPton6(node);
    if (addr !== null) {
      // incoming node is a valid ipv6 address
      if (family === 0 || family === 10) {
        family = 10;
      } else {
        return -2;
      }
    }
  }
  if (addr != null) {
    ai = allocaddrinfo(family, type, proto, node, addr, port);
    HEAPU32[((out) >> 2)] = ai;
    return 0;
  }
  if (flags & 4) {
    return -2;
  }
  // try as a hostname
  // resolve the hostname to a temporary fake address
  node = DNS.lookup_name(node);
  addr = inetPton4(node);
  if (family === 0) {
    family = 2;
  } else if (family === 10) {
    addr = [ 0, 0, _htonl(65535), addr ];
  }
  ai = allocaddrinfo(family, type, proto, null, addr, port);
  HEAPU32[((out) >> 2)] = ai;
  return 0;
};

Module["_getaddrinfo"] = _getaddrinfo;

_getaddrinfo.sig = "ipppp";

var _getnameinfo = (sa, salen, node, nodelen, serv, servlen, flags) => {
  var info = readSockaddr(sa, salen);
  if (info.errno) {
    return -6;
  }
  var port = info.port;
  var addr = info.addr;
  var overflowed = false;
  if (node && nodelen) {
    var lookup;
    if ((flags & 1) || !(lookup = DNS.lookup_addr(addr))) {
      if (flags & 8) {
        return -2;
      }
    } else {
      addr = lookup;
    }
    var numBytesWrittenExclNull = stringToUTF8(addr, node, nodelen);
    if (numBytesWrittenExclNull + 1 >= nodelen) {
      overflowed = true;
    }
  }
  if (serv && servlen) {
    port = "" + port;
    var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
    if (numBytesWrittenExclNull + 1 >= servlen) {
      overflowed = true;
    }
  }
  if (overflowed) {
    // Note: even when we overflow, getnameinfo() is specced to write out the truncated results.
    return -12;
  }
  return 0;
};

Module["_getnameinfo"] = _getnameinfo;

_getnameinfo.sig = "ipipipii";

var _glActiveTexture = x0 => GLctx.activeTexture(x0);

_glActiveTexture.sig = "vi";

var _glAttachShader = (program, shader) => {
  GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
};

_glAttachShader.sig = "vii";

var _glBindAttribLocation = (program, index, name) => {
  GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
};

_glBindAttribLocation.sig = "viip";

var _glBindBuffer = (target, buffer) => {
  if (target == 35051) /*GL_PIXEL_PACK_BUFFER*/ {
    // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2
    // API function call when a buffer is bound to
    // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that
    // binding point is non-null to know what is the proper API function to
    // call.
    GLctx.currentPixelPackBufferBinding = buffer;
  } else if (target == 35052) /*GL_PIXEL_UNPACK_BUFFER*/ {
    // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
    // use a different WebGL 2 API function call when a buffer is bound to
    // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
    // binding point is non-null to know what is the proper API function to
    // call.
    GLctx.currentPixelUnpackBufferBinding = buffer;
  }
  GLctx.bindBuffer(target, GL.buffers[buffer]);
};

_glBindBuffer.sig = "vii";

var _glBindFramebuffer = (target, framebuffer) => {
  GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
};

_glBindFramebuffer.sig = "vii";

var _glBindRenderbuffer = (target, renderbuffer) => {
  GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
};

_glBindRenderbuffer.sig = "vii";

var _glBindTexture = (target, texture) => {
  GLctx.bindTexture(target, GL.textures[texture]);
};

_glBindTexture.sig = "vii";

var _glBlendFunc = (x0, x1) => GLctx.blendFunc(x0, x1);

_glBlendFunc.sig = "vii";

var _glBufferData = (target, size, data, usage) => {
  if (GL.currentContext.version >= 2) {
    // If size is zero, WebGL would interpret uploading the whole input
    // arraybuffer (starting from given offset), which would not make sense in
    // WebAssembly, so avoid uploading if size is zero. However we must still
    // call bufferData to establish a backing storage of zero bytes.
    if (data && size) {
      GLctx.bufferData(target, HEAPU8, usage, data, size);
    } else {
      GLctx.bufferData(target, size, usage);
    }
    return;
  }
  // N.b. here first form specifies a heap subarray, second form an integer
  // size, so the ?: code here is polymorphic. It is advised to avoid
  // randomly mixing both uses in calling code, to avoid any potential JS
  // engine JIT issues.
  GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage);
};

_glBufferData.sig = "vippi";

var _glBufferSubData = (target, offset, size, data) => {
  if (GL.currentContext.version >= 2) {
    size && GLctx.bufferSubData(target, offset, HEAPU8, data, size);
    return;
  }
  GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size));
};

_glBufferSubData.sig = "vippp";

var _glClear = x0 => GLctx.clear(x0);

_glClear.sig = "vi";

var _glClearColor = (x0, x1, x2, x3) => GLctx.clearColor(x0, x1, x2, x3);

_glClearColor.sig = "vffff";

var _glClearDepthf = x0 => GLctx.clearDepth(x0);

_glClearDepthf.sig = "vf";

var _glClearStencil = x0 => GLctx.clearStencil(x0);

_glClearStencil.sig = "vi";

var _glCompileShader = shader => {
  GLctx.compileShader(GL.shaders[shader]);
};

_glCompileShader.sig = "vi";

var _glCreateProgram = () => {
  var id = GL.getNewId(GL.programs);
  var program = GLctx.createProgram();
  // Store additional information needed for each shader program:
  program.name = id;
  // Lazy cache results of
  // glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
  program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
  program.uniformIdCounter = 1;
  GL.programs[id] = program;
  return id;
};

_glCreateProgram.sig = "i";

var _glCreateShader = shaderType => {
  var id = GL.getNewId(GL.shaders);
  GL.shaders[id] = GLctx.createShader(shaderType);
  return id;
};

_glCreateShader.sig = "ii";

var _glCullFace = x0 => GLctx.cullFace(x0);

_glCullFace.sig = "vi";

var _glDeleteBuffers = (n, buffers) => {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[(((buffers) + (i * 4)) >> 2)];
    var buffer = GL.buffers[id];
    // From spec: "glDeleteBuffers silently ignores 0's and names that do not
    // correspond to existing buffer objects."
    if (!buffer) continue;
    GLctx.deleteBuffer(buffer);
    buffer.name = 0;
    GL.buffers[id] = null;
    if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
    if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
  }
};

_glDeleteBuffers.sig = "vip";

var _glDeleteFramebuffers = (n, framebuffers) => {
  for (var i = 0; i < n; ++i) {
    var id = HEAP32[(((framebuffers) + (i * 4)) >> 2)];
    var framebuffer = GL.framebuffers[id];
    if (!framebuffer) continue;
    // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
    GLctx.deleteFramebuffer(framebuffer);
    framebuffer.name = 0;
    GL.framebuffers[id] = null;
  }
};

_glDeleteFramebuffers.sig = "vip";

var _glDeleteProgram = id => {
  if (!id) return;
  var program = GL.programs[id];
  if (!program) {
    // glDeleteProgram actually signals an error when deleting a nonexisting
    // object, unlike some other GL delete functions.
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  GLctx.deleteProgram(program);
  program.name = 0;
  GL.programs[id] = null;
};

_glDeleteProgram.sig = "vi";

var _glDeleteRenderbuffers = (n, renderbuffers) => {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[(((renderbuffers) + (i * 4)) >> 2)];
    var renderbuffer = GL.renderbuffers[id];
    if (!renderbuffer) continue;
    // GL spec: "glDeleteRenderbuffers silently ignores 0s and names that do not correspond to existing renderbuffer objects".
    GLctx.deleteRenderbuffer(renderbuffer);
    renderbuffer.name = 0;
    GL.renderbuffers[id] = null;
  }
};

_glDeleteRenderbuffers.sig = "vip";

var _glDeleteShader = id => {
  if (!id) return;
  var shader = GL.shaders[id];
  if (!shader) {
    // glDeleteShader actually signals an error when deleting a nonexisting
    // object, unlike some other GL delete functions.
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  GLctx.deleteShader(shader);
  GL.shaders[id] = null;
};

_glDeleteShader.sig = "vi";

var _glDeleteTextures = (n, textures) => {
  for (var i = 0; i < n; i++) {
    var id = HEAP32[(((textures) + (i * 4)) >> 2)];
    var texture = GL.textures[id];
    // GL spec: "glDeleteTextures silently ignores 0s and names that do not
    // correspond to existing textures".
    if (!texture) continue;
    GLctx.deleteTexture(texture);
    texture.name = 0;
    GL.textures[id] = null;
  }
};

_glDeleteTextures.sig = "vip";

var _glDepthFunc = x0 => GLctx.depthFunc(x0);

_glDepthFunc.sig = "vi";

var _glDepthMask = flag => {
  GLctx.depthMask(!!flag);
};

_glDepthMask.sig = "vi";

var _glDetachShader = (program, shader) => {
  GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
};

_glDetachShader.sig = "vii";

var _glDisable = x0 => GLctx.disable(x0);

_glDisable.sig = "vi";

var _glDisableVertexAttribArray = index => {
  GLctx.disableVertexAttribArray(index);
};

_glDisableVertexAttribArray.sig = "vi";

var _glDrawArrays = (mode, first, count) => {
  GLctx.drawArrays(mode, first, count);
};

_glDrawArrays.sig = "viii";

var _glDrawArraysInstanced = (mode, first, count, primcount) => {
  GLctx.drawArraysInstanced(mode, first, count, primcount);
};

_glDrawArraysInstanced.sig = "viiii";

var _glDrawElements = (mode, count, type, indices) => {
  GLctx.drawElements(mode, count, type, indices);
};

_glDrawElements.sig = "viiip";

var _glDrawElementsInstanced = (mode, count, type, indices, primcount) => {
  GLctx.drawElementsInstanced(mode, count, type, indices, primcount);
};

_glDrawElementsInstanced.sig = "viiipi";

var _glEnable = x0 => GLctx.enable(x0);

_glEnable.sig = "vi";

var _glEnableVertexAttribArray = index => {
  GLctx.enableVertexAttribArray(index);
};

_glEnableVertexAttribArray.sig = "vi";

var _glFramebufferRenderbuffer = (target, attachment, renderbuffertarget, renderbuffer) => {
  GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
};

_glFramebufferRenderbuffer.sig = "viiii";

var _glFramebufferTexture2D = (target, attachment, textarget, texture, level) => {
  GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
};

_glFramebufferTexture2D.sig = "viiiii";

var _glGenBuffers = (n, buffers) => {
  GL.genObject(n, buffers, "createBuffer", GL.buffers);
};

_glGenBuffers.sig = "vip";

var _glGenFramebuffers = (n, ids) => {
  GL.genObject(n, ids, "createFramebuffer", GL.framebuffers);
};

_glGenFramebuffers.sig = "vip";

var _glGenRenderbuffers = (n, renderbuffers) => {
  GL.genObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers);
};

_glGenRenderbuffers.sig = "vip";

var _glGenTextures = (n, textures) => {
  GL.genObject(n, textures, "createTexture", GL.textures);
};

_glGenTextures.sig = "vip";

var _glGenerateMipmap = x0 => GLctx.generateMipmap(x0);

_glGenerateMipmap.sig = "vi";

var _glGetAttribLocation = (program, name) => GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));

_glGetAttribLocation.sig = "iip";

var writeI53ToI64 = (ptr, num) => {
  HEAPU32[((ptr) >> 2)] = num;
  var lower = HEAPU32[((ptr) >> 2)];
  HEAPU32[(((ptr) + (4)) >> 2)] = (num - lower) / 4294967296;
};

var webglGetExtensions = function $webglGetExtensions() {
  var exts = getEmscriptenSupportedExtensions(GLctx);
  exts = exts.concat(exts.map(e => "GL_" + e));
  return exts;
};

var emscriptenWebGLGet = (name_, p, type) => {
  // Guard against user passing a null pointer.
  // Note that GLES2 spec does not say anything about how passing a null
  // pointer should be treated.  Testing on desktop core GL 3, the application
  // crashes on glGetIntegerv to a null pointer, but better to report an error
  // instead of doing anything random.
  if (!p) {
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  var ret = undefined;
  switch (name_) {
   // Handle a few trivial GLES values
    case 36346:
    // GL_SHADER_COMPILER
    ret = 1;
    break;

   case 36344:
    // GL_SHADER_BINARY_FORMATS
    if (type != 0 && type != 1) {
      GL.recordError(1280);
    }
    // Do not write anything to the out pointer, since no binary formats are
    // supported.
    return;

   case 34814:
   // GL_NUM_PROGRAM_BINARY_FORMATS
    case 36345:
    // GL_NUM_SHADER_BINARY_FORMATS
    ret = 0;
    break;

   case 34466:
    // GL_NUM_COMPRESSED_TEXTURE_FORMATS
    // WebGL doesn't have GL_NUM_COMPRESSED_TEXTURE_FORMATS (it's obsolete
    // since GL_COMPRESSED_TEXTURE_FORMATS returns a JS array that can be
    // queried for length), so implement it ourselves to allow C++ GLES2
    // code get the length.
    var formats = GLctx.getParameter(34467);
    /*GL_COMPRESSED_TEXTURE_FORMATS*/ ret = formats ? formats.length : 0;
    break;

   case 33309:
    // GL_NUM_EXTENSIONS
    if (GL.currentContext.version < 2) {
      // Calling GLES3/WebGL2 function with a GLES2/WebGL1 context
      GL.recordError(1282);
      /* GL_INVALID_OPERATION */ return;
    }
    ret = webglGetExtensions().length;
    break;

   case 33307:
   // GL_MAJOR_VERSION
    case 33308:
    // GL_MINOR_VERSION
    if (GL.currentContext.version < 2) {
      GL.recordError(1280);
      // GL_INVALID_ENUM
      return;
    }
    ret = name_ == 33307 ? 3 : 0;
    // return version 3.0
    break;
  }
  if (ret === undefined) {
    var result = GLctx.getParameter(name_);
    switch (typeof result) {
     case "number":
      ret = result;
      break;

     case "boolean":
      ret = result ? 1 : 0;
      break;

     case "string":
      GL.recordError(1280);
      // GL_INVALID_ENUM
      return;

     case "object":
      if (result === null) {
        // null is a valid result for some (e.g., which buffer is bound -
        // perhaps nothing is bound), but otherwise can mean an invalid
        // name_, which we need to report as an error
        switch (name_) {
         case 34964:
         // ARRAY_BUFFER_BINDING
          case 35725:
         // CURRENT_PROGRAM
          case 34965:
         // ELEMENT_ARRAY_BUFFER_BINDING
          case 36006:
         // FRAMEBUFFER_BINDING or DRAW_FRAMEBUFFER_BINDING
          case 36007:
         // RENDERBUFFER_BINDING
          case 32873:
         // TEXTURE_BINDING_2D
          case 34229:
         // WebGL 2 GL_VERTEX_ARRAY_BINDING, or WebGL 1 extension OES_vertex_array_object GL_VERTEX_ARRAY_BINDING_OES
          case 36662:
         // COPY_READ_BUFFER_BINDING or COPY_READ_BUFFER
          case 36663:
         // COPY_WRITE_BUFFER_BINDING or COPY_WRITE_BUFFER
          case 35053:
         // PIXEL_PACK_BUFFER_BINDING
          case 35055:
         // PIXEL_UNPACK_BUFFER_BINDING
          case 36010:
         // READ_FRAMEBUFFER_BINDING
          case 35097:
         // SAMPLER_BINDING
          case 35869:
         // TEXTURE_BINDING_2D_ARRAY
          case 32874:
         // TEXTURE_BINDING_3D
          case 36389:
         // TRANSFORM_FEEDBACK_BINDING
          case 35983:
         // TRANSFORM_FEEDBACK_BUFFER_BINDING
          case 35368:
         // UNIFORM_BUFFER_BINDING
          case 34068:
          {
            // TEXTURE_BINDING_CUBE_MAP
            ret = 0;
            break;
          }

         default:
          {
            GL.recordError(1280);
            // GL_INVALID_ENUM
            return;
          }
        }
      } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
        for (var i = 0; i < result.length; ++i) {
          switch (type) {
           case 0:
            HEAP32[(((p) + (i * 4)) >> 2)] = result[i];
            break;

           case 2:
            HEAPF32[(((p) + (i * 4)) >> 2)] = result[i];
            break;

           case 4:
            HEAP8[(p) + (i)] = result[i] ? 1 : 0;
            break;
          }
        }
        return;
      } else {
        try {
          ret = result.name | 0;
        } catch (e) {
          GL.recordError(1280);
          // GL_INVALID_ENUM
          err(`GL_INVALID_ENUM in glGet${type}v: Unknown object returned from WebGL getParameter(${name_})! (error: ${e})`);
          return;
        }
      }
      break;

     default:
      GL.recordError(1280);
      // GL_INVALID_ENUM
      err(`GL_INVALID_ENUM in glGet${type}v: Native code calling glGet${type}v(${name_}) and it returns ${result} of type ${typeof (result)}!`);
      return;
    }
  }
  switch (type) {
   case 1:
    writeI53ToI64(p, ret);
    break;

   case 0:
    HEAP32[((p) >> 2)] = ret;
    break;

   case 2:
    HEAPF32[((p) >> 2)] = ret;
    break;

   case 4:
    HEAP8[p] = ret ? 1 : 0;
    break;
  }
};

var _glGetBooleanv = (name_, p) => emscriptenWebGLGet(name_, p, 4);

_glGetBooleanv.sig = "vip";

var _glGetIntegerv = (name_, p) => emscriptenWebGLGet(name_, p, 0);

_glGetIntegerv.sig = "vip";

var _glGetProgramInfoLog = (program, maxLength, length, infoLog) => {
  var log = GLctx.getProgramInfoLog(GL.programs[program]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[((length) >> 2)] = numBytesWrittenExclNull;
};

_glGetProgramInfoLog.sig = "viipp";

var _glGetProgramiv = (program, pname, p) => {
  if (!p) {
    // GLES2 specification does not specify how to behave if p is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  if (program >= GL.counter) {
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  program = GL.programs[program];
  if (pname == 35716) {
    // GL_INFO_LOG_LENGTH
    var log = GLctx.getProgramInfoLog(program);
    if (log === null) log = "(unknown error)";
    HEAP32[((p) >> 2)] = log.length + 1;
  } else if (pname == 35719) /* GL_ACTIVE_UNIFORM_MAX_LENGTH */ {
    if (!program.maxUniformLength) {
      var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
      /*GL_ACTIVE_UNIFORMS*/ for (var i = 0; i < numActiveUniforms; ++i) {
        program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
      }
    }
    HEAP32[((p) >> 2)] = program.maxUniformLength;
  } else if (pname == 35722) /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */ {
    if (!program.maxAttributeLength) {
      var numActiveAttributes = GLctx.getProgramParameter(program, 35721);
      /*GL_ACTIVE_ATTRIBUTES*/ for (var i = 0; i < numActiveAttributes; ++i) {
        program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
      }
    }
    HEAP32[((p) >> 2)] = program.maxAttributeLength;
  } else if (pname == 35381) /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */ {
    if (!program.maxUniformBlockNameLength) {
      var numActiveUniformBlocks = GLctx.getProgramParameter(program, 35382);
      /*GL_ACTIVE_UNIFORM_BLOCKS*/ for (var i = 0; i < numActiveUniformBlocks; ++i) {
        program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
      }
    }
    HEAP32[((p) >> 2)] = program.maxUniformBlockNameLength;
  } else {
    HEAP32[((p) >> 2)] = GLctx.getProgramParameter(program, pname);
  }
};

_glGetProgramiv.sig = "viip";

var _glGetShaderInfoLog = (shader, maxLength, length, infoLog) => {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
  if (length) HEAP32[((length) >> 2)] = numBytesWrittenExclNull;
};

_glGetShaderInfoLog.sig = "viipp";

var _glGetShaderPrecisionFormat = (shaderType, precisionType, range, precision) => {
  var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
  HEAP32[((range) >> 2)] = result.rangeMin;
  HEAP32[(((range) + (4)) >> 2)] = result.rangeMax;
  HEAP32[((precision) >> 2)] = result.precision;
};

_glGetShaderPrecisionFormat.sig = "viipp";

var _glGetShaderiv = (shader, pname, p) => {
  if (!p) {
    // GLES2 specification does not specify how to behave if p is a null
    // pointer. Since calling this function does not make sense if p == null,
    // issue a GL error to notify user about it.
    GL.recordError(1281);
    /* GL_INVALID_VALUE */ return;
  }
  if (pname == 35716) {
    // GL_INFO_LOG_LENGTH
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    // The GLES2 specification says that if the shader has an empty info log,
    // a value of 0 is returned. Otherwise the log has a null char appended.
    // (An empty string is falsey, so we can just check that instead of
    // looking at log.length.)
    var logLength = log ? log.length + 1 : 0;
    HEAP32[((p) >> 2)] = logLength;
  } else if (pname == 35720) {
    // GL_SHADER_SOURCE_LENGTH
    var source = GLctx.getShaderSource(GL.shaders[shader]);
    // source may be a null, or the empty string, both of which are falsey
    // values that we report a 0 length for.
    var sourceLength = source ? source.length + 1 : 0;
    HEAP32[((p) >> 2)] = sourceLength;
  } else {
    HEAP32[((p) >> 2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
  }
};

_glGetShaderiv.sig = "viip";

var stringToNewUTF8 = str => {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8(str, ret, size);
  return ret;
};

var _glGetString = name_ => {
  var ret = GL.stringCache[name_];
  if (!ret) {
    switch (name_) {
     case 7939:
      /* GL_EXTENSIONS */ ret = stringToNewUTF8(webglGetExtensions().join(" "));
      break;

     case 7936:
     /* GL_VENDOR */ case 7937:
     /* GL_RENDERER */ case 37445:
     /* UNMASKED_VENDOR_WEBGL */ case 37446:
      /* UNMASKED_RENDERER_WEBGL */ var s = GLctx.getParameter(name_);
      if (!s) {
        GL.recordError(1280);
      }
      ret = s ? stringToNewUTF8(s) : 0;
      break;

     case 7938:
      /* GL_VERSION */ var webGLVersion = GLctx.getParameter(7938);
      // return GLES version string corresponding to the version of the WebGL context
      var glVersion = `OpenGL ES 2.0 (${webGLVersion})`;
      if (GL.currentContext.version >= 2) glVersion = `OpenGL ES 3.0 (${webGLVersion})`;
      ret = stringToNewUTF8(glVersion);
      break;

     case 35724:
      /* GL_SHADING_LANGUAGE_VERSION */ var glslVersion = GLctx.getParameter(35724);
      // extract the version number 'N.M' from the string 'WebGL GLSL ES N.M ...'
      var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
      var ver_num = glslVersion.match(ver_re);
      if (ver_num !== null) {
        if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
        // ensure minor version has 2 digits
        glslVersion = `OpenGL ES GLSL ES ${ver_num[1]} (${glslVersion})`;
      }
      ret = stringToNewUTF8(glslVersion);
      break;

     default:
      GL.recordError(1280);
    }
    // fall through
    GL.stringCache[name_] = ret;
  }
  return ret;
};

_glGetString.sig = "pi";

/** @noinline */ var webglGetLeftBracePos = name => name.slice(-1) == "]" && name.lastIndexOf("[");

var webglPrepareUniformLocationsBeforeFirstUse = program => {
  var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
  uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
  i, j;
  // On the first time invocation of glGetUniformLocation on this shader program:
  // initialize cache data structures and discover which uniforms are arrays.
  if (!uniformLocsById) {
    // maps GLint integer locations to WebGLUniformLocations
    program.uniformLocsById = uniformLocsById = {};
    // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
    program.uniformArrayNamesById = {};
    var numActiveUniforms = GLctx.getProgramParameter(program, 35718);
    /*GL_ACTIVE_UNIFORMS*/ for (i = 0; i < numActiveUniforms; ++i) {
      var u = GLctx.getActiveUniform(program, i);
      var nm = u.name;
      var sz = u.size;
      var lb = webglGetLeftBracePos(nm);
      var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
      // Assign a new location.
      var id = program.uniformIdCounter;
      program.uniformIdCounter += sz;
      // Eagerly get the location of the uniformArray[0] base element.
      // The remaining indices >0 will be left for lazy evaluation to
      // improve performance. Those may never be needed to fetch, if the
      // application fills arrays always in full starting from the first
      // element of the array.
      uniformSizeAndIdsByName[arrayName] = [ sz, id ];
      // Store placeholder integers in place that highlight that these
      // >0 index locations are array indices pending population.
      for (j = 0; j < sz; ++j) {
        uniformLocsById[id] = j;
        program.uniformArrayNamesById[id++] = arrayName;
      }
    }
  }
};

var _glGetUniformLocation = (program, name) => {
  name = UTF8ToString(name);
  if (program = GL.programs[program]) {
    webglPrepareUniformLocationsBeforeFirstUse(program);
    var uniformLocsById = program.uniformLocsById;
    // Maps GLuint -> WebGLUniformLocation
    var arrayIndex = 0;
    var uniformBaseName = name;
    // Invariant: when populating integer IDs for uniform locations, we must
    // maintain the precondition that arrays reside in contiguous addresses,
    // i.e. for a 'vec4 colors[10];', colors[4] must be at location
    // colors[0]+4.  However, user might call glGetUniformLocation(program,
    // "colors") for an array, so we cannot discover based on the user input
    // arguments whether the uniform we are dealing with is an array. The only
    // way to discover which uniforms are arrays is to enumerate over all the
    // active uniforms in the program.
    var leftBrace = webglGetLeftBracePos(name);
    // If user passed an array accessor "[index]", parse the array index off the accessor.
    if (leftBrace > 0) {
      arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
      // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
      uniformBaseName = name.slice(0, leftBrace);
    }
    // Have we cached the location of this uniform before?
    // A pair [array length, GLint of the uniform location]
    var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
    // If an uniform with this name exists, and if its index is within the
    // array limits (if it's even an array), query the WebGLlocation, or
    // return an existing cached location.
    if (sizeAndId && arrayIndex < sizeAndId[0]) {
      arrayIndex += sizeAndId[1];
      // Add the base location of the uniform to the array index offset.
      if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
        return arrayIndex;
      }
    }
  } else {
    // N.b. we are currently unable to distinguish between GL program IDs that
    // never existed vs GL program IDs that have been deleted, so report
    // GL_INVALID_VALUE in both cases.
    GL.recordError(1281);
  }
  /* GL_INVALID_VALUE */ return -1;
};

_glGetUniformLocation.sig = "iip";

var _glIsProgram = program => {
  program = GL.programs[program];
  if (!program) return 0;
  return GLctx.isProgram(program);
};

_glIsProgram.sig = "ii";

var _glIsRenderbuffer = renderbuffer => {
  var rb = GL.renderbuffers[renderbuffer];
  if (!rb) return 0;
  return GLctx.isRenderbuffer(rb);
};

_glIsRenderbuffer.sig = "ii";

var _glIsShader = shader => {
  var s = GL.shaders[shader];
  if (!s) return 0;
  return GLctx.isShader(s);
};

_glIsShader.sig = "ii";

var _glLinkProgram = program => {
  program = GL.programs[program];
  GLctx.linkProgram(program);
  // Invalidate earlier computed uniform->ID mappings, those have now become stale
  program.uniformLocsById = 0;
  // Mark as null-like so that glGetUniformLocation() knows to populate this again.
  program.uniformSizeAndIdsByName = {};
};

_glLinkProgram.sig = "vi";

var _glPixelStorei = (pname, param) => {
  if (pname == 3317) {
    GL.unpackAlignment = param;
  } else if (pname == 3314) {
    GL.unpackRowLength = param;
  }
  GLctx.pixelStorei(pname, param);
};

_glPixelStorei.sig = "vii";

var computeUnpackAlignedImageSize = (width, height, sizePerPixel) => {
  function roundedToNextMultipleOf(x, y) {
    return (x + y - 1) & -y;
  }
  var plainRowSize = (GL.unpackRowLength || width) * sizePerPixel;
  var alignedRowSize = roundedToNextMultipleOf(plainRowSize, GL.unpackAlignment);
  return height * alignedRowSize;
};

var colorChannelsInGlTextureFormat = format => {
  // Micro-optimizations for size: map format to size by subtracting smallest
  // enum value (0x1902) from all values first.  Also omit the most common
  // size value (1) from the list, which is assumed by formats not on the
  // list.
  var colorChannels = {
    // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
    // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
    5: 3,
    6: 4,
    // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
    8: 2,
    29502: 3,
    29504: 4,
    // 0x1903 /* GL_RED */ - 0x1902: 1,
    26917: 2,
    26918: 2,
    // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
    29846: 3,
    29847: 4
  };
  return colorChannels[format - 6402] || 1;
};

var heapObjectForWebGLType = type => {
  // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
  // smaller values for the heap, for shorter generated code size.
  // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
  // (since most types are HEAPU16)
  type -= 5120;
  if (type == 0) return HEAP8;
  if (type == 1) return HEAPU8;
  if (type == 2) return HEAP16;
  if (type == 4) return HEAP32;
  if (type == 6) return HEAPF32;
  if (type == 5 || type == 28922 || type == 28520 || type == 30779 || type == 30782) return HEAPU32;
  return HEAPU16;
};

var toTypedArrayIndex = (pointer, heap) => pointer >>> (31 - Math.clz32(heap.BYTES_PER_ELEMENT));

var emscriptenWebGLGetTexPixelData = (type, format, width, height, pixels, internalFormat) => {
  var heap = heapObjectForWebGLType(type);
  var sizePerPixel = colorChannelsInGlTextureFormat(format) * heap.BYTES_PER_ELEMENT;
  var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel);
  return heap.subarray(toTypedArrayIndex(pixels, heap), toTypedArrayIndex(pixels + bytes, heap));
};

var _glReadPixels = (x, y, width, height, format, type, pixels) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelPackBufferBinding) {
      GLctx.readPixels(x, y, width, height, format, type, pixels);
      return;
    }
    var heap = heapObjectForWebGLType(type);
    var target = toTypedArrayIndex(pixels, heap);
    GLctx.readPixels(x, y, width, height, format, type, heap, target);
    return;
  }
  var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
  if (!pixelData) {
    GL.recordError(1280);
    /*GL_INVALID_ENUM*/ return;
  }
  GLctx.readPixels(x, y, width, height, format, type, pixelData);
};

_glReadPixels.sig = "viiiiiip";

var _glRenderbufferStorage = (x0, x1, x2, x3) => GLctx.renderbufferStorage(x0, x1, x2, x3);

_glRenderbufferStorage.sig = "viiii";

var _glScissor = (x0, x1, x2, x3) => GLctx.scissor(x0, x1, x2, x3);

_glScissor.sig = "viiii";

var _glShaderSource = (shader, count, string, length) => {
  var source = GL.getSource(shader, count, string, length);
  GLctx.shaderSource(GL.shaders[shader], source);
};

_glShaderSource.sig = "viipp";

var _glStencilFunc = (x0, x1, x2) => GLctx.stencilFunc(x0, x1, x2);

_glStencilFunc.sig = "viii";

var _glStencilMask = x0 => GLctx.stencilMask(x0);

_glStencilMask.sig = "vi";

var _glStencilOp = (x0, x1, x2) => GLctx.stencilOp(x0, x1, x2);

_glStencilOp.sig = "viii";

var _glTexImage2D = (target, level, internalFormat, width, height, border, format, type, pixels) => {
  if (GL.currentContext.version >= 2) {
    if (GLctx.currentPixelUnpackBufferBinding) {
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
      return;
    }
    if (pixels) {
      var heap = heapObjectForWebGLType(type);
      var index = toTypedArrayIndex(pixels, heap);
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, index);
      return;
    }
  }
  var pixelData = pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null;
  GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
};

_glTexImage2D.sig = "viiiiiiiip";

var _glTexParameteri = (x0, x1, x2) => GLctx.texParameteri(x0, x1, x2);

_glTexParameteri.sig = "viii";

var webglGetUniformLocation = location => {
  var p = GLctx.currentProgram;
  if (p) {
    var webglLoc = p.uniformLocsById[location];
    // p.uniformLocsById[location] stores either an integer, or a
    // WebGLUniformLocation.
    // If an integer, we have not yet bound the location, so do it now. The
    // integer value specifies the array index we should bind to.
    if (typeof webglLoc == "number") {
      p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? `[${webglLoc}]` : ""));
    }
    // Else an already cached WebGLUniformLocation, return it.
    return webglLoc;
  } else {
    GL.recordError(1282);
  }
};

var miniTempWebGLFloatBuffers = [];

var _glUniform1fv = (location, count, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform1fv(webglGetUniformLocation(location), HEAPF32, ((value) >> 2), count);
    return;
  }
  if (count <= 288) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; ++i) {
      view[i] = HEAPF32[(((value) + (4 * i)) >> 2)];
    }
  } else {
    var view = HEAPF32.subarray((((value) >> 2)), ((value + count * 4) >> 2));
  }
  GLctx.uniform1fv(webglGetUniformLocation(location), view);
};

_glUniform1fv.sig = "viip";

var _glUniform1i = (location, v0) => {
  GLctx.uniform1i(webglGetUniformLocation(location), v0);
};

_glUniform1i.sig = "vii";

var miniTempWebGLIntBuffers = [];

var _glUniform1iv = (location, count, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform1iv(webglGetUniformLocation(location), HEAP32, ((value) >> 2), count);
    return;
  }
  if (count <= 288) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLIntBuffers[count];
    for (var i = 0; i < count; ++i) {
      view[i] = HEAP32[(((value) + (4 * i)) >> 2)];
    }
  } else {
    var view = HEAP32.subarray((((value) >> 2)), ((value + count * 4) >> 2));
  }
  GLctx.uniform1iv(webglGetUniformLocation(location), view);
};

_glUniform1iv.sig = "viip";

var _glUniform2fv = (location, count, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform2fv(webglGetUniformLocation(location), HEAPF32, ((value) >> 2), count * 2);
    return;
  }
  if (count <= 144) {
    // avoid allocation when uploading few enough uniforms
    count *= 2;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 2) {
      view[i] = HEAPF32[(((value) + (4 * i)) >> 2)];
      view[i + 1] = HEAPF32[(((value) + (4 * i + 4)) >> 2)];
    }
  } else {
    var view = HEAPF32.subarray((((value) >> 2)), ((value + count * 8) >> 2));
  }
  GLctx.uniform2fv(webglGetUniformLocation(location), view);
};

_glUniform2fv.sig = "viip";

var _glUniform3fv = (location, count, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform3fv(webglGetUniformLocation(location), HEAPF32, ((value) >> 2), count * 3);
    return;
  }
  if (count <= 96) {
    // avoid allocation when uploading few enough uniforms
    count *= 3;
    var view = miniTempWebGLFloatBuffers[count];
    for (var i = 0; i < count; i += 3) {
      view[i] = HEAPF32[(((value) + (4 * i)) >> 2)];
      view[i + 1] = HEAPF32[(((value) + (4 * i + 4)) >> 2)];
      view[i + 2] = HEAPF32[(((value) + (4 * i + 8)) >> 2)];
    }
  } else {
    var view = HEAPF32.subarray((((value) >> 2)), ((value + count * 12) >> 2));
  }
  GLctx.uniform3fv(webglGetUniformLocation(location), view);
};

_glUniform3fv.sig = "viip";

var _glUniform4fv = (location, count, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniform4fv(webglGetUniformLocation(location), HEAPF32, ((value) >> 2), count * 4);
    return;
  }
  if (count <= 72) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[4 * count];
    // hoist the heap out of the loop for size and for pthreads+growth.
    var heap = HEAPF32;
    value = ((value) >> 2);
    count *= 4;
    for (var i = 0; i < count; i += 4) {
      var dst = value + i;
      view[i] = heap[dst];
      view[i + 1] = heap[dst + 1];
      view[i + 2] = heap[dst + 2];
      view[i + 3] = heap[dst + 3];
    }
  } else {
    var view = HEAPF32.subarray((((value) >> 2)), ((value + count * 16) >> 2));
  }
  GLctx.uniform4fv(webglGetUniformLocation(location), view);
};

_glUniform4fv.sig = "viip";

var _glUniformMatrix4fv = (location, count, transpose, value) => {
  if (GL.currentContext.version >= 2) {
    count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, ((value) >> 2), count * 16);
    return;
  }
  if (count <= 18) {
    // avoid allocation when uploading few enough uniforms
    var view = miniTempWebGLFloatBuffers[16 * count];
    // hoist the heap out of the loop for size and for pthreads+growth.
    var heap = HEAPF32;
    value = ((value) >> 2);
    count *= 16;
    for (var i = 0; i < count; i += 16) {
      var dst = value + i;
      view[i] = heap[dst];
      view[i + 1] = heap[dst + 1];
      view[i + 2] = heap[dst + 2];
      view[i + 3] = heap[dst + 3];
      view[i + 4] = heap[dst + 4];
      view[i + 5] = heap[dst + 5];
      view[i + 6] = heap[dst + 6];
      view[i + 7] = heap[dst + 7];
      view[i + 8] = heap[dst + 8];
      view[i + 9] = heap[dst + 9];
      view[i + 10] = heap[dst + 10];
      view[i + 11] = heap[dst + 11];
      view[i + 12] = heap[dst + 12];
      view[i + 13] = heap[dst + 13];
      view[i + 14] = heap[dst + 14];
      view[i + 15] = heap[dst + 15];
    }
  } else {
    var view = HEAPF32.subarray((((value) >> 2)), ((value + count * 64) >> 2));
  }
  GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
};

_glUniformMatrix4fv.sig = "viiip";

var _glUseProgram = program => {
  program = GL.programs[program];
  GLctx.useProgram(program);
  // Record the currently active program so that we can access the uniform
  // mapping table of that program.
  GLctx.currentProgram = program;
};

_glUseProgram.sig = "vi";

var _glVertexAttribDivisor = (index, divisor) => {
  GLctx.vertexAttribDivisor(index, divisor);
};

_glVertexAttribDivisor.sig = "vii";

var _glVertexAttribPointer = (index, size, type, normalized, stride, ptr) => {
  GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
};

_glVertexAttribPointer.sig = "viiiiip";

var _glViewport = (x0, x1, x2, x3) => GLctx.viewport(x0, x1, x2, x3);

_glViewport.sig = "viiii";

var WebXR = {
  refSpaces: {},
  _curRAF: null,
  _nativize_vec3: function(offset, vec) {
    setValue(offset + 0, vec.x, "float");
    setValue(offset + 4, vec.y, "float");
    setValue(offset + 8, vec.z, "float");
    return offset + 12;
  },
  _nativize_vec4: function(offset, vec) {
    WebXR._nativize_vec3(offset, vec);
    setValue(offset + 12, vec.w, "float");
    return offset + 16;
  },
  _nativize_matrix: function(offset, mat) {
    for (var i = 0; i < 16; ++i) {
      setValue(offset + i * 4, mat[i], "float");
    }
    return offset + 16 * 4;
  },
  _nativize_rigid_transform: function(offset, t) {
    offset = WebXR._nativize_matrix(offset, t.matrix);
    offset = WebXR._nativize_vec3(offset, t.position);
    offset = WebXR._nativize_vec4(offset, t.orientation);
    return offset;
  },
  _nativize_input_source: function(offset, inputSource, id) {
    var handedness = -1;
    if (inputSource.handedness == "left") handedness = 0; else if (inputSource.handedness == "right") handedness = 1;
    var targetRayMode = 0;
    if (inputSource.targetRayMode == "tracked-pointer") targetRayMode = 1; else if (inputSource.targetRayMode == "screen") targetRayMode = 2;
    setValue(offset, id, "i32");
    offset += 4;
    setValue(offset, handedness, "i32");
    offset += 4;
    setValue(offset, targetRayMode, "i32");
    offset += 4;
    return offset;
  },
  _set_input_callback__deps: [ "$dynCall" ],
  _set_input_callback: function(event, callback, userData) {
    var s = Module["webxr_session"];
    if (!s) return;
    if (!callback) return;
    s.addEventListener(event, function(e) {
      /* Nativize input source */ var inputSource = Module._malloc(8);
      /* 2*sizeof(int32) */ WebXR._nativize_input_source(inputSource, e.inputSource, i);
      /* Call native callback */ dynCall("vii", callback, [ inputSource, userData ]);
      _free(inputSource);
    });
  },
  _set_session_callback__deps: [ "$dynCall" ],
  _set_session_callback: function(event, callback, userData) {
    var s = Module["webxr_session"];
    if (!s) return;
    if (!callback) return;
    s.addEventListener(event, function() {
      dynCall("vi", callback, [ userData ]);
    });
  }
};

function _webxr_get_input_pose(source, outPosePtr, space) {
  let f = Module["webxr_frame"];
  if (!f) {
    console.warn("Cannot call webxr_get_input_pose outside of frame callback");
    return false;
  }
  const id = getValue(source, "i32");
  const input = Module["webxr_session"].inputSources[id];
  const s = space == 0 ? input.gripSpace : input.targetRaySpace;
  if (!s) return false;
  const pose = f.getPose(s, WebXR.refSpaces[WebXR.refSpace]);
  if (!pose || Number.isNaN(pose.transform.matrix[0])) return false;
  WebXR._nativize_rigid_transform(outPosePtr, pose.transform);
  return true;
}

function _webxr_get_input_sources(outArrayPtr, max, outCountPtr) {
  let s = Module["webxr_session"];
  if (!s) return;
  // TODO(squareys) warning or return error
  let i = 0;
  for (let inputSource of s.inputSources) {
    if (i >= max) break;
    outArrayPtr = WebXR._nativize_input_source(outArrayPtr, inputSource, i);
    ++i;
  }
  setValue(outCountPtr, i, "i32");
}

var dynCallLegacy = (sig, ptr, args) => {
  sig = sig.replace(/p/g, "i");
  var f = Module["dynCall_" + sig];
  return f(ptr, ...args);
};

var dynCall = (sig, ptr, args = []) => {
  // Without WASM_BIGINT support we cannot directly call function with i64 as
  // part of their signature, so we rely on the dynCall functions generated by
  // wasm-emscripten-finalize
  if (sig.includes("j")) {
    return dynCallLegacy(sig, ptr, args);
  }
  var rtn = getWasmTableEntry(ptr)(...args);
  return rtn;
};

function _webxr_init(frameCallback, startSessionCallback, endSessionCallback, errorCallback, userData) {
  function onError(errorCode) {
    if (!errorCallback) return;
    dynCall("vii", errorCallback, [ userData, errorCode ]);
  }
  function onSessionEnd(mode) {
    if (!endSessionCallback) return;
    mode = {
      "inline": 0,
      "immersive-vr": 1,
      "immersive-ar": 2
    }[mode];
    dynCall("vii", endSessionCallback, [ userData, mode ]);
  }
  function onSessionStart(mode) {
    if (!startSessionCallback) return;
    mode = {
      "inline": 0,
      "immersive-vr": 1,
      "immersive-ar": 2
    }[mode];
    dynCall("vii", startSessionCallback, [ userData, mode ]);
  }
  const SIZE_OF_WEBXR_VIEW = (16 + 3 + 4 + 16 + 4) * 4;
  const views = Module._malloc(SIZE_OF_WEBXR_VIEW * 2 + (16 + 4 + 3) * 4);
  function onFrame(time, frame) {
    if (!frameCallback) return;
    /* Request next frame */ const session = frame.session;
    /* RAF is set to null on session end to avoid rendering */ if (Module["webxr_session"] != null) session.requestAnimationFrame(onFrame);
    const pose = frame.getViewerPose(WebXR.refSpaces[WebXR.refSpace]);
    if (!pose) return;
    const glLayer = session.renderState.baseLayer;
    pose.views.forEach(function(view) {
      const viewport = glLayer.getViewport(view);
      let offset = views + SIZE_OF_WEBXR_VIEW * (view.eye == "right" ? 1 : 0);
      offset = WebXR._nativize_rigid_transform(offset, view.transform);
      offset = WebXR._nativize_matrix(offset, view.projectionMatrix);
      setValue(offset + 0, viewport.x, "i32");
      setValue(offset + 4, viewport.y, "i32");
      setValue(offset + 8, viewport.width, "i32");
      setValue(offset + 12, viewport.height, "i32");
    });
    /* Model matrix */ const modelMatrix = views + SIZE_OF_WEBXR_VIEW * 2;
    WebXR._nativize_matrix(modelMatrix, pose.transform.matrix);
    /* If framebuffer is non-null, compositor is enabled and we bind it.
           * If it's null, we need to avoid this call otherwise the canvas FBO is bound */ if (glLayer.framebuffer) {
      /* Make sure that FRAMEBUFFER_BINDING returns a valid value.
               * For that we create an id in the emscripten object tables
               * and add the frambuffer */ const id = Module.webxr_fbo || GL.getNewId(GL.framebuffers);
      glLayer.framebuffer.name = id;
      GL.framebuffers[id] = glLayer.framebuffer;
      Module.webxr_fbo = id;
      Module.ctx.bindFramebuffer(Module.ctx.FRAMEBUFFER, glLayer.framebuffer);
    }
    /* Set and reset environment for webxr_get_input_pose calls */ Module["webxr_frame"] = frame;
    dynCall("viiiii", frameCallback, [ userData, time, modelMatrix, views, pose.views.length ]);
    Module["webxr_frame"] = null;
  }
  function onSessionStarted(session, mode) {
    Module["webxr_session"] = session;
    // React to session ending
    session.addEventListener("end", function() {
      Module["webxr_session"].cancelAnimationFrame(WebXR._curRAF);
      WebXR._curRAF = null;
      Module["webxr_session"] = null;
      onSessionEnd(mode);
    });
    // Ensure our context can handle WebXR rendering
    Module.ctx.makeXRCompatible().then(function() {
      // Create the base layer
      const layer = Module["webxr_baseLayer"] = new window.XRWebGLLayer(session, Module.ctx, {
        framebufferScaleFactor: Module["webxr_framebuffer_scale_factor"]
      });
      session.updateRenderState({
        baseLayer: layer
      });
      /* 'viewer' reference space is always available. */ session.requestReferenceSpace("viewer").then(refSpace => {
        WebXR.refSpaces["viewer"] = refSpace;
        WebXR.refSpace = "viewer";
        // Give application a chance to react to session starting
        // e.g. finish current desktop frame.
        onSessionStart(mode);
        // Start rendering
        session.requestAnimationFrame(onFrame);
      });
      /* Request and cache other available spaces, which may not be available */ for (const s of [ "local", "local-floor", "bounded-floor", "unbounded" ]) {
        session.requestReferenceSpace(s).then(refSpace => {
          /* We prefer the reference space automatically in above order */ WebXR.refSpace = s;
          WebXR.refSpaces[s] = refSpace;
        }, function() {});
      }
    }, function() {
      onError(-3);
    });
  }
  if (navigator.xr) {
    Module["webxr_request_session_func"] = function(mode, requiredFeatures, optionalFeatures) {
      if (typeof (mode) !== "string") {
        mode = ([ "inline", "immersive-vr", "immersive-ar" ])[mode];
      }
      let toFeatureList = function(bitMask) {
        const f = [];
        const features = [ "local", "local-floor", "bounded-floor", "unbounded", "hit-test" ];
        for (let i = 0; i < features.length; ++i) {
          if ((bitMask & (1 << i)) != 0) {
            f.push(features[i]);
          }
        }
        return features;
      };
      if (typeof (requiredFeatures) === "number") {
        requiredFeatures = toFeatureList(requiredFeatures);
      }
      if (typeof (optionalFeatures) === "number") {
        optionalFeatures = toFeatureList(optionalFeatures);
      }
      navigator.xr.requestSession(mode, {
        requiredFeatures,
        optionalFeatures
      }).then(function(s) {
        onSessionStarted(s, mode);
      }).catch(console.error);
    };
  } else {
    /* Call error callback with "WebXR not supported" */ onError(-2);
  }
}

function _webxr_request_exit() {
  var s = Module["webxr_session"];
  if (s) Module["webxr_session"].end();
}

function _webxr_request_session(mode) {
  var s = Module["webxr_request_session_func"];
  if (s) s(mode);
}

function _webxr_set_select_callback(callback, userData) {
  WebXR._set_input_callback("select", callback, userData);
}

function _webxr_set_select_end_callback(callback, userData) {
  WebXR._set_input_callback("selectend", callback, userData);
}

function _webxr_set_select_start_callback(callback, userData) {
  WebXR._set_input_callback("selectstart", callback, userData);
}

var getCFunc = ident => {
  var func = Module["_" + ident];
  // closure exported function
  return func;
};

var writeArrayToMemory = (array, buffer) => {
  HEAP8.set(array, buffer);
};

/**
     * @param {string|null=} returnType
     * @param {Array=} argTypes
     * @param {Arguments|Array=} args
     * @param {Object=} opts
     */ var ccall = (ident, returnType, argTypes, args, opts) => {
  // For fast lookup of conversion functions
  var toC = {
    "string": str => {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        // null string
        ret = stringToUTF8OnStack(str);
      }
      return ret;
    },
    "array": arr => {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };
  function convertReturnValue(ret) {
    if (returnType === "string") {
      return UTF8ToString(ret);
    }
    if (returnType === "boolean") return Boolean(ret);
    return ret;
  }
  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func(...cArgs);
  function onDone(ret) {
    if (stack !== 0) stackRestore(stack);
    return convertReturnValue(ret);
  }
  ret = onDone(ret);
  return ret;
};

/**
     * @param {string=} returnType
     * @param {Array=} argTypes
     * @param {Object=} opts
     */ var cwrap = (ident, returnType, argTypes, opts) => {
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = !argTypes || argTypes.every(type => type === "number" || type === "boolean");
  var numericRet = returnType !== "string";
  if (numericRet && numericArgs && !opts) {
    return getCFunc(ident);
  }
  return (...args) => ccall(ident, returnType, argTypes, args, opts);
};

var FS_createPath = FS.createPath;

var FS_unlink = path => FS.unlink(path);

var FS_createLazyFile = FS.createLazyFile;

var FS_createDevice = FS.createDevice;

var getTempRet0 = val => __emscripten_tempret_get();

Module["getTempRet0"] = getTempRet0;

var setTempRet0 = val => __emscripten_tempret_set(val);

Module["setTempRet0"] = setTempRet0;

registerWasmPlugin();

FS.createPreloadedFile = FS_createPreloadedFile;

FS.staticInit();

// Set module methods based on EXPORTED_RUNTIME_METHODS
Module["FS_createPath"] = FS.createPath;

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

Module["FS_unlink"] = FS.unlink;

Module["FS_createLazyFile"] = FS.createLazyFile;

Module["FS_createDevice"] = FS.createDevice;

// exports
Module["requestFullscreen"] = Browser.requestFullscreen;

Module["setCanvasSize"] = Browser.setCanvasSize;

Module["getUserMedia"] = Browser.getUserMedia;

Module["createContext"] = Browser.createContext;

var preloadedImages = {};

var preloadedAudios = {};

Module["requestAnimationFrame"] = MainLoop.requestAnimationFrame;

Module["pauseMainLoop"] = MainLoop.pause;

Module["resumeMainLoop"] = MainLoop.resume;

MainLoop.init();

var miniTempWebGLFloatBuffersStorage = new Float32Array(288);

// Create GL_POOL_TEMP_BUFFERS_SIZE+1 temporary buffers, for uploads of size 0 through GL_POOL_TEMP_BUFFERS_SIZE inclusive
for (/**@suppress{duplicate}*/ var i = 0; i <= 288; ++i) {
  miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i);
}

var miniTempWebGLIntBuffersStorage = new Int32Array(288);

// Create GL_POOL_TEMP_BUFFERS_SIZE+1 temporary buffers, for uploads of size 0 through GL_POOL_TEMP_BUFFERS_SIZE inclusive
for (/**@suppress{duplicate}*/ var i = 0; i <= 288; ++i) {
  miniTempWebGLIntBuffers[i] = miniTempWebGLIntBuffersStorage.subarray(0, i);
}

var wasmImports = {
  /** @export */ __assert_fail: ___assert_fail,
  /** @export */ __c_longjmp: ___c_longjmp,
  /** @export */ __call_sighandler: ___call_sighandler,
  /** @export */ __cpp_exception: ___cpp_exception,
  /** @export */ __heap_base: ___heap_base,
  /** @export */ __indirect_function_table: wasmTable,
  /** @export */ __memory_base: ___memory_base,
  /** @export */ __stack_pointer: ___stack_pointer,
  /** @export */ __syscall__newselect: ___syscall__newselect,
  /** @export */ __syscall_accept4: ___syscall_accept4,
  /** @export */ __syscall_bind: ___syscall_bind,
  /** @export */ __syscall_chdir: ___syscall_chdir,
  /** @export */ __syscall_chmod: ___syscall_chmod,
  /** @export */ __syscall_connect: ___syscall_connect,
  /** @export */ __syscall_faccessat: ___syscall_faccessat,
  /** @export */ __syscall_fchmod: ___syscall_fchmod,
  /** @export */ __syscall_fchown32: ___syscall_fchown32,
  /** @export */ __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */ __syscall_fstat64: ___syscall_fstat64,
  /** @export */ __syscall_ftruncate64: ___syscall_ftruncate64,
  /** @export */ __syscall_getcwd: ___syscall_getcwd,
  /** @export */ __syscall_getdents64: ___syscall_getdents64,
  /** @export */ __syscall_getpeername: ___syscall_getpeername,
  /** @export */ __syscall_getsockname: ___syscall_getsockname,
  /** @export */ __syscall_getsockopt: ___syscall_getsockopt,
  /** @export */ __syscall_ioctl: ___syscall_ioctl,
  /** @export */ __syscall_listen: ___syscall_listen,
  /** @export */ __syscall_lstat64: ___syscall_lstat64,
  /** @export */ __syscall_mkdirat: ___syscall_mkdirat,
  /** @export */ __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */ __syscall_openat: ___syscall_openat,
  /** @export */ __syscall_poll: ___syscall_poll,
  /** @export */ __syscall_readlinkat: ___syscall_readlinkat,
  /** @export */ __syscall_recvfrom: ___syscall_recvfrom,
  /** @export */ __syscall_renameat: ___syscall_renameat,
  /** @export */ __syscall_rmdir: ___syscall_rmdir,
  /** @export */ __syscall_sendto: ___syscall_sendto,
  /** @export */ __syscall_socket: ___syscall_socket,
  /** @export */ __syscall_stat64: ___syscall_stat64,
  /** @export */ __syscall_symlink: ___syscall_symlink,
  /** @export */ __syscall_unlinkat: ___syscall_unlinkat,
  /** @export */ __syscall_utimensat: ___syscall_utimensat,
  /** @export */ __table_base: ___table_base,
  /** @export */ _abort_js: __abort_js,
  /** @export */ _dlopen_js: __dlopen_js,
  /** @export */ _dlsym_js: __dlsym_js,
  /** @export */ _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic,
  /** @export */ _emscripten_lookup_name: __emscripten_lookup_name,
  /** @export */ _emscripten_memcpy_js: __emscripten_memcpy_js,
  /** @export */ _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear,
  /** @export */ _gmtime_js: __gmtime_js,
  /** @export */ _localtime_js: __localtime_js,
  /** @export */ _mmap_js: __mmap_js,
  /** @export */ _munmap_js: __munmap_js,
  /** @export */ _tzset_js: __tzset_js,
  /** @export */ emscripten_asm_const_double: _emscripten_asm_const_double,
  /** @export */ emscripten_asm_const_int: _emscripten_asm_const_int,
  /** @export */ emscripten_asm_const_ptr: _emscripten_asm_const_ptr,
  /** @export */ emscripten_date_now: _emscripten_date_now,
  /** @export */ emscripten_force_exit: _emscripten_force_exit,
  /** @export */ emscripten_get_device_pixel_ratio: _emscripten_get_device_pixel_ratio,
  /** @export */ emscripten_get_now: _emscripten_get_now,
  /** @export */ emscripten_get_screen_size: _emscripten_get_screen_size,
  /** @export */ emscripten_get_window_title: _emscripten_get_window_title,
  /** @export */ emscripten_is_webgl_context_lost: _emscripten_is_webgl_context_lost,
  /** @export */ emscripten_request_fullscreen: _emscripten_request_fullscreen,
  /** @export */ emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */ emscripten_set_canvas_element_size: _emscripten_set_canvas_element_size,
  /** @export */ emscripten_set_keydown_callback_on_thread: _emscripten_set_keydown_callback_on_thread,
  /** @export */ emscripten_set_keypress_callback_on_thread: _emscripten_set_keypress_callback_on_thread,
  /** @export */ emscripten_set_keyup_callback_on_thread: _emscripten_set_keyup_callback_on_thread,
  /** @export */ emscripten_set_main_loop_arg: _emscripten_set_main_loop_arg,
  /** @export */ emscripten_set_mousedown_callback_on_thread: _emscripten_set_mousedown_callback_on_thread,
  /** @export */ emscripten_set_mouseenter_callback_on_thread: _emscripten_set_mouseenter_callback_on_thread,
  /** @export */ emscripten_set_mouseleave_callback_on_thread: _emscripten_set_mouseleave_callback_on_thread,
  /** @export */ emscripten_set_mousemove_callback_on_thread: _emscripten_set_mousemove_callback_on_thread,
  /** @export */ emscripten_set_mouseup_callback_on_thread: _emscripten_set_mouseup_callback_on_thread,
  /** @export */ emscripten_set_touchcancel_callback_on_thread: _emscripten_set_touchcancel_callback_on_thread,
  /** @export */ emscripten_set_touchend_callback_on_thread: _emscripten_set_touchend_callback_on_thread,
  /** @export */ emscripten_set_touchmove_callback_on_thread: _emscripten_set_touchmove_callback_on_thread,
  /** @export */ emscripten_set_touchstart_callback_on_thread: _emscripten_set_touchstart_callback_on_thread,
  /** @export */ emscripten_set_visibilitychange_callback_on_thread: _emscripten_set_visibilitychange_callback_on_thread,
  /** @export */ emscripten_set_webglcontextlost_callback_on_thread: _emscripten_set_webglcontextlost_callback_on_thread,
  /** @export */ emscripten_set_webglcontextrestored_callback_on_thread: _emscripten_set_webglcontextrestored_callback_on_thread,
  /** @export */ emscripten_set_wheel_callback_on_thread: _emscripten_set_wheel_callback_on_thread,
  /** @export */ emscripten_set_window_title: _emscripten_set_window_title,
  /** @export */ emscripten_webgl_create_context: _emscripten_webgl_create_context,
  /** @export */ emscripten_webgl_make_context_current: _emscripten_webgl_make_context_current,
  /** @export */ environ_get: _environ_get,
  /** @export */ environ_sizes_get: _environ_sizes_get,
  /** @export */ exit: _exit,
  /** @export */ fd_close: _fd_close,
  /** @export */ fd_fdstat_get: _fd_fdstat_get,
  /** @export */ fd_read: _fd_read,
  /** @export */ fd_seek: _fd_seek,
  /** @export */ fd_sync: _fd_sync,
  /** @export */ fd_write: _fd_write,
  /** @export */ getaddrinfo: _getaddrinfo,
  /** @export */ getnameinfo: _getnameinfo,
  /** @export */ glActiveTexture: _glActiveTexture,
  /** @export */ glAttachShader: _glAttachShader,
  /** @export */ glBindAttribLocation: _glBindAttribLocation,
  /** @export */ glBindBuffer: _glBindBuffer,
  /** @export */ glBindFramebuffer: _glBindFramebuffer,
  /** @export */ glBindRenderbuffer: _glBindRenderbuffer,
  /** @export */ glBindTexture: _glBindTexture,
  /** @export */ glBlendFunc: _glBlendFunc,
  /** @export */ glBufferData: _glBufferData,
  /** @export */ glBufferSubData: _glBufferSubData,
  /** @export */ glClear: _glClear,
  /** @export */ glClearColor: _glClearColor,
  /** @export */ glClearDepthf: _glClearDepthf,
  /** @export */ glClearStencil: _glClearStencil,
  /** @export */ glCompileShader: _glCompileShader,
  /** @export */ glCreateProgram: _glCreateProgram,
  /** @export */ glCreateShader: _glCreateShader,
  /** @export */ glCullFace: _glCullFace,
  /** @export */ glDeleteBuffers: _glDeleteBuffers,
  /** @export */ glDeleteFramebuffers: _glDeleteFramebuffers,
  /** @export */ glDeleteProgram: _glDeleteProgram,
  /** @export */ glDeleteRenderbuffers: _glDeleteRenderbuffers,
  /** @export */ glDeleteShader: _glDeleteShader,
  /** @export */ glDeleteTextures: _glDeleteTextures,
  /** @export */ glDepthFunc: _glDepthFunc,
  /** @export */ glDepthMask: _glDepthMask,
  /** @export */ glDetachShader: _glDetachShader,
  /** @export */ glDisable: _glDisable,
  /** @export */ glDisableVertexAttribArray: _glDisableVertexAttribArray,
  /** @export */ glDrawArrays: _glDrawArrays,
  /** @export */ glDrawArraysInstanced: _glDrawArraysInstanced,
  /** @export */ glDrawElements: _glDrawElements,
  /** @export */ glDrawElementsInstanced: _glDrawElementsInstanced,
  /** @export */ glEnable: _glEnable,
  /** @export */ glEnableVertexAttribArray: _glEnableVertexAttribArray,
  /** @export */ glFramebufferRenderbuffer: _glFramebufferRenderbuffer,
  /** @export */ glFramebufferTexture2D: _glFramebufferTexture2D,
  /** @export */ glGenBuffers: _glGenBuffers,
  /** @export */ glGenFramebuffers: _glGenFramebuffers,
  /** @export */ glGenRenderbuffers: _glGenRenderbuffers,
  /** @export */ glGenTextures: _glGenTextures,
  /** @export */ glGenerateMipmap: _glGenerateMipmap,
  /** @export */ glGetAttribLocation: _glGetAttribLocation,
  /** @export */ glGetBooleanv: _glGetBooleanv,
  /** @export */ glGetIntegerv: _glGetIntegerv,
  /** @export */ glGetProgramInfoLog: _glGetProgramInfoLog,
  /** @export */ glGetProgramiv: _glGetProgramiv,
  /** @export */ glGetShaderInfoLog: _glGetShaderInfoLog,
  /** @export */ glGetShaderPrecisionFormat: _glGetShaderPrecisionFormat,
  /** @export */ glGetShaderiv: _glGetShaderiv,
  /** @export */ glGetString: _glGetString,
  /** @export */ glGetUniformLocation: _glGetUniformLocation,
  /** @export */ glIsProgram: _glIsProgram,
  /** @export */ glIsRenderbuffer: _glIsRenderbuffer,
  /** @export */ glIsShader: _glIsShader,
  /** @export */ glLinkProgram: _glLinkProgram,
  /** @export */ glPixelStorei: _glPixelStorei,
  /** @export */ glReadPixels: _glReadPixels,
  /** @export */ glRenderbufferStorage: _glRenderbufferStorage,
  /** @export */ glScissor: _glScissor,
  /** @export */ glShaderSource: _glShaderSource,
  /** @export */ glStencilFunc: _glStencilFunc,
  /** @export */ glStencilMask: _glStencilMask,
  /** @export */ glStencilOp: _glStencilOp,
  /** @export */ glTexImage2D: _glTexImage2D,
  /** @export */ glTexParameteri: _glTexParameteri,
  /** @export */ glUniform1fv: _glUniform1fv,
  /** @export */ glUniform1i: _glUniform1i,
  /** @export */ glUniform1iv: _glUniform1iv,
  /** @export */ glUniform2fv: _glUniform2fv,
  /** @export */ glUniform3fv: _glUniform3fv,
  /** @export */ glUniform4fv: _glUniform4fv,
  /** @export */ glUniformMatrix4fv: _glUniformMatrix4fv,
  /** @export */ glUseProgram: _glUseProgram,
  /** @export */ glVertexAttribDivisor: _glVertexAttribDivisor,
  /** @export */ glVertexAttribPointer: _glVertexAttribPointer,
  /** @export */ glViewport: _glViewport,
  /** @export */ memory: wasmMemory,
  /** @export */ proc_exit: _proc_exit,
  /** @export */ webxr_get_input_pose: _webxr_get_input_pose,
  /** @export */ webxr_get_input_sources: _webxr_get_input_sources,
  /** @export */ webxr_init: _webxr_init,
  /** @export */ webxr_request_exit: _webxr_request_exit,
  /** @export */ webxr_request_session: _webxr_request_session,
  /** @export */ webxr_set_select_callback: _webxr_set_select_callback,
  /** @export */ webxr_set_select_end_callback: _webxr_set_select_end_callback,
  /** @export */ webxr_set_select_start_callback: _webxr_set_select_start_callback
};

var wasmExports = createWasm();

var ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])();

var _gapplication_addCallback = Module["_gapplication_addCallback"] = (a0, a1) => (_gapplication_addCallback = Module["_gapplication_addCallback"] = wasmExports["gapplication_addCallback"])(a0, a1);

var _gapplication_removeCallback = Module["_gapplication_removeCallback"] = (a0, a1) => (_gapplication_removeCallback = Module["_gapplication_removeCallback"] = wasmExports["gapplication_removeCallback"])(a0, a1);

var _main_registerPlugin = Module["_main_registerPlugin"] = (a0, a1) => (_main_registerPlugin = Module["_main_registerPlugin"] = wasmExports["main_registerPlugin"])(a0, a1);

var _JSPlayer_play = Module["_JSPlayer_play"] = a0 => (_JSPlayer_play = Module["_JSPlayer_play"] = wasmExports["JSPlayer_play"])(a0);

var _JSPlayer_stop = Module["_JSPlayer_stop"] = () => (_JSPlayer_stop = Module["_JSPlayer_stop"] = wasmExports["JSPlayer_stop"])();

var _JSPlayer_writeFile = Module["_JSPlayer_writeFile"] = (a0, a1, a2, a3) => (_JSPlayer_writeFile = Module["_JSPlayer_writeFile"] = wasmExports["JSPlayer_writeFile"])(a0, a1, a2, a3);

var _JSCall = Module["_JSCall"] = (a0, a1) => (_JSCall = Module["_JSCall"] = wasmExports["JSCall"])(a0, a1);

var _JSCallV = Module["_JSCallV"] = (a0, a1) => (_JSCallV = Module["_JSCallV"] = wasmExports["JSCallV"])(a0, a1);

var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["main"])(a0, a1);

var _JSNative_enqueueEvent = Module["_JSNative_enqueueEvent"] = (a0, a1, a2, a3, a4) => (_JSNative_enqueueEvent = Module["_JSNative_enqueueEvent"] = wasmExports["JSNative_enqueueEvent"])(a0, a1, a2, a3, a4);

var _g_pluginMain_JSNative = Module["_g_pluginMain_JSNative"] = (a0, a1) => (_g_pluginMain_JSNative = Module["_g_pluginMain_JSNative"] = wasmExports["g_pluginMain_JSNative"])(a0, a1);

var _g_pluginMain_WebXR = Module["_g_pluginMain_WebXR"] = (a0, a1) => (_g_pluginMain_WebXR = Module["_g_pluginMain_WebXR"] = wasmExports["g_pluginMain_WebXR"])(a0, a1);

var _cJSON_GetErrorPtr = Module["_cJSON_GetErrorPtr"] = () => (_cJSON_GetErrorPtr = Module["_cJSON_GetErrorPtr"] = wasmExports["cJSON_GetErrorPtr"])();

var _cJSON_GetStringValue = Module["_cJSON_GetStringValue"] = a0 => (_cJSON_GetStringValue = Module["_cJSON_GetStringValue"] = wasmExports["cJSON_GetStringValue"])(a0);

var _cJSON_IsString = Module["_cJSON_IsString"] = a0 => (_cJSON_IsString = Module["_cJSON_IsString"] = wasmExports["cJSON_IsString"])(a0);

var _cJSON_Version = Module["_cJSON_Version"] = () => (_cJSON_Version = Module["_cJSON_Version"] = wasmExports["cJSON_Version"])();

var _cJSON_InitHooks = Module["_cJSON_InitHooks"] = a0 => (_cJSON_InitHooks = Module["_cJSON_InitHooks"] = wasmExports["cJSON_InitHooks"])(a0);

var _cJSON_Delete = Module["_cJSON_Delete"] = a0 => (_cJSON_Delete = Module["_cJSON_Delete"] = wasmExports["cJSON_Delete"])(a0);

var _cJSON_SetNumberHelper = Module["_cJSON_SetNumberHelper"] = (a0, a1) => (_cJSON_SetNumberHelper = Module["_cJSON_SetNumberHelper"] = wasmExports["cJSON_SetNumberHelper"])(a0, a1);

var _cJSON_ParseWithOpts = Module["_cJSON_ParseWithOpts"] = (a0, a1, a2) => (_cJSON_ParseWithOpts = Module["_cJSON_ParseWithOpts"] = wasmExports["cJSON_ParseWithOpts"])(a0, a1, a2);

var _cJSON_Parse = Module["_cJSON_Parse"] = a0 => (_cJSON_Parse = Module["_cJSON_Parse"] = wasmExports["cJSON_Parse"])(a0);

var _cJSON_Print = Module["_cJSON_Print"] = a0 => (_cJSON_Print = Module["_cJSON_Print"] = wasmExports["cJSON_Print"])(a0);

var _cJSON_PrintUnformatted = Module["_cJSON_PrintUnformatted"] = a0 => (_cJSON_PrintUnformatted = Module["_cJSON_PrintUnformatted"] = wasmExports["cJSON_PrintUnformatted"])(a0);

var _cJSON_PrintBuffered = Module["_cJSON_PrintBuffered"] = (a0, a1, a2) => (_cJSON_PrintBuffered = Module["_cJSON_PrintBuffered"] = wasmExports["cJSON_PrintBuffered"])(a0, a1, a2);

var _cJSON_PrintPreallocated = Module["_cJSON_PrintPreallocated"] = (a0, a1, a2, a3) => (_cJSON_PrintPreallocated = Module["_cJSON_PrintPreallocated"] = wasmExports["cJSON_PrintPreallocated"])(a0, a1, a2, a3);

var _cJSON_GetArraySize = Module["_cJSON_GetArraySize"] = a0 => (_cJSON_GetArraySize = Module["_cJSON_GetArraySize"] = wasmExports["cJSON_GetArraySize"])(a0);

var _cJSON_GetArrayItem = Module["_cJSON_GetArrayItem"] = (a0, a1) => (_cJSON_GetArrayItem = Module["_cJSON_GetArrayItem"] = wasmExports["cJSON_GetArrayItem"])(a0, a1);

var _cJSON_GetObjectItem = Module["_cJSON_GetObjectItem"] = (a0, a1) => (_cJSON_GetObjectItem = Module["_cJSON_GetObjectItem"] = wasmExports["cJSON_GetObjectItem"])(a0, a1);

var _cJSON_GetObjectItemCaseSensitive = Module["_cJSON_GetObjectItemCaseSensitive"] = (a0, a1) => (_cJSON_GetObjectItemCaseSensitive = Module["_cJSON_GetObjectItemCaseSensitive"] = wasmExports["cJSON_GetObjectItemCaseSensitive"])(a0, a1);

var _cJSON_HasObjectItem = Module["_cJSON_HasObjectItem"] = (a0, a1) => (_cJSON_HasObjectItem = Module["_cJSON_HasObjectItem"] = wasmExports["cJSON_HasObjectItem"])(a0, a1);

var _cJSON_AddItemToArray = Module["_cJSON_AddItemToArray"] = (a0, a1) => (_cJSON_AddItemToArray = Module["_cJSON_AddItemToArray"] = wasmExports["cJSON_AddItemToArray"])(a0, a1);

var _cJSON_AddItemToObject = Module["_cJSON_AddItemToObject"] = (a0, a1, a2) => (_cJSON_AddItemToObject = Module["_cJSON_AddItemToObject"] = wasmExports["cJSON_AddItemToObject"])(a0, a1, a2);

var _cJSON_AddItemToObjectCS = Module["_cJSON_AddItemToObjectCS"] = (a0, a1, a2) => (_cJSON_AddItemToObjectCS = Module["_cJSON_AddItemToObjectCS"] = wasmExports["cJSON_AddItemToObjectCS"])(a0, a1, a2);

var _cJSON_AddItemReferenceToArray = Module["_cJSON_AddItemReferenceToArray"] = (a0, a1) => (_cJSON_AddItemReferenceToArray = Module["_cJSON_AddItemReferenceToArray"] = wasmExports["cJSON_AddItemReferenceToArray"])(a0, a1);

var _cJSON_AddItemReferenceToObject = Module["_cJSON_AddItemReferenceToObject"] = (a0, a1, a2) => (_cJSON_AddItemReferenceToObject = Module["_cJSON_AddItemReferenceToObject"] = wasmExports["cJSON_AddItemReferenceToObject"])(a0, a1, a2);

var _cJSON_AddNullToObject = Module["_cJSON_AddNullToObject"] = (a0, a1) => (_cJSON_AddNullToObject = Module["_cJSON_AddNullToObject"] = wasmExports["cJSON_AddNullToObject"])(a0, a1);

var _cJSON_CreateNull = Module["_cJSON_CreateNull"] = () => (_cJSON_CreateNull = Module["_cJSON_CreateNull"] = wasmExports["cJSON_CreateNull"])();

var _cJSON_AddTrueToObject = Module["_cJSON_AddTrueToObject"] = (a0, a1) => (_cJSON_AddTrueToObject = Module["_cJSON_AddTrueToObject"] = wasmExports["cJSON_AddTrueToObject"])(a0, a1);

var _cJSON_CreateTrue = Module["_cJSON_CreateTrue"] = () => (_cJSON_CreateTrue = Module["_cJSON_CreateTrue"] = wasmExports["cJSON_CreateTrue"])();

var _cJSON_AddFalseToObject = Module["_cJSON_AddFalseToObject"] = (a0, a1) => (_cJSON_AddFalseToObject = Module["_cJSON_AddFalseToObject"] = wasmExports["cJSON_AddFalseToObject"])(a0, a1);

var _cJSON_CreateFalse = Module["_cJSON_CreateFalse"] = () => (_cJSON_CreateFalse = Module["_cJSON_CreateFalse"] = wasmExports["cJSON_CreateFalse"])();

var _cJSON_AddBoolToObject = Module["_cJSON_AddBoolToObject"] = (a0, a1, a2) => (_cJSON_AddBoolToObject = Module["_cJSON_AddBoolToObject"] = wasmExports["cJSON_AddBoolToObject"])(a0, a1, a2);

var _cJSON_CreateBool = Module["_cJSON_CreateBool"] = a0 => (_cJSON_CreateBool = Module["_cJSON_CreateBool"] = wasmExports["cJSON_CreateBool"])(a0);

var _cJSON_AddNumberToObject = Module["_cJSON_AddNumberToObject"] = (a0, a1, a2) => (_cJSON_AddNumberToObject = Module["_cJSON_AddNumberToObject"] = wasmExports["cJSON_AddNumberToObject"])(a0, a1, a2);

var _cJSON_CreateNumber = Module["_cJSON_CreateNumber"] = a0 => (_cJSON_CreateNumber = Module["_cJSON_CreateNumber"] = wasmExports["cJSON_CreateNumber"])(a0);

var _cJSON_AddStringToObject = Module["_cJSON_AddStringToObject"] = (a0, a1, a2) => (_cJSON_AddStringToObject = Module["_cJSON_AddStringToObject"] = wasmExports["cJSON_AddStringToObject"])(a0, a1, a2);

var _cJSON_CreateString = Module["_cJSON_CreateString"] = a0 => (_cJSON_CreateString = Module["_cJSON_CreateString"] = wasmExports["cJSON_CreateString"])(a0);

var _cJSON_AddBinaryToObject = Module["_cJSON_AddBinaryToObject"] = (a0, a1, a2, a3) => (_cJSON_AddBinaryToObject = Module["_cJSON_AddBinaryToObject"] = wasmExports["cJSON_AddBinaryToObject"])(a0, a1, a2, a3);

var _cJSON_CreateBinary = Module["_cJSON_CreateBinary"] = (a0, a1) => (_cJSON_CreateBinary = Module["_cJSON_CreateBinary"] = wasmExports["cJSON_CreateBinary"])(a0, a1);

var _cJSON_AddRawToObject = Module["_cJSON_AddRawToObject"] = (a0, a1, a2) => (_cJSON_AddRawToObject = Module["_cJSON_AddRawToObject"] = wasmExports["cJSON_AddRawToObject"])(a0, a1, a2);

var _cJSON_CreateRaw = Module["_cJSON_CreateRaw"] = a0 => (_cJSON_CreateRaw = Module["_cJSON_CreateRaw"] = wasmExports["cJSON_CreateRaw"])(a0);

var _cJSON_AddObjectToObject = Module["_cJSON_AddObjectToObject"] = (a0, a1) => (_cJSON_AddObjectToObject = Module["_cJSON_AddObjectToObject"] = wasmExports["cJSON_AddObjectToObject"])(a0, a1);

var _cJSON_CreateObject = Module["_cJSON_CreateObject"] = () => (_cJSON_CreateObject = Module["_cJSON_CreateObject"] = wasmExports["cJSON_CreateObject"])();

var _cJSON_AddArrayToObject = Module["_cJSON_AddArrayToObject"] = (a0, a1) => (_cJSON_AddArrayToObject = Module["_cJSON_AddArrayToObject"] = wasmExports["cJSON_AddArrayToObject"])(a0, a1);

var _cJSON_CreateArray = Module["_cJSON_CreateArray"] = () => (_cJSON_CreateArray = Module["_cJSON_CreateArray"] = wasmExports["cJSON_CreateArray"])();

var _cJSON_DetachItemViaPointer = Module["_cJSON_DetachItemViaPointer"] = (a0, a1) => (_cJSON_DetachItemViaPointer = Module["_cJSON_DetachItemViaPointer"] = wasmExports["cJSON_DetachItemViaPointer"])(a0, a1);

var _cJSON_DetachItemFromArray = Module["_cJSON_DetachItemFromArray"] = (a0, a1) => (_cJSON_DetachItemFromArray = Module["_cJSON_DetachItemFromArray"] = wasmExports["cJSON_DetachItemFromArray"])(a0, a1);

var _cJSON_DeleteItemFromArray = Module["_cJSON_DeleteItemFromArray"] = (a0, a1) => (_cJSON_DeleteItemFromArray = Module["_cJSON_DeleteItemFromArray"] = wasmExports["cJSON_DeleteItemFromArray"])(a0, a1);

var _cJSON_DetachItemFromObject = Module["_cJSON_DetachItemFromObject"] = (a0, a1) => (_cJSON_DetachItemFromObject = Module["_cJSON_DetachItemFromObject"] = wasmExports["cJSON_DetachItemFromObject"])(a0, a1);

var _cJSON_DetachItemFromObjectCaseSensitive = Module["_cJSON_DetachItemFromObjectCaseSensitive"] = (a0, a1) => (_cJSON_DetachItemFromObjectCaseSensitive = Module["_cJSON_DetachItemFromObjectCaseSensitive"] = wasmExports["cJSON_DetachItemFromObjectCaseSensitive"])(a0, a1);

var _cJSON_DeleteItemFromObject = Module["_cJSON_DeleteItemFromObject"] = (a0, a1) => (_cJSON_DeleteItemFromObject = Module["_cJSON_DeleteItemFromObject"] = wasmExports["cJSON_DeleteItemFromObject"])(a0, a1);

var _cJSON_DeleteItemFromObjectCaseSensitive = Module["_cJSON_DeleteItemFromObjectCaseSensitive"] = (a0, a1) => (_cJSON_DeleteItemFromObjectCaseSensitive = Module["_cJSON_DeleteItemFromObjectCaseSensitive"] = wasmExports["cJSON_DeleteItemFromObjectCaseSensitive"])(a0, a1);

var _cJSON_InsertItemInArray = Module["_cJSON_InsertItemInArray"] = (a0, a1, a2) => (_cJSON_InsertItemInArray = Module["_cJSON_InsertItemInArray"] = wasmExports["cJSON_InsertItemInArray"])(a0, a1, a2);

var _cJSON_ReplaceItemViaPointer = Module["_cJSON_ReplaceItemViaPointer"] = (a0, a1, a2) => (_cJSON_ReplaceItemViaPointer = Module["_cJSON_ReplaceItemViaPointer"] = wasmExports["cJSON_ReplaceItemViaPointer"])(a0, a1, a2);

var _cJSON_ReplaceItemInArray = Module["_cJSON_ReplaceItemInArray"] = (a0, a1, a2) => (_cJSON_ReplaceItemInArray = Module["_cJSON_ReplaceItemInArray"] = wasmExports["cJSON_ReplaceItemInArray"])(a0, a1, a2);

var _cJSON_ReplaceItemInObject = Module["_cJSON_ReplaceItemInObject"] = (a0, a1, a2) => (_cJSON_ReplaceItemInObject = Module["_cJSON_ReplaceItemInObject"] = wasmExports["cJSON_ReplaceItemInObject"])(a0, a1, a2);

var _cJSON_ReplaceItemInObjectCaseSensitive = Module["_cJSON_ReplaceItemInObjectCaseSensitive"] = (a0, a1, a2) => (_cJSON_ReplaceItemInObjectCaseSensitive = Module["_cJSON_ReplaceItemInObjectCaseSensitive"] = wasmExports["cJSON_ReplaceItemInObjectCaseSensitive"])(a0, a1, a2);

var _cJSON_malloc = Module["_cJSON_malloc"] = a0 => (_cJSON_malloc = Module["_cJSON_malloc"] = wasmExports["cJSON_malloc"])(a0);

var _cJSON_CreateStringReference = Module["_cJSON_CreateStringReference"] = a0 => (_cJSON_CreateStringReference = Module["_cJSON_CreateStringReference"] = wasmExports["cJSON_CreateStringReference"])(a0);

var _cJSON_CreateObjectReference = Module["_cJSON_CreateObjectReference"] = a0 => (_cJSON_CreateObjectReference = Module["_cJSON_CreateObjectReference"] = wasmExports["cJSON_CreateObjectReference"])(a0);

var _cJSON_CreateArrayReference = Module["_cJSON_CreateArrayReference"] = a0 => (_cJSON_CreateArrayReference = Module["_cJSON_CreateArrayReference"] = wasmExports["cJSON_CreateArrayReference"])(a0);

var _cJSON_CreateIntArray = Module["_cJSON_CreateIntArray"] = (a0, a1) => (_cJSON_CreateIntArray = Module["_cJSON_CreateIntArray"] = wasmExports["cJSON_CreateIntArray"])(a0, a1);

var _cJSON_CreateFloatArray = Module["_cJSON_CreateFloatArray"] = (a0, a1) => (_cJSON_CreateFloatArray = Module["_cJSON_CreateFloatArray"] = wasmExports["cJSON_CreateFloatArray"])(a0, a1);

var _cJSON_CreateDoubleArray = Module["_cJSON_CreateDoubleArray"] = (a0, a1) => (_cJSON_CreateDoubleArray = Module["_cJSON_CreateDoubleArray"] = wasmExports["cJSON_CreateDoubleArray"])(a0, a1);

var _cJSON_CreateStringArray = Module["_cJSON_CreateStringArray"] = (a0, a1) => (_cJSON_CreateStringArray = Module["_cJSON_CreateStringArray"] = wasmExports["cJSON_CreateStringArray"])(a0, a1);

var _cJSON_Duplicate = Module["_cJSON_Duplicate"] = (a0, a1) => (_cJSON_Duplicate = Module["_cJSON_Duplicate"] = wasmExports["cJSON_Duplicate"])(a0, a1);

var _cJSON_Minify = Module["_cJSON_Minify"] = a0 => (_cJSON_Minify = Module["_cJSON_Minify"] = wasmExports["cJSON_Minify"])(a0);

var _cJSON_IsInvalid = Module["_cJSON_IsInvalid"] = a0 => (_cJSON_IsInvalid = Module["_cJSON_IsInvalid"] = wasmExports["cJSON_IsInvalid"])(a0);

var _cJSON_IsFalse = Module["_cJSON_IsFalse"] = a0 => (_cJSON_IsFalse = Module["_cJSON_IsFalse"] = wasmExports["cJSON_IsFalse"])(a0);

var _cJSON_IsTrue = Module["_cJSON_IsTrue"] = a0 => (_cJSON_IsTrue = Module["_cJSON_IsTrue"] = wasmExports["cJSON_IsTrue"])(a0);

var _cJSON_IsBool = Module["_cJSON_IsBool"] = a0 => (_cJSON_IsBool = Module["_cJSON_IsBool"] = wasmExports["cJSON_IsBool"])(a0);

var _cJSON_IsNull = Module["_cJSON_IsNull"] = a0 => (_cJSON_IsNull = Module["_cJSON_IsNull"] = wasmExports["cJSON_IsNull"])(a0);

var _cJSON_IsNumber = Module["_cJSON_IsNumber"] = a0 => (_cJSON_IsNumber = Module["_cJSON_IsNumber"] = wasmExports["cJSON_IsNumber"])(a0);

var _cJSON_IsArray = Module["_cJSON_IsArray"] = a0 => (_cJSON_IsArray = Module["_cJSON_IsArray"] = wasmExports["cJSON_IsArray"])(a0);

var _cJSON_IsObject = Module["_cJSON_IsObject"] = a0 => (_cJSON_IsObject = Module["_cJSON_IsObject"] = wasmExports["cJSON_IsObject"])(a0);

var _cJSON_IsRaw = Module["_cJSON_IsRaw"] = a0 => (_cJSON_IsRaw = Module["_cJSON_IsRaw"] = wasmExports["cJSON_IsRaw"])(a0);

var _cJSON_Compare = Module["_cJSON_Compare"] = (a0, a1, a2) => (_cJSON_Compare = Module["_cJSON_Compare"] = wasmExports["cJSON_Compare"])(a0, a1, a2);

var _cJSON_free = Module["_cJSON_free"] = a0 => (_cJSON_free = Module["_cJSON_free"] = wasmExports["cJSON_free"])(a0);

var _gapplication_clipboardCallback = Module["_gapplication_clipboardCallback"] = (a0, a1, a2, a3) => (_gapplication_clipboardCallback = Module["_gapplication_clipboardCallback"] = wasmExports["gapplication_clipboardCallback"])(a0, a1, a2, a3);

var _gimage_parseImage = Module["_gimage_parseImage"] = (a0, a1, a2, a3) => (_gimage_parseImage = Module["_gimage_parseImage"] = wasmExports["gimage_parseImage"])(a0, a1, a2, a3);

var _gimage_saveImage = Module["_gimage_saveImage"] = (a0, a1, a2, a3) => (_gimage_saveImage = Module["_gimage_saveImage"] = wasmExports["gimage_saveImage"])(a0, a1, a2, a3);

var _gimage_loadImage = Module["_gimage_loadImage"] = (a0, a1) => (_gimage_loadImage = Module["_gimage_loadImage"] = wasmExports["gimage_loadImage"])(a0, a1);

var _gimage_premultiplyAlpha = Module["_gimage_premultiplyAlpha"] = (a0, a1, a2) => (_gimage_premultiplyAlpha = Module["_gimage_premultiplyAlpha"] = wasmExports["gimage_premultiplyAlpha"])(a0, a1, a2);

var _gimage_parsePng = Module["_gimage_parsePng"] = (a0, a1, a2, a3) => (_gimage_parsePng = Module["_gimage_parsePng"] = wasmExports["gimage_parsePng"])(a0, a1, a2, a3);

var _gimage_loadPng = Module["_gimage_loadPng"] = (a0, a1) => (_gimage_loadPng = Module["_gimage_loadPng"] = wasmExports["gimage_loadPng"])(a0, a1);

var _gimage_savePng = Module["_gimage_savePng"] = (a0, a1, a2, a3) => (_gimage_savePng = Module["_gimage_savePng"] = wasmExports["gimage_savePng"])(a0, a1, a2, a3);

var _gimage_parseJpg = Module["_gimage_parseJpg"] = (a0, a1, a2, a3) => (_gimage_parseJpg = Module["_gimage_parseJpg"] = wasmExports["gimage_parseJpg"])(a0, a1, a2, a3);

var _gimage_loadJpg = Module["_gimage_loadJpg"] = (a0, a1) => (_gimage_loadJpg = Module["_gimage_loadJpg"] = wasmExports["gimage_loadJpg"])(a0, a1);

var _gimage_saveJpg = Module["_gimage_saveJpg"] = (a0, a1, a2, a3) => (_gimage_saveJpg = Module["_gimage_saveJpg"] = wasmExports["gimage_saveJpg"])(a0, a1, a2, a3);

var _gtexture_set_engine = Module["_gtexture_set_engine"] = a0 => (_gtexture_set_engine = Module["_gtexture_set_engine"] = wasmExports["gtexture_set_engine"])(a0);

var _gtexture_get_engine = Module["_gtexture_get_engine"] = () => (_gtexture_get_engine = Module["_gtexture_get_engine"] = wasmExports["gtexture_get_engine"])();

var _gtexture_set_spritefactory = Module["_gtexture_set_spritefactory"] = a0 => (_gtexture_set_spritefactory = Module["_gtexture_set_spritefactory"] = wasmExports["gtexture_set_spritefactory"])(a0);

var _gtexture_get_spritefactory = Module["_gtexture_get_spritefactory"] = () => (_gtexture_get_spritefactory = Module["_gtexture_get_spritefactory"] = wasmExports["gtexture_get_spritefactory"])();

var _gtexture_set_screenmanager = Module["_gtexture_set_screenmanager"] = a0 => (_gtexture_set_screenmanager = Module["_gtexture_set_screenmanager"] = wasmExports["gtexture_set_screenmanager"])(a0);

var _gtexture_get_screenmanager = Module["_gtexture_get_screenmanager"] = () => (_gtexture_get_screenmanager = Module["_gtexture_get_screenmanager"] = wasmExports["gtexture_get_screenmanager"])();

var _gtexture_init = Module["_gtexture_init"] = () => (_gtexture_init = Module["_gtexture_init"] = wasmExports["gtexture_init"])();

var _gtexture_cleanup = Module["_gtexture_cleanup"] = () => (_gtexture_cleanup = Module["_gtexture_cleanup"] = wasmExports["gtexture_cleanup"])();

var _gtexture_create = Module["_gtexture_create"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_gtexture_create = Module["_gtexture_create"] = wasmExports["gtexture_create"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var _gtexture_update = Module["_gtexture_update"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_gtexture_update = Module["_gtexture_update"] = wasmExports["gtexture_update"])(a0, a1, a2, a3, a4, a5, a6, a7);

var _gtexture_delete = Module["_gtexture_delete"] = a0 => (_gtexture_delete = Module["_gtexture_delete"] = wasmExports["gtexture_delete"])(a0);

var _gtexture_getInternalTexture = Module["_gtexture_getInternalTexture"] = a0 => (_gtexture_getInternalTexture = Module["_gtexture_getInternalTexture"] = wasmExports["gtexture_getInternalTexture"])(a0);

var _gtexture_setUserData = Module["_gtexture_setUserData"] = (a0, a1) => (_gtexture_setUserData = Module["_gtexture_setUserData"] = wasmExports["gtexture_setUserData"])(a0, a1);

var _gtexture_getUserData = Module["_gtexture_getUserData"] = a0 => (_gtexture_getUserData = Module["_gtexture_getUserData"] = wasmExports["gtexture_getUserData"])(a0);

var _gtexture_tick = Module["_gtexture_tick"] = () => (_gtexture_tick = Module["_gtexture_tick"] = wasmExports["gtexture_tick"])();

var _gtexture_setCachingEnabled = Module["_gtexture_setCachingEnabled"] = a0 => (_gtexture_setCachingEnabled = Module["_gtexture_setCachingEnabled"] = wasmExports["gtexture_setCachingEnabled"])(a0);

var _gtexture_reloadTextures = Module["_gtexture_reloadTextures"] = () => (_gtexture_reloadTextures = Module["_gtexture_reloadTextures"] = wasmExports["gtexture_reloadTextures"])();

var _gtexture_reuse = Module["_gtexture_reuse"] = (a0, a1, a2, a3, a4, a5) => (_gtexture_reuse = Module["_gtexture_reuse"] = wasmExports["gtexture_reuse"])(a0, a1, a2, a3, a4, a5);

var _gtexture_getMemoryUsage = Module["_gtexture_getMemoryUsage"] = () => (_gtexture_getMemoryUsage = Module["_gtexture_getMemoryUsage"] = wasmExports["gtexture_getMemoryUsage"])();

var _gtexture_RenderTargetCreate = Module["_gtexture_RenderTargetCreate"] = (a0, a1, a2, a3, a4, a5) => (_gtexture_RenderTargetCreate = Module["_gtexture_RenderTargetCreate"] = wasmExports["gtexture_RenderTargetCreate"])(a0, a1, a2, a3, a4, a5);

var _gtexture_RenderTargetGetFBO = Module["_gtexture_RenderTargetGetFBO"] = a0 => (_gtexture_RenderTargetGetFBO = Module["_gtexture_RenderTargetGetFBO"] = wasmExports["gtexture_RenderTargetGetFBO"])(a0);

var _gtexture_SaveRenderTargets = Module["_gtexture_SaveRenderTargets"] = () => (_gtexture_SaveRenderTargets = Module["_gtexture_SaveRenderTargets"] = wasmExports["gtexture_SaveRenderTargets"])();

var _gtexture_RestoreRenderTargets = Module["_gtexture_RestoreRenderTargets"] = () => (_gtexture_RestoreRenderTargets = Module["_gtexture_RestoreRenderTargets"] = wasmExports["gtexture_RestoreRenderTargets"])();

var _gtexture_TempTextureCreate = Module["_gtexture_TempTextureCreate"] = (a0, a1) => (_gtexture_TempTextureCreate = Module["_gtexture_TempTextureCreate"] = wasmExports["gtexture_TempTextureCreate"])(a0, a1);

var _gtexture_TempTextureDelete = Module["_gtexture_TempTextureDelete"] = a0 => (_gtexture_TempTextureDelete = Module["_gtexture_TempTextureDelete"] = wasmExports["gtexture_TempTextureDelete"])(a0);

var _gtexture_TempTextureGetName = Module["_gtexture_TempTextureGetName"] = a0 => (_gtexture_TempTextureGetName = Module["_gtexture_TempTextureGetName"] = wasmExports["gtexture_TempTextureGetName"])(a0);

var _gtexture_RestoreTempTextures = Module["_gtexture_RestoreTempTextures"] = () => (_gtexture_RestoreTempTextures = Module["_gtexture_RestoreTempTextures"] = wasmExports["gtexture_RestoreTempTextures"])();

var _gtexture_BindRenderTarget = Module["_gtexture_BindRenderTarget"] = a0 => (_gtexture_BindRenderTarget = Module["_gtexture_BindRenderTarget"] = wasmExports["gtexture_BindRenderTarget"])(a0);

var _g_setGlobalHook = Module["_g_setGlobalHook"] = (a0, a1) => (_g_setGlobalHook = Module["_g_setGlobalHook"] = wasmExports["g_setGlobalHook"])(a0, a1);

var _g_getGlobalHook = Module["_g_getGlobalHook"] = a0 => (_g_getGlobalHook = Module["_g_getGlobalHook"] = wasmExports["g_getGlobalHook"])(a0);

var __ZN19gevent_CallbackList13dispatchEventEiPv = Module["__ZN19gevent_CallbackList13dispatchEventEiPv"] = (a0, a1, a2) => (__ZN19gevent_CallbackList13dispatchEventEiPv = Module["__ZN19gevent_CallbackList13dispatchEventEiPv"] = wasmExports["_ZN19gevent_CallbackList13dispatchEventEiPv"])(a0, a1, a2);

var _gevent_Init = Module["_gevent_Init"] = () => (_gevent_Init = Module["_gevent_Init"] = wasmExports["gevent_Init"])();

var __ZN19gevent_CallbackListC1Ev = Module["__ZN19gevent_CallbackListC1Ev"] = a0 => (__ZN19gevent_CallbackListC1Ev = Module["__ZN19gevent_CallbackListC1Ev"] = wasmExports["_ZN19gevent_CallbackListC1Ev"])(a0);

var __ZN19gevent_CallbackListD1Ev = Module["__ZN19gevent_CallbackListD1Ev"] = a0 => (__ZN19gevent_CallbackListD1Ev = Module["__ZN19gevent_CallbackListD1Ev"] = wasmExports["_ZN19gevent_CallbackListD1Ev"])(a0);

var _gevent_Cleanup = Module["_gevent_Cleanup"] = () => (_gevent_Cleanup = Module["_gevent_Cleanup"] = wasmExports["gevent_Cleanup"])();

var _gevent_Tick = Module["_gevent_Tick"] = () => (_gevent_Tick = Module["_gevent_Tick"] = wasmExports["gevent_Tick"])();

var _gevent_SetFlusher = Module["_gevent_SetFlusher"] = a0 => (_gevent_SetFlusher = Module["_gevent_SetFlusher"] = wasmExports["gevent_SetFlusher"])(a0);

var _gevent_AllowEventMerge = Module["_gevent_AllowEventMerge"] = a0 => (_gevent_AllowEventMerge = Module["_gevent_AllowEventMerge"] = wasmExports["gevent_AllowEventMerge"])(a0);

var _gevent_Flush = Module["_gevent_Flush"] = () => (_gevent_Flush = Module["_gevent_Flush"] = wasmExports["gevent_Flush"])();

var _gevent_EnqueueEvent = Module["_gevent_EnqueueEvent"] = (a0, a1, a2, a3, a4, a5) => (_gevent_EnqueueEvent = Module["_gevent_EnqueueEvent"] = wasmExports["gevent_EnqueueEvent"])(a0, a1, a2, a3, a4, a5);

var _gevent_MergeEvent = Module["_gevent_MergeEvent"] = (a0, a1, a2, a3, a4, a5) => (_gevent_MergeEvent = Module["_gevent_MergeEvent"] = wasmExports["gevent_MergeEvent"])(a0, a1, a2, a3, a4, a5);

var _gevent_RemoveEventsWithGid = Module["_gevent_RemoveEventsWithGid"] = a0 => (_gevent_RemoveEventsWithGid = Module["_gevent_RemoveEventsWithGid"] = wasmExports["gevent_RemoveEventsWithGid"])(a0);

var _gevent_AddCallback = Module["_gevent_AddCallback"] = (a0, a1) => (_gevent_AddCallback = Module["_gevent_AddCallback"] = wasmExports["gevent_AddCallback"])(a0, a1);

var __ZN19gevent_CallbackList11addCallbackEPFviPvS0_ES0_ = Module["__ZN19gevent_CallbackList11addCallbackEPFviPvS0_ES0_"] = (a0, a1, a2) => (__ZN19gevent_CallbackList11addCallbackEPFviPvS0_ES0_ = Module["__ZN19gevent_CallbackList11addCallbackEPFviPvS0_ES0_"] = wasmExports["_ZN19gevent_CallbackList11addCallbackEPFviPvS0_ES0_"])(a0, a1, a2);

var _gevent_RemoveCallback = Module["_gevent_RemoveCallback"] = (a0, a1) => (_gevent_RemoveCallback = Module["_gevent_RemoveCallback"] = wasmExports["gevent_RemoveCallback"])(a0, a1);

var __ZN19gevent_CallbackList14removeCallbackEPFviPvS0_ES0_ = Module["__ZN19gevent_CallbackList14removeCallbackEPFviPvS0_ES0_"] = (a0, a1, a2) => (__ZN19gevent_CallbackList14removeCallbackEPFviPvS0_ES0_ = Module["__ZN19gevent_CallbackList14removeCallbackEPFviPvS0_ES0_"] = wasmExports["_ZN19gevent_CallbackList14removeCallbackEPFviPvS0_ES0_"])(a0, a1, a2);

var _gevent_RemoveCallbackWithGid = Module["_gevent_RemoveCallbackWithGid"] = a0 => (_gevent_RemoveCallbackWithGid = Module["_gevent_RemoveCallbackWithGid"] = wasmExports["gevent_RemoveCallbackWithGid"])(a0);

var __ZN19gevent_CallbackList21removeCallbackWithGidEm = Module["__ZN19gevent_CallbackList21removeCallbackWithGidEm"] = (a0, a1) => (__ZN19gevent_CallbackList21removeCallbackWithGidEm = Module["__ZN19gevent_CallbackList21removeCallbackWithGidEm"] = wasmExports["_ZN19gevent_CallbackList21removeCallbackWithGidEm"])(a0, a1);

var __ZN19gevent_CallbackListC2Ev = Module["__ZN19gevent_CallbackListC2Ev"] = a0 => (__ZN19gevent_CallbackListC2Ev = Module["__ZN19gevent_CallbackListC2Ev"] = wasmExports["_ZN19gevent_CallbackListC2Ev"])(a0);

var __ZN19gevent_CallbackListD2Ev = Module["__ZN19gevent_CallbackListD2Ev"] = a0 => (__ZN19gevent_CallbackListD2Ev = Module["__ZN19gevent_CallbackListD2Ev"] = wasmExports["_ZN19gevent_CallbackListD2Ev"])(a0);

var _gevent_CreateEventStruct1 = Module["_gevent_CreateEventStruct1"] = (a0, a1, a2) => (_gevent_CreateEventStruct1 = Module["_gevent_CreateEventStruct1"] = wasmExports["gevent_CreateEventStruct1"])(a0, a1, a2);

var _gevent_CreateEventStruct2 = Module["_gevent_CreateEventStruct2"] = (a0, a1, a2, a3, a4) => (_gevent_CreateEventStruct2 = Module["_gevent_CreateEventStruct2"] = wasmExports["gevent_CreateEventStruct2"])(a0, a1, a2, a3, a4);

var _gevent_CreateEventStruct3 = Module["_gevent_CreateEventStruct3"] = (a0, a1, a2, a3, a4, a5, a6) => (_gevent_CreateEventStruct3 = Module["_gevent_CreateEventStruct3"] = wasmExports["gevent_CreateEventStruct3"])(a0, a1, a2, a3, a4, a5, a6);

var __Z31gevent_EnqueuePermissionsResultRNSt3__23mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEiNS_4lessIS6_EENS4_INS_4pairIKS6_iEEEEEE = Module["__Z31gevent_EnqueuePermissionsResultRNSt3__23mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEiNS_4lessIS6_EENS4_INS_4pairIKS6_iEEEEEE"] = a0 => (__Z31gevent_EnqueuePermissionsResultRNSt3__23mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEiNS_4lessIS6_EENS4_INS_4pairIKS6_iEEEEEE = Module["__Z31gevent_EnqueuePermissionsResultRNSt3__23mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEiNS_4lessIS6_EENS4_INS_4pairIKS6_iEEEEEE"] = wasmExports["_Z31gevent_EnqueuePermissionsResultRNSt3__23mapINS_12basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEEiNS_4lessIS6_EENS4_INS_4pairIKS6_iEEEEEE"])(a0);

var _glog = Module["_glog"] = a0 => (_glog = Module["_glog"] = wasmExports["glog"])(a0);

var _glog_v = Module["_glog_v"] = (a0, a1) => (_glog_v = Module["_glog_v"] = wasmExports["glog_v"])(a0, a1);

var _glog_d = Module["_glog_d"] = (a0, a1) => (_glog_d = Module["_glog_d"] = wasmExports["glog_d"])(a0, a1);

var _glog_i = Module["_glog_i"] = (a0, a1) => (_glog_i = Module["_glog_i"] = wasmExports["glog_i"])(a0, a1);

var _glog_w = Module["_glog_w"] = (a0, a1) => (_glog_w = Module["_glog_w"] = wasmExports["glog_w"])(a0, a1);

var _glog_e = Module["_glog_e"] = (a0, a1) => (_glog_e = Module["_glog_e"] = wasmExports["glog_e"])(a0, a1);

var _glog_setLevel = Module["_glog_setLevel"] = a0 => (_glog_setLevel = Module["_glog_setLevel"] = wasmExports["glog_setLevel"])(a0);

var _glog_getLevel = Module["_glog_getLevel"] = () => (_glog_getLevel = Module["_glog_getLevel"] = wasmExports["glog_getLevel"])();

var _g_NextId = Module["_g_NextId"] = () => (_g_NextId = Module["_g_NextId"] = wasmExports["g_NextId"])();

var _g_iclock = Module["_g_iclock"] = () => (_g_iclock = Module["_g_iclock"] = wasmExports["g_iclock"])();

var _gaudio_Init = Module["_gaudio_Init"] = () => (_gaudio_Init = Module["_gaudio_Init"] = wasmExports["gaudio_Init"])();

var _gaudio_Cleanup = Module["_gaudio_Cleanup"] = () => (_gaudio_Cleanup = Module["_gaudio_Cleanup"] = wasmExports["gaudio_Cleanup"])();

var _gaudio_SoundCreateFromFile = Module["_gaudio_SoundCreateFromFile"] = (a0, a1, a2) => (_gaudio_SoundCreateFromFile = Module["_gaudio_SoundCreateFromFile"] = wasmExports["gaudio_SoundCreateFromFile"])(a0, a1, a2);

var _gaudio_SoundCreateFromData = Module["_gaudio_SoundCreateFromData"] = (a0, a1, a2, a3) => (_gaudio_SoundCreateFromData = Module["_gaudio_SoundCreateFromData"] = wasmExports["gaudio_SoundCreateFromData"])(a0, a1, a2, a3);

var _gaudio_SoundReadFile = Module["_gaudio_SoundReadFile"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_gaudio_SoundReadFile = Module["_gaudio_SoundReadFile"] = wasmExports["gaudio_SoundReadFile"])(a0, a1, a2, a3, a4, a5, a6, a7);

var _gaudio_SoundDelete = Module["_gaudio_SoundDelete"] = a0 => (_gaudio_SoundDelete = Module["_gaudio_SoundDelete"] = wasmExports["gaudio_SoundDelete"])(a0);

var _gaudio_SoundGetLength = Module["_gaudio_SoundGetLength"] = a0 => (_gaudio_SoundGetLength = Module["_gaudio_SoundGetLength"] = wasmExports["gaudio_SoundGetLength"])(a0);

var _gaudio_SoundPlay = Module["_gaudio_SoundPlay"] = (a0, a1, a2) => (_gaudio_SoundPlay = Module["_gaudio_SoundPlay"] = wasmExports["gaudio_SoundPlay"])(a0, a1, a2);

var _gaudio_SoundListener = Module["_gaudio_SoundListener"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (_gaudio_SoundListener = Module["_gaudio_SoundListener"] = wasmExports["gaudio_SoundListener"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);

var _gaudio_SoundHasEffect = Module["_gaudio_SoundHasEffect"] = a0 => (_gaudio_SoundHasEffect = Module["_gaudio_SoundHasEffect"] = wasmExports["gaudio_SoundHasEffect"])(a0);

var _gaudio_ChannelStop = Module["_gaudio_ChannelStop"] = a0 => (_gaudio_ChannelStop = Module["_gaudio_ChannelStop"] = wasmExports["gaudio_ChannelStop"])(a0);

var _gaudio_ChannelSetPosition = Module["_gaudio_ChannelSetPosition"] = (a0, a1) => (_gaudio_ChannelSetPosition = Module["_gaudio_ChannelSetPosition"] = wasmExports["gaudio_ChannelSetPosition"])(a0, a1);

var _gaudio_ChannelGetPosition = Module["_gaudio_ChannelGetPosition"] = a0 => (_gaudio_ChannelGetPosition = Module["_gaudio_ChannelGetPosition"] = wasmExports["gaudio_ChannelGetPosition"])(a0);

var _gaudio_ChannelSetPaused = Module["_gaudio_ChannelSetPaused"] = (a0, a1) => (_gaudio_ChannelSetPaused = Module["_gaudio_ChannelSetPaused"] = wasmExports["gaudio_ChannelSetPaused"])(a0, a1);

var _gaudio_ChannelIsPaused = Module["_gaudio_ChannelIsPaused"] = a0 => (_gaudio_ChannelIsPaused = Module["_gaudio_ChannelIsPaused"] = wasmExports["gaudio_ChannelIsPaused"])(a0);

var _gaudio_ChannelIsPlaying = Module["_gaudio_ChannelIsPlaying"] = (a0, a1, a2) => (_gaudio_ChannelIsPlaying = Module["_gaudio_ChannelIsPlaying"] = wasmExports["gaudio_ChannelIsPlaying"])(a0, a1, a2);

var _gaudio_ChannelSetVolume = Module["_gaudio_ChannelSetVolume"] = (a0, a1, a2) => (_gaudio_ChannelSetVolume = Module["_gaudio_ChannelSetVolume"] = wasmExports["gaudio_ChannelSetVolume"])(a0, a1, a2);

var _gaudio_ChannelGetVolume = Module["_gaudio_ChannelGetVolume"] = a0 => (_gaudio_ChannelGetVolume = Module["_gaudio_ChannelGetVolume"] = wasmExports["gaudio_ChannelGetVolume"])(a0);

var _gaudio_ChannelGetStreamId = Module["_gaudio_ChannelGetStreamId"] = a0 => (_gaudio_ChannelGetStreamId = Module["_gaudio_ChannelGetStreamId"] = wasmExports["gaudio_ChannelGetStreamId"])(a0);

var _gaudio_ChannelSetPitch = Module["_gaudio_ChannelSetPitch"] = (a0, a1) => (_gaudio_ChannelSetPitch = Module["_gaudio_ChannelSetPitch"] = wasmExports["gaudio_ChannelSetPitch"])(a0, a1);

var _gaudio_ChannelGetPitch = Module["_gaudio_ChannelGetPitch"] = a0 => (_gaudio_ChannelGetPitch = Module["_gaudio_ChannelGetPitch"] = wasmExports["gaudio_ChannelGetPitch"])(a0);

var _gaudio_ChannelSetLooping = Module["_gaudio_ChannelSetLooping"] = (a0, a1) => (_gaudio_ChannelSetLooping = Module["_gaudio_ChannelSetLooping"] = wasmExports["gaudio_ChannelSetLooping"])(a0, a1);

var _gaudio_ChannelIsLooping = Module["_gaudio_ChannelIsLooping"] = a0 => (_gaudio_ChannelIsLooping = Module["_gaudio_ChannelIsLooping"] = wasmExports["gaudio_ChannelIsLooping"])(a0);

var _gaudio_ChannelSetWorldPosition = Module["_gaudio_ChannelSetWorldPosition"] = (a0, a1, a2, a3, a4, a5, a6) => (_gaudio_ChannelSetWorldPosition = Module["_gaudio_ChannelSetWorldPosition"] = wasmExports["gaudio_ChannelSetWorldPosition"])(a0, a1, a2, a3, a4, a5, a6);

var _gaudio_ChannelSetEffect = Module["_gaudio_ChannelSetEffect"] = (a0, a1, a2) => (_gaudio_ChannelSetEffect = Module["_gaudio_ChannelSetEffect"] = wasmExports["gaudio_ChannelSetEffect"])(a0, a1, a2);

var _gaudio_ChannelAddCallback = Module["_gaudio_ChannelAddCallback"] = (a0, a1, a2) => (_gaudio_ChannelAddCallback = Module["_gaudio_ChannelAddCallback"] = wasmExports["gaudio_ChannelAddCallback"])(a0, a1, a2);

var _gaudio_ChannelRemoveCallback = Module["_gaudio_ChannelRemoveCallback"] = (a0, a1, a2) => (_gaudio_ChannelRemoveCallback = Module["_gaudio_ChannelRemoveCallback"] = wasmExports["gaudio_ChannelRemoveCallback"])(a0, a1, a2);

var _gaudio_ChannelRemoveCallbackWithGid = Module["_gaudio_ChannelRemoveCallbackWithGid"] = (a0, a1) => (_gaudio_ChannelRemoveCallbackWithGid = Module["_gaudio_ChannelRemoveCallbackWithGid"] = wasmExports["gaudio_ChannelRemoveCallbackWithGid"])(a0, a1);

var _gaudio_BackgroundMusicIsAvailable = Module["_gaudio_BackgroundMusicIsAvailable"] = () => (_gaudio_BackgroundMusicIsAvailable = Module["_gaudio_BackgroundMusicIsAvailable"] = wasmExports["gaudio_BackgroundMusicIsAvailable"])();

var _gaudio_BackgroundMusicCreateFromFile = Module["_gaudio_BackgroundMusicCreateFromFile"] = (a0, a1) => (_gaudio_BackgroundMusicCreateFromFile = Module["_gaudio_BackgroundMusicCreateFromFile"] = wasmExports["gaudio_BackgroundMusicCreateFromFile"])(a0, a1);

var _gaudio_BackgroundMusicDelete = Module["_gaudio_BackgroundMusicDelete"] = a0 => (_gaudio_BackgroundMusicDelete = Module["_gaudio_BackgroundMusicDelete"] = wasmExports["gaudio_BackgroundMusicDelete"])(a0);

var _gaudio_BackgroundMusicGetLength = Module["_gaudio_BackgroundMusicGetLength"] = a0 => (_gaudio_BackgroundMusicGetLength = Module["_gaudio_BackgroundMusicGetLength"] = wasmExports["gaudio_BackgroundMusicGetLength"])(a0);

var _gaudio_BackgroundMusicPlay = Module["_gaudio_BackgroundMusicPlay"] = (a0, a1, a2) => (_gaudio_BackgroundMusicPlay = Module["_gaudio_BackgroundMusicPlay"] = wasmExports["gaudio_BackgroundMusicPlay"])(a0, a1, a2);

var _gaudio_BackgroundChannelStop = Module["_gaudio_BackgroundChannelStop"] = a0 => (_gaudio_BackgroundChannelStop = Module["_gaudio_BackgroundChannelStop"] = wasmExports["gaudio_BackgroundChannelStop"])(a0);

var _gaudio_BackgroundChannelSetPosition = Module["_gaudio_BackgroundChannelSetPosition"] = (a0, a1) => (_gaudio_BackgroundChannelSetPosition = Module["_gaudio_BackgroundChannelSetPosition"] = wasmExports["gaudio_BackgroundChannelSetPosition"])(a0, a1);

var _gaudio_BackgroundChannelGetPosition = Module["_gaudio_BackgroundChannelGetPosition"] = a0 => (_gaudio_BackgroundChannelGetPosition = Module["_gaudio_BackgroundChannelGetPosition"] = wasmExports["gaudio_BackgroundChannelGetPosition"])(a0);

var _gaudio_BackgroundChannelSetPaused = Module["_gaudio_BackgroundChannelSetPaused"] = (a0, a1) => (_gaudio_BackgroundChannelSetPaused = Module["_gaudio_BackgroundChannelSetPaused"] = wasmExports["gaudio_BackgroundChannelSetPaused"])(a0, a1);

var _gaudio_BackgroundChannelIsPaused = Module["_gaudio_BackgroundChannelIsPaused"] = a0 => (_gaudio_BackgroundChannelIsPaused = Module["_gaudio_BackgroundChannelIsPaused"] = wasmExports["gaudio_BackgroundChannelIsPaused"])(a0);

var _gaudio_BackgroundChannelIsPlaying = Module["_gaudio_BackgroundChannelIsPlaying"] = (a0, a1, a2) => (_gaudio_BackgroundChannelIsPlaying = Module["_gaudio_BackgroundChannelIsPlaying"] = wasmExports["gaudio_BackgroundChannelIsPlaying"])(a0, a1, a2);

var _gaudio_BackgroundChannelSetVolume = Module["_gaudio_BackgroundChannelSetVolume"] = (a0, a1, a2) => (_gaudio_BackgroundChannelSetVolume = Module["_gaudio_BackgroundChannelSetVolume"] = wasmExports["gaudio_BackgroundChannelSetVolume"])(a0, a1, a2);

var _gaudio_BackgroundChannelGetVolume = Module["_gaudio_BackgroundChannelGetVolume"] = a0 => (_gaudio_BackgroundChannelGetVolume = Module["_gaudio_BackgroundChannelGetVolume"] = wasmExports["gaudio_BackgroundChannelGetVolume"])(a0);

var _gaudio_BackgroundChannelSetLooping = Module["_gaudio_BackgroundChannelSetLooping"] = (a0, a1) => (_gaudio_BackgroundChannelSetLooping = Module["_gaudio_BackgroundChannelSetLooping"] = wasmExports["gaudio_BackgroundChannelSetLooping"])(a0, a1);

var _gaudio_BackgroundChannelIsLooping = Module["_gaudio_BackgroundChannelIsLooping"] = a0 => (_gaudio_BackgroundChannelIsLooping = Module["_gaudio_BackgroundChannelIsLooping"] = wasmExports["gaudio_BackgroundChannelIsLooping"])(a0);

var _gaudio_BackgroundChannelAddCallback = Module["_gaudio_BackgroundChannelAddCallback"] = (a0, a1, a2) => (_gaudio_BackgroundChannelAddCallback = Module["_gaudio_BackgroundChannelAddCallback"] = wasmExports["gaudio_BackgroundChannelAddCallback"])(a0, a1, a2);

var _gaudio_BackgroundChannelRemoveCallback = Module["_gaudio_BackgroundChannelRemoveCallback"] = (a0, a1, a2) => (_gaudio_BackgroundChannelRemoveCallback = Module["_gaudio_BackgroundChannelRemoveCallback"] = wasmExports["gaudio_BackgroundChannelRemoveCallback"])(a0, a1, a2);

var _gaudio_BackgroundChannelRemoveCallbackWithGid = Module["_gaudio_BackgroundChannelRemoveCallbackWithGid"] = (a0, a1) => (_gaudio_BackgroundChannelRemoveCallbackWithGid = Module["_gaudio_BackgroundChannelRemoveCallbackWithGid"] = wasmExports["gaudio_BackgroundChannelRemoveCallbackWithGid"])(a0, a1);

var _gaudio_AdvanceStreamBuffers = Module["_gaudio_AdvanceStreamBuffers"] = () => (_gaudio_AdvanceStreamBuffers = Module["_gaudio_AdvanceStreamBuffers"] = wasmExports["gaudio_AdvanceStreamBuffers"])();

var _gaudio_registerType = Module["_gaudio_registerType"] = (a0, a1) => (_gaudio_registerType = Module["_gaudio_registerType"] = wasmExports["gaudio_registerType"])(a0, a1);

var _gaudio_unregisterType = Module["_gaudio_unregisterType"] = a0 => (_gaudio_unregisterType = Module["_gaudio_unregisterType"] = wasmExports["gaudio_unregisterType"])(a0);

var _gaudio_registerEncoderType = Module["_gaudio_registerEncoderType"] = (a0, a1) => (_gaudio_registerEncoderType = Module["_gaudio_registerEncoderType"] = wasmExports["gaudio_registerEncoderType"])(a0, a1);

var _gaudio_unregisterEncoderType = Module["_gaudio_unregisterEncoderType"] = a0 => (_gaudio_unregisterEncoderType = Module["_gaudio_unregisterEncoderType"] = wasmExports["gaudio_unregisterEncoderType"])(a0);

var _gaudio_lookupEncoder = Module["_gaudio_lookupEncoder"] = a0 => (_gaudio_lookupEncoder = Module["_gaudio_lookupEncoder"] = wasmExports["gaudio_lookupEncoder"])(a0);

var _gaudio_WavOpen = Module["_gaudio_WavOpen"] = (a0, a1, a2, a3, a4, a5) => (_gaudio_WavOpen = Module["_gaudio_WavOpen"] = wasmExports["gaudio_WavOpen"])(a0, a1, a2, a3, a4, a5);

var _gaudio_WavClose = Module["_gaudio_WavClose"] = a0 => (_gaudio_WavClose = Module["_gaudio_WavClose"] = wasmExports["gaudio_WavClose"])(a0);

var _gaudio_WavSeek = Module["_gaudio_WavSeek"] = (a0, a1, a2) => (_gaudio_WavSeek = Module["_gaudio_WavSeek"] = wasmExports["gaudio_WavSeek"])(a0, a1, a2);

var _gaudio_WavTell = Module["_gaudio_WavTell"] = a0 => (_gaudio_WavTell = Module["_gaudio_WavTell"] = wasmExports["gaudio_WavTell"])(a0);

var _gaudio_WavRead = Module["_gaudio_WavRead"] = (a0, a1, a2, a3) => (_gaudio_WavRead = Module["_gaudio_WavRead"] = wasmExports["gaudio_WavRead"])(a0, a1, a2, a3);

var _gvfs_init = Module["_gvfs_init"] = () => (_gvfs_init = Module["_gvfs_init"] = wasmExports["gvfs_init"])();

var _gvfs_setCodeKey = Module["_gvfs_setCodeKey"] = a0 => (_gvfs_setCodeKey = Module["_gvfs_setCodeKey"] = wasmExports["gvfs_setCodeKey"])(a0);

var _gvfs_setAssetsKey = Module["_gvfs_setAssetsKey"] = a0 => (_gvfs_setAssetsKey = Module["_gvfs_setAssetsKey"] = wasmExports["gvfs_setAssetsKey"])(a0);

var _gvfs_cleanup = Module["_gvfs_cleanup"] = () => (_gvfs_cleanup = Module["_gvfs_cleanup"] = wasmExports["gvfs_cleanup"])();

var _gvfs_setZipFile = Module["_gvfs_setZipFile"] = a0 => (_gvfs_setZipFile = Module["_gvfs_setZipFile"] = wasmExports["gvfs_setZipFile"])(a0);

var _gvfs_addFile = Module["_gvfs_addFile"] = (a0, a1, a2, a3) => (_gvfs_addFile = Module["_gvfs_addFile"] = wasmExports["gvfs_addFile"])(a0, a1, a2, a3);

var __ZN11GReferenced3refEv = Module["__ZN11GReferenced3refEv"] = a0 => (__ZN11GReferenced3refEv = Module["__ZN11GReferenced3refEv"] = wasmExports["_ZN11GReferenced3refEv"])(a0);

var __ZN11GReferenced5unrefEv = Module["__ZN11GReferenced5unrefEv"] = a0 => (__ZN11GReferenced5unrefEv = Module["__ZN11GReferenced5unrefEv"] = wasmExports["_ZN11GReferenced5unrefEv"])(a0);

var __ZNK11GReferenced5proxyEv = Module["__ZNK11GReferenced5proxyEv"] = a0 => (__ZNK11GReferenced5proxyEv = Module["__ZNK11GReferenced5proxyEv"] = wasmExports["_ZNK11GReferenced5proxyEv"])(a0);

var __ZN11GReferencedC2Ev = Module["__ZN11GReferencedC2Ev"] = a0 => (__ZN11GReferencedC2Ev = Module["__ZN11GReferencedC2Ev"] = wasmExports["_ZN11GReferencedC2Ev"])(a0);

var __ZN11GReferencedD2Ev = Module["__ZN11GReferencedD2Ev"] = a0 => (__ZN11GReferencedD2Ev = Module["__ZN11GReferencedD2Ev"] = wasmExports["_ZN11GReferencedD2Ev"])(a0);

var __ZN8StringId8instanceEv = Module["__ZN8StringId8instanceEv"] = () => (__ZN8StringId8instanceEv = Module["__ZN8StringId8instanceEv"] = wasmExports["_ZN8StringId8instanceEv"])();

var __ZN8StringId2idEPKc = Module["__ZN8StringId2idEPKc"] = (a0, a1) => (__ZN8StringId2idEPKc = Module["__ZN8StringId2idEPKc"] = wasmExports["_ZN8StringId2idEPKc"])(a0, a1);

var _lua_toboolean2 = Module["_lua_toboolean2"] = (a0, a1) => (_lua_toboolean2 = Module["_lua_toboolean2"] = wasmExports["lua_toboolean2"])(a0, a1);

var _luaL_newweaktable = Module["_luaL_newweaktable"] = a0 => (_luaL_newweaktable = Module["_luaL_newweaktable"] = wasmExports["luaL_newweaktable"])(a0);

var _luaL_nullifytable = Module["_luaL_nullifytable"] = (a0, a1) => (_luaL_nullifytable = Module["_luaL_nullifytable"] = wasmExports["luaL_nullifytable"])(a0, a1);

var _luaC_traceback = Module["_luaC_traceback"] = a0 => (_luaC_traceback = Module["_luaC_traceback"] = wasmExports["luaC_traceback"])(a0);

var _lua_pcall_traceback = Module["_lua_pcall_traceback"] = (a0, a1, a2, a3) => (_lua_pcall_traceback = Module["_lua_pcall_traceback"] = wasmExports["lua_pcall_traceback"])(a0, a1, a2, a3);

var _lua_traceback = Module["_lua_traceback"] = (a0, a1) => (_lua_traceback = Module["_lua_traceback"] = wasmExports["lua_traceback"])(a0, a1);

var _luaL_rawgetptr = Module["_luaL_rawgetptr"] = (a0, a1, a2) => (_luaL_rawgetptr = Module["_luaL_rawgetptr"] = wasmExports["luaL_rawgetptr"])(a0, a1, a2);

var _luaL_rawsetptr = Module["_luaL_rawsetptr"] = (a0, a1, a2) => (_luaL_rawsetptr = Module["_luaL_rawsetptr"] = wasmExports["luaL_rawsetptr"])(a0, a1, a2);

var _luaL_setdata = Module["_luaL_setdata"] = (a0, a1) => (_luaL_setdata = Module["_luaL_setdata"] = wasmExports["luaL_setdata"])(a0, a1);

var _luaL_getdata = Module["_luaL_getdata"] = a0 => (_luaL_getdata = Module["_luaL_getdata"] = wasmExports["luaL_getdata"])(a0);

var _g_registerOpenUrlCallback = Module["_g_registerOpenUrlCallback"] = a0 => (_g_registerOpenUrlCallback = Module["_g_registerOpenUrlCallback"] = wasmExports["g_registerOpenUrlCallback"])(a0);

var _g_registerEnterFrameCallback = Module["_g_registerEnterFrameCallback"] = a0 => (_g_registerEnterFrameCallback = Module["_g_registerEnterFrameCallback"] = wasmExports["g_registerEnterFrameCallback"])(a0);

var _g_registerSuspendCallback = Module["_g_registerSuspendCallback"] = a0 => (_g_registerSuspendCallback = Module["_g_registerSuspendCallback"] = wasmExports["g_registerSuspendCallback"])(a0);

var _g_registerResumeCallback = Module["_g_registerResumeCallback"] = a0 => (_g_registerResumeCallback = Module["_g_registerResumeCallback"] = wasmExports["g_registerResumeCallback"])(a0);

var _g_registerForegroundCallback = Module["_g_registerForegroundCallback"] = a0 => (_g_registerForegroundCallback = Module["_g_registerForegroundCallback"] = wasmExports["g_registerForegroundCallback"])(a0);

var _g_registerBackgroundCallback = Module["_g_registerBackgroundCallback"] = a0 => (_g_registerBackgroundCallback = Module["_g_registerBackgroundCallback"] = wasmExports["g_registerBackgroundCallback"])(a0);

var _g_registerInterruptCallback = Module["_g_registerInterruptCallback"] = a0 => (_g_registerInterruptCallback = Module["_g_registerInterruptCallback"] = wasmExports["g_registerInterruptCallback"])(a0);

var _g_initializeBinderState = Module["_g_initializeBinderState"] = a0 => (_g_initializeBinderState = Module["_g_initializeBinderState"] = wasmExports["g_initializeBinderState"])(a0);

var _g_disableTypeChecking = Module["_g_disableTypeChecking"] = () => (_g_disableTypeChecking = Module["_g_disableTypeChecking"] = wasmExports["g_disableTypeChecking"])();

var _g_enableTypeChecking = Module["_g_enableTypeChecking"] = () => (_g_enableTypeChecking = Module["_g_enableTypeChecking"] = wasmExports["g_enableTypeChecking"])();

var _g_isTypeCheckingEnabled = Module["_g_isTypeCheckingEnabled"] = () => (_g_isTypeCheckingEnabled = Module["_g_isTypeCheckingEnabled"] = wasmExports["g_isTypeCheckingEnabled"])();

var _g_createClass = Module["_g_createClass"] = (a0, a1, a2, a3, a4, a5) => (_g_createClass = Module["_g_createClass"] = wasmExports["g_createClass"])(a0, a1, a2, a3, a4, a5);

var _g_makeInstance = Module["_g_makeInstance"] = (a0, a1, a2) => (_g_makeInstance = Module["_g_makeInstance"] = wasmExports["g_makeInstance"])(a0, a1, a2);

var _g_pushInstance = Module["_g_pushInstance"] = (a0, a1, a2) => (_g_pushInstance = Module["_g_pushInstance"] = wasmExports["g_pushInstance"])(a0, a1, a2);

var _g_isInstanceOf = Module["_g_isInstanceOf"] = (a0, a1, a2) => (_g_isInstanceOf = Module["_g_isInstanceOf"] = wasmExports["g_isInstanceOf"])(a0, a1, a2);

var _g_getInstance = Module["_g_getInstance"] = (a0, a1, a2) => (_g_getInstance = Module["_g_getInstance"] = wasmExports["g_getInstance"])(a0, a1, a2);

var _g_getInstanceOfType = Module["_g_getInstanceOfType"] = (a0, a1, a2, a3) => (_g_getInstanceOfType = Module["_g_getInstanceOfType"] = wasmExports["g_getInstanceOfType"])(a0, a1, a2, a3);

var _g_setInstance = Module["_g_setInstance"] = (a0, a1, a2) => (_g_setInstance = Module["_g_setInstance"] = wasmExports["g_setInstance"])(a0, a1, a2);

var _g_error = Module["_g_error"] = (a0, a1) => (_g_error = Module["_g_error"] = wasmExports["g_error"])(a0, a1);

var __ZN6GProxyC2ENS_5GTypeE = Module["__ZN6GProxyC2ENS_5GTypeE"] = (a0, a1) => (__ZN6GProxyC2ENS_5GTypeE = Module["__ZN6GProxyC2ENS_5GTypeE"] = wasmExports["_ZN6GProxyC2ENS_5GTypeE"])(a0, a1);

var __ZN6GProxyD2Ev = Module["__ZN6GProxyD2Ev"] = a0 => (__ZN6GProxyD2Ev = Module["__ZN6GProxyD2Ev"] = wasmExports["_ZN6GProxyD2Ev"])(a0);

var __ZN21GEventDispatcherProxyC2EN6GProxy5GTypeE = Module["__ZN21GEventDispatcherProxyC2EN6GProxy5GTypeE"] = (a0, a1) => (__ZN21GEventDispatcherProxyC2EN6GProxy5GTypeE = Module["__ZN21GEventDispatcherProxyC2EN6GProxy5GTypeE"] = wasmExports["_ZN21GEventDispatcherProxyC2EN6GProxy5GTypeE"])(a0, a1);

var __ZN21GEventDispatcherProxyD0Ev = Module["__ZN21GEventDispatcherProxyD0Ev"] = a0 => (__ZN21GEventDispatcherProxyD0Ev = Module["__ZN21GEventDispatcherProxyD0Ev"] = wasmExports["_ZN21GEventDispatcherProxyD0Ev"])(a0);

var __ZN21GEventDispatcherProxyD1Ev = Module["__ZN21GEventDispatcherProxyD1Ev"] = a0 => (__ZN21GEventDispatcherProxyD1Ev = Module["__ZN21GEventDispatcherProxyD1Ev"] = wasmExports["_ZN21GEventDispatcherProxyD1Ev"])(a0);

var __ZN21GEventDispatcherProxyC1EN6GProxy5GTypeE = Module["__ZN21GEventDispatcherProxyC1EN6GProxy5GTypeE"] = (a0, a1) => (__ZN21GEventDispatcherProxyC1EN6GProxy5GTypeE = Module["__ZN21GEventDispatcherProxyC1EN6GProxy5GTypeE"] = wasmExports["_ZN21GEventDispatcherProxyC1EN6GProxy5GTypeE"])(a0, a1);

var __ZN21GEventDispatcherProxyD2Ev = Module["__ZN21GEventDispatcherProxyD2Ev"] = a0 => (__ZN21GEventDispatcherProxyD2Ev = Module["__ZN21GEventDispatcherProxyD2Ev"] = wasmExports["_ZN21GEventDispatcherProxyD2Ev"])(a0);

var _g_clearerr = Module["_g_clearerr"] = a0 => (_g_clearerr = Module["_g_clearerr"] = wasmExports["g_clearerr"])(a0);

var _g_fclose = Module["_g_fclose"] = a0 => (_g_fclose = Module["_g_fclose"] = wasmExports["g_fclose"])(a0);

var _g_feof = Module["_g_feof"] = a0 => (_g_feof = Module["_g_feof"] = wasmExports["g_feof"])(a0);

var _g_ferror = Module["_g_ferror"] = a0 => (_g_ferror = Module["_g_ferror"] = wasmExports["g_ferror"])(a0);

var _g_fflush = Module["_g_fflush"] = a0 => (_g_fflush = Module["_g_fflush"] = wasmExports["g_fflush"])(a0);

var _g_fgetc = Module["_g_fgetc"] = a0 => (_g_fgetc = Module["_g_fgetc"] = wasmExports["g_fgetc"])(a0);

var _g_fgets = Module["_g_fgets"] = (a0, a1, a2) => (_g_fgets = Module["_g_fgets"] = wasmExports["g_fgets"])(a0, a1, a2);

var _g_setVfs = Module["_g_setVfs"] = a0 => (_g_setVfs = Module["_g_setVfs"] = wasmExports["g_setVfs"])(a0);

var _g_flockfile = Module["_g_flockfile"] = a0 => (_g_flockfile = Module["_g_flockfile"] = wasmExports["g_flockfile"])(a0);

var _g_ftrylockfile = Module["_g_ftrylockfile"] = a0 => (_g_ftrylockfile = Module["_g_ftrylockfile"] = wasmExports["g_ftrylockfile"])(a0);

var _g_funlockfile = Module["_g_funlockfile"] = a0 => (_g_funlockfile = Module["_g_funlockfile"] = wasmExports["g_funlockfile"])(a0);

var _g_fopen = Module["_g_fopen"] = (a0, a1) => (_g_fopen = Module["_g_fopen"] = wasmExports["g_fopen"])(a0, a1);

var _g_fprintf = Module["_g_fprintf"] = (a0, a1, a2) => (_g_fprintf = Module["_g_fprintf"] = wasmExports["g_fprintf"])(a0, a1, a2);

var _g_fread = Module["_g_fread"] = (a0, a1, a2, a3) => (_g_fread = Module["_g_fread"] = wasmExports["g_fread"])(a0, a1, a2, a3);

var _g_fscanf = Module["_g_fscanf"] = (a0, a1, a2) => (_g_fscanf = Module["_g_fscanf"] = wasmExports["g_fscanf"])(a0, a1, a2);

var _g_fseek = Module["_g_fseek"] = (a0, a1, a2) => (_g_fseek = Module["_g_fseek"] = wasmExports["g_fseek"])(a0, a1, a2);

var _g_ftell = Module["_g_ftell"] = a0 => (_g_ftell = Module["_g_ftell"] = wasmExports["g_ftell"])(a0);

var _g_fwrite = Module["_g_fwrite"] = (a0, a1, a2, a3) => (_g_fwrite = Module["_g_fwrite"] = wasmExports["g_fwrite"])(a0, a1, a2, a3);

var _g_getc = Module["_g_getc"] = a0 => (_g_getc = Module["_g_getc"] = wasmExports["g_getc"])(a0);

var _g_setvbuf = Module["_g_setvbuf"] = (a0, a1, a2, a3) => (_g_setvbuf = Module["_g_setvbuf"] = wasmExports["g_setvbuf"])(a0, a1, a2, a3);

var _g_tmpfile = Module["_g_tmpfile"] = () => (_g_tmpfile = Module["_g_tmpfile"] = wasmExports["g_tmpfile"])();

var _g_ungetc = Module["_g_ungetc"] = (a0, a1) => (_g_ungetc = Module["_g_ungetc"] = wasmExports["g_ungetc"])(a0, a1);

var _g_vfprintf = Module["_g_vfprintf"] = (a0, a1, a2) => (_g_vfprintf = Module["_g_vfprintf"] = wasmExports["g_vfprintf"])(a0, a1, a2);

var _g_vfscanf = Module["_g_vfscanf"] = (a0, a1, a2) => (_g_vfscanf = Module["_g_vfscanf"] = wasmExports["g_vfscanf"])(a0, a1, a2);

var _g_pathForFile = Module["_g_pathForFile"] = a0 => (_g_pathForFile = Module["_g_pathForFile"] = wasmExports["g_pathForFile"])(a0);

var __Z21getDocumentsDirectoryv = Module["__Z21getDocumentsDirectoryv"] = () => (__Z21getDocumentsDirectoryv = Module["__Z21getDocumentsDirectoryv"] = wasmExports["_Z21getDocumentsDirectoryv"])();

var __Z21getTemporaryDirectoryv = Module["__Z21getTemporaryDirectoryv"] = () => (__Z21getTemporaryDirectoryv = Module["__Z21getTemporaryDirectoryv"] = wasmExports["_Z21getTemporaryDirectoryv"])();

var __Z20getResourceDirectoryv = Module["__Z20getResourceDirectoryv"] = () => (__Z20getResourceDirectoryv = Module["__Z20getResourceDirectoryv"] = wasmExports["_Z20getResourceDirectoryv"])();

var __Z21setDocumentsDirectoryPKc = Module["__Z21setDocumentsDirectoryPKc"] = a0 => (__Z21setDocumentsDirectoryPKc = Module["__Z21setDocumentsDirectoryPKc"] = wasmExports["_Z21setDocumentsDirectoryPKc"])(a0);

var __Z21setTemporaryDirectoryPKc = Module["__Z21setTemporaryDirectoryPKc"] = a0 => (__Z21setTemporaryDirectoryPKc = Module["__Z21setTemporaryDirectoryPKc"] = wasmExports["_Z21setTemporaryDirectoryPKc"])(a0);

var __Z20setResourceDirectoryPKc = Module["__Z20setResourceDirectoryPKc"] = a0 => (__Z20setResourceDirectoryPKc = Module["__Z20setResourceDirectoryPKc"] = wasmExports["_Z20setResourceDirectoryPKc"])(a0);

var __Z13pathForFileExPKcS0_ = Module["__Z13pathForFileExPKcS0_"] = (a0, a1) => (__Z13pathForFileExPKcS0_ = Module["__Z13pathForFileExPKcS0_"] = wasmExports["_Z13pathForFileExPKcS0_"])(a0, a1);

var __Z11getFileTypePKc = Module["__Z11getFileTypePKc"] = a0 => (__Z11getFileTypePKc = Module["__Z11getFileTypePKc"] = wasmExports["_Z11getFileTypePKc"])(a0);

var _gpath_init = Module["_gpath_init"] = () => (_gpath_init = Module["_gpath_init"] = wasmExports["gpath_init"])();

var _gpath_cleanup = Module["_gpath_cleanup"] = () => (_gpath_cleanup = Module["_gpath_cleanup"] = wasmExports["gpath_cleanup"])();

var _gpath_setDrivePath = Module["_gpath_setDrivePath"] = (a0, a1) => (_gpath_setDrivePath = Module["_gpath_setDrivePath"] = wasmExports["gpath_setDrivePath"])(a0, a1);

var _gpath_setDriveFlags = Module["_gpath_setDriveFlags"] = (a0, a1) => (_gpath_setDriveFlags = Module["_gpath_setDriveFlags"] = wasmExports["gpath_setDriveFlags"])(a0, a1);

var _gpath_addDrivePrefix = Module["_gpath_addDrivePrefix"] = (a0, a1) => (_gpath_addDrivePrefix = Module["_gpath_addDrivePrefix"] = wasmExports["gpath_addDrivePrefix"])(a0, a1);

var _gpath_setDriveVfs = Module["_gpath_setDriveVfs"] = (a0, a1) => (_gpath_setDriveVfs = Module["_gpath_setDriveVfs"] = wasmExports["gpath_setDriveVfs"])(a0, a1);

var _gpath_setDefaultDrive = Module["_gpath_setDefaultDrive"] = a0 => (_gpath_setDefaultDrive = Module["_gpath_setDefaultDrive"] = wasmExports["gpath_setDefaultDrive"])(a0);

var _gpath_getDefaultDrive = Module["_gpath_getDefaultDrive"] = () => (_gpath_getDefaultDrive = Module["_gpath_getDefaultDrive"] = wasmExports["gpath_getDefaultDrive"])();

var _gpath_getDrivePath = Module["_gpath_getDrivePath"] = a0 => (_gpath_getDrivePath = Module["_gpath_getDrivePath"] = wasmExports["gpath_getDrivePath"])(a0);

var _gpath_getDriveFlags = Module["_gpath_getDriveFlags"] = a0 => (_gpath_getDriveFlags = Module["_gpath_getDriveFlags"] = wasmExports["gpath_getDriveFlags"])(a0);

var _gpath_getDriveVfs = Module["_gpath_getDriveVfs"] = a0 => (_gpath_getDriveVfs = Module["_gpath_getDriveVfs"] = wasmExports["gpath_getDriveVfs"])(a0);

var _gpath_setAbsolutePathFlags = Module["_gpath_setAbsolutePathFlags"] = a0 => (_gpath_setAbsolutePathFlags = Module["_gpath_setAbsolutePathFlags"] = wasmExports["gpath_setAbsolutePathFlags"])(a0);

var _gpath_getPathDrive = Module["_gpath_getPathDrive"] = a0 => (_gpath_getPathDrive = Module["_gpath_getPathDrive"] = wasmExports["gpath_getPathDrive"])(a0);

var _gpath_join = Module["_gpath_join"] = (a0, a1) => (_gpath_join = Module["_gpath_join"] = wasmExports["gpath_join"])(a0, a1);

var _gpath_transform = Module["_gpath_transform"] = a0 => (_gpath_transform = Module["_gpath_transform"] = wasmExports["gpath_transform"])(a0);

var _gpath_normalizeArchivePath = Module["_gpath_normalizeArchivePath"] = a0 => (_gpath_normalizeArchivePath = Module["_gpath_normalizeArchivePath"] = wasmExports["gpath_normalizeArchivePath"])(a0);

var _lua_checkstack = Module["_lua_checkstack"] = (a0, a1) => (_lua_checkstack = Module["_lua_checkstack"] = wasmExports["lua_checkstack"])(a0, a1);

var _lua_gettop = Module["_lua_gettop"] = a0 => (_lua_gettop = Module["_lua_gettop"] = wasmExports["lua_gettop"])(a0);

var _lua_settop = Module["_lua_settop"] = (a0, a1) => (_lua_settop = Module["_lua_settop"] = wasmExports["lua_settop"])(a0, a1);

var _lua_remove = Module["_lua_remove"] = (a0, a1) => (_lua_remove = Module["_lua_remove"] = wasmExports["lua_remove"])(a0, a1);

var _lua_insert = Module["_lua_insert"] = (a0, a1) => (_lua_insert = Module["_lua_insert"] = wasmExports["lua_insert"])(a0, a1);

var _lua_replace = Module["_lua_replace"] = (a0, a1) => (_lua_replace = Module["_lua_replace"] = wasmExports["lua_replace"])(a0, a1);

var _lua_pushvalue = Module["_lua_pushvalue"] = (a0, a1) => (_lua_pushvalue = Module["_lua_pushvalue"] = wasmExports["lua_pushvalue"])(a0, a1);

var _lua_type = Module["_lua_type"] = (a0, a1) => (_lua_type = Module["_lua_type"] = wasmExports["lua_type"])(a0, a1);

var _lua_typename = Module["_lua_typename"] = (a0, a1) => (_lua_typename = Module["_lua_typename"] = wasmExports["lua_typename"])(a0, a1);

var _lua_isnumber = Module["_lua_isnumber"] = (a0, a1) => (_lua_isnumber = Module["_lua_isnumber"] = wasmExports["lua_isnumber"])(a0, a1);

var _lua_isstring = Module["_lua_isstring"] = (a0, a1) => (_lua_isstring = Module["_lua_isstring"] = wasmExports["lua_isstring"])(a0, a1);

var _lua_tonumberx = Module["_lua_tonumberx"] = (a0, a1, a2) => (_lua_tonumberx = Module["_lua_tonumberx"] = wasmExports["lua_tonumberx"])(a0, a1, a2);

var _lua_tointegerx = Module["_lua_tointegerx"] = (a0, a1, a2) => (_lua_tointegerx = Module["_lua_tointegerx"] = wasmExports["lua_tointegerx"])(a0, a1, a2);

var _lua_toboolean = Module["_lua_toboolean"] = (a0, a1) => (_lua_toboolean = Module["_lua_toboolean"] = wasmExports["lua_toboolean"])(a0, a1);

var _lua_tolstring = Module["_lua_tolstring"] = (a0, a1, a2) => (_lua_tolstring = Module["_lua_tolstring"] = wasmExports["lua_tolstring"])(a0, a1, a2);

var _lua_objlen = Module["_lua_objlen"] = (a0, a1) => (_lua_objlen = Module["_lua_objlen"] = wasmExports["lua_objlen"])(a0, a1);

var _lua_touserdata = Module["_lua_touserdata"] = (a0, a1) => (_lua_touserdata = Module["_lua_touserdata"] = wasmExports["lua_touserdata"])(a0, a1);

var _lua_topointer = Module["_lua_topointer"] = (a0, a1) => (_lua_topointer = Module["_lua_topointer"] = wasmExports["lua_topointer"])(a0, a1);

var _lua_pushnil = Module["_lua_pushnil"] = a0 => (_lua_pushnil = Module["_lua_pushnil"] = wasmExports["lua_pushnil"])(a0);

var _lua_pushnumber = Module["_lua_pushnumber"] = (a0, a1) => (_lua_pushnumber = Module["_lua_pushnumber"] = wasmExports["lua_pushnumber"])(a0, a1);

var _lua_pushinteger = Module["_lua_pushinteger"] = (a0, a1) => (_lua_pushinteger = Module["_lua_pushinteger"] = wasmExports["lua_pushinteger"])(a0, a1);

var _lua_pushvector = Module["_lua_pushvector"] = (a0, a1, a2, a3) => (_lua_pushvector = Module["_lua_pushvector"] = wasmExports["lua_pushvector"])(a0, a1, a2, a3);

var _lua_pushcolorf = Module["_lua_pushcolorf"] = (a0, a1, a2, a3, a4) => (_lua_pushcolorf = Module["_lua_pushcolorf"] = wasmExports["lua_pushcolorf"])(a0, a1, a2, a3, a4);

var _lua_pushlstring = Module["_lua_pushlstring"] = (a0, a1, a2) => (_lua_pushlstring = Module["_lua_pushlstring"] = wasmExports["lua_pushlstring"])(a0, a1, a2);

var _lua_pushstring = Module["_lua_pushstring"] = (a0, a1) => (_lua_pushstring = Module["_lua_pushstring"] = wasmExports["lua_pushstring"])(a0, a1);

var _lua_pushfstringL = Module["_lua_pushfstringL"] = (a0, a1, a2) => (_lua_pushfstringL = Module["_lua_pushfstringL"] = wasmExports["lua_pushfstringL"])(a0, a1, a2);

var _lua_pushcclosurek = Module["_lua_pushcclosurek"] = (a0, a1, a2, a3, a4) => (_lua_pushcclosurek = Module["_lua_pushcclosurek"] = wasmExports["lua_pushcclosurek"])(a0, a1, a2, a3, a4);

var _lua_pushboolean = Module["_lua_pushboolean"] = (a0, a1) => (_lua_pushboolean = Module["_lua_pushboolean"] = wasmExports["lua_pushboolean"])(a0, a1);

var _lua_pushlightuserdatatagged = Module["_lua_pushlightuserdatatagged"] = (a0, a1, a2) => (_lua_pushlightuserdatatagged = Module["_lua_pushlightuserdatatagged"] = wasmExports["lua_pushlightuserdatatagged"])(a0, a1, a2);

var _lua_gettable = Module["_lua_gettable"] = (a0, a1) => (_lua_gettable = Module["_lua_gettable"] = wasmExports["lua_gettable"])(a0, a1);

var _lua_getfield = Module["_lua_getfield"] = (a0, a1, a2) => (_lua_getfield = Module["_lua_getfield"] = wasmExports["lua_getfield"])(a0, a1, a2);

var _lua_rawgetfield = Module["_lua_rawgetfield"] = (a0, a1, a2) => (_lua_rawgetfield = Module["_lua_rawgetfield"] = wasmExports["lua_rawgetfield"])(a0, a1, a2);

var _lua_rawget = Module["_lua_rawget"] = (a0, a1) => (_lua_rawget = Module["_lua_rawget"] = wasmExports["lua_rawget"])(a0, a1);

var _lua_rawgeti = Module["_lua_rawgeti"] = (a0, a1, a2) => (_lua_rawgeti = Module["_lua_rawgeti"] = wasmExports["lua_rawgeti"])(a0, a1, a2);

var _lua_createtable = Module["_lua_createtable"] = (a0, a1, a2) => (_lua_createtable = Module["_lua_createtable"] = wasmExports["lua_createtable"])(a0, a1, a2);

var _lua_getmetatable = Module["_lua_getmetatable"] = (a0, a1) => (_lua_getmetatable = Module["_lua_getmetatable"] = wasmExports["lua_getmetatable"])(a0, a1);

var _lua_settable = Module["_lua_settable"] = (a0, a1) => (_lua_settable = Module["_lua_settable"] = wasmExports["lua_settable"])(a0, a1);

var _lua_setfield = Module["_lua_setfield"] = (a0, a1, a2) => (_lua_setfield = Module["_lua_setfield"] = wasmExports["lua_setfield"])(a0, a1, a2);

var _lua_rawset = Module["_lua_rawset"] = (a0, a1) => (_lua_rawset = Module["_lua_rawset"] = wasmExports["lua_rawset"])(a0, a1);

var _lua_rawseti = Module["_lua_rawseti"] = (a0, a1, a2) => (_lua_rawseti = Module["_lua_rawseti"] = wasmExports["lua_rawseti"])(a0, a1, a2);

var _lua_setmetatable = Module["_lua_setmetatable"] = (a0, a1) => (_lua_setmetatable = Module["_lua_setmetatable"] = wasmExports["lua_setmetatable"])(a0, a1);

var _lua_call = Module["_lua_call"] = (a0, a1, a2) => (_lua_call = Module["_lua_call"] = wasmExports["lua_call"])(a0, a1, a2);

var _lua_pcall = Module["_lua_pcall"] = (a0, a1, a2, a3) => (_lua_pcall = Module["_lua_pcall"] = wasmExports["lua_pcall"])(a0, a1, a2, a3);

var _lua_error = Module["_lua_error"] = a0 => (_lua_error = Module["_lua_error"] = wasmExports["lua_error"])(a0);

var _lua_next = Module["_lua_next"] = (a0, a1) => (_lua_next = Module["_lua_next"] = wasmExports["lua_next"])(a0, a1);

var _lua_newuserdatatagged = Module["_lua_newuserdatatagged"] = (a0, a1, a2) => (_lua_newuserdatatagged = Module["_lua_newuserdatatagged"] = wasmExports["lua_newuserdatatagged"])(a0, a1, a2);

var _lua_newuserdatadtor = Module["_lua_newuserdatadtor"] = (a0, a1, a2) => (_lua_newuserdatadtor = Module["_lua_newuserdatadtor"] = wasmExports["lua_newuserdatadtor"])(a0, a1, a2);

var _lua_ref = Module["_lua_ref"] = (a0, a1) => (_lua_ref = Module["_lua_ref"] = wasmExports["lua_ref"])(a0, a1);

var _lua_unref = Module["_lua_unref"] = (a0, a1) => (_lua_unref = Module["_lua_unref"] = wasmExports["lua_unref"])(a0, a1);

var _luaL_argerrorL = Module["_luaL_argerrorL"] = (a0, a1, a2) => (_luaL_argerrorL = Module["_luaL_argerrorL"] = wasmExports["luaL_argerrorL"])(a0, a1, a2);

var _luaL_errorL = Module["_luaL_errorL"] = (a0, a1, a2) => (_luaL_errorL = Module["_luaL_errorL"] = wasmExports["luaL_errorL"])(a0, a1, a2);

var _luaL_typeerrorL = Module["_luaL_typeerrorL"] = (a0, a1, a2) => (_luaL_typeerrorL = Module["_luaL_typeerrorL"] = wasmExports["luaL_typeerrorL"])(a0, a1, a2);

var _luaL_checkoption = Module["_luaL_checkoption"] = (a0, a1, a2, a3) => (_luaL_checkoption = Module["_luaL_checkoption"] = wasmExports["luaL_checkoption"])(a0, a1, a2, a3);

var _luaL_optlstring = Module["_luaL_optlstring"] = (a0, a1, a2, a3) => (_luaL_optlstring = Module["_luaL_optlstring"] = wasmExports["luaL_optlstring"])(a0, a1, a2, a3);

var _luaL_checklstring = Module["_luaL_checklstring"] = (a0, a1, a2) => (_luaL_checklstring = Module["_luaL_checklstring"] = wasmExports["luaL_checklstring"])(a0, a1, a2);

var _luaL_newmetatable = Module["_luaL_newmetatable"] = (a0, a1) => (_luaL_newmetatable = Module["_luaL_newmetatable"] = wasmExports["luaL_newmetatable"])(a0, a1);

var _luaL_checkudata = Module["_luaL_checkudata"] = (a0, a1, a2) => (_luaL_checkudata = Module["_luaL_checkudata"] = wasmExports["luaL_checkudata"])(a0, a1, a2);

var _luaL_checkstack = Module["_luaL_checkstack"] = (a0, a1, a2) => (_luaL_checkstack = Module["_luaL_checkstack"] = wasmExports["luaL_checkstack"])(a0, a1, a2);

var _luaL_checktype = Module["_luaL_checktype"] = (a0, a1, a2) => (_luaL_checktype = Module["_luaL_checktype"] = wasmExports["luaL_checktype"])(a0, a1, a2);

var _luaL_checknumber = Module["_luaL_checknumber"] = (a0, a1) => (_luaL_checknumber = Module["_luaL_checknumber"] = wasmExports["luaL_checknumber"])(a0, a1);

var _luaL_optnumber = Module["_luaL_optnumber"] = (a0, a1, a2) => (_luaL_optnumber = Module["_luaL_optnumber"] = wasmExports["luaL_optnumber"])(a0, a1, a2);

var _luaL_optboolean = Module["_luaL_optboolean"] = (a0, a1, a2) => (_luaL_optboolean = Module["_luaL_optboolean"] = wasmExports["luaL_optboolean"])(a0, a1, a2);

var _luaL_checkinteger = Module["_luaL_checkinteger"] = (a0, a1) => (_luaL_checkinteger = Module["_luaL_checkinteger"] = wasmExports["luaL_checkinteger"])(a0, a1);

var _luaL_optinteger = Module["_luaL_optinteger"] = (a0, a1, a2) => (_luaL_optinteger = Module["_luaL_optinteger"] = wasmExports["luaL_optinteger"])(a0, a1, a2);

var _luaL_register = Module["_luaL_register"] = (a0, a1, a2) => (_luaL_register = Module["_luaL_register"] = wasmExports["luaL_register"])(a0, a1, a2);

var _luaL_typename = Module["_luaL_typename"] = (a0, a1) => (_luaL_typename = Module["_luaL_typename"] = wasmExports["luaL_typename"])(a0, a1);

var _luaL_buffinit = Module["_luaL_buffinit"] = (a0, a1) => (_luaL_buffinit = Module["_luaL_buffinit"] = wasmExports["luaL_buffinit"])(a0, a1);

var _luaL_prepbuffsize = Module["_luaL_prepbuffsize"] = (a0, a1) => (_luaL_prepbuffsize = Module["_luaL_prepbuffsize"] = wasmExports["luaL_prepbuffsize"])(a0, a1);

var _luaL_addlstring = Module["_luaL_addlstring"] = (a0, a1, a2) => (_luaL_addlstring = Module["_luaL_addlstring"] = wasmExports["luaL_addlstring"])(a0, a1, a2);

var _luaL_pushresult = Module["_luaL_pushresult"] = a0 => (_luaL_pushresult = Module["_luaL_pushresult"] = wasmExports["luaL_pushresult"])(a0);

var _luaL_ref = Module["_luaL_ref"] = (a0, a1) => (_luaL_ref = Module["_luaL_ref"] = wasmExports["luaL_ref"])(a0, a1);

var _lua_isclosing = Module["_lua_isclosing"] = a0 => (_lua_isclosing = Module["_lua_isclosing"] = wasmExports["lua_isclosing"])(a0);

var ___cxa_atexit = Module["___cxa_atexit"] = (a0, a1, a2) => (___cxa_atexit = Module["___cxa_atexit"] = wasmExports["__cxa_atexit"])(a0, a1, a2);

var ___errno_location = Module["___errno_location"] = () => (___errno_location = Module["___errno_location"] = wasmExports["__errno_location"])();

var _abort = Module["_abort"] = () => (_abort = Module["_abort"] = wasmExports["abort"])();

var _access = Module["_access"] = (a0, a1) => (_access = Module["_access"] = wasmExports["access"])(a0, a1);

var _acos = Module["_acos"] = a0 => (_acos = Module["_acos"] = wasmExports["acos"])(a0);

var _acosf = Module["_acosf"] = a0 => (_acosf = Module["_acosf"] = wasmExports["acosf"])(a0);

var _atan = Module["_atan"] = a0 => (_atan = Module["_atan"] = wasmExports["atan"])(a0);

var _atan2 = Module["_atan2"] = (a0, a1) => (_atan2 = Module["_atan2"] = wasmExports["atan2"])(a0, a1);

var _atan2f = Module["_atan2f"] = (a0, a1) => (_atan2f = Module["_atan2f"] = wasmExports["atan2f"])(a0, a1);

var _atof = Module["_atof"] = a0 => (_atof = Module["_atof"] = wasmExports["atof"])(a0);

var _bsearch = Module["_bsearch"] = (a0, a1, a2, a3, a4) => (_bsearch = Module["_bsearch"] = wasmExports["bsearch"])(a0, a1, a2, a3, a4);

var _chdir = Module["_chdir"] = a0 => (_chdir = Module["_chdir"] = wasmExports["chdir"])(a0);

var _close = Module["_close"] = a0 => (_close = Module["_close"] = wasmExports["close"])(a0);

var _closedir = Module["_closedir"] = a0 => (_closedir = Module["_closedir"] = wasmExports["closedir"])(a0);

var _cos = Module["_cos"] = a0 => (_cos = Module["_cos"] = wasmExports["cos"])(a0);

var _cosf = Module["_cosf"] = a0 => (_cosf = Module["_cosf"] = wasmExports["cosf"])(a0);

var ___dl_seterr = (a0, a1) => (___dl_seterr = wasmExports["__dl_seterr"])(a0, a1);

var _memcpy = Module["_memcpy"] = (a0, a1, a2) => (_memcpy = Module["_memcpy"] = wasmExports["memcpy"])(a0, a1, a2);

var _memmove = Module["_memmove"] = (a0, a1, a2) => (_memmove = Module["_memmove"] = wasmExports["memmove"])(a0, a1, a2);

var _memset = Module["_memset"] = (a0, a1, a2) => (_memset = Module["_memset"] = wasmExports["memset"])(a0, a1, a2);

var _time = Module["_time"] = a0 => (_time = Module["_time"] = wasmExports["time"])(a0);

var _gettimeofday = Module["_gettimeofday"] = (a0, a1) => (_gettimeofday = Module["_gettimeofday"] = wasmExports["gettimeofday"])(a0, a1);

var _exp = Module["_exp"] = a0 => (_exp = Module["_exp"] = wasmExports["exp"])(a0);

var _exp2 = Module["_exp2"] = a0 => (_exp2 = Module["_exp2"] = wasmExports["exp2"])(a0);

var _fchmod = Module["_fchmod"] = (a0, a1) => (_fchmod = Module["_fchmod"] = wasmExports["fchmod"])(a0, a1);

var _fchown = Module["_fchown"] = (a0, a1, a2) => (_fchown = Module["_fchown"] = wasmExports["fchown"])(a0, a1, a2);

var _fclose = Module["_fclose"] = a0 => (_fclose = Module["_fclose"] = wasmExports["fclose"])(a0);

var _fcntl = Module["_fcntl"] = (a0, a1, a2) => (_fcntl = Module["_fcntl"] = wasmExports["fcntl"])(a0, a1, a2);

var _fileno = Module["_fileno"] = a0 => (_fileno = Module["_fileno"] = wasmExports["fileno"])(a0);

var _fmax = Module["_fmax"] = (a0, a1) => (_fmax = Module["_fmax"] = wasmExports["fmax"])(a0, a1);

var _fmin = Module["_fmin"] = (a0, a1) => (_fmin = Module["_fmin"] = wasmExports["fmin"])(a0, a1);

var _fmodf = Module["_fmodf"] = (a0, a1) => (_fmodf = Module["_fmodf"] = wasmExports["fmodf"])(a0, a1);

var _fopen = Module["_fopen"] = (a0, a1) => (_fopen = Module["_fopen"] = wasmExports["fopen"])(a0, a1);

var _fiprintf = Module["_fiprintf"] = (a0, a1, a2) => (_fiprintf = Module["_fiprintf"] = wasmExports["fiprintf"])(a0, a1, a2);

var ___small_fprintf = Module["___small_fprintf"] = (a0, a1, a2) => (___small_fprintf = Module["___small_fprintf"] = wasmExports["__small_fprintf"])(a0, a1, a2);

var _fputc = Module["_fputc"] = (a0, a1) => (_fputc = Module["_fputc"] = wasmExports["fputc"])(a0, a1);

var _fstat = Module["_fstat"] = (a0, a1) => (_fstat = Module["_fstat"] = wasmExports["fstat"])(a0, a1);

var _fsync = Module["_fsync"] = a0 => (_fsync = Module["_fsync"] = wasmExports["fsync"])(a0);

var _ftruncate = Module["_ftruncate"] = (a0, a1, a2) => (_ftruncate = Module["_ftruncate"] = wasmExports["ftruncate"])(a0, a1, a2);

var _fwrite = Module["_fwrite"] = (a0, a1, a2, a3) => (_fwrite = Module["_fwrite"] = wasmExports["fwrite"])(a0, a1, a2, a3);

var _gai_strerror = Module["_gai_strerror"] = a0 => (_gai_strerror = Module["_gai_strerror"] = wasmExports["gai_strerror"])(a0);

var _getcwd = Module["_getcwd"] = (a0, a1) => (_getcwd = Module["_getcwd"] = wasmExports["getcwd"])(a0, a1);

var _getenv = Module["_getenv"] = a0 => (_getenv = Module["_getenv"] = wasmExports["getenv"])(a0);

var _geteuid = Module["_geteuid"] = () => (_geteuid = Module["_geteuid"] = wasmExports["geteuid"])();

var _gethostname = Module["_gethostname"] = (a0, a1) => (_gethostname = Module["_gethostname"] = wasmExports["gethostname"])(a0, a1);

var _getpid = Module["_getpid"] = () => (_getpid = Module["_getpid"] = wasmExports["getpid"])();

var ___h_errno_location = Module["___h_errno_location"] = () => (___h_errno_location = Module["___h_errno_location"] = wasmExports["__h_errno_location"])();

var _hstrerror = Module["_hstrerror"] = a0 => (_hstrerror = Module["_hstrerror"] = wasmExports["hstrerror"])(a0);

var _htonl = Module["_htonl"] = a0 => (_htonl = Module["_htonl"] = wasmExports["htonl"])(a0);

var _htons = a0 => (_htons = wasmExports["htons"])(a0);

var _inet_ntoa = Module["_inet_ntoa"] = a0 => (_inet_ntoa = Module["_inet_ntoa"] = wasmExports["inet_ntoa"])(a0);

var _isalnum = Module["_isalnum"] = a0 => (_isalnum = Module["_isalnum"] = wasmExports["isalnum"])(a0);

var _isblank = Module["_isblank"] = a0 => (_isblank = Module["_isblank"] = wasmExports["isblank"])(a0);

var _isspace = Module["_isspace"] = a0 => (_isspace = Module["_isspace"] = wasmExports["isspace"])(a0);

var _ldexp = Module["_ldexp"] = (a0, a1) => (_ldexp = Module["_ldexp"] = wasmExports["ldexp"])(a0, a1);

var _pthread_mutex_init = Module["_pthread_mutex_init"] = (a0, a1) => (_pthread_mutex_init = Module["_pthread_mutex_init"] = wasmExports["pthread_mutex_init"])(a0, a1);

var _pthread_mutex_destroy = Module["_pthread_mutex_destroy"] = a0 => (_pthread_mutex_destroy = Module["_pthread_mutex_destroy"] = wasmExports["pthread_mutex_destroy"])(a0);

var _pthread_mutexattr_init = Module["_pthread_mutexattr_init"] = a0 => (_pthread_mutexattr_init = Module["_pthread_mutexattr_init"] = wasmExports["pthread_mutexattr_init"])(a0);

var _pthread_mutexattr_settype = Module["_pthread_mutexattr_settype"] = (a0, a1) => (_pthread_mutexattr_settype = Module["_pthread_mutexattr_settype"] = wasmExports["pthread_mutexattr_settype"])(a0, a1);

var _pthread_mutexattr_destroy = Module["_pthread_mutexattr_destroy"] = a0 => (_pthread_mutexattr_destroy = Module["_pthread_mutexattr_destroy"] = wasmExports["pthread_mutexattr_destroy"])(a0);

var _pthread_mutex_lock = Module["_pthread_mutex_lock"] = a0 => (_pthread_mutex_lock = Module["_pthread_mutex_lock"] = wasmExports["pthread_mutex_lock"])(a0);

var _pthread_mutex_unlock = Module["_pthread_mutex_unlock"] = a0 => (_pthread_mutex_unlock = Module["_pthread_mutex_unlock"] = wasmExports["pthread_mutex_unlock"])(a0);

var _pthread_mutex_trylock = Module["_pthread_mutex_trylock"] = a0 => (_pthread_mutex_trylock = Module["_pthread_mutex_trylock"] = wasmExports["pthread_mutex_trylock"])(a0);

var _link = Module["_link"] = (a0, a1) => (_link = Module["_link"] = wasmExports["link"])(a0, a1);

var _localtime = Module["_localtime"] = a0 => (_localtime = Module["_localtime"] = wasmExports["localtime"])(a0);

var _log = Module["_log"] = a0 => (_log = Module["_log"] = wasmExports["log"])(a0);

var _log10 = Module["_log10"] = a0 => (_log10 = Module["_log10"] = wasmExports["log10"])(a0);

var _logf = Module["_logf"] = a0 => (_logf = Module["_logf"] = wasmExports["logf"])(a0);

var _lrintf = Module["_lrintf"] = a0 => (_lrintf = Module["_lrintf"] = wasmExports["lrintf"])(a0);

var _lseek = Module["_lseek"] = (a0, a1, a2, a3) => (_lseek = Module["_lseek"] = wasmExports["lseek"])(a0, a1, a2, a3);

var _lstat = Module["_lstat"] = (a0, a1) => (_lstat = Module["_lstat"] = wasmExports["lstat"])(a0, a1);

var _memchr = Module["_memchr"] = (a0, a1, a2) => (_memchr = Module["_memchr"] = wasmExports["memchr"])(a0, a1, a2);

var _memcmp = Module["_memcmp"] = (a0, a1, a2) => (_memcmp = Module["_memcmp"] = wasmExports["memcmp"])(a0, a1, a2);

var _mkdir = Module["_mkdir"] = (a0, a1) => (_mkdir = Module["_mkdir"] = wasmExports["mkdir"])(a0, a1);

var ___mmap = Module["___mmap"] = (a0, a1, a2, a3, a4, a5, a6) => (___mmap = Module["___mmap"] = wasmExports["__mmap"])(a0, a1, a2, a3, a4, a5, a6);

var ___munmap = Module["___munmap"] = (a0, a1) => (___munmap = Module["___munmap"] = wasmExports["__munmap"])(a0, a1);

var _nanosleep = Module["_nanosleep"] = (a0, a1) => (_nanosleep = Module["_nanosleep"] = wasmExports["nanosleep"])(a0, a1);

var _ntohs = a0 => (_ntohs = wasmExports["ntohs"])(a0);

var _open = Module["_open"] = (a0, a1, a2) => (_open = Module["_open"] = wasmExports["open"])(a0, a1, a2);

var _opendir = Module["_opendir"] = a0 => (_opendir = Module["_opendir"] = wasmExports["opendir"])(a0);

var _poll = Module["_poll"] = (a0, a1, a2) => (_poll = Module["_poll"] = wasmExports["poll"])(a0, a1, a2);

var _pow = Module["_pow"] = (a0, a1) => (_pow = Module["_pow"] = wasmExports["pow"])(a0, a1);

var _powf = Module["_powf"] = (a0, a1) => (_powf = Module["_powf"] = wasmExports["powf"])(a0, a1);

var _iprintf = Module["_iprintf"] = (a0, a1) => (_iprintf = Module["_iprintf"] = wasmExports["iprintf"])(a0, a1);

var _qsort = Module["_qsort"] = (a0, a1, a2, a3) => (_qsort = Module["_qsort"] = wasmExports["qsort"])(a0, a1, a2, a3);

var _srand = Module["_srand"] = a0 => (_srand = Module["_srand"] = wasmExports["srand"])(a0);

var _rand = Module["_rand"] = () => (_rand = Module["_rand"] = wasmExports["rand"])();

var _read = Module["_read"] = (a0, a1, a2) => (_read = Module["_read"] = wasmExports["read"])(a0, a1, a2);

var _readdir = Module["_readdir"] = a0 => (_readdir = Module["_readdir"] = wasmExports["readdir"])(a0);

var _readlink = Module["_readlink"] = (a0, a1, a2) => (_readlink = Module["_readlink"] = wasmExports["readlink"])(a0, a1, a2);

var _rmdir = Module["_rmdir"] = a0 => (_rmdir = Module["_rmdir"] = wasmExports["rmdir"])(a0);

var _round = Module["_round"] = a0 => (_round = Module["_round"] = wasmExports["round"])(a0);

var _select = Module["_select"] = (a0, a1, a2, a3, a4) => (_select = Module["_select"] = wasmExports["select"])(a0, a1, a2, a3, a4);

var _setlocale = Module["_setlocale"] = (a0, a1) => (_setlocale = Module["_setlocale"] = wasmExports["setlocale"])(a0, a1);

var _signal = Module["_signal"] = (a0, a1) => (_signal = Module["_signal"] = wasmExports["signal"])(a0, a1);

var _sin = Module["_sin"] = a0 => (_sin = Module["_sin"] = wasmExports["sin"])(a0);

var _sinf = Module["_sinf"] = a0 => (_sinf = Module["_sinf"] = wasmExports["sinf"])(a0);

var _sleep = Module["_sleep"] = a0 => (_sleep = Module["_sleep"] = wasmExports["sleep"])(a0);

var _snprintf = Module["_snprintf"] = (a0, a1, a2, a3) => (_snprintf = Module["_snprintf"] = wasmExports["snprintf"])(a0, a1, a2, a3);

var _siprintf = Module["_siprintf"] = (a0, a1, a2) => (_siprintf = Module["_siprintf"] = wasmExports["siprintf"])(a0, a1, a2);

var ___small_sprintf = Module["___small_sprintf"] = (a0, a1, a2) => (___small_sprintf = Module["___small_sprintf"] = wasmExports["__small_sprintf"])(a0, a1, a2);

var _sscanf = Module["_sscanf"] = (a0, a1, a2) => (_sscanf = Module["_sscanf"] = wasmExports["sscanf"])(a0, a1, a2);

var _stat = Module["_stat"] = (a0, a1) => (_stat = Module["_stat"] = wasmExports["stat"])(a0, a1);

var _strcasecmp = Module["_strcasecmp"] = (a0, a1) => (_strcasecmp = Module["_strcasecmp"] = wasmExports["strcasecmp"])(a0, a1);

var _strcat = Module["_strcat"] = (a0, a1) => (_strcat = Module["_strcat"] = wasmExports["strcat"])(a0, a1);

var _strchr = Module["_strchr"] = (a0, a1) => (_strchr = Module["_strchr"] = wasmExports["strchr"])(a0, a1);

var _strcmp = Module["_strcmp"] = (a0, a1) => (_strcmp = Module["_strcmp"] = wasmExports["strcmp"])(a0, a1);

var _strcpy = Module["_strcpy"] = (a0, a1) => (_strcpy = Module["_strcpy"] = wasmExports["strcpy"])(a0, a1);

var _strerror = Module["_strerror"] = a0 => (_strerror = Module["_strerror"] = wasmExports["strerror"])(a0);

var _strftime = Module["_strftime"] = (a0, a1, a2, a3) => (_strftime = Module["_strftime"] = wasmExports["strftime"])(a0, a1, a2, a3);

var _strlen = Module["_strlen"] = a0 => (_strlen = Module["_strlen"] = wasmExports["strlen"])(a0);

var _strncasecmp = Module["_strncasecmp"] = (a0, a1, a2) => (_strncasecmp = Module["_strncasecmp"] = wasmExports["strncasecmp"])(a0, a1, a2);

var _strncat = Module["_strncat"] = (a0, a1, a2) => (_strncat = Module["_strncat"] = wasmExports["strncat"])(a0, a1, a2);

var _strncmp = Module["_strncmp"] = (a0, a1, a2) => (_strncmp = Module["_strncmp"] = wasmExports["strncmp"])(a0, a1, a2);

var _strncpy = Module["_strncpy"] = (a0, a1, a2) => (_strncpy = Module["_strncpy"] = wasmExports["strncpy"])(a0, a1, a2);

var _strrchr = Module["_strrchr"] = (a0, a1) => (_strrchr = Module["_strrchr"] = wasmExports["strrchr"])(a0, a1);

var _strstr = Module["_strstr"] = (a0, a1) => (_strstr = Module["_strstr"] = wasmExports["strstr"])(a0, a1);

var _strtod = Module["_strtod"] = (a0, a1) => (_strtod = Module["_strtod"] = wasmExports["strtod"])(a0, a1);

var _strtoul = Module["_strtoul"] = (a0, a1, a2) => (_strtoul = Module["_strtoul"] = wasmExports["strtoul"])(a0, a1, a2);

var _strtol = Module["_strtol"] = (a0, a1, a2) => (_strtol = Module["_strtol"] = wasmExports["strtol"])(a0, a1, a2);

var _symlink = Module["_symlink"] = (a0, a1) => (_symlink = Module["_symlink"] = wasmExports["symlink"])(a0, a1);

var _tan = Module["_tan"] = a0 => (_tan = Module["_tan"] = wasmExports["tan"])(a0);

var _toupper = Module["_toupper"] = a0 => (_toupper = Module["_toupper"] = wasmExports["toupper"])(a0);

var _unlink = Module["_unlink"] = a0 => (_unlink = Module["_unlink"] = wasmExports["unlink"])(a0);

var _utime = Module["_utime"] = (a0, a1) => (_utime = Module["_utime"] = wasmExports["utime"])(a0, a1);

var _utimes = Module["_utimes"] = (a0, a1) => (_utimes = Module["_utimes"] = wasmExports["utimes"])(a0, a1);

var _vfprintf = Module["_vfprintf"] = (a0, a1, a2) => (_vfprintf = Module["_vfprintf"] = wasmExports["vfprintf"])(a0, a1, a2);

var _vsnprintf = Module["_vsnprintf"] = (a0, a1, a2, a3) => (_vsnprintf = Module["_vsnprintf"] = wasmExports["vsnprintf"])(a0, a1, a2, a3);

var _write = Module["_write"] = (a0, a1, a2) => (_write = Module["_write"] = wasmExports["write"])(a0, a1, a2);

var _malloc = Module["_malloc"] = a0 => (_malloc = Module["_malloc"] = wasmExports["malloc"])(a0);

var _free = Module["_free"] = a0 => (_free = Module["_free"] = wasmExports["free"])(a0);

var _calloc = Module["_calloc"] = (a0, a1) => (_calloc = Module["_calloc"] = wasmExports["calloc"])(a0, a1);

var _realloc = Module["_realloc"] = (a0, a1) => (_realloc = Module["_realloc"] = wasmExports["realloc"])(a0, a1);

var _posix_memalign = Module["_posix_memalign"] = (a0, a1, a2) => (_posix_memalign = Module["_posix_memalign"] = wasmExports["posix_memalign"])(a0, a1, a2);

var _emscripten_builtin_memalign = (a0, a1) => (_emscripten_builtin_memalign = wasmExports["emscripten_builtin_memalign"])(a0, a1);

var ___trap = () => (___trap = wasmExports["__trap"])();

var ___addtf3 = Module["___addtf3"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (___addtf3 = Module["___addtf3"] = wasmExports["__addtf3"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var ___getf2 = Module["___getf2"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (___getf2 = Module["___getf2"] = wasmExports["__getf2"])(a0, a1, a2, a3, a4, a5, a6, a7);

var ___lttf2 = Module["___lttf2"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (___lttf2 = Module["___lttf2"] = wasmExports["__lttf2"])(a0, a1, a2, a3, a4, a5, a6, a7);

var ___gttf2 = Module["___gttf2"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (___gttf2 = Module["___gttf2"] = wasmExports["__gttf2"])(a0, a1, a2, a3, a4, a5, a6, a7);

var ___divtf3 = Module["___divtf3"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (___divtf3 = Module["___divtf3"] = wasmExports["__divtf3"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var __emscripten_tempret_set = a0 => (__emscripten_tempret_set = wasmExports["_emscripten_tempret_set"])(a0);

var __emscripten_tempret_get = () => (__emscripten_tempret_get = wasmExports["_emscripten_tempret_get"])();

var ___extenddftf2 = Module["___extenddftf2"] = (a0, a1) => (___extenddftf2 = Module["___extenddftf2"] = wasmExports["__extenddftf2"])(a0, a1);

var ___fixtfsi = Module["___fixtfsi"] = (a0, a1, a2, a3) => (___fixtfsi = Module["___fixtfsi"] = wasmExports["__fixtfsi"])(a0, a1, a2, a3);

var ___floatditf = Module["___floatditf"] = (a0, a1, a2) => (___floatditf = Module["___floatditf"] = wasmExports["__floatditf"])(a0, a1, a2);

var ___floatsitf = Module["___floatsitf"] = (a0, a1) => (___floatsitf = Module["___floatsitf"] = wasmExports["__floatsitf"])(a0, a1);

var ___multf3 = Module["___multf3"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (___multf3 = Module["___multf3"] = wasmExports["__multf3"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var __emscripten_stack_restore = a0 => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0);

var __emscripten_stack_alloc = a0 => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0);

var _emscripten_stack_get_current = () => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])();

var ___subtf3 = Module["___subtf3"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (___subtf3 = Module["___subtf3"] = wasmExports["__subtf3"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var ___trunctfdf2 = Module["___trunctfdf2"] = (a0, a1, a2, a3) => (___trunctfdf2 = Module["___trunctfdf2"] = wasmExports["__trunctfdf2"])(a0, a1, a2, a3);

var __ZNSt3__26chrono12system_clock3nowEv = Module["__ZNSt3__26chrono12system_clock3nowEv"] = () => (__ZNSt3__26chrono12system_clock3nowEv = Module["__ZNSt3__26chrono12system_clock3nowEv"] = wasmExports["_ZNSt3__26chrono12system_clock3nowEv"])();

var __ZNSt13exception_ptrD1Ev = Module["__ZNSt13exception_ptrD1Ev"] = a0 => (__ZNSt13exception_ptrD1Ev = Module["__ZNSt13exception_ptrD1Ev"] = wasmExports["_ZNSt13exception_ptrD1Ev"])(a0);

var __ZNSt13exception_ptrC1ERKS_ = Module["__ZNSt13exception_ptrC1ERKS_"] = (a0, a1) => (__ZNSt13exception_ptrC1ERKS_ = Module["__ZNSt13exception_ptrC1ERKS_"] = wasmExports["_ZNSt13exception_ptrC1ERKS_"])(a0, a1);

var __ZSt17rethrow_exceptionSt13exception_ptr = Module["__ZSt17rethrow_exceptionSt13exception_ptr"] = a0 => (__ZSt17rethrow_exceptionSt13exception_ptr = Module["__ZSt17rethrow_exceptionSt13exception_ptr"] = wasmExports["_ZSt17rethrow_exceptionSt13exception_ptr"])(a0);

var __ZNSt3__217__assoc_sub_state10__sub_waitERNS_11unique_lockINS_5mutexEEE = Module["__ZNSt3__217__assoc_sub_state10__sub_waitERNS_11unique_lockINS_5mutexEEE"] = (a0, a1) => (__ZNSt3__217__assoc_sub_state10__sub_waitERNS_11unique_lockINS_5mutexEEE = Module["__ZNSt3__217__assoc_sub_state10__sub_waitERNS_11unique_lockINS_5mutexEEE"] = wasmExports["_ZNSt3__217__assoc_sub_state10__sub_waitERNS_11unique_lockINS_5mutexEEE"])(a0, a1);

var __ZNSt3__212__next_primeEm = Module["__ZNSt3__212__next_primeEm"] = a0 => (__ZNSt3__212__next_primeEm = Module["__ZNSt3__212__next_primeEm"] = wasmExports["_ZNSt3__212__next_primeEm"])(a0);

var __ZNSt3__29basic_iosIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__29basic_iosIcNS_11char_traitsIcEEED2Ev"] = a0 => (__ZNSt3__29basic_iosIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__29basic_iosIcNS_11char_traitsIcEEED2Ev"] = wasmExports["_ZNSt3__29basic_iosIcNS_11char_traitsIcEEED2Ev"])(a0);

var __ZNSt3__215basic_streambufIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEED2Ev"] = a0 => (__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEED2Ev"] = wasmExports["_ZNSt3__215basic_streambufIcNS_11char_traitsIcEEED2Ev"])(a0);

var __ZNSt3__215basic_streambufIcNS_11char_traitsIcEEEC2Ev = Module["__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEEC2Ev"] = a0 => (__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEEC2Ev = Module["__ZNSt3__215basic_streambufIcNS_11char_traitsIcEEEC2Ev"] = wasmExports["_ZNSt3__215basic_streambufIcNS_11char_traitsIcEEEC2Ev"])(a0);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE5flushEv = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE5flushEv"] = a0 => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE5flushEv = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE5flushEv"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE5flushEv"])(a0);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_ = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_ = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryC1ERS3_"])(a0, a1);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev"] = a0 => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE6sentryD1Ev"])(a0);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEb = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEb"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEb = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEb"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEb"])(a0, a1);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEt = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEt"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEt = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEt"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEt"])(a0, a1);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEj = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEj"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEj = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEj"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEj"])(a0, a1);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEf = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEf"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEf = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEf"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEElsEf"])(a0, a1);

var __ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE3putEc = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE3putEc"] = (a0, a1) => (__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE3putEc = Module["__ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE3putEc"] = wasmExports["_ZNSt3__213basic_ostreamIcNS_11char_traitsIcEEE3putEc"])(a0, a1);

var __ZNSt3__214basic_iostreamIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__214basic_iostreamIcNS_11char_traitsIcEEED2Ev"] = (a0, a1) => (__ZNSt3__214basic_iostreamIcNS_11char_traitsIcEEED2Ev = Module["__ZNSt3__214basic_iostreamIcNS_11char_traitsIcEEED2Ev"] = wasmExports["_ZNSt3__214basic_iostreamIcNS_11char_traitsIcEEED2Ev"])(a0, a1);

var __ZNKSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strEv = Module["__ZNKSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strEv"] = (a0, a1) => (__ZNKSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strEv = Module["__ZNKSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strEv"] = wasmExports["_ZNKSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEE3strEv"])(a0, a1);

var __ZNKSt3__28ios_base6getlocEv = Module["__ZNKSt3__28ios_base6getlocEv"] = (a0, a1) => (__ZNKSt3__28ios_base6getlocEv = Module["__ZNKSt3__28ios_base6getlocEv"] = wasmExports["_ZNKSt3__28ios_base6getlocEv"])(a0, a1);

var __ZNSt3__28ios_base5clearEj = Module["__ZNSt3__28ios_base5clearEj"] = (a0, a1) => (__ZNSt3__28ios_base5clearEj = Module["__ZNSt3__28ios_base5clearEj"] = wasmExports["_ZNSt3__28ios_base5clearEj"])(a0, a1);

var __ZNSt3__28ios_base4initEPv = Module["__ZNSt3__28ios_base4initEPv"] = (a0, a1) => (__ZNSt3__28ios_base4initEPv = Module["__ZNSt3__28ios_base4initEPv"] = wasmExports["_ZNSt3__28ios_base4initEPv"])(a0, a1);

var __ZNSt3__26localeD1Ev = Module["__ZNSt3__26localeD1Ev"] = a0 => (__ZNSt3__26localeD1Ev = Module["__ZNSt3__26localeD1Ev"] = wasmExports["_ZNSt3__26localeD1Ev"])(a0);

var __ZNKSt3__26locale9use_facetERNS0_2idE = Module["__ZNKSt3__26locale9use_facetERNS0_2idE"] = (a0, a1) => (__ZNKSt3__26locale9use_facetERNS0_2idE = Module["__ZNKSt3__26locale9use_facetERNS0_2idE"] = wasmExports["_ZNKSt3__26locale9use_facetERNS0_2idE"])(a0, a1);

var __ZNSt3__26localeC1ERKS0_ = Module["__ZNSt3__26localeC1ERKS0_"] = (a0, a1) => (__ZNSt3__26localeC1ERKS0_ = Module["__ZNSt3__26localeC1ERKS0_"] = wasmExports["_ZNSt3__26localeC1ERKS0_"])(a0, a1);

var __ZNKSt3__26locale4nameEv = Module["__ZNKSt3__26locale4nameEv"] = (a0, a1) => (__ZNKSt3__26locale4nameEv = Module["__ZNKSt3__26locale4nameEv"] = wasmExports["_ZNKSt3__26locale4nameEv"])(a0, a1);

var __ZNSt3__26localeC1Ev = Module["__ZNSt3__26localeC1Ev"] = a0 => (__ZNSt3__26localeC1Ev = Module["__ZNSt3__26localeC1Ev"] = wasmExports["_ZNSt3__26localeC1Ev"])(a0);

var __ZNSt3__219__shared_weak_count14__release_weakEv = Module["__ZNSt3__219__shared_weak_count14__release_weakEv"] = a0 => (__ZNSt3__219__shared_weak_count14__release_weakEv = Module["__ZNSt3__219__shared_weak_count14__release_weakEv"] = wasmExports["_ZNSt3__219__shared_weak_count14__release_weakEv"])(a0);

var __ZNKSt3__219__shared_weak_count13__get_deleterERKSt9type_info = Module["__ZNKSt3__219__shared_weak_count13__get_deleterERKSt9type_info"] = (a0, a1) => (__ZNKSt3__219__shared_weak_count13__get_deleterERKSt9type_info = Module["__ZNKSt3__219__shared_weak_count13__get_deleterERKSt9type_info"] = wasmExports["_ZNKSt3__219__shared_weak_count13__get_deleterERKSt9type_info"])(a0, a1);

var __ZNSt3__219__shared_weak_countD2Ev = Module["__ZNSt3__219__shared_weak_countD2Ev"] = a0 => (__ZNSt3__219__shared_weak_countD2Ev = Module["__ZNSt3__219__shared_weak_countD2Ev"] = wasmExports["_ZNSt3__219__shared_weak_countD2Ev"])(a0);

var __ZNSt3__25mutex4lockEv = Module["__ZNSt3__25mutex4lockEv"] = a0 => (__ZNSt3__25mutex4lockEv = Module["__ZNSt3__25mutex4lockEv"] = wasmExports["_ZNSt3__25mutex4lockEv"])(a0);

var __ZNSt3__25mutex6unlockEv = Module["__ZNSt3__25mutex6unlockEv"] = a0 => (__ZNSt3__25mutex6unlockEv = Module["__ZNSt3__25mutex6unlockEv"] = wasmExports["_ZNSt3__25mutex6unlockEv"])(a0);

var __ZNSt3__25mutexD1Ev = Module["__ZNSt3__25mutexD1Ev"] = a0 => (__ZNSt3__25mutexD1Ev = Module["__ZNSt3__25mutexD1Ev"] = wasmExports["_ZNSt3__25mutexD1Ev"])(a0);

var __Znwm = Module["__Znwm"] = a0 => (__Znwm = Module["__Znwm"] = wasmExports["_Znwm"])(a0);

var __ZnwmRKSt9nothrow_t = Module["__ZnwmRKSt9nothrow_t"] = (a0, a1) => (__ZnwmRKSt9nothrow_t = Module["__ZnwmRKSt9nothrow_t"] = wasmExports["_ZnwmRKSt9nothrow_t"])(a0, a1);

var __Znam = Module["__Znam"] = a0 => (__Znam = Module["__Znam"] = wasmExports["_Znam"])(a0);

var __ZdlPv = Module["__ZdlPv"] = a0 => (__ZdlPv = Module["__ZdlPv"] = wasmExports["_ZdlPv"])(a0);

var __ZdlPvm = Module["__ZdlPvm"] = (a0, a1) => (__ZdlPvm = Module["__ZdlPvm"] = wasmExports["_ZdlPvm"])(a0, a1);

var __ZdaPv = Module["__ZdaPv"] = a0 => (__ZdaPv = Module["__ZdaPv"] = wasmExports["_ZdaPv"])(a0);

var __ZNSt3__211regex_errorD1Ev = Module["__ZNSt3__211regex_errorD1Ev"] = a0 => (__ZNSt3__211regex_errorD1Ev = Module["__ZNSt3__211regex_errorD1Ev"] = wasmExports["_ZNSt3__211regex_errorD1Ev"])(a0);

var __ZNSt3__220__get_collation_nameEPKc = Module["__ZNSt3__220__get_collation_nameEPKc"] = (a0, a1) => (__ZNSt3__220__get_collation_nameEPKc = Module["__ZNSt3__220__get_collation_nameEPKc"] = wasmExports["_ZNSt3__220__get_collation_nameEPKc"])(a0, a1);

var __ZNSt3__215__get_classnameEPKcb = Module["__ZNSt3__215__get_classnameEPKcb"] = (a0, a1) => (__ZNSt3__215__get_classnameEPKcb = Module["__ZNSt3__215__get_classnameEPKcb"] = wasmExports["_ZNSt3__215__get_classnameEPKcb"])(a0, a1);

var __ZNKSt3__223__match_any_but_newlineIcE6__execERNS_7__stateIcEE = Module["__ZNKSt3__223__match_any_but_newlineIcE6__execERNS_7__stateIcEE"] = (a0, a1) => (__ZNKSt3__223__match_any_but_newlineIcE6__execERNS_7__stateIcEE = Module["__ZNKSt3__223__match_any_but_newlineIcE6__execERNS_7__stateIcEE"] = wasmExports["_ZNKSt3__223__match_any_but_newlineIcE6__execERNS_7__stateIcEE"])(a0, a1);

var __ZNSt3__211regex_errorC1ENS_15regex_constants10error_typeE = Module["__ZNSt3__211regex_errorC1ENS_15regex_constants10error_typeE"] = (a0, a1) => (__ZNSt3__211regex_errorC1ENS_15regex_constants10error_typeE = Module["__ZNSt3__211regex_errorC1ENS_15regex_constants10error_typeE"] = wasmExports["_ZNSt3__211regex_errorC1ENS_15regex_constants10error_typeE"])(a0, a1);

var __ZNSt11logic_errorC2EPKc = Module["__ZNSt11logic_errorC2EPKc"] = (a0, a1) => (__ZNSt11logic_errorC2EPKc = Module["__ZNSt11logic_errorC2EPKc"] = wasmExports["_ZNSt11logic_errorC2EPKc"])(a0, a1);

var __ZNSt13runtime_errorC1EPKc = Module["__ZNSt13runtime_errorC1EPKc"] = (a0, a1) => (__ZNSt13runtime_errorC1EPKc = Module["__ZNSt13runtime_errorC1EPKc"] = wasmExports["_ZNSt13runtime_errorC1EPKc"])(a0, a1);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc"] = (a0, a1) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEEaSEc"])(a0, a1);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE25__init_copy_ctor_externalEPKcm"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKcm"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc"] = (a0, a1) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_externalEPKc"])(a0, a1);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm"] = (a0, a1) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7reserveEm"])(a0, a1);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKcm"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6insertEmPKc"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb0EEERS5_PKcm"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE17__assign_no_aliasILb1EEERS5_PKcm"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc"] = (a0, a1) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE9push_backEc"])(a0, a1);

var __ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm"] = (a0, a1, a2, a3, a4) => (__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm = Module["__ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm"] = wasmExports["_ZNKSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE7compareEmmPKcm"])(a0, a1, a2, a3, a4);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc"] = (a0, a1) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6appendEPKc"])(a0, a1);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc"] = (a0, a1, a2) => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEE6resizeEmc"])(a0, a1, a2);

var __ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_ = Module["__ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_"] = (a0, a1, a2) => (__ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_ = Module["__ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_"] = wasmExports["_ZNSt3__2plIcNS_11char_traitsIcEENS_9allocatorIcEEEENS_12basic_stringIT_T0_T1_EEPKS6_RKS9_"])(a0, a1, a2);

var __ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev"] = a0 => (__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev = Module["__ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev"] = wasmExports["_ZNSt3__212basic_stringIcNS_11char_traitsIcEENS_9allocatorIcEEED1Ev"])(a0);

var __ZNSt3__29to_stringEi = Module["__ZNSt3__29to_stringEi"] = (a0, a1) => (__ZNSt3__29to_stringEi = Module["__ZNSt3__29to_stringEi"] = wasmExports["_ZNSt3__29to_stringEi"])(a0, a1);

var __ZNSt3__29to_stringEj = Module["__ZNSt3__29to_stringEj"] = (a0, a1) => (__ZNSt3__29to_stringEj = Module["__ZNSt3__29to_stringEj"] = wasmExports["_ZNSt3__29to_stringEj"])(a0, a1);

var __ZNSt3__29to_stringEf = Module["__ZNSt3__29to_stringEf"] = (a0, a1) => (__ZNSt3__29to_stringEf = Module["__ZNSt3__29to_stringEf"] = wasmExports["_ZNSt3__29to_stringEf"])(a0, a1);

var ___cxa_allocate_exception = Module["___cxa_allocate_exception"] = a0 => (___cxa_allocate_exception = Module["___cxa_allocate_exception"] = wasmExports["__cxa_allocate_exception"])(a0);

var ___cxa_throw = Module["___cxa_throw"] = (a0, a1, a2) => (___cxa_throw = Module["___cxa_throw"] = wasmExports["__cxa_throw"])(a0, a1, a2);

var ___cxa_pure_virtual = Module["___cxa_pure_virtual"] = () => (___cxa_pure_virtual = Module["___cxa_pure_virtual"] = wasmExports["__cxa_pure_virtual"])();

var __ZNSt20bad_array_new_lengthD1Ev = Module["__ZNSt20bad_array_new_lengthD1Ev"] = a0 => (__ZNSt20bad_array_new_lengthD1Ev = Module["__ZNSt20bad_array_new_lengthD1Ev"] = wasmExports["_ZNSt20bad_array_new_lengthD1Ev"])(a0);

var __ZNSt20bad_array_new_lengthC1Ev = Module["__ZNSt20bad_array_new_lengthC1Ev"] = a0 => (__ZNSt20bad_array_new_lengthC1Ev = Module["__ZNSt20bad_array_new_lengthC1Ev"] = wasmExports["_ZNSt20bad_array_new_lengthC1Ev"])(a0);

var __ZNSt13runtime_errorD1Ev = Module["__ZNSt13runtime_errorD1Ev"] = a0 => (__ZNSt13runtime_errorD1Ev = Module["__ZNSt13runtime_errorD1Ev"] = wasmExports["_ZNSt13runtime_errorD1Ev"])(a0);

var __ZNSt12length_errorD1Ev = Module["__ZNSt12length_errorD1Ev"] = a0 => (__ZNSt12length_errorD1Ev = Module["__ZNSt12length_errorD1Ev"] = wasmExports["_ZNSt12length_errorD1Ev"])(a0);

var __Unwind_CallPersonality = Module["__Unwind_CallPersonality"] = a0 => (__Unwind_CallPersonality = Module["__Unwind_CallPersonality"] = wasmExports["_Unwind_CallPersonality"])(a0);

var _accept = Module["_accept"] = (a0, a1, a2) => (_accept = Module["_accept"] = wasmExports["accept"])(a0, a1, a2);

var _bind = Module["_bind"] = (a0, a1, a2) => (_bind = Module["_bind"] = wasmExports["bind"])(a0, a1, a2);

var _connect = Module["_connect"] = (a0, a1, a2) => (_connect = Module["_connect"] = wasmExports["connect"])(a0, a1, a2);

var _freeaddrinfo = Module["_freeaddrinfo"] = a0 => (_freeaddrinfo = Module["_freeaddrinfo"] = wasmExports["freeaddrinfo"])(a0);

var _gethostbyaddr = Module["_gethostbyaddr"] = (a0, a1, a2) => (_gethostbyaddr = Module["_gethostbyaddr"] = wasmExports["gethostbyaddr"])(a0, a1, a2);

var _gethostbyname = Module["_gethostbyname"] = a0 => (_gethostbyname = Module["_gethostbyname"] = wasmExports["gethostbyname"])(a0);

var _getpeername = Module["_getpeername"] = (a0, a1, a2) => (_getpeername = Module["_getpeername"] = wasmExports["getpeername"])(a0, a1, a2);

var _getsockname = Module["_getsockname"] = (a0, a1, a2) => (_getsockname = Module["_getsockname"] = wasmExports["getsockname"])(a0, a1, a2);

var _getsockopt = Module["_getsockopt"] = (a0, a1, a2, a3, a4) => (_getsockopt = Module["_getsockopt"] = wasmExports["getsockopt"])(a0, a1, a2, a3, a4);

var _listen = Module["_listen"] = (a0, a1) => (_listen = Module["_listen"] = wasmExports["listen"])(a0, a1);

var _recv = Module["_recv"] = (a0, a1, a2, a3) => (_recv = Module["_recv"] = wasmExports["recv"])(a0, a1, a2, a3);

var _recvfrom = Module["_recvfrom"] = (a0, a1, a2, a3, a4, a5) => (_recvfrom = Module["_recvfrom"] = wasmExports["recvfrom"])(a0, a1, a2, a3, a4, a5);

var _send = Module["_send"] = (a0, a1, a2, a3) => (_send = Module["_send"] = wasmExports["send"])(a0, a1, a2, a3);

var _sendto = Module["_sendto"] = (a0, a1, a2, a3, a4, a5) => (_sendto = Module["_sendto"] = wasmExports["sendto"])(a0, a1, a2, a3, a4, a5);

var _setsockopt = Module["_setsockopt"] = (a0, a1, a2, a3, a4) => (_setsockopt = Module["_setsockopt"] = wasmExports["setsockopt"])(a0, a1, a2, a3, a4);

var _shutdown = Module["_shutdown"] = (a0, a1) => (_shutdown = Module["_shutdown"] = wasmExports["shutdown"])(a0, a1);

var _socket = Module["_socket"] = (a0, a1, a2) => (_socket = Module["_socket"] = wasmExports["socket"])(a0, a1, a2);

var ___wasm_apply_data_relocs = () => (___wasm_apply_data_relocs = wasmExports["__wasm_apply_data_relocs"])();

var dynCall_jiji = Module["dynCall_jiji"] = (a0, a1, a2, a3, a4) => (dynCall_jiji = Module["dynCall_jiji"] = wasmExports["dynCall_jiji"])(a0, a1, a2, a3, a4);

var dynCall_iiiiij = Module["dynCall_iiiiij"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_iiiiij = Module["dynCall_iiiiij"] = wasmExports["dynCall_iiiiij"])(a0, a1, a2, a3, a4, a5, a6);

var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (dynCall_iiiiijj = Module["dynCall_iiiiijj"] = wasmExports["dynCall_iiiiijj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);

var dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = wasmExports["dynCall_iiiiiijj"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);

var dynCall_viijii = Module["dynCall_viijii"] = (a0, a1, a2, a3, a4, a5, a6) => (dynCall_viijii = Module["dynCall_viijii"] = wasmExports["dynCall_viijii"])(a0, a1, a2, a3, a4, a5, a6);

var _orig$time = Module["_orig$time"] = a0 => (_orig$time = Module["_orig$time"] = wasmExports["orig$time"])(a0);

var _orig$ftruncate = Module["_orig$ftruncate"] = (a0, a1) => (_orig$ftruncate = Module["_orig$ftruncate"] = wasmExports["orig$ftruncate"])(a0, a1);

var _orig$lseek = Module["_orig$lseek"] = (a0, a1, a2) => (_orig$lseek = Module["_orig$lseek"] = wasmExports["orig$lseek"])(a0, a1, a2);

var _orig$__mmap = Module["_orig$__mmap"] = (a0, a1, a2, a3, a4, a5) => (_orig$__mmap = Module["_orig$__mmap"] = wasmExports["orig$__mmap"])(a0, a1, a2, a3, a4, a5);

var _orig$__addtf3 = Module["_orig$__addtf3"] = (a0, a1, a2, a3, a4) => (_orig$__addtf3 = Module["_orig$__addtf3"] = wasmExports["orig$__addtf3"])(a0, a1, a2, a3, a4);

var _orig$__getf2 = Module["_orig$__getf2"] = (a0, a1, a2, a3) => (_orig$__getf2 = Module["_orig$__getf2"] = wasmExports["orig$__getf2"])(a0, a1, a2, a3);

var _orig$__lttf2 = Module["_orig$__lttf2"] = (a0, a1, a2, a3) => (_orig$__lttf2 = Module["_orig$__lttf2"] = wasmExports["orig$__lttf2"])(a0, a1, a2, a3);

var _orig$__gttf2 = Module["_orig$__gttf2"] = (a0, a1, a2, a3) => (_orig$__gttf2 = Module["_orig$__gttf2"] = wasmExports["orig$__gttf2"])(a0, a1, a2, a3);

var _orig$__divtf3 = Module["_orig$__divtf3"] = (a0, a1, a2, a3, a4) => (_orig$__divtf3 = Module["_orig$__divtf3"] = wasmExports["orig$__divtf3"])(a0, a1, a2, a3, a4);

var _orig$__fixtfsi = Module["_orig$__fixtfsi"] = (a0, a1) => (_orig$__fixtfsi = Module["_orig$__fixtfsi"] = wasmExports["orig$__fixtfsi"])(a0, a1);

var _orig$__floatditf = Module["_orig$__floatditf"] = (a0, a1) => (_orig$__floatditf = Module["_orig$__floatditf"] = wasmExports["orig$__floatditf"])(a0, a1);

var _orig$__multf3 = Module["_orig$__multf3"] = (a0, a1, a2, a3, a4) => (_orig$__multf3 = Module["_orig$__multf3"] = wasmExports["orig$__multf3"])(a0, a1, a2, a3, a4);

var _orig$__subtf3 = Module["_orig$__subtf3"] = (a0, a1, a2, a3, a4) => (_orig$__subtf3 = Module["_orig$__subtf3"] = wasmExports["orig$__subtf3"])(a0, a1, a2, a3, a4);

var _orig$__trunctfdf2 = Module["_orig$__trunctfdf2"] = (a0, a1) => (_orig$__trunctfdf2 = Module["_orig$__trunctfdf2"] = wasmExports["orig$__trunctfdf2"])(a0, a1);

var _orig$_ZNSt3__26chrono12system_clock3nowEv = Module["_orig$_ZNSt3__26chrono12system_clock3nowEv"] = () => (_orig$_ZNSt3__26chrono12system_clock3nowEv = Module["_orig$_ZNSt3__26chrono12system_clock3nowEv"] = wasmExports["orig$_ZNSt3__26chrono12system_clock3nowEv"])();

var __ZN5Event18APPLICATION_RESIZEE = Module["__ZN5Event18APPLICATION_RESIZEE"] = 362428;

var __ZN15EventDispatcher20allEventDispatchers_E = Module["__ZN15EventDispatcher20allEventDispatchers_E"] = 516904;

var _stderr = Module["_stderr"] = 361296;

var __ZTVNSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEEE = Module["__ZTVNSt3__215basic_stringbufIcNS_11char_traitsIcEENS_9allocatorIcEEEE"] = 354728;

var __ZTTNSt3__218basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEEE = Module["__ZTTNSt3__218basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEEE"] = 355108;

var __ZTVNSt3__218basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEEE = Module["__ZTVNSt3__218basic_stringstreamIcNS_11char_traitsIcEENS_9allocatorIcEEEE"] = 355048;

var __ZNSt3__25ctypeIcE2idE = Module["__ZNSt3__25ctypeIcE2idE"] = 389612;

var __ZNSt3__27collateIcE2idE = Module["__ZNSt3__27collateIcE2idE"] = 389260;

var __ZSt7nothrow = Module["__ZSt7nothrow"] = 95328;

var __ZTVN10__cxxabiv120__si_class_type_infoE = Module["__ZTVN10__cxxabiv120__si_class_type_infoE"] = 346392;

var __ZTVN10__cxxabiv117__class_type_infoE = Module["__ZTVN10__cxxabiv117__class_type_infoE"] = 346352;

var __ZTVSt12length_error = Module["__ZTVSt12length_error"] = 346684;

var ___wasm_lpad_context = Module["___wasm_lpad_context"] = 388800;

// include: postamble.js
// === Auto-generated postamble setup entry stuff ===
Module["addRunDependency"] = addRunDependency;

Module["removeRunDependency"] = removeRunDependency;

Module["ccall"] = ccall;

Module["cwrap"] = cwrap;

Module["getValue"] = getValue;

Module["UTF8ToString"] = UTF8ToString;

Module["loadDynamicLibrary"] = loadDynamicLibrary;

Module["FS_createPreloadedFile"] = FS_createPreloadedFile;

Module["FS_unlink"] = FS_unlink;

Module["FS_createPath"] = FS_createPath;

Module["FS_createDevice"] = FS_createDevice;

Module["FS_createDataFile"] = FS_createDataFile;

Module["FS_createLazyFile"] = FS_createLazyFile;

var calledRun;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller;
};

// try this again later, after new deps are fulfilled
function callMain(args = []) {
  var entryFunction = resolveGlobalSymbol("main").sym;
  // Main modules can't tell if they have main() at compile time, since it may
  // arrive from a dynamic library.
  if (!entryFunction) return;
  args.unshift(thisProgram);
  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  args.forEach(arg => {
    HEAPU32[((argv_ptr) >> 2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  });
  HEAPU32[((argv_ptr) >> 2)] = 0;
  try {
    var ret = entryFunction(argc, argv);
    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function run(args = arguments_) {
  if (runDependencies > 0) {
    return;
  }
  preRun();
  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    return;
  }
  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;
    Module["calledRun"] = true;
    if (ABORT) return;
    initRuntime();
    preMain();
    Module["onRuntimeInitialized"]?.();
    if (shouldRunNow) callMain(args);
    postRun();
  }
  if (Module["setStatus"]) {
    Module["setStatus"]("Running...");
    setTimeout(() => {
      setTimeout(() => Module["setStatus"](""), 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}

if (Module["preInit"]) {
  if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
  while (Module["preInit"].length > 0) {
    Module["preInit"].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;

if (Module["noInitialRun"]) shouldRunNow = false;

run();
