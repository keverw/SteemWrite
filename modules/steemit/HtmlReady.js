/* jshint ignore:start */

'use strict';

var $STM_Config = {
    img_proxy_prefix: "https://img1.steemit.com/",
    ipfs_prefix: "https://steemit.com/ipfs"
};

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};

exports.default = function(html) {
    var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var _ref$mutate = _ref.mutate;
    var mutate = _ref$mutate === undefined ? true : _ref$mutate;

    var state = {
        mutate: mutate
    };

    state.hashtags = new Set();
    state.usertags = new Set();
    state.htmltags = new Set();
    state.images = new Set();
    state.links = new Set();
    try {
        var doc = DOMParser.parseFromString(html, 'text/html');
        traverse(doc, state);
        if (mutate) proxifyImages(doc);
        // console.log('state', state)
        if (!mutate) return state;
        return _extends({
            html: doc ? XMLSerializer.serializeToString(doc) : ''
        }, state);
    } catch (error) {
        // Not Used, parseFromString might throw an error in the future
        console.error(error.toString());
        return {
            html: html
        };
    }
};

var _xmldom = require('xmldom');

var _xmldom2 = _interopRequireDefault(_xmldom);

var _Links = require('./Links.js');

var _Links2 = _interopRequireDefault(_Links);

var _ChainValidation = require('./ChainValidation');

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}

function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
            arr2[i] = arr[i];
        }
        return arr2;
    } else {
        return Array.from(arr);
    }
}

var noop = function noop() {};
var DOMParser = new _xmldom2.default.DOMParser({
    errorHandler: {
        warning: noop,
        error: noop
    }
});
var XMLSerializer = new _xmldom2.default.XMLSerializer();

/** Split the HTML on top-level elements. This allows react to compare separately, preventing excessive re-rendering.
 * Used in MarkdownViewer.jsx
 */
// export function sectionHtml (html) {
//   const doc = DOMParser.parseFromString(html, 'text/html')
//   const sections = Array(...doc.childNodes).map(child => XMLSerializer.serializeToString(child))
//   return sections
// }

/** Embed videos, link mentions and hashtags, etc...
 */

function traverse(node, state) {
    var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

    if (!node || !node.childNodes) return;
    Array.apply(undefined, _toConsumableArray(node.childNodes)).forEach(function(child) {
        // console.log(depth, 'child.tag,data', child.tagName, child.data)
        if (child.tagName) state.htmltags.add(child.tagName.trim().toLowerCase());

        if (/img/i.test(child.tagName)) img(state, child);
        else if (/a/i.test(child.tagName)) link(state, child);
        else if (!embedYouTubeNode(child, state.links, state.images)) linkifyNode(child, state);
        traverse(child, state, ++depth);
    });
}

function link(state, child) {
    var url = child.getAttribute('href');
    if (url) {
        state.links.add(url);
        if (state.mutate) {
            if (!/(https?:)?\/\//.test(url)) {
                child.setAttribute('href', "https://" + url);
            }
        }
    }
}

function img(state, child) {
    // atty(child, 'src', a => state.images.add(a.value))
    var url = child.getAttribute('src');
    if (url) {
        state.images.add(url);
        if (state.mutate) {
            var url2 = ipfsPrefix(url);
            if (/^\/\//.test(url2)) {
                // Change relative protocol imgs to https
                url2 = "https:" + url2;
            }
            if (url2 !== url) {
                child.setAttribute('src', url2);
            }
        }
    }
}

// For all img elements with non-local URLs, prepend the proxy URL (e.g. `https://img0.steemit.com/0x0/`)
function proxifyImages(doc) {
    if (!$STM_Config.img_proxy_prefix) return;
    if (!doc) return;
    [].concat(_toConsumableArray(doc.getElementsByTagName('img'))).forEach(function(node) {
        var url = node.getAttribute('src');
        if (!_Links2.default.local.test(url)) node.setAttribute('src', $STM_Config.img_proxy_prefix + '0x0/' + url);
    });
}

function linkifyNode(child, state) {
    try {
        var mutate = state.mutate;

        if (!child.data) return;
        var data = XMLSerializer.serializeToString(child);
        if (/code/i.test(child.parentNode.tagName)) return;
        if (/a/i.test(child.parentNode.tagName)) return;
        var content = linkify(data, state.mutate, state.hashtags, state.usertags, state.images, state.links);
        if (mutate && content !== data) {
            child.parentNode.replaceChild(DOMParser.parseFromString('<span>' + content + '</span>'), child);
        }
    } catch (error) {
        console.log(error);
    }
}

function linkify(content, mutate, hashtags, usertags, images, links) {
    // hashtag
    content = content.replace(/(^|\s)(#[-a-z\d]+)/ig, function(tag) {
        if (/#[\d]+$/.test(tag)) return tag; // Don't allow numbers to be tags
        var space = /^\s/.test(tag) ? tag[0] : '';
        var tag2 = tag.trim().substring(1);
        if (hashtags) hashtags.add(tag2);
        if (!mutate) return tag;
        return space + ('<a href="/trending/' + tag2.toLowerCase() + '">' + tag + '</a>');
    });
    // usertag (mention)
    content = content.replace(/(^|\s)(@[a-z][-\.a-z\d]+[a-z\d])/ig, function(user) {
        var space = /^\s/.test(user) ? user[0] : '';
        var user2 = user.trim().substring(1);
        var valid = (0, _ChainValidation.validate_account_name)(user2) == null;
        if (valid && usertags) usertags.add(user2);
        if (!mutate) return user;
        return space + (valid ? '<a href="/@' + user2 + '">@' + user2 + '</a>' : '@' + user2);
    });

    // Was causing broken thumnails.
    // unescapted ipfs links (temp, until the reply editor categorizes the image)
    // if(mutate && config.ipfs_prefix)
    //     content = content.replace(linksRe.ipfsPrefix, config.ipfs_prefix)

    content = content.replace(_Links2.default.any, function(ln) {
        if (_Links2.default.image.test(ln)) {
            if (images) images.add(ln);
            return '<img src="' + ipfsPrefix(ln) + '" />';
        }
        if (links) links.add(ln);
        return '<a href="' + ipfsPrefix(ln) + '">' + ln + '</a>';
    });
    return content;
}

function embedYouTubeNode(child, links, images) {
    try {
        if (!child.data) return false;
        var data = child.data;
        if (/code/i.test(child.parentNode.tagName)) return false;
        var replaced = false;
        data.replace(_Links2.default.youTube, function(url) {
            var match = url.match(_Links2.default.youTubeId);
            if (match && match.length >= 2) {
                var id = match[1];
                var v = DOMParser.parseFromString('~~~ youtube:' + id + ' ~~~');
                child.parentNode.replaceChild(v, child);
                replaced = true;
                if (links) links.add(url);
                if (images) images.add('https://img.youtube.com/vi/' + id + '/0.jpg');
                return;
            }
            console.log("Youtube link without ID?", url);
        });
        return replaced;
    } catch (error) {
        console.log(error);
        return false;
    }
}

function ipfsPrefix(url) {
    if ($STM_Config.ipfs_prefix) {
        // Convert //ipfs/xxx  or /ipfs/xxx  into  https://steemit.com/ipfs/xxxxx
        if (/^\/?\/ipfs\//.test(url)) {
            var slash = url.charAt(1) === '/' ? 1 : 0;
            url = url.substring(slash + '/ipfs/'.length); // start with only 1 /
            return $STM_Config.ipfs_prefix + '/' + url;
        }
    }
    return url;
}

function atty(node, attributeName, set) {
    var attribute = Array.apply(undefined, _toConsumableArray(node.attributes)).find(function(a) {
        return a.name.toLowerCase() === attributeName;
    });
    if (attribute) set(attribute);
}
