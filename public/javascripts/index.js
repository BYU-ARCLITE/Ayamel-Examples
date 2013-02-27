var $activeTitle;
$(function() {
    $activeTitle = $(".title.active");
    setInterval(function() {
        $activeTitle.removeClass("active");
        var next = $activeTitle.next();
        if (next.length === 1)
            $activeTitle = next;
        else
            $activeTitle = $(".title:first-child");
        $activeTitle.addClass("active");
    }, 3000);
});