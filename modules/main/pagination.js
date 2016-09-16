(function()
{

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

            return new paginationHelpers();

        }
    };

}());
