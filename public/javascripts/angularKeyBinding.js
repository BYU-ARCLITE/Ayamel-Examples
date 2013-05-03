/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/3/13
 * Time: 9:52 AM
 * To change this template use File | Settings | File Templates.
 */
angular.module('keys', [])
    .directive("keyBinding", function(injectables) {
        return function(scope, element, attrs) {
            alert("hi");
            element.val("Hello");

        }
    });