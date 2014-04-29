'use strict';

// Module definition and dependencies
angular.module('dfUserManagement', ['ngRoute', 'ngCookies'])

    // Set constants for path resolution.
    .constant('MODUSRMNGR_ROUTER_PATH', '/user-management')
    .constant('MODUSRMNGR_ASSET_PATH', 'bower_components/dreamfactory-user-management/')

    // Define a router to handle module routes.  None used here
    .config(['$routeProvider', 'MODUSRMNGR_ROUTER_PATH', 'MODUSRMNGR_ASSET_PATH',
        function ($routeProvider, MODUSRMNGR_ROUTER_PATH, MODUSRMNGR_ASSET_PATH) {

            $routeProvider
                .when(MODUSRMNGR_ROUTER_PATH, {
                    templateUrl: MODUSRMNGR_ASSET_PATH + 'views/main.html'
                });
        }])
    .run(['$cookieStore', '$http', 'UserDataService', function ($cookieStore, $http, UserDataService) {

        // Let us know what the module is up to
        //console.log('RUN BLOCK: Check for and set current user');

        var cookie = $cookieStore.get('CurrentUserObj')

        // Check if there is a CurrentUserObj in the cookie
        if (cookie) {

            // There is so store it for a sec
            UserDataService.setCurrentUser($cookieStore.get('CurrentUserObj'));

            $http.defaults.headers.common['X-DreamFactory-Session-Token'] = cookie.session_id;

        }
    }])
    // Part of the DreamFactory Angular module definition.  We don't use this yet.
    // Future versions will also include directives/templates for editing current user profile
    // and password stuff to complete the module.
    .controller('UserManagementCtrl', ['$scope', function ($scope) {}])

    // Part of the DreamFactory Angular module definition.  We don't use this yet.
    // Future versions will require this as a nav component to move between sections of the
    // module for editing user profile/password information
    .directive('modusrmngrNavigation', ['MODUSRMNGR_ASSET_PATH',
        function (MODUSRMNGR_ASSET_PATH) {

            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/navigation.html',
                link: function (scope, elem, attrs) {

                }
            }
        }])
    // Directive for Login.  This is does our login work and provides the attachment point for
    // the login portion of our module.
    .directive('dreamfactoryUserLogin', ['MODUSRMNGR_ASSET_PATH', 'DSP_URL', '$http', '$cookies', '$cookieStore', 'UserEventsService', 'UserDataService',
        function (MODUSRMNGR_ASSET_PATH, DSP_URL, $http, $cookies, $cookieStore, UserEventsService, UserDataService) {

            return {

                // only allow as HTML tag
                restrict: 'E',

                // isolate scope
                scope: {

                    // define optional options attribute
                    options: '=?'
                },

                // template path
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/login.html',

                // link it up
                link: function (scope, elem, attrs) {


                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.login;

                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.  This is currently the only option
                    scope.options = scope.options || {showTemplate: true};

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    // PUBLIC API
                    // The public api section contains any functions that we wish to call
                    // in our HTML templates.  Functions placed here should be the only
                    // functions that are 'accessible' or called through our HTML template.
                    // The only logic that should ever be included is logic pertaining to whether
                    // or not we should run the complex implementation.  Things like using a confirm
                    // function to decide whether a record should be deleted or not go here.

                    // This is the function we call in the UI for login.
                    scope.login = function (credsDataObj) {

                        // This calls our complex implementation of login()
                        scope._login(credsDataObj);
                    };

                    // PRIVATE API
                    // The private api section contains functions that do most of our heavy lifting
                    // Although they are on the $scope(scope) of the directive we never call these
                    // from the HTML templates.  They are meant to be called from the 'Complex Implementation'
                    // section below.

                    // POST to the DreamFactory(DF) rest api to login
                    scope._loginRequest = function (credsDataObj) {

                        // Return the posted request data as a promise
                        return $http.post(DSP_URL + '/rest/user/session', credsDataObj);
                    };

                    // Set the session token
                    scope._setSessionToken = function (sessionDataObj) {

                        // Set the session id from a passed in session data object
                        // as a cookie
                        $cookies.PHPSESSID = sessionDataObj.session_id;
                    };

                    // Store the logged in user
                    scope._setCurrentUser = function (sessionDataObj) {

                        // Stores the logged in user in a cookie
                        $cookieStore.put('CurrentUserObj', sessionDataObj)
                    };

                    // Call our cookie setting functions
                    scope._setCookies = function (sessionDataObj) {

                        // Check if the session id has been updated.  If so use that to set the cookie
                        // If it hasn't just use the old session id
                        $cookies.PHPSESSID = $cookies.PHPSESSID === sessionDataObj.session_id ? $cookies.PHPSESSID : sessionDataObj.session_id;

                        // call set current user with the session data obj
                        scope._setCurrentUser(sessionDataObj);
                    };

                    // COMPLEX IMPLEMENTATION
                    // The complex implementation section is where our Private Api is called to action.
                    // This is where the magic happens for our public api.  Generally, these functions relate
                    // directly with our Public Api and are denoted as so with an underscore preceding the
                    // function name.

                    // Run login implementation
                    scope._login = function (credsDataObj) {

                        // call private login request function with a credentials object
                        scope._loginRequest(credsDataObj).then(

                            // success method
                            function (result) {

                                // remove unnecessary apps data
                                // this is temporary and cleans up our
                                // session obj that is returned by the login function
                                delete result.data.no_group_apps;
                                delete result.data.app_groups;

                                // Set the cookies
                                scope._setCookies(result.data);

                                // Set the DreamFactory session header
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = $cookies.PHPSESSID;

                                // Set the current user in the UserDataService service
                                UserDataService.setCurrentUser(result.data);

                                // Emit a success message so we can hook in
                                scope.$emit(scope.es.loginSuccess, result.data);
                            },

                            // Error method
                            function (reject) {

                                // Throw a DreamFactory error object
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
                    // We define any watchers or init code that needs to be run here.

                    // HANDLE MESSAGES
                    // We handle messages passed to our directive here.  Most commonly this will
                    // serve as a way to invoke directive functionality without the need to call
                    // the public api function directly

                    // Invoke the complex implementation for _login().  This requires you
                    // to pass the proper creds object
                    scope.$on(scope.es.loginRequest, function (e, userDataObj) {

                        // Call the complex implementation to handle the login request
                        scope._login(userDataObj);
                    });
                }
            }
        }])

    // Logout Directive
    .directive('dreamfactoryUserLogout', ['DSP_URL', '$http', '$cookieStore', 'UserEventsService', 'UserDataService',
        function (DSP_URL, $http, $cookieStore, UserEventsService, UserDataService) {
            return {

                restrict: 'E',
                scope: {},
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.logout;

                    // PUBLIC API ** See login directive for more info **
                    // No methods defined here.


                    // PRIVATE API ** See login directive for more info **

                    // DELETE request for logging out user
                    scope._logoutRequest = function () {

                        // return a promise object from the rest call
                        return $http.delete(DSP_URL + '/rest/user/session');
                    };

                    // COMPLEX IMPLEMENTATION ** See login directive for more info **

                    scope._logout = function () {

                        // Call to server for logout request
                        scope._logoutRequest().then(

                            // success method
                            function () {

                                // remove session cookie
                                $cookieStore.remove('PHPSESSID');

                                // remove current user cookie
                                $cookieStore.remove('CurrentUserObj');

                                // remove user from UserDataService
                                UserDataService.unsetCurrentUser();

                                // Unset DreamFactory header
                                $http.defaults.headers.common['X-DreamFactory-Session-Token'] = '';

                                // Emit success message so we can hook in
                                scope.$emit(scope.es.logoutSuccess, false);
                            },

                            // Error method
                            function (reject) {

                                // Throw DreamFactory error object
                                throw {
                                    module: 'DreamFactory User Management',
                                    type: 'error',
                                    provider: 'dreamfactory',
                                    exception: reject
                                }
                            })
                    };

                    // WATCHERS AND INIT ** See login directive for more info **
                    // No watchers defined

                    // HANDLE MESSAGES ** See login directive for more info **

                    // Handle logout request message from application
                    scope.$on(scope.es.logoutRequest, function (e) {

                        // call complex implementation of logout
                        scope._logout();
                    });

                    // CALL METHOD ON INVOKE
                    // If we include our logout directive in a template this will automatically
                    // run when we hit the route and subsequently log us out.
                    scope._logout();
                }
            }
        }])

    // Register Directive.  Takes care of registering a user for our application
    .directive('dreamfactoryRegisterUser', ['MODUSRMNGR_ASSET_PATH', 'DSP_URL', '$http', '$rootScope', 'UserEventsService',
        function (MODUSRMNGR_ASSET_PATH, DSP_URL, $http, $rootScope, UserEventsService) {

            return {
                restrict: 'E',
                templateUrl: MODUSRMNGR_ASSET_PATH + 'views/register.html',
                scope: {
                    options: '=?'
                },
                link: function (scope, elem, attrs) {

                    // CREATE SHORT NAMES
                    scope.es = UserEventsService.register;

                    // PUBLIC VARS
                    // This holds our options object.  If we don't provide an options object
                    // it defaults to showing the template.  It also defines a confirmationRequired attribute
                    // which can be set at the time of instantiation.  If it's not set then it will default
                    // to the DSP settings.
                    scope.options = scope.options || {showTemplate: true, confirmationRequired: null};

                    // This is included on the top level tag of our directive template and
                    // controls whether the template is rendered or not.
                    scope.showTemplate = scope.options.showTemplate;

                    // PUBLIC API ** See login directive for more info **

                    // Public register function used in our HTML template
                    scope.register = function (registerDataObj) {

                        // Call complex implementation
                        scope._register(registerDataObj);
                    };


                    // PRIVATE API ** See login directive for more info **

                    // Registers a user via REST API
                    scope._registerRequest = function (registerDataObj) {

                        return $http.post(DSP_URL + '/rest/user/register', registerDataObj);
                    };

                    // Returns the system configuration object
                    scope._getSystemConfig = function () {

                        return $http.get(DSP_URL + '/rest/system/config');
                    };


                    // COMPLEX IMPLEMENTATION ** See login directive for more info **
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

                                        // Build a login object
                                        var userCredsObj = {
                                            email: registerDataObj.email,
                                            password: registerDataObj.new_password
                                        };

                                        // No we don't.  Send the success event and the registered user data
                                        scope.$emit(scope.es.registerSuccess, userCredsObj);

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
                        if (scope.options.confirmationRequired == null) {

                            // We did not pass in a usable options object
                            // Ask the server for the config
                            scope._getSystemConfig().then(

                                // success
                                function(result) {

                                    // store the config object
                                    var systemConfigDataObj = result.data;


                                    // Set the options object to the proper values
                                    // The success method of scope._registerRequest function looks
                                    // for this property to determine which message to emit back up to
                                    // the application.  If this value is null the scope._registerRequest will emit a
                                    // 'user:register:success' method indicating that we are done registering
                                    // the user.  If it contains a value (denoting that an email service has been selected)
                                    // We emit a 'user:register:confirmation' message.  How you handle these messages is left
                                    // up to you.  We just notify you of the current state and the actions that have been taken as
                                    // a result of your config.
                                    scope.options.confirmationRequired = systemConfigDataObj.open_reg_email_service_id



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


                    // WATCHERS AND INIT ** See login directive for more info **


                    // HANDLE MESSAGES ** See login directive for more info **
                    // We received a message to register a user.
                    scope.$on(scope.es.registerRequest, function(e, registerDataObj) {

                        // register the user
                        scope._register(registerDataObj);
                    });

                }
            }

        }])

    // This service gives us a way to pass namespaced events around our application
    // We inject this service in order to request and respond to different module events.
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

    // This service gives us access to the current user.  While it's pretty sparse
    // at the moment it does give us access to critical user/session data.  Inject this
    // service where ever you need to access the current user.
    .service('UserDataService', [function () {

        // Stored user.
        var currentUser = false;


        // Private methods
        // return current user
        function _getCurrentUser() {

            return currentUser;
        }

        // set the current user
        function _setCurrentUser(userDataObj) {

            currentUser = userDataObj;
        }

        // remove/unset current user
        function _unsetCurrentUser() {

            currentUser = false;
        }

        // check if we have a user
        function _hasUser() {

            return !!currentUser;
        }


        return {

            // Public methods
            // These can be called via UserDataService.METHOD_NAME

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