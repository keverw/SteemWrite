(function()
{
    var numberFormat = require('number-format').numberFormat;

    module.exports = {
        init: function()
        {
            function paginationHelpers()
            {
                this.page = 1;
                this.total = 0;
                this.size = 10; //per page count
                this.onClickFN = '';
            }

            //Setters
            paginationHelpers.prototype.setPage = function(page)
            {
                //Set current page - call this after total is set
                page = parseInt(page);
                page = (page > 0) ? page : 1;

                //Check if the page number your on if valid, if not vaild latest allowed
                if (this.total > 0)
                {
                    var lastPage = Math.ceil(this.total / this.size);

                    if (page > lastPage) //requested page is higher than the max(last) page
                    {
                        page = lastPage;
                    }

                }
                else //no results
                {
                    page = 1; //revert to page 1
                }

                //update mem
                this.page = page;

            };

            paginationHelpers.prototype.setTotalItems = function(total)
            {
                total = parseInt(total);
                this.total = (total > 0) ? total : 0; //must be > or 0. This is to filter out negative values and NaN
            };

            paginationHelpers.prototype.setPerPage = function(count)
            {
                count = parseInt(count);
                this.size = (count > 0) ? count : 1;
            };

            paginationHelpers.prototype.setFN = function(name)
            {
                this.onClickFN = name;
            };

            //Getters
            paginationHelpers.prototype.getLimitSql = function()
            {
                var lastPage = 0;

                if (this.total > 0)
                {
                    lastPage = Math.ceil(this.total / this.size);
                }

                var page = this.page;

                var sqlLimit = (page - 1) * this.size + ',' + this.size;
                return 'LIMIT ' + sqlLimit;
            };

            paginationHelpers.prototype._getOnclick = function(page)
            {
                var str = '';

                if (this.onClickFN.length > 0)
                {
                    str = 'onclick="' + this.onClickFN + '(' + page + ')"';
                }

                return str;
            };

            paginationHelpers.prototype.getPagination = function()
            {
                var output = {
                    text: '',
                    formattedText: '',
                    html: ''
                };

                var totalPages = Math.floor(this.total / this.size);
                totalPages += (this.total % this.size !== 0) ? 1 : 0;

                var to = 0;
                var from = 0;

                if (this.page == totalPages)
                {
                    to = (this.total - this.size) + this.size;
                    from = (this.page * this.size) - this.size + 1;
                }
                else
                {
                    to = (this.page * this.size);
                    from = to - this.size + 1;
                }

                output.text = numberFormat(from) + '-' + numberFormat(to) + ' of ' + numberFormat(this.total);
                output.formattedText = '<div class="text-center" style="margin: 15px 0px;font-weight: bold;">Displaying: ' + output.text + '</div>';

                if (totalPages <= 1) //only 1 page, no need for pagination html
                {
                    return output;
                }
                else
                {
                    //prepare loop
                    var loopStart = 1;
                    var loopEnd = totalPages;

                    if (totalPages > 5)
                    {
                        if (this.page <= 3)
                        {
                            loopStart = 1;
                            loopEnd = 5;
                        }
                        else if (this.page >= totalPages - 2)
                        {
                            loopStart = totalPages - 4;
                            loopEnd = totalPages;
                        }
                        else
                        {
                            loopStart = this.page - 2;
                            loopEnd = this.page + 2;
                        }

                    }

                    //build htmlInner
                    var htmlInner = '';

                    //go to first page
                    if (loopStart != 1)
                    {
                        htmlInner += '<li><a ' + this._getOnclick(1) + '>&#171;</a></li>';
                    }

                    //previous page
                    if (this.page > 1)
                    {
                        htmlInner += '<li><a ' + this._getOnclick(this.page - 1) + '>Prev</a></li>';
                    }

                    //pages
                    for (var i = loopStart; i <= loopEnd; i++)
                    {
                        if (i == this.page)
                        {
                            htmlInner += '<li class="active"><a ' + this._getOnclick(i) + '>' + i + '</a></li>';
                        }
                        else
                        {
                            htmlInner += '<li><a ' + this._getOnclick(i) + '>' + i + '</a></li>';
                        }

                    }

                    //next page
                    if (this.page < totalPages)
                    {
                        htmlInner += '<li><a ' + this._getOnclick(this.page + 1) + '>Next</a></li>';
                    }

                    //go to last page
                    if (loopEnd != totalPages)
                    {
                        htmlInner += '<li><a ' + this._getOnclick(totalPages) + '>&#187;</a></li>';
                    }

                    //add to html
                    output.html = '<div class="text-center">';
                    output.html += '<ul class="pagination pagination-lg">' + htmlInner + '</ul>';
                    output.html += '</div>';

                }

                return output;
            };

            return new paginationHelpers();

        }
    };

}());
