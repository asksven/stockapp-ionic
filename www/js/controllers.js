angular.module('stock-app.controllers', [])

.controller('AppCtrl', ['$scope', 'modalService', 'userService',
    function($scope, modalService, userService) {

        $scope.modalService = modalService;
        
        $scope.logout = function() {
            userService.logout();    
        };
}])

.controller('MyStocksCtrl', ['$scope', 'myStocksArrayService',
    'stockDataService', 'stockDataCacheService',
    function($scope, myStockArrayService, stockDataService) {

        $scope.myStocksArray = myStockArrayService;
        
                       
}])

.controller('StockCtrl', ['$scope', '$stateParams', '$ionicPopup', 'followStockService',
    'stockDataService', 'notesService', 'dateService', 'newsService',
    function($scope, $stateParams, $ionicPopup, $followStockService,
        $stockDataService, $notesService, $dateService, $newsService) {
        
        $scope.ticker = $stateParams.stockTicker;
        $scope.chartView = 1;
        $scope.following = $followStockService.checkFollowing($scope.ticker);

        $scope.stockNotes = [];        
        console.log($dateService.currentDate());
        console.log($dateService.oneYearAgoDate());
        
        $scope.$on("$ionicView.afterEnter", function() {
            getPriceData();
            getDetailsData();
            $scope.stockNotes = $notesService.getNotes($scope.ticker);
            getNews();
        })

        $scope.toggleFollow = function() {
            if ($scope.following == true) {
                $followStockService.unfollow($scope.ticker);
                $scope.following = false;
            }    
            else {
                $followStockService.follow($scope.ticker);
                $scope.following = true;
            }
        }
        
        $scope.openNote = function(index, title, body) {
            $scope.note = {'title': title, 'body': body, 'date': $dateService.currentDate(), 'ticker': $scope.ticker};
            var note = $ionicPopup.show({
                template: '<input type="text" ng-model="note.title" id="stock-note-title"/><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
                title: $scope.note.title,
                scope: $scope,
                buttons: [
                    {
                        text: 'Delete' ,
                        type: 'button-assertive button-small',
                        onTap: function(e) {
                            $notesService.deleteNote($scope.ticker, index);
                        }
                    },
                    {
                        text: 'Cancel' ,
                        type: 'button-small',
                        onTap: function(e) {
                            return;
                        }
                    },
                    {
                        text: '<b>Save</b>',
                        type: 'button-balanced button-small',
                        onTap: function(e) {
                            console.log("save:" + $scope.note.title);
                            $notesService.deleteNote($scope.ticker, $scope.note);
                            $notesService.addNote($scope.ticker, $scope.note);
                        }
                    }
                ]
            });

            note.then(function(res) {
                $scope.stockNotes = $notesService.getNotes($scope.ticker);
            });

        }    

        $scope.addNote = function() {
            $scope.note = {'title': 'Note', 'body': '', 'date': $dateService.currentDate(), 'ticker': $scope.ticker};

            var note = $ionicPopup.show({
                template: '<input type="text" ng-model="note.title" id="stock-note-title"/><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
                title: 'New Note for ' + $scope.ticker,
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel' ,
                        onTap: function(e) {
                            return;
                        }
                    },
                    {
                        text: '<b>Save</b>',
                        type: 'button-balanced',
                        onTap: function(e) {
                            console.log("save:" + $scope.note.title);
                            $notesService.addNote($scope.ticker, $scope.note);
                        }
                    }
                ]
            });

            note.then(function(res) {
                $scope.stockNotes = $notesService.getNotes($scope.ticker);
            });

        }    
        
        $scope.openWindow = function(link) {
            // TODO: install and setup in-app browser
            console.log("openWindow -> " + link);
        }
        
        function getPriceData() {
            var promise = $stockDataService.getPriceData($scope.ticker);
            
            promise.then(function(data) {
                $scope.stockPriceData = data;
                console.log(data);
            });            
        }
        
        function getDetailsData() {
            var promise = $stockDataService.getDetailsData($scope.ticker);
            
            promise.then(function(data) {
                $scope.stockDetailsData = data;
                console.log(data);
            });            
        }
        
        $scope.chartViewFunc = function(n) {
            $scope.chartView = n;
        }
        
        function getChartData() {

            var promise = chartDataService.getHistoricalData($scope.ticker, $scope.oneYearAgoDate, $scope.todayDate);

            promise.then(function(data) {

                $scope.myData = JSON.parse(data)
                    .map(function(series) {
                        series.values = series.values.map(function(d) { return {x: d[0], y: d[1] }; });
                        return series;
                    });
            });
        }

        function getNews() {
            $scope.newsStories = [];
            var promise = $newsService.getNews($scope.ticker);
            
            promise.then(function(data) {
                $scope.newsStories = data;
                console.log(data);
            });            
        }
        
        $scope.chartViewFunc = function(n) {
            $scope.chartView = n;
        }
        

}])


.controller('LoginSignupCtrl', ['$scope', 'modalService', 'userService',
    function($scope, modalService, userService) {

        $scope.user = {email: '', password: ''};
        
        $scope.closeModal = function() {
            modalService.closeModal();
        }
            
        $scope.signup = function(user) {
            userService.signup(user);    
        };
        
        $scope.login = function(user) {
            userService.login(user);    
        };

}])
    
.controller('SearchCtrl', ['$scope', '$state', 'modalService', 'searchService',
    function($scope, $state, modalService, searchService) {
        
        $scope.closeModal = function() {
            modalService.closeModal();
        }
        
        $scope.search = function() {
            $scope.searchResults = '';
            startSearch($scope.searchQuery);
        }
        var startSearch = ionic.debounce(function(query) {
            searchService.search(query)
                .then(function(data) {
                    $scope.searchResults = data;
                });
                
        }, 750);
        
        $scope.gotoStock = function (ticker) {
            modalService.closeModal();
            $state.go('app.stock' , {stockTicker: ticker});
        }
}])        

;
