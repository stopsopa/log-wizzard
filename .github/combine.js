//   node .github/combine.js --placeholder %% --template .github/markdown.html --topaste index-raw.html --output index.html

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

var matchOperatorsRe = /[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g;

function pregQuote(str) {
  if (typeof str !== "string") {
    return false;
  }

  return str.replace(matchOperatorsRe, "\\$&");
}

const template = args.get("template");

const topaste = args.get("topaste");

const output = args.get("output");

const placeholder = args.get("placeholder");

const th = (msg) => new Error(`combine.js error: ${msg}`);

if (typeof placeholder !== "string" || !placeholder.trim()) {
  throw th(`--placeholder is not specified`);
}

if (!fs.existsSync(template)) {
  throw th(`--template file >${template}< doesn't exist`);
}

if (!fs.existsSync(topaste)) {
  throw th(`--topaste file >${topaste}< doesn't exist`);
}

const templateContent = fs.readFileSync(template, "utf8").toString();

const topasteContent = fs.readFileSync(topaste, "utf8").toString();

const quoted = pregQuote(placeholder);

const log = console.log;

const content = templateContent.replace(new RegExp(quoted, "g"), (a) => {
  return topasteContent;
});

fs.writeFileSync(output, content);

log(`
    combine.js: file created ${output}
`);
