// This is demo Node.js file showing how to parse a .xls file in backend and save in database and flush memcached memory
// Some variables have named as anonymous for security reason

/* database operations

CREATE TABLE foodmenu ( teamId int, ts timestamp, food text, PRIMARY KEY ( teamId ) );
SELECT food FROM foodmenu WHERE teamid = 1234567;
DELETE FROM schedule where teamid = 1234567;

*/

var ax = require('backend-library');
var path = require('path');
var debug = require('debug')('metrics:cassandra');
var ca = require('../cassandra');
var _ = require('underscore');
var resources;
var boundary;
exports = module.exports;

var constants = require('../ConstantsFile'); // obtain global default setting file
var conf = constants.getFood(); // obtain food setting 
var updateConf = conf.update; 

var TEAM_ID = constants.team_id;
var menu = {};

// get food data api
exports.getFood = function(cassandraBoundary){
    return function(req, res){
	
		// declare memcached for caching
        var AXCache = require('../backend-library/cache.js');
        var cacheClient = new AXCache({
           'expirationTime' : 604800
        });

		// return cache if have otherwise obtain data from Cassandra
        cacheClient.get('food', function (error, data) {
            if(data){
                res.send(new ax.response(true, 'food.get', data));
            } 
            else {
                var query = " SELECT food FROM foodmenu WHERE teamid = "+TEAM_ID;
                var params = "";
                cassandraBoundary.client.execute(query, params, function(err, result) {
                    debug(JSON.stringify(result));
                    if (err){
                        debug(JSON.stringify(err, 4));
                        data = err.message;
                    }
                    else {
                        if (result.rows.length == 0)
                            data = 'null';
                        else
                            data = JSON.parse(result.rows[0].food);
                    }
                    cacheClient.set('food', data, function (err) {});
                    res.send(new ax.response(true, 'food.get', data));
                });
            }
        });
    }
}

// update food data api on server
exports.updateFood = function(cassandraBoundary) {
    return function(req, res){
        // init
        resources = res;
        boundary = cassandraBoundary;

        var filePath = path.join(__dirname, updateConf.file_path);

        // Step 1: load and parse file
        if(typeof require !== 'undefined')
            XLS = require('xlsjs');
        var workbook = XLS.readFile(filePath);
        var sheet_name_list = workbook.SheetNames;
        var sheet = workbook.Sheets[sheet_name_list[0]];

        var columns = sheet['!range'].e.c;
        var row = sheet['!range'].e.r;

		// a simple hashmap to record id of new data
		// may have duplicated data with same id
        var arr = [];

        // Step 2: parse food data to JSON structure 
        var listName;
		
		// create table thread from setting file
        for (var key in updateConf.menu_type){
            menu[updateConf.menu_type[key]] = {};
            _.each(updateConf.category, function(category){
                
                 menu[updateConf.menu_type[key]][category] = {};
            },  menu[updateConf.menu_type[key]]);
            
        };

        for (var key in updateConf.item_structure){
            if (updateConf.item_structure[key].length != undefined)
                listName = key;
        }

        // go through table file by row
        for (var i = 2; i < row+1; i++) {
            var currentItem = {};

            var currentPointer = 'A'; // xls table starts from A
            _.each(updateConf.item_list, function(item_attr){
                currentPointer = String.fromCharCode(currentPointer.charCodeAt()+1); // A, B, C ...
                var attr = sheet[currentPointer+''+i]? sheet[currentPointer+''+i].v:"";
                currentItem[item_attr] = attr;
            }, i);


            var currentMenuType = updateConf.menu_type[currentItem.menuType.toLowerCase()];
            var currentCategory = currentItem.category.toLowerCase();
            var newItem = {};
            var currentJSON = menu[currentMenuType][currentCategory];
            
            // find new data with new id
            if (arr.indexOf(currentItem.id) == -1) {
                arr[arr.length] = currentItem.id;
                var pairAttr = [];
                for (var key in updateConf.size_price){
                    pairAttr[pairAttr.length] = key;
                }

                for (var key in currentItem){
                    if (pairAttr.indexOf(key) == -1)
                        newItem[key] = currentItem[key];
                }
                currentJSON[currentItem.id] = newItem;
                currentJSON[currentItem.id][listName] = [];
            }

            // add pair under list element in <size, price> pair
            var pair = {};
            for (var key in updateConf.size_price){
                pair[key] = currentItem[key];
            }
            currentJSON[currentItem.id][listName].push(pair);
        }

        // Step 3: operate database
        saveData();
    }
}

function saveData(){
        // delete all data first
    var query          = "INSERT INTO foodmenu ( teamId, food,  ts) values ( ?, ?, ? )";
    var params         = [ { value : parseInt(TEAM_ID) , hint : 'int'} ,
                            { value : JSON.stringify(menu)  , hint : 'text'},
                            { value : new Date() , hint : 'timestamp' }];

    // delete duplicates
    var delquery       = "DELETE FROM foodmenu where teamid = "+TEAM_ID;
    boundary.client.execute(delquery, null, function(err, result) {
        debug(JSON.stringify(result));
        if(err) {
            debug(JSON.stringify(err, 4));
            resources.send(new ax.response(false, 'bad.query.delte', err.message));
        }

        // add new
        else{
            boundary.client.execute(query, params, function(err, result) {
                debug(JSON.stringify(result));
                if(err) {
                    debug(JSON.stringify(err, 4));
                    resources.send(new ax.response(false, 'bad.query.add', err.message));
                }
                else{
                    var AXCache = require('../node_modules/stax-backend/lib/boundaries/cache.js');
                    var cacheClient = new AXCache({'expirationTime' : 604800});
                    cacheClient.flush(function(){});
                    resources.send(new ax.response(true, 'food.saved'));
                }
            });
        }
    });
}