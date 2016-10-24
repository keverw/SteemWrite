/*jshint multistr: true */

var textHelpers = require('../modules/textHelpers.js');

var htmlText = "<!DOCTYPE html>\
<html>\
<body>\
	lol\
</body>\
</html>";

console.log(textHelpers.isHtml(htmlText)); //true
console.log(textHelpers.isHtml('<html is cool>lol</html>')); //true
console.log(textHelpers.isHtml('html lol is not cool. So I used markdown in this post')); //false
console.log(textHelpers.isHtml('how to do <html')); //false
