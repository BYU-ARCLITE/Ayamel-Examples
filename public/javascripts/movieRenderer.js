var MovieRenderer = {

    template:
        '<div class="movieHolder">' +
        '    <div class="movie">' +
        '        <div class="movieThumbnail" style="background-image: url({{background}})"></div>' +
        '        <div class="movieContent">' +
        '            <h3>{{name}}</h3>' +
        '            <p>{{description}}</p>' +
        '            <div class="text-center">' +
        '                <a href="{{url}}" class="btn btn-large btn-magenta"><i class="icon-play"></i> Watch</a>' +
        '            </div>' +
        '        </div>' +
        '    </div>' +
        '</div>',

    render: function render(movie, resource, $element) {
        var view = {
            name: movie.name,
            description: movie.description,
            background: resource.getThumbnail() || "/assets/images/movies/placeholder.jpg",
            url: "/watch/" + movie.id
        };
        var html = Mustache.to_html(this.template, view);
        $element.append(html);
    }
};