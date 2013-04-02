package service.joshmonson.oauth

/**
 * A container for holding consumer and token keys and secrets.
 * @param consumerKey The consumer key
 * @param consumerSecret The consumer secret
 * @param tokenKey The token key. Leave as empty string if absent
 * @param tokenSecret The token secret. Leave as empty string if absent
 */
case class OAuthKey(consumerKey: String, consumerSecret: String, tokenKey: String, tokenSecret: String)
