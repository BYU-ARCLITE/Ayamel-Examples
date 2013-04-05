/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/5/13
 * Time: 11:42 AM
 * To change this template use File | Settings | File Templates.
 */
var OAuthSigner = (function() {
    return {
        sign: function sign(key, method, url, parameters) {
            var accessor = {
                consumerSecret: key[1],
                tokenSecret: ""
            };
            var message = {
                method: method,
                action: url,
                parameters: parameters
            };
            var realm = url.substr(0, url.indexOf("/", "8"));

            // Add OAuth stuffs
            var timestamp = OAuth.timestamp();
            var nonce = OAuth.nonce(11);
//            console.log("Timestamp: " + timestamp);
//            console.log("Nonce: " + nonce);
            message.parameters.push(["oauth_consumer_key", key[0]]);
            message.parameters.push(["oauth_timestamp", timestamp]);
            message.parameters.push(["oauth_nonce", nonce]);
            message.parameters.push(["oauth_signature_method", "HMAC-SHA1"]);
            message.parameters.push(["oauth_version", "1.0"]);

            OAuth.SignatureMethod.sign(message, accessor);
            return OAuth.getAuthorizationHeader(realm, parameters);
        }
    }
}());