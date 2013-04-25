# Ayamel

This is the Ayamel site developed by the ARCLITE Lab at Brigham Young University as part of the National Flagship Media Library effort.

**Table of Contents**
 - <a href="#setup">Setup</a>
    - <a href="#acquire-code">Acquire code</a>
    - <a href="#configure-mysql">Configure MySQL</a>
    - <a href="#configure-resource-library-api">Configure Resource Library API</a>
    - <a href="#configure-file-upload-source">Configure file upload source</a>
 - <a href="#running">Running</a>
    - <a href="#development-server">Development Server</a>
    - <a href="#production-server">Production Server</a>

## Setup

### Acquire code

Clone the repository. This uses other external git repositories, so you'll need to clone those as well. The following are the repositories and their locations:

    public/Ayamel.js   > https://github.com/BYU-ARCLITE/Ayamel.js.git
    public/TimedTiext  > https://github.com/BYU-ARCLITE/TimedText
    
### Configure MySQL

Create a database named `ayamel_examples` on your MySQL server. In `conf/application.conf` you'll need to set the following parameters to match your configuration:

    db.default.driver=com.mysql.jdbc.Driver
    db.default.url="jdbc:mysql://localhost/ayamel_examples?characterEncoding=UTF-8"
    db.default.user=root
    db.default.password=root
    
### Configure Resource Library API

You need to specify the base URL to the Ayamel Resource Library API. The default one is:

    resourceLibrary.baseUrl="http://ayamel.americancouncils.org/api/v1/resources"
    
### Configure file upload source

Ayamel has the potential to support different methods of uploading files. You can specify which method you want to use. Currently the only support method is Amazon S3. To state which upload engine you want to use, specify:

    uploadEngine="s3"
    
Depending on the upload engine you are using, you may need to specify settings needed for that engine. For Amazon S3, you need to specify the following ones:

    amazon.accessKeyId="accessKeyId"
    amazon.secretAccessKey="secretAccessKey"
    amazon.bucket="bucketName"

Also, note that if you use S3 then you must set up your bucket with CORS support.
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>Authorization</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

### Configure PlayGraph

This uses PlayGraph. So you need to have both an authoring key and a playback key. Then set the following configuration entries:

    playgraph.host="http://sartre3.byu.edu:9003/"
    playgraph.author.key="author key goes here"
    playgraph.author.secret="author secret goes here"
    playgraph.player.key="player key goes here"
    playgraph.player.secret="player secret goes here"

### Configure translation keys

Ayamel supports text translations using WordReference and Google Translate. To use these services you must specify the
right authentication credentials in the configuration file.

For WordReference, enter the API key:

    translation.wordReference.key="a5819"

For Google Translate, this uses the research version (which will cease by the end of the year, so modifications will be
needed). So you need to specify the email account that has access the the API, the password of that account, and a
unique name that describes the app. For the BYU instance of Ayamel, this name is `arclite-ayamel-1`.

    translation.google.email="someemail@gmail.com"
    translation.google.password="your password here"
    translation.google.source="arclite-ayamel-1"

## Running

### Development server
From the project root directory, run it as a Play! application.

    play run
    
Once it is running, go to `http://localhost:9000` in your browser. You should see a page asking you if you want to apply the database evolutions. Click the button to do so. It should be working now.

### Production server
From the project root directory, start the app with Play, specifying the port that you want and applying the database evolutions:

    play "start -DapplyEvolutions.default=true 9000"
    
This would run the server on port 9000.
