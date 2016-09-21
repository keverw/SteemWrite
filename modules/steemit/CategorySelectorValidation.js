'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.validateCategory = validateCategory;

function validateCategory(category) {
    var required = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

    if (!category || category.trim() === '') return required ? 'Required' : null;
    var cats = category.trim().split(' ');
    return (
        // !category || category.trim() === '' ? 'Required' :
        cats.length > 5 ? 'Please use only five categories' : cats.find(function(c) {
            return c.length > 24;
        }) ? 'Maximum tag length is 24 characters' : cats.find(function(c) {
            return c.split('-').length > 2;
        }) ? 'Use only one dash' : cats.find(function(c) {
            return c.indexOf(',') >= 0;
        }) ? 'Use spaces to separate tags' : cats.find(function(c) {
            return (/[A-Z]/.test(c));
        }) ? 'Use only lowercase letters' : cats.find(function(c) {
            return !/^[a-z0-9-]+$/.test(c);
        }) ? 'Use only lowercase letters, digits and one dash' : cats.find(function(c) {
            return !/^[a-z]/.test(c);
        }) ? 'Must start with a letter' : cats.find(function(c) {
            return !/[a-z0-9]$/.test(c);
        }) ? 'Must end with a letter or number' : null
    );
}
