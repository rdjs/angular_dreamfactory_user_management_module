'use strict';


angular.module('dfUserManagement', ['ngRoute', 'ngCookies'])
    .constant('MODUSRMNGR_ROUTER_PATH', '/user-management')
    .constant('MODUSRMNGR_ASSET_PATH', 'bower_components/dreamfactory-user-management/')
    .config(['$routeProvider', 'MODUSRMNGR_ROUTER_PATH', 'MODUSRMNGR_ASSET_PATH',
        function ($routeProvider, MODUSRMNGR_ROUTER_PATH, MODUSRMNGR_ASSET_PATH) {

            $routeProvider
                .when(MODUSRMNGR_ROUTER_PATH, {
                    templateUrl: MODUSRMNGR_ASSET_PATH + 'views/main.html'
                });
        }])
    .run(['$cookieStore', 'UserDataService', function ($cookieStore, UserDataService) {

        // Let us know what the module is up to
        //console.log('RUN BLOCK: Check for and set current user');

        // Check if there is a CurrentUserObj in the cookie
        if ($cookieStore.get('CurrentUserObj')) {

            // There is so store it for a sec
            UserDataService.setCurrentUser($cookieStore.get('CurrentUserObj'));
        }
    }])
    .controller('UserManagementCtrl', ['$scope', function ($scope) {


    }])
    .directive('modusrmngrNavigation', ['MODUSRMNGR_ASSET_PATH',
        function (MODUSRMNGR_ASSET_PATH) {

            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/navigation.html',
                link: function (scope, elem, attrs) {

                }
            }
        }])
    .directive('dreamfactoryUserLogin', ['MODUSRMNGR_ASSET_PATH', 'DSP_URL', '$http', '$cookies', '$cookieStore', 'UserEventsService', 'UserDataService',
        function (MODUSRMNGR_ASSET_PATH, DSP_URL, $http, $cookies, $cookieStore, UserEventsService, UserDataService) {

            return {

                restrict: 'E',
                scope: {},
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/login.html',
                link: function (scope, elem, attrs) {


                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.login;

                    // PUBLIC API
                    scope.login = function (credsDataObj) {

                        scope._login(credsDataObj);
                    };

                    // PRIVATE API
                    scope._loginRequest = function (credsDataObj) {

                        return $http.post(DSP_URL + '/rest/user/session', credsDataObj);
                    };

                    scope._setSessionToken = function (sessionDataObj) {

                        $cookies.PHPSESSID = sessionDataObj.session_id;
                    };

                    scope._setCurrentUser = function (sessionDataObj) {

                        $cookieStore.put('CurrentUserObj', sessionDataObj)
                    };

                    scope._setCookies = function (sessionDataObj) {

                        $cookies.PHPSESSID = $cookies.PHPSESSID === sessionDataObj.session_id ? $cookies.PHPSESSID : sessionDataObj.session_id;
                        scope._setCurrentUser(sessionDataObj);
                    };

                    // COMPLEX IMPLEMENTATION
                    scope._login = function (credsDataObj) {

                        scope._loginRequest(credsDataObj).then(
                            function (result) {

                                delete result.data.no_group_apps;
                                delete result.data.app_groups;

                                scope._setCookies(result.data);
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.PHPSESSID;
                                UserDataService.setCurrentUser(result.data);
                                scope.$emit(scope.es.loginSuccess, result.data);
                            },
                            function (reject) {

                                throw {
                                    module: 'DreamFactory User Management',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: reject
                                }
                            }
                        )
                    };

                    // WATCHERS AND INIT

                    // HANDLE MESSAGES
                    scope.$on(scope.es.loginRequest, function (e, userDataObj) {

                        scope._login(userDataObj);
                    });
                }
            }
        }])
    .directive('dreamfactoryUserLogout', ['DSP_URL', '$http', '$cookieStore', 'UserEventsService', 'UserDataService',
        function (DSP_URL, $http, $cookieStore, UserEventsService, UserDataService) {
            return {

                restrict: 'E',
                scope: {},
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.logout;

                    // PUBLIC API

                    // PRIVATE API
                    scope._logoutRequest = function () {

                        return $http.delete(DSP_URL + '/rest/user/session');
                    };

                    // COMPLEX IMPLEMENTATION
                    scope._logout = function () {
                        scope._logoutRequest().then(
                            function () {

                                $cookieStore.remove('PHPSESSID');
                                $cookieStore.remove('CurrentUserObj');
                                UserDataService.unsetCurrentUser();
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = '';
                                scope.$emit(scope.es.logoutSuccess, false);
                            },
                            function (reject) {
                                throw {
                                    module: 'DreamFactory User Management',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: reject
                                }
                            })
                    };

                    // WATCHERS AND INIT

                    // HANDLE MESSAGES
                    scope.$on(scope.es.logoutRequest, function (e) {

                       scope._logout();
                    });

                    // CALL METHOD ON INVOKE
                    scope._logout();
                }
            }
        }])
    .directive('dreamfactoryRegisterUser', ['MODUSRMNGR_ASSET_PATH', 'DSP_URL', '$http', 'UserEventsService',
        function (MODUSRMNGR_ASSET_PATH, DSP_URL, $http, UserEventsService) {

            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/register.html',
                scope: {
                    options: '='
                },
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.register;

                    // PUBLIC VARS
                    scope.options = scope.options || null;


                    // PUBLIC API
                    scope.register = function (registerDataObj) {

                        // Call complex implementation
                        scope._register(registerDataObj);
                    };


                    // PRIVATE API

                    // Registers a user via REST API
                    scope._registerRequest = function (registerDataObj) {

                        return $http.post(DSP_URL + '/rest/user/register', registerDataObj);
                    };

                    // Returns the system configuration object
                    scope._getSystemConfig = function () {

                        return $http.get(DSP_URL + '/rest/system/config');
                    };


                    // COMPLEX IMPLEMENTATION
                    scope._register = function (registerDataObj) {

                        // Store our implementation of registering a user
                        scope._runRegister = function (registerDataObj) {

                            // Pass registerDataObj to scope._registerRequest function and
                            // then handle the response
                            scope._registerRequest(registerDataObj).then(

                                // success
                                function (result) {

                                    // The scope.options.confirmationRequired value should be set to
                                    // the value of the System Config's open_reg_email_service_id value.
                                    // This let's us know if the admin has required email confirmation for the
                                    // system.  Null means no confirmation required.

                                    // Do we need confirmation
                                    if (scope.options.confirmationRequired == null) {

                                        // No we don't.  Send the success event and the registered user data
                                        scope.$emit(scope.es.registerSuccess, result.data)
                                    } else {

                                        // We do require confirmation so Send the confirmation event and the user data
                                        scope.$emit(scope.es.registerConfirmation, result.data);
                                    }
                                },

                                // error
                                function (reject) {

                                    // Throw an error
                                    throw {
                                        module: 'DreamFactory User Management',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                });
                        };



                        // Check if we have passed in an options object
                        // This usually denotes whether we have previously retrieved
                        // the SystemConfig Object or not.
                        // If we have a SystemConfig and we have passed in the proper value(see scope.options explanation above)
                        // then we don't waste a call to the system.
                        // If we have not then we need to know this about the system.
                        if (scope.options == null || scope.options == 'undefined') {

                            // We did not pass in a usable options object
                            // Ask the server for the config
                            scope._getSystemConfig().then(

                                // success
                                function(result) {

                                    // store the config object
                                    var systemConfigDataObj = result.data;

                                    // Set the options object to the proper values
                                    scope.options = {

                                        // The success method of scope._registerRequest function looks
                                        // for this property to determine which message to emit back up to
                                        // the application.  If this value is null the scope._registerRequest will emit a
                                        // 'user:register:success' method indicating that we are done registering
                                        // the user.  If it contains a value (denoting that an email service has been selected)
                                        // We emit a 'user:register:confirmation' message.  How you handle these messages is left
                                        // up to you.  We just notify you of the current state and the actions that have been taken as
                                        // a result of your config.
                                        confirmationRequired: systemConfigDataObj.open_reg_email_service_id
                                    };

                                    // Now that we have all the info we need, lets run the
                                    // register routine
                                    scope._runRegister(registerDataObj);

                                },

                                // There was an error retrieving the config
                                function(reject) {

                                    // Throw an error
                                    throw {
                                        module: 'DreamFactory User Management',
                                        type: 'error',
                                        provider: 'dreamfactory',
                                        exception: reject
                                    }
                                }
                            )
                        }
                        else {

                            // We were passed an options object
                            // Run the register routine
                            scope._runRegister(registerDataObj);
                        }
                    };


                    // WATCHERS AND INIT


                    // HANDLE MESSAGES
                    // We received a message to register a user.
                    scope.$on(scope.es.registerRequest, function(e, registerDataObj) {

                        // register the user
                        scope._register(registerDataObj);
                    });

                }
            }

        }])
    .service('UserEventsService', [function () {

        return {
            login: {
                loginRequest: 'user:login:request',
                loginSuccess: 'user:login:success',
                loginError: 'user:login:error'
            },
            logout: {
                logoutRequest: 'user:logout:request',
                logoutSuccess: 'user:logout:success',
                logoutError: 'user:logout:error'

            },
            register: {
                registerRequest: 'user:register:request',
                registerSuccess: 'user:register:success',
                registerError: 'user:register:error',
                registerConfirmation: 'user:register:confirmation'
            }
        }
    }])
    .service('UserDataService', [function () {

        var currentUser = false;


        function _getCurrentUser() {

            return currentUser;
        }

        function _setCurrentUser(userDataObj) {

            currentUser = userDataObj;
        }

        function _unsetCurrentUser() {

            currentUser = false;
        }

        function _hasUser() {

            return !!currentUser;
        }


        return {

            getCurrentUser: function () {

                return _getCurrentUser();
            },

            setCurrentUser: function (userDataObj) {

                _setCurrentUser(userDataObj);
            },

            unsetCurrentUser: function () {

                _unsetCurrentUser();
            },

            hasUser: function () {

                return _hasUser();
            }
        }
    }]);




