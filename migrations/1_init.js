(function ()
{
    module.exports = {
        getTotal: 0, //how many things you plan todo
        migrate: function(doneCB)
        {
            doneCB(true); //true to commit, false to roll back and exit
        }

    };

}());
