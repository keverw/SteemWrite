var util = require('../modules/util.js');

// var lastPost = '<b>Hello... World... This... Is... A... Test...</b>';
// var newBody = lastPost + 'Hello World!';

var lastPost = '<b>Hello... World... This... Is... A... Test...</b>';
var newBody = 'Hello World!';

var patch = util.createPatch(lastPost, newBody, true);
console.log(patch);

//console.log('applyPatch', util.applyPatch(lastPost, patch));
