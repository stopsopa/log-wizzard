#!/usr/bin/env node

const readline = require("readline");

const path = require("path");

const fs = require("fs");

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
      throw th(`argument --${key} is not allowed, allowed are >${allowedArguments.join(", ")}< run --help to see how to use this tool`);
    }
  });
}

{
  let gen = args.get("generate");

  if (gen) {
    if (gen === true) {
      gen = "formatter.cjs";
    }

    if (fs.existsSync(gen)) {
      throw th(`file >${gen}< already exist`);
    }

    const help = `

/**
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
        --generate [file]   - generate config for tweaking in path.resolve(process.cwd(), 'formatter.cjs') by default
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

const rl = readline.createInterface({
  input: process.stdin,
});

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
};

tools.formatRestBuilder = buildFormatRestBuilder(tools);

const formatter = formatterBuilderFunction(tools);

let i = 0;
rl.on("line", (line) => {
  i += 1;

  try {
    const obj = JSON.parse(line);

    if (isObject(obj)) {
      process.stdout.write(formatter(obj));

      return;
    }
  } catch (e) {
    if (debug) {
      process.stdout.write(`json parsing error on line: ${i}: ${e} \n`);
    }
  }
  process.stdout.write(`${line}\n`);
});

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
function formatterBuilder({ timeFormatter, flipColors, formatRestBuilder, color: c }) {
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

  return function formatter(row) {
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

    return `
${time} ${color}${level}(${levelLabel}${color})${c.reset}:    
${formatRest(final)}`;
  };
}
