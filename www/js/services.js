angular.module('stock-app.services', [])


.constant('FIREBASE_URL', 'https://asksven-stocksapp.firebaseIO.com')


.factory('encodeURIService', function () {
    return {
        encode: function(string) {
            return encodeURIComponent(string)
                .replace(/\"/g, "%22")
                .replace(/\ /g, "%20")
                .replace(/[!'()]/g, escape);
        }
    }    
    
})

.factory('dateService', function($filter) {
    var currentDate = function() {
        var d = new Date();
        var date = $filter('date')(d, 'yyyy-MM-dd');
        return date;    
    }

    var oneYearAgoDate = function() {
        var d = new Date(new Date().setDate(new Date().getDate() - 365));
        var date = $filter('date')(d, 'yyyy-MM-dd');
        return date;    
    }
    
    return {
        currentDate: currentDate,
        oneYearAgoDate: oneYearAgoDate
    }
    
})

.factory('firebaseRef', function($firebase, FIREBASE_URL) {
        
        var firebaseRef = new Firebase(FIREBASE_URL);
        
        return firebaseRef;
})

.factory('userService', function($rootScope, firebaseRef, modalService) {
    
    var login = function(user) {
        firebaseRef.authWithPassword({
                email    : user.email,
                password : user.password
            }, function(error, authData) {
                if (error) {
                console.log("Login Failed!", error);
            } else {
                $rootScope.currentUser = user;
                modalService.closeModal();
                console.log("Authenticated successfully with payload:", authData);
            }
        });
    }

    var signup = function(user) {
        firebaseRef.createUser({
            email: user.email,
            password: user.password
            }, function(error, userData) {
            if (error) {
                switch (error.code) {
                case "EMAIL_TAKEN":
                    console.log("The new user account cannot be created because the email is already in use.");
                    break;
                case "INVALID_EMAIL":
                    console.log("The specified email is not a valid email.");
                    break;
                default:
                    console.log("Error creating user:", error);
                }
            } else {
                login(user);
                console.log("Successfully created user account with uid:", user.email);
            }
        });        
    }
    
    var logout = function() {
        firebaseRef.unauth();
        $rootScope.currentUser = '';
    }

    var getUser = function() {
        return firebaseRef.getAuth();    
    };   
     
    if (getUser()) {
        $rootScope.currentUser = getUser();    
    } 
    
    return {
        login: login,
        signup: signup,
        logout: logout
    }

})

.factory('stockDataService', function($q, $http, encodeURIService,
    stockDataCacheService) {
    
    
    var getDetailsData = function(ticker) {
        
        var deferred = $q.defer(),
        query = 'select * from yahoo.finance.quotes where symbol in ("' + ticker + '")';
        url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

        var cacheKey = 'details-' + ticker;
        stockDataCache = stockDataCacheService.get(cacheKey);
        
        console.log('url=' + url);

        // retrieve from cache first
        if (stockDataCache) {
            console.log('Details data pulled from cache with key:' + cacheKey);
            deferred.resolve(stockDataCache);    
        }
        else {
            $http.get(url)

            .success(function(json) {
                console.log(json);
                var jsonData = json.query.results.quote;
                deferred.resolve(jsonData);
                console.log('Details data pulled from API for key: ' + cacheKey);
                stockDataCacheService.put(cacheKey, jsonData);
                
            })

            .error(function(error){
                console.log('Details data error: ' + error);
                deferred.reject();
            });
        }            
        return deferred.promise;
    };

    var getPriceData = function(ticker) {
        
        var deferred = $q.defer(),
        url = 'http://finance.yahoo.com/webservice/v1/symbols/' + ticker + '/quote?format=json&view=detail';

        var cacheKey = 'price-' + ticker;
        stockDataCache = stockDataCacheService.get(cacheKey);
        

        console.log('url=' + url);

        // retrieve from cache first
        if (stockDataCache) {
            console.log('Price data pulled from cache with key:' + cacheKey);
            deferred.resolve(stockDataCache);    
        }
        else {

            $http.get(url)

            .success(function(json) {
                console.log(json);
                var jsonData = json.list.resources[0].resource.fields;
                deferred.resolve(jsonData);
                console.log("Price-cache, adding " + jsonData);
                stockDataCacheService.put(cacheKey, jsonData);
            })

            .error(function(error){
                console.log('Price data error: ' + error);
                deferred.reject();
            });
        }        
        return deferred.promise;
    };
    
    return {
        getPriceData: getPriceData,
        getDetailsData: getDetailsData
    };
})

.factory('stockDataCacheService', function(CacheFactory) {
    
    var cache;
    cacheName = 'stockImageCache';
    
    if (!CacheFactory.get(cacheName)) {
        
        cache = CacheFactory(cacheName, {
            maxAge: 60 * 60 * 8 * 1000,
            deleteOnExpire: 'aggressive',
            storageMode: 'localStorage'
        });
    }
    else {
        cache = CacheFactory.get(cacheName);
    }
    
    return cache;
    
})


.factory('notesCacheService', function(CacheFactory) {
    
    var cache;
    cacheName = 'notesCache';
    
    if (!CacheFactory.get(cacheName)) {
        
        cache = CacheFactory(cacheName, {
            maxAge: 60 * 60 * 8 * 1000,
            deleteOnExpire: 'aggressive',
            storageMode: 'localStorage'
        });
    }
    else {
        cache = CacheFactory.get(cacheName);
    }
    
    return cache;
    
})

.factory('notesService', function(notesCacheService) {
    
    return {
        getNotes: function(ticker) {
            return notesCacheService.get(ticker);        
        },
        
        addNote: function(ticker, note) {
            
            var stockNotes = [];
            
            if (notesCacheService.get(ticker))
            {
                stockNotes = notesCacheService.get(ticker);
                stockNotes.push(note);
            }
            else
            {
                stockNotes.push(note);
            }
            
            notesCacheService.put(ticker, stockNotes);    
            
        },
        
        deleteNote: function(ticker, index) {
            var stockNotes = [];
            
            stockNotes = notesCacheService.get(ticker);
            console.log("Cache:" + stockNotes);
            stockNotes.splice(index, 1);
            console.log("Cache after delete:" + stockNotes);
            notesCacheService.put(ticker, stockNotes);
            
        }
    }
})

.factory('newsService', function($q, $http) {
    
    return {
        getNews: function(ticker) {
            var deferred = $q.defer(),
            url = 'http://finance.yahoo.com/rss/headline?s=' + ticker;
            
            x2js = new X2JS();
            
            $http.get(url)

                .success(function(xml) {
                    var xmlDoc = x2js.parseXmlString(xml),
                    json = x2js.xml2json(xmlDoc),
                    jsonData = json.rss.channel.item;
                    
                    
                    deferred.resolve(jsonData);
                })

                .error(function(error){
                    console.log('News error: ' + error);
                    deferred.reject();
                });
                
                return deferred.promise;
        }        

    }
})

.factory('fillMyStocksCacheService', function(CacheFactory) {
    var myCache;
    cacheName = 'myStocksCache';
    
    if (!CacheFactory.get(cacheName)) {
        myCache = CacheFactory(cacheName, {
            storageMode: 'localStorage'
        });
         
    }
    else {
        myCache = CacheFactory.get(cacheName);
    }
    
    var fillMyCache = function() {
        var myStocksArray = [
           {ticker: "AAPL"},
           {ticker: "GPRO"},
           {ticker: "FB"},
           {ticker: "NFLX"},
           {ticker: "TSLA"},
           {ticker: "BRK-A"},
           {ticker: "MSFT"},
           {ticker: "BAC"},
           {ticker: "C"},
           {ticker: "T"}
       ];
       
       myCache.put(cacheName, myStocksArray);
    };
    
    return {
        fillMyCache: fillMyCache 
    }
    
})

.factory('myStocksCacheService', function(CacheFactory) {
    
    var cache = CacheFactory.get('myStocksCache');
    
    return cache;
    
})

.factory('myStocksArrayService', function(fillMyStocksCacheService, myStocksCacheService) {

    if (!myStocksCacheService.info('myStocksCache')) {
        fillMyStocksCacheService.fillMyCache();
    }
    
    var myStocks = myStocksCacheService.get('myStocksCache');
    
    return myStocks;    
})

.factory('followStockService', function(myStocksArrayService, myStocksCacheService) {
    
    return {
        follow: function(ticker) {
            var stockToAdd = {"ticker": ticker};
            myStocksArrayService.push(stockToAdd);
            myStocksCacheService.put('myStocksCache', myStocksArrayService);
        },
        
        unfollow: function(ticker) {
            for (var i = 0; i < myStocksArrayService.length; i++) {
                if (myStocksArrayService[i].ticker == ticker) {
                    console.log("unfollowing " + ticker);
                    myStocksArrayService.splice(i, 1);
                    myStocksCacheService.remove('myStocksCache');
                    myStocksCacheService.put('myStocksCache', myStocksArrayService);
                    
                    break;
                }
            }
            
        },
        
        checkFollowing: function(ticker) {
            for (var i = 0; i < myStocksArrayService.length; i++) {
                if (myStocksArrayService[i].ticker == ticker) {
                    console.log("found " + ticker);
                    return true;
                }
            }
            
            // nothing found
            console.log("did not find " + ticker);
            return false;
        }
        
    }
})

.factory('searchService', function($q, $http) {
    return {
        search: function(query) {
            var deferred = $q.defer(),
            url='http://s.yimg.com/aq/autoc?query=' 
                + query 
                + '&region=CA&lang=en-CA&callback=YAHOO.util.ScriptNodeDataSource.callbacks';
            YAHOO = window.YAHOO = {
                util:{
                    ScriptNodeDataSource: {}
                }
            };
            
            YAHOO.util.ScriptNodeDataSource.callbacks = function(data) {
                var jsonData = data.ResultSet.Result;
                deferred.resolve(jsonData);
                
            };
            
            $http.jsonp(url)
                .then(YAHOO.util.ScriptNodeDataSource.callbacks);
                
            return deferred.promise;    
            
        }
    }
})

.service('modalService', function($ionicModal) {
    this.openModal = function(id) {
        
        var _this = this;
        
        if (id == 1) {        
            $ionicModal.fromTemplateUrl('templates/search.html', {
                scope: null,
                controller: 'SearchCtrl'
            }).then(function(modal) {
                _this.modal = modal;
                _this.modal.show();
            });
        }
        else if (id == 2) {
            $ionicModal.fromTemplateUrl('templates/login.html', {
                scope: null,
                controller: 'LoginSignupCtrl'
            }).then(function(modal) {
                _this.modal = modal;
                _this.modal.show();
            });
        }
        else if (id == 3) {
            $ionicModal.fromTemplateUrl('templates/signup.html', {
                scope: null,
                controller: 'LoginSignupCtrl'
            }).then(function(modal) {
                _this.modal = modal;
                _this.modal.show();
            });
        }
    }
    
    this.closeModal = function() {
        var _this = this;
        
        if (!_this.modal) returning;
        _this.modal.hide();
        _this.modal.remove();
    }
    
})



;