/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/24/13
 * Time: 5:16 PM
 * To change this template use File | Settings | File Templates.
 */
var ScreenAdapter = (function() {

    function containByHeight(element, aspectRatio, padding) {
        var maxWidth, proportionalVertical, newHeight, newWidth;
        padding = padding || 0;

        // Probe and see what the maximum width is
        element.style.width = "100%";
        maxWidth = element.clientWidth;

        // Figure out the vertical based on available width and aspect ratio
        proportionalVertical = maxWidth / aspectRatio;

        // If the proportional height is too big for the screen, use the screen size as the height
        if (proportionalVertical + padding > window.innerHeight) {
            newHeight = window.innerHeight - padding;
            newWidth = newHeight * aspectRatio;
        } else {
            newHeight = proportionalVertical;
            newWidth = proportionalVertical * aspectRatio
        }

        // Resize the element
        element.style.height = newHeight + 'px';
        element.style.width = newWidth + 'px';
    }

    function isEntirelyVisible(element, padding) {
        // We are assuming that the element fits in the viewport
        // Look at the position, height, window height, and the scroll top
        padding = padding || 0;
        var top = element.offsetTop - $(window).scrollTop();
        var bottom = element.offsetTop + element.clientHeight + padding - $(window).scrollTop();
        return (top >= $(window).scrollTop() && bottom <= $(window).scrollTop() + window.innerHeight);
    }

    function scrollTo(pos) {
        $('html,body').animate({scrollTop: pos}, 1000,'swing');
    }

    return {
        containByHeight: containByHeight,
        isEntirelyVisible: isEntirelyVisible,
        scrollTo: scrollTo
    };
})();