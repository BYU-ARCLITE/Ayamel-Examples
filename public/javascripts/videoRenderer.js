var VideoRenderer = {

    template:
        '<div class="videoHolder">' +
        '    <div class="video">' +
        '        <div class="videoThumbnail" style="background-image: url({{background}})"></div>' +
        '        <div class="videoContent">' +
        '            <h3>{{name}}</h3>' +
        '            <p>{{description}}</p>' +
        '            <div class="text-center">' +
        '                <a href="{{url}}" class="btn btn-large btn-magenta"><i class="icon-play"></i> Watch</a>' +
        '            </div>' +
        '        </div>' +
        '    </div>' +
        '</div>',

    render: function render(video, resource, $element) {
        var view = {
            name: video.name,
            description: video.description,
            background: resource.getThumbnail() || "/assets/images/videos/placeholder.jpg",
            url: "/watch/" + video.id
        };
        var html = Mustache.to_html(this.template, view);
        $element.append(html);
    }
};