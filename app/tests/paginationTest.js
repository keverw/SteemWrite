var pagination = require('../modules/main/pagination.js');
var myPagination = pagination.init();

myPagination.setFN('test');
myPagination.setPerPage(10);
myPagination.setTotalItems(25);
//myPagination.setTotalItems(0);

myPagination.setPage(3);

// console.log(myPagination);

// console.log(myPagination.getLimitSql());

console.log(myPagination.getPagination());
