$(function() {
    window.mySwipe = new Swipe($("#slider")[0]);

    // Auto rotate the slider
    setInterval(function() {
        mySwipe.next();
    }, 5000);
});