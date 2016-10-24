(function()
{
    var _ = require('underscore'),
        async = require('async'),
        uuid = require('node-uuid'),
        pagination = require('./pagination.js'),
        accountHelpers = require('./accountHelpers.js'),
        postHelpers = require('./postHelpers.js'),
        util = require('../util.js'),
        textHelpers = require('../textHelpers.js'),
        secureRandom = require('secure-random'),
        base58 = require('bs58'),
        editorUtility = require('../editorUtility.js'),
        transactionBuilder = require('steemjs-lib').TransactionBuilder,
        steemUserWatcher = require('./steemUserWatcher.js'),
        kvs = require('./kvs.js');

    function cleanPermlink(permlink)
    {
        //Over STEEMIT_MAX_PERMLINK_LENGTH
        if (permlink.length > 255) permlink = permlink.substring(permlink.length - 255, permlink.length);

        // only letters numbers and dashes shall survive
        permlink = permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '');
        return permlink;
    }

    module.exports = {
        postList: function(parameters, cb)
        {
            var output = {};

            function processResults(err, rows)
            {
                if (err) return cb(err);

                var authpermsLookups = [];

                if (rows.length > 0)
                {
                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            //set if hadErr
                            rows[i].hadError = (rows[i].warningMsg.length > 0);
                            delete rows[i].warningMsg;

                            //build authpermsLookups list
                            authpermsLookups.push([rows[i].author, rows[i].permlink].join('.'));
                        }

                    }

                }

                //call getAutosaves and process
                postHelpers.getAutosaves(authpermsLookups, function(err, results)
                {
                    if (err) return cb(err);

                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            var authperm = [rows[i].author, rows[i].permlink].join('.');
                            rows[i].autosaveRevison = (results[authperm]) ? results[authperm] : '';
                        }

                    }

                    output.posts = rows;
                    cb(null, output);
                });

            }

            function processCountResult(err, row)
            {
                if (err) return cb(err);

                var postCount = row.posts;

                var myPagination = pagination.init();
                myPagination.setFN('postsView.page');
                myPagination.setPerPage(7);
                myPagination.setTotalItems(postCount);

                myPagination.setPage(parameters.page);
                output.pagination = myPagination.getPagination();

                var fields = 'author, permlink, title, status, date, tag1, tag2, tag3, tag4, tag5, featuredImg, warningMsg';

                if (parameters.type == 'all')
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username], processResults);
                }
                else
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? AND status = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username, parameters.type], processResults);
                }

            }

            if (parameters.type == 'all')
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ?", [parameters.username], processCountResult);
            }
            else
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ? AND status = ?", [parameters.username, parameters.type], processCountResult);
            }

        },
        bcGetContent: function(parameters, cb)
        {
            if (global.bcReady)
            {
                global.bc.database_api().exec('get_content', [parameters.author, parameters.permlink])
                    .then(function(res)
                    {
                        cb(null, res);
                    })
                    .catch(function(e)
                    {
                        cb(e);
                    });

            }
            else
            {
                cb(new Error('Blockchain not ready yet'));
            }

        },
        createMainPermlink: function(parameters, cb)
        {
            var author = parameters.author,
                title = parameters.title;

            var permlink = '';

            var s = editorUtility.slug(title.toLowerCase());

            if (s === '') s = base58.encode(secureRandom.randomBuffer(4));

            //ensure the permlink(slug) is unique
            var prefix = '';

            module.exports.bcGetContent({
                author: author,
                permlink: s
            }, function(err, result)
            {
                if (err) return cb(err);

                if (result.body === '') //no post for that slug
                {
                    //check database
                    global.db.get('SELECT * FROM posts WHERE author = ? AND permlink = ?', [author, s], function(err, row)
                    {
                        if (err) return cb(err);

                        if (row) //post already for that slug
                        {
                            prefix = base58.encode(secureRandom.randomBuffer(4)) + '-'; // make sure slug is unique
                        }

                        cb(null, {
                            permlink: cleanPermlink(prefix + s)
                        });

                    });

                }
                else //post already for that slug
                {
                    prefix = base58.encode(secureRandom.randomBuffer(4)) + '-'; // make sure slug is unique
                    cb(null, {
                        permlink: cleanPermlink(prefix + s)
                    });

                }

            });

        },
        createDraftPermlink: function(parameters, cb)
        {
            if (parameters.author)
            {
                module.exports.createMainPermlink({
                    author: parameters.newAuthor,
                    title: uuid.v4()
                }, function(err, result)
                {
                    cb(err, result);
                });

            }
            else
            {
                cb(new Error('Missing parameter'));
            }

        },
        createReplyPermlink: function(parameters, cb)
        {
            // comments: re-parentauthor-parentpermlink-time
            var timeStr = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '');
            parameters.parent_permlink = parameters.parent_permlink.replace(/(-\d{8}t\d{9}z)/g, '');
            var permlink = 're-' + parameters.parent_author + '-' + parameters.parent_permlink + '-' + timeStr;

            cb(null, {
                permlink: cleanPermlink(permlink)
            });

        },
        loadPost: function(parameters, cb)
        {
            global.db.get("SELECT * FROM posts WHERE author = ? AND permlink = ? LIMIT 1", [parameters.author, parameters.permlink], function(err, postsRow)
            {
                if (err) return cb(err);

                if (postsRow)
                {
                    var authperm = [parameters.author, parameters.permlink].join('.');

                    postHelpers.getRevInfo(authperm, function(err, info)
                    {
                        if (err) return cb(err);

                        var lookupRev = info.autosaveRevison;

                        if (lookupRev === '') //no autosave, use latest saved revison
                        {
                            lookupRev = info.latestRevison;
                        }

                        if (lookupRev.length > 0)
                        {

                            //author and permlink are included because revhash is only 1 part of the pkey.
                            global.db.get("SELECT * FROM revisions WHERE revHash = ? AND author = ? AND permlink = ? LIMIT 1", [lookupRev, parameters.author, parameters.permlink], function(err, revisionsRow)
                            {

                                if (err) return cb(err);

                                if (revisionsRow)
                                {
                                    var tags = [];

                                    try {
                                        var metadata = JSON.parse(revisionsRow.json_metadata);

                                        if (metadata.tags) tags = metadata.tags;

                                        if (typeof postsRow.onPubAutoVote == 'number')
                                        {
                                            postsRow.onPubAutoVote = (postsRow.onPubAutoVote == 1) ? true : false;
                                        }

                                        cb(null, {
                                            status: 'found',
                                            postStatus: postsRow.status,
                                            author: revisionsRow.author,
                                            permlink: revisionsRow.permlink,
                                            title: revisionsRow.title,
                                            body: revisionsRow.body,
                                            json_metadata: metadata,
                                            tags: tags,
                                            autosaveRevison: info.autosaveRevison,
                                            date: postsRow.date,
                                            scheduledDate: postsRow.scheduledDate,
                                            warningMsg: postsRow.warningMsg,
                                            onPubAutoVote: postsRow.onPubAutoVote,
                                            onPubPayoutType: postsRow.onPubPayoutType
                                        });

                                    } catch (err)
                                    {
                                        if (err) return cb(err);
                                    }

                                }
                                else
                                {
                                    cb(null, {
                                        status: 'notfound'
                                    });

                                }

                            });

                        }
                        else
                        {
                            cb(null, {
                                status: 'notfound'
                            });
                        }

                    });

                }
                else
                {
                    cb(null, {
                        status: 'notfound'
                    });
                }

            });

        },
        dismissWarning: function(parameters, cb)
        {
            if (parameters.author && parameters.permlink)
            {
                global.db.run("UPDATE posts SET warningMsg = '' WHERE author = ? AND permlink = ?", [parameters.author, parameters.permlink], function(err)
                {
                    cb(err);
                });
            }
            else
            {
                cb(new Error('Missing parameters'));
            }

        },
        changeAuthor: function(parameters, cb)
        {
            if (parameters.currentAuthor && parameters.currentPermlink && parameters.newAuthor)
            {
                var lockCheck = setInterval(function()
                {
                    if (!postHelpers.isOpLock(parameters.currentAuthor, parameters.currentPermlink))
                    {
                        postHelpers.opLock(parameters.currentAuthor, parameters.currentPermlink);
                        clearInterval(lockCheck);

                        global.db.get('SELECT * FROM posts WHERE author = ? AND permlink = ?', [parameters.currentAuthor, parameters.currentPermlink], function(err, row)
                        {
                            if (err)
                            {
                                postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                cb(err);
                            }
                            else if (row && row.status == 'drafts')
                            {

                                module.exports.createDraftPermlink({
                                    author: parameters.newAuthor
                                }, function(err, draftPermlinkResult)
                                {
                                    if (err)
                                    {
                                        postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                        cb(err);
                                    }
                                    else
                                    {
                                        var authperm = [parameters.newAuthor, draftPermlinkResult.permlink].join('.');

                                        global.db.run("UPDATE revisions SET author = ?, permlink = ?, authperm = ? WHERE author = ? AND permlink = ?", [
                                            parameters.newAuthor,
                                            draftPermlinkResult.permlink,
                                            authperm,
                                            parameters.currentAuthor,
                                            parameters.currentPermlink
                                        ], function(err)
                                        {
                                            if (err)
                                            {
                                                postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                                cb(err);
                                            }
                                            else
                                            {

                                                global.db.run("UPDATE posts SET author = ?, permlink = ? WHERE author = ? AND permlink = ?", [
                                                    parameters.newAuthor,
                                                    draftPermlinkResult.permlink,
                                                    parameters.currentAuthor,
                                                    parameters.currentPermlink
                                                ], function(err)
                                                {
                                                    if (err)
                                                    {
                                                        postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                                        cb(err);
                                                    }
                                                    else
                                                    {
                                                        accountHelpers.switchAccount(parameters.newAuthor, function(err, status)
                                                        {
                                                            if (err)
                                                            {
                                                                postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                                                cb(err);
                                                            }
                                                            else
                                                            {
                                                                var replyObj = {
                                                                    msg: 'Changed Author'
                                                                };

                                                                if (status == 'switched')
                                                                {
                                                                    accountHelpers.basicInfo(function(err, info)
                                                                    {
                                                                        if (err)
                                                                        {
                                                                            replyObj.goHome = true;
                                                                        }
                                                                        else
                                                                        {
                                                                            replyObj.changed = {
                                                                                basicInfo: info,
                                                                                newAuthor: parameters.newAuthor,
                                                                                newPermlink: draftPermlinkResult.permlink
                                                                            };

                                                                        }

                                                                        postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                                                        cb(null, replyObj);
                                                                    });

                                                                }
                                                                else
                                                                {
                                                                    replyObj.goHome = true;
                                                                    postHelpers.opUnlock(parameters.currentAuthor, parameters.currentPermlink);
                                                                    cb(null, replyObj);
                                                                }

                                                            }

                                                        });

                                                    }

                                                });

                                            }

                                        });

                                    }

                                });

                            }
                            else
                            {
                                cb(null, {
                                    msg: 'Post not found or is not a draft'
                                });

                            }

                        });

                    }

                }, 10);

            }
            else
            {
                cb(new Error('Missing parameters'));
            }

        },
        savePost: function(parameters, cb)
        {
            var lockCheck;

            var metadata = {};
            var additionalJSONParseResult = editorUtility.validate.additionalJSONParse(parameters.editorData.additionalJSON);

            //set if no error message
            if (!additionalJSONParseResult.errMsg) metadata = additionalJSONParseResult.decoded;

            //set tags and extractedMeta
            var tags = util.splitRemoveEmpties(' ', parameters.editorData.tags);
            var extractedMeta = textHelpers.metadata(parameters.editorData.body);

            if (tags.length > 0) metadata.tags = tags;
            if (extractedMeta.usertags.length > 0) metadata.users = extractedMeta.usertags;
            if (extractedMeta.images.length > 0) metadata.image = extractedMeta.images;
            if (extractedMeta.links.length > 0) metadata.links = extractedMeta.links;

            var featuredImg = (metadata.image && typeof metadata.image == 'object' && typeof metadata.image[0] == 'string') ? metadata.image[0] : '';

            if (parameters.mode == 'autosave')
            {

                if (postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                {
                    cb(null, {
                        locked: true
                    });

                }
                else
                {
                    postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);

                    var unixTime = util.time();

                    postHelpers.saveAutosave(metadata, tags, featuredImg, unixTime, parameters.editorData, function(err, result)
                    {
                        postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                        cb(err, result);
                    });

                }

            }
            else if (parameters.mode == 'updatePubPrefAutoVote' || parameters.mode == 'updatePubPrefPubPayoutType')
            {
                lockCheck = setInterval(function()
                {
                    if (!postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                    {
                        postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);
                        clearInterval(lockCheck);

                        var publishPanel = {
                            onPubAutoVote: parameters.editorData.onPubAutoVote,
                            onPubPayoutType: parameters.editorData.onPubPayoutType
                        };

                        var successCB = function(options)
                        {
                            var update,
                                defaultPrefPubName = '',
                                defaultPrefPubValue;

                            if (parameters.mode == 'updatePubPrefAutoVote')
                            {
                                update = true;
                                defaultPrefPubName = 'autovote';
                                defaultPrefPubValue = parameters.editorData.onPubAutoVote;
                            }
                            else if (parameters.mode == 'updatePubPrefPubPayoutType')
                            {
                                update = true;
                                defaultPrefPubName = 'payout';
                                defaultPrefPubValue = parameters.editorData.onPubPayoutType;
                            }

                            if (update)
                            {
                                postHelpers.updateDefaultUpdatePubPref(defaultPrefPubName, defaultPrefPubValue, function(err)
                                {
                                    //ignore err on this one, as it's just setting the default. So a failure isn't a show stopper
                                    cb(null, options);
                                });

                            }
                            else
                            {
                                cb(null, options);
                            }

                        };

                        //check if post exists
                        global.db.get('SELECT * FROM posts WHERE author = ? AND permlink = ?', [parameters.editorData.author, parameters.editorData.permlink], function(err, row)
                        {
                            if (err)
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                cb(err);
                            }
                            else if (row) //update, do a update
                            {
                                var postData = {
                                    onPubAutoVote: (parameters.editorData.onPubAutoVote) ? 1 : 0,
                                    onPubPayoutType: parameters.editorData.onPubPayoutType
                                };

                                postHelpers.updatePost(parameters.editorData.author, parameters.editorData.permlink, postData, function(err)
                                {
                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                    if (err) return cb(err);

                                    successCB({
                                        publishPanel: publishPanel
                                    });

                                });

                            }
                            else //new post
                            {
                                var unixTime = util.time();
                                postHelpers.saveAutosave(metadata, tags, featuredImg, unixTime, parameters.editorData, function(err, result)
                                {
                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                    if (err) return cb(err);

                                    if (result && result.autosaveRevison) publishPanel.autosaveRevison = result.autosaveRevison.autosaveRevison;

                                    successCB({
                                        publishPanel: publishPanel
                                    });

                                });

                            }

                        });

                    }

                }, 10);
            }
            else if (parameters.mode == 'savedraft')
            {
                lockCheck = setInterval(function()
                {
                    if (!postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                    {
                        postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);
                        clearInterval(lockCheck);

                        var unixTime = util.time();

                        postHelpers.saveDraft(metadata, tags, featuredImg, unixTime, parameters.editorData, function(err, result)
                        {
                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                            if (err) return cb(err);

                            if (result.status == 'alreadySaved')
                            {
                                cb(null, {
                                    noAutosave: true //just meant to clear the autosave
                                });
                            }
                            else if (result.status == 'saved')
                            {
                                cb(null, {
                                    msg: 'Draft Saved',
                                    wasSaved: true,
                                    publishPanel: (result.publishPanel) ? result.publishPanel : {}
                                });

                            }
                            else
                            {
                                cb(null);
                            }

                        });

                    }

                }, 10);

            }
            else if (parameters.mode == 'publishPost')
            {
                var doubleUnlock = function(newPermlink)
                {
                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                    postHelpers.opUnlock(parameters.editorData.author, newPermlink);
                };

                var blockchainPostedSuccess = function(newPermlink)
                {
                    global.db.run("UPDATE posts SET status = 'published', permlink = ? WHERE author = ? AND permlink = ?", [newPermlink, parameters.editorData.author, parameters.editorData.permlink], function(err)
                    {
                        if (err)
                        {
                            console.log(err);
                            doubleUnlock(newPermlink);
                            cb(null, {
                                errHome: true
                            });
                        }
                        else
                        {
                            var newAuthperm = [parameters.editorData.author, newPermlink].join('.');

                            global.db.run("UPDATE revisions SET permlink = ?, authperm = ? WHERE author = ? AND permlink = ?", [
                                newPermlink,
                                newAuthperm,
                                parameters.editorData.author,
                                parameters.editorData.permlink
                            ], function(err)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    doubleUnlock(newPermlink);
                                    cb(null, {
                                        errHome: true
                                    });
                                }
                                else
                                {

                                    cb(null, {
                                        reloadView: true,
                                        author: parameters.editorData.author,
                                        newPermlink: newPermlink
                                    });

                                }

                            });

                        }

                    });

                };

                lockCheck = setInterval(function()
                {
                    if (!postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                    {
                        postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);
                        clearInterval(lockCheck);

                        var unixTime = util.time();

                        //check if account can be used
                        accountHelpers.useAccount(parameters.editorData.author, ['posting'], function(err, accountStatus, accountLogin)
                        {
                            if (err)
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                cb(err);
                            }
                            else if (accountStatus == 'good')
                            {
                                //validate title, body and tags
                                var postCheckErrMsg = editorUtility.validate.savePostCheck(parameters.editorData, tags);

                                if (postCheckErrMsg)
                                {
                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                    cb(null, {
                                        msg: postCheckErrMsg
                                    });
                                }
                                else
                                {
                                    postHelpers.saveDraft(metadata, tags, featuredImg, unixTime, parameters.editorData, function(err, saveDraftResult)
                                    {
                                        if (err)
                                        {
                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                            cb(err);
                                        }
                                        else
                                        {
                                            postHelpers.validatePostDate(parameters.editorData.author, parameters.editorData.permlink, unixTime, function(err, count)
                                            {
                                                if (err)
                                                {
                                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                    cb(err);
                                                }
                                                else if (count > 0)
                                                {
                                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                    cb(null, {
                                                        msg: 'Another post was posted or scheduled within -/+ 5 mins minutes of now'
                                                    });
                                                }
                                                else
                                                {
                                                    var oldPermlink = parameters.editorData.permlink;

                                                    module.exports.createMainPermlink({
                                                        author: parameters.editorData.author,
                                                        title: parameters.editorData.title
                                                    }, function(err, createPermLinkResult)
                                                    {
                                                        if (err)
                                                        {
                                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                            cb(err);
                                                        }
                                                        else
                                                        {
                                                            var newPermlink = createPermLinkResult.permlink;
                                                            postHelpers.opLock(parameters.editorData.author, newPermlink);

                                                            var revHash = saveDraftResult.revHash;

                                                            var parent_permlink = tags[0];
                                                            var comment_body = parameters.editorData.body;

                                                            var bcSentHash = postHelpers.generatebcSentHash(parameters.editorData.title, comment_body, metadata);

                                                            //set bcSentHash - update in case the draft was already saved before this was called elsewhere:
                                                            postHelpers.updateRevision(revHash, parameters.editorData.author, parameters.editorData.permlink, {
                                                                bcSentHash: bcSentHash
                                                            }, function(err)
                                                            {
                                                                if (err)
                                                                {
                                                                    doubleUnlock(newPermlink);
                                                                    cb(err);
                                                                }
                                                                else
                                                                {
                                                                    //post to blockchain
                                                                    var tx = new transactionBuilder();

                                                                    //comment data
                                                                    tx.add_type_operation('comment', {
                                                                        parent_author: '',
                                                                        parent_permlink: parent_permlink,
                                                                        author: parameters.editorData.author,
                                                                        permlink: newPermlink,
                                                                        title: parameters.editorData.title,
                                                                        body: comment_body,
                                                                        json_metadata: JSON.stringify(metadata)
                                                                    });

                                                                    //comment_options
                                                                    var comment_options = {
                                                                        author: parameters.editorData.author,
                                                                        permlink: newPermlink,
                                                                        max_accepted_payout: "1000000.000 SBD",
                                                                        percent_steem_dollars: 10000, // 10000 === 100%
                                                                        allow_votes: true,
                                                                        allow_curation_rewards: true,
                                                                        extensions: []
                                                                    };

                                                                    if (parameters.editorData.onPubPayoutType === 0)
                                                                    {
                                                                        comment_options.max_accepted_payout = '0.000 SBD';
                                                                    }
                                                                    else if (parameters.editorData.onPubPayoutType === 100)
                                                                    {
                                                                        comment_options.percent_steem_dollars = 0; //10000 === 100% (of 50%)
                                                                    }

                                                                    tx.add_type_operation('comment_options', comment_options);

                                                                    //vote
                                                                    if (parameters.editorData.onPubAutoVote)
                                                                    {
                                                                        tx.add_type_operation('vote', {
                                                                            voter: parameters.editorData.author,
                                                                            author: parameters.editorData.author,
                                                                            permlink: newPermlink,
                                                                            weight: 10000
                                                                        });

                                                                    }

                                                                    tx.process_transaction(accountLogin, null, true).then(function(res)
                                                                    {
                                                                        postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                                        steemUserWatcher.sync();
                                                                        blockchainPostedSuccess(newPermlink); //emulate a successful posting
                                                                    }).catch(function(err)
                                                                    {
                                                                        doubleUnlock(newPermlink);
                                                                        cb(err);
                                                                    });

                                                                }

                                                            });

                                                        }

                                                    });

                                                }

                                            });

                                        }

                                    });

                                }

                            }
                            else
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                var msgStr = accountHelpers.useAccountStatus2Text(accountStatus);

                                if (msgStr)
                                {
                                    cb(null, {
                                        msg: msgStr
                                    });

                                }
                                else
                                {
                                    cb(new Error('UseAccount Unknown Status - ' + accountStatus));
                                }

                            }

                        });

                    }

                }, 10);

            }
            else if (parameters.mode == 'updatePostPublished')
            {
                lockCheck = setInterval(function()
                {
                    if (!postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                    {
                        postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);
                        clearInterval(lockCheck);

                        var unixTime = util.time();

                        //check if account can be used
                        accountHelpers.useAccount(parameters.editorData.author, ['posting'], function(err, accountStatus, accountLogin)
                        {
                            if (err)
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                cb(err);
                            }
                            else if (accountStatus == 'good')
                            {
                                //validate title, body and tags
                                var postCheckErrMsg = editorUtility.validate.savePostCheck(parameters.editorData, tags);

                                if (postCheckErrMsg)
                                {
                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                    cb(null, {
                                        msg: postCheckErrMsg
                                    });
                                }
                                else
                                {
                                    //get post from blockchain
                                    module.exports.bcGetContent({
                                        author: parameters.editorData.author,
                                        permlink: parameters.editorData.permlink
                                    }, function(err, getContentResult)
                                    {
                                        var publishPanelData = {
                                            autosaveRevison: ''
                                        };

                                        if (err)
                                        {
                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                            cb(err);
                                        }
                                        else if (getContentResult.body.length > 0 && getContentResult.mode == 'archived') //is archived
                                        {
                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                            cb(null, {
                                                msg: 'This post is archived and can no longer be edited.'
                                            });

                                        }
                                        else if (postHelpers.comparePost(parameters.editorData, metadata, getContentResult)) //not archived, check if already saved to blockchain
                                        {
                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                            cb(null, {
                                                msg: 'Already Published This Version',
                                                publishPanel: publishPanelData
                                            });

                                        }
                                        else //Not Posted Already
                                        {
                                            postHelpers.saveDraft(metadata, tags, featuredImg, unixTime, parameters.editorData, function(err, saveDraftResult)
                                            {
                                                if (err)
                                                {
                                                    postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                    cb(err);
                                                }
                                                else
                                                {
                                                    var revHash = saveDraftResult.revHash;

                                                    var parent_permlink = tags[0];
                                                    var comment_body = parameters.editorData.body;

                                                    if (getContentResult.body.length > 0) //found post for that slug
                                                    {
                                                        parent_permlink = getContentResult.parent_permlink;
                                                        comment_body = util.createPatch(getContentResult.body, comment_body, true);
                                                    }

                                                    var bcSentHash = postHelpers.generatebcSentHash(parameters.editorData.title, comment_body, metadata);

                                                    //set bcSentHash - update in case the draft was already saved before this was called elsewhere:
                                                    postHelpers.updateRevision(revHash, parameters.editorData.author, parameters.editorData.permlink, {
                                                        bcSentHash: bcSentHash
                                                    }, function(err)
                                                    {
                                                        if (err)
                                                        {
                                                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                            cb(err);
                                                        }
                                                        else
                                                        {
                                                            var tx = new transactionBuilder();

                                                            tx.add_type_operation('comment', {
                                                                parent_author: '',
                                                                parent_permlink: parent_permlink,
                                                                author: parameters.editorData.author,
                                                                permlink: parameters.editorData.permlink,
                                                                title: parameters.editorData.title,
                                                                body: comment_body,
                                                                json_metadata: JSON.stringify(metadata)
                                                            });

                                                            tx.process_transaction(accountLogin, null, true).then(function(res)
                                                            {
                                                                publishPanelData.date = unixTime;

                                                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                                                steemUserWatcher.sync();

                                                                cb(null, {
                                                                    msg: 'Post Updated',
                                                                    wasSaved: true,
                                                                    publishPanel: publishPanelData
                                                                });

                                                            }).catch(function(err)
                                                            {
                                                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                                                cb(err);
                                                            });
                                                        }

                                                    });

                                                }

                                            });

                                        }

                                    });

                                }

                            }
                            else
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                                var msgStr = accountHelpers.useAccountStatus2Text(accountStatus);

                                if (msgStr)
                                {
                                    cb(null, {
                                        msg: msgStr
                                    });

                                }
                                else
                                {
                                    cb(new Error('UseAccount Unknown Status - ' + accountStatus));
                                }

                            }

                        });

                    }

                }, 10);

            }
            else
            {
                cb(new Error('Invalid mode'));
            }

        },
        getPostDefaultSettings: function(parameters, cb)
        {
            var lastSelectedEditor,
                lastSelectedPayoutPrecent,
                lastSelectedAutovotePref;

            async.parallel([
                function(callback)
                {
                    kvs.read({
                        k: 'lastSelectedEditor',
                    }, function(err, result)
                    {
                        if (err) return callback(err);

                        //no default saved, set to md
                        lastSelectedEditor = (result && typeof result == 'object') ? result.v : 'md';
                        callback();
                    });

                },
                function(callback)
                {
                    kvs.read({
                        k: 'lastSelectedPayoutPrecent'
                    }, function(err, result)
                    {
                        if (err) return callback(err);

                        lastSelectedPayoutPrecent = (result && typeof result == 'object') ? parseInt(result.v) : 50; //Default to (50% / 50%)
                        callback();
                    });

                },
                function(callback)
                {
                    kvs.read({
                        k: 'lastSelectedAutovotePref'
                    }, function(err, result)
                    {
                        if (err) return callback(err);

                        if (result && typeof result == 'object')
                        {
                            lastSelectedAutovotePref = (typeof result.v == 'string' && result.v == 'true') ? true : false;
                        }
                        else
                        {
                            lastSelectedAutovotePref = true; //default to true when no result
                        }

                        callback();
                    });
                }
            ], function(err, results)
            {
                if (err) return cb(err);

                cb(null, {
                    lastSelectedEditor: lastSelectedEditor,
                    lastSelectedPayoutPrecent: lastSelectedPayoutPrecent,
                    lastSelectedAutovotePref: lastSelectedAutovotePref
                });

            });

        },
        validateScheduledDate: function(parameters, cb)
        {
            //todo: check if post is in the future, then secondly check if time is before or after any other posts by 5 mins
            //todo: exclude the current post if editing a date
        }

    };

}());
