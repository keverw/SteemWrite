'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var urlChar = '[^\\s"\'<>\\]\\[\\(\\)]';
var imagePath = '(?:(?:\\.(?:tiff?|jpe?g|gif|png|svg|ico)|ipfs/[a-z\\d]{40,}))';
var domainPath = '(?:[-a-zA-Z0-9\\._]+)';
var urlChars = '(?:' + urlChar + '*)';

var urlSet = function urlSet() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var _ref$domain = _ref.domain;
    var domain = _ref$domain === undefined ? domainPath : _ref$domain;
    var path = _ref.path;

    // urlChars is everything but html or markdown stop chars
    return 'https?://' + domain + '(?::\\d{2,5})?(?:[/\\?#]' + urlChars + (path ? path + urlChars : '') + ')' + (path ? '' : '?');
};

/**
    Unless your using a 'g' (glob) flag you can store and re-use your regular expression.  Use the cache below.  If your using a glob (for example: replace all), the regex object becomes stateful and continues where it left off when called with the same string so naturally the regexp object can't be cached for long.
*/
var any = exports.any = function any() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(urlSet(), flags);
};
var local = exports.local = function local() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(urlSet({
        domain: '(?:localhost|(?:.*\\.)?steemit.com)'
    }), flags);
};
var remote = exports.remote = function remote() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(urlSet({
        domain: '(?!localhost|(?:.*\\.)?steemit.com)' + domainPath
    }), flags);
};
var youTube = exports.youTube = function youTube() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(urlSet({
        domain: '(?:(?:.*\.)?youtube.com|youtu.be)'
    }), flags);
};
var image = exports.image = function image() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(urlSet({
        path: imagePath
    }), flags);
};
var imageFile = exports.imageFile = function imageFile() {
    var flags = arguments.length <= 0 || arguments[0] === undefined ? 'i' : arguments[0];
    return new RegExp(imagePath, flags);
};
// export const nonImage = (flags = 'i') => new RegExp(urlSet({path: '!' + imageFile}), flags)
// export const markDownImageRegExp = (flags = 'i') => new RegExp('\!\[[\w\s]*\]\(([^\)]+)\)', flags);

exports.default = {
    any: any(),
    local: local(),
    remote: remote(),
    image: image(),
    imageFile: imageFile(),
    youTube: youTube(),
    youTubeId: /(?:(?:youtube.com\/watch\?v=)|(?:youtu.be\/)|(?:youtube.com\/embed\/))([A-Za-z0-9\_\-]+)/i,
    // simpleLink: new RegExp(`<a href="(.*)">(.*)<\/a>`, 'ig'),
    ipfsPrefix: /(https?:\/\/.*)?\/ipfs/i
};

// Original regex
// const urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';

// About performance
// Using exec on the same regex object requires a new regex to be created and compile for each text (ex: post).  Instead replace can be used `body.replace(remoteRe, l => {` discarding the result for better performance`}).  Re-compiling is a chrome bottleneck but did not effect nodejs.
