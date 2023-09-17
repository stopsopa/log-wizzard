#!/usr/bin/env node

const readline = require("readline");

const path = require("path");

const fs = require("fs");

const os = require("os");

const { spawn } = require("child_process");

/**
 * based on modified: https://github.com/douglascrockford/JSON-js/blob/master/json2.js
 */
const compactToJson = (function () {
  "use strict";

  function isObject(a) {
    return !!a && a.constructor === Object;
  }

  var rx_escapable =
    /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

  //   function this_value() {
  //     return this.valueOf();
  //   }

  //   if (typeof Date.prototype.toJSON !== "function") {
  //     Date.prototype.toJSON = function () {
  //       return isFinite(this.valueOf())
  //         ? this.getUTCFullYear() +
  //             "-" +
  //             f(this.getUTCMonth() + 1) +
  //             "-" +
  //             f(this.getUTCDate()) +
  //             "T" +
  //             f(this.getUTCHours()) +
  //             ":" +
  //             f(this.getUTCMinutes()) +
  //             ":" +
  //             f(this.getUTCSeconds()) +
  //             "Z"
  //         : null;
  //     };

  //     Boolean.prototype.toJSON = this_value;
  //     Number.prototype.toJSON = this_value;
  //     String.prototype.toJSON = this_value;
  //   }

  var gap;
  var indent;
  var meta;
  var rep;

  function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.

    rx_escapable.lastIndex = 0;
    return rx_escapable.test(string)
      ? '"' +
          string.replace(rx_escapable, function (a) {
            var c = meta[a];
            return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
          }) +
          '"'
      : '"' + string + '"';
  }

  function testIfContainsOnlyPrimitives(obj) {
    if (Array.isArray(obj)) {
      return !obj.some((v) => Array.isArray(v) || isObject(v));
    }
    if (isObject(obj)) {
      return !Object.values(obj).some((v) => Array.isArray(v) || isObject(v));
    }
    return true;
  }

  function str(key, holder, space) {
    indent = "";

    let flat = testIfContainsOnlyPrimitives(holder[key]);

    // If the space parameter is a number, make an indent string containing that
    // many spaces.

    {
      var i;

      if (!flat) {
        if (typeof space === "number") {
          for (i = 0; i < space; i += 1) {
            indent += " ";
          }

          // If the space parameter is a string, it will be used as the indent string.
        } else if (typeof space === "string") {
          indent = space;
        }
      }
    }

    // Produce a string from holder[key].

    var i; // The loop counter.
    var k; // The member key.
    var v; // The member value.
    var length;
    var mind = gap;
    var partial;
    var value = holder[key];

    // If the value has a toJSON method, call it to obtain a replacement value.

    if (value && typeof value === "object" && typeof value.toJSON === "function") {
      value = value.toJSON(key);
    }

    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.

    if (typeof rep === "function") {
      value = rep.call(holder, key, value);
    }

    // What happens next depends on the value's type.

    switch (typeof value) {
      case "string":
        return quote(value);

      case "number":
        // JSON numbers must be finite. Encode non-finite numbers as null.

        return isFinite(value) ? String(value) : "null";

      case "boolean":
      case "null":
        // If the value is a boolean or null, convert it to a string. Note:
        // typeof null does not produce "null". The case is included here in
        // the remote chance that this gets fixed someday.

        return String(value);

      // If the type is "object", we might be dealing with an object or an array or
      // null.

      case "object":
        // Due to a specification blunder in ECMAScript, typeof null is "object",
        // so watch out for that case.

        if (!value) {
          return "null";
        }

        // Make an array to hold the partial results of stringifying this object value.

        gap += indent;
        partial = [];

        // Is the value an array?

        if (Object.prototype.toString.apply(value) === "[object Array]") {
          // The value is an array. Stringify every element. Use null as a placeholder
          // for non-JSON values.

          length = value.length;
          for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value, space) || "null";
          }

          // Join all of the elements together, separated with commas, and wrap them in
          // brackets.

          v =
            partial.length === 0
              ? "[]"
              : gap && !flat
              ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
              : "[" + partial.join(",") + "]";
          gap = mind;
          return v;
        }

        // If the replacer is an array, use it to select the members to be stringified.

        if (rep && typeof rep === "object") {
          length = rep.length;
          for (i = 0; i < length; i += 1) {
            if (typeof rep[i] === "string") {
              k = rep[i];
              v = str(k, value, space);
              if (v) {
                partial.push(quote(k) + (flat ? ": " : ":") + v);
              }
            }
          }
        } else {
          // Otherwise, iterate through all of the keys in the object.

          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = str(k, value, space);
              if (v) {
                partial.push(quote(k) + (flat > 0 ? ": " : ":") + v);
              }
            }
          }
        }

        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v =
          partial.length === 0
            ? "{}"
            : gap && !flat
            ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
            : "{" + partial.join(",") + "}";
        gap = mind;
        return v;
    }
  }

  // If the JSON object does not yet have a stringify method, give it one.

  meta = {
    // table of character substitutions
    "\b": "\\b",
    "\t": "\\t",
    "\n": "\\n",
    "\f": "\\f",
    "\r": "\\r",
    '"': '\\"',
    "\\": "\\\\",
  };
  return function (value, replacer, space) {
    // The stringify method takes a value and an optional replacer, and an optional
    // space parameter, and returns a JSON text. The replacer can be a function
    // that can replace values, or an array of strings that will select the keys.
    // A default replacer method can be provided. Use of the space parameter can
    // produce text that is more easily readable.

    gap = "";

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.

    rep = replacer;
    if (
      replacer &&
      typeof replacer !== "function" &&
      (typeof replacer !== "object" || typeof replacer.length !== "number")
    ) {
      throw new Error("JSON.stringify");
    }

    // Make a fake root object containing our value under the key of "".
    // Return the result of stringifying the value.

    return str("", { "": value }, space);
  };
})();

const cmd = (function () {
  const th = (msg) => new Error(`cmd.js error: ${msg}`);

  return (cmd, opt) =>
    new Promise((resolve, reject) => {
      if (typeof cmd === "string") {
        cmd = cmd.trim();

        if (!cmd) {
          throw th(`cmd is an empty string`);
        }

        cmd = cmd.split(/\s+/);
      }

      if (!Array.isArray(cmd)) {
        throw th(`cmd is not an array`);
      }

      if (!cmd.length) {
        throw th(`cmd is an empty array`);
      }

      const { verbose = false } = { ...opt };

      verbose && console.log(`executing command ${cmd.join(" ")}`);

      const [command, ...args] = cmd;

      const process = spawn(command, args);

      let stdout = "";

      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += String(data);
      });

      process.stderr.on("data", (data) => {
        stderr += String(data);
      });

      process.on("error", (e) => {
        verbose && console.log(`error: ${e.message}`);

        reject({
          cmd,
          stdout,
          stderr,
          e,
        });
      });

      process.on("close", (code) => {
        verbose && console.log(`child process ${cmd.join(" ")} exited with code ${code}`);

        if (code !== 0) {
          return reject({
            cmd,
            stdout,
            stderr,
            code,
          });
        }

        resolve({
          cmd,
          stdout,
          stderr,
          code,
        });
      });
    });
})();

const preparePerlParserBuilder = function () {
  const th = (msg) => new Error(`perl.js error: ${msg}`);

  const buff = {};

  const perlScriptBody = `#!/usr/bin/perl
  
  use strict;
  use warnings;
  use Encode;  # Import the Encode module for character encoding conversions
  
  # Check if a file path argument was provided
  if (scalar(@ARGV) != 1) {
      die "log-wizzard.perl error: Usage: $0 <file_path>\\n";
  }
  
  my $file_path = $ARGV[0];
  
  # Check if the specified file exists
  if (!-e $file_path) {
      die "log-wizzard.perl error: File '$file_path' does not exist.\\n";
  }
  
  # Open the script file with UTF-8 encoding for reading
  open(my $script_fh, '<:encoding(UTF-8)', $file_path) or die "Cannot open file: $!";
  
  # Read the entire file into a single UTF-8 encoded string
  my $file_content;
  {
      local $/;  # Slurp mode
      $file_content = <$script_fh>;
  }
  
  close($script_fh);
  
  # my $pattern = qr/\\\{(?:[^{}]|(?R))*\\\}/;
  
  my $pattern = qr/
      \\\{              # { character
          (?:         # non-capturing group
              [^{}]   # anything that is not a { or }
              |       # OR
              (?R)    # recurses the entire pattern
          )*          # previous group zero or more times
      \\\}              # } character
  /x;
  
  # Use the 'm//' operator to find all matches in the $file_content
  while ($file_content =~ /$pattern/g) {
      my $start = $-[0];  # Start position of the match
      my $end = $+[0];    # End position of the match (exclusive)
      
      
      # Extract the matched substring and decode it from UTF-8
      my $matched_text = substr($file_content, $start, $end - $start);
      $matched_text = decode('UTF-8', $matched_text);
      
      print "$start,$end\\n";
  }
`;

  function isDir(directory) {
    try {
      return fs.lstatSync(directory).isDirectory();
    } catch (e) {}
    return false;
  }

  const directory = path.resolve(os.homedir(), "log-wizzard");

  if (!isDir(directory)) {
    fs.mkdirSync(directory);

    if (!isDir(directory)) {
      throw th(`Can't create directrory >${directory}<`);
    }
  }

  const perlScript = path.resolve(directory, `log-wizzard.perl`);

  if (!fs.existsSync(perlScript)) {
    fs.writeFileSync(perlScript, perlScriptBody);
  }

  const tmpFile = path.resolve(directory, `log-wizzard.tmp`);

  async function perlParserBuilder() {
    try {
      const version = await cmd([`perl`, `--version`]);

      /**
       * Current version:
       * This is perl 5, version 30, subversion 3 (v5.30.3) built for darwin-thread-multi-2level
       */
      buff.perlVersion = version.stdout;

      return async function perl(string) {
        try {
          fs.writeFileSync(tmpFile, string);

          const version = await cmd([`perl`, perlScript, tmpFile], {
            verbose: debug,
          });

          return version.stdout;
        } catch (e) {
          throw th(`runtime catch: ${e}`);
        }
      };
    } catch (e) {
      throw th(`builder phase catch: ${e}`);
    }
  }

  perlParserBuilder.getBuff = () => buff;

  return perlParserBuilder;
};

async function perlStringReplacerBuilder() {
  // https://www.appsloveworld.com/php/17/find-json-strings-in-a-string
  // https://regex101.com/r/U6szh5/1

  function replaceArray(arr, startIndex, endIndex, replaceArr) {
    return [...arr.slice(0, startIndex), ...replaceArr, ...arr.slice(endIndex)];
  }

  function combine(str, collection) {
    collection.reverse();

    let c;
    for (let i = 0; i < collection.length; i += 1) {
      c = collection[i];

      str = replaceArray(str, c.start, c.end, compactToJson(c.obj, null, 4));
      // str = replaceArray(str, c.start, c.end, JSON.stringify(c.obj, null, 4));
    }

    return str;
  }

  const perlParserBuilder = await preparePerlParserBuilder();

  const perl = await perlParserBuilder();

  return async function findJson(string) {
    const parts = await perl(string);

    const table = parts
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((row) => row.split(",").map((r) => parseInt(r, 10)));

    const collection = [];

    const s = [...string];

    const l = table.length;

    let t;

    let slice;

    for (let i = 0; i < l; i += 1) {
      t = table[i];

      slice = s.slice(t[0], t[1]).join("");

      try {
        const obj = JSON.parse(slice);

        collection.push({
          start: t[0],
          end: t[1],
          obj,
        });
      } catch (e) {}
    }

    return combine(s, collection).join("");
  };
}

const args = (function (obj, tmp) {
  process.argv.slice(2).map((a) => {
    if (a.indexOf("--") === 0) {
      tmp = a.substring(2).replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");

      if (tmp) {
        obj[tmp] = typeof obj[tmp] === "undefined" ? true : obj[tmp];
      }

      return;
    }

    if (a === "true") {
      a = true;
    }

    if (a === "false") {
      a = false;
    }

    if (tmp !== null) {
      if (obj[tmp] === true) {
        return (obj[tmp] = [a]);
      }

      try {
        obj[tmp].push(a);
      } catch (e) {}
    }
  });

  Object.keys(obj).map((k) => {
    obj[k] !== true && obj[k].length === 1 && (obj[k] = obj[k][0]);
    obj[k] === "false" && (obj[k] = false);
  });

  return {
    count: () => Object.keys(obj).length,
    all: () => JSON.parse(JSON.stringify(obj)),
    get: (key, def) => {
      var t = JSON.parse(JSON.stringify(obj));

      if (typeof def === "undefined") return t[key];

      return typeof t[key] === "undefined" ? def : t[key];
    },
    string: (key, def) => {
      var t = JSON.parse(JSON.stringify(obj));

      return typeof t[key] === "string" ? t[key] : def;
    },
  };
})({});

const thBuilder = (name) => (msg) => new Error(`log-wizzard ${name ? `[${name}] ` : ""}error: ${msg}`);

const th = thBuilder();

{
  const allowedArguments = ["help", "formatter", "debug", "generate"];

  const keys = Object.keys(args.all());

  keys.forEach((key) => {
    if (!allowedArguments.includes(key)) {
      throw th(
        `argument --${key} is not allowed, allowed are >${allowedArguments.join(
          ", "
        )}< run --help to see how to use this tool`
      );
    }
  });
}

{
  let gen = args.get("generate");

  if (gen) {
    if (gen === true) {
      gen = ".git/formatter.cjs";
    }

    if (fs.existsSync(gen)) {
      throw th(`file >${gen}< already exist`);
    }

    const help = `/**
 *  Help: https://stopsopa.github.io/log-wizzard/
 */`;

    const content = fs.readFileSync(__filename, "utf8").toString();

    const config = content.replace(/.*\/\*\*\*\/(.*)$/s, "$1").trim();

    fs.writeFileSync(gen, `${help}\nmodule.exports = ${config}`);

    if (!fs.existsSync(gen)) {
      throw th(`couldn't create a file >${gen}<`);
    }

    console.log(`    
    Config file: ${gen} generated
    `);

    process.exit(0);
  }
}

if (args.get("help")) {
  console.log(`
    homepage: https://stopsopa.github.io/log-wizzard/
    
    log-wizzard:
        simple tool accepting output on stdin in the commonly 
        used JSON Log Format and formatting it to human readable format

        This library provides you with customization the way you like.
        Simply import the default formatter and modify it to your liking.

    arguments:
        --help              - this help page
        --formatter <file>  - alternative formatter module
        --debug             - prints some more informations when troubleshooting
        --generate [file]   - generate default formatter config for tweaking 
                              default location will be in .git/formatter.cjs if value for --generate not specified
`);

  process.exit(0);
}

// https://imgur.com/bawTURW
const color = {
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",
  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m", // red
  FgGreen: "\x1b[32m", // green
  FgYellow: "\x1b[33m", // yellow
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m", // magenta
  FgCyan: "\x1b[36m", // cyan
  FgWhite: "\x1b[37m",
  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
  r: "\x1b[31m", // red
  g: "\x1b[32m", // green
  y: "\x1b[33m", // yellow
  m: "\x1b[35m", // magenta
  c: "\x1b[36m", // cyan
  reset: "\x1b[0m",
};

const debug = args.get("debug") || false;

let formatterBuilderFunction = formatterBuilder;

let formatterFile = args.get("formatter");

if (formatterFile) {
  formatterFile = path.resolve(formatterFile);

  if (!fs.existsSync(formatterFile)) {
    throw th(`--formatter >${formatterFile}< file doesn't exist`);
  }

  try {
    formatterBuilderFunction = require(formatterFile);
  } catch (e) {
    throw th(`problem when importing formatter file >${formatterFile}<, details: ${e}`);
  }

  if (typeof formatterBuilderFunction !== "function") {
    throw th(`impotend formatter module >${formatterFile}< doesn't seem to be a function`);
  }
}

const tools = {
  color,
  timeFormatter: (function () {
    const th = thBuilder(`timeFormatter internal tool`);
    return (timeString) => {
      if (typeof timeString !== "string") {
        throw th(`timeString parameter is not a string`);
      }

      try {
        return `[${new Date(timeString).toISOString().substring(11, 23)}]`;
      } catch (e) {
        throw th(`formatting to string error, details >${e}<`);
      }
    };
  })(),
  flipColors: (function () {
    const th = thBuilder(`flipColors internal tool`);
    return (LEVELS) => {
      // just flipped from LEVELS like:
      // FATAL: {level:60,color:bgRed}
      // to
      // 60: {level:"FATAL",color:bgRed}
      return Object.entries(LEVELS).reduce((acc, [name, { level, color }], index) => {
        if (!Number.isInteger(level)) {
          throw th(
            `level in LEVELS object under index >${index}< is not a number, it is typeof(${typeof level}) >${level}<`
          );
        }

        if (typeof name !== "string" || !name.trim()) {
          throw th(
            `name in LEVELS object under index >${index}< is not a string or an empty string, it is typeof(${typeof name}) >${name}<`
          );
        }

        if (typeof color !== "string") {
          throw th(
            `color in LEVELS object under index >${index}< is not a string, it is typeof(${typeof color}) >${color}<`
          );
        }

        acc[level] = { level: name, color };

        return acc;
      }, {});
    };
  })(),
  type: function (n) {
    if (n === undefined) {
      return "Undefined";
    }

    if (n === null) {
      return "Null";
    }

    let t = typeof n;

    if (t === "Function") {
      return t;
    }

    if (Number.isNaN(n)) {
      return "NaN";
    }

    if (t === "number") {
      return Number(n) === n && n % 1 === 0 ? "Integer" : "Float";
    }

    return n.constructor ? n.constructor.name : t;
  },
  getPerlFormatter: async function () {
    const perlFormatter = await perlStringReplacerBuilder();

    return perlFormatter;
  },
};

tools.formatRestBuilder = buildFormatRestBuilder(tools);

/**
 * Main logic is here
 */
(async function () {
  const formatter = await formatterBuilderFunction(tools);

  const rl = readline.createInterface({
    input: process.stdin,
  });

  let i = 0;

  for await (const line of rl) {
    // async fixed thank to : https://stackoverflow.com/a/54269197
    i += 1;

    try {
      const obj = JSON.parse(line);

      if (isObject(obj)) {
        const formatted = await formatter(obj);

        process.stdout.write(formatted);

        return;
      }
    } catch (e) {
      if (debug) {
        process.stdout.write(`json parsing error on line: ${i}: ${e} \n`);
      }
    }
    process.stdout.write(`${line}\n`);
  }
})();

function buildFormatRestBuilder({ type }) {
  return function formatRestBuilder({ firstIndent = 4, consecutiveIndent = 2 }) {
    let buff = "";

    let limit = 10;

    let indent = " ".repeat(consecutiveIndent);

    function inner(d, l, index) {
      typeof l === "undefined" && (l = 0);
      index = typeof index === "undefined" ? "" : `<${color.g}` + index + `${color.reset}> `;
      var isOb = isObject(d) || count(d);
      if (isOb || isArray(d)) {
        buff += indent.repeat(l) + index + type(d) + " " + (isOb ? "{" : "[") + "\n";
        each(d, function (v, i) {
          var isOb = isObject(v) || count(v) || isArray(v);
          if (limit !== false && l >= limit && isOb) {
            buff +=
              indent.repeat(l + 1) +
              (typeof i === "undefined" ? "" : `<${color.g}` + i + `${color.reset}> `) +
              "[" +
              type(v) +
              "]: " +
              ">>more<<" +
              "\n";
            // inner('... more: ' + type(v), l + 1, i);
          } else {
            inner(v, l + 1, i);
          }
        });
        buff += indent.repeat(l) + (isOb ? "}" : "]") + "\n";
      } else {
        var t = type(d);
        var c = toString(d);
        buff +=
          indent.repeat(l) +
          index +
          "[" +
          t +
          "]: " +
          `>${color.g}` +
          c +
          `${color.reset}<` +
          (t === "String" ? " len: " + c.length : "") +
          "\n";
      }
    }
    return (rest) => {
      buff = "";
      inner(rest);
      return buff
        .split("\n")
        .map((r) => " ".repeat(firstIndent) + r)
        .join("\n")
        .trimEnd();
    };
  };
}

function each(obj, fn, context) {
  if (isArray(obj)) {
    for (var i = 0, l = obj.length; i < l; ++i) {
      if (fn.call(context, obj[i], i) === false) {
        return;
      }
    }
  } else if (isObject(obj) || count(obj)) {
    for (var i in obj) {
      if (obj && obj.hasOwnProperty && obj.hasOwnProperty(i)) {
        if (fn.call(context, obj[i], i) === false) {
          return;
        }
      }
    }
  }
}

function isObject(a) {
  // return (!!a) && (a.constructor === Object);
  return Object.prototype.toString.call(a) === "[object Object]"; // better in node.js to dealing with RowDataPacket object
}
function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

// only for function
function count(o) {
  if (typeof o === "function") {
    for (let i in o) {
      if (o && o.hasOwnProperty && o.hasOwnProperty(i)) {
        return true;
      }
    }
  }

  return false;
}

function toString(o, k) {
  if (typeof o === "function") {
    k = Object.keys(o).join(",");

    return k ? "object keys:" + k : "";
  }

  return o;
}

/**
 * File from this mark will be cut to the end to genereate custom configuration
 */
/***/
async function formatterBuilder({ timeFormatter, flipColors, formatRestBuilder, color: c, getPerlFormatter }) {
  // see more colors: https://imgur.com/bawTURW
  const LEVELS = {
    FATAL: { level: 60, color: c.BgRed },
    ERROR: { level: 50, color: c.FgRed },
    WARN: { level: 40, color: c.FgYellow },
    INFO: { level: 30, color: c.FgGreen },
    DEBUG: { level: 20, color: c.FgBlue },
    TRACE: { level: 10, color: c.Dim },
    DEFAULT: { level: 0, color: "" },
  };

  const FLIP = flipColors(LEVELS);

  const formatRest = formatRestBuilder({
    // firstIndent: 4,
    // consecutiveIndent: 2,
  });

  // const perlFormatter = await getPerlFormatter();

  return async function formatter(row) {
    let { timestamp, level, ...rest } = row;

    const time = timeFormatter(timestamp);

    let levelLabel = "";

    let color;

    if (level) {
      if (typeof level === "string") {
        levelLabel = level.toUpperCase();

        color = LEVELS[levelLabel]?.color;
      }

      if (Number.isInteger(level)) {
        color = FLIP[level]?.color;

        if (FLIP[level]) {
          levelLabel = FLIP[level].level;
        }
      }
    }

    if (!color) {
      color = LEVELS.DEFAULT.color;
    }

    /**
     * Reordering
     */
    const { stack_trace, message, ...final } = rest;

    if (typeof message !== "undefined") {
      final.message = message;
    }

    if (typeof stack_trace !== "undefined") {
      final.stack_trace = stack_trace;
    }

    if (typeof message === "string") {
      final.message = message;
      // final.message = await perlFormatter(message.replace(/\\\"/g, '"'));
    }

    return `
${time} ${color}${level}(${levelLabel}${color})${c.reset}:    
${formatRest(final)}`;
  };
}
