package service.oauth;

import oauth.signpost.OAuth;
import oauth.signpost.OAuthConsumer;
import oauth.signpost.basic.UrlStringRequestAdapter;
import oauth.signpost.exception.OAuthCommunicationException;
import oauth.signpost.exception.OAuthExpectationFailedException;
import oauth.signpost.exception.OAuthMessageSignerException;
import oauth.signpost.http.HttpParameters;
import oauth.signpost.http.HttpRequest;
import oauth.signpost.signature.*;
import org.apache.commons.io.IOUtils;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import play.Logger;
import service.HashTools;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.util.Random;

/**
 * ABC for consumer implementations. If you're developing a custom consumer you
 * will probably inherit from this class to save you a lot of work.
 *
 * @author Matthias Kaeppler
 */
public abstract class AbstractOAuthConsumerJosh implements OAuthConsumer {

    private static final long serialVersionUID = 1L;

    private String consumerKey, consumerSecret;

    private String token;

    private OAuthMessageSigner messageSigner;

    private SigningStrategy signingStrategy;

    // these are params that may be passed to the consumer directly (i.e.
    // without going through the request object)
    private HttpParameters additionalParameters;

    // these are the params which will be passed to the message signer
    private HttpParameters requestParameters;

    private boolean sendEmptyTokens;

    final private Random random = new Random(System.nanoTime());

    public AbstractOAuthConsumerJosh(String consumerKey, String consumerSecret) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        setMessageSigner(new HmacSha1MessageSigner());
        setSigningStrategy(new AuthorizationHeaderSigningStrategy());
    }

    public void setMessageSigner(OAuthMessageSigner messageSigner) {
        this.messageSigner = messageSigner;
        messageSigner.setConsumerSecret(consumerSecret);
    }

    public void setSigningStrategy(SigningStrategy signingStrategy) {
        this.signingStrategy = signingStrategy;
    }

    public void setAdditionalParameters(HttpParameters additionalParameters) {
        this.additionalParameters = additionalParameters;
    }

    public synchronized HttpRequest sign(HttpRequest request) throws OAuthMessageSignerException,
            OAuthExpectationFailedException, OAuthCommunicationException {
        if (consumerKey == null) {
            throw new OAuthExpectationFailedException("consumer key not set");
        }
        if (consumerSecret == null) {
            throw new OAuthExpectationFailedException("consumer secret not set");
        }

        requestParameters = new HttpParameters();
        try {
            if (additionalParameters != null) {
                requestParameters.putAll(additionalParameters, false);
            }
            collectHeaderParameters(request, requestParameters);
            collectQueryParameters(request, requestParameters);
            collectBodyParameters(request, requestParameters);

            // add any OAuth params that haven't already been set
            completeOAuthParameters(requestParameters, request);

            requestParameters.remove(OAuth.OAUTH_SIGNATURE);

        } catch (IOException e) {
            throw new OAuthCommunicationException(e);
        }

        String signature = messageSigner.sign(request, requestParameters);
        OAuth.debugOut("signature", signature);

        signingStrategy.writeSignature(signature, request, requestParameters);
        OAuth.debugOut("Request URL", request.getRequestUrl());

        return request;
    }

    public synchronized HttpRequest sign(Object request) throws OAuthMessageSignerException,
            OAuthExpectationFailedException, OAuthCommunicationException {
        return sign(wrap(request));
    }

    public synchronized String sign(String url) throws OAuthMessageSignerException,
            OAuthExpectationFailedException, OAuthCommunicationException {
        HttpRequest request = new UrlStringRequestAdapter(url);

        // switch to URL signing
        SigningStrategy oldStrategy = this.signingStrategy;
        this.signingStrategy = new QueryStringSigningStrategy();

        sign(request);

        // revert to old strategy
        this.signingStrategy = oldStrategy;

        return request.getRequestUrl();
    }

    /**
     * Adapts the given request object to a Signpost {@link oauth.signpost.http.HttpRequest}. How
     * this is done depends on the consumer implementation.
     *
     * @param request
     *        the native HTTP request instance
     * @return the adapted request
     */
    protected abstract HttpRequest wrap(Object request);

    public void setTokenWithSecret(String token, String tokenSecret) {
        this.token = token;
        messageSigner.setTokenSecret(tokenSecret);
    }

    public String getToken() {
        return token;
    }

    public String getTokenSecret() {
        return messageSigner.getTokenSecret();
    }

    public String getConsumerKey() {
        return this.consumerKey;
    }

    public String getConsumerSecret() {
        return this.consumerSecret;
    }

    /**
     * <p>
     * Helper method that adds any OAuth parameters to the given request
     * parameters which are missing from the current request but required for
     * signing. A good example is the oauth_nonce parameter, which is typically
     * not provided by the client in advance.
     * </p>
     * <p>
     * It's probably not a very good idea to override this method. If you want
     * to generate different nonces or timestamps, override
     * {@link #generateNonce()} or {@link #generateTimestamp()} instead.
     * </p>
     *
     * @param out
     *        the request parameter which should be completed
     */
    protected void completeOAuthParameters(HttpParameters out, HttpRequest request) {
        if (!out.containsKey(OAuth.OAUTH_CONSUMER_KEY)) {
            out.put(OAuth.OAUTH_CONSUMER_KEY, consumerKey, true);
        }
        if (!out.containsKey(OAuth.OAUTH_SIGNATURE_METHOD)) {
            out.put(OAuth.OAUTH_SIGNATURE_METHOD, messageSigner.getSignatureMethod(), true);
        }
        if (!out.containsKey(OAuth.OAUTH_TIMESTAMP)) {
            out.put(OAuth.OAUTH_TIMESTAMP, generateTimestamp(), true);
        }
        if (!out.containsKey(OAuth.OAUTH_NONCE)) {
            out.put(OAuth.OAUTH_NONCE, generateNonce(), true);
        }
        if (!out.containsKey(OAuth.OAUTH_VERSION)) {
            out.put(OAuth.OAUTH_VERSION, OAuth.VERSION_1_0, true);
        }
        if (!out.containsKey(OAuth.OAUTH_TOKEN)) {
            if (token != null && !token.equals("") || sendEmptyTokens) {
                out.put(OAuth.OAUTH_TOKEN, token, true);
            }
        }

        // oauth_body_hash Added by Joshua Monson
        if (request.getMethod().equals("POST") && !request.getContentType().equals("application/x-www-form-urlencoded")) {

            try {
                InputStream bodyIS = ((HttpEntityEnclosingRequestBase) request.unwrap()).getEntity().getContent();
                StringWriter writer = new StringWriter();
                IOUtils.copy(bodyIS, writer);
                String hash = HashTools.sha1Base64(writer.toString());
                out.put("oauth_body_hash", hash, true);
            } catch(Exception e) {
                Logger.error(e.getMessage());
            }
        }
    }

    public HttpParameters getRequestParameters() {
        return requestParameters;
    }

    public void setSendEmptyTokens(boolean enable) {
        this.sendEmptyTokens = enable;
    }

    /**
     * Collects OAuth Authorization header parameters as per OAuth Core 1.0 spec
     * section 9.1.1
     */
    protected void collectHeaderParameters(HttpRequest request, HttpParameters out) {
        HttpParameters headerParams = OAuth.oauthHeaderToParamsMap(request.getHeader(OAuth.HTTP_AUTHORIZATION_HEADER));
        out.putAll(headerParams, false);
    }

    /**
     * Collects x-www-form-urlencoded body parameters as per OAuth Core 1.0 spec
     * section 9.1.1
     */
    protected void collectBodyParameters(HttpRequest request, HttpParameters out)
            throws IOException {

        // collect x-www-form-urlencoded body params
        String contentType = request.getContentType();
        if (contentType != null && contentType.startsWith(OAuth.FORM_ENCODED)) {
            InputStream payload = request.getMessagePayload();
            out.putAll(OAuth.decodeForm(payload), true);
        }
    }

    /**
     * Collects HTTP GET query string parameters as per OAuth Core 1.0 spec
     * section 9.1.1
     */
    protected void collectQueryParameters(HttpRequest request, HttpParameters out) {

        String url = request.getRequestUrl();
        int q = url.indexOf('?');
        if (q >= 0) {
            // Combine the URL query string with the other parameters:
            out.putAll(OAuth.decodeForm(url.substring(q + 1)), true);
        }
    }

    protected String generateTimestamp() {
        return Long.toString(System.currentTimeMillis() / 1000L);
    }

    protected String generateNonce() {
        return Long.toString(random.nextLong());
    }
}