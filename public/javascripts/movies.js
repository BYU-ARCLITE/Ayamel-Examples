$(function() {
    var $movieContainer = $('.movies'),
        movieMap = {},
        movieGroupIndex;

    // Load each movie group
    for (movieGroupIndex=0; movieGroupIndex < movieGroups.length; movieGroupIndex++) {
        var movieGroup = movieGroups[movieGroupIndex],
            movieIndex;

        // Render the movie group title
        $movieContainer.append('<h2>' + movieGroup.name + '</h2>');

        // Render the movies
        for (movieIndex=0; movieIndex < movieGroup.movies.length; movieIndex++) {
            var movie = movieGroup.movies[movieIndex];

            // Cache the movie for later lookup by resource ID
            movieMap[movie.resourceId] = movie;

            // Make the actual rendering a callback of the resource because the loading of resources is asynchronous
            new Resource(movie.resourceId, function(resource) {
                var movie = movieMap[resource.id];
                MovieRenderer.render(movie, resource, $movieContainer);
            });
        }
    }

});