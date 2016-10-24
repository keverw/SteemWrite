/*jshint multistr: true */

var textHelpers = require('../modules/textHelpers.js');

var html1 = "https://www.youtube.com/watch?v=iFDe5kUUyT0 <b>Hi</b> https://i.imgsafe.org/fc5b183ceb.jpg";
var html2 = '<a href="https://i.imgsafe.org/fc5b183ceb.jpg"><img src="https://i.imgsafe.org/fc5b183ceb.jpg"></a>';

var htmlText = "<!DOCTYPE html>\
<html>\
<body>\
" +
    html2 +
    "</body>\
 </html>";

var htmlText2 = "<!DOCTYPE html>\
 <html>\
 <body>\
 " +
    html2 + " " + html1 +
    " @keverw is #cool </body>\
  </html>";

// console.log(textHelpers.metadata(html1));
// console.log(textHelpers.metadata(htmlText));
//console.log(textHelpers.metadata(htmlText2));

console.log(textHelpers.youtubePreview(textHelpers.preview(htmlText2)));
