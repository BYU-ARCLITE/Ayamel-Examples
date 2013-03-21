package service.oauth;

import oauth.signpost.commonshttp.HttpRequestAdapter;
import oauth.signpost.http.HttpRequest;

/**
 * Supports signing HTTP requests of type {@link org.apache.http.HttpRequest}.
 *
 * @author Matthias Kaeppler
 */
public class CommonsHttpOAuthConsumerJosh extends AbstractOAuthConsumerJosh {

    private static final long serialVersionUID = 1L;

    public CommonsHttpOAuthConsumerJosh(String consumerKey, String consumerSecret) {
        super(consumerKey, consumerSecret);
    }

    @Override
    protected HttpRequest wrap(Object request) {
        if (!(request instanceof org.apache.http.HttpRequest)) {
            throw new IllegalArgumentException(
                    "This consumer expects requests of type "
                            + org.apache.http.HttpRequest.class.getCanonicalName());
        }

        return new HttpRequestAdapter((org.apache.http.client.methods.HttpUriRequest) request);
    }

}