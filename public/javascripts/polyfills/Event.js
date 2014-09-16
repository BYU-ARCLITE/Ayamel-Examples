(function() {
    if(typeof window.Event === 'function'){ return; }

    function Event ( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'Event' );
        evt.initEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    };

    Event.prototype = window.Event.prototype;

    window.Event = Event;
})();